/**
 * Etapa 4 del motor (orquestador): encadena normalizar → decidir → validar para
 * un item, con un reintento cuando la primera decisión no valida, y degradación
 * a layout seguro si el segundo intento tampoco pasa. `maquetarSesion` resuelve
 * el tema de la sala y aplica `maquetarItem` a cada entrada cruda de la sesión,
 * sin dejar que un ítem duro tumbe los que ya se maquetaron.
 */
import type { Tema } from '@/temas/tipos'
import { LAYOUTS, LIMITES, TextoPlano, type DecisionSlide } from '@/decision/esquema'
import type { EntradaCruda, Inventario } from './inventario'
import { normalizar } from './normalizar'
import { decidir, crearClientePorDefecto, type ClienteDecision } from './decidir'
import { validarDecision, aLayoutSeguro } from './validar'
import { sanearDecision, completarKpisFaltantes } from './sanear'
import { aDecision, type BorradorSeccion } from '@/secciones/borrador'
import { temaDeSala } from '@/temas'
import { cargarTemas } from '@/db/temas'
import type { Acuerdo } from '@/dominio/salas'

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
  // Dos arreglos deterministas ANTES de juzgar, por el mismo motivo: lo que se
  // puede corregir sin inventar nada no merece gastar un reintento de ~12 s ni
  // acabar en un slide degradado. Primero se recolocan los campos fugados (un
  // `delta` dentro del rótulo) y después se reponen las cifras que el modelo
  // dejó fuera, sacándolas del inventario del propio equipo.
  const decision = completarKpisFaltantes(sanearDecision(bruta), inv)
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
  /** Nulo en una reunión que no pertenece a ninguna sala: usa la de UPAX. */
  slugSala: string | null,
  cliente?: ClienteDecision,
): Promise<ResultadoMaquetacion[]> {
  const tema = temaDeSala(slugSala, await cargarTemas())
  // El cliente se crea PEREZOSAMENTE: una sesión armada entera a mano no debe
  // exigir ANTHROPIC_API_KEY para presentarse. La IA es un atajo opcional, no
  // un requisito de arranque.
  let clienteFinal = cliente
  const clienteDeIa = () => (clienteFinal ??= crearClientePorDefecto())

  const resultados: ResultadoMaquetacion[] = []
  for (const item of items) {
    try {
      // Sección compuesta a mano: se usa tal cual. Ni una llamada, ni un
      // segundo de espera, ni la posibilidad de que un modelo reinterprete lo
      // que alguien ya decidió.
      if (item.seccion) {
        resultados.push(maquetarBorrador(item.seccion, item.titulo, item.acuerdosRetomados))
        continue
      }
      resultados.push(await maquetarItem(item, tema, clienteDeIa()))
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error)
      const motivo = `fallo inesperado al maquetar el ítem: ${mensaje}`
      resultados.push(degradarSinDecision(item.titulo, undefined, motivo))
    }
  }
  return resultados
}

/**
 * Maqueta una sección que el equipo armó a mano.
 *
 * Determinista y sin red. Si el borrador está incompleto no se descarta: se
 * degrada con el motivo a la vista ("Falta el título"), porque quien la
 * escribió tiene que poder ver QUÉ le falta en el documento, no descubrir que
 * su sección desapareció.
 *
 * `acuerdosRetomados` (ronda 9, tarea 6) — ya resueltos por
 * `resolverAcuerdosRetomados`, src/db/sesiones.ts — se mezcla en el BORRADOR,
 * ANTES de `aDecision`, no en la decisión ya validada: `pendientes-semaforo`
 * EXIGE una tabla (`tipoDeSeccion(...).exige`, ver src/secciones/catalogo.ts)
 * para no degradarse, así que una sesión donde alguien SOLO arrastró
 * acuerdos —sin teclear nada— tiene un borrador sin `tablas` propias; fusionar
 * después de `aDecision` nunca llegaba a correr, porque esa sección ya había
 * degradado antes. Fusionar antes hace que el acuerdo retomado, por sí solo,
 * baste para que la sección deje de estar "vacía" — que es exactamente el
 * caso que Franco describió. Es lo mismo que usa `LienzoPrevio`/`VistaPrevia`
 * para que el editor enseñe EXACTAMENTE lo que "Maquetar" va a producir.
 */
