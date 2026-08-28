import { FECHAS_CONCURSO } from './config'

export type FaseConcurso = 'recepcion' | 'votacion' | 'cerrado' | 'resultados'

export function faseDelConcurso(ahora = new Date()): FaseConcurso {
  const instante = ahora.getTime()
  if (instante < FECHAS_CONCURSO.cierrePropuestas.getTime()) return 'recepcion'
  if (instante < FECHAS_CONCURSO.cierreVotacion.getTime()) return 'votacion'
  if (instante < FECHAS_CONCURSO.ceremonia.getTime()) return 'cerrado'
  return 'resultados'
}

