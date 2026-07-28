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

/** Cuántas dimensiones tiene la UDN en cada nivel. Es el resumen de la sala. */
export interface ResumenBenchmark {
  lider: number
  aLaPar: number
  rezagado: number
  total: number
  /** Las dimensiones donde la UDN va por detrás. Lo que hay que cerrar. */
  brechas: string[]
}

/**
 * El benchmark en una línea.
 *
 * La sala enseña esto y no la matriz entera: seis columnas por cinco filas de
 * etiquetas es una tabla que se estudia, no que se mira de paso, y la sala es
 * una pantalla de las que se miran de paso. La matriz vive en su propia
 * página.
 */
export function resumirBenchmark(b: Benchmark): ResumenBenchmark {
  const cuenta = (nivel: NivelBenchmark) => b.dimensiones.filter((d) => d.udn === nivel).length
  return {
    lider: cuenta('lider'),
    aLaPar: cuenta('a_la_par'),
    rezagado: cuenta('rezagado'),
    total: b.dimensiones.length,
    brechas: b.dimensiones.filter((d) => d.udn === 'rezagado').map((d) => d.dimension),
  }
}
