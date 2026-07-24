/**
 * Etapa 4 del motor (orquestador): encadena normalizar → decidir → validar para
 * un item, con un reintento cuando la primera decisión no valida, y degradación
 * a layout seguro si el segundo intento tampoco pasa. `maquetarSesion` resuelve
 * el tema de la sala y aplica `maquetarItem` a cada entrada cruda de la sesión.
 */
import type { Tema } from '@/temas/tipos'
import type { DecisionSlide } from '@/decision/esquema'
import type { EntradaCruda } from './inventario'
import { normalizar } from './normalizar'
import { decidir, crearClientePorDefecto, type ClienteDecision } from './decidir'
import { validarDecision, aLayoutSeguro } from './validar'
import { obtenerTema } from '@/temas'

export interface ResultadoMaquetado {
  decision: DecisionSlide
  degradado: boolean
  motivo?: string
}

/**
 * Maqueta un item: normaliza el contenido crudo, pide una decisión al modelo y
 * la valida contra el inventario. Si el primer intento no valida, reintenta una
 * única vez pasándole al modelo el motivo del rechazo (para que lo corrija). Si
 * el segundo intento tampoco valida, degrada la decisión a layout seguro y
 * expone la señal de degradación (`degradado`, `motivo`) en el resultado — el
 * consumidor decide si renderiza `<LayoutSeguro>` directamente en vez de
 * despachar por `<Slide>` (ver nota de diseño en `aLayoutSeguro`).
 */
export async function maquetarItem(
  crudo: EntradaCruda,
  tema: Tema,
  cliente: ClienteDecision,
): Promise<ResultadoMaquetado> {
  const inv = normalizar(crudo)

  const primeraDecision = await decidir(inv, tema, cliente)
  const primerVeredicto = validarDecision(primeraDecision, inv)
  if (primerVeredicto.ok) {
    return { decision: primeraDecision, degradado: false }
  }

  const segundaDecision = await decidir(inv, tema, cliente, primerVeredicto.motivo)
  const segundoVeredicto = validarDecision(segundaDecision, inv)
  if (segundoVeredicto.ok) {
    return { decision: segundaDecision, degradado: false }
  }

  return {
    decision: aLayoutSeguro(segundaDecision, segundoVeredicto.motivo),
    degradado: true,
    motivo: segundoVeredicto.motivo,
  }
}

/**
 * Maqueta una sesión completa: resuelve el tema de la sala por su slug y usa el
 * cliente por defecto si no se provee uno (permite inyectar un mock en test).
 * Los items se maquetan en orden (no en paralelo) para no disparar ráfagas de
 * llamadas concurrentes a la API sobre el mismo cliente.
 */
export async function maquetarSesion(
  items: EntradaCruda[],
  slugSala: string,
  cliente?: ClienteDecision,
): Promise<DecisionSlide[]> {
  const tema = obtenerTema(slugSala)
  const clienteFinal = cliente ?? crearClientePorDefecto()

  const decisiones: DecisionSlide[] = []
  for (const item of items) {
    const resultado = await maquetarItem(item, tema, clienteFinal)
    decisiones.push(resultado.decision)
  }
  return decisiones
}
