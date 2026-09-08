import { CEREMONIA, FECHAS_CONCURSO } from './config'

/**
 * LAS FECHAS SE ESCRIBEN UNA VEZ, EN `config.ts`, Y AQUÍ SE LEEN.
 *
 * Antes cada pantalla las repetía a mano —«7 de septiembre a las 11:00» en el
 * hero, en las bases, en el pase, en la galería y en el anuncio del home—. Al
 * mover el cierre, `config.ts` cambiaba y esos cinco textos seguían anunciando
 * la fecha vieja: la app cerraba la recepción a una hora y la página prometía
 * otra, sin que nada fallara. Es la misma fuga que ya se pagó dos veces en el
 * guion del Update.
 *
 * Todo lo de aquí es puro y determinista: mismo `Date` dentro, mismo texto
 * fuera, en servidor y en cliente. Los nombres de día y mes son propios (y no
 * de ICU) porque el resultado no puede depender de qué datos de locale traiga
 * el Node que corra: una tabla de doce palabras es más barata que esa duda.
 */
const ZONA = 'America/Mexico_City'

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] as const
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const
const MESES_CORTOS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'] as const

// `hourCycle: 'h23'` y no `hour12: false`: el segundo deja pasar un "24" por
// medianoche en algunos entornos. Aquí no hay ninguna medianoche, pero el
// formateador es de uso general y no debe traer esa trampa dentro.
const RELOJ_CDMX = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

type Reloj = { anio: number; mes: number; dia: number; hora: number; minuto: number }

/** La hora de pared en CDMX, que es la única que el equipo lee. */
function reloj(fecha: Date): Reloj {
  const p = Object.fromEntries(RELOJ_CDMX.formatToParts(fecha).map((x) => [x.type, x.value]))
  return { anio: +p.year, mes: +p.month, dia: +p.day, hora: +p.hour, minuto: +p.minute }
}

/** "10:00" */
export function hora(fecha: Date): string {
  const r = reloj(fecha)
  return `${r.hora}:${String(r.minuto).padStart(2, '0')}`
}

/** "15" a la hora en punto, "15:30" si no lo es — para las etiquetas cortas. */
export function horaCompacta(fecha: Date): string {
  const r = reloj(fecha)
  return r.minuto === 0 ? String(r.hora) : hora(fecha)
}

/** "9 de septiembre" */
export function fechaLarga(fecha: Date): string {
  const r = reloj(fecha)
  return `${r.dia} de ${MESES[r.mes - 1]}`
}

/** "9" — el día del mes a secas, para las frases que ya traen el mes en el aire. */
export function diaDelMes(fecha: Date): string {
  return String(reloj(fecha).dia)
}

/** "9 SEP" */
export function fechaCorta(fecha: Date): string {
  const r = reloj(fecha)
  return `${r.dia} ${MESES_CORTOS[r.mes - 1]}`
}

/** "miércoles" */
export function diaSemana(fecha: Date): string {
  const r = reloj(fecha)
  return DIAS[new Date(Date.UTC(r.anio, r.mes - 1, r.dia)).getUTCDay()]
}

/** "miércoles 9 de septiembre" */
export function diaYFecha(fecha: Date): string {
  return `${diaSemana(fecha)} ${fechaLarga(fecha)}`
}

/** Si dos instantes caen en el mismo día civil de CDMX. */
export function mismoDia(a: Date, b: Date): boolean {
  const x = reloj(a)
  const y = reloj(b)
  return x.anio === y.anio && x.mes === y.mes && x.dia === y.dia
}

/**
 * La ventana de votación en una frase, que cambia de forma según si empieza y
 * termina el mismo día: «ese mismo día de 10:00 a 15:00» o «del 7 al 8 de
 * septiembre». Vive aquí y no en cada pantalla porque las tres que la dicen
 * deben decirla igual.
 */
export function ventanaVotacion(): string {
  const { cierrePropuestas: abre, cierreVotacion: cierra } = FECHAS_CONCURSO
  return mismoDia(abre, cierra)
    ? `ese mismo día de ${hora(abre)} a ${hora(cierra)}`
    : `del ${fechaLarga(abre)} al ${fechaLarga(cierra)}`
}

/** El instante en que termina la premiación: su inicio más lo que dura. */
export function finCeremonia(): Date {
  return new Date(FECHAS_CONCURSO.ceremonia.getTime() + CEREMONIA.duracionMinutos * 60_000)
}

/** "15–16 H" — la franja de la premiación para las etiquetas del hero. */
export function franjaCeremonia(): string {
  return `${horaCompacta(FECHAS_CONCURSO.ceremonia)}–${horaCompacta(finCeremonia())} H`
}
