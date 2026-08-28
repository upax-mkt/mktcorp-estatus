export const CONCURSO_ID = 'sudadera-mkt-corp-2026'

export const FECHAS_CONCURSO = {
  lanzamiento: new Date('2026-08-28T00:00:00-06:00'),
  cierrePropuestas: new Date('2026-09-07T11:00:00-06:00'),
  cierreVotacion: new Date('2026-09-08T18:00:00-06:00'),
  ceremonia: new Date('2026-09-09T15:00:00-06:00'),
} as const

export const LIMITE_DESCRIPCION = 500
export const MAX_ARCHIVOS = 3
export const MAX_BYTES_ARCHIVO = 25 * 1024 * 1024
export const TIPOS_IMAGEN_CONCURSO = ['image/jpeg', 'image/png'] as const

