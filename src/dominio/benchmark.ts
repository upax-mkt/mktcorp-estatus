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

/**
 * LAS DISCIPLINAS: el eje por el que se agrupa TODO lo demás.
 *
 * Franco: *"sigue faltando info, no está bien clusterizada — por ejemplo RRSS,
 * Paid, PR, WEB, etc. Mejóralo"*. Tenía razón y el problema era estructural:
 * lo que se sabía de paid media estaba repartido en tres sitios —un frente
 * abierto arriba, una línea dentro del desplegable de cada uno de los cinco
 * competidores, y unas capturas al final— así que para saber cómo pauta la
 * categoría había que abrir cinco desplegables y recordar lo leído.
 *
 * Agrupado por disciplina, esa misma pregunta se contesta mirando un bloque:
 * el veredicto, los seis actores comparados, el gráfico y la evidencia, juntos.
 *
 * EL ORDEN NO ES ALFABÉTICO: va de lo que define el negocio (qué inventario
 * tienes) a lo que define la ejecución (qué pasa cuando alguien te contacta),
 * que es como se prepara una reunión.
 *
 * ESTA LISTA ES LA ÚNICA. `src/db/evidencia.ts` la importa de aquí para
 * clasificar lo que se sube: si hubiera dos listas, la evidencia acabaría en
 * un bloque que la página no dibuja.
 */
export const DISCIPLINAS = [
  {
    id: 'portafolio',
    nombre: 'Portafolio y ecosistema',
    pregunta: 'Qué vende cada uno y con qué capacidades',
  },
  {
    id: 'web',
    nombre: 'Web y SEO',
    pregunta: 'Quién capta demanda nueva y quién solo recibe a los que ya lo buscaban',
  },
  {
    id: 'paid',
    nombre: 'Paid media',
    pregunta: 'Quién pauta, con cuánto y con qué mensaje',
  },
  {
    id: 'rrss',
    nombre: 'Inbound y RRSS',
    pregunta: 'Qué publica cada uno y qué le devuelve su audiencia',
  },
  {
    id: 'pr',
    nombre: 'PR y presencia institucional',
    pregunta: 'Qué los hace parecer líderes por fuera de su inventario',
  },
  {
    id: 'comercial',
    nombre: 'Comercial',
    pregunta: 'Qué pasa cuando un prospecto real levanta la mano',
  },
] as const

export type IdDisciplina = (typeof DISCIPLINAS)[number]['id']

export function nombreDeDisciplina(id: string): string {
  return DISCIPLINAS.find((d) => d.id === id)?.nombre ?? id
}

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
    /**
     * A qué disciplina pertenece la fila. Es lo que permite que las siete
     * métricas de SEO se lean dentro de "Web y SEO" y las cinco de captación
     * dentro de "Comercial", en vez de en una tabla de doce filas donde nadie
     * distingue una cosa de la otra.
     */
    bloque?: IdDisciplina
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

/**
 * EL VEREDICTO DE UNA DISCIPLINA: qué se concluye de ella, en un párrafo.
 *
 * Sustituye a `FrenteAbierto`, que era la misma frase con otro nombre pero
 * suelta en su propia sección: se leían los cuatro frentes al principio y
 * después había que volver a buscarlos al llegar a los datos que los
 * sostienen. Aquí el veredicto encabeza su bloque y los datos van debajo.
 *
 * `ventana` marca las disciplinas donde la CATEGORÍA ENTERA está floja —no
 * solo un competidor—, que es la lectura más rentable del análisis: una puerta
 * abierta que se cierra sola con el tiempo.
 */
export interface DisciplinaBenchmark {
  id: IdDisciplina
  veredicto: string
  /** true cuando toda la categoría está débil aquí: es una ventana temporal. */
  ventana?: boolean
}

export interface RecomendacionBenchmark {
  que: string
  porque: string
}

