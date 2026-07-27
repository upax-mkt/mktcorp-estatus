/**
 * EL BENCHMARK COMPETITIVO DE UNA SALA: solo la forma, sin datos.
 *
 * Aquí NO hay competidores ni lecturas. El benchmark de cada sala lo carga el
 * equipo en la app y vive en la base de datos; una sala sin benchmark cargado
 * se ve vacía. Antes este archivo traía cinco competidores inventados por
 * sala —con nombres de fantasía, para no afirmar datos falsos de terceros—
 * que la app enseñaba como si fueran análisis. Un espacio vacío que dice "aún
 * no hay benchmark" es más honesto y más útil que uno lleno de ficción.
 */

export type NivelBenchmark = 'lider' | 'a_la_par' | 'rezagado'

export interface FilaDimensionBenchmark {
  dimension: string
  udn: NivelBenchmark
  /** Mismo orden que `competidores` en Benchmark — siempre 5 valores. */
  competidores: [NivelBenchmark, NivelBenchmark, NivelBenchmark, NivelBenchmark, NivelBenchmark]
}

export interface Benchmark {
  salaSlug: string
  /** Siempre 5 (spec §5: "siguiendo 5 competidores por UDN"). */
  competidores: [string, string, string, string, string]
  /** 4-5 filas comparadas. */
  dimensiones: FilaDimensionBenchmark[]
  /** La lectura de Mkt Corp: dónde gana la UDN, dónde debe cerrar brecha. */
  lectura: string
  /** ISO (fecha) de la última actualización de este benchmark. */
  actualizado: string
}


/** Sin base de datos no hay benchmark que enseñar: nadie lo ha cargado. */
export function obtenerBenchmarkEjemplo(_salaSlug: string): Benchmark | null {
  return null
}
