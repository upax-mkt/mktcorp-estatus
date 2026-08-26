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
     * ⚠️ VA PRIMERO, Y NO SALE DEL DECK. El benchmark mide presencia digital y
     * ahí Research Land sale penúltima en autoridad; esta cifra dice dónde
     * está en el negocio real, y sin ella la lectura entera se tuerce. La
     * publicó AMAI en mayo de 2026 y no la ha recogido ni un solo medio: es
     * primaria, es de tercero y hoy no la está usando nadie.
     *
     * VA CON SU ACOTACIÓN PEGADA. El ranking de AMAI es de participación
     * voluntaria —solo entran las que aceptan aparecer— y la propia AMAI
     * advierte que "no tiene el valor representativo de otros indicadores".
     * Decir "la tercera de México" a secas se cae en cuanto un cliente lo
     * verifica; decirlo con las 18 no cuesta nada y aguanta.
     *
     * Es también la razón de que los tres primeros indicadores sean estos: la
     * tarjeta de la sala solo enseña tres (`slice(0, 3)` en BenchmarkSala), y
     * ahí tienen que caber la escala, la fortaleza y la deuda.
     */
    {
      valor: '3.ª',
      rotulo: 'Del ranking AMAI 2025 por facturación',
      lectura: 'De las 18 agencias que aceptaron aparecer, solo Ipsos y De la Riva facturan más: los dos rivales que este análisis señala como los más duros. Es prueba de escala de un tercero, no de UPAX.',
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
      lectura: '133,196 seguidores contra 116,252 de Ipsos, y casi doce veces su tasa de interacción. El único frente donde gana en volumen y en calidad a la vez.',
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
      lectura: 'El penúltimo del set. Con 6,400 enlaces desde solo 140 dominios: mucho enlace que no construye autoridad, y probablemente la causa del 17 más que su contrapeso.',
      tono: 'atencion',
    },
    /* ⚠️ EL "0% DE TRÁFICO DE MARCA" NO ES UNA DE LAS CIFRAS DE CABECERA, y
       se retiró a propósito después de auditarlo. El deck lo presenta como
       fortaleza ("no dependen de su marca, los descubren"), pero con 345
       visitas al mes admite igual de bien la lectura contraria —que todavía
       nadie busca la marca— y hasta una tercera: que esté por debajo del
       umbral con que la herramienta detecta una keyword. Tres lecturas
       incompatibles no caben en una tarjeta de cinco segundos.
       La fila sigue en la tabla comparativa, con el número tal cual, y en
       `mercado` está la versión que SÍ se sostiene: Research Land es segundo
       del set en tráfico que no viene de su marca. Eso se defiende; el cero a
       secas, no. */
    /**
     * Lámina 31. Es el hueco de oferta, no un detalle de comunicación: Ipsos,
     * Kantar y De la Riva ya lo exhiben. Y la ficha de RL registra que SÍ usa
     * IA (análisis de sentimiento en político-electoral): el problema es que
     * no lo cuenta, que es más barato de arreglar.
     */
    {
      valor: 'Ausente',
      rotulo: 'Madurez de IA declarada',
      lectura: 'Pero al mirar el sitio, el problema es otro: la pieza de IA existe —un kit con prompt de ChatGPT y skill de Claude— y está fuera del sitemap, del buscador y del menú. No hay que construirla: hay que desenterrarla.',
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
    sustento: 'Lámina 14: "la mayoría de la competencia capta por teléfono/formulario sin CRM detrás". Lámina 36: "todos venden IA, ninguno vende autoservicio real" y "ninguno tiene pricing público". Lámina 59: "ningún competidor local tiene ecosistema inbound estable". Tres huecos de la categoría entera, no de un rival. Y el dato que el deck no tiene: en facturación real Research Land ya es la tercera del país según AMAI — la distancia es de visibilidad, no de tamaño.',
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
      dondeSeLeGana: 'En captación y en redes. Dos canales de contacto contra cuatro, sin CRM, y un sitio mexicano que el deck llama "una vitrina" más que un embudo. En redes: menos seguidores y 0.3% de engagement contra 3.56%.',
      medicion: 'Su SEO local vive de la marca global: 82% del tráfico es de marca y sus 4 backlinks locales no explican su Authority Score de 65, que es del dominio corporativo entero.',
      institucional: 'ESOMAR, referencia frecuente en AMAI, Global Trends 2024, Omnichannel Webinars 2024-2025. Lámina 3: "una de las agendas más activas del sector".',
      fortalezaInvisible: 'No necesita pautar ni posicionar: los motores de IA ya lo citan como fuente. Esa autoridad prestada del dominio global le da gratis lo que a un competidor local le cuesta años.',
      inbound: 'Publica todo abierto, sin gating: "el contenido es el producto" (lámina 54). Gana SEO y no captura un solo dato. Newsletter trimestral en inglés, sin correo de confirmación.',
      paid: 'CERO pauta B2B propia en México: sin anuncios en Meta, sin anuncios en Google sobre ipsos.com ni ipsos.com.mx, y ninguna cuenta mexicana en LinkedIn. Lo único que corre aquí con su nombre es reclutamiento para el panel iSay, comprado por su entidad global. Sí es un anunciante B2B sofisticado —788 anuncios en LinkedIn—, pero desde Alemania, Reino Unido, Dinamarca, Estados Unidos e India. En México su presupuesto de marketing no existe.',
    },
    {
      nombre: 'Kantar México',
      fortaleza: 'El más agresivo de todos en IA: suite con nombre propio (KAiA, LINK AI, Trend AI) y un Marketplace de autoservicio por créditos.',
      amenaza: 'alta',
      nosGanaEn: 'Producto y escala. Lámina 4: "compiten directamente por grandes corporativos". Marketplace con 150M+ consumidores en 80+ países, 45+ años en México y BrandZ como franquicia de contenido. ⚠️ El deck le atribuye además el panel de 8,500 hogares: ese panel salió de Kantar en 2025 y hoy es Worldpanel by Numerator, otra empresa. No usarlo contra ellos.',
      dondeSeLeGana: 'En frescura y foco local. Su página de México es un artículo de presentación de febrero de 2021, no una landing; sus artículos regionales no se actualizan desde diciembre de 2025 y no hay webinars desde 2021.',
      medicion: 'Su sitio mexicano tiene 18 visitas orgánicas al mes y 9 keywords, 100% de marca. Todo lo demás que exhibe —7.2k visitas, 1.5k keywords, AS 50— es del dominio global.',
      institucional: 'AMAI, IAB, BrandZ, Consumer Insights, Retail Trends. Lámina 4: "prácticamente cualquier director de marketing en México conoce Kantar".',
      fortalezaInvisible: 'Es el único que ya resolvió el combo que a Research Land le falta entero: marketplace + pricing por créditos + copiloto de IA con nombre. No es que lo comunique mejor: es que lo tiene construido.',
      inbound: 'Hub de insights con fuerte autoridad, pero desactualizado. Suscribirse al newsletter exige pasar por el formulario de contacto, y no llega ningún correo automático.',
      paid: 'Tampoco tiene pauta mexicana propia. Lo que corre en Meta es reclutamiento del panel PanelSmart, y los cinco anuncios activos en Google los compran Kantar UK Ltd y Mavens Inc. —entidades extranjeras—, y son en buena parte de marca empleadora. Su cuenta de LinkedIn, con 797 anuncios, es global y en inglés: no existe una cuenta Kantar México.',
    },
    {
      nombre: 'De la Riva Group',
      fortaleza: 'Intérprete cultural con voz propia: no vende investigación, vende cultura + personas + negocio.',
      amenaza: 'alta',
      nosGanaEn: 'Es el rival directo. Lámina 25, textual: "el competidor directo más fuerte de Research Land en el segmento de agencia mexicana premium", y el único calificado "Líder a nivel local/independiente". Tiene lo que a RL le falta: página propia de IA y tecnología, casos de éxito narrados, libros, microtendencias y el newsletter personal del CEO.',
      dondeSeLeGana: 'En cimientos y en IA. Su SEO es frágil: 86% dependiente de marca, rendimiento en rojo y enlaces sospechosos que el deck marca como posible pasivo. Y en IA es la menos avanzada del set: su tienda vende libros, no estudios.',
      medicion: 'El competidor con más tráfico bruto del set —741 visitas al mes— pero casi todo de marca: la única keyword no-marca que aporta algo es "barranca del m…", con 5.66%.',
      institucional: 'AMAI y presencia constante de Gabriela de la Riva —fundadora y presidenta, expresidenta de AMAI— en foros y espacios académicos. Sobre la antigüedad, lo defendible es "fundada en 1988": el "más de 27 años" de la lámina 5 sale del texto viejo de su LinkedIn y su propio sitio reclama 35.',
      fortalezaInvisible: 'Su ecosistema de unidades. Hub, The Growth Studio, Lemon Ice (cuantitativo) y Auditor Service (IA) le dejan competir en varios frentes con marcas distintas, y sus blogs vivos están ahí, no en la marca madre.',
      inbound: 'Sin descargables ni material abierto salvo cuatro casos de éxito de tres párrafos. Siendo agencia de investigación, no publica estudios ni abiertos ni cerrados. Los blogs activos son los de sus unidades.',
      paid: 'EL ÚNICO DEL SET QUE PAUTA DE VERDAD EN MÉXICO, y no como lo cuenta el deck: no tiene Meta Ads ni Google Ads —cero anuncios en ambas—, tiene cuatro en LinkedIn. Dos son corporativos con oferta concreta (su bootcamp de moderación y un estudio sindicado del Mundial) y DOS SON THOUGHT LEADER ADS PAGADAS DESDE EL PERFIL PERSONAL DE SU CEO. Ese formato cuesta alrededor de una tercera parte por clic que un anuncio normal: no es que invierta mucho, es que eligió el formato más barato y el que más se parece a una recomendación. Es la jugada a copiar.',
    },
    {
      nombre: 'Pulso Mercadológico',
      fortaleza: 'Confianza institucional certificada: ISO 9001:2015 con certificado verificable, 30+ años y dominio del segmento político y de gobierno.',
      amenaza: 'media',
      nosGanaEn: 'Credenciales de proceso y terreno público. Lámina 6: amenaza "Media-Alta, especialmente en estudios tradicionales y opinión pública". Su pilar —"pueden no estar de acuerdo con nuestros resultados, pero nos creen"— es difícil de disputar en gobierno.',
      dondeSeLeGana: 'En todo lo digital: sin blog, sin newsletter, sin nutrición, sin IA y sin pauta. Como motor de demanda está por debajo de Research Land, De la Riva, Ipsos y Kantar.',
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
      dondeSeLeGana: 'En todo lo demás. Un solo canal de contacto —el teléfono—, sitio de una página, seis keywords, cero visibilidad en IA y redes inactivas con 0% de engagement.',
      medicion: '70 visitas al mes, de las que prácticamente el 100% viene de las tres variantes de su propio nombre.',
      institucional: 'Sin certificaciones corporativas comunicadas públicamente. Su terreno son la academia y las instituciones públicas; ExpoNegocios y foros de cultura y comportamiento social.',
      fortalezaInvisible: 'El aval académico. Entre sus 113 dominios de referencia hay enlaces de la UNAM: para un cliente que compra rigor social, ese respaldo pesa más que cualquier métrica digital.',
      inbound: 'No tiene recursos, ni blog, ni newsletter. El sitio entero es una página de inicio describiendo servicios en párrafos cortos.',
      paid: 'Sin pauta estructurada. Ninguna inversión ni keyword pagada detectada.',
    },
  ],

  /**
   * QUIÉN NO ESTÁ MEDIDO. No sale del deck: sale de contrastar su lista de
   * cinco contra el padrón de socios de AMAI y contra el mercado real. Son
   * los que competirían de verdad y a los que nadie ha mirado todavía.
   *
   * El orden es el de un consejo tomado, no una lluvia de nombres: estos
   * siete se eligieron sobre otros seis candidatos (Parametría, BGC, Buendía
   * y Márquez, Nodo, Lexia, Toluna, Suzy), y el porqué de cada descarte está
   * en el informe que los levantó. Cuando uno se analice de verdad, sube a
   * `competidores` y sale de aquí.
   */
  ausentes: [
    {
      nombre: 'Worldpanel by Numerator',
      categoria: 'Datos continuos',
      porQueImporta: 'Va primero por higiene: el panel de 8,500 hogares que el deck le atribuye a Kantar es hoy de esta empresa. Se separaron en enero de 2025.',
      amenaza: 'alta',
    },
    {
      nombre: 'NielsenIQ (NIQ)',
      categoria: 'Datos continuos',
      porQueImporta: 'No pelea el RFP: se lleva el presupuesto antes de que exista. 2,877 millones de dólares de ingreso por suscripción, contra un negocio de proyectos que arranca de cero cada trimestre.',
      amenaza: 'alta',
    },
    {
      nombre: 'Berumen y Asociados',
      categoria: 'Agencia mexicana ad-hoc',
      porQueImporta: 'El hueco más difícil de justificar: mexicana, ad-hoc, socia AMAI, ISO 20252, campo propio en tres ciudades. Es el que más se parece a Research Land.',
      amenaza: 'alta',
    },
    {
      nombre: 'Enkoll',
      categoria: 'Opinión pública',
      porQueImporta: 'Acertó las presidenciales de 2018 y 2024, pero además hace cuali, cuanti y geomarketing: la única casa demoscópica que compite contra el negocio actual de RL, no solo contra la vertical nueva.',
      amenaza: 'alta',
    },
    {
      nombre: 'Consulta Mitofsky',
      categoria: 'Opinión pública',
      porQueImporta: 'Si la vertical político-electoral arranca, es el precio y la credibilidad contra los que van a comparar. Su modelo es distribución: regala el dato semanal y cobra el acceso.',
      amenaza: 'alta',
    },
    {
      nombre: 'Zappi',
      categoria: 'Autoservicio tech-led',
      porQueImporta: 'Cuando una casa matriz lo estandariza, validar creatividad deja de salir a concurso local: RL pierde el proyecto sin ser invitada. Kantar, que sí está en este análisis, es inversionista suyo.',
      amenaza: 'media',
    },
    {
      nombre: 'quantilope',
      categoria: 'Autoservicio tech-led',
      porQueImporta: 'Importa por una cifra que hay que saberse: publica precio, 2,000 dólares al mes. Es el ancla contra la que van a comparar cualquier propuesta.',
      amenaza: 'media',
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
      nota: 'A RL le falta discurso de IA, casos narrados y marketplace. De la Riva es el único "Líder" local.',
    },
    {
      variable: 'SEO',
      udn: 'basico',
      competidores: ['basico', 'basico', 'basico', 'basico', 'ausente'],
      nota: 'Nadie llega a "Sólido". Ipsos y Kantar se apoyan en la autoridad de su dominio global.',
    },
    {
      variable: 'Infraestructura de conversión',
      udn: 'lider',
      competidores: ['basico', 'solido', 'solido', 'basico', 'ausente'],
      nota: 'Cuatro canales y CRM conectado; solo Kantar iguala. Bitácora capta solo por teléfono.',
    },
    {
      variable: 'Madurez de IA declarada',
      udn: 'ausente',
      competidores: ['lider', 'lider', 'basico', 'sin_dato', 'sin_dato'],
      nota: 'Pulso y Bitácora no se midieron aquí: "sin dato" no es un cero.',
    },
    {
      variable: 'Autoservicio y pricing visible',
      udn: 'ausente',
      competidores: ['basico', 'basico', 'ausente', 'sin_dato', 'sin_dato'],
      nota: 'Ipsos publica "desde $3,750 mxn" y Kantar "desde $4,500 usd", pero el alta pasa por ventas. Nadie tiene checkout real.',
    },
    {
      variable: 'Paid media',
      udn: 'sin_dato',
      competidores: ['basico', 'ausente', 'basico', 'ausente', 'ausente'],
      nota: 'De la Riva lidera una categoría floja: es "Líder México" con madurez "Básico". A Research Land no la mide este bloque.',
    },
    {
      variable: 'Inbound y nutrición',
      udn: 'solido',
      competidores: ['basico', 'basico', 'basico', 'basico', 'ausente'],
      nota: 'RL es el único "Sólido": cuatro activos y gating real. Nadie alcanza "Líder".',
    },
    {
      variable: 'Redes sociales',
      udn: 'solido',
      competidores: ['solido', 'solido', 'solido', 'ausente', 'ausente'],
      nota: 'El deck pinta a RL igual que a Ipsos, pese a que sus números lo superan en las dos cosas.',
    },
    {
      variable: 'Liderazgo de pensamiento',
      udn: 'basico',
      competidores: ['lider', 'lider', 'solido', 'basico', 'basico'],
      nota: 'Sobre 10: RL saca 7 en artículos y 8 en estudios, pero 5 en voceros y 4 en medios. Ipsos, 10 en las cinco.',
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
        /* ⚠️ CORREGIDA. La tabla maestra del deck (lámina 12) pone "No pasa"
           en las seis columnas, pero la ficha de Kantar (lámina 23) muestra
           "Superada" en escritorio. Aquí va lo que dicen las FICHAS, que es
           donde está la medición, no el resumen que la aplanó. */
        criterio: 'Core Web Vitals (escritorio · móvil)',
        udn: 'No pasa · No pasa',
        valores: [
          'No pasa · No pasa',
          'Pasa · No pasa',
          'No pasa · No pasa',
          'No pasa · No pasa',
          'No pasa · No pasa',
        ],
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
        /* ⚠️ AQUÍ ESTABAN LAS CIFRAS DE INVERSIÓN DEL DECK, Y SE RETIRARON.
           Decían "menos de $20K" para Ipsos —"menos de $10K" en otra lámina—
           y "menos de $50K" para De la Riva, ninguna con moneda. Al buscarlas
           en las bibliotecas públicas de anuncios se vio por qué no cuadraban:
           NINGUNA plataforma publica gasto de anuncios comerciales, así que
           esos números no salen de una fuente pública sino de una estimación
           que el deck no cita. Y para Ipsos México el gasto detectable es
           CERO, con lo que las dos cifras son ciertas a la vez y ninguna
           informa. Lo que las sustituye es lo que sí se puede verificar y
           fechar: quién pauta, en qué plataforma y —el dato más revelador—
           QUIÉN LO PAGA. */
        criterio: 'Pauta B2B propia en México',
        udn: 'No medida en el análisis',
        valores: ['No · cero anuncios', 'No · cero anuncios', 'Sí · 4 en LinkedIn', 'No · cero anuncios', 'No · cero anuncios'],
        bloque: 'paid',
      },
      {
        criterio: 'Quién paga lo que sí corre en México',
        udn: 'No medida en el análisis',
        valores: [
          'Entidad global · panel iSay',
          'Kantar UK y Mavens · panel y empleo',
          'La entidad mexicana, y el CEO de su bolsillo',
          'Nadie',
          'Nadie',
        ],
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
      veredicto: 'No ganan por investigar mejor: ganan porque los perciben como expertos y referentes. Research Land tiene con qué disputarlo —700 proyectos al año, territorios propios, el podcast—, pero, en palabras del deck, "esos activos generan mucho menos ruido que los de sus competidores".',
    },
    {
      id: 'web',
      veredicto: 'El sitio mejor calificado del set, y la autoridad más baja para llenarlo. Cuatro canales de contacto con CRM detrás —solo Kantar iguala eso—, pero 17 de Authority Score y 14 de visibilidad en IA lo dejan fuera de "Líder".',
    },
    {
      id: 'comercial',
      veredicto: 'Nadie vende autoservicio de verdad y nadie publica precio. Ipsos y Kantar tienen marketplace, pero el alta pasa por ventas en los dos. Ni Attest, el jugador más DIY del mundo, se atreve a quitar al humano.',
      ventana: true,
    },
    {
      id: 'paid',
      veredicto: 'El share of voice pagado de esta categoría NO TIENE DUEÑO. Cuatro de los cinco no pautan nada en México —lo de Ipsos y Kantar es reclutamiento de panel comprado desde fuera del país— y el único que juega, De la Riva, lo hace con cuatro anuncios en LinkedIn. No hay contra quién pujar.',
      ventana: true,
    },
    {
      id: 'rrss',
      veredicto: 'Aquí Research Land ya gana, y el deck no lo dice con esas palabras: más seguidores que Ipsos y casi doce veces su engagement. No falta contenido, falta estrategia por plataforma. En inbound, los globales publican mucho y no capturan un solo dato.',
      ventana: true,
    },
    {
      id: 'pr',
      veredicto: 'La brecha más ancha y la más lenta de cerrar. Sobre 10: Research Land saca 5 en conferencias, 5 en voceros visibles y 4 en medios, contra el 10 perfecto de Ipsos en las cinco variables. Tiene los estudios; le falta quién los cuente en público.',
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
      dato: 'La industria mexicana de investigación de mercados y opinión pública vale 8,849.7 millones de pesos (2025), y creció apenas 1.2% nominal frente a 2024 después de un 2024 fuerte. Es la cifra que faltaba: hasta ahora el dato público más sólido era de 2017.',
      fuente: 'AMAI, Estudio Anual de la Industria, Edición XXVIII 2025-2026, publicado en mayo de 2026',
    },
    {
      dato: 'El mercado se está partiendo por tamaño: en 2025 las agencias que facturan más de 150 millones crecieron 5.5% y las de 50 a 150 millones cayeron 9.9%. Research Land está del lado que crece, y eso responde por anticipado al cliente que está evaluando una agencia mediana más barata.',
      fuente: 'AMAI, Edición XXVIII, comparativo 2025 vs 2024 sobre las 33 empresas presentes en ambas ediciones',
    },
    {
      dato: 'TRES DE CADA CUATRO agencias mexicanas ya usan IA, contra poco más de la mitad el año anterior. Esto agrava el hueco que marca el deck: no comunicar IA no deja a Research Land por detrás de Ipsos y Kantar, la deja fuera de la conversación de su propia industria.',
      fuente: 'AMAI, Edición XXVIII, mayo de 2026',
    },
    {
      dato: 'La investigación cuantitativa clásica lleva cuatro años cediendo terreno —de cerca del 71% de la facturación en 2021 al 47.2% en 2025— y lo absorben las "otras técnicas", que saltaron de 28.3% a 37.9% en un solo año. En método, la entrevista cara a cara se desplomó de 29.5% a 17.8% y el online pasó a ser el número uno con 26.7%.',
      fuente: 'AMAI, Ediciones XXIV a XXVIII (2021-2026)',
    },
    {
      dato: 'LOS CONTADORES DEL HERO YA NO ESTÁN EN CERO. La advertencia interna que decía que ese defecto destruía el argumento de rigor está resuelta: hoy renderizan +700 proyectos al año, +2.6M de minutos de entrevistas y +330 mil encuestas de satisfacción, desde el primer segundo y sin desplazar. Lo que sigue faltando es menor pero real: las tres cifras van sin fuente y sin año.',
      fuente: 'researchland.com, auditoría en vivo con prints y DOM, 25-ago-2026',
    },
    {
      dato: 'Los territorios del sitio NO son los que nombran el deck y las credenciales. Son seis —Brand Land, Product Land, Customer Land, Team Land, Arena y Data Express— y Business Land no existe; Mystery Shopping tampoco es un territorio, sino una técnica dentro de Campo y de Clima. Peor: los seis viven solo como imagen, con alt="01_brand_land_se", así que ni un buscador ni un modelo de IA sabe que Research Land tiene arquitectura de marca.',
      fuente: 'researchland.com/servicios, inspección de DOM, 25-ago-2026',
    },
    {
      dato: 'El blog lleva ocho semanas sin publicar —el último post es del 30 de junio de 2026— después de una cadencia semanal impecable. Mientras tanto el podcast "Noche de Jueves" sacó su episodio 81 el 21 de agosto, sin fallar un jueves. El problema es dónde se acumula cada uno: el podcast construye autoridad en YouTube y Spotify; el blog es el único canal que la acumula en terreno propio e indexable, que es justo la debilidad medida.',
      fuente: 'researchland.com/blog (RSS) y canal de YouTube @researchlandof, verificados el 25-ago-2026',
    },
    {
      dato: 'El propio sitio ya reclama la posición: dice ser la "3a empresa de investigación de mercados más importante e influyente" por AMAI y estar avalada por ESOMAR en su Global Top 50 de 2022. Coincide con el ranking AMAI 2025 verificado por fuera — pero esa credencial vive solo en el home y en la bio de Facebook, y NO aparece en "Quiénes somos", que es la página que abre un comprador para evaluarlos.',
      fuente: 'researchland.com, home y /quienes-somos, revisados el 25-ago-2026',
    },
    {
      dato: 'DOS DE LOS CINCO ANALIZADOS NO ESTÁN EN EL PADRÓN DE AMAI —Pulso Mercadológico y Bitácora Social—, mientras que sí lo están Berumen, Enkoll, Lexia, Nodo, BGC y Parametría, ninguno de los cuales entró al análisis. El set elegido no coincide con el gremio: conviene saberlo antes de presentarlo como el mapa de la categoría.',
      fuente: 'AMAI, padrón completo de 59 agencias asociadas, descargado y contrastado el 25-ago-2026',
    },
    {
      dato: 'NINGUNA biblioteca pública publica el gasto de un anuncio comercial: Meta solo lo hace con los de contenido social o electoral, Google no lo hace y LinkedIn tampoco. Por eso las cifras de inversión del deck no pueden salir de una fuente pública. Y para Ipsos México el gasto detectable es cero, así que "menos de $20K" y "menos de $10K" son ciertas las dos y ninguna dice nada.',
      fuente: 'Meta Ad Library, Google Ads Transparency Center y LinkedIn Ad Library, consultadas para los cinco competidores el 25-ago-2026',
    },
    {
      dato: 'CUATRO DE LOS CINCO COMPETIDORES TIENEN CERO PAUTA B2B EN MÉXICO, y el quinto la corre con el formato más barato de LinkedIn. Lo que Ipsos y Kantar sí compran aquí es reclutamiento de panel, pagado desde entidades de fuera del país. El share of voice pagado de esta categoría no tiene dueño: no hay contra quién pujar.',
      fuente: 'Meta Ad Library, Google Ads Transparency Center y LinkedIn Ad Library, 25-ago-2026',
    },
    {
      dato: 'Para dimensionar una entrada: en México una campaña B2B de venta compleja en Google Ads se mueve entre 50,000 y 150,000 pesos al mes, y el mínimo con el que se aprende algo ronda los 20,000 a 30,000. En LinkedIn, las Thought Leader Ads —anuncios pagados desde el perfil de una persona, que es lo que hace el CEO de De la Riva— promedian un costo por clic cercano a una tercera parte del de un anuncio normal.',
      fuente: 'UNO Collective y Axon Digital (rangos México, agosto 2026); ClickMinded y Digital Applied (benchmarks LinkedIn 2026)',
    },
    {
      dato: 'quantilope publica su precio: 2,000 dólares al mes desde el plan de entrada, unos 24,000 al año. Es el único precio abierto de toda la categoría de autoservicio —ni Kantar, ni Ipsos, ni Attest, ni Zappi, ni Toluna, ni Suzy publican tarifa— y es el ancla contra la que un director de insights comparará cualquier propuesta de retainer.',
      fuente: 'quantilope, página pública de pricing, verificada el 25-ago-2026',
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
  lectura: 'Research Land es la tercera agencia del país por facturación y la penúltima en autoridad digital. No es una retadora pequeña peleando contra gigantes: es una empresa grande que no se ve grande por fuera. Tiene la mejor infraestructura de captación de la categoría y la audiencia más viva; lo que le falta es autoridad y demanda que meterle. Y la categoría le deja tres puertas abiertas a la vez: nadie publica precio, nadie vende autoservicio de verdad y ningún local captura con su contenido. Ninguna exige un producto nuevo.',

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
