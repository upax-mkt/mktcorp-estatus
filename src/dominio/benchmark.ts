/**
 * EL BENCHMARK COMPETITIVO DE UNA SALA: solo la forma, sin datos.
 *
 * Aquí NO hay competidores ni lecturas. El benchmark de cada sala lo carga el
 * equipo y vive en `src/datos/benchmark.ts`; una sala sin benchmark cargado se
 * ve vacía, que es más honesto que llenarla de ficción.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PARA QUIÉN ES ESTO, que es lo que decide la forma.
 *
 * No es un informe de marketing: lo abre el director de la UDN y su equipo
 * COMERCIAL, muchas veces el día antes de una reunión con un prospecto. Lo
 * que necesitan es distinto de lo que necesita un análisis:
 *
 *   - contra quién van a competir en esa cuenta y qué les van a decir,
 *   - qué NO pelear (dónde el competidor gana de verdad),
 *   - qué industria toca prospectar este mes y con qué gancho,
 *   - una cifra que puedan repetir.
 *
 * La primera versión de este modelo solo guardaba cinco NOMBRES, la matriz de
 * niveles y un párrafo. Franco: *"falta información clave para las UDN y sus
 * equipos comerciales dentro del bench"*. Tenía razón: de un análisis de 75
 * láminas llegaba menos del 20%, y justo la parte que no se usa para vender.
 *
 * Todo lo nuevo es OPCIONAL: un benchmark que solo traiga la matriz se sigue
 * cargando igual y la página se adapta.
 */

export type NivelBenchmark = 'lider' | 'a_la_par' | 'rezagado'

/** Cuánto aprieta un competidor. Ordena la lista: alta primero. */
export type AmenazaBenchmark = 'alta' | 'media' | 'baja'

/** Intensidad de una casilla del calendario de prospección. */
export type TonoVentana = 'alto' | 'medio' | 'bajo' | 'neutro'

/**
 * Una cifra de cabecera. TRES O CUATRO, no más: son las que se leen de pie,
 * antes de entrar a nada, y la quinta ya no se lee.
 */
export interface IndicadorBenchmark {
  valor: string
  rotulo: string
  /** Qué hay que entender de esa cifra. Sin esto es un número decorativo. */
  lectura: string
  /** `gana` la pinta a favor; `atencion`, en alerta; sin tono, neutra. */
  tono?: 'gana' | 'atencion'
}

/** Un competidor seguido, con lo que hace falta para sentarse frente a él. */
export interface CompetidorBenchmark {
  nombre: string
  /** Su fortaleza real, en una línea. */
  fortaleza: string
  amenaza: AmenazaBenchmark
  /** Lo que vende mejor que la UDN. Saberlo es saber qué NO pelear. */
  nosGanaEn: string
  /** Dónde le gana la UDN. Es el argumento comercial, no un consuelo. */
  dondeSeLeGana: string
  /** Cifras públicas de su presencia digital, si se midieron. */
  digital?: Array<{ rotulo: string; valor: string }>
  /** Con qué mide sus resultados. En esta categoría es el terreno de la pelea. */
  medicion?: string
  /** Respondió, o no, a una prospección real. */
  contactabilidad?: string
}

export interface FilaDimensionBenchmark {
  dimension: string
  udn: NivelBenchmark
  /** Mismo orden que `competidores` — siempre 5 valores. */
  competidores: [NivelBenchmark, NivelBenchmark, NivelBenchmark, NivelBenchmark, NivelBenchmark]
  /** Por qué ese nivel. Es lo que hace auditable la matriz. */
  nota?: string
}

/** La tesis: lo único que hay que recordar si se olvida todo lo demás. */
export interface TesisBenchmark {
  titular: string
  ellosVenden: string
  nosotrosVendemos: string
  sustento: string
}

/**
 * Un frente donde la CATEGORÍA ENTERA es débil. No es lo mismo que una brecha
 * propia: es una puerta abierta, y por eso lleva su evidencia al lado.
 */
export interface FrenteAbierto {
  frente: string
  evidencia: string
}

/**
 * Una industria y su ventana de compra mes a mes. Es la pieza más operativa
 * de todo el benchmark: responde "¿a quién le toco esta semana y qué le
 * digo?".
 */
export interface VentanaProspeccion {
  industria: string
  prioridad: string
  /** Una casilla por columna del calendario, en orden. */
  meses: Array<{ estado: string; tono: TonoVentana }>
  /** Qué se le ofrece a esa industria, en una frase. */
  gancho: string
  /** Los servicios que le encajan. */
  encaja?: string[]
}

export interface RecomendacionBenchmark {
  que: string
  porque: string
}

/** Contexto de mercado que NO sale del análisis propio: siempre con fuente. */
export interface DatoDeMercado {
  dato: string
  fuente: string
}

export interface Benchmark {
  salaSlug: string
  competidores: [
    CompetidorBenchmark,
    CompetidorBenchmark,
    CompetidorBenchmark,
    CompetidorBenchmark,
    CompetidorBenchmark,
  ]
  dimensiones: FilaDimensionBenchmark[]
  /** El resumen ejecutivo. BREVE: lo largo va en su sección. */
  lectura: string
  /** 3-4 cifras de cabecera. */
  indicadores?: IndicadorBenchmark[]
  tesis?: TesisBenchmark
  frentesAbiertos?: FrenteAbierto[]
  prospeccion?: {
    /** Los meses del calendario. */
    columnas: string[]
    filas: VentanaProspeccion[]
    leyenda: string[]
  }
  recomendaciones?: RecomendacionBenchmark[]
  /** Cómo se mueve la categoría, con fuente externa y fecha. */
  mercado?: DatoDeMercado[]
  fuente?: string
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
  /** Competidores con amenaza alta: lo que se mira antes de una reunión. */
  amenazasAltas: string[]
  /** Las industrias que están en su pico de compra ESTE mes del calendario. */
  vendenAhora: string[]
}

export function resumirBenchmark(b: Benchmark, indiceDeMes = 0): ResumenBenchmark {
  const cuenta = (nivel: NivelBenchmark) => b.dimensiones.filter((d) => d.udn === nivel).length
  return {
    lider: cuenta('lider'),
    aLaPar: cuenta('a_la_par'),
    rezagado: cuenta('rezagado'),
    total: b.dimensiones.length,
    brechas: b.dimensiones.filter((d) => d.udn === 'rezagado').map((d) => d.dimension),
    amenazasAltas: b.competidores.filter((c) => c.amenaza === 'alta').map((c) => c.nombre),
    // `tono: 'alto'` es el pico de actividad del calendario. Es lo único de
    // este resumen que caduca solo: la columna se elige por mes.
    vendenAhora: (b.prospeccion?.filas ?? [])
      .filter((f) => f.meses[indiceDeMes]?.tono === 'alto')
      .map((f) => f.industria),
  }
}
