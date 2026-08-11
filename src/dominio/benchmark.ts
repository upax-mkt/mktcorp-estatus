import type { DecisionSlide } from '@/decision/esquema'

/**
 * EL BENCHMARK COMPETITIVO DE UNA SALA: solo la forma, sin datos.
 *
 * El benchmark de cada sala vive en `src/datos/benchmark.ts`; una sala sin
 * benchmark cargado se ve vacía, que es más honesto que llenarla de ficción.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PARA QUIÉN ES, que es lo que decide la forma.
 *
 * Lo abre el director de la UDN y su equipo COMERCIAL, muchas veces la
 * víspera de una reunión con un prospecto. Necesitan contra quién compiten,
 * qué NO pelear, con qué cifra rebatir, y la prueba a la vista.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * LA ESCALA ES LA DEL ANÁLISIS, NO UNA INVENTADA.
 *
 * Este modelo empezó con tres niveles (líder / a la par / rezagado) porque
 * los inventé antes de mirar el deck. El benchmark real usa CUATRO, y los
 * define él mismo (lámina 60):
 *
 *   Líder   — referente: marca el estándar que los demás deben superar.
 *   Sólido  — bien resuelto y competitivo; cumple el estándar de la categoría.
 *   Básico  — existe, pero mínimo o incompleto; todavía no compite.
 *   Ausente — sin presencia detectable de esta capacidad.
 *   Sin dato— aún no se ha cargado información para esa casilla.
 *
 * Aplastar cuatro niveles en tres pierde justo la distinción que usa un
 * comercial: "Sólido" y "Básico" no son lo mismo delante de un cliente.
 */

/** La escala del análisis. `sin_dato` NO es un nivel bajo: es ausencia de medición. */
export type NivelBenchmark = 'lider' | 'solido' | 'basico' | 'ausente' | 'sin_dato'

/** Cuánto aprieta un competidor. Ordena la lista: alta primero. */
export type AmenazaBenchmark = 'alta' | 'media' | 'baja'

/** Una cifra de cabecera. Tres o cuatro: la quinta ya no se lee. */
export interface IndicadorBenchmark {
  valor: string
  rotulo: string
  /** Qué hay que entender de esa cifra. Sin esto es un número decorativo. */
  lectura: string
  tono?: 'gana' | 'atencion'
}

/** Cómo respondió un competidor a una prospección real. */
export interface ContactabilidadBenchmark {
  /** "Básica", "No validada"… tal como lo clasificó el análisis. */
  nivel: string
  velocidad: string
  calidad: string
  informacion: string
  /** Qué significa para la UDN. Es la parte accionable. */
  implicacion: string
}

/** Un competidor, con lo que hace falta para sentarse frente a él. */
export interface CompetidorBenchmark {
  nombre: string
  /** Su fortaleza real, en una línea. */
  fortaleza: string
  amenaza: AmenazaBenchmark
  /** Lo que vende mejor que la UDN. Saberlo es saber qué NO pelear. */
  nosGanaEn: string
  /** Dónde le gana la UDN. Es el argumento comercial, no un consuelo. */
  dondeSeLeGana: string
  /* SIN `digital` EN LA FICHA. Esas seis cifras —visitas, tráfico de marca,
     keywords, autoridad, visibilidad en IA, backlinks— ya son seis de las doce
     filas de `comparativa`, y dos de ellas además son series de un gráfico. El
     mismo número dicho de tres formas no da más certeza: alarga la lectura.
     La tabla comparativa es la fuente, porque es la que se cita en una
     reunión. */
  /** Con qué mide sus resultados: en esta categoría es el terreno de la pelea. */
  medicion?: string
  contactabilidad?: ContactabilidadBenchmark
  /** Certificaciones, alianzas y presencia en la industria. */
  institucional?: string
  /**
   * Su fortaleza NO evidente: la que no se ve en el inventario y explica por
   * qué gana cuentas. Es la lectura más útil del análisis para un comercial.
   */
  fortalezaInvisible?: string
  /** Qué hace en inbound: recursos, blog, nutrición. */
  inbound?: string
  /** Su madurez en medios pagados, si se midió. */
  paid?: string
}

/** Una fila de cualquier matriz de niveles: la UDN primero, luego los cinco. */
export interface FilaMatrizBenchmark {
  variable: string
  udn: NivelBenchmark
  /** Mismo orden que `competidores` — siempre 5. */
  competidores: [NivelBenchmark, NivelBenchmark, NivelBenchmark, NivelBenchmark, NivelBenchmark]
  /** Por qué ese nivel. Es lo que hace auditable la matriz. */
  nota?: string
}

