import type { Benchmark } from '@/dominio/benchmark'

/**
 * EL BENCHMARK COMPETITIVO DE CADA SALA.
 *
 * Único sitio de la app con datos escritos en el código, y es una excepción
 * decidida por Franco: el benchmark no lo produce esta herramienta —sale de
 * una investigación de mercado que se hace fuera— así que no tiene sentido
 * montarle un editor para teclearlo una vez al año.
 *
 * REGLA QUE NO SE ROMPE: aquí no se escribe nada que no esté en el análisis o
 * en una fuente citada. Rellenar una casilla a ojo produce un análisis de la
 * competencia INVENTADO que la app le enseña al director de la UDN como si
 * fuera trabajo hecho, y esa es la única forma de que esta pantalla haga daño.
 */

/**
 * PROMO ESPACIO — Benchmark junio 2026.
 *
 * FUENTE PRINCIPAL: la presentación "Benchmark junio 2026" de Marketing Corp
 * (75 láminas; bloques Portafolio & ecosistema · Aspectos comerciales · Sitios
 * web · Paid media · Inbound & RRSS · Conclusiones). Todo lo de abajo sale de
 * ahí salvo `mercado`, que lleva su fuente externa y su fecha.
 *
 * DE DÓNDE SALE CADA NIVEL DE LA MATRIZ:
 * - La fila de PROMO ESPACIO sale del "Radar de capacidades" (lámina 67), que
 *   clasifica literalmente en GANAS / EMPATAS-LIDERAS / TE SUPERAN.
 * - Los niveles POR COMPETIDOR son lectura de sus fichas individuales ("Lo
 *   que hacen bien / Debilidad / Amenaza"), de la matriz de amenaza (lámina
 *   72) y de las cifras de SEO (láminas 32-43). El propio deck avisa de que
 *   su radar compara contra un "promedio competencia" que "aplana diferencias
 *   reales entre las 5 marcas": abrir ese promedio es lo que aporta la matriz.
 * - Cada `nota` cita la evidencia. Una fila que no se pueda sostener con el
 *   deck no debería estar.
 *
 * DOS ADVERTENCIAS AL PRESENTARLO:
 * - El deck marca la exclusividad de Comscore con "*Por validar". Aquí se
 *   dice "certificada por un tercero" sin absolutos, y la ficha de PE acota
 *   el alcance real: la certificación es **en canales propios**.
 * - Se siguen CINCO competidores de OOH/DOOH. Las cuentas de PE registran
 *   además RENTABLE, CLEAR CHANNEL, GRUPO VALLAS y GRUPO EXPANSIÓN como
 *   competencia recurrente en sus oportunidades: no están analizados aquí.
 */
