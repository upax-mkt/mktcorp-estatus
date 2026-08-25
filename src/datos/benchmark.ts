import type { Benchmark } from '@/dominio/benchmark'

/**
 * EL BENCHMARK COMPETITIVO DE CADA SALA.
 *
 * Único sitio de la app con datos escritos en el código, y es una excepción
 * decidida por Franco: el benchmark no lo produce esta herramienta.
 *
 * REGLA QUE NO SE ROMPE: aquí no se escribe nada que no esté en el análisis o
 * en una fuente citada. Ya pasó una vez —un calendario de prospección que
 * venía del deck de OTRA UDN— y por eso cada bloque de abajo dice de qué
 * lámina sale.
 */

/**
 * PROMO ESPACIO — Benchmark junio 2026.
 *
 * FUENTE: presentación "Benchmark junio 2026" de Marketing Corp, 75 láminas.
 * Las TABLAS de ese deck no viajan en el export de texto de Google Slides
 * —salen como `Table (ID: …)`—, así que se renderizaron las láminas a PNG y
 * se transcribieron mirándolas. De ahí salen la matriz, la comparativa y la
 * contactabilidad, que en la primera versión de este archivo faltaban
 * enteras.
 *
 * QUÉ NO ESTÁ AQUÍ Y POR QUÉ:
 * - Precios y condiciones comerciales: el propio deck avisa de que no se
 *   pudieron validar (solo ISA y JCDecaux respondieron).
 * - La EVIDENCIA (capturas de anuncios, sitios, piezas). Se sube desde la
 *   propia página y vive en base: ver la nota al final de este archivo.
 *
 * DOS ADVERTENCIAS AL PRESENTARLO:
 * - El deck marca la exclusividad de Comscore con "*Por validar", y la ficha
 *   de PE acota el alcance: la certificación es **en canales propios**.
 * - Se siguen CINCO competidores de OOH/DOOH. Las cuentas de PE registran
 *   además RENTABLE, CLEAR CHANNEL, GRUPO VALLAS y GRUPO EXPANSIÓN como
 *   competencia recurrente: no están analizados aquí.
 */
