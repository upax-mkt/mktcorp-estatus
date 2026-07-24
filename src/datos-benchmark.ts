/**
 * Datos de ejemplo del Benchmark competitivo por sala (spec §5).
 *
 * Preliminar: a la espera de la presentación de benchmark real que Franco va
 * a pasar como referencia (ver el [PENDIENTE] de la sección 5 del spec). En
 * lo que llega, esto fija una estructura sensata — 5 competidores, 4-5
 * dimensiones comparadas, una lectura de Mkt Corp — para que el espacio deje
 * de ser un placeholder. Nombres de competidores inventados con criterio por
 * sector (nunca marcas reales), para no afirmar datos falsos de terceros.
 *
 * `ceci` y `grupo-upax` no son UDNs de negocio con competidores de mercado en
 * el sentido estricto; se les da una lectura equivalente (posicionamiento de
 * la CEO frente a otras cabezas de holding / el holding frente a otros
 * conglomerados de servicios), porque el espacio Benchmark vive en las 10
 * salas por igual (spec §5, "cada sala").
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

function fila(
  dimension: string,
  udn: NivelBenchmark,
  competidores: FilaDimensionBenchmark['competidores'],
): FilaDimensionBenchmark {
  return { dimension, udn, competidores }
}

const BENCHMARKS: Record<string, Benchmark> = {
  neracode: {
    salaSlug: 'neracode',
    competidores: ['Andina Software', 'CodeBridge LatAm', 'Softlana Consulting', 'Nimbus Devs', 'Talento IT Norte'],
    dimensiones: [
      fila('Propuesta de valor de IA aplicada', 'lider', ['a_la_par', 'rezagado', 'rezagado', 'a_la_par', 'rezagado']),
      fila('Velocidad de staffing / bench disponible', 'a_la_par', ['lider', 'a_la_par', 'rezagado', 'lider', 'a_la_par']),
      fila('Presencia digital y SEO técnico', 'rezagado', ['a_la_par', 'lider', 'a_la_par', 'rezagado', 'rezagado']),
      fila('Precio relativo por hora/squad', 'a_la_par', ['rezagado', 'rezagado', 'lider', 'a_la_par', 'lider']),
      fila('Cobertura de industrias reguladas (gobierno, salud, banca)', 'lider', ['rezagado', 'a_la_par', 'rezagado', 'rezagado', 'a_la_par']),
    ],
    lectura:
      'NeraCode lidera en propuesta de IA aplicada a proyectos y en cobertura de industrias reguladas — el gancho comercial más fuerte del portafolio. La brecha real está en presencia digital: dos competidores rankean mejor en búsqueda orgánica para "staffing IT México", y el precio por hora no es el más competitivo frente a jugadores nearshore más agresivos.',
    actualizado: '2026-07-10',
  },

  'mexa-creativa': {
    salaSlug: 'mexa-creativa',
    competidores: ['Estudio Frontal', 'Casa Creativa Norte', 'Marca y Media', 'Taller de Ideas', 'Andamio Publicidad'],
    dimensiones: [
      fila('Calidad creativa / premios de industria', 'lider', ['a_la_par', 'rezagado', 'a_la_par', 'lider', 'rezagado']),
      fila('Integración creativo + medios (full funnel)', 'lider', ['rezagado', 'rezagado', 'a_la_par', 'rezagado', 'a_la_par']),
      fila('Velocidad de entrega', 'a_la_par', ['lider', 'a_la_par', 'rezagado', 'a_la_par', 'lider']),
      fila('Presencia en redes propias / casos públicos', 'rezagado', ['a_la_par', 'lider', 'a_la_par', 'rezagado', 'a_la_par']),
      fila('Precio relativo', 'a_la_par', ['rezagado', 'a_la_par', 'lider', 'a_la_par', 'rezagado']),
    ],
    lectura:
      'Mexa Creativa gana claramente en calidad creativa y en la integración de creativo con medios, algo que ningún competidor iguala del todo. El punto ciego es vitrina propia: casi no hay casos publicados hacia afuera, mientras Casa Creativa Norte vive de mostrar su portafolio. Cerrar esa brecha es más barato que cualquier otra mejora de la tabla.',
    actualizado: '2026-07-08',
  },

  'research-land': {
    salaSlug: 'research-land',
    competidores: ['Estudio Norte Research', 'Campo & Dato', 'Vector Insights MX', 'Mercadika Research', 'Brújula Cuantitativa'],
    dimensiones: [
      fila('Cobertura de campo nacional', 'lider', ['a_la_par', 'rezagado', 'lider', 'a_la_par', 'rezagado']),
      fila('Profundidad metodológica (cuali + cuanti)', 'lider', ['a_la_par', 'rezagado', 'a_la_par', 'rezagado', 'a_la_par']),
      fila('Velocidad de entrega de hallazgos', 'rezagado', ['lider', 'a_la_par', 'a_la_par', 'lider', 'rezagado']),
      fila('Dashboards / entregables digitales', 'rezagado', ['a_la_par', 'lider', 'rezagado', 'a_la_par', 'a_la_par']),
      fila('Precio relativo por estudio', 'a_la_par', ['rezagado', 'a_la_par', 'rezagado', 'a_la_par', 'lider']),
    ],
    lectura:
      'Research Land compite de tú a tú en cobertura de campo y profundidad metodológica — ahí está el terreno ganado. La brecha es de forma, no de fondo: los hallazgos tardan más en llegar y se entregan en documento, mientras Vector Insights y Estudio Norte ya ofrecen dashboards vivos. Es una brecha de producto, resoluble sin tocar la calidad del dato.',
    actualizado: '2026-07-05',
  },

  'promo-espacio': {
    salaSlug: 'promo-espacio',
    competidores: ['OOH Total', 'Impacto Urbano', 'Vector DOOH', 'Media Espacios', 'Programática BTL MX'],
    dimensiones: [
      fila('Inventario DOOH programático (SIDI)', 'lider', ['rezagado', 'a_la_par', 'lider', 'rezagado', 'a_la_par']),
      fila('Cobertura de plazas fuera de CDMX', 'a_la_par', ['lider', 'a_la_par', 'rezagado', 'lider', 'rezagado']),
      fila('Medición y auditoría de impacto', 'lider', ['rezagado', 'rezagado', 'a_la_par', 'a_la_par', 'rezagado']),
      fila('Ejecución BTL en piso', 'a_la_par', ['a_la_par', 'lider', 'rezagado', 'a_la_par', 'lider']),
      fila('Precio relativo por plaza', 'rezagado', ['lider', 'a_la_par', 'a_la_par', 'rezagado', 'lider']),
    ],
    lectura:
      'Promo Espacio y Vector DOOH son los únicos con inventario programático real vía SIDI — ahí se juega la conversación con el cliente moderno, y auditar el impacto es una ventaja que casi nadie más ofrece. La debilidad es de cobertura fuera de CDMX y de precio: dos jugadores más chicos compiten agresivo en plaza y tarifa donde Promo Espacio no puede entrar en guerra de precio sin erosionar margen.',
    actualizado: '2026-07-15',
  },

  'marketing-united': {
    salaSlug: 'marketing-united',
    competidores: ['Experiencia Viva', 'Activa Group', 'Momentos BTL', 'Vivo Experiencial', 'Escena Marketing'],
    dimensiones: [
      fila('Diseño estratégico de experiencia (no solo ejecución)', 'lider', ['rezagado', 'a_la_par', 'rezagado', 'a_la_par', 'rezagado']),
      fila('Red de proveedores y logística nacional', 'a_la_par', ['lider', 'a_la_par', 'lider', 'rezagado', 'a_la_par']),
      fila('Medición de ROI de experiencia', 'rezagado', ['rezagado', 'rezagado', 'a_la_par', 'a_la_par', 'rezagado']),
      fila('Portafolio de marcas ancla (casos grandes)', 'a_la_par', ['a_la_par', 'lider', 'rezagado', 'a_la_par', 'rezagado']),
      fila('Precio relativo', 'rezagado', ['a_la_par', 'rezagado', 'lider', 'a_la_par', 'lider']),
    ],
    lectura:
      'Marketing United es de las pocas que diseña la experiencia como estrategia y no solo como logística de piso — una ventaja real pero difícil de mostrar sin casos ancla propios, donde Activa Group sí tiene marcas grandes que enseñar. Nadie en la categoría mide bien el ROI de experiencia; ser el primero en resolverlo sería diferenciador, hoy es una debilidad compartida por todos.',
    actualizado: '2026-06-28',
  },

  'house-of-films': {
    salaSlug: 'house-of-films',
    competidores: ['Estudio Lumen', 'Rodaje Central', 'Producciones Nortec', 'Casa Fílmica del Bajío', 'Cine Comercial MX'],
    dimensiones: [
      fila('Calidad de dirección de fotografía / postproducción', 'lider', ['a_la_par', 'rezagado', 'rezagado', 'a_la_par', 'a_la_par']),
      fila('Velocidad de entrega bajo presión (crisis, coyuntura)', 'lider', ['rezagado', 'a_la_par', 'rezagado', 'rezagado', 'a_la_par']),
      fila('Capacidad de producción simultánea (multi-set)', 'rezagado', ['lider', 'a_la_par', 'lider', 'a_la_par', 'rezagado']),
      fila('Costo relativo de producción', 'rezagado', ['a_la_par', 'lider', 'a_la_par', 'lider', 'a_la_par']),
      fila('Portafolio institucional / corporate', 'lider', ['a_la_par', 'rezagado', 'a_la_par', 'rezagado', 'rezagado']),
    ],
    lectura:
      'House of Films gana en calidad técnica y en algo que casi nadie más ofrece: producir rápido cuando la coyuntura aprieta, como en el video de respuesta institucional de julio. La limitante es de escala — no corre varios sets grandes a la vez como Estudio Lumen o Producciones Nortec, y su costo por producción está por encima del promedio de la categoría.',
    actualizado: '2026-07-18',
  },

  uix: {
    salaSlug: 'uix',
    competidores: ['Estudio Interfaz', 'UX Nativa', 'Diseño de Servicio Co', 'Bloque Digital Design', 'Vector UX'],
    dimensiones: [
      fila('Service design end-to-end (no solo pantallas)', 'lider', ['rezagado', 'a_la_par', 'lider', 'rezagado', 'a_la_par']),
      fila('Sistemas de diseño reutilizables', 'lider', ['a_la_par', 'rezagado', 'a_la_par', 'rezagado', 'rezagado']),
      fila('Velocidad de research-to-prototipo', 'a_la_par', ['lider', 'a_la_par', 'rezagado', 'lider', 'a_la_par']),
      fila('Presencia comercial / cuentas ancla propias', 'rezagado', ['a_la_par', 'lider', 'a_la_par', 'rezagado', 'a_la_par']),
      fila('Precio relativo', 'a_la_par', ['rezagado', 'a_la_par', 'rezagado', 'lider', 'a_la_par']),
    ],
    lectura:
      'UiX y Diseño de Servicio Co son las únicas que piensan el servicio completo y no solo la interfaz — terreno defendible frente a estudios que solo entregan pantallas. La brecha comercial es real: UX Nativa muestra cuentas ancla propias que UiX aún no puede enseñar con el mismo peso, justo lo que Mike Flores tiene entre manos en la mejora de presentaciones comerciales en curso.',
    actualizado: '2026-07-12',
  },

  zeus: {
    salaSlug: 'zeus',
    competidores: ['Producciones Zenit', 'Talento en Escena', 'Operativa de Eventos', 'Eventos Corporativos MX', 'Grupo Operativo Live'],
    dimensiones: [
      fila('Operación de talento a escala (casting + gestión)', 'lider', ['a_la_par', 'lider', 'rezagado', 'rezagado', 'a_la_par']),
      fila('Producción de eventos corporativos grandes', 'a_la_par', ['lider', 'a_la_par', 'a_la_par', 'lider', 'rezagado']),
      fila('Tecnología de registro y control de acceso', 'rezagado', ['a_la_par', 'rezagado', 'lider', 'a_la_par', 'a_la_par']),
      fila('Cobertura nacional de crews', 'a_la_par', ['lider', 'a_la_par', 'rezagado', 'a_la_par', 'lider']),
      fila('Precio relativo por evento', 'rezagado', ['a_la_par', 'a_la_par', 'lider', 'rezagado', 'lider']),
    ],
    lectura:
      'Zeus compite de frente en operación de talento gracias a Reclutalia, un activo integrado que la mayoría de la competencia no tiene. La debilidad es tecnológica: el control de acceso y registro en piso sigue siendo manual mientras Operativa de Eventos ya lo resolvió con app propia — barato de cerrar y visible para el cliente el mismo día del evento.',
    actualizado: '2026-06-30',
  },

  ceci: {
    salaSlug: 'ceci',
    competidores: [
      'CEO Grupo Regional A',
      'Fundadora Holding Creativo B',
      'CEO Grupo Multiservicios C',
      'Directora General Red de Agencias D',
      'CEO Conglomerado E',
    ],
    dimensiones: [
      fila('Voz propia y consistente en medios/redes', 'lider', ['a_la_par', 'lider', 'rezagado', 'a_la_par', 'rezagado']),
      fila('Frecuencia de aparición pública (paneles, prensa, columnas)', 'a_la_par', ['lider', 'a_la_par', 'rezagado', 'lider', 'a_la_par']),
      fila('Posicionamiento como voz sectorial (más allá de su propio grupo)', 'rezagado', ['a_la_par', 'lider', 'rezagado', 'a_la_par', 'a_la_par']),
      fila('Coherencia entre discurso público y cultura interna', 'lider', ['rezagado', 'a_la_par', 'rezagado', 'rezagado', 'a_la_par']),
    ],
    lectura:
      'Nota de marco: no son competidores de mercado en el sentido estricto — se compara el posicionamiento de Ceci frente a otras cabezas de holdings de servicios similares. Ceci tiene una voz propia y coherente con lo que se vive puertas adentro, algo poco común en el sector. Falta frecuencia: aparece menos en el circuito de paneles y prensa que sus pares, y todavía no se le busca como voz sectorial fuera de Grupo UPAX.',
    actualizado: '2026-07-02',
  },

  'grupo-upax': {
    salaSlug: 'grupo-upax',
    competidores: ['Holding de Servicios A', 'Grupo Multiservicios B', 'Conglomerado Creativo C', 'Grupo Integrado D', 'Holding Corporativo E'],
    dimensiones: [
      fila('Portafolio integrado (8 UDNs bajo un mismo techo)', 'lider', ['rezagado', 'a_la_par', 'rezagado', 'a_la_par', 'rezagado']),
      fila('Marca corporativa unificada y reconocible', 'a_la_par', ['lider', 'a_la_par', 'a_la_par', 'rezagado', 'lider']),
      fila('Velocidad de venta cruzada entre unidades', 'rezagado', ['a_la_par', 'rezagado', 'lider', 'a_la_par', 'a_la_par']),
      fila('Escala de cuentas enterprise compartidas', 'lider', ['a_la_par', 'rezagado', 'a_la_par', 'rezagado', 'a_la_par']),
      fila('Consistencia de identidad visual entre unidades', 'rezagado', ['a_la_par', 'lider', 'rezagado', 'a_la_par', 'a_la_par']),
    ],
    lectura:
      'Nota de marco: se compara Grupo UPAX como holding frente a otros conglomerados de servicios de tamaño comparable, no frente a un competidor único. La ventaja estructural es clara — ocho unidades reales bajo un mismo techo y cuentas enterprise que ya cruzan varias de ellas. La venta cruzada entre UDNs todavía no fluye tan rápido como en holdings más chicos y enfocados, y la identidad visual entre unidades varía más de lo que un cliente corporativo esperaría de un solo grupo.',
    actualizado: '2026-07-01',
  },
}

/** Benchmark de ejemplo de una sala, o `null` si no existe (slug desconocido). */
export function obtenerBenchmarkEjemplo(salaSlug: string): Benchmark | null {
  return BENCHMARKS[salaSlug] ?? null
}
