import { FECHAS_CONCURSO } from './config'

export type FaseConcurso = 'recepcion' | 'votacion' | 'cerrado' | 'resultados'

/**
 * EN QUÉ MOMENTO DEL CONCURSO ESTAMOS, deducido solo de las fechas.
 *
 * ⚠️ `cerrado` NO OCURRE CON EL CALENDARIO VIGENTE, y no es un descuido. Esa
 * fase es el hueco entre el cierre del pase y la revelación; desde que la
 * votación se hace DENTRO de la ceremonia, `cierreVotacion` (15:45) cae
 * después de `ceremonia` (15:00), así que del voto se pasa directo al
 * resultado. El orden de los `if` lo resuelve sin ningún caso especial: al
 * llegar a la tercera comparación la ceremonia ya empezó.
 *
 * La rama se queda —y el valor en el tipo también— porque el hueco es
 * perfectamente legítimo: devolver `cierreVotacion` a antes de `ceremonia` en
 * `config.ts` lo reactiva sin tocar esta función.
 */
export function faseDelConcurso(ahora = new Date()): FaseConcurso {
  const instante = ahora.getTime()
  if (instante < FECHAS_CONCURSO.cierrePropuestas.getTime()) return 'recepcion'
  if (instante < FECHAS_CONCURSO.cierreVotacion.getTime()) return 'votacion'
  if (instante < FECHAS_CONCURSO.ceremonia.getTime()) return 'cerrado'
  return 'resultados'
}


/**
 * LA FASE QUE MANDA: la que fijó administración, si hay alguna, y si no las
 * fechas.
 *
 * ⚠️ ES UN INTERRUPTOR MANUAL, no un cambio de calendario. Existe porque el
 * 7-sep-2026 la recepción cerró sola a las 11:00 con un defecto que impedía
 * subir imágenes, y recuperar el concurso exigió redesplegar para mover una
 * constante. Con esto, quien administra abre o cierra la votación desde la
 * pantalla y el arreglo tarda segundos.
 *
 * `null` significa AUTOMÁTICO —vuelve a mandar el calendario—, y es distinto
 * de forzar la fase que las fechas ya darían: al soltar el interruptor el
 * concurso sigue avanzando solo, sin que nadie tenga que acordarse de mover
 * nada a las 15:45.
 */
export function faseVigente(forzada: FaseConcurso | null, ahora = new Date()): FaseConcurso {
  return forzada ?? faseDelConcurso(ahora)
}

/** Las fases que administración puede fijar a mano, para validar lo que llega. */
export const FASES_CONCURSO: readonly FaseConcurso[] = ['recepcion', 'votacion', 'cerrado', 'resultados']

export function esFaseConcurso(valor: unknown): valor is FaseConcurso {
  return typeof valor === 'string' && (FASES_CONCURSO as readonly string[]).includes(valor)
}
