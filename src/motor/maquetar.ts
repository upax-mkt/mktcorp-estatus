/**
 * Etapa 4 del motor (orquestador): encadena normalizar → decidir → validar para
 * un item, con un reintento cuando la primera decisión no valida, y degradación
 * a layout seguro si el segundo intento tampoco pasa. `maquetarSesion` resuelve
 * el tema de la sala y aplica `maquetarItem` a cada entrada cruda de la sesión,
 * sin dejar que un ítem duro tumbe los que ya se maquetaron.
 */
import type { Tema } from '@/temas/tipos'
import { LAYOUTS, type DecisionSlide } from '@/decision/esquema'
import type { EntradaCruda, Inventario } from './inventario'
import { normalizar } from './normalizar'
import { decidir, crearClientePorDefecto, type ClienteDecision } from './decidir'
import { validarDecision, aLayoutSeguro } from './validar'
import { sanearDecision } from './sanear'
import { obtenerTema } from '@/temas'

export interface ResultadoMaquetacion {
  decision: DecisionSlide
  degradado: boolean
  motivo?: string
}

/**
 * Un intento de decisión: llama a `decidir()` y, si resuelve, la valida contra
 * el inventario. Nunca deja escapar una excepción de `decidir()` — la trata
 * igual que un veredicto rechazado, para que `maquetarItem` pueda tratar ambos
 * casos (rechazo por validación, rechazo por excepción) con la misma lógica de
 * reintento y degradación.
 *
 * - `ok: true` → decisión válida, lista para usar.
 * - `ok: false, decision` presente → `decidir()` resolvió pero `validarDecision`
 *   la rechazó (comportamiento previo, sin cambios).
 * - `ok: false, decision` ausente → `decidir()` lanzó (sin `parsed_output`, o
 *   `parsearDecision` rechazó el esquema estricto); no hay una `DecisionSlide`
 *   que degradar.
 */
type IntentoDecision =
  | { ok: true; decision: DecisionSlide }
  | { ok: false; motivo: string; decision?: DecisionSlide }

async function intentarDecision(
  inv: Inventario,
  tema: Tema,
  cliente: ClienteDecision,
  motivoRechazo?: string,
): Promise<IntentoDecision> {
  let bruta: DecisionSlide
  try {
    bruta = await decidir(inv, tema, cliente, motivoRechazo)
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error)
    return { ok: false, motivo: mensaje }
  }
  // Se limpian los artefactos de serialización (un `delta` que quedó dentro del
  // rótulo) ANTES de juzgar: gastar un reintento en recolocar una coma sería
  // caro para lo que se arregla de forma determinista.
  const decision = sanearDecision(bruta)
  const veredicto = validarDecision(decision, inv)
  if (veredicto.ok) {
    return { ok: true, decision }
  }
  return { ok: false, motivo: veredicto.motivo, decision }
}

/**
 * Degrada a layout seguro cuando ningún intento produjo una `DecisionSlide`
 * utilizable (ambos `decidir()` lanzaron). Construye una decisión mínima válida
 * a partir del inventario: usa el layout del primer intento si llegó a existir
 * una decisión (aunque haya sido rechazada por `validarDecision`), o cualquier
 * layout del enum si nunca llegó ninguna — el flag `degradado: true` es lo que
 * hace que el consumidor renderice el layout seguro, no el valor de `layout`.
 */
function degradarSinDecision(
  titulo: string,
  layoutBase: DecisionSlide['layout'] | undefined,
  motivo: string,
): ResultadoMaquetacion {
  const decisionMinima: DecisionSlide = {
    layout: layoutBase ?? LAYOUTS[0],
    titulo,
    razon: motivo,
  }
  return { decision: aLayoutSeguro(decisionMinima, motivo), degradado: true, motivo }
}

/**
 * Maqueta un item: normaliza el contenido crudo, pide una decisión al modelo y
 * la valida contra el inventario. Si el primer intento no valida —ya sea
 * porque `validarDecision` la rechaza o porque `decidir()` lanzó una
 * excepción—, reintenta una única vez pasándole al modelo el motivo del
 * rechazo (para que lo corrija). Si el segundo intento tampoco valida, degrada
 * la decisión a layout seguro y expone la señal de degradación (`degradado`,
 * `motivo`) en el resultado — el consumidor decide si renderiza
 * `<LayoutSeguro>` directamente en vez de despachar por `<Slide>` (ver nota de
 * diseño en `aLayoutSeguro`). `maquetarItem` nunca lanza por un fallo de la
 * etapa 2 (`decidir`): siempre devuelve un resultado, degradado si hace falta.
 */
export async function maquetarItem(
  crudo: EntradaCruda,
  tema: Tema,
  cliente: ClienteDecision,
): Promise<ResultadoMaquetacion> {
  const inv = normalizar(crudo)

  const primerIntento = await intentarDecision(inv, tema, cliente)
  if (primerIntento.ok) {
    return { decision: primerIntento.decision, degradado: false }
  }

  const segundoIntento = await intentarDecision(inv, tema, cliente, primerIntento.motivo)
  if (segundoIntento.ok) {
    return { decision: segundoIntento.decision, degradado: false }
  }

  if (segundoIntento.decision) {
    // decidir() resolvió en el segundo intento pero validarDecision la rechazó:
    // degradación clásica, sin cambios respecto al comportamiento previo.
    return {
      decision: aLayoutSeguro(segundoIntento.decision, segundoIntento.motivo),
      degradado: true,
      motivo: segundoIntento.motivo,
    }
  }

  // decidir() lanzó en el segundo intento (con o sin lanzar también en el
  // primero): no hay una DecisionSlide que degradar, así que construimos una
  // mínima a partir del inventario.
  const motivo = `el modelo no produjo una decisión válida: ${segundoIntento.motivo}`
  return degradarSinDecision(inv.titulo, primerIntento.decision?.layout, motivo)
}

/**
 * Maqueta una sesión completa: resuelve el tema de la sala por su slug y usa el
 * cliente por defecto si no se provee uno (permite inyectar un mock en test).
 * Los items se maquetan en orden (no en paralelo) para no disparar ráfagas de
 * llamadas concurrentes a la API sobre el mismo cliente.
 *
 * Resiliente por ítem: un ítem cuyo `maquetarItem` fallara de forma imprevista
 * (no debería, tras el arreglo de la etapa 2, pero por defensa en profundidad)
 * no tumba la sesión — se captura, se degrada ese ítem puntual, y se continúa
 * con los demás. Ningún ítem le cuesta al director las decisiones de los
 * N-1 que sí se maquetaron.
 */
export async function maquetarSesion(
  items: EntradaCruda[],
  slugSala: string,
  cliente?: ClienteDecision,
): Promise<ResultadoMaquetacion[]> {
  const tema = obtenerTema(slugSala)
  const clienteFinal = cliente ?? crearClientePorDefecto()

  const resultados: ResultadoMaquetacion[] = []
  for (const item of items) {
    try {
      const resultado = await maquetarItem(item, tema, clienteFinal)
      resultados.push(resultado)
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error)
      const motivo = `fallo inesperado al maquetar el ítem: ${mensaje}`
      resultados.push(degradarSinDecision(item.titulo, undefined, motivo))
    }
  }
  return resultados
}