const PROMO_ESPACIO: Benchmark = {
  salaSlug: 'promo-espacio',

  indicadores: [
    /**
     * CORREGIDO CONTRA LA MATRIZ. Decía "3 · variables donde es la única
     * líder — indoor, cercanía al punto de consumo y flexibilidad comercial",
     * y la matriz de la lámina 27 lo desmiente: en Indoor y en Flexibilidad
     * comercial IMJ Media también aparece como líder, así que únicas son una,
     * no tres. Se enseña lo que dice la matriz —cuatro variables liderando— y
     * la lectura precisa cuál es la que nadie más lidera. Sale más fuerte
     * dicho bien: quien acompaña en las otras dos es el competidor de menor
     * amenaza del set.
     */
    {
      valor: '4 de 10',
      rotulo: 'Variables donde lidera',
      lectura: 'En cercanía al punto de consumo lidera SOLA: los cinco se quedan en básico. En indoor y flexibilidad comercial solo le hace sombra IMJ Media, el de menor amenaza.',
      tono: 'gana',
    },
    {
      valor: '2 de 5',
      rotulo: 'Competidores que contestan',
      lectura: 'Solo ISA (3 días) y JCDecaux (10 días) respondieron. Global, IMJ e IMU no dieron señal.',
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

  // ── Los cinco competidores ───────────────────────────────────────────────
  // Fortaleza, amenaza y "dónde se le gana" salen de sus fichas (láminas 4-8),
  // de los hallazgos por competidor (23-25) y de la matriz de amenaza (72).
  // Las cifras digitales, de la tabla comparativa (29). La contactabilidad,
  // de la lámina 21, con sus tiempos reales.
  competidores: [
    {
      nombre: 'ISA Corporativo',
      fortaleza: 'Transporte concesionado y audiencia cautiva: los tres metros del país y 45 aeropuertos, +65 mil espacios.',
      amenaza: 'alta',
      nosGanaEn: 'Cobertura en transporte, volumen de espacios y credenciales de legalidad y concesiones.',
      dondeSeLeGana: 'Precisión, retail media y segmentación al punto de venta. Ellos mismos reconocen en la reunión que no prometen ROI.',
      medicion: 'Data propia y firmas externas.',
      institucional: 'Great Place To Work, Premio Nacional de Calidad y Mejores Empresas Mexicanas. Presencia constante en foros de movilidad y cámaras empresariales.',
      fortalezaInvisible: 'Credibilidad institucional: premios, concesiones y relación con el sector. No se ve en el inventario y es lo que le abre puertas.',
      inbound: 'Sin blog y sin contenido educativo. Su pieza más interesante es un simulador de publicidad para aeropuertos y metro — pero ni él está detrás de un formulario, así que no captura.',
      paid: 'Pauta descentralizada: <$10K MXN, solo Search, 6 keywords, sin landing. Esfuerzo del equipo comercial, no estrategia corporativa.',
      contactabilidad: {
        nivel: 'Básica',
        velocidad: '3 días después',
        calidad: 'Informal',
        informacion: 'Credenciales recibidas',
        implicacion: 'Competidor con proceso comercial activo; importante reforzar rapidez y claridad en propuestas.',
      },
    },
    {
      nombre: 'JCDecaux MX',
      fortaleza: 'Marca global y respaldo corporativo: +4,800 muebles urbanos y ~3,800 anuncios de gran formato en México.',
      amenaza: 'alta',
      nosGanaEn: 'Credenciales corporativas, percepción premium, músculo de operación y cobertura nacional.',
      dondeSeLeGana: 'Agilidad, personalización y velocidad de respuesta. Contra ellos no conviene pelear por tamaño, sino por resultado.',
      medicion: 'Data propia (DATALAB) y Azerion.',
      institucional: 'Hereda políticas globales de ESG, sustentabilidad y gobierno corporativo. WOO Congress, IAB Conecta e IAB Mixx de forma recurrente.',
      fortalezaInvisible: 'Thought leadership: es el que fija la conversación de la categoría, y eso se traduce en que lo consideren por defecto.',
      inbound: 'No tiene blog ni contenido descargable. Solo casos de éxito abiertos en el sitio, sin gated content ni proceso de nutrición.',
      paid: 'El referente de la categoría: <$50K MXN, 22 keywords, 17 anuncios Search en México y huella internacional en Brasil, Chile y Argentina. Aun así, sin landing dedicada.',
      contactabilidad: {
        nivel: 'Básica',
        velocidad: 'Baja: 1 semana y 3 días después',
        calidad: 'Institucional',
        informacion: 'Credenciales recibidas',
        implicacion: 'Competidor fuerte en posicionamiento; Promo Espacio puede diferenciarse con mayor personalización y agilidad.',
      },
    },
    {
      nombre: 'Grupo IMU',
      fortaleza: 'Mobiliario urbano y cobertura masiva: +20 años, 17 ciudades, +15,000 espacios, ~1,000 clientes.',
      amenaza: 'alta',
      nosGanaEn: 'Cobertura urbana, mobiliario concesionado y experiencia acumulada en OOH tradicional.',
      dondeSeLeGana: 'Digital, conexión con el punto de venta y data. Empaquetando con medición, PE se ve moderno frente a ellos.',
      medicion: 'Research propio (Dat’s Why).',
      institucional: 'Sin certificaciones visibles. Alianza con NRM Comunicaciones (2025) y un modelo apoyado en concesiones y relaciones con gobiernos y municipios.',
      fortalezaInvisible: 'Relaciones gubernamentales: su modelo depende de concesiones y municipios, y ahí acumula una ventaja que no se compra con inversión.',
      inbound: 'Contenido abierto sobre servicios y cobertura, sin blog. Todo lo descargable es abierto: no genera un solo lead.',
      paid: 'Sin pauta corporativa rastreable. Su presencia queda por debajo del resto de los analizados.',
      contactabilidad: {
        nivel: 'No validada',
        velocidad: 'Sin respuesta',
        calidad: 'Sin respuesta',
        informacion: 'Sin respuesta',
        implicacion: 'Aunque tiene presencia sólida, la falta de respuesta abre oportunidad en experiencia comercial.',
      },
    },
    {
      nombre: 'Global Vía Pública',
      fortaleza: 'Mix amplio de formatos y alcance regional LatAm, con flexibilidad de planeación.',
      amenaza: 'media',
      nosGanaEn: 'Variedad de soportes exteriores y posible cobertura regional.',
      dondeSeLeGana: 'Especialización en entornos de consumo. No tienen un activo icónico ni dominante.',
      medicion: 'Data propia y firmas externas.',
      institucional: 'Sin evidencia pública de certificaciones. Se presenta como red regional de OOH en LatAm y anunció stand propio en el World Out Of Home Congress 2025.',
      fortalezaInvisible: 'Networking internacional: pertenecer a una red regional le da presencia en foros donde no compite por inventario.',
      inbound: 'Un único recurso —un vídeo— y un blog centrado en notas de prensa. Al suscribirse a su newsletter no ocurre nada.',
      paid: 'Etapa inicial: <$10K MXN en Search y Display, con varios anuncios identificados como test. Sin landing.',
      contactabilidad: {
        nivel: 'No validada',
        velocidad: 'Sin respuesta',
        calidad: 'Sin respuesta',
        informacion: 'Sin respuesta',
        implicacion: 'Oportunidad para ganar por mejor atención inicial y seguimiento.',
      },
    },
    {
      nombre: 'IMJ Media',
      fortaleza: 'Flexibilidad táctica, creatividad aplicada e indoor. Es el más parecido a PE en el pitch.',
      amenaza: 'baja',
      nosGanaEn: 'Vallas móviles, formatos custom y agilidad para campañas especiales.',
      dondeSeLeGana: 'Inventario en el momento de decisión y escala. Su reconocimiento nacional es menor.',
      medicion: 'Software propio (OBP).',
      institucional: 'Sin certificaciones relevantes. Invierte en relación comercial —eventos privados con agencias— más que en posicionamiento institucional.',
      fortalezaInvisible: 'Cercanía con agencias: invierte en la relación comercial directa, que es por donde entran las campañas custom.',
      inbound: 'Media kits y un blog corto orientado a SEO, sin fechas visibles. Tinte educativo muy suave: lo principal es mostrar formatos y ubicaciones.',
      paid: 'Arranque reciente: hace dos meses no registraba actividad; ahora Search con <$10K MXN, 6 keywords, sin Display ni redes pagadas.',
      contactabilidad: {
        nivel: 'No validada',
        velocidad: 'Sin respuesta',
        calidad: 'Sin respuesta',
        informacion: 'Sin respuesta',
        implicacion: 'Oportunidad para diferenciarse con contacto comercial más ágil y consultivo.',
      },
    },
  ],

  // ── La matriz de posicionamiento (lámina 27), literal ─────────────────────
  // Diez variables y CUATRO niveles. El orden de `competidores` es
  // ISA · JCDecaux · Grupo IMU · Global Vía Pública · IMJ Media.
  matriz: [
    {
      variable: 'Cercanía a punto de consumo',
      udn: 'lider',
      competidores: ['basico', 'basico', 'basico', 'basico', 'basico'],
      nota: 'La única variable donde PE lidera y los cinco se quedan en básico. Es el activo que ninguno replica.',
    },
    {
      variable: 'Indoor',
      udn: 'lider',
      competidores: ['basico', 'basico', 'basico', 'basico', 'lider'],
      nota: 'Solo IMJ Media compite aquí. Los grandes —ISA, JCDecaux, IMU— están en básico.',
    },
    {
      variable: 'Flexibilidad comercial',
      udn: 'lider',
      competidores: ['basico', 'basico', 'basico', 'solido', 'lider'],
      nota: 'Los tres de amenaza alta se quedan en básico: es el terreno donde el tamaño juega en contra.',
    },
    {
      variable: 'DOOH',
      udn: 'lider',
      competidores: ['solido', 'lider', 'basico', 'lider', 'lider'],
      nota: 'PE lidera, pero acompañado: JCDecaux, Global e IMJ también. Aquí no hay diferencia que vender sola.',
    },
    {
      variable: 'Programmatic',
      udn: 'solido',
      competidores: ['ausente', 'solido', 'ausente', 'solido', 'ausente'],
      nota: 'Tres de los cinco ni aparecen. PE queda en el grupo de cabeza junto a JCDecaux y Global.',
    },
    {
      variable: 'Propuesta consultiva',
      udn: 'solido',
      competidores: ['basico', 'lider', 'basico', 'basico', 'basico'],
      nota: 'Solo JCDecaux lidera. Es una brecha corta y de las que se cierran con método, no con inversión.',
    },
    {
      variable: 'Gran formato',
      udn: 'basico',
      competidores: ['basico', 'lider', 'basico', 'lider', 'lider'],
      nota: 'Tres líderes y PE en básico. No es su terreno.',
    },
    {
      variable: 'Cobertura nacional',
      udn: 'basico',
      competidores: ['lider', 'lider', 'lider', 'solido', 'basico'],
      nota: 'Los tres de amenaza alta lideran. Es la dimensión que no se pelea.',
    },
    {
      variable: 'Mobiliario urbano',
      udn: 'basico',
      competidores: ['lider', 'lider', 'lider', 'basico', 'basico'],
      nota: 'Mismo trío al frente. Inventario concesionado que no se compra con estrategia.',
    },
    {
      variable: 'Transporte y movilidad',
      udn: 'basico',
      competidores: ['lider', 'lider', 'basico', 'basico', 'basico'],
      nota: 'ISA y JCDecaux mandan. Es el activo con el que ISA entra a cualquier cuenta.',
    },
  ],

  // ── Las cifras duras (lámina 29), literal ────────────────────────────────
  // CADA FILA DICE DE QUÉ DISCIPLINA ES. Las doce venían en una sola tabla
  // titulada "Sitio web y SEO", pero cinco de ellas no van de SEO: van de
  // captación —cuántos canales de contacto hay, si hay WhatsApp, si el sitio
  // corre sobre un CRM—. Etiquetadas, las siete de SEO se leen dentro de "Web
  // y SEO" y las cinco de captación dentro de "Comercial", que es donde de
  // verdad se usan.
  comparativa: {
    titulo: 'Sitio web y SEO, criterio por criterio',
    filas: [
      { criterio: 'Visitas orgánicas / mes', udn: '803', valores: ['3,600', '785', '2,500', '185', '614'], bloque: 'web' },
      { criterio: 'Tráfico de marca', udn: '50%', valores: ['89%', '100%', '18%', '95%', '100%'], ganaLaUdn: true, bloque: 'web' },
      { criterio: 'Keywords posicionadas', udn: '96', valores: ['246', '9', '69', '80', '14'], bloque: 'web' },
      { criterio: 'Authority Score (/100)', udn: '22', valores: ['27', '18', '28', '12', '10'], bloque: 'web' },
      { criterio: 'Visibilidad en IA (/100)', udn: '26', valores: ['31', '14', '18', '14', 's/d'], bloque: 'web' },
      { criterio: 'Core Web Vitals', udn: 'No pasa', valores: ['No pasa', 'No pasa', 'No pasa', 'No pasa', 'Pasa'], bloque: 'web' },
      { criterio: 'Backlinks / dominios ref.', udn: '1,600 / 135', valores: ['272k / 343', '87 / 31', '26k / 360', '3,900 / 34', '96 / 40'], bloque: 'web' },
      { criterio: 'N.º canales de contacto', udn: '4', valores: ['2', '1', '4', '3', '1'], ganaLaUdn: true, bloque: 'comercial' },
      { criterio: 'Canales de contacto', udn: 'Form · Tel · Email · Chat', valores: ['Form · Tel', 'Form', 'Form · Tel · Mail · WA', 'Form · Mail · WA', 'Form'], bloque: 'comercial' },
      { criterio: 'WhatsApp comercial', udn: 'No', valores: ['No', 'No', 'Sí', 'Sí', 'No'], bloque: 'comercial' },
      { criterio: 'CMS / Automatización', udn: 'HubSpot', valores: ['WordPress', 'Drupal', 'WordPress + Elementor', 'WordPress + Elementor', 'WordPress'], ganaLaUdn: true, bloque: 'comercial' },
      { criterio: 'CRM conectado al sitio', udn: 'Sí · HubSpot', valores: ['No detectado', 'No detectado', 'No detectado*', 'Sí · Clientify', 'No detectado'], ganaLaUdn: true, bloque: 'comercial' },
    ],
    notaPie: '* Grupo IMU opera un CRM/BI de ventas interno, pero no se detectó conexión CRM en la captación del sitio público. Solo Promo Espacio corre su sitio sobre una plataforma CRM que captura y nutre leads de forma nativa.',
    fuente: 'Benchmark Sitios Web & SEO (jun 2026) + verificación técnica de sitios',
  },

  lectura:
    'Promo Espacio es la única de las seis que lidera en cercanía al punto de consumo, y lo tiene subcomunicado. Donde no gana —cobertura nacional, mobiliario urbano, transporte— pierde contra inventario concesionado que no se compra con estrategia: ahí no se pelea. La ventana está en lo digital y en lo comercial: es el único con el sitio sobre un CRM, tiene la menor dependencia de marca después de IMU, ningún competidor usa landing dedicada y tres de cinco ni contestan una prospección. La brecha no está en el inventario, está en la percepción.',

  tesis: {
    titular: 'No competimos por inventario. Competimos por el momento.',
    ellosVenden: 'Ubicación: mobiliario urbano, parabuses, transporte, aeropuertos, calles, gran formato y vallas. Compiten por escala.',
    nosotrosVendemos: 'El momento de compra: contexto + intención + audiencia + momento. Pantallas donde ocurre la decisión — banca, retail, universidad, aeropuerto.',
    sustento: 'Tres fuerzas que solo este ecosistema combina: contexto (el punto exacto de decisión), atención (la audiencia permanece frente a la pantalla en la fila del banco o la caja del súper, no un vistazo de dos segundos) y repetición (el mismo consumidor vuelve a la misma sucursal cada semana). La medición certificada por un tercero es la evidencia de que ocurre.',
  },

  // ── EL VEREDICTO DE CADA DISCIPLINA ──────────────────────────────────────
  // Cuatro de los seis son los "frentes abiertos" del análisis, literales:
  // sitios donde la CATEGORÍA ENTERA está floja, no solo un competidor. Van
  // marcados con `ventana` porque esa es la lectura rentable —una puerta que
  // se cierra sola con el tiempo— y porque es lo que la cabecera resume.
  //
  // Los otros dos (portafolio y PR) NO son frentes abiertos: son el resumen de
  // lo que dicen la matriz de la lámina 27 y las fichas institucionales de las
  // láminas 4-8. Se escriben sin adorno y sin conclusión que el análisis no
  // saque.
  disciplinas: [
    {
      id: 'portafolio',
      veredicto: 'Cuatro de las diez variables de la matriz están en manos de Promo Espacio, y la de cercanía al punto de consumo la lidera sola: los cinco competidores se quedan en básico. Donde pierde —cobertura nacional, mobiliario urbano, transporte— pierde contra inventario concesionado, que no se compra con estrategia. Ahí no se pelea.',
    },
    {
      id: 'web',
      ventana: true,
      veredicto: 'Todos dependen del tráfico de su marca (JCDecaux 100%, IMJ 100%, Global 95%, ISA 89%). Cinco de seis no pasan Core Web Vitals. Lideran porque ya los buscan, no porque los descubran.',
    },
    {
      id: 'paid',
      ventana: true,
      veredicto: 'JCDecaux marca el techo con <$50K MXN y 22 keywords; el resto está por debajo de $10K o ausente. Ninguno usa landing dedicada y la pauta se concentra en Monterrey: activación por plaza, no estrategia nacional.',
    },
    {
      id: 'rrss',
      ventana: true,
      veredicto: 'Sin contenido capturable y casi sin blogs con tesis. Dicen qué venden, no cómo funciona ni por qué es superior.',
    },
    {
      id: 'pr',
      veredicto: 'Es la disciplina donde la distancia es mayor y no se ve en el inventario. ISA acumula Great Place To Work, Premio Nacional de Calidad y Mejores Empresas Mexicanas; JCDecaux hereda ESG global y va a WOO e IAB cada año. Los otros tres no tienen certificaciones visibles. Es lo que los hace parecer líderes aunque el activo no lo sea.',
    },
    {
      id: 'comercial',
      ventana: true,
      veredicto: 'Solo ISA (3 días) y JCDecaux (10 días) respondieron a la prospección. Global, IMJ e IMU no dieron señal pese a tener formulario, redes y teléfono visibles.',
    },
  ],

  recomendaciones: [
    {
      que: 'Apropiarse de la narrativa “momento de compra”',
      porque: 'Es la única variable donde PE lidera y los cinco competidores se quedan en básico. Hoy nadie la reclama.',
    },
    {
      que: 'Construir presencia institucional sistemática',
      porque: 'ISA acumula GPTW, Premio Nacional de Calidad y Mejores Empresas Mexicanas; JCDecaux hereda ESG global y va a WOO e IAB. Es lo que los hace parecer líderes aunque no tengan mejores activos.',
    },
    {
      que: 'Ser los primeros en madurez digital',
      porque: 'Landing dedicadas, remarketing y medición de MQLs sobre el CRM ya instalado. Ningún competidor usa landing: la brecha de conversión está abierta y es barata.',
    },
    {
      que: 'Cerrar la deuda técnica del sitio',
      porque: 'Core Web Vitals y autoridad de dominio. PE tiene el mejor SEO on-page de la categoría y no pasa Core Web Vitals — como cinco de los seis.',
    },
    {
      que: 'Paquetizar la oferta por objetivo comercial',
      porque: 'No por inventario. Es un diferenciador inmediato frente a un mercado que solo vende caras.',
    },
  ],

  // ── Los gráficos que SÍ traen sus valores rotulados ─────────────────────
  // Se reconstruyen como datos, no como capturas: se leen mejor, se pintan
  // con el color de la sala y se pueden actualizar. El radar NO está aquí
  // porque no rotula sus valores — ese va como testigo.
  graficos: [
    {
      bloque: 'web',
      // Lámina 30. Los tres ejes de la pelea digital en una sola vista.
      grafico: {
        tipo: 'barras-comparadas',
        titulo: 'Posicionamiento en sitio web y SEO',
        periodos: ['Promo Espacio', 'ISA', 'JCDecaux', 'Global VP', 'IMJ', 'Grupo IMU'],
        series: [
          { etiqueta: 'Authority Score', valores: [22, 27, 18, 12, 10, 28] },
          { etiqueta: 'Visibilidad IA', valores: [26, 31, 14, 14, 0, 18] },
          { etiqueta: '% tráfico no-marca', valores: [50, 11, 0, 5, 0, 82], sufijo: '%' },
        ],
        mostrarValores: true,
      },
      lectura: 'La tercera serie es la que importa: el % de tráfico que NO viene de buscar la marca. JCDecaux e IMJ están en cero — todo su tráfico es gente que ya los conocía. IMU (82%) y Promo Espacio (50%) son los únicos que captan demanda de verdad. Visibilidad IA de IMJ sin dato, contada como 0.',
    },
    {
      bloque: 'rrss',
      // Lámina 64. Seguidores y engagement no comparten escala: doble eje.
      grafico: {
        tipo: 'combo-barras-lineas',
        titulo: 'Redes sociales: tamaño contra engagement',
        periodos: ['Promo Espacio', 'ISA', 'JCDecaux', 'Global VP', 'IMJ', 'Grupo IMU'],
        series: [
          { etiqueta: 'Seguidores', valores: [15722, 18864, 9312, 2743, 6524, 23294], forma: 'barra', eje: 'izquierdo' },
          { etiqueta: 'Engagement', valores: [0.46, 0.52, 1.22, 0.77, 0.76, 0.64], forma: 'linea', eje: 'derecho', sufijo: '%' },
        ],
        mostrarValores: true,
      },
      lectura: 'Promo Espacio es el tercero en tamaño y el ÚLTIMO en engagement (0.46%). JCDecaux tiene la mitad de seguidores y casi el triple de interacción: publica casos y creatividad, no tecnicismos. El tamaño de la audiencia no es el problema.',
    },
    {
      bloque: 'portafolio',
      /**
       * EL RADAR, RECONSTRUIDO COMO DATO.
       *
       * La lámina no rotula sus valores, así que en la versión anterior iba
       * como imagen. Se recuperaron midiendo el gráfico píxel a píxel:
       * calibrando la rejilla por dos vías independientes (coincidencia del
       * 0.1%) y localizando los catorce marcadores por máscara de color, con
       * un margen de ±0.03. La comprobación que lo cierra: los siete valores
       * de la competencia caen en múltiplos exactos de 0.2, que es justo lo
       * que produce el promedio de cinco marcas puntuadas en enteros — o sea
       * que son los números que el gráfico plotea, no una aproximación.
       *
       * ⚠️ QUÉ NO SON: una medición de mercado. El pie de la lámina original
       * dice "evaluación cualitativa del benchmark", y eso va escrito en la
       * lectura para que nadie los cite como dato duro.
       *
       * SE DIBUJA COMO RADAR, que es lo que es. Estuvo un tiempo como barras
       * horizontales porque el catálogo de gráficos de esta app no tenía
       * radar; ahora sí (`src/componentes/graficos/Radar.tsx`). Y la forma
       * importa: siete capacidades medidas con la MISMA vara comparan un
       * PERFIL, no siete magnitudes sueltas. El polígono enseña de un vistazo
       * dónde sobresale y dónde se hunde; en barras eran catorce que había
       * que recorrer de dos en dos.
       */
      grafico: {
        tipo: 'radar',
        titulo: 'Radar de capacidades',
        // NOMBRES COMPLETOS, ya no recortados. La columna de rótulos de las
        // barras horizontales cortaba a ~15 caracteres y "Madurez comercial
        // digital" salía como "Madurez comerc…"; el radar reparte el nombre
        // en dos líneas alrededor del polígono y caben enteros.
        periodos: [
          'Momento de compra',
          'Digital y programática',
          'Madurez comercial digital',
          'Cobertura geográfica',
          'Creatividad declarada',
          'Presencia institucional',
          'Escala inventario físico',
        ],
        series: [
          { etiqueta: 'Promo Espacio', valores: [5, 5, 4, 3, 2, 2, 2] },
          { etiqueta: 'Promedio competencia', valores: [1.6, 3.4, 2.6, 4, 2.4, 3.6, 4.2] },
        ],
        // SIN `mostrarValores`, que en un radar no hace nada: catorce números
        // repartidos alrededor de una rejilla ya rotulada se pisan entre ellos
        // y tapan justo la forma que se viene a ver. Los dos que importan —5
        // contra 1.6 y 2 contra 4.2— están escritos en la lectura.
      },
      lectura: 'Siete capacidades, ordenadas por la distancia a favor: momento de compra (5 contra 1.6, la mayor de las siete), digital y programática, madurez comercial digital, cobertura geográfica, creatividad declarada, presencia institucional y escala de inventario físico —donde la desventaja es de 2 contra 4.2—. Es la misma forma que la matriz, en una sola vista. Escala de 1 a 5 y evaluación CUALITATIVA del análisis, no una medición de mercado: sirve para ordenar la conversación, no para citar en una propuesta.',
    },
  ],

  // ── LA EVIDENCIA YA NO SE ESCRIBE AQUÍ ───────────────────────────────────
  // Vivían aquí seis testigos con la URL de su imagen. Franco: *"la evidencia
  // mejor la cargaré manualmente según la categoría, subiré imágenes o videos
  // o url; crea el módulo y reemplaza lo que cargaste como imagen, no quites
  // el texto ya que es su bajada explicativa"*.
  //
  // Ahora se sube desde la propia página y vive en `archivos` con
  // `categoria: 'evidencia'`, clasificada por disciplina. Las seis bajadas que
  // estaban escritas aquí NO se perdieron: se migraron a su fila con
  // scripts/migrar-evidencia-benchmark.ts, palabra por palabra.

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

  fuente: 'Benchmark junio 2026 · Marketing Corp · 75 láminas, 5 bloques de análisis',
  actualizado: '2026-06-30',
}


/**
 * RESEARCH LAND — Benchmark Digital junio 2026.
 *
 * FUENTE: presentación "Benchmark Digital Junio 2026" de Marketing Corp, 61
 * láminas, cinco bloques (portafolio y reputación, sitios web y SEO, anexo de
 * IA y modelo comercial, paid media, inbound y RRSS).
 *
 * ⚠️ CÓMO SE LEYÓ, porque importa para saber qué tan fiable es cada dato.
 * Las 27 TABLAS del deck no viajan en el export de texto de Google Slides
 * —salen como `Table (ID: …)`, igual que pasó con Promo Espacio—, y ahí vive
 * TODA la data comparativa: la matriz maestra, las seis fichas de SEO, el
 * anexo de IA y las cuatro tablas de inbound. Así que las 61 láminas se
 * renderizaron a PNG y se transcribieron mirándolas, una por una. Lo que sale
 * de una tabla lleva su número de lámina al lado.
 *
 * QUÉ NO ESTÁ AQUÍ Y POR QUÉ:
 * - La EVIDENCIA (capturas de sitios, anuncios, perfiles). Se sube desde la
 *   propia página y vive en base: ver la nota al final de este archivo.
 * - El bloque de "Aspectos comerciales" que promete el índice de la lámina 1:
 *   no tiene portadilla ni desarrollo propio en el deck.
 *
 * ⚠️ SIETE ADVERTENCIAS AL PRESENTARLO. Son contradicciones internas del
 * propio deck, encontradas al cruzar sus láminas entre sí. Van aquí y no se
 * esconden: quien presente esto tiene que saber qué número no puede defender.
 *
 * 1. AUTHORITY SCORE NO ES COMPARABLE ENTRE COLUMNAS. El 65 de Ipsos y el 50
 *    de Kantar son de ipsos.com y kantar.com ENTEROS, no de sus páginas
 *    mexicanas — el propio deck lo admite en los bullets de las láminas 18 y
 *    23, pero los pone en la misma tabla que dominios locales pequeños. Es la
 *    advertencia más importante de todas: media tabla compara cosas distintas.
 * 2. CORE WEB VITALS: la tabla maestra (lámina 12) dice "No pasa" para los
 *    seis. La ficha de Kantar (lámina 23) muestra "Superada" en escritorio.
 *    La fila de la tabla maestra está mal.
 * 3. INVERSIÓN PAID DE IPSOS: la matriz (lámina 41) dice "<$20K"; el texto de
 *    su ficha (lámina 42) dice "<$10K". Y NINGUNA de las dos declara moneda.
 * 4. LAS KEYWORDS DE RESEARCH LAND NO SUMAN: 57% informacional + 2% comercial
 *    + 1% transaccional + 9% navegacional = 69% (lámina 16). Falta el 31%.
 * 5. ANTIGÜEDAD DE DE LA RIVA: "más de 27 años" (lámina 5) contra "35+ años"
 *    (lámina 34).
 * 6. EL "100" DEL GRÁFICO no es SEO on-page. El recuadro de lectura de la
 *    lámina 13 lo llama así, pero la serie es "% tráfico NO-marca". Que RL
 *    tenga 100 ahí significa que NADIE lo busca por su nombre, no que su
 *    on-page sea perfecto (su on-page también es 100, en otra tabla: coincidencia).
 * 7. FECHA: el deck se titula "junio 2026" pero la tabla de IA (lámina 31) se
 *    fecha en jul 2026.
 *
 * Y UNA NOTA DE MÉTODO: el deck NUNCA nombra la herramienta que produce
 * "Authority Score" y "Visibilidad IA". Los nombres son los de Semrush, pero
 * el deck no lo dice, así que aquí tampoco se afirma.
 */
const RESEARCH_LAND: Benchmark = {
  salaSlug: 'research-land',

  indicadores: [
    /**
     * LA CIFRA QUE MÁS SE VA A CITAR, y la que hay que decir con su matiz.
     * El deck la presenta como fortaleza ("lideran en marca, no en demanda…
     * los descubren"), y a 345 visitas/mes admite la lectura contraria: que
     * todavía no hay suficiente marca que buscar. Las dos cosas son ciertas y
     * la tarjeta dice las dos, porque presentar solo la primera delante de un
     * director es indefendible en la primera repregunta.
     */
    {
      valor: '0%',
      rotulo: 'Tráfico que depende de su marca',
      lectura: 'Es el único del set: los otros cinco van de 71% a 100%. Significa que quien llega lo hace por un tema, no por el nombre. El matiz que hay que decir antes de que lo pregunten: son 345 visitas al mes, así que también describe una marca que todavía nadie busca.',
      tono: 'gana',
    },
    /**
     * Lámina 58. La cifra donde Research Land gana sin asterisco: casi doce
     * veces el engagement de Ipsos, con MÁS seguidores que él. Curiosamente
     * el deck la pinta "Sólido" en su mapa (lámina 57) y a nadie le da
     * "Líder" — pero los números que él mismo publica no dejan a nadie por
     * encima.
     */
    {
      valor: '3.56%',
      rotulo: 'Engagement en redes, el más alto del set',
      lectura: 'Con 133,196 seguidores contra los 116,252 de Ipsos: más audiencia y casi doce veces su tasa de interacción (0.3%). Es el único frente donde Research Land gana en volumen Y en calidad a la vez.',
      tono: 'gana',
    },
    /**
     * El contrapeso. Sin esto la tarjeta sería propaganda: el sitio está bien
     * construido pero nadie lo cita, y esa es la diferencia entre tener un
     * embudo y tener demanda que meterle.
     */
    {
      valor: '17/100',
      rotulo: 'Authority Score',
      lectura: 'El penúltimo del set, solo por encima de Bitácora Social (14). Con 6,400 backlinks de 140 dominios: muchos enlaces que no construyen autoridad. Ipsos tiene 4 backlinks y un score de 65 — aunque ese 65 es de su dominio global, no de su página mexicana.',
      tono: 'atencion',
    },
    /**
     * Lámina 31. Es el hueco de oferta, no un detalle de comunicación: Ipsos,
     * Kantar y De la Riva ya lo exhiben. Y la ficha de RL registra que SÍ usa
     * IA (análisis de sentimiento en político-electoral): el problema es que
     * no lo cuenta, que es más barato de arreglar.
     */
    {
      valor: 'Ausente',
      rotulo: 'Madurez de IA declarada',
      lectura: 'El único del set sin discurso de IA en su sitio, frente a Ipsos y Kantar en "Líder" y De la Riva en "Básico". Research Land sí usa IA en sus estudios; lo que no tiene es dónde decirlo.',
      tono: 'atencion',
    },
  ],

  /**
   * LA TESIS. Sale de cruzar el resumen ejecutivo de sitios (lámina 14) con
   * las conclusiones de IA (36) y de inbound (59): las tres dicen la misma
   * cosa desde ángulos distintos, y esa coincidencia es lo que la sostiene.
   */
  tesis: {
    titular: 'Research Land tiene la mejor máquina de captación de la categoría y la autoridad más baja para llenarla.',
    ellosVenden: 'Ipsos y Kantar venden autoridad: 90 mercados, 6M de panelistas, BrandZ, presencia permanente en medios. De la Riva vende interpretación cultural con voz propia. Los tres llevan años acumulando algo que no se compra en un trimestre.',
    nosotrosVendemos: 'Infraestructura que convierte y una audiencia que sí responde: cuatro canales de contacto con CRM detrás —solo Kantar tiene lo mismo—, el engagement más alto del set y cero dependencia de marca. Y el flanco que la ficha ya tenía identificado: velocidad, que ninguno de los dos globales promete en su sitio.',
    sustento: 'Lámina 14: "la mayoría de la competencia capta por teléfono/formulario sin CRM detrás". Lámina 36: "todos venden IA, ninguno vende autoservicio real" y "ninguno tiene pricing público". Lámina 59: "ningún competidor local tiene ecosistema inbound estable". Tres huecos de la categoría entera, no de un rival.',
  },

  /**
   * LOS CINCO, ORDENADOS POR CUÁNTO APRIETAN. El deck usa cuatro grados —Muy
   * Alta, Alta, Media-Alta, Media (láminas 3 a 7)— y el modelo tiene tres, así
   * que el matiz que se pierde va escrito en el texto de cada ficha.
   *
   * ⚠️ EL ORDEN DE ESTA LISTA MANDA. `matriz[].competidores` y
   * `comparativa.filas[].valores` son tuplas que se leen en este mismo orden:
   * Ipsos, Kantar, De la Riva, Pulso, Bitácora. Cambiar el orden aquí sin
   * cambiarlo allá desplaza todos los niveles una columna, y la tabla seguiría
   * dibujándose sin error.
   */
  competidores: [
    {
      nombre: 'Ipsos México',
      fortaleza: 'Autoridad global convertida en contenido permanente: Insights Hub, encuestas propias, agenda de webinars sin pausa.',
      amenaza: 'alta',
      nosGanaEn: 'Percepción de autoridad. El deck lo dice sin rodeos (lámina 3): "No por precio. Por percepción de autoridad." 5,000+ clientes, 90 mercados, 6M+ panelistas, y 6,300 menciones en motores de IA contra 8 de Research Land.',
      dondeSeLeGana: 'En captación y en redes. Tiene 2 canales de contacto contra 4, ningún CRM conectado al sitio, y su sitio mexicano es —cita del deck, lámina 17— "una vitrina thought leadership" más que un embudo. En RRSS tiene menos seguidores y 0.3% de engagement contra 3.56%.',
      medicion: 'Su SEO local vive de la marca global: 82% del tráfico es de marca y sus 4 backlinks locales no explican su Authority Score de 65, que es del dominio corporativo entero.',
      institucional: 'ESOMAR, referencia frecuente en AMAI, Global Trends 2024, Omnichannel Webinars 2024-2025. Lámina 3: "una de las agendas más activas del sector".',
      fortalezaInvisible: 'No necesita pautar ni posicionar: los motores de IA ya lo citan como fuente. Esa autoridad prestada del dominio global le da gratis lo que a un competidor local le cuesta años.',
      inbound: 'Publica todo abierto, sin gating: "el contenido es el producto" (lámina 54). Gana SEO y no captura un solo dato. Newsletter trimestral en inglés, sin correo de confirmación.',
      paid: 'Google Search y Meta Ads, inversión estimada bajo $20K —sin moneda declarada—, más de 10 keywords, sin landing dedicada. El deck lo rotula "referente internacional" y a la vez le pone madurez "Ausente" en México.',
    },
    {
      nombre: 'Kantar México',
      fortaleza: 'El más agresivo de todos en IA: suite con nombre propio (KAiA, LINK AI, Trend AI) y un Marketplace de autoservicio por créditos.',
      amenaza: 'alta',
      nosGanaEn: 'Producto y escala. Lámina 4: "compiten directamente por grandes corporativos". Marketplace con 150M+ consumidores en 80+ países, 45+ años en México y BrandZ como franquicia de contenido. ⚠️ El deck le atribuye además el panel de 8,500 hogares: ese panel salió de Kantar en 2025 y hoy es Worldpanel by Numerator, otra empresa. No usarlo contra ellos.',
      dondeSeLeGana: 'En frescura y en foco local. Su página de México es —lámina 21— "un artículo de presentación fechado feb-2021, no una landing de conversión", sus artículos de Latinoamérica no se actualizan desde diciembre 2025 y no hay webinars desde 2021. Es la puerta que el propio deck señala: verse más fresco y más local que ellos.',
      medicion: 'Su sitio mexicano tiene 18 visitas orgánicas al mes y 9 keywords, 100% de marca. Todo lo demás que exhibe —7.2k visitas, 1.5k keywords, AS 50— es del dominio global.',
      institucional: 'AMAI, IAB, BrandZ, Consumer Insights, Retail Trends. Lámina 4: "prácticamente cualquier director de marketing en México conoce Kantar".',
      fortalezaInvisible: 'Es el único que ya resolvió el combo que a Research Land le falta entero: marketplace + pricing por créditos + copiloto de IA con nombre. No es que lo comunique mejor: es que lo tiene construido.',
      inbound: 'Hub de insights con fuerte autoridad, pero desactualizado. Suscribirse al newsletter exige pasar por el formulario de contacto, y no llega ningún correo automático.',
      paid: 'Solo Meta Ads, actividad puntual, sin tráfico pagado ni keywords detectadas, sin landing dedicada.',
    },
    {
      nombre: 'De la Riva Group',
      fortaleza: 'Intérprete cultural con voz propia: no vende investigación, vende cultura + personas + negocio.',
      amenaza: 'alta',
      nosGanaEn: 'Es el rival directo. Lámina 25, textual: "el competidor directo más fuerte de Research Land en el segmento de agencia mexicana premium", y el único calificado "Líder a nivel local/independiente". Tiene lo que a RL le falta: página propia de IA y tecnología, casos de éxito narrados, libros, microtendencias y el newsletter personal del CEO.',
      dondeSeLeGana: 'En cimientos y en producto de IA. Su SEO es "frágil" (lámina 26): 86% dependiente de marca, rendimiento en rojo (25 escritorio / 42 móvil) y un perfil de enlaces con blogs tipo blogspot que el propio deck marca como posible pasivo. Y en IA es "la menos avanzada" (lámina 34): su tienda vende libros, no estudios.',
      medicion: 'El competidor con más tráfico bruto del set —741 visitas al mes— pero casi todo de marca: la única keyword no-marca que aporta algo es "barranca del m…", con 5.66%.',
      institucional: 'AMAI y presencia constante de Gabriela de la Riva —fundadora y presidenta, expresidenta de AMAI— en foros y espacios académicos. Sobre la antigüedad, lo defendible es "fundada en 1988": el "más de 27 años" de la lámina 5 sale del texto viejo de su LinkedIn y su propio sitio reclama 35.',
      fortalezaInvisible: 'Su ecosistema de unidades. Hub, The Growth Studio, Lemon Ice (cuantitativo) y Auditor Service (IA) le dejan competir en varios frentes con marcas distintas, y sus blogs vivos están ahí, no en la marca madre.',
      inbound: 'Sin descargables ni material abierto salvo cuatro casos de éxito de tres párrafos. Siendo agencia de investigación, no publica estudios ni abiertos ni cerrados. Los blogs activos son los de sus unidades.',
      paid: 'El único con landing dedicada. LinkedIn Ads y Meta Ads, bajo $50K —sin moneda declarada—, campañas de consideración y panel. El mapa de la lámina 40 lo pone como "Líder México" aunque su madurez declarada es "Básico": lidera una categoría floja.',
    },
    {
      nombre: 'Pulso Mercadológico',
      fortaleza: 'Confianza institucional certificada: ISO 9001:2015 con certificado verificable, 30+ años y dominio del segmento político y de gobierno.',
      amenaza: 'media',
      nosGanaEn: 'Credenciales de proceso y terreno público. Lámina 6: amenaza "Media-Alta, especialmente en estudios tradicionales y opinión pública". Su pilar —"pueden no estar de acuerdo con nuestros resultados, pero nos creen"— es difícil de disputar en gobierno.',
      dondeSeLeGana: 'En todo lo digital. Sitio "básico" y técnicamente desactualizado (lámina 27), sin blog, sin newsletter, sin nutrición, sin IA y sin paid. El deck lo dice: como motor de demanda digital está por debajo de Research Land, De la Riva, Ipsos y Kantar.',
      medicion: '104 visitas al mes y 37 keywords, con la dependencia de marca más baja de los competidores (71%) y una keyword de negocio real: "encuesta presidencial".',
      institucional: 'ISO 9001:2015 con certificado verificable (NYCE 2016CRE-537, vigente hasta enero de 2028) y afiliación AMAI: es la credencial de calidad mejor documentada de todo el set. El ESIMM que le atribuye la lámina 6 NO se pudo verificar — su ficha oficial de AMAI solo lista ISO 9001. Opera junto a la marca Covarrubias y Asociados.',
      fortalezaInvisible: 'Sus backlinks son mejores que su score: enlaces desde Wikipedia, Vanguardia y e-consulta. En el nicho electoral lo citan aunque su sitio no lo capitalice.',
      inbound: 'Sin blog y sin newsletter. Contenido descargable en PDF pero desactualizado, salvo en política, donde sí tiene estudios de 2026.',
      paid: 'Sin pauta detectada. Lámina 48: "la marca parece operar fuera de un sistema digital de demanda".',
    },
    {
      nombre: 'Bitácora Social',
      fortaleza: 'Antropología aplicada con una red que nadie más tiene: según su propio sitio, colabora con más de 300 antropólogos en México y Latinoamérica. Dice "colabora con", no "emplea": son red, no plantilla, y nadie lo ha verificado por fuera.',
      amenaza: 'media',
      nosGanaEn: 'Profundidad cualitativa de nicho. Lámina 7: amenaza "Media, particularmente para Customer Land, Brand Land y estudios cualitativos". Su diferenciador es explícitamente lo humano, en contraposición al discurso de datos e IA — y el sector le está dando la razón: la preocupación por respondientes sintéticos y bots subió cerca de 40% interanual.',
      dondeSeLeGana: 'En absolutamente todo lo demás. Un solo canal de contacto —el teléfono—, sitio one-page sin landings ni hub, SEO "Ausente" con 6 keywords y 100% de marca, cero visibilidad en IA, redes inactivas y 0% de engagement.',
      medicion: '70 visitas al mes, de las que prácticamente el 100% viene de las tres variantes de su propio nombre.',
      institucional: 'Sin certificaciones corporativas comunicadas públicamente. Su terreno son la academia y las instituciones públicas; ExpoNegocios y foros de cultura y comportamiento social.',
      fortalezaInvisible: 'El aval académico. Entre sus 113 dominios de referencia hay enlaces de la UNAM: para un cliente que compra rigor social, ese respaldo pesa más que cualquier métrica digital.',
      inbound: 'No tiene recursos, ni blog, ni newsletter. El sitio entero es una página de inicio describiendo servicios en párrafos cortos.',
      paid: 'Sin pauta estructurada. Ninguna inversión ni keyword pagada detectada.',
    },
  ],

  /**
   * LA MATRIZ. Cada nivel sale de un veredicto ESCRITO en el deck, no de una
   * apreciación: las fichas de sitio y SEO declaran el suyo en su caja de
   * cierre ("Sitio sólido", "Básico con techo sólido"), la lámina 31 declara
   * la madurez de IA y los mapas de las láminas 53 y 57 lo declaran por color.
   *
   * `sin_dato` NO es un nivel bajo: es que el deck no midió esa casilla. Pasa
   * en dos sitios y conviene saberlo — Pulso y Bitácora no entran en el anexo
   * de IA, y Research Land no tiene ficha propia de paid (el bloque analiza a
   * los cinco competidores, no a ella).
   */
  matriz: [
    {
      variable: 'Sitio web',
      udn: 'solido',
      competidores: ['lider', 'solido', 'lider', 'basico', 'basico'],
      nota: 'Láminas 15 a 27. RL es "sólido y muy cercano a líder"; le falta discurso de IA, casos de éxito narrados y marketplace. De la Riva es el único "Líder" local.',
    },
    {
      variable: 'SEO',
      udn: 'basico',
      competidores: ['basico', 'basico', 'basico', 'basico', 'ausente'],
      nota: 'Nadie llega a "Sólido". RL es "básico con techo sólido"; Ipsos y Kantar son "básicos" que se apoyan en la autoridad de su dominio global.',
    },
    {
      variable: 'Infraestructura de conversión',
      udn: 'lider',
      competidores: ['basico', 'solido', 'solido', 'basico', 'ausente'],
      nota: 'Lámina 14: "mejor infraestructura de conversión de la categoría". Cuatro canales y CRM conectado; solo Kantar tiene lo mismo. Bitácora capta únicamente por teléfono.',
    },
    {
      variable: 'Madurez de IA declarada',
      udn: 'ausente',
      competidores: ['lider', 'lider', 'basico', 'sin_dato', 'sin_dato'],
      nota: 'Lámina 31. Pulso y Bitácora no entran en el anexo de IA: no es que estén en cero, es que no se midieron.',
    },
    {
      variable: 'Autoservicio y pricing visible',
      udn: 'ausente',
      competidores: ['basico', 'basico', 'ausente', 'sin_dato', 'sin_dato'],
      nota: 'Nadie tiene checkout real. Ipsos publica "desde $3,750 mxn" y Kantar "desde $4,500 usd", pero el alta pasa por ventas en los dos. Es la ventana más clara de la categoría.',
    },
    {
      variable: 'Paid media',
      udn: 'sin_dato',
      competidores: ['basico', 'ausente', 'basico', 'ausente', 'ausente'],
      nota: 'Láminas 40 y 41. Research Land no tiene ficha propia en este bloque. De la Riva es el único con landing dedicada y el mapa lo llama "Líder México" pese a su madurez "Básico": lidera una categoría floja.',
    },
    {
      variable: 'Inbound y nutrición',
      udn: 'solido',
      competidores: ['basico', 'basico', 'basico', 'basico', 'ausente'],
      nota: 'Mapa de la lámina 53, por color de burbuja. RL es el único "Sólido": 4 activos de contenido y gating real. Nadie alcanza "Líder".',
    },
    {
      variable: 'Redes sociales',
      udn: 'solido',
      competidores: ['solido', 'solido', 'solido', 'ausente', 'ausente'],
      nota: 'Mapa de la lámina 57. Ojo: el deck pinta a RL igual que a Ipsos pese a que sus números lo superan en seguidores y en engagement (3.56% contra 0.3%).',
    },
    {
      variable: 'Liderazgo de pensamiento',
      udn: 'basico',
      competidores: ['lider', 'lider', 'solido', 'basico', 'basico'],
      nota: 'Lámina 8, sobre 10: RL saca 7 en artículos y 8 en estudios propios, pero 5 en conferencias, 5 en voceros visibles y 4 en medios. Ipsos saca 10 en las cinco.',
    },
  ],

  /**
   * LAS CIFRAS DURAS. Es la tabla que se cita en una reunión, así que cada
   * fila dice de qué disciplina es y va con el número exacto del deck, sin
   * redondear.
   *
   * ⚠️ Las columnas de Ipsos y Kantar mezclan dos cosas donde el deck las
   * mezcla: cuando un valor es del dominio global y no del sitio mexicano, se
   * escribe "mx" y "global" en la propia celda, porque esconderlo es lo que
   * hace indefendible la comparación.
   */
  comparativa: {
    titulo: 'Research Land contra sus cinco competidores',
    filas: [
      {
        criterio: 'Visitas orgánicas al mes',
        udn: '345',
        valores: ['4,000', '18 mx · 7.2k global', '741', '104', '70'],
        bloque: 'web',
      },
      {
        criterio: 'Tráfico que depende de la marca',
        udn: '0%',
        valores: ['82%', '100% mx · 28% global', '86%', '71%', '100%'],
        ganaLaUdn: true,
        bloque: 'web',
      },
      {
        criterio: 'Keywords posicionadas',
        udn: '227',
        valores: ['423', '9 mx · 1.5k global', '80', '37', '6'],
        bloque: 'web',
      },
      {
        criterio: 'Authority Score (sobre 100)',
        udn: '17',
        valores: ['65 global', '50 global', '24', '19', '14'],
        bloque: 'web',
      },
      {
        criterio: 'Visibilidad en IA (sobre 100)',
        udn: '14',
        valores: ['37', '30', '25', '14', '0'],
        bloque: 'web',
      },
      {
        criterio: 'Menciones en motores de IA',
        udn: '8',
        valores: ['6,300', '4,700', '15', '12', '0'],
        bloque: 'web',
      },
      {
        criterio: 'Backlinks y dominios de referencia',
        udn: '6,400 / 140',
        valores: ['4 / 3', '107 / 47 mx · 558k / 29.6k global', '747 / 289', '331 / 166', '393 / 113'],
        bloque: 'web',
      },
      {
        criterio: 'Rendimiento móvil (PageSpeed)',
        udn: '64',
        valores: ['4', '55', '42', '62', '57'],
        ganaLaUdn: true,
        bloque: 'web',
      },
      {
        criterio: 'Canales de contacto',
        udn: '4 · Form, teléfono, email, chat',
        valores: ['2 · Form, teléfono', '2 · Form, teléfono', '4 · Form, teléfono, email, WhatsApp', '3 · Form, teléfono, email', '1 · Teléfono'],
        ganaLaUdn: true,
        bloque: 'comercial',
      },
      {
        criterio: 'CRM conectado al sitio',
        udn: 'Sí · HubSpot',
        valores: ['No', 'HubSpot · Salesforce', 'No', 'No', 'No'],
        ganaLaUdn: true,
        bloque: 'comercial',
      },
      {
        criterio: 'Precio de entrada publicado',
        udn: 'Cotización por proyecto',
        valores: ['Desde $3,750 mxn', 'Desde $4,500 usd', 'Consultoría a medida', 'No publica', 'No publica'],
        bloque: 'comercial',
      },
      {
        criterio: 'Seguidores en redes',
        udn: '133,196',
        valores: ['116,252', '6,524', '23,294', '6,017', '1,932'],
        ganaLaUdn: true,
        bloque: 'rrss',
      },
      {
        criterio: 'Engagement en redes',
        udn: '3.56%',
        valores: ['0.3%', '0.77%', '0.52%', '2.4%', '0%'],
        ganaLaUdn: true,
        bloque: 'rrss',
      },
      {
        criterio: 'Inversión en paid estimada',
        udn: 'No medida en el análisis',
        valores: ['Menos de $20K', 'No disponible', 'Menos de $50K', 'Sin pauta', 'Sin pauta'],
        bloque: 'paid',
      },
      {
        criterio: 'Landing dedicada para pauta',
        udn: 'No medida en el análisis',
        valores: ['No', 'No', 'Sí', 'Sin pauta', 'Sin pauta'],
        bloque: 'paid',
      },
    ],
    notaPie: 'Las cifras de inversión en paid del deck NO declaran moneda, y su matriz (lámina 41) y su ficha (lámina 42) discrepan sobre Ipsos: $20K contra $10K. Los Authority Score de Ipsos y Kantar marcados "global" son de ipsos.com y kantar.com enteros, no de sus páginas mexicanas: no son comparables con los dominios locales de esta misma fila.',
    fuente: 'Benchmark Digital junio 2026 · Marketing Corp · láminas 8, 12, 31, 41 y 58, transcritas de las tablas del deck',
  },

  /**
   * EL VEREDICTO DE CADA DISCIPLINA. `ventana: true` marca donde la CATEGORÍA
   * ENTERA está floja —no un rival—, que es la lectura más rentable del
   * análisis: una puerta abierta que se cierra sola con el tiempo. Aquí son
   * tres, y las tres las declara el propio deck en sus conclusiones.
   */
  disciplinas: [
    {
      id: 'portafolio',
      veredicto: 'Ipsos, Kantar y De la Riva no ganan porque investiguen mejor: ganan porque son percibidos como expertos, voceros y referentes (lámina 9). Research Land tiene los activos para disputarlo —700 proyectos al año, territorios especializados, el podcast, estudios propios— y el propio deck concluye que "hoy esos activos generan mucho menos ruido en el mercado que los de sus competidores".',
    },
    {
      id: 'web',
      veredicto: 'El sitio mejor calificado del set y la autoridad más baja para llenarlo. Research Land tiene la mejor infraestructura de conversión de la categoría —cuatro canales con CRM detrás— y es el único sin dependencia de marca, pero un Authority Score de 17 y 14 de visibilidad en IA lo dejan fuera de "Líder". El cuello de botella que el deck señala es técnico: ningún sitio del set pasa Core Web Vitals.',
    },
    {
      id: 'comercial',
      veredicto: 'Nadie vende autoservicio de verdad y nadie publica precio. Kantar e Ipsos tienen marketplace y copiloto de IA, pero el alta real pasa por ventas en los dos; De la Riva no tiene ni discurso de IA; y ni Attest, el jugador más DIY del mundo, se atreve a quitar al humano. Research Land no tiene ninguna de las dos cosas, y por eso mismo es donde más rápido puede diferenciarse.',
      ventana: true,
    },
    {
      id: 'paid',
      veredicto: 'La categoría casi no compra demanda. De la Riva es el único con landing dedicada y el único que sostiene campañas; Kantar hace Meta puntual; Bitácora y Pulso no pautan. El deck lo resume así: "la mayoría no está comprando demanda activa ni tiene infraestructura visible para convertir tráfico pagado". Research Land no fue medida en este bloque.',
      ventana: true,
    },
    {
      id: 'rrss',
      veredicto: 'Research Land ya gana aquí y el deck no lo dice con esas palabras: 133,196 seguidores contra 116,252 de Ipsos, y 3.56% de engagement contra 0.3%. Lo que falta no es contenido sino estrategia por plataforma — en TikTok solo amplifica el podcast y aun así es su mayor motor de interacción. En inbound, ningún competidor local tiene ecosistema estable y los globales publican sin capturar un solo dato.',
      ventana: true,
    },
    {
      id: 'pr',
      veredicto: 'Es la brecha más ancha y la más lenta de cerrar. En el comparativo de liderazgo de pensamiento (lámina 8, sobre 10), Research Land saca 5 en conferencias, 5 en voceros visibles y 4 en presencia en medios, contra un 10 perfecto de Ipsos en las cinco variables. Tiene estudios propios (8) y artículos (7): lo que no tiene es quién los cuente en público.',
    },
  ],

  /**
   * LAS RECOMENDACIONES. Las cinco primeras salen de las conclusiones escritas
   * del deck (láminas 14, 36, 51 y 59). La sexta NO sale del deck: sale de
   * auditar sus propias cifras, y contradice una de sus lecturas — por eso
   * lleva dicho de dónde viene.
   */
  recomendaciones: [
    {
      que: 'Poner precio a la vista, aunque sea por rangos.',
      porque: 'Es el único hueco que tiene toda la categoría a la vez: ni Kantar Marketplace, ni Ipsos.Digital, ni Attest publican tarifa. Ipsos enseña un "desde $3,750 mxn" y Kantar un "desde $4,500 usd", y ahí se acaba. Quien lo haga primero se queda con la búsqueda de quien compara antes de llamar.',
    },
    {
      que: 'Contar la IA que ya se usa, y contarla como copiloto del analista, nunca como reemplazo.',
      porque: 'Research Land es la única del set con madurez de IA "Ausente" en su sitio, aunque sí la use en sus estudios. Y el argumento está regalado: ni Attest, el jugador más DIY del mercado, quita al humano —sus cuatro planes incluyen un research expert asignado—. Al citarlo, nombrar bien sus productos: Compass es el copiloto y Explore son las entrevistas moderadas por IA; el deck las atribuye las dos a Compass.',
    },
    {
      que: 'Bajar los estudios a redes con estrategia por plataforma.',
      porque: 'Es donde ya se gana: más seguidores que Ipsos y casi doce veces su engagement. Hoy TikTok solo amplifica el podcast y aun así es el mayor motor de interacción. El deck lo dice: no falta contenido, falta estrategia por plataforma.',
    },
    {
      que: 'Montar la biblioteca de estudios: lo general abierto, los insights clave detrás de formulario.',
      porque: 'Es la ventaja que nadie más puede copiar rápido. Los globales publican volumen sin gatear —ganan SEO y no capturan un dato—, y ningún local tiene ecosistema inbound estable. Research Land ya es el único con gating real y CRM conectado: solo le falta qué meterle.',
    },
    {
      que: 'Arreglar el rendimiento móvil antes que cualquier otra cosa del sitio.',
      porque: 'El deck lo llama "la palanca más directa para mejorar posiciones y conversión". Research Land va en 64 sobre 100 en móvil: es de los mejores del set, pero el set entero reprueba, así que el primero que lo arregle se separa.',
    },
    {
      que: 'Ampliar el set competitivo antes del próximo corte: faltan categorías enteras, no solo nombres.',
      porque: 'NO SALE DEL DECK. Este benchmark mide a cinco agencias ad-hoc y deja fuera a los de datos continuos (NielsenIQ+GfK, Worldpanel by Numerator), a los mexicanos del padrón AMAI (Berumen, Nodo, Lexia), a los de opinión pública —Parametría, Enkoll, Mitofsky, BGC, Buendía y Márquez, que son el set real si la vertical político-electoral avanza— y a los tech-led de autoservicio, que no compiten por el RFP pero sí por el presupuesto del cliente que decide hacerlo por dentro. Esa última es la grieta que el sector reporta: los tech-led crecen y los service-led caen.',
    },
    {
      que: 'Auditar el perfil de enlaces antes de volver a presentar los 6,400 backlinks como una fortaleza.',
      porque: 'NO SALE DEL DECK: sale de auditar sus cifras. 6,400 enlaces desde solo 140 dominios es una razón de 45.7 a 1, cuando los competidores mexicanos van de 2 a 3.5 y lo sano ronda 3 a 5. Esa firma es la de enlaces repetidos en todas las páginas de unos pocos sitios —un pie de página compartido entre los sitios del grupo lo produce— y tres de los seis factores antispam del Authority Score penalizan justo ese patrón. Puede ser la causa del 17, no su contrapeso.',
    },
  ],

  /**
   * EL GRÁFICO. Es el único del deck que rotula sus valores (lámina 13), así
   * que es el único que se puede montar sin estimar leyendo un dibujo. Los
   * mapas de burbujas de inbound y RRSS (láminas 53 y 57) se quedan fuera a
   * propósito: sus ejes arrancan en negativo por escalado automático
   * (-13,820 seguidores, -0.43% de engagement) y sus burbujas se tapan entre
   * sí, así que redibujarlos sería heredar sus defectos.
   */
  graficos: [
    {
      bloque: 'web',
      grafico: {
        tipo: 'barras-comparadas',
        titulo: 'Posicionamiento en sitio web y SEO',
        periodos: ['Research Land', 'Ipsos', 'Kantar', 'De la Riva', 'Pulso', 'Bitácora'],
        series: [
          { etiqueta: 'Authority Score', valores: [17, 65, 50, 24, 19, 14] },
          { etiqueta: 'Visibilidad IA', valores: [14, 37, 30, 25, 14, 0] },
          { etiqueta: '% tráfico no-marca', valores: [100, 18, 0, 14, 29, 0], sufijo: '%' },
        ],
        mostrarValores: true,
      },
      lectura: 'La barra alta de Research Land es "% de tráfico que NO viene de su marca", no una nota de calidad: el deck la rotula mal en su propia lectura. Y los 65 de Ipsos y 50 de Kantar son de sus dominios globales, no de sus sitios mexicanos.',
    },
  ],

  /**
   * CONTEXTO QUE NO SALE DEL DECK. Son las comprobaciones que se le hicieron
   * al análisis desde fuera, cada una con su fuente. Están aquí y no
   * escondidas porque tres de ellas acotan cifras que el propio deck presenta
   * sin matiz, y quien las diga en una junta antes de que se las pregunten
   * queda mejor parado que quien las defienda después.
   */
  mercado: [
    {
      dato: 'El Authority Score de un subdirectorio no se calcula: se hereda del dominio raíz. Por eso no existe un score de ipsos.com/es-mx, y el 65 que se le atribuye es el de ipsos.com entero. No es un número mal elegido: es una medición que no se puede hacer así.',
      fuente: 'Semrush, documentación de Authority Score y API de backlinks (alcances root_domain / subfolder), consultada el 25-ago-2026',
    },
    {
      dato: 'Con las propias cifras del deck, Research Land es SEGUNDO del set en tráfico orgánico que no viene de su marca: 345 visitas contra unas 720 de Ipsos y unas 104 de De la Riva. Es el mismo dato dicho de forma defendible, sin comparar contra dominios globales.',
      fuente: 'Derivado de la tabla comparativa del propio deck (visitas × porcentaje no-marca), verificado el 25-ago-2026',
    },
    {
      dato: 'Las métricas de visibilidad en IA son señal direccional, no cifras exactas: el propio proveedor declara que "ninguna plataforma puede dar números exactos de visibilidad". La diferencia entre 8, 12 y 15 menciones está dentro del ruido; la brecha de tres órdenes de magnitud contra Ipsos y Kantar sí es real.',
      fuente: 'Semrush, documentación de AI Visibility Toolkit; y descomposición de varianza en respuestas de marca de LLMs, arXiv 2607.13304, julio 2026',
    },
    {
      dato: 'Core Web Vitals se dictamina con datos de campo de usuarios reales, y Google no los publica por debajo de cierto tráfico. Con 345, 104, 70 y 18 visitas al mes, el "no pasa" de cuatro de los seis sitios probablemente significa "no hay datos suficientes para medirlo", que no es lo mismo.',
      fuente: 'web.dev, definición de los umbrales de Core Web Vitals, consultada el 25-ago-2026',
    },
    {
      dato: 'El panel de 8,500 hogares mexicanos YA NO ES DE KANTAR. Worldpanel se separó de Kantar y desde julio de 2025 opera como "Worldpanel by Numerator". El deck describe una Kantar México que cambió de forma hace un año: usar ese panel como fortaleza suya es un error que un cliente informado detecta.',
      fuente: 'Numerator y Kantar, comunicados de la combinación (ene-2025) y del lanzamiento de la marca (jul-2025), verificados el 25-ago-2026',
    },
    {
      dato: 'ESIMM dejó de ser obligatorio para los socios de AMAI: la propia asociación dice que "los lineamientos han dejado de ser obligatorios" y que el protocolo es hoy un compromiso profesional voluntario. Como argumento de calidad frente a un cliente enterprise pesa menos que una ISO 9001 con certificado verificable — que es justo lo que tiene Pulso.',
      fuente: 'AMAI, página de certificación ESIMM, consultada el 25-ago-2026',
    },
    {
      dato: 'La industria se está partiendo entre proveedores "tech-led", que crecen, y "service-led", que caen; y las preocupaciones por calidad del dato subieron cerca de 40% interanual por respondientes sintéticos y bots. La síntesis del sector es "human-led and AI-powered", no IA sola: el trabajo de campo real y verificable vuelve a ser escaso, que es exactamente el activo de Research Land.',
      fuente: 'GRIT Report de Greenbook, ediciones 2025 y 2026, consultado el 25-ago-2026',
    },
    {
      dato: 'UPAX GS figura en el padrón de socios de AMAI. Es una credencial que el material comercial de Research Land hoy no usa, y en un mercado donde el estándar sectorial dejó de ser obligatorio, pertenecer al padrón vale más que antes.',
      fuente: 'AMAI, listado público de asociados, consultado el 25-ago-2026',
    },
    {
      dato: 'El benchmark deja fuera categorías enteras de competidor, no solo nombres: los de datos continuos (NielsenIQ+GfK, Worldpanel by Numerator), los mexicanos ad-hoc del padrón AMAI (Berumen, Nodo, Lexia), los de opinión pública (Parametría, Enkoll, Mitofsky, BGC, Buendía y Márquez) y los tech-led de autoservicio (Zappi, quantilope, Toluna, Suzy), que no compiten por el RFP pero sí por el presupuesto del cliente que decide internalizar.',
      fuente: 'Padrón de asociados AMAI y GRIT Report, contrastados el 25-ago-2026',
    },
  ],

  /**
   * EL RESUMEN EJECUTIVO. Breve a propósito: lo largo ya está en los
   * veredictos de cada disciplina, y esto es lo que se lee en la sala.
   */
  lectura: 'Research Land llega a esta comparación con la mejor infraestructura de captación de la categoría —cuatro canales de contacto con CRM detrás, algo que solo Kantar iguala— y con la audiencia más viva: más seguidores que Ipsos y casi doce veces su engagement. Lo que le falta no es maquinaria, es autoridad y demanda que meterle: Authority Score de 17, ocho menciones en motores de IA frente a las miles de los globales, y un 5 sobre 10 en voceros visibles cuando Ipsos saca 10. La categoría entera le deja tres puertas abiertas al mismo tiempo: nadie publica precio, nadie vende autoservicio de verdad y ningún competidor local tiene un ecosistema de contenido que capture. Ninguna de las tres exige construir un producto nuevo; las tres exigen contar y ordenar lo que ya existe.',

  fuente: 'Benchmark Digital junio 2026 · Marketing Corp · 61 láminas, cinco bloques. Las 27 tablas del deck se transcribieron de las láminas renderizadas, porque no viajan en el export de texto',
  actualizado: '2026-06-30',
}

export const BENCHMARK_POR_SALA: Record<string, Benchmark> = {
  'promo-espacio': PROMO_ESPACIO,
  'research-land': RESEARCH_LAND,
}

export function benchmarkIncrustado(salaSlug: string): Benchmark | null {
  return BENCHMARK_POR_SALA[salaSlug] ?? null
}
