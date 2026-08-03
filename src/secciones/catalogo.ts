import type { DecisionSlide } from '@/decision/esquema'
import { LAYOUTS } from '@/decision/esquema'

/**
 * QUÉ TIPOS DE SECCIÓN EXISTEN Y QUÉ ADMITE CADA UNO.
 *
 * Fuente única de tres cosas que antes vivían separadas y se desincronizaban:
 *
 * 1. El **menú del editor**: qué puede elegir el equipo al armar una sección,
 *    con nombre en claro y para qué sirve.
 * 2. Los **campos del formulario**: cada tipo enseña solo lo que admite. Un
 *    editor que muestra los trece campos siempre convierte el trabajo en
 *    adivinar cuáles aplican.
 * 3. El **catálogo que se le ofrece a la IA** (`src/motor/catalogo.ts`) cuando
 *    se le pide que proponga una sección. La IA es un atajo opcional: el
 *    camino principal es este catálogo, elegido a mano.
 *
 * El `papel` decide cómo se dibuja la sección dentro del documento:
 * - `hito`: no lleva contenido, marca un punto del recorrido (arranque, cambio
 *   de bloque, cierre). Respira más y no entra al índice como una sección más.
 * - `indice`: la agenda, que aquí lleva a cada sección en vez de ser una lista
 *   muerta.
 * - `contenido`: todo lo demás.
 */

export type PapelDeSeccion = 'hito' | 'indice' | 'contenido'

/** Cada campo de contenido que una sección puede llevar. El título va siempre. */
export type CampoSeccion =
  | 'subtitulo'
  | 'cuerpo'
  | 'kpis'
  | 'columnas'
  | 'tablas'
  | 'graficos'
  | 'matriz'
  | 'metaReal'
  | 'cifrasDesglosadas'
  | 'bloques'
  | 'imagen'
  | 'video'
  | 'notaPie'

export interface TipoDeSeccion {
  layout: DecisionSlide['layout']
  papel: PapelDeSeccion
  /** Cómo se llama en el menú del editor. */
  nombre: string
  /** Una línea: cuándo usar esta y no otra. */
  paraQue: string
  /** Los campos que admite, en el orden en que se piden en el formulario. */
  campos: CampoSeccion[]
  /** El campo sin el cual la sección no dice nada. */
  exige?: CampoSeccion
}

