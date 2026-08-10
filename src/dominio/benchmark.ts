/**
 * EL BENCHMARK COMPETITIVO DE UNA SALA: solo la forma, sin datos.
 *
 * Aquí NO hay competidores ni lecturas. El benchmark de cada sala lo carga el
 * equipo en la app y vive en la base de datos; una sala sin benchmark cargado
 * se ve vacía. Antes este archivo traía cinco competidores inventados por
 * sala —con nombres de fantasía, para no afirmar datos falsos de terceros—
 * que la app enseñaba como si fueran análisis. Un espacio vacío que dice "aún
 * no hay benchmark" es más honesto y más útil que uno lleno de ficción.
 *
 * LA FORMA CRECIÓ AL CARGAR EL PRIMER BENCHMARK REAL (Promo Espacio, junio
 * 2026: 75 láminas). Antes solo cabían cinco NOMBRES de competidor, la matriz
 * de niveles y un párrafo de lectura, y con eso se perdía lo que de verdad
 * usa un director: por qué cada competidor amenaza, dónde se le gana, cuál es
 * la tesis del análisis y qué hay que hacer. Todo lo nuevo es OPCIONAL: un
 * benchmark que solo traiga la matriz se sigue cargando igual.
 */

export type NivelBenchmark = 'lider' | 'a_la_par' | 'rezagado'

/** Cuánto aprieta un competidor. Es el eje de la matriz de amenaza. */
export type AmenazaBenchmark = 'alta' | 'media' | 'baja'

/**
 * Un competidor seguido.
 *
 * Era una cadena suelta con el nombre. Un nombre no sirve para preparar una
 * reunión: el director pregunta "¿y ese por qué me amenaza?" y la respuesta
 * estaba en un PDF fuera de la app.
 */
export interface CompetidorBenchmark {
  nombre: string
  /** Su fortaleza real, en una línea ("Transporte concesionado, audiencia cautiva"). */
  fortaleza: string
  amenaza: AmenazaBenchmark
  /** Dónde le gana la UDN. Es la respuesta comercial, no un consuelo. */
  dondeSeLeGana: string
}

export interface FilaDimensionBenchmark {
  dimension: string
  udn: NivelBenchmark
  /** Mismo orden que `competidores` en Benchmark — siempre 5 valores. */
  competidores: [NivelBenchmark, NivelBenchmark, NivelBenchmark, NivelBenchmark, NivelBenchmark]
  /** Por qué ese nivel. Una línea; se lee bajo la fila. */
  nota?: string
}

/** La tesis del benchmark: lo único que hay que recordar si se olvida todo lo demás. */
export interface TesisBenchmark {
  titular: string
  /** Qué vende la competencia. */
  ellosVenden: string
  /** Qué vende la UDN. */
  nosotrosVendemos: string
  sustento: string
}

export interface RecomendacionBenchmark {
  que: string
  porque: string
}

export interface Benchmark {
  salaSlug: string
  /** Siempre 5 (spec §5: "siguiendo 5 competidores por UDN"). */
  competidores: [
    CompetidorBenchmark,
    CompetidorBenchmark,
    CompetidorBenchmark,
    CompetidorBenchmark,
    CompetidorBenchmark,
  ]
  /** 4-6 filas comparadas. */
  dimensiones: FilaDimensionBenchmark[]
  /** La lectura de Mkt Corp: dónde gana la UDN, dónde debe cerrar brecha. */
  lectura: string
  tesis?: TesisBenchmark
  /** En orden de impacto y facilidad de ejecución. */
  recomendaciones?: RecomendacionBenchmark[]
  /** De dónde salió el análisis, para poder volver a la fuente. */
  fuente?: string
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
  /** Competidores con amenaza alta. Es lo que se mira antes de una reunión. */
  amenazasAltas: string[]
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
    amenazasAltas: b.competidores.filter((c) => c.amenaza === 'alta').map((c) => c.nombre),
  }
}
