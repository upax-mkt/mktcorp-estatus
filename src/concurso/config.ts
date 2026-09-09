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
 * PRÓRROGA (7-sep-2026, decisión de Franco): la recepción cerraba el 7 a las
 * 11:00 y se corrió al miércoles. La votación arranca al cerrarse la recepción
 * y corre hasta las 15:00, que es cuando empieza la premiación en vivo.
 * `cierreVotacion` y `ceremonia` coinciden a propósito: no hay ventana muerta
 * entre «se cierra el pase» y «se revela el ganador».
 *
 * SEGUNDA PRÓRROGA (9-sep-2026, decisión de César): de las 10:00 a las 13:00.
 * La recepción se cerró sola a las 10:00 con gente todavía subiendo, y se
 * reabre hasta la una.
 *
 * ⚠️ Y EL PASE CIERRA A LAS 16:00, DESPUÉS DE QUE EMPIECE LA PREMIACIÓN
 * (9-sep-2026, César). `cierreVotacion` ya NO coincide con `ceremonia`: la sala
 * se reúne a las 15:00 y se sigue votando dentro, una hora más. La fase
 * `cerrado` sigue sin ocurrir —al llegar a su comparación la ceremonia ya
 * empezó—, así que del voto se pasa directo al ganador; lo vigila `fase.test.ts`
 * barriendo el tramo, no comparando las dos fechas, que es lo que hacía cuando
 * eran iguales.
 *
 * Estas fechas son el suelo, no la última palabra: administración puede cerrar
 * la votación antes desde el panel («Cerrar votación», `ControlFaseConcurso`),
 * y ese interruptor manda sobre todo lo de aquí.
 */
export const FECHAS_CONCURSO = {
  lanzamiento: new Date('2026-08-28T00:00:00-06:00'),
  cierrePropuestas: new Date('2026-09-09T13:00:00-06:00'),
  ceremonia: new Date('2026-09-09T15:00:00-06:00'),
  cierreVotacion: new Date('2026-09-09T16:00:00-06:00'),
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
