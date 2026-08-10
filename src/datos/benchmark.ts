import type { Benchmark } from '@/dominio/benchmark'

/**
 * EL BENCHMARK COMPETITIVO DE CADA SALA.
 *
 * Este es el ÚNICO sitio de la app donde hay datos escritos en el código, y
 * es una excepción decidida por Franco: el benchmark no lo produce esta
 * herramienta —sale de una investigación de mercado que se hace fuera— así
 * que no tiene sentido montarle un editor para teclearlo una vez al año.
 *
 * Todo lo demás de la app (reuniones, acuerdos, minutas, archivos) se crea
 * dentro de ella y vive en la base de datos. Esto no.
 *
 * ---------------------------------------------------------------------------
 * REGLA QUE NO SE ROMPE: aquí no se escribe nada que no esté en el análisis.
 *
 * Rellenar una casilla a ojo produce un análisis de la competencia INVENTADO
 * que la app le enseña al director de la UDN como si fuera trabajo hecho — y
 * esa es la única forma de que esta pantalla haga daño. Una sala sin entrada
 * aquí muestra su espacio vacío, que es la verdad.
 *
 * ---------------------------------------------------------------------------
 * CÓMO SE RELLENA. Una entrada por sala, con la clave = slug de la sala
 * (research-land, promo-espacio, marketing-united, mexa-creativa,
 * house-of-films, uix, neracode, zeus, ceci, grupo-upax).
 *
 * `competidores` son SIEMPRE cinco, y el array de cada dimensión lleva sus
 * cinco niveles en el mismo orden. El tipo lo obliga: una fila con cuatro no
 * compila, que es mejor que una matriz desalineada en la que la columna de un
 * competidor muestra el nivel de otro.
 */

/**
 * PROMO ESPACIO — Benchmark junio 2026.
 *
 * Fuente: la presentación "Benchmark junio 2026" que pasó Franco (75 láminas,
 * cinco bloques: Portafolio & ecosistema · Aspectos comerciales · Sitios web ·
 * Paid media · Inbound & RRSS). Todo lo de abajo sale de ahí.
 *
 * DE DÓNDE SALE CADA NIVEL, que es lo que hace auditable esta tabla:
 *
 * - La fila de PROMO ESPACIO sale del "Radar de capacidades" (lámina 67), que
 *   clasifica literalmente en GANAS / EMPATAS-LIDERAS / TE SUPERAN.
 * - Los niveles POR COMPETIDOR son una lectura de sus fichas individuales
 *   —"Lo que hacen bien / Debilidad / Amenaza para Promo Espacio"—, de la
 *   matriz de amenaza (lámina 72) y, en la dimensión digital, de las cifras
 *   duras de SEO de las láminas 32-43. El propio deck avisa de que su radar
 *   compara contra un "promedio competencia" que "aplana diferencias reales
 *   entre las 5 marcas"; abrir ese promedio competidor por competidor es
 *   justamente lo que esta matriz aporta.
 * - `nota` de cada fila cita la evidencia concreta. Si una nota no se puede
 *   sostener con el deck, la fila no debería estar.
 *
 * OJO CON DOS COSAS AL PRESENTARLO:
 * - El deck marca la exclusividad de Comscore con un "*Por validar". Aquí se
 *   dice "certificada por un tercero" sin adjetivos absolutos, y la ficha de
 *   PE acota el alcance real: la certificación es **en canales propios**.
 * - Este benchmark sigue a cinco competidores de OOH/DOOH. Las cuentas de PE
 *   registran además a RENTABLE, CLEAR CHANNEL, GRUPO VALLAS y GRUPO EXPANSIÓN
 *   como competencia recurrente en sus oportunidades: no están analizados aquí.
 */
const PROMO_ESPACIO: Benchmark = {
  salaSlug: 'promo-espacio',
  competidores: [
    {
      nombre: 'ISA Corporativo',
      fortaleza: 'Transporte concesionado y audiencia cautiva: los tres metros del país y 45 aeropuertos.',
      amenaza: 'alta',
      dondeSeLeGana: 'Precisión, retail media y segmentación al punto de venta. Ellos mismos reconocen en la reunión que no prometen ROI.',
    },
    {
      nombre: 'JCDecaux MX',
      fortaleza: 'Marca global, respaldo corporativo y percepción premium. Reduce el riesgo percibido del anunciante grande.',
      amenaza: 'alta',
      dondeSeLeGana: 'Agilidad, cercanía al resultado y flexibilidad. Contra ellos no conviene pelear por tamaño.',
    },
    {
      nombre: 'Grupo IMU',
      fortaleza: 'Mobiliario urbano y cobertura masiva: 17 ciudades y más de 15,000 espacios.',
      amenaza: 'alta',
      dondeSeLeGana: 'Digital, conexión con el punto de venta y data. Si PE empaqueta con medición, se ve moderno frente a ellos.',
    },
    {
      nombre: 'Global Vía Pública',
      fortaleza: 'Mix amplio de formatos y alcance regional LatAm, con flexibilidad de planeación.',
      amenaza: 'media',
      dondeSeLeGana: 'Especialización en entornos de consumo. No tienen un activo icónico ni dominante.',
    },
    {
      nombre: 'IMJ Media',
      fortaleza: 'Flexibilidad táctica, creatividad aplicada e indoor. Es el más parecido a PE en el pitch.',
      amenaza: 'baja',
      dondeSeLeGana: 'Inventario en el momento de decisión y escala. Su reconocimiento nacional es menor.',
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
      dimension: 'Madurez digital comercial (web, SEO, CRM)',
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
      dimension: 'Presencia institucional y thought leadership',
      udn: 'rezagado',
      competidores: ['lider', 'lider', 'a_la_par', 'a_la_par', 'rezagado'],
      nota: 'ISA y JCDecaux van muy por delante en certificaciones, asociaciones y eventos (WOO Congress, IAB). Genera percepción de liderazgo aunque no tengan mejores activos.',
    },
  ],
  lectura:
    'Promo Espacio tiene el activo que ninguno de los cinco competidores puede replicar —un ecosistema de pantallas en el momento de compra, con medición certificada por un tercero— y lo tiene subcomunicado. La categoría entera es débil justo donde PE es fuerte: nadie usa landing pages dedicadas, todos dependen del tráfico de su propia marca y solo ISA y JCDecaux respondieron a una prospección. La brecha no está en el inventario: está en la percepción. ISA y JCDecaux invierten mucho más en presencia institucional y eso los hace parecer líderes aunque no tengan mejores activos. El plan del año se ordena solo: apropiarse de la narrativa del momento de compra, ocupar el espacio institucional que hoy está vacío para PE, y tomar primero el terreno digital antes de que la categoría madure. La ventana existe, y es temporal.',
  tesis: {
    titular: 'No competimos por inventario. Competimos por el momento.',
    ellosVenden: 'Ubicación: mobiliario urbano, parabuses, transporte, aeropuertos, calles, gran formato, vallas y espectaculares. Compiten por escala.',
    nosotrosVendemos: 'El momento de compra: contexto + intención + audiencia + momento. Pantallas donde ocurre la decisión — banca, retail, universidad, aeropuerto.',
    sustento: 'Tres fuerzas que solo este ecosistema combina: contexto (el punto exacto de decisión), atención (la audiencia permanece frente a la pantalla en la fila del banco o la caja del súper, no un vistazo de dos segundos) y repetición (el mismo consumidor vuelve a la misma sucursal cada semana). La medición certificada por un tercero es la evidencia de que ocurre.',
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
      porque: 'No por inventario. Es un diferenciador inmediato frente a un mercado que solo vende caras.',
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
