import type { DecisionSlide } from '@/decision/esquema'

/**
 * PLANTILLAS DE REUNIÓN.
 *
 * Hasta ahora la app daba por hecho que toda sesión era el estatus mensual de
 * una UDN: ocho secciones fijas, escritas en el código como si fueran una ley
 * del dominio. Y para el estatus lo son — es la estructura acordada de esa
 * reunión. Pero una junta de squad, un comité o un arranque de campaña no
 * tienen portada, ni RevOps, ni Outbound, y llegar a esa reunión con ocho
 * bloques que borrar es peor que llegar con la hoja en blanco.
 *
 * Así que las ocho dejan de ser ley y pasan a ser UNA plantilla. La
 * herramienta sirve para cualquier reunión; la plantilla dice de cuál.
 *
 * Lo que una plantilla NO hace: encerrar. Sus secciones se pueden reordenar,
 * renombrar, cambiar de tipo y —salvo en la de estatus, donde los ocho
 * bloques son el acuerdo con la UDN— borrar. Es un punto de partida, no un
 * formulario.
 */

/** Una entrada de la estructura: qué sección es y cómo se llama. */
export interface DefinicionItem {
  /** Identidad estable de la sección; sobrevive a reordenarla. */
  tipo: string
  /** Nombre de respaldo en la lista, mientras la sección no tenga título propio. */
  titulo: string
  /** Pista de qué poner aquí. */
  pregunta: string
  /** Tipo de sección con el que nace. El equipo puede cambiarlo en el editor. */
  layout?: DecisionSlide['layout']
  /** El `tipo` de la sección base que la contiene, si es una subsección. */
  padre?: string
}

export interface Plantilla {
  id: string
  nombre: string
  /** Una línea: cuándo elegir esta y no otra. */
  paraQue: string
  /**
   * Si sus secciones son un acuerdo que no se rompe. Solo la de estatus: los
   * ocho bloques son lo que Marketing Corp le prometió a cada UDN, y borrar
   * "RevOps" de un estatus no es personalizar, es incumplir. En el resto,
   * todo se puede quitar.
   */
  seccionesFijas: boolean
  items: DefinicionItem[]
}

/** Los ocho bloques del estatus de una UDN. Era `ESTRUCTURA_POR_DEFECTO`. */
const ESTATUS_UDN: DefinicionItem[] = [
  {
    tipo: 'portada',
    titulo: 'Portada',
    pregunta: 'De qué estatus se trata y qué periodo cubre.',
    layout: 'portada',
  },
  {
    tipo: 'agenda',
    titulo: 'Agenda',
    pregunta: 'Los bloques de la sesión. En el documento se vuelven un índice navegable.',
    layout: 'agenda',
  },
  {
    tipo: 'acuerdos-pendientes',
    titulo: 'Acuerdos y Pendientes',
    // Sección ÚNICA, no un bloque: lo que se repasa aquí es la tabla de
    // pendientes de la sesión pasada. Abrirle una subsección llamada
    // "Pendientes" era decir dos veces lo mismo.
    pregunta: 'La tabla de lo que quedó de la sesión pasada, con su semáforo.',
    layout: 'pendientes-semaforo',
  },
  {
    tipo: 'portafolio-ecosistema',
    titulo: 'Portafolio & Ecosistema',
    pregunta: 'Servicios, herramientas comerciales y materiales.',
    layout: 'divisor-seccion',
  },
  {
    tipo: 'performance-conversion',
    titulo: 'Performance & Conversión',
    pregunta: 'Sitio web, paid media, conversión.',
    layout: 'divisor-seccion',
  },
  {
    tipo: 'campanas-360',
    titulo: 'Campañas 360',
    pregunta: 'Campañas en curso y su resultado.',
    layout: 'divisor-seccion',
  },
  {
    tipo: 'revops',
    titulo: 'RevOps',
    pregunta: 'Datos, procesos y herramientas de ingresos.',
    layout: 'divisor-seccion',
  },
  {
    tipo: 'outbound-pipeline',
    titulo: 'Outbound & Pipeline',
    pregunta: 'Prospección, cumplimiento y pipeline.',
    layout: 'divisor-seccion',
  },
]

