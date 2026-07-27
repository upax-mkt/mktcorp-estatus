import type { DecisionSlide } from '@/decision/esquema'

/**
 * El estatus de junio 2026 de Mexa Creativa, re-versionado en la app.
 *
 * QUÉ ES: la transcripción del deck real que Mkt Corp presentó
 * (`MC | Minuta Comité Mensual Junio Mkt Corp.pdf`, 15 páginas). Existe para
 * responder una pregunta concreta: ¿puede esta app dibujar un estatus de
 * verdad, entero, sin que falte una tabla, un gráfico ni una nota al pie?
 * Es el criterio de aceptación de la Fase 2, igual que NC_JUNIO_2026 lo fue
 * de la Fase 1.
 *
 * QUÉ NO ES: una fuente de datos. Las cifras están copiadas a mano del PDF
 * para probar el render. Antes de usar cualquiera de estos números fuera de
 * aquí, se validan contra su fuente viva (HubSpot, Search Console, el reporte
 * de paid). Ver la nota de LO QUE NO SE TRANSCRIBIÓ, más abajo.
 *
 * DÓNDE SE APARTA DEL PDF, y por qué:
 * - Los "Focos Q3" ocupaban DOS páginas (13 y 14) porque cinco bloques no
 *   caben en una diapositiva. Aquí son UNA sección con los cinco: el documento
 *   se lee con scroll, no tiene que partir un bloque para que quepa. Así la
 *   numeración corre del 1 al 5 de corrido, que es como se nombran en la
 *   sesión.
 * - "Cuentas en prospección. Target: 253 · ICP: 395" era una línea suelta al
 *   pie; aquí son dos cifras. Son datos, y un dato se lee mejor como cifra.
 *
 * LO QUE NO SE TRANSCRIBIÓ, y por qué:
 * - La serie de seis meses del gráfico de paid media (pág. 10). Varias de sus
 *   etiquetas no se leen con seguridad en el PDF y la regla es no inventar
 *   números: en su lugar va el mismo gráfico con los dos meses de la tabla,
 *   que sí son exactos. La app dibuja las seis series de seis periodos sin
 *   problema (ver Grafico.test.tsx); lo que falta es el dato, no el dibujo.
 * - Los valores del gráfico de canales (pág. 8) están LEÍDOS CONTRA SU EJE:
 *   el original no los rotula. Sirven para comprobar el render, no para citar.
 */