const PROMO_ESPACIO: Benchmark = {
  salaSlug: 'promo-espacio',

  // ── Las cuatro cifras de cabecera ────────────────────────────────────────
  // Tres son del análisis propio; la cuarta es la que más rápido convierte en
  // argumento de venta. Ninguna es decorativa: todas llevan su lectura.
  indicadores: [
    {
      valor: '3 de 6',
      rotulo: 'Dimensiones liderando',
      lectura: 'Momento de compra, medición y madurez digital. Las tres que no se compran con inventario.',
      tono: 'gana',
    },
    {
      valor: '2 de 5',
      rotulo: 'Competidores que contestan',
      lectura: 'Solo ISA y JCDecaux respondieron a una prospección real. Los otros tres tienen canales visibles y no dieron seguimiento.',
      tono: 'gana',
    },
    {
      valor: '0 de 5',
      rotulo: 'Usan landing dedicada',
      lectura: 'La categoría paga tráfico y lo tira a la home. Es la brecha de conversión más barata de tomar.',
      tono: 'gana',
    },
    {
      valor: '3 de 5',
      rotulo: 'Amenaza alta',
      lectura: 'ISA, JCDecaux e IMU aprietan de verdad: escala, marca y cobertura. Contra ellos no se pelea por tamaño.',
      tono: 'atencion',
    },
  ],

  // ── Los cinco competidores, con lo que se necesita frente a un prospecto ──
  competidores: [
    {
      nombre: 'ISA Corporativo',
      fortaleza: 'Transporte concesionado y audiencia cautiva: los tres metros del país y 45 aeropuertos, +65 mil espacios.',
      amenaza: 'alta',
      nosGanaEn: 'Cobertura en transporte, volumen de espacios y credenciales de legalidad y concesiones.',
      dondeSeLeGana: 'Precisión, retail media y segmentación al punto de venta. Ellos mismos reconocen en la reunión que no prometen ROI.',
      digital: [
        { rotulo: 'Visitas orgánicas/mes', valor: '3.6k' },
        { rotulo: 'Tráfico de marca', valor: '89%' },
        { rotulo: 'Authority Score', valor: '27/100' },
        { rotulo: 'Visibilidad en IA', valor: '31/100' },
      ],
      medicion: 'Data propia y firmas externas.',
      contactabilidad: 'Respondió: informal y activa, con credenciales.',
    },
    {
      nombre: 'JCDecaux MX',
      fortaleza: 'Marca global y respaldo corporativo: +4,800 muebles urbanos y ~3,800 anuncios de gran formato en México.',
      amenaza: 'alta',
      nosGanaEn: 'Credenciales corporativas, percepción premium, músculo de operación y cobertura nacional.',
      dondeSeLeGana: 'Agilidad, personalización y velocidad de respuesta. Contra ellos no conviene pelear por tamaño, sino por resultado.',
      digital: [
        { rotulo: 'Visitas orgánicas/mes', valor: '785' },
        { rotulo: 'Tráfico de marca', valor: '100%' },
        { rotulo: 'Keywords posicionadas', valor: '9' },
        { rotulo: 'Visibilidad en IA', valor: '14/100' },
      ],
      medicion: 'Data propia (DATALAB) y Azerion.',
      contactabilidad: 'Respondió: institucional y tardada.',
    },
    {
      nombre: 'Grupo IMU',
      fortaleza: 'Mobiliario urbano y cobertura masiva: +20 años, 17 ciudades, +15,000 espacios, ~1,000 clientes.',
      amenaza: 'alta',
      nosGanaEn: 'Cobertura urbana, mobiliario concesionado y experiencia acumulada en OOH tradicional.',
      dondeSeLeGana: 'Digital, conexión con el punto de venta y data. Empaquetando con medición, PE se ve moderno frente a ellos.',
      digital: [
        { rotulo: 'Visitas orgánicas/mes', valor: '2.5k' },
        { rotulo: 'Tráfico de marca', valor: '18%' },
        { rotulo: 'Authority Score', valor: '28/100' },
        { rotulo: 'Visibilidad en IA', valor: '18/100' },
      ],
      medicion: 'Research propio (Dat’s Why).',
      contactabilidad: 'No respondió en el periodo de levantamiento.',
    },
    {
      nombre: 'Global Vía Pública',
      fortaleza: 'Mix amplio de formatos y alcance regional LatAm, con flexibilidad de planeación.',
      amenaza: 'media',
      nosGanaEn: 'Variedad de soportes exteriores y posible cobertura regional.',
      dondeSeLeGana: 'Especialización en entornos de consumo. No tienen un activo icónico ni dominante.',
      digital: [
        { rotulo: 'Visitas orgánicas/mes', valor: '185' },
        { rotulo: 'Tráfico de marca', valor: '95%' },
        { rotulo: 'Authority Score', valor: '12/100' },
        { rotulo: 'Visibilidad en IA', valor: '14/100' },
      ],
      medicion: 'Data propia y firmas externas.',
      contactabilidad: 'No respondió en el periodo de levantamiento.',
    },
    {
      nombre: 'IMJ Media',
      fortaleza: 'Flexibilidad táctica, creatividad aplicada e indoor. Es el más parecido a PE en el pitch.',
      amenaza: 'baja',
      nosGanaEn: 'Vallas móviles, formatos custom y agilidad para campañas especiales.',
      dondeSeLeGana: 'Inventario en el momento de decisión y escala. Su reconocimiento nacional es menor.',
      digital: [
        { rotulo: 'Visitas orgánicas/mes', valor: '614' },
        { rotulo: 'Tráfico de marca', valor: '100%' },
        { rotulo: 'Authority Score', valor: '10/100' },
        { rotulo: 'Visibilidad en IA', valor: 'sin dato' },
      ],
      medicion: 'Software propio (OBP).',
      contactabilidad: 'No respondió en el periodo de levantamiento.',
    },
  ],

  dimensiones: [
    {
      dimension: 'Ecosistema de momento de compra',
      udn: 'lider',
      competidores: ['rezagado', 'rezagado', 'rezagado', 'rezagado', 'rezagado'],
      nota: 'Ninguno de los cinco tiene pantallas donde ocurre la decisión: banca, retail, universidad, aeropuerto. Ellos venden dónde; PE vende cuándo y a quién.',
    },
    {
      dimension: 'Medición y prueba de resultado',
      udn: 'lider',
      competidores: ['a_la_par', 'a_la_par', 'a_la_par', 'rezagado', 'rezagado'],
      nota: 'PE mide con un tercero certificado (Comscore, en canales propios). La competencia mide con herramienta propia: DATALAB, Dat’s Why, OBP. Auditable frente a “confía en nuestro software”.',
    },
    {
      dimension: 'Madurez digital comercial',
      udn: 'lider',
      competidores: ['a_la_par', 'rezagado', 'a_la_par', 'rezagado', 'rezagado'],
      nota: 'PE tiene el mejor SEO on-page (92) y es el único con el sitio sobre un CRM que captura leads de forma nativa. IMU e ISA le ganan en volumen; JCDecaux vive del 100% de tráfico de marca con 9 keywords.',
    },
    {
      dimension: 'DOOH y programática',
      udn: 'a_la_par',
      competidores: ['rezagado', 'a_la_par', 'a_la_par', 'a_la_par', 'a_la_par'],
      nota: 'PE es fuerte, pero IMU, JCDecaux, Global e IMJ también lo comunican. ISA es el rezagado: no ha evolucionado hacia retail media con la misma agresividad.',
    },
    {
      dimension: 'Escala física y cobertura',
      udn: 'rezagado',
      competidores: ['lider', 'lider', 'lider', 'a_la_par', 'rezagado'],
      nota: 'IMU, JCDecaux e ISA dominan en número de caras. Es la dimensión que no se pelea: en cantidad de pantallas no se gana, ni hace falta.',
    },
    {
      dimension: 'Presencia institucional',
      udn: 'rezagado',
      competidores: ['lider', 'lider', 'a_la_par', 'a_la_par', 'rezagado'],
      nota: 'ISA y JCDecaux van muy por delante en certificaciones, asociaciones y eventos (WOO Congress, IAB). Genera percepción de liderazgo aunque no tengan mejores activos.',
    },
  ],

  // ── El resumen ejecutivo: BREVE. Lo largo vive en sus secciones ──────────
  lectura:
    'Promo Espacio tiene un activo que ninguno de los cinco puede replicar —pantallas en el momento de compra, con medición certificada por un tercero— y lo tiene subcomunicado. La categoría entera es débil justo ahí: nadie usa landing dedicada, todos dependen del tráfico de su propia marca y tres de cinco ni contestan una prospección. La brecha no está en el inventario, está en la percepción. La ventana existe y es temporal.',

  tesis: {
    titular: 'No competimos por inventario. Competimos por el momento.',
    ellosVenden: 'Ubicación: mobiliario urbano, parabuses, transporte, aeropuertos, calles, gran formato y vallas. Compiten por escala.',
    nosotrosVendemos: 'El momento de compra: contexto + intención + audiencia + momento. Pantallas donde ocurre la decisión — banca, retail, universidad, aeropuerto.',
    sustento: 'Tres fuerzas que solo este ecosistema combina: contexto (el punto exacto de decisión), atención (la audiencia permanece frente a la pantalla en la fila del banco o la caja del súper, no un vistazo de dos segundos) y repetición (el mismo consumidor vuelve a la misma sucursal cada semana). La medición certificada por un tercero es la evidencia de que ocurre.',
  },

  // ── Dónde la categoría entera está floja: la ventana, con su evidencia ───
  frentesAbiertos: [
    {
      frente: 'Comercial',
      evidencia: 'Solo ISA y JCDecaux respondieron a la prospección. Los otros tres no dieron seguimiento pese a tener formulario, redes y teléfono visibles.',
    },
    {
      frente: 'Paid media',
      evidencia: 'Inversiones por debajo de $10K MXN, ningún competidor con landing dedicada y nadie construyendo embudo. La pauta se concentra en Monterrey: activación por plaza, no estrategia nacional.',
    },
    {
      frente: 'SEO y web',
      evidencia: 'Todos dependen del tráfico de su marca (JCDecaux 100%, ISA 89%). Casi nadie pasa Core Web Vitals. Lideran porque ya los buscan, no porque los descubran.',
    },
    {
      frente: 'Inbound y RRSS',
      evidencia: 'Sin contenido capturable y casi sin blogs con tesis. Dicen qué venden, no cómo funciona ni por qué es superior.',
    },
  ],

  // ── El calendario: la pieza más operativa para el equipo comercial ───────
  prospeccion: {
    columnas: ['JUL', 'AGO', 'SEP'],
    leyenda: [
      'Vende · pico de actividad, máxima disposición de compra',
      'Prepara · actividad subiendo, califica y agenda propuestas',
      'Explora · sector despertando, primeros contactos',
      'Espera · actividad baja, monitorear y no priorizar',
      'El ciclo se repite cada temporada según el comportamiento económico del sector.',
    ],
    filas: [
      {
        industria: 'Comercio al por menor',
        prioridad: 'Prioridad alta · cuentas vivas',
        meses: [{ estado: 'Vende', tono: 'alto' }, { estado: 'Explora', tono: 'bajo' }, { estado: 'Vende', tono: 'alto' }],
        gancho: 'Ayudamos a retailers a convertir fricciones operativas y digitales en soluciones tecnológicas escalables que mejoran eficiencia, experiencia y conversión.',
        encaja: ['Plataformas e-commerce', 'Integraciones entre sistemas', 'Apps y portales para clientes', 'Automatización de procesos comerciales'],
      },
      {
        industria: 'Comercio al por mayor',
        prioridad: 'Prioridad alta · cuentas vivas',
        meses: [{ estado: 'Vende', tono: 'alto' }, { estado: 'Explora', tono: 'bajo' }, { estado: 'Vende', tono: 'alto' }],
        gancho: 'Optimizamos la transformación digital en procesos comerciales B2B para reducir fricción operativa, acelerar pedidos y dar visibilidad al negocio.',
        encaja: ['Portales B2B', 'Integraciones con ERP/CRM', 'Software para logística y operación'],
      },
      {
        industria: 'Servicios financieros y de seguros',
        prioridad: 'Prioridad alta · pipeline Q4/Q1',
        meses: [{ estado: 'Vende', tono: 'alto' }, { estado: 'Explora', tono: 'bajo' }, { estado: 'Prepara', tono: 'medio' }],
        gancho: 'Construimos soluciones digitales seguras y escalables para mejorar onboarding, operación, autoservicio y experiencia de usuario.',
        encaja: ['Onboarding digital', 'Plataformas transaccionales', 'Integraciones con sistemas legacy'],
      },
      {
        industria: 'Industrias manufactureras',
        prioridad: 'Prioridad media-alta · pipeline Q4',
        meses: [{ estado: 'Espera', tono: 'neutro' }, { estado: 'Vende', tono: 'alto' }, { estado: 'Prepara', tono: 'medio' }],
        gancho: 'Ayudamos a empresas manufactureras a digitalizar procesos críticos para ganar visibilidad, eficiencia y control operativo.',
        encaja: ['Software para operación interna', 'Sistemas de trazabilidad', 'Portales para proveedores'],
      },
      {
        industria: 'Servicios profesionales y técnicos',
        prioridad: 'Prioridad media · selectiva',
        meses: [{ estado: 'Espera', tono: 'neutro' }, { estado: 'Vende', tono: 'alto' }, { estado: 'Explora', tono: 'bajo' }],
        gancho: 'Convertimos procesos complejos de servicios B2B en plataformas digitales simples, escalables y medibles.',
        encaja: ['Plataformas SaaS', 'Herramientas internas', 'Portales de clientes'],
      },
    ],
  },

  recomendaciones: [
    {
      que: 'Apropiarse de la narrativa “momento de compra”',
      porque: 'Ecosistema + tiempo de exposición + frecuencia, respaldado por medición de tercero. Es la única ventaja no replicable y hoy nadie la reclama.',
    },
    {
      que: 'Construir presencia institucional sistemática',
      porque: 'IAB México, WOO Congress, IAB Conecta/Mixx y eventos de retail media. Es lo que cierra la brecha de percepción con ISA y JCDecaux.',
    },
    {
      que: 'Ser los primeros en madurez digital',
      porque: 'Landing pages dedicadas, remarketing, LinkedIn B2B y medición de MQLs, aprovechando el CRM ya instalado. Ningún competidor usa landing dedicada.',
    },
    {
      que: 'Cerrar la deuda técnica del sitio',
      porque: 'Core Web Vitals y autoridad de dominio, para capturar demanda no-marca antes que la competencia. Hoy PE tiene la mejor base y la peor velocidad.',
    },
    {
      que: 'Paquetizar la oferta por objetivo comercial',
      porque: 'No por inventario. Diferenciador inmediato frente a un mercado que solo vende caras.',
    },
  ],

  // ── Contexto de mercado. NO sale del análisis propio: lleva fuente ───────
  mercado: [
    {
      dato: 'El DOOH en México cerró 2025 en unos USD 138 M y crece a un 8.8% anual: supera los USD 211 M en 2030.',
      fuente: 'LatinSpots, 2026',
    },
    {
      dato: 'El OOH mexicano en conjunto ronda los USD 375 M y podría pasar de USD 950 M en 2034, con el segmento digital como motor.',
      fuente: 'IMARC Group, 2026',
    },
    {
      dato: 'El Mundial 2026 empuja el gasto publicitario por encima de USD 7,800 M, con un 10-15% destinado a exterior. Es una ventana de año, no de trimestre.',
      fuente: 'Soy Marketing, mayo 2026',
    },
  ],

  fuente: 'Benchmark junio 2026 · Marketing Corp · 5 competidores, 5 bloques de análisis',
  actualizado: '2026-06-30',
}

export const BENCHMARK_POR_SALA: Record<string, Benchmark> = {
  'promo-espacio': PROMO_ESPACIO,
}

export function benchmarkIncrustado(salaSlug: string): Benchmark | null {
  return BENCHMARK_POR_SALA[salaSlug] ?? null
}