export function maquetarBorrador(
  borrador: BorradorSeccion,
  tituloItem: string,
  acuerdosRetomados?: Acuerdo[],
): ResultadoMaquetacion {
  const conAcuerdos = conAcuerdosRetomados(borrador, acuerdosRetomados)
  const resultado = aDecision(conAcuerdos, tituloItem)
  if (resultado.ok) {
    return { decision: resultado.decision, degradado: false }
  }
  return degradarSinDecision(conAcuerdos.titulo || tituloItem, conAcuerdos.layout, resultado.motivo)
}

/** El semáforo de una fila de pendientes, según el estatus REAL del acuerdo ahora mismo. */
const SEMAFORO_DE: Record<Acuerdo['estatus'], 'listo' | 'en-proceso' | 'no-realizado'> = {
  cumplido: 'listo',
  abierto: 'en-proceso',
  vencido: 'no-realizado',
}

const ETIQUETA_DE_ESTATUS: Record<Acuerdo['estatus'], string> = {
  abierto: 'Abierto',
  vencido: 'Vencido',
  cumplido: 'Cumplido',
}

/** Encabezados de la tabla de pendientes — el mismo ejemplo que ya usa el propio esquema (§ Tabla.columnas). */
const COLUMNAS_PENDIENTES = ['Responsable', 'Tarea', 'Estatus']

/**
 * Texto de acuerdo, listo para una celda del documento (`TextoPlano`, ver
 * decision/esquema.ts). `que`/`responsable` los escribe el equipo en la
 * pantalla de acuerdos, un formulario que NUNCA pasó por ese validador —así
 * que un acuerdo con una comilla invertida suelta o un "**" no debe tirar el
 * slide entero. Se limpia el carácter conflictivo en vez de descartar la
 * fila: perder el énfasis accidental es preferible a perder el acuerdo del
 * documento.
 */
function comoCeldaSegura(texto: string): string {
  if (TextoPlano.safeParse(texto).success) return texto
  const limpio = texto.replace(/[`*_#<>]|style\s*=/gi, '').trim()
  return limpio.length > 0 ? limpio : 'Sin descripción'
}

function filaDeAcuerdo(acuerdo: Acuerdo): { celdas: string[]; estado: 'listo' | 'en-proceso' | 'no-realizado' } {
  return {
    celdas: [comoCeldaSegura(acuerdo.responsable), comoCeldaSegura(acuerdo.que), ETIQUETA_DE_ESTATUS[acuerdo.estatus]],
    estado: SEMAFORO_DE[acuerdo.estatus],
  }
}

/**
 * Añade una fila por cada acuerdo retomado a la primera tabla (ronda 9, tarea
 * 6). Genérica sobre `T` porque se usa en DOS momentos con dos tipos que
 * comparten la misma forma de `tablas`: sobre el BORRADOR, antes de validar
 * (ver el comentario de `maquetarBorrador` sobre por qué tiene que ser
 * antes), y sigue sirviendo si algún día hace falta aplicarla también sobre
 * una `DecisionSlide` ya resuelta.
 *
 * RESUELTO EN EL MOMENTO, no copiado: si el acuerdo se cierra desde la sala,
 * la próxima vez que esto corra —abrir el editor, volver a maquetar— la fila
 * sale "Cumplido", porque `acuerdo.estatus` se leyó ahora.
 *
 * Se añade a la tabla existente SOLO si sus columnas calzan con las tres de
 * pendientes (Responsable/Tarea/Estatus): una tabla escrita a mano con otra
 * forma no se toca, para no desalinear celdas que no le pertenecen — en ese
 * caso se antepone una tabla propia. Respeta `LIMITES.tablas`: si ya hay tres
 * tablas, la de acuerdos entra igual (es la razón por la que se está
 * maquetando) y se suelta la última de las que había.
 */
function conAcuerdosRetomados<T extends { tablas?: DecisionSlide['tablas'] }>(
  objeto: T,
  acuerdos: Acuerdo[] | undefined,
): T {
  if (!acuerdos || acuerdos.length === 0) return objeto

  const filasNuevas = acuerdos.map(filaDeAcuerdo)
  const tablasActuales = objeto.tablas ?? []
  const [primera, ...resto] = tablasActuales

  if (primera && primera.columnas.length === COLUMNAS_PENDIENTES.length) {
    return { ...objeto, tablas: [{ ...primera, filas: [...primera.filas, ...filasNuevas] }, ...resto] }
  }

  const tablaPropia = { columnas: COLUMNAS_PENDIENTES, filas: filasNuevas }
  return { ...objeto, tablas: [tablaPropia, ...tablasActuales].slice(0, LIMITES.tablas) }
}
