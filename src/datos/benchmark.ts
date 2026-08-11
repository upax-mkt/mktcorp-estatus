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
 * - El RADAR de capacidades (lámina 67) no rotula sus valores: leerlos del
 *   dibujo sería estimarlos. Va como testigo —la imagen— y su clasificación
 *   textual (GANAS / EMPATAS / TE SUPERAN) está repartida en las notas de la
 *   matriz, que sí es literal.
 * - Precios y condiciones comerciales: el propio deck avisa de que no se
 *   pudieron validar (solo ISA y JCDecaux respondieron).
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
    {
      valor: '3',
      rotulo: 'Variables donde es la única líder',
      lectura: 'Indoor, cercanía al punto de consumo y flexibilidad comercial. Nadie más lidera esas tres.',
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
  comparativa: {
    titulo: 'Sitio web y SEO, criterio por criterio',
    filas: [
      { criterio: 'Visitas orgánicas / mes', udn: '803', valores: ['3,600', '785', '2,500', '185', '614'] },
      { criterio: 'Tráfico de marca', udn: '50%', valores: ['89%', '100%', '18%', '95%', '100%'], ganaLaUdn: true },
      { criterio: 'Keywords posicionadas', udn: '96', valores: ['246', '9', '69', '80', '14'] },
      { criterio: 'Authority Score (/100)', udn: '22', valores: ['27', '18', '28', '12', '10'] },
      { criterio: 'Visibilidad en IA (/100)', udn: '26', valores: ['31', '14', '18', '14', 's/d'] },
      { criterio: 'Core Web Vitals', udn: 'No pasa', valores: ['No pasa', 'No pasa', 'No pasa', 'No pasa', 'Pasa'] },
      { criterio: 'Backlinks / dominios ref.', udn: '1,600 / 135', valores: ['272k / 343', '87 / 31', '26k / 360', '3,900 / 34', '96 / 40'] },
      { criterio: 'N.º canales de contacto', udn: '4', valores: ['2', '1', '4', '3', '1'], ganaLaUdn: true },
      { criterio: 'Canales de contacto', udn: 'Form · Tel · Email · Chat', valores: ['Form · Tel', 'Form', 'Form · Tel · Mail · WA', 'Form · Mail · WA', 'Form'] },
      { criterio: 'WhatsApp comercial', udn: 'No', valores: ['No', 'No', 'Sí', 'Sí', 'No'] },
      { criterio: 'CMS / Automatización', udn: 'HubSpot', valores: ['WordPress', 'Drupal', 'WordPress + Elementor', 'WordPress + Elementor', 'WordPress'], ganaLaUdn: true },
      { criterio: 'CRM conectado al sitio', udn: 'Sí · HubSpot', valores: ['No detectado', 'No detectado', 'No detectado*', 'Sí · Clientify', 'No detectado'], ganaLaUdn: true },
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

  frentesAbiertos: [
    {
      frente: 'Comercial',
      evidencia: 'Solo ISA (3 días) y JCDecaux (10 días) respondieron a la prospección. Global, IMJ e IMU no dieron señal pese a tener formulario, redes y teléfono visibles.',
    },
    {
      frente: 'Paid media',
      evidencia: 'JCDecaux marca el techo con <$50K MXN y 22 keywords; el resto está por debajo de $10K o ausente. Ninguno usa landing dedicada y la pauta se concentra en Monterrey: activación por plaza, no estrategia nacional.',
    },
    {
      frente: 'SEO y web',
      evidencia: 'Todos dependen del tráfico de su marca (JCDecaux 100%, IMJ 100%, Global 95%, ISA 89%). Cinco de seis no pasan Core Web Vitals. Lideran porque ya los buscan, no porque los descubran.',
    },
    {
      frente: 'Inbound y RRSS',
      evidencia: 'Sin contenido capturable y casi sin blogs con tesis. Dicen qué venden, no cómo funciona ni por qué es superior.',
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
       * Se dibuja como barras y no como radar porque el catálogo de gráficos
       * de esta app no tiene radar, y añadir uno para una sola pantalla es
       * más deuda que valor. Comparar siete pares de barras funciona igual de
       * bien —mejor, incluso, para ver la distancia exacta en cada eje.
       */
      grafico: {
        tipo: 'barras-comparadas',
        titulo: 'Radar de capacidades, eje por eje',
        periodos: [
          'Momento de compra',
          'Digital / programática',
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
        mostrarValores: true,
      },
      lectura: 'Los ejes están ordenados por la distancia a favor: en momento de compra la ventaja es de 5 contra 1.6 —la mayor de las siete— y en escala de inventario la desventaja es de 2 contra 4.2. Es la misma forma que la matriz, en una sola vista. Escala de 1 a 5 y evaluación CUALITATIVA del análisis, no una medición de mercado: sirve para ordenar la conversación, no para citar en una propuesta.',
    },
  ],

  // ── LA EVIDENCIA ─────────────────────────────────────────────────────────
  // Franco: *"dejaste láminas como evidencia pero no es esa la evidencia, son
  // gráficos que no pusiste"*. Tenía razón: subí como testigos la matriz, la
  // tabla comparativa y la contactabilidad — las tres YA reconstruidas como
  // datos en esta misma página. Eso es duplicar, no evidenciar.
  //
  // Evidencia es lo que NO se puede reconstruir: los anuncios que la
  // competencia tiene corriendo, sus sitios, sus piezas. Se llenan abajo.
  // Se sirven por /api/archivo/[id], que comprueba permiso contra la sala.
  // Subidos con scripts/subir-testigos-benchmark.ts.
  testigos: [
    {
      titulo: 'El simulador de ISA',
      lectura: 'Un asistente de tres pasos dentro de su sitio —elegir el espacio, subir la imagen, ver el resultado— que monta la creatividad del cliente sobre la foto de un espacio real. Nadie más en el set lo tiene: resuelve solo la objeción de “no me imagino cómo se va a ver”, sin una llamada. Es lo único del análisis que obliga a construir algo, no a decir algo distinto.',
      url: '/api/archivo/0ae4933c-704c-4669-96f1-ad6d0b3b035b',
      bloque: 'ISA Corporativo · sitio',
    },
    {
      titulo: 'Los 17 anuncios que JCDecaux tiene corriendo en México',
      lectura: 'Diecisiete anuncios de búsqueda vivos, uno por formato, repartidos en dos dominios propios que compiten entre sí. Todo el argumento es cobertura y escala —“más de 15 mil anuncios”, “presencia en 32 estados”— y meten su suite de medición como enlaces del propio anuncio: Mide el Impacto, Post Buy, Engage. No venden espacios: venden cobertura con medición, y lo dicen desde el anuncio.',
      url: '/api/archivo/87a34f46-c3ae-4cdc-be55-cc6f9694e1f9',
      bloque: 'JCDecaux · paid media',
    },
    {
      titulo: 'Los anuncios que ISA lleva meses sin apagar',
      lectura: 'Dos anuncios marcados “Activo” en la biblioteca de Meta con su fecha de arranque a la vista: uno desde septiembre y otro desde diciembre de 2025. No venden “OOH”, venden dos activos concretos —aeropuertos y Metro— con foto de sus pantallas ya instaladas y campañas de cliente corriendo. Es el competidor con la operación de pauta más constante del set, y la fecha lo hace indiscutible en una junta.',
      url: '/api/archivo/632c7458-2b16-4633-be80-9bfa3b10c28a',
      bloque: 'ISA Corporativo · paid media',
    },
    {
      titulo: 'JCDecaux fuera de México: caso de éxito, no catálogo',
      lectura: 'En LinkedIn no anuncian inventario: anuncian el takeover de Wembley por una serie de conciertos agotados. En Meta venden con promesa de retorno y sostienen una serie de contenido propia ya en su quinto episodio. Es el techo de la categoría, y es contra esto que se va a comparar el material de Promo Espacio — no contra una lámina de formatos.',
      url: '/api/archivo/3b1c5117-7617-4509-b252-5619fa49811f',
      bloque: 'JCDecaux · internacional',
    },
    {
      titulo: 'Global Vía Pública fuera de México nombra a sus clientes',
      lectura: 'Afuera sí hacen paid social, y con marca cliente a la vista: sus pantallas corriendo Scotiabank, y la final de la Copa Libertadores con “Amstel apostó por dos de nuestras ubicaciones más potentes”. En México, en cambio, dejan redes sociales vacías. Es un movimiento concreto y copiable que ya dominan y todavía no traen aquí.',
      url: '/api/archivo/d44f6b1b-1fd2-4191-ac19-d077ea31d3db',
      bloque: 'Global Vía Pública · internacional',
    },
    {
      titulo: 'Cómo JCDecaux vende formato por formato',
      lectura: 'Su página de mobiliario urbano no lista formatos: los vende uno a uno con fotografía de calle real y una línea de beneficio cada uno, con campañas de cliente vivas encima. Es el estándar de cómo debería verse una oferta en pantalla. El contrapunto que el propio análisis marca: dependen al 100% del formulario para que alguien los contacte.',
      url: '/api/archivo/bf72cbc8-d3d1-4a60-9766-6bd1b0b1b1d2',
      bloque: 'JCDecaux · sitio',
    },
  ],

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

export const BENCHMARK_POR_SALA: Record<string, Benchmark> = {
  'promo-espacio': PROMO_ESPACIO,
}

export function benchmarkIncrustado(salaSlug: string): Benchmark | null {
  return BENCHMARK_POR_SALA[salaSlug] ?? null
}