/* LA EVIDENCIA YA NO VIVE AQUÍ. Existía un `TestigoBenchmark` con la URL de
   una imagen escrita en `src/datos/benchmark.ts`, lo que obligaba a un
   despliegue para cambiar una captura. Franco: *"la evidencia mejor la cargaré
   manualmente según la categoría, subiré imágenes o videos o url"*. Ahora se
   sube desde la propia página y vive en `archivos` con `categoria:
   'evidencia'` — ver `src/db/evidencia.ts` y la migración 0032. Las bajadas
   que ya estaban escritas se conservaron: se migraron con la fila. */

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
  /** Las cifras duras, criterio por criterio. Cada fila dice de qué disciplina es. */
  comparativa?: TablaComparativa
  /** El veredicto de cada disciplina: encabeza su bloque. */
  disciplinas?: DisciplinaBenchmark[]
  recomendaciones?: RecomendacionBenchmark[]
  /** Los gráficos del análisis que SÍ traen sus valores rotulados. */
  graficos?: Array<{ grafico: GraficoBenchmark; lectura?: string; bloque?: IdDisciplina }>
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

/**
 * QUÉ CAMPO DEL COMPETIDOR ES LA RESPUESTA DE CADA DISCIPLINA.
 *
 * Estos cuatro campos vivían dentro de un desplegable "Cómo opera" en la ficha
 * de cada competidor: para comparar cómo pauta la categoría había que abrir
 * cinco desplegables. El dato sigue donde le corresponde —es un hecho SOBRE un
 * competidor—; lo que cambia es dónde se PINTA: en su disciplina, con los
 * cinco en columna y uno debajo de otro.
 *
 * `web` y `comercial` no aparecen a propósito: su respuesta no es una frase
 * por competidor, son la tabla de cifras y la tabla de contactabilidad.
 */
const CAMPO_POR_DISCIPLINA: Partial<
  Record<IdDisciplina, { campo: keyof CompetidorBenchmark; rotulo: string }>
> = {
  portafolio: { campo: 'medicion', rotulo: 'Con qué mide cada uno' },
  paid: { campo: 'paid', rotulo: 'Cómo pauta cada uno' },
  rrss: { campo: 'inbound', rotulo: 'Qué publica cada uno' },
  pr: { campo: 'institucional', rotulo: 'Qué acredita cada uno' },
}

/** Todo lo que el análisis dice de una disciplina, en un solo objeto. */
export interface BloqueDisciplina {
  id: IdDisciplina
  nombre: string
  pregunta: string
  veredicto: string | null
  ventana: boolean
  graficos: Array<{ grafico: GraficoBenchmark; lectura?: string }>
  /** Las filas de la tabla comparativa que son de esta disciplina. */
  filas: TablaComparativa['filas']
  /** El encabezado de la comparación ("Cómo pauta cada uno"), si la hay. */
  rotulo: string | null
  /** Qué hace cada competidor aquí. Solo los que tienen algo escrito. */
  porCompetidor: Array<{ nombre: string; amenaza: AmenazaBenchmark; que: string }>
  /** true si el bloque tiene algo propio que enseñar además del veredicto. */
  tieneDatos: boolean
}

/**
 * Reparte el benchmark entre sus disciplinas, en el orden de `DISCIPLINAS`.
 *
 * Devuelve TODAS —incluidas las vacías— y marca cuáles traen datos: quien
 * dibuja decide si esconderlas o enseñarlas con su hueco. Esconderlas en
 * silencio haría invisible que una disciplina no se analizó, que es
 * información en sí misma.
 */
export function agruparPorDisciplina(b: Benchmark): BloqueDisciplina[] {
  return DISCIPLINAS.map((d) => {
    const dicho = b.disciplinas?.find((x) => x.id === d.id)
    const graficos = (b.graficos ?? []).filter((g) => g.bloque === d.id)
    const filas = (b.comparativa?.filas ?? []).filter((f) => f.bloque === d.id)
    const mapa = CAMPO_POR_DISCIPLINA[d.id]
    const porCompetidor = mapa
      ? b.competidores
          .map((c) => ({ nombre: c.nombre, amenaza: c.amenaza, que: String(c[mapa.campo] ?? '') }))
          .filter((x) => x.que.length > 0)
      : []
    return {
      id: d.id,
      nombre: d.nombre,
      pregunta: d.pregunta,
      veredicto: dicho?.veredicto ?? null,
      ventana: dicho?.ventana ?? false,
      graficos,
      filas,
      rotulo: mapa?.rotulo ?? null,
      porCompetidor,
      tieneDatos: graficos.length > 0 || filas.length > 0 || porCompetidor.length > 0,
    }
  })
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