export const PLANTILLAS: Plantilla[] = [
  {
    id: 'estatus-udn',
    nombre: 'Estatus de UDN',
    paraQue: 'La reunión mensual con una unidad de negocio. Los ocho bloques acordados.',
    seccionesFijas: true,
    items: ESTATUS_UDN,
  },
  {
    id: 'en-blanco',
    nombre: 'En blanco',
    paraQue: 'Una portada y nada más. Para armar la reunión desde cero.',
    seccionesFijas: false,
    items: [
      {
        tipo: 'portada',
        titulo: 'Portada',
        pregunta: 'De qué trata esta reunión.',
        layout: 'portada',
      },
    ],
  },
  {
    id: 'seguimiento',
    nombre: 'Seguimiento de proyecto',
    paraQue: 'Avance, lo que bloquea y qué sigue. Sirve para un squad o un proyecto.',
    seccionesFijas: false,
    items: [
      { tipo: 'portada', titulo: 'Portada', pregunta: 'Qué proyecto y qué periodo.', layout: 'portada' },
      { tipo: 'agenda', titulo: 'Agenda', pregunta: 'Los puntos de la reunión.', layout: 'agenda' },
      {
        tipo: 'avance',
        titulo: 'Dónde vamos',
        pregunta: 'El avance contra lo planeado. Cifras si las hay.',
        layout: 'kpis-fila-dos-columnas',
      },
      {
        tipo: 'bloqueos',
        titulo: 'Qué está bloqueando',
        pregunta: 'Lo que impide avanzar, con responsable.',
        layout: 'pendientes-semaforo',
      },
      {
        tipo: 'siguiente',
        titulo: 'Qué sigue',
        pregunta: 'Los próximos pasos, en orden.',
        layout: 'tarjetas-numeradas',
      },
    ],
  },
  {
    id: 'comite',
    nombre: 'Comité o dirección',
    paraQue: 'Pocas cifras, una decisión que tomar y lo que se pide aprobar.',
    seccionesFijas: false,
    items: [
      { tipo: 'portada', titulo: 'Portada', pregunta: 'De qué se decide hoy.', layout: 'portada' },
      {
        tipo: 'situacion',
        titulo: 'La situación',
        pregunta: 'Dónde estamos, en cifras.',
        layout: 'kpis-fila-dos-columnas',
      },
      {
        tipo: 'opciones',
        titulo: 'Las opciones',
        pregunta: 'Los caminos posibles, uno por bloque.',
        layout: 'tarjetas-numeradas',
      },
      {
        tipo: 'pide',
        titulo: 'Lo que se pide',
        pregunta: 'Qué decisión se necesita y de quién.',
        layout: 'texto-multicolumna',
      },
      { tipo: 'cierre', titulo: 'Cierre', pregunta: 'Con qué se cierra.', layout: 'cierre' },
    ],
  },
  {
    id: 'arranque',
    nombre: 'Arranque de campaña',
    paraQue: 'Kickoff: objetivo, territorio, plan y quién hace qué.',
    seccionesFijas: false,
    items: [
      { tipo: 'portada', titulo: 'Portada', pregunta: 'Qué campaña y para quién.', layout: 'portada' },
      {
        tipo: 'objetivo',
        titulo: 'El objetivo',
        pregunta: 'Qué tiene que pasar para que esto haya funcionado.',
        layout: 'meta-real-porcentaje',
      },
      {
        tipo: 'territorio',
        titulo: 'El territorio',
        pregunta: 'La idea y por qué esta y no otra.',
        layout: 'texto-multicolumna',
      },
      {
        tipo: 'plan',
        titulo: 'El plan',
        pregunta: 'Canales, calendario y presupuesto.',
        layout: 'grafico-y-tabla',
      },
      {
        tipo: 'equipo',
        titulo: 'Quién hace qué',
        pregunta: 'Responsables y fechas.',
        layout: 'pendientes-semaforo',
      },
    ],
  },
]

export const PLANTILLA_POR_DEFECTO = 'estatus-udn'

export function obtenerPlantilla(id: string | null | undefined): Plantilla {
  return PLANTILLAS.find((p) => p.id === id) ?? PLANTILLAS[0]
}

/**
 * Los `tipo` que no se pueden borrar en una sesión.
 *
 * Depende de la plantilla: en un estatus de UDN los ocho bloques son el
 * acuerdo con la unidad y no se tocan; en una reunión libre no hay nada
 * sagrado. Antes esto era un `Set` global — con una sola plantilla daba
 * igual, con cinco convertía cada sección de cada plantilla en indeleble.
 */
export function tiposFijosDe(plantillaId: string | null | undefined): Set<string> {
  const p = obtenerPlantilla(plantillaId)
  return p.seccionesFijas ? new Set(p.items.map((i) => i.tipo)) : new Set()
}
