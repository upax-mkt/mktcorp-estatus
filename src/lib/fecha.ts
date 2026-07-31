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

/**
 * El día civil (YYYY-MM-DD) al que pertenece una fecha del dominio, visto
 * desde CDMX. Es con lo que el calendario agrupa: una sesión del 30 de junio
 * a las 19:00 en México es la 01:00 UTC del 1 de julio, y en un servidor en
 * UTC —Vercel— aparecería en el mes siguiente.
 */
export function diaCivil(iso: string): string {
  return fechaCivil(instanteDe(iso))
}

/** "10:30" */
export function horaBreve(iso: string): string {
  return instanteDe(iso).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: ZONA,
  })
}

/** "julio de 2026", con mayúscula inicial. Encabeza el mes del calendario. */
export function mesLargo(anio: number, mes: number): string {
  const texto = new Date(Date.UTC(anio, mes, 15, 12)).toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
    timeZone: ZONA,
  })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
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

/**
 * Un instante EXACTO en CDMX, a partir de un día civil (`YYYY-MM-DD`) y una
 * hora del reloj (`HH:MM`).
 *
 * Distinto de `instanteDe` (arriba, privado): aquella ancla a mediodía UTC
 * porque solo le importa "qué día civil es" y ese margen la deja lejos de
 * cualquier frontera de día pase lo que pase con el huso. Esta función
 * necesita el instante VERDADERO —para guardar cuándo empieza una reunión—
 * así que sí asume el desfase real: `-06:00` fijo, porque México central dejó
 * el horario de verano en 2022 y hoy ese desfase no cambia en el año. No hace
 * falta traer una librería de zonas horarias para un solo desfase constante.
 *
 * Corrección de revisión (ronda 8, tarea 3): este mismo truco vivía copiado
 * a mano en tres sitios — `src/app/cliente/[slug]/page.tsx`,
 * `src/app/agenda/page.tsx` y `src/db/sesiones.ts` — cada uno con su propio
 * literal `-06:00`. Si ese desfase alguna vez cambia, este es el único lugar
 * que hay que arreglar.
 */
export function instanteEnCDMX(diaCivilTexto: string, horaMinuto: string): Date {
  return new Date(`${diaCivilTexto}T${horaMinuto}:00-06:00`)
}
