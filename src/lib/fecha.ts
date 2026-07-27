/**
 * Fuente única de "cuándo es ahora" y del formato de fechas en español que
 * usan el hub y la vista de sala.
 *
 * Dos problemas que resuelve, y por qué está escrito así:
 *
 * 1. Antes cada página declaraba `const FECHA = new Date('2026-07-24')`: la
 *    app mostraba en producción el día del build, no el de hoy.
 *
 * 2. Las fechas del dominio ("2026-08-19") son fechas CIVILES, no instantes:
 *    el día en que se dio una sesión no cambia según dónde corra el servidor.
 *    `new Date('2026-08-19')` las interpreta como medianoche UTC y
 *    `toLocaleDateString` las imprime en la zona del proceso — en Vercel (UTC)
 *    sale "19 ago" y en una máquina en México "18 ago". Aquí todo se ancla a
 *    la zona de la operación (CDMX), así que el resultado no depende de dónde
 *    se ejecute el código.
 */

/** Toda la operación de Mkt Corp ocurre en esta zona. */
const ZONA = 'America/Mexico_City'

const MS_POR_DIA = 86_400_000

/** Fecha civil (YYYY-MM-DD) que corresponde a un instante, vista desde CDMX. */
function fechaCivil(d: Date): string {
  // 'en-CA' da exactamente el formato ISO YYYY-MM-DD.
  return d.toLocaleDateString('en-CA', { timeZone: ZONA })
}

/**
 * Instante a partir de una fecha del dominio. Acepta las dos formas que
 * circulan por la app:
 *
 * - `2026-08-19` (fecha civil, la que guardan los datos de ejemplo): se ancla
 *   al mediodía UTC, lejos de cualquier frontera de día en cualquier zona.
 * - `2026-08-19T12:00:00.000Z` (lo que devuelve la base de datos): ya es un
 *   instante y se usa tal cual.
 */
function instanteDe(iso: string): Date {
  return new Date(iso.includes('T') ? iso : `${iso}T12:00:00Z`)
}

/** "viernes, 24 de julio" — el día de hoy en CDMX. */
export function fechaLarga(d: Date): string {
  return d.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: ZONA,
  })
}

/** Días transcurridos desde la última sesión, en lenguaje natural. */
export function textoDiasDesde(dias: number | null): string {
  if (dias == null) return 'sin sesión aún'
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'ayer'
  return `hace ${dias} días`
}

/**
 * Días civiles que faltan entre `referencia` y una fecha ISO (negativo si ya
 * pasó). Cuenta días de calendario en CDMX, no intervalos de 24 h: dos fechas
 * separadas por un cambio de horario de verano siguen dando la cuenta correcta.
 */
export function diasHasta(iso: string, referencia: Date): number {
  const desde = instanteDe(fechaCivil(referencia)).getTime()
  const hasta = instanteDe(iso).getTime()
  return Math.round((hasta - desde) / MS_POR_DIA)
}

/** "19 ago" */
export function fechaBreve(iso: string): string {
  return instanteDe(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    timeZone: ZONA,
  })
}

/** "19 ago 26" — para listas donde el año importa pero el espacio es poco. */
export function fechaBreveConAnio(iso: string): string {
  return instanteDe(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    timeZone: ZONA,
  })
}

/** "19 de agosto de 2026" */
export function fechaCompleta(iso: string): string {
  return instanteDe(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: ZONA,
  })
}

/** "próxima 19 ago · en 26 d" — sin el conteo si la fecha ya pasó. */
export function textoProxima(iso: string | null, referencia: Date): string {
  if (!iso) return 'sin próxima sesión agendada'
  const dias = diasHasta(iso, referencia)
  return `próxima ${fechaBreve(iso)}${dias >= 0 ? ` · en ${dias} d` : ''}`
}