export const MC_JUNIO_2026: DecisionSlide[] = [
  // ---- pág. 1 ----
  {
    layout: 'portada',
    titulo: 'Estatus mensual',
    subtitulo: 'Junio 2026 · Mexa Creativa',
    razon: 'Apertura: mes y sala, sin más ruido.',
  },

  // ---- pág. 2 ----
  {
    layout: 'agenda',
    titulo: 'Agenda',
    cuerpo: [
      'Pendientes del mes pasado',
      'Portafolio & ecosistema',
      'Performance & conversión',
      'Outbound & pipeline',
    ],
    razon: 'Los cuatro bloques de la sesión. En la app el índice lleva a cada sección, no es una lista muerta.',
  },

  // ---- pág. 3 ----
  {
    layout: 'divisor-seccion',
    titulo: 'Acuerdos y pendientes',
    subtitulo: 'Sesión pasada',
    razon: 'Abre el primer bloque de la sesión.',
  },

  // ---- pág. 4 ----
  {
    layout: 'pendientes-semaforo',
    titulo: 'Pendientes',
    subtitulo: 'De la sesión del 12 de mayo',
    tablas: [{
      columnas: ['Responsable', 'Tarea', 'Estatus'],
      agruparPrimeraColumna: true,
      filas: [
        {
          celdas: [
            'Valentina Ochoa · Mexa',
            'El estudio "Soledad" ya nos lo pueden mandar esta semana y las "ideas" nos las pueden pasar la siguiente semana.',
            'Listo',
          ],
          estado: 'listo',
        },
        {
          celdas: [
            'Valentina Ochoa · Mexa',
            'Compartir a mkt corp los Notimexa, tendencias de "La Roja"',
            'Listo',
          ],
          estado: 'listo',
        },
        // Las filas siguientes NO llevan estado: en el PDF su celda de estatus
        // está en blanco. Poner uno sería inventarlo.
        {
          celdas: ['Jose Luis · Mexa', 'Incluir a Mkt (David Porchini) en reuniones de venta', ''],
        },
        {
          celdas: ['César Mejía · RevOps', 'Pedir a Fer Torres info de inversión de industrias para la Brújula', ''],
        },
        {
          celdas: [
            'Ileana Cruz · Outbound',
            'Comercial pide entender cómo está prospectando mkt para no llegar tan en frío con potenciales clientes. (José Luis menciona que ha pasado que hay leads que a la reunión con comercial ya están esperando una propuesta.)',
            '',
          ],
        },
        {
          celdas: [
            'Ileana Cruz · Outbound',
            'MC menciona que tenemos que revisar qué hicimos con El Portón y Chiq para ver por qué hicimos bien para cerrarlos y replicar con otros grandes.',
            '',
          ],
        },
        {
          celdas: [
            'Fernando Borges · Paid',
            'Identificar buenas prácticas de paid para replicar mejorar la calidad de lo que llega, que aunque es bueno necesitamos "pegarle" a 3-4 cuentas grandes.',
            '',
          ],
        },
      ],
    }],
    razon: 'La tabla con semáforo es la forma del pendiente: responsable, tarea y estatus de un vistazo, con el responsable agrupado para no repetirlo.',
  },

  // ---- pág. 5 ----
  {
    layout: 'divisor-seccion',
    titulo: 'Portafolio & ecosistema',
    razon: 'Cambio de bloque.',
  },

  // ---- pág. 6 ----
  {
    layout: 'texto-multicolumna',
    titulo: 'Herramientas comerciales',
    columnas: [
      {
        titulo: 'Contenidos entregados',
        etiqueta: '29-05-26',
        puntos: [
          { texto: 'Credenciales Ejecutivas (para envío 5 slides)' },
          { texto: 'Thought Leadership Deck: "¿Cómo cambió el consumidor mexicano?"' },
          { texto: '2 versiones de cada uno: short y long' },
          { texto: '1er contacto' },
          { texto: '2do contacto' },
          { texto: 'Invitación a presentación de credenciales' },
          { texto: 'One sheet de Mexa Creativa' },
          {
            texto: 'One sheets por servicio',
            hijos: [
              { texto: 'Social content' },
              { texto: 'Producción' },
              { texto: 'Performance' },
              { texto: 'Creatividad y branding' },
            ],
          },
          {
            texto: 'One sheets por industria',
            hijos: [
              { texto: 'Automotriz' },
              { texto: 'Belleza y cuidado personal' },
              { texto: 'Consumo masivo' },
              { texto: 'Retail' },
            ],
          },
        ],
      },
      {
        titulo: 'Contenidos aprobados para producción',
        etiqueta: '16-06-26',
        puntos: [
          { texto: 'One sheet de agencia' },
          { texto: 'Invitación presentación' },
          { texto: 'Credenciales ejecutivas (5 slides)' },
          { texto: 'Primer contacto short' },
          { texto: 'Segundo contacto short' },
        ],
      },
    ],
    razon: 'Dos frentes paralelos sin cifras: columnas, con la jerarquía real (servicio → sus piezas) en vez de una lista plana.',
  },

  // ---- pág. 7 ----
  {
    layout: 'divisor-seccion',
    titulo: 'Performance & conversión',
    razon: 'Cambio de bloque.',
  },

  // ---- pág. 8 ----
  {
    layout: 'grafico-y-tabla',
    titulo: 'Performance · Sitio web',
    tablas: [{
      columnas: ['', 'Mayo', 'Junio'],
      filas: [
        { celdas: ['Sesiones totales', '3,591', '2,519'] },
        { celdas: ['Páginas por sesión', '1.33', '1.29'] },
        { celdas: ['Posición media', '9.6', '9.8'] },
        { celdas: ['MQLs', '6', '4'] },
        { celdas: ['SQLs', '1', '1'] },
      ],
    }],
    graficos: [
      {
        tipo: 'combo-barras-lineas',
        titulo: 'Tráfico website',
        periodos: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'],
        series: [
          { etiqueta: 'Total 2026', valores: [4393, 7244, 4997, 2924, 3591, 2519], forma: 'barra' },
          // En su propio eje, como en el original: contra una escala que llega
          // a 7,244 el orgánico se dibuja como una línea plana pegada al suelo
          // y deja de decir nada.
          { etiqueta: 'Orgánico 2026', valores: [1067, 1292, 1297, 1047, 1170, 1000], forma: 'linea', eje: 'derecho' },
        ],
      },
      {
        tipo: 'barras-horizontales-agrupadas',
        titulo: 'Sesiones por canal',
        periodos: ['Organic Search', 'Paid Search', 'Direct', 'Email', 'Organic Social'],
        series: [
          { etiqueta: 'El mes pasado', valores: [1350, 750, 500, 180, 130] },
          { etiqueta: 'Periodo comparado', valores: [1600, 830, 700, 800, 260] },
        ],
      },
    ],
    columnas: [{
      titulo: 'Insights',
      puntos: [
        { texto: 'Pipeline generado 2026 con fuente website: $1.1M' },
        {
          texto: 'MQLs',
          hijos: [
            { texto: 'CreatorPlace — descalificado: ofreció servicios de "influencer marketing"' },
            { texto: 'LizBetSoft — pendiente de calificar' },
            { texto: 'robot — dejó datos, pero falsos' },
            { texto: 'Carpentier BET — descalificado: teléfono equivocado' },
          ],
        },
        { texto: 'SQL: Mutuus — reunión de acercamiento, 12 de junio' },
        {
          texto: 'Las páginas más visitadas fueron',
          hijos: [
            { texto: 'Home (30%)' },
            { texto: 'LP Paid media "Desarrollo de campaña" (19%)' },
            { texto: 'Guía "Verano sin clichés" (5%)' },
            { texto: 'Blog "Tendencias redes sociales 2026" (4%)' },
            { texto: 'Blog "Libros cultura mexicana" (3%)' },
          ],
        },
      ],
    }],
    notaPie: 'Los valores del gráfico de canales están leídos contra su eje: el reporte original no los rotula.',
    razon: 'El dato exacto y la tendencia importan por igual: la tabla da el número mes contra mes y los gráficos dan la forma del año y el reparto por canal.',
  },

  // ---- pág. 9 ----
  {
    layout: 'kpis-fila-dos-columnas',
    titulo: 'La caída se concentra en el contenido educativo, no en todo el sitio',
    subtitulo: 'Performance · Sitio web',
    kpis: [
      { valor: '9.8', delta: '-0.2', rotulo: 'Posición media' },
      { valor: '79.8k', delta: '-10%', rotulo: 'Impresiones' },
      { valor: '763', delta: '-12%', rotulo: 'Clics' },
      { valor: '1.1%', delta: 'estable', rotulo: 'CTR' },
    ],
    columnas: [
      {
        titulo: 'Principales hallazgos',
        puntos: [
          { texto: 'La caída se concentra en contenido educativo tipo "qué es / importancia de" (identidad de marca, comunicaciones integradas, marketing omnicanal), afectado por AI Overviews de Google.' },
          { texto: 'El artículo "Identidad de marca: qué es y su importancia" es el que más cayó: de la posición 25.5 a la 36.' },
          { texto: 'Home, "Consultoría de marca" e "Isotipo/Imagotipo/Isologo" mejoraron y amortiguaron la caída.' },
          { texto: 'Móvil se deteriora (7.6 → 8.0) mientras Desktop se mantiene estable: ahí está concentrada la pérdida.' },
        ],
      },
      {
        titulo: 'Acciones prioritarias',
        puntos: [
          { texto: 'Actualizar el artículo de "Identidad de marca" con información y ejemplos de 2026, y reforzar enlaces internos desde las páginas que sí funcionan.' },
          { texto: 'Replicar en blog lo que funcionó en las páginas ganadoras: actualizar contenido, añadir FAQs, reforzar E-E-A-T y sumar ejemplos de marcas mexicanas.' },
          { texto: 'Capitalizar presta-prenda y consultoría-marca, que funcionan muy bien, con contenido similar (casos de éxito, páginas de servicio).' },
          { texto: 'Auditar Core Web Vitals y usabilidad móvil. Ya está tomado y se están resolviendo estos problemas.' },
        ],
      },
    ],
    notaPie: 'E-E-A-T son las siglas de Experience, Expertise, Authoritativeness y Trustworthiness (experiencia, especialización, autoridad y confiabilidad).',
    razon: 'Las cuatro cifras van como KPIs y el análisis a dos columnas: el título dice la lectura —no es un deterioro general— y las columnas la sostienen.',
  },

  // ---- pág. 10 ----
  {
    layout: 'grafico-y-tabla',
    titulo: 'Performance · Paid media',
    graficos: [{
      tipo: 'lineas-multiples',
      titulo: 'Inversión y clics, mayo contra junio',
      periodos: ['Mayo', 'Junio'],
      series: [
        { etiqueta: 'Inversión', valores: [28235.46, 29472.73], prefijo: '$' },
        { etiqueta: 'Clics', valores: [635, 571], eje: 'derecho' },
      ],
      mostrarValores: true,
    }],
    tablas: [
      {
        columnas: ['', 'Mayo', 'Junio'],
        filas: [
          { celdas: ['Inversión', '$28,235.46', '$29,472.73'] },
          { celdas: ['Impresiones', '8,859', '7,348'] },
          { celdas: ['Clics', '635', '571'] },
          { celdas: ['MQLs', '6', '3'] },
          { celdas: ['SQLs', '1', '0'] },
        ],
      },
      {
        titulo: 'Estado de MQLs',
        columnas: ['Estado', 'Total', '%'],
        filas: [
          { celdas: ['Descalificado', '8', '32%'] },
          { celdas: ['Sin calificar', '1', '4%'] },
          { celdas: ['Pendiente calificar', '13', '52%'] },
          { celdas: ['Calificado', '3', '12%'] },
          { celdas: ['Total', '25', '100%'], destacada: true },
        ],
      },
    ],
    columnas: [{
      titulo: 'Venta',
      puntos: [
        { texto: 'Facturado, ganado por facturar y cierre: $6,785,920' },
        { texto: 'Momcozy, que estuvo en cierre por $5,000,000, se detuvo.' },
        { texto: 'El proyecto está pospuesto: hoy solo tienen una pop store en México y están viendo si funciona. En cuanto lo tengan más avanzado nos vuelven a contactar.' },
      ],
    }],
    notaPie: 'La serie de seis meses del reporte original no se transcribió: varias de sus etiquetas no se leen con seguridad en el PDF y no se inventan cifras.',
    razon: 'Dos tablas y un gráfico: la inversión sube mientras los clics bajan, y el estado de MQLs explica por qué eso todavía no se convierte.',
  },

  // ---- pág. 11 ----
  {
    layout: 'divisor-seccion',
    titulo: 'Outbound & pipeline',
    razon: 'Cambio de bloque.',
  },

  // ---- pág. 12 ----
  {
    layout: 'meta-real-porcentaje',
    titulo: 'Outbound & pipeline',
    subtitulo: 'Junio 2026',
    metaReal: {
      titulo: 'SQLs',
      filas: [
        { rotulo: 'Total', meta: '7', real: '1', porcentaje: '14%' },
        { rotulo: 'Mkt', meta: '4', real: '1', porcentaje: '25%' },
        { rotulo: 'Ventas', meta: '3', real: '0', porcentaje: '0%' },
      ],
    },
    cifrasDesglosadas: [
      { rotulo: 'Pipeline ideal', valor: '$15.6 MDP' },
      {
        rotulo: 'Pipeline generado YTD',
        valor: '$39.4 MDP',
        destacada: true,
        partes: [{ rotulo: 'Mkt', valor: '$36.1 MDP' }, { rotulo: 'Comercial', valor: '$3.4 MDP' }],
      },
      {
        rotulo: 'Negocios perdidos YTD',
        valor: '$37.2 MDP',
        partes: [{ rotulo: 'Mkt', valor: '$34.08 MDP' }, { rotulo: 'Comercial', valor: '$3.1 MDP' }],
      },
      {
        rotulo: 'Negocios ganados por facturar YTD',
        valor: '$8.3 MDP',
        partes: [{ rotulo: 'Mkt', valor: '$3.01 MDP' }, { rotulo: 'Comercial', valor: '$5.3 MDP' }],
      },
      {
        rotulo: 'Negocios ganados facturados YTD',
        valor: '$3.8 MDP',
        partes: [{ rotulo: 'Mkt', valor: '$3.8 MDP' }, { rotulo: 'Comercial', valor: '$0' }],
      },
      {
        rotulo: 'Negocios vivos',
        valor: '$5.5 MDP',
        partes: [{ rotulo: 'Mkt', valor: '$191 K' }, { rotulo: 'Comercial', valor: '$290 K' }],
      },
    ],
    columnas: [
      {
        titulo: 'Cuentas en warm',
        puntos: [
          { texto: 'Viva Aerobus' },
          { texto: 'Xiaomi' },
          { texto: 'Johnny Walker' },
          { texto: 'Grupo IUSA' },
          { texto: 'Barcel' },
          { texto: 'Chanel' },
          { texto: 'Hershey Company' },
          { texto: 'Chirey' },
        ],
      },
      {
        // En el original era una línea pequeña bajo las cuentas, no un
        // titular. Aquí va como columna y no como KPI por lo mismo: dos
        // tarjetas gigantes al principio de la sección dirían que el universo
        // de prospección es la noticia del mes, y no lo es.
        titulo: 'Cuentas en prospección',
        puntos: [{ texto: 'Target: 253' }, { texto: 'ICP: 395' }],
      },
    ],
    notaPie: 'Datos extraídos de HubSpot.',
    razon: 'El cumplimiento arriba y el pipeline abierto por Mkt y Comercial debajo: la pregunta del director no es cuánto pipeline hay, es de quién.',
  },

  // ---- págs. 13 y 14, en una sola sección ----
  {
    layout: 'tarjetas-numeradas',
    titulo: 'Focos Q3',
    subtitulo: 'Outbound & pipeline',
    bloques: [
      {
        titulo: 'Comercio al por menor',
        etiqueta: 'Prioridad alta',
        parrafo: 'Es una de las mejores industrias para Mexa porque combina dos ventanas verdes en Q3. Con ciclo de 1 a 1.5 meses, lo que abramos hoy puede llegar a cierre en agosto o estar listo para septiembre.',
        puntos: [
          { texto: 'Campañas de marca' },
          { texto: 'Estrategia creativa' },
          { texto: 'Posicionamiento' },
          { texto: 'Campañas de temporada' },
          { texto: 'Lanzamientos' },
          { texto: 'Conceptualización de campañas 360' },
        ],
        pie: {
          rotulo: 'Oferta gancho',
          texto: 'Ayudamos a marcas de retail a convertir temporada, promociones o lanzamientos en campañas con narrativa clara, presencia consistente y mejor recordación en el mercado mexicano.',
        },
      },
      {
        titulo: 'Comercio al por mayor',
        etiqueta: 'Prioridad alta',
        parrafo: 'También tiene doble verde en Q3 y puede tener mucha necesidad de marca, campañas comerciales y comunicación para canales.',
        puntos: [
          { texto: 'Campañas de marca' },
          { texto: 'Estrategia de comunicación B2B/B2B2C' },
          { texto: 'Materiales para canal' },
          { texto: 'Campañas para distribuidores' },
          { texto: 'Branding comercial' },
          { texto: 'Comunicación para empujar sell-out' },
        ],
        pie: {
          rotulo: 'Oferta gancho',
          texto: 'Fortalecemos la presencia de marca frente a canales, distribuidores y clientes finales para apoyar objetivos comerciales y acelerar demanda.',
        },
      },
      {
        titulo: 'Industrias manufactureras',
        etiqueta: 'Prioridad alta para agosto',
        parrafo: 'Agosto está en verde, entonces julio es justo el mes para abrir conversación. Para Mexa, esta industria puede ser potente si la abordamos desde marca, producto, lanzamiento, comunicación institucional o campañas comerciales.',
        puntos: [
          { texto: 'Campañas de producto' },
          { texto: 'Branding o reposicionamiento' },
          { texto: 'Lanzamientos' },
          { texto: 'Comunicación de innovación' },
          { texto: 'Estrategia para entrada a nuevos mercados' },
          { texto: 'Campañas B2B / trade' },
        ],
        pie: {
          rotulo: 'Oferta gancho',
          texto: 'Ayudamos a transformar productos, capacidades industriales o propuestas técnicas en campañas claras, relevantes y comercialmente accionables.',
        },
      },
      {
        titulo: 'Servicios profesionales',
        etiqueta: 'Prioridad alta para agosto',
        parrafo: 'Agosto está en verde y además, en la brújula, aparece directamente relacionado con Consultoría de marca.',
        puntos: [
          { texto: 'Consultoría de marca' },
          { texto: 'Estrategia de posicionamiento' },
          { texto: 'Narrativa comercial' },
          { texto: 'Rebranding' },
          { texto: 'Arquitectura de marca' },
          { texto: 'Campañas de autoridad / thought leadership' },
          { texto: 'Comunicación para servicios complejos' },
        ],
        pie: {
          rotulo: 'Oferta gancho',
          texto: 'Convertimos servicios complejos en una propuesta de marca clara, diferenciada y fácil de entender para el mercado mexicano.',
        },
      },
      {
        titulo: 'Servicios de alojamiento temporal y preparación de alimentos y bebidas',
        etiqueta: 'Prioridad media · táctica',
        parrafo: 'Julio está en verde, pero el ciclo de Mexa es de 1 a 1.5 meses. Solo foco si son oportunidades rápidas, cuentas calientes o campañas muy tácticas.',
        puntos: [
          { texto: 'Campañas de marca' },
          { texto: 'Campañas promocionales' },
          { texto: 'Lanzamientos de temporada' },
          { texto: 'Comunicación para restaurantes, hoteles, grupos gastronómicos o turismo' },
          { texto: 'Campañas para tráfico, awareness o experiencia' },
        ],
        pie: {
          rotulo: 'Oferta gancho',
          texto: 'Diseñamos campañas que conectan y son ágiles para aumentar visibilidad, tráfico y recordación en momentos clave de consumo.',
        },
      },
    ],
    matriz: {
      columnas: ['Julio', 'Agosto', 'Septiembre'],
      filas: [
        {
          encabezado: 'Comercio al por menor',
          celdas: [
            { texto: 'Vende', tono: 'alto' },
            { texto: 'Prepara', tono: 'medio' },
            { texto: 'Vende', tono: 'alto' },
          ],
          nota: 'Mexa · Campañas de marca. Ciclo estimado de prospección a cierre.',
        },
        {
          encabezado: 'Industrias manufactureras',
          celdas: [
            { texto: 'Espera', tono: 'neutro' },
            { texto: 'Vende', tono: 'alto' },
            { texto: 'Prepara', tono: 'medio' },
          ],
        },
        {
          encabezado: 'Comercio al por mayor',
          celdas: [
            { texto: 'Vende', tono: 'alto' },
            { texto: 'Prepara', tono: 'medio' },
            { texto: 'Vende', tono: 'alto' },
          ],
        },
        {
          encabezado: 'Servicios profesionales, científicos y técnicos',
          celdas: [
            { texto: 'Espera', tono: 'neutro' },
            { texto: 'Vende', tono: 'alto' },
            { texto: 'Explora', tono: 'bajo' },
          ],
          nota: 'Mexa · Consultoría de marca. Ciclo estimado de prospección a cierre.',
        },
        {
          encabezado: 'Servicios de alojamiento temporal y preparación de alimentos y bebidas',
          celdas: [
            { texto: 'Vende', tono: 'alto' },
            { texto: 'Prepara', tono: 'medio' },
            { texto: 'Espera', tono: 'neutro' },
          ],
        },
      ],
      leyenda: [
        'Explora: sector despertando, primeros contactos.',
        'Prepara: actividad subiendo, califica y agenda propuestas.',
        'Vende: pico de actividad, máxima disposición de compra.',
        'Espera: actividad baja, monitorear y no priorizar.',
        'El ciclo Explora → Prepara → Vende → Espera se repite cada temporada según el comportamiento económico del sector.',
      ],
    },
    notaPie: 'Calendario de prospección jul-dic 2026. Fuentes: HubSpot 2024, 6Sense 2025 y datos UX/MU.',
    razon: 'Los cinco focos en bloques de igual peso y, debajo, el calendario que dice en qué mes toca cada industria: la decisión que sale de aquí es a quién llamar en julio.',
  },

  // ---- pág. 15 ----
  {
    layout: 'cierre',
    titulo: 'Gracias',
    subtitulo: 'Grupo UPAX · Marketing Corporativo',
    razon: 'Cierre institucional de la sesión.',
  },
]