export const CATALOGO: TipoDeSeccion[] = [
  {
    layout: 'portada',
    papel: 'hito',
    nombre: 'Portada',
    paraQue: 'Abre la sesión: de qué estatus se trata y qué periodo cubre.',
    campos: ['subtitulo'],
  },
  {
    layout: 'agenda',
    papel: 'indice',
    nombre: 'Agenda',
    paraQue: 'El orden del día. En el documento se convierte en un índice que lleva a cada sección.',
    campos: ['subtitulo', 'cuerpo', 'imagen'],
  },
  {
    layout: 'divisor-seccion',
    papel: 'hito',
    nombre: 'Divisor',
    paraQue: 'Separa un bloque de la sesión del siguiente. Sin contenido: solo el nombre del bloque.',
    campos: ['subtitulo'],
  },
  {
    layout: 'kpis-fila-dos-columnas',
    papel: 'contenido',
    nombre: 'Cifras y análisis',
    paraQue: 'Hasta 4 cifras con su variación arriba, y el análisis en columnas debajo.',
    campos: ['subtitulo', 'kpis', 'columnas', 'notaPie'],
    exige: 'kpis',
  },
  {
    layout: 'texto-multicolumna',
    papel: 'contenido',
    nombre: 'Columnas de texto',
    paraQue: 'Contenido cualitativo, sin cifras, repartido en bloques paralelos. Admite listas anidadas.',
    campos: ['subtitulo', 'columnas', 'notaPie'],
    exige: 'columnas',
  },
  {
    layout: 'pendientes-semaforo',
    papel: 'contenido',
    nombre: 'Pendientes con semáforo',
    paraQue: 'El repaso de lo que quedó de la sesión pasada: responsable, tarea y estatus.',
    campos: ['subtitulo', 'tablas', 'notaPie'],
    exige: 'tablas',
  },
  {
    layout: 'comparativa-periodos',
    papel: 'contenido',
    nombre: 'Comparativa entre periodos',
    paraQue: 'Una tabla de un periodo contra otro, con la lectura de qué subió y qué bajó.',
    campos: ['subtitulo', 'tablas', 'graficos', 'columnas', 'notaPie'],
    exige: 'tablas',
  },
  {
    layout: 'grafico-y-tabla',
    papel: 'contenido',
    nombre: 'Gráficos y tablas',
    paraQue: 'Cuando el dato exacto y la tendencia importan por igual. Hasta 2 gráficos y 3 tablas.',
    campos: ['subtitulo', 'graficos', 'tablas', 'kpis', 'columnas', 'notaPie'],
  },
  {
    layout: 'meta-real-porcentaje',
    papel: 'contenido',
    nombre: 'Meta contra real',
    paraQue: 'Cumplimiento por equipo y, si aplica, cifras grandes abiertas en sus partes.',
    campos: ['subtitulo', 'metaReal', 'cifrasDesglosadas', 'columnas', 'notaPie'],
    exige: 'metaReal',
  },
  {
    layout: 'tarjetas-numeradas',
    papel: 'contenido',
    nombre: 'Bloques numerados',
    paraQue: 'Frentes de igual peso —los focos del trimestre—, cada uno con su detalle. El sistema los numera.',
    campos: ['subtitulo', 'bloques', 'matriz', 'notaPie'],
    exige: 'bloques',
  },
  {
    layout: 'matriz-estados',
    papel: 'contenido',
    nombre: 'Matriz de estados',
    paraQue: 'Una rejilla de conceptos por periodos: en cada cruce, qué toca hacer. El calendario de prospección.',
    campos: ['subtitulo', 'matriz', 'bloques', 'notaPie'],
    exige: 'matriz',
  },
  {
    layout: 'imagen-a-sangre',
    papel: 'contenido',
    nombre: 'Imagen a sangre',
    paraQue: 'Una imagen que ocupa la sección entera, con el título encima. Para un testigo o una foto.',
    campos: ['subtitulo', 'imagen'],
    exige: 'imagen',
  },
  {
    layout: 'video',
    papel: 'contenido',
    nombre: 'Vídeo',
    paraQue: 'Un vídeo que se reproduce en el documento y a pantalla completa. Para un testimonio, una demo o un caso grabado.',
    campos: ['subtitulo', 'video'],
    exige: 'video',
  },
  {
    layout: 'cierre',
    papel: 'hito',
    nombre: 'Cierre',
    paraQue: 'Última sección de la sesión.',
    campos: ['subtitulo'],
  },
]

const POR_LAYOUT = new Map(CATALOGO.map((t) => [t.layout, t]))

// Guardia de arranque: el enum y el catálogo tienen que decir lo mismo. Un
// layout declarado sin entrada aquí no se puede elegir en el editor ni ofrecer
// a la IA — sería un nombre muerto, que es justo lo que pasaba antes.
if (POR_LAYOUT.size !== LAYOUTS.length) {
  const faltan = LAYOUTS.filter((l) => !POR_LAYOUT.has(l))
  throw new Error(`Layouts declarados sin entrada en el catálogo de secciones: ${faltan.join(', ')}`)
}

export function tipoDeSeccion(layout: DecisionSlide['layout']): TipoDeSeccion | undefined {
  return POR_LAYOUT.get(layout)
}

export function papelDe(layout: DecisionSlide['layout']): PapelDeSeccion {
  return POR_LAYOUT.get(layout)?.papel ?? 'contenido'
}

export function layoutsDelCatalogo(): DecisionSlide['layout'][] {
  return CATALOGO.map((t) => t.layout)
}

export function admiteCampo(layout: DecisionSlide['layout'], campo: CampoSeccion): boolean {
  return POR_LAYOUT.get(layout)?.campos.includes(campo) ?? false
}
