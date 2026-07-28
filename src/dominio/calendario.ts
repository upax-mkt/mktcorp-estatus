import { diaCivil } from '@/lib/fecha'

/**
 * La rejilla de un mes y qué cae en cada día.
 *
 * Puro: recibe las sesiones ya resueltas y devuelve semanas. Así el
 * calendario se puede probar sin montar un navegador, que es donde estos
 * cálculos se equivocan en silencio — un mes que empieza en domingo, uno de
 * 28 días, el que cruza el cambio de horario.
 *
 * La semana empieza en LUNES, como se lee un calendario en México.
 */

export interface DiaDelCalendario {
  /** YYYY-MM-DD, la fecha civil en CDMX. */
  dia: string
  /** Número del día del mes: 1..31. */
  numero: number
  /** false para los días del mes anterior o siguiente que rellenan la rejilla. */
  delMes: boolean
  esHoy: boolean
}

/** Cuántas columnas tiene la rejilla. Lunes a domingo. */
export const DIAS_POR_SEMANA = 7

/** Los encabezados de columna, en el orden de la rejilla. */
export const NOMBRES_DE_DIA = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']

function aDia(anio: number, mes: number, numero: number): string {
  return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(numero).padStart(2, '0')}`
}

/**
 * Las semanas de un mes, con los días de relleno del mes vecino para que la
 * rejilla salga cuadrada.
 *
 * `mes` es 0..11, como en `Date`, para no inventar una convención distinta a
 * la de la plataforma dentro de la misma app.
 */
export function semanasDelMes(anio: number, mes: number, hoy: Date): DiaDelCalendario[][] {
  // Se construye con UTC a mediodía a propósito: las operaciones de
  // calendario (¿cuántos días tiene?, ¿en qué día de la semana cae el 1?) son
  // aritmética civil, y anclar al mediodía las deja lejos de cualquier
  // frontera de día en cualquier zona.
  const primero = new Date(Date.UTC(anio, mes, 1, 12))
  const diasEnElMes = new Date(Date.UTC(anio, mes + 1, 0, 12)).getUTCDate()
  // getUTCDay() da 0 para domingo; con la semana en lunes, el domingo es 6.
  const huecoInicial = (primero.getUTCDay() + 6) % 7

  const diaDeHoy = diaCivil(hoy.toISOString())
  const celdas: DiaDelCalendario[] = []

  const mesAnterior = new Date(Date.UTC(anio, mes, 0, 12))
  const diasDelAnterior = mesAnterior.getUTCDate()
  for (let i = huecoInicial; i > 0; i--) {
    const numero = diasDelAnterior - i + 1
    const dia = aDia(mesAnterior.getUTCFullYear(), mesAnterior.getUTCMonth(), numero)
    celdas.push({ dia, numero, delMes: false, esHoy: dia === diaDeHoy })
  }

  for (let numero = 1; numero <= diasEnElMes; numero++) {
    const dia = aDia(anio, mes, numero)
    celdas.push({ dia, numero, delMes: true, esHoy: dia === diaDeHoy })
  }

  // Se completa la última semana, y solo la última: una fila entera del mes
  // siguiente sería una fila de nada.
  const siguiente = new Date(Date.UTC(anio, mes + 1, 1, 12))
  let numero = 1
  while (celdas.length % DIAS_POR_SEMANA !== 0) {
    const dia = aDia(siguiente.getUTCFullYear(), siguiente.getUTCMonth(), numero)
    celdas.push({ dia, numero, delMes: false, esHoy: dia === diaDeHoy })
    numero++
  }

  const semanas: DiaDelCalendario[][] = []
  for (let i = 0; i < celdas.length; i += DIAS_POR_SEMANA) {
    semanas.push(celdas.slice(i, i + DIAS_POR_SEMANA))
  }
  return semanas
}

/**
 * Agrupa por día civil lo que tenga una fecha.
 *
 * Genérico porque el calendario no debería saber qué es una sesión: hoy son
 * sesiones, mañana pueden ser fechas compromiso de acuerdos en el mismo
 * cuadro.
 */
export function agruparPorDia<T extends { fecha: string }>(cosas: T[]): Map<string, T[]> {
  const mapa = new Map<string, T[]>()
  for (const cosa of cosas) {
    const dia = diaCivil(cosa.fecha)
    const lista = mapa.get(dia)
    if (lista) lista.push(cosa)
    else mapa.set(dia, [cosa])
  }
  return mapa
}

/** Mes anterior y siguiente, sin que diciembre se salga del año. */
export function mesVecino(anio: number, mes: number, salto: 1 | -1): { anio: number; mes: number } {
  const total = anio * 12 + mes + salto
  return { anio: Math.floor(total / 12), mes: ((total % 12) + 12) % 12 }
}
