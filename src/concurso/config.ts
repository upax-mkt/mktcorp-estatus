export const CONCURSO_ID = 'sudadera-mkt-corp-2026'

/**
 * LAS CUATRO FECHAS DEL CONCURSO, Y NO HAY OTRA COPIA.
 *
 * Todo lo que la app dice de fechas —hero, bases, pase, galería, anuncio del
 * home y la descripción que viaja a Slack— se deriva de aquí con
 * `concurso/textos.ts`. Cambiar una línea de este objeto mueve la página
 * entera; escribir una fecha a mano en una pantalla vuelve a abrir la fuga que
 * `fuente-unica.test.ts` cierra.
 *
 * PRÓRROGA (7-sep-2026, decisión de Franco): la recepción cerraba hoy a las
 * 11:00 y se corre al miércoles a las 10:00. La votación arranca ahí mismo y
 * corre hasta las 15:00, que es cuando empieza la premiación en vivo en Sky
 * Lobby. `cierreVotacion` y `ceremonia` coinciden a propósito: no hay ventana
 * muerta entre «se cierra el pase» y «se revela el ganador».
 */
export const FECHAS_CONCURSO = {
  lanzamiento: new Date('2026-08-28T00:00:00-06:00'),
  cierrePropuestas: new Date('2026-09-09T10:00:00-06:00'),
  cierreVotacion: new Date('2026-09-09T15:00:00-06:00'),
  ceremonia: new Date('2026-09-09T15:00:00-06:00'),
} as const

/**
 * LA PREMIACIÓN, EN VIVO (7-sep-2026, Franco): Sky 1, una hora en punto desde
 * `FECHAS_CONCURSO.ceremonia`. La sede estaba escrita a mano en el hero y en el
 * anuncio del home —«Sky Lobby, Sala 2»—, así que al moverla había que acordarse
 * de los dos sitios. Ahora se lee de aquí, como las fechas.
 */
export const CEREMONIA = {
  lugar: 'Sky 1',
  duracionMinutos: 60,
} as const

export const LIMITE_DESCRIPCION = 500
export const MAX_ARCHIVOS = 3
export const MAX_BYTES_ARCHIVO = 25 * 1024 * 1024
export const TIPOS_IMAGEN_CONCURSO = ['image/jpeg', 'image/png'] as const