/**
 * Una tabla comparativa de cifras duras: un criterio por fila, un actor por
 * columna. No es la matriz de niveles — aquí van los NÚMEROS, que es lo que
 * se cita en una reunión.
 */
export interface TablaComparativa {
  titulo: string
  /** Un criterio por fila; `valores` va en el mismo orden que `competidores`. */
  filas: Array<{
    criterio: string
    udn: string
    valores: [string, string, string, string, string]
    /** true cuando la UDN gana esa fila: se marca sin tener que leerla toda. */
    ganaLaUdn?: boolean
  }>
  notaPie?: string
  fuente?: string
}

/* NO HAY TIPO PARA EL RADAR, y es a propósito. Existía un `EjeRadar` con
   valores 1-5 que nunca se llenó: la lámina del radar no rotula sus valores,
   así que llenarlo obligaba a estimarlos leyendo un dibujo. Un campo
   "disponible" que nadie llena es una invitación a hacer exactamente eso. */

/** La tesis: lo único que hay que recordar si se olvida todo lo demás. */
export interface TesisBenchmark {
  titular: string
  ellosVenden: string
  nosotrosVendemos: string
  sustento: string
}

/** Un frente donde la CATEGORÍA ENTERA es débil: una puerta abierta. */
export interface FrenteAbierto {
  frente: string
  evidencia: string
}

export interface RecomendacionBenchmark {
  que: string
  porque: string
}

/**
 * UN TESTIGO: la prueba a la vista. Una lámina del análisis —un gráfico, la
 * captura de un anuncio de la competencia, una matriz— que no se puede
 * reconstruir con datos y que vale porque se VE.
 *
 * `url` se sirve por `/api/archivo/[id]`, nunca por la URL de Blob a pelo: el
 * store es privado y esa ruta es la que comprueba el permiso contra la sala.
 */
export interface TestigoBenchmark {
  titulo: string
  /** Qué hay que mirar en esa imagen. Sin esto es decoración. */
  lectura: string
  url: string
  /** De qué bloque del análisis viene. */
  bloque?: string
}

/**
 * Un gráfico del análisis, en el MISMO contrato que usa el documento de una
 * reunión (`DecisionSlide['graficos']`). Se reutiliza a propósito: ya está
 * validado, ya se dibuja con el color de la sala y ya sabe de doble eje. Un
 * segundo formato de gráfico solo para esta pantalla sería otro sitio donde
 * el mismo dato se dibuja distinto.
 */
export type GraficoBenchmark = NonNullable<DecisionSlide['graficos']>[number]

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
  /** La matriz de posicionamiento: variables × actores, en la escala de 4. */
  matriz: FilaMatrizBenchmark[]
  /** El resumen ejecutivo. BREVE: lo largo va en su sección. */
  lectura: string
  indicadores?: IndicadorBenchmark[]
  tesis?: TesisBenchmark
  /** Las cifras duras, criterio por criterio. */
  comparativa?: TablaComparativa
  frentesAbiertos?: FrenteAbierto[]
  recomendaciones?: RecomendacionBenchmark[]
  /** Los gráficos del análisis que SÍ traen sus valores rotulados. */
  graficos?: Array<{ grafico: GraficoBenchmark; lectura?: string }>
  /** Las láminas que valen porque se ven. */
  testigos?: TestigoBenchmark[]
  mercado?: DatoDeMercado[]
  fuente?: string
  actualizado: string
}

/** El resumen que enseña la sala. */
export interface ResumenBenchmark {
  lider: number
  solido: number
  basico: number
  ausente: number
  total: number
  /** Variables donde la UDN va en `basico` o `ausente`: lo que hay que cerrar. */
  brechas: string[]
  /** Variables donde la UDN es la única líder: el argumento no replicable. */
  unicaLider: string[]
  amenazasAltas: string[]
}

export function resumirBenchmark(b: Benchmark): ResumenBenchmark {
  const cuenta = (nivel: NivelBenchmark) => b.matriz.filter((d) => d.udn === nivel).length
  return {
    lider: cuenta('lider'),
    solido: cuenta('solido'),
    basico: cuenta('basico'),
    ausente: cuenta('ausente'),
    total: b.matriz.length,
    brechas: b.matriz.filter((d) => d.udn === 'basico' || d.udn === 'ausente').map((d) => d.variable),
    // "Única líder" es la frase que de verdad se usa vendiendo: no basta con
    // liderar, importa que nadie más lidere esa misma variable.
    unicaLider: b.matriz
      .filter((d) => d.udn === 'lider' && !d.competidores.includes('lider'))
      .map((d) => d.variable),
    amenazasAltas: b.competidores.filter((c) => c.amenaza === 'alta').map((c) => c.nombre),
  }
}
