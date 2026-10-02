/**
 * Fuente oficial: «CMO - Estatus MKT Corp Q3 2026», Google Slides del equipo,
 * corte 30-sep-2026. Las tablas conservan sus cifras y sus ausencias.
 *
 * REVISIÓN DEL EQUIPO, 2-oct-2026: César Mejía leyó de Orbit (vista MBR,
 * «generado por Marketing», trimestre pasado) las cifras de demanda, pipeline y
 * paid. Los desgloses que la sesión no dictó completos salen de la misma fuente
 * de Orbit (hoja «Concentrado_V3» de RevOps, lectura del 2-oct-2026).
 * Los totales derivados se calculan; un KPI reportado conserva la definición
 * de su fuente. Los distintos cortes comerciales no se suman entre sí.
 */

export const CORTE = '30 de septiembre de 2026'

export type Udn =
  | 'Research Land'
  | 'Promo Espacio'
  | 'Marketing United'
  | 'Mexa Creativa'
  | 'House of Films'
  | 'UiX'
  | 'NeraCode'

/** Abreviatura que usa el equipo en tablas y matrices. */
export const CORTO: Record<Udn, string> = {
  'Research Land': 'RL',
  'Promo Espacio': 'PE',
  'Marketing United': 'MU',
  'Mexa Creativa': 'MC',
  'House of Films': 'HoF',
  UiX: 'UiX',
  NeraCode: 'NC',
}

/* ───────────────────────── 1 · EVENTOS (David) ───────────────────────── */

export interface Material {
  src: string
  alt: string
  /** Proporción del archivo, para reservar su caja antes de que cargue. */
  ancho: number
  alto: number
}

export interface Evento {
  id: 'kaitai' | 'miracle' | 'soledad'
  nombre: string
  /** Las dos empresas que presentan cada Ignite. */
  presentan: [Udn, Udn]
  fecha: string
  hora: string
  sede: string
  direccion: string
  resumen: string
  keyVisual?: Material
  fotos: Material[]
  /** Testigos materiales (Iris y David): invitaciones, correos, landing. */
  materiales: Material[]
}

const m = (src: string, alt: string, ancho: number, alto: number): Material => ({ src: `/estatus-q3/${src}`, alt, ancho, alto })

export const EVENTOS: Evento[] = [
  {
    id: 'kaitai',
    nombre: 'Kaitai',
    presentan: ['UiX', 'NeraCode'],
    fecha: 'Jueves 8 de octubre',
    hora: '7:15 pm',
    sede: 'Onomura',
    direccion: 'Col. Roma, CDMX',
    // El borrador decía «con 20 tomadores de decisión» en la misma lámina que
    // «64 confirmados»; la cifra va sola, en la lámina de confirmados.
    resumen:
      'Experiencia gastronómica con ronqueo de atún guiado por un chef japonés y degustación de sake mexicano, para tomadores de decisión de la industria de la tecnología y la experiencia de usuario.',
    keyVisual: m('kv-kaitai.webp', 'Kaitai: «El desarrollo ha muerto. Viva el desarrollo»', 1600, 900),
    fotos: [
      m('venue-kaitai-4.webp', 'Barra de Onomura', 1280, 720),
      m('venue-kaitai-5.webp', 'Salón de Onomura', 1280, 720),
      m('venue-kaitai-3.webp', 'Barra de cocina de Onomura', 720, 1280),
    ],
    // Orden pedido por el equipo (2-oct): invitación física, correo de invitación,
    // landing y correo de confirmación. El correo de invitación es el que subió Iris
    // ese día; el anterior era el recordatorio de «nos reuniremos en una semana».
    materiales: [
      m('inv-kaitai.webp', 'Invitación de Kaitai (física)', 900, 1285),
      m('correo-kaitai-invitacion.webp', 'Correo de invitación de Kaitai', 597, 1307),
      m('landing-kaitai-registro.webp', 'Landing de registro de Kaitai', 1400, 1088),
      m('landing-kaitai-confirmacion.webp', 'Landing de confirmación de Kaitai', 900, 1377),
      m('mail-kaitai-confirmacion.webp', 'Correo de confirmación de Kaitai', 640, 1503),
    ],
  },
  {
    id: 'miracle',
    nombre: 'Miracle Signal',
    presentan: ['House of Films', 'Promo Espacio'],
    fecha: 'Jueves 5 de noviembre',
    hora: '7:15 pm',
    sede: 'The Midnight Monkey',
    direccion: 'Plaza Río de Janeiro 54, col. Roma, CDMX',
    resumen:
      'Experiencia gastronómica con miracle berry: los mismos sabores, antes y después de transformar su percepción. La dinámica representa a House of Films y Promo Espacio: convertir una gran idea en producción audiovisual y hacerla vivir en el momento, el lugar y el formato adecuados para generar impacto.',
    keyVisual: m('kv-miracle.webp', 'Key visual promocional de Miracle Signal', 1600, 900),
    fotos: [
      m('venue-miracle-1.webp', 'The Midnight Monkey', 1280, 960),
      m('venue-miracle-barra.webp', 'Barra de The Midnight Monkey', 478, 850),
      m('venue-miracle-3.webp', 'Salón de The Midnight Monkey', 1280, 960),
    ],
    materiales: [
      m('mail-miracle-invitacion.webp', 'Correo de invitación de Miracle Signal', 640, 1606),
      m('landing-miracle-registro.webp', 'Landing de registro de Miracle Signal', 1600, 832),
      m('landing-miracle-confirmacion.webp', 'Landing de confirmación de Miracle Signal', 1600, 835),
      m('mail-miracle-confirmacion.webp', 'Correo de confirmación de Miracle Signal', 640, 1475),
    ],
  },
  {
    id: 'soledad',
    nombre: 'Soledad',
    presentan: ['Mexa Creativa', 'Research Land'],
    fecha: 'Jueves 19 de noviembre',
    hora: '7:15 pm',
    sede: 'Casa Nahua',
    direccion: 'Barcelona 27, col. Juárez, CDMX',
    resumen:
      'Experiencia gastronómica gourmet e inmersiva para vivir la presentación del estudio «La Soledad», con 20 tomadores de decisión de empresas e industrias clave para servicios de creatividad, publicidad e investigación de mercados.',
    fotos: [
      m('venue-soledad-1.webp', 'Casa Nahua', 464, 832),
      m('venue-soledad-2.webp', 'Patio de Casa Nahua', 464, 832),
      m('venue-soledad-3.webp', 'Escalera de Casa Nahua', 464, 832),
    ],
    materiales: [
      m('mail-soledad-invitacion.webp', 'Correo de invitación de Soledad', 640, 1580),
      m('landing-soledad-registro.webp', 'Landing de registro de Soledad', 1600, 760),
      m('landing-soledad-confirmacion.webp', 'Landing de confirmación de Soledad', 1600, 835),
      m('mail-soledad-confirmacion.webp', 'Correo de confirmación de Soledad', 640, 1452),
    ],
  },
]

/* ── Kaitai: quiénes ya dijeron sí (el treemap que diseñó el equipo) ── */

export interface Confirmada {
  empresa: string
  logo: string
  /** Un cargo por persona confirmada. */
  cargos: string[]
}

export interface Sector {
  nombre: string
  color: 'azul' | 'verde' | 'naranja' | 'violeta'
  empresas: Confirmada[]
}

const l = (archivo: string) => `/estatus-q3/logos/kaitai/${archivo}`

export const KAITAI_SECTORES: Sector[] = [
  {
    nombre: 'Banca y finanzas',
    color: 'azul',
    empresas: [
      { empresa: 'Banorte', logo: l('banorte.png'), cargos: ['Deputy Director of Innovation and Digital Design', 'Gerente Experiencia del Cliente'] },
      { empresa: 'Santander', logo: l('santander.png'), cargos: ['Seamless Experience Design Director', 'Deputy Director of Digital Onboarding & Payment Products'] },
      { empresa: 'Afirme', logo: l('afirme.png'), cargos: ['Deputy Director of Treasury and Risk Systems'] },
      { empresa: 'American Express GBT', logo: l('amex.png'), cargos: ['Senior Manager Global Dynamic Servicing Platform'] },
      { empresa: 'BanCoppel', logo: l('bancoppel.svg'), cargos: ['Deputy Director of IT and Telecommunications Security'] },
      { empresa: 'CIBanco', logo: l('cibanco.svg'), cargos: ['CEO'] },
      { empresa: 'Konfío', logo: l('konfio.png'), cargos: ['Head of Product / Colocación'] },
      { empresa: 'Banca Mifel', logo: l('mifel.svg'), cargos: ['Director de Producto y Alianzas'] },
      { empresa: 'Citi / Banamex', logo: l('citi.png'), cargos: ['VP Senior Project Manager · HR, Tech and Processes'] },
      { empresa: 'Monex', logo: l('monex.png'), cargos: ['CX Manager'] },
    ],
  },
  {
    nombre: 'Salud',
    color: 'verde',
    empresas: [
      { empresa: 'Farmacias del Ahorro', logo: l('farmacias-del-ahorro.svg'), cargos: ['Commercial Digital Director'] },
      { empresa: 'AstraZeneca', logo: l('astrazeneca.png'), cargos: ['Director of Digital, Innovation & IT'] },
      { empresa: 'Bayer', logo: l('bayer.svg'), cargos: ['Talent Lead Product Supply MX & Labor Relations Head'] },
      { empresa: 'Novartis', logo: l('novartis.png'), cargos: ['Director DDIT US&I Product Manager Medical Engagement'] },
      { empresa: 'Thermo Fisher Scientific', logo: l('thermo-fisher-scientific.png'), cargos: ['Head of Service LATAM · Digital Science & Automation Solutions'] },
      { empresa: 'Vantive', logo: l('vantive.png'), cargos: ['Sr. Marketing & Digital Manager · Latin America North'] },
      { empresa: 'Daiichi Sankyo', logo: l('daiichi-sankyo.png'), cargos: ['CIO'] },
    ],
  },
  {
    nombre: 'Consumo y retail',
    color: 'naranja',
    empresas: [
      { empresa: 'José Cuervo', logo: l('jose-cuervo.svg'), cargos: ['Head of Digital Media'] },
      { empresa: 'Mondelēz', logo: l('mondelez.png'), cargos: ['Global IT Strategic Partner Management Director'] },
      { empresa: 'Grupo Lala', logo: l('lala.png'), cargos: ['Innovation Group Manager'] },
      { empresa: 'PepsiCo', logo: l('pepsico.svg'), cargos: ['AI & Innovation Manager'] },
      { empresa: 'Mabe', logo: l('mabe.png'), cargos: ['Jefe de TI / Customer Experience Digital'] },
      { empresa: 'Walmart México', logo: l('walmart.png'), cargos: ['Head of UX Design'] },
    ],
  },
  {
    nombre: 'Automotriz',
    color: 'violeta',
    empresas: [
      { empresa: 'Chirey', logo: l('chirey.png'), cargos: ['Head of Product · R&D', 'Head of CRM and CX'] },
      { empresa: 'Mazda', logo: l('mazda.png'), cargos: ['Gerente Nacional'] },
    ],
  },
]

/** Confirmados de otras empresas, fuera de las marcas destacadas (David, lámina de confirmados). */
export const KAITAI_OTRAS_EMPRESAS = 37

export const personasDe = (s: Sector) => s.empresas.reduce((n, e) => n + e.cargos.length, 0)
export const marcasDestacadas = () => KAITAI_SECTORES.reduce((n, s) => n + s.empresas.length, 0)
export const ejecutivosConfirmados = () =>
  KAITAI_SECTORES.reduce((n, s) => n + personasDe(s), 0) + KAITAI_OTRAS_EMPRESAS

/* ───────────────────────── 2 · FUNNEL GDD (César Mejía) ───────────────────────── */

export const ETAPAS = ['Contactos', 'MQL', 'SQL', 'Propuestas', 'Ganados'] as const
export type Etapa = (typeof ETAPAS)[number]

/** La tabla de César, por UDN. Las sumas se calculan (ver `totalEtapa`). */
export const FUNNEL: Record<Udn, Record<Etapa, number>> = {
  'House of Films': { Contactos: 100, MQL: 51, SQL: 1, Propuestas: 1, Ganados: 1 },
  'Marketing United': { Contactos: 624, MQL: 62, SQL: 11, Propuestas: 25, Ganados: 10 },
  'Mexa Creativa': { Contactos: 1756, MQL: 80, SQL: 9, Propuestas: 8, Ganados: 0 },
  NeraCode: { Contactos: 1279, MQL: 37, SQL: 18, Propuestas: 10, Ganados: 0 },
  'Promo Espacio': { Contactos: 23618, MQL: 77, SQL: 32, Propuestas: 19, Ganados: 1 },
  'Research Land': { Contactos: 1204, MQL: 36, SQL: 14, Propuestas: 21, Ganados: 1 },
  UiX: { Contactos: 756, MQL: 8, SQL: 13, Propuestas: 19, Ganados: 3 },
}

export const UDNS_FUNNEL = Object.keys(FUNNEL) as Udn[]
export const totalEtapa = (e: Etapa) => UDNS_FUNNEL.reduce((n, u) => n + FUNNEL[u][e], 0)
export const tasa = (de: Etapa, a: Etapa) => totalEtapa(a) / totalEtapa(de)

/**
 * LOS TOTALES DEL TRIMESTRE, tal como los lee Orbit para todo el grupo (César,
 * 2-oct-2026). Son mayores que la suma de las siete empresas de la tabla porque
 * incluyen a las otras unidades del grupo, que aquí no se desglosan: 16 SQL y
 * 3 propuestas (comprobado en la fuente de Orbit). Las pruebas fijan la diferencia.
 */
export const DEMANDA_Q3 = { MQL: 361, SQL: 114, Propuestas: 106, Ganados: 16 } as const
export type CorteDemanda = keyof typeof DEMANDA_Q3

/** Tasa de conversión ideal por etapa (Forecast 2026; la confirmó el equipo el 2-oct). */
export const TASA_IDEAL = { mqlASql: 0.3, sqlAPropuesta: 0.8, propuestaAGanado: 0.2 }

/** Las tres conversiones del trimestre: la real sale de los totales; la ideal, del Forecast. */
export const CONVERSION_Q3: { de: CorteDemanda; a: CorteDemanda; real: number; ideal: number }[] = [
  { de: 'MQL', a: 'SQL', real: DEMANDA_Q3.SQL / DEMANDA_Q3.MQL, ideal: TASA_IDEAL.mqlASql },
  { de: 'SQL', a: 'Propuestas', real: DEMANDA_Q3.Propuestas / DEMANDA_Q3.SQL, ideal: TASA_IDEAL.sqlAPropuesta },
  { de: 'Propuestas', a: 'Ganados', real: DEMANDA_Q3.Ganados / DEMANDA_Q3.Propuestas, ideal: TASA_IDEAL.propuestaAGanado },
]

/** Conversiones que se muestran: las que salen de la tabla y no pasan de 100%. */
export const CONVERSIONES: { de: Etapa; a: Etapa }[] = [
  { de: 'Contactos', a: 'MQL' },
  { de: 'MQL', a: 'SQL' },
  { de: 'Propuestas', a: 'Ganados' },
]

/** Referencias del Forecast 2026 («% de conversión por etapa», columna Proyectada). */
export const REFERENCIA = { mqlASql: 0.3, oportunidadACliente: 0.2 }

/** Facturación y cumplimiento reportados por el equipo, lámina 6. */
export const FACTURADO_Q3 = 5_940_000
export const CUMPLIMIENTO_REPORTADO_Q3 = 0.094
/** Encabezado oficial de las láminas 2 y 3; el brief interno contiene otro total. */
export const KAITAI_CONFIRMADOS_REPORTADOS = 64

export const FACTURADO_POR_UDN: { udn: Udn; monto: number }[] = [
  { udn: 'Mexa Creativa', monto: 2_970_000 },
  { udn: 'Marketing United', monto: 2_560_000 },
  { udn: 'Promo Espacio', monto: 286_000 },
  { udn: 'UiX', monto: 125_000 },
]
export const NEGOCIOS_FACTURADOS_Q3 = 14

/** Empresas destacadas del funnel: solo logos, como en el borrador. */
export const DESTACADAS: { empresa: string; logo: string }[] = [
  ['Toyota', 'toyota'],
  ['Danone', 'danone'],
  ['Perfetti Van Melle', 'perfetti'],
  ['Minsa', 'minsa'],
  ['Disney', 'disney'],
  ['ArcelorMittal', 'arcelormittal'],
  ['Alpla', 'alpla'],
  ['Federación Mexicana de Futbol', 'fmf'],
  ['Telcel', 'telcel'],
  ['Syngenta', 'syngenta'],
  ['USG', 'usg'],
  ['Virbac', 'virbac'],
  ['Sabormex', 'sabormex'],
  ['Casaideas', 'casaideas'],
  ['Recórcholis', 'recorcholis'],
  ['Sports World', 'sports-world'],
].map(([empresa, archivo]) => ({ empresa, logo: `/estatus-q3/logos/destacadas/${archivo}.png` }))

/* ─────────────── 3 · PIPELINE Y VENTA (César, desde Orbit) ─────────────── */

export type EtapaNegocio = 'Ganado (por facturar)' | 'Facturado'

/** Propuestas ganadas en el trimestre: la tabla de Orbit, renglón por renglón. */
export const GANADAS: { empresa: string; valor: number; udn: Udn; etapa: EtapaNegocio }[] = [
  { empresa: 'Virbac', valor: 1_300_000, udn: 'Marketing United', etapa: 'Ganado (por facturar)' },
  { empresa: 'iLumileds', valor: 1_255_250, udn: 'Research Land', etapa: 'Ganado (por facturar)' },
  { empresa: 'SanDisk', valor: 753_944.4, udn: 'Marketing United', etapa: 'Ganado (por facturar)' },
  { empresa: 'Loco Tequila', valor: 467_469.9, udn: 'Marketing United', etapa: 'Facturado' },
  { empresa: 'Aleatica', valor: 397_000, udn: 'UiX', etapa: 'Ganado (por facturar)' },
  { empresa: 'TailyHub', valor: 290_000, udn: 'UiX', etapa: 'Ganado (por facturar)' },
  { empresa: 'Häfele México', valor: 279_978, udn: 'Marketing United', etapa: 'Facturado' },
  { empresa: 'Grupo Plenitud', valor: 187_460, udn: 'Marketing United', etapa: 'Ganado (por facturar)' },
  { empresa: 'Newfold Digital', valor: 171_000, udn: 'UiX', etapa: 'Ganado (por facturar)' },
  { empresa: 'ASSA ABLOY', valor: 135_000, udn: 'House of Films', etapa: 'Ganado (por facturar)' },
  { empresa: 'Loco Tequila', valor: 97_080, udn: 'Marketing United', etapa: 'Facturado' },
  { empresa: 'Häfele México', valor: 36_665.64, udn: 'Marketing United', etapa: 'Facturado' },
  { empresa: 'Grupo Kasa', valor: 35_820, udn: 'Promo Espacio', etapa: 'Facturado' },
  { empresa: 'Corbion', valor: 32_619, udn: 'Marketing United', etapa: 'Facturado' },
  { empresa: 'Corbion', valor: 32_619, udn: 'Marketing United', etapa: 'Facturado' },
  { empresa: 'Häfele México', valor: 22_049.5, udn: 'Marketing United', etapa: 'Facturado' },
]

export const totalGanado = () => GANADAS.reduce((n, g) => n + g.valor, 0)
export const empresasGanadas = () => new Set(GANADAS.map((g) => g.empresa)).size

/** De lo ganado en el trimestre, lo que sigue sin facturar: es lo que todavía se va a sumar a la caja. */
export const ganadoPorFacturar = () => GANADAS.filter((g) => g.etapa === 'Ganado (por facturar)')
export const montoPorFacturar = () => ganadoPorFacturar().reduce((n, g) => n + g.valor, 0)

/**
 * LO QUE YA ESTÁ EN LOS DOS CORTES. Seis de los negocios ganados en Q3 también
 * se facturaron dentro del trimestre, así que ya están en los $5.94 M (fuente de
 * Orbit, 2-oct-2026). Sumar los dos cortes tal cual los contaría dos veces.
 */
export const TRASLAPE_VENTA = { negocios: 6, monto: 945_585.9 }
/** Venta generada en Q3, sin contar dos veces: facturado + ganado − lo que está en ambos. */
export const ventaGenerada = () => FACTURADO_Q3 + totalGanado() - TRASLAPE_VENTA.monto
export const negociosVenta = () => NEGOCIOS_FACTURADOS_Q3 + GANADAS.length - TRASLAPE_VENTA.negocios

/** Pipeline activo: negocios abiertos, de la vista MBR de Orbit al corte. */
export const PIPELINE_ETAPAS: { etapa: string; negocios: number; monto: number }[] = [
  { etapa: 'Reunión calificada', negocios: 32, monto: 3_110_000 },
  { etapa: 'Propuesta', negocios: 32, monto: 10_500_000 },
  { etapa: 'Evaluando', negocios: 66, monto: 57_690_000 },
  { etapa: 'Cierre', negocios: 2, monto: 250_000 },
]

export const PIPELINE_UDN: { udn: Udn; negocios: number; monto: number }[] = [
  { udn: 'NeraCode', negocios: 18, monto: 24_830_000 },
  { udn: 'Promo Espacio', negocios: 38, monto: 11_870_000 },
  { udn: 'Marketing United', negocios: 18, monto: 11_450_000 },
  { udn: 'Research Land', negocios: 16, monto: 10_470_000 },
  { udn: 'UiX', negocios: 11, monto: 7_130_000 },
  { udn: 'Mexa Creativa', negocios: 6, monto: 2_250_000 },
  { udn: 'House of Films', negocios: 3, monto: 1_880_000 },
]

/** Lo que el total de Orbit incluye y esta tabla no desglosa: otra unidad del grupo. */
export const PIPELINE_OTRAS = { negocios: 22, monto: 1_680_000 }

/**
 * DÓNDE FALTA DEMANDA (lectura del equipo, 2-oct-2026): las tres empresas donde
 * Marketing tiene que generar más pipeline. No es un dato de Orbit: es el
 * compromiso que el equipo decidió poner en el título.
 */
export const POR_SEMBRAR: Udn[] = ['House of Films', 'Mexa Creativa', 'UiX']
export const pipelinePorSembrar = () => PIPELINE_UDN.filter((f) => POR_SEMBRAR.includes(f.udn)).reduce((n, f) => n + f.monto, 0)

/**
 * El encabezado de Orbit, tal cual. Las etapas y las empresas vienen
 * redondeadas a dos decimales de millón, así que su suma puede diferir del
 * total por un redondeo (las pruebas lo acotan); la cifra grande es la de Orbit.
 */
export const PIPELINE = { total: 71_550_000, negocios: 132, ticketPromedio: 542_050 }

export const negociosAbiertos = () => PIPELINE_ETAPAS.reduce((n, e) => n + e.negocios, 0)

/* ────────────────────────────── 4 · PR (Caro) ────────────────────────────── */

export const PR = {
  alcance: 149_000_000,
  valorPublicitario: 3_900_000,
  porUdn: [
    { udn: 'Research Land' as Udn, notas: 212 },
    { udn: 'Marketing United' as Udn, notas: 6 },
    { udn: 'UiX' as Udn, notas: 4 },
    { udn: 'House of Films' as Udn, notas: 3 },
    { udn: 'NeraCode' as Udn, notas: 3 },
    { udn: 'Mexa Creativa' as Udn, notas: 2 },
    { udn: 'Promo Espacio' as Udn, notas: 1 },
  ],
  medios: [
    ['Forbes', 'logo-forbes.png'],
    ['El Universal', 'logo-el-universal.png'],
    ['El Financiero', 'logo-el-financiero.png'],
    ['El Economista', 'logo-el-economista.svg'],
    ['Excélsior', 'logo-excelsior.png'],
    ['Publimetro', 'logo-publimetro.png'],
    ['Milenio', 'logo-milenio.png'],
    ['Merca2.0', 'logo-merca-2.png'],
    ['InformaBTL', 'logo-informa-btl.png'],
  ].map(([medio, archivo]) => ({ medio, logo: `/estatus-q3/logos/medios/${archivo}` })),
}

export const notasEnMedios = () => PR.porUdn.reduce((n, f) => n + f.notas, 0)
/** Research Land va aparte (equipo, 2-oct): tiene otro mercado y otra cadencia, y aplastaba a las demás. */
export const notasRL = () => PR.porUdn.find((f) => f.udn === 'Research Land')?.notas ?? 0
export const notasSinRL = () => PR.porUdn.filter((f) => f.udn !== 'Research Land')

/* ──────────────────────── 5 · ARTEFACTOS (César e Iris) ──────────────────────── */

export const ARTEFACTOS = [
  {
    id: 'simulador' as const,
    nombre: 'Simulador de pantallas',
    de: 'Promo Espacio',
    descripcion:
      'Simulador web sin registro: el anunciante elige ubicación y formatos, sube su creatividad y descarga mockups de cómo lucirá su campaña. Acelera cotizaciones y baja la fricción comercial.',
    pasos: ['Ubicación y formato', 'Creatividad del anunciante', 'Mockup de campaña'],
    enlace: 'https://promo-espacio.com/simulador?hs_preview=FJVufziD-218109333423',
    abrir: 'Abrir simulador',
  },
  {
    id: 'senales' as const,
    nombre: 'Señales de mercado',
    de: 'Inteligencia comercial',
    descripcion:
      'Encuentra la mejor ventana para contactar a cada industria: reúne las señales de lo que está cambiando en su mercado y enseña en el mapa dónde se concentran esas empresas.',
    pasos: ['Señales de la industria', 'Empresas en el mapa', 'Ventana de contacto'],
    enlace: 'https://orbit-mkt.com/brujula',
    abrir: 'Abrir Señales de mercado',
  },
]

/* ───────────────────────── 6 · QUÉ HAREMOS EN Q4 ───────────────────────── */

export const INNER_CIRCLE = {
  definicion:
    'La comunidad privada de líderes y tomadores de decisión creada para convertir cada Fire Experience en una relación de largo plazo con Grupo UPAX.',
  beneficio:
    'Sus miembros reciben acceso preferente a experiencias, encuentros, data, insights y contenidos exclusivos de las siete empresas del Grupo, y oportunidades para participar y compartir su visión.',
  noEs:
    'No es una plataforma comercial ni de comunicación masiva: es una estrategia de relacionamiento para mantener a UPAX relevante entre sus públicos clave y consolidar un ecosistema propio de conocimiento, influencia y conexión.',
  remate: 'La plataforma relacional de Grupo UPAX con su ecosistema de tomadores de decisión.',
  /** Lo que el equipo explicó en la revisión del 2-oct-2026 y lo que dice la invitación que firma Cecilia. */
  frase: 'Las mejores conversaciones no terminan con un evento.',
  /** La carta sola, la que mandó el equipo el 2-oct-2026. El render con estuche y tarjeta traía texto mal escrito. */
  carta: { src: '/estatus-q3/inner-circle-carta.webp', ancho: 1189, alto: 1667 },
  meta: 100,
  metaTexto: 'tomadores de decisión en una comunidad activa al cierre de 2026',
  claves: [
    { titulo: 'Qué es', icono: 'personas' as const, texto: 'El círculo exclusivo de Grupo UPAX para líderes y tomadores de decisión de la industria.' },
    { titulo: 'Cómo se entra', icono: 'documento' as const, texto: 'Al cierre de cada Fire Experience, en la misma cena: la invitación la firma Cecilia y el registro es en ese momento.' },
    { titulo: 'Qué reciben', icono: 'chispa' as const, texto: 'Tendencias, estudios y data exclusiva de la industria, y acceso preferente a experiencias y encuentros del grupo.' },
    { titulo: 'Cómo se cuida', icono: 'estrella' as const, texto: 'Relación uno a uno: fechas clave, detalles, invitaciones y la posibilidad de participar como ponentes.' },
  ],
  contenidos: [
    {
      udn: 'Research Land' as Udn,
      // Los tres temas a la vista, en corto (equipo, 2-oct: «las tendencias tienen que estar fuera»).
      corto: ['Estudios exclusivos del consumidor mexicano', 'Pulsos trimestrales de confianza y consumo', 'Insight of the Month'],
      ideas: [
        'Resultados exclusivos de estudios sobre el consumidor mexicano y tendencias.',
        'Pulsos trimestrales sobre confianza, consumo y cambios de comportamiento.',
        'Insight of the Month: un dato relevante con su interpretación para negocio.',
      ],
    },
    {
      udn: 'Promo Espacio' as Udn,
      // Los tres temas a la vista, en corto (equipo, 2-oct: «las tendencias tienen que estar fuera»).
      corto: ['Tendencias de DOOH y DOOH programático', 'Data de movilidad y audiencias', 'Temporalidades: Buen Fin, Navidad, regreso a clases'],
      ideas: [
        'Tendencias y evolución del DOOH y el DOOH programático.',
        'Data de movilidad, audiencias y comportamiento en puntos de contacto.',
        'Temporalidades: cómo cambia la audiencia en Buen Fin, Navidad o regreso a clases.',
      ],
    },
    {
      udn: 'Marketing United' as Udn,
      // Los tres temas a la vista, en corto (equipo, 2-oct: «las tendencias tienen que estar fuera»).
      corto: ['Tendencias de experiential marketing y BTL', 'Qué genera engagement de verdad', 'Casos de activaciones en México y otros mercados'],
      ideas: [
        'Tendencias en experiential marketing y BTL.',
        'Qué hace que una experiencia de marca genere engagement de verdad.',
        'Casos y aprendizajes de activaciones en México y otros mercados.',
      ],
    },
    {
      udn: 'House of Films' as Udn,
      // Los tres temas a la vista, en corto (equipo, 2-oct: «las tendencias tienen que estar fuera»).
      corto: ['Tendencias de formatos y consumo audiovisual', 'IA aplicada a producción', 'Behind the content: decisiones de producción'],
      ideas: [
        'Tendencias en formatos y consumo audiovisual.',
        'IA aplicada a producción: qué cambia y qué sigue necesitando talento humano.',
        'Behind the content: las decisiones de producción detrás de campañas sobresalientes.',
      ],
    },
    {
      udn: 'Mexa Creativa' as Udn,
      // Los tres temas a la vista, en corto (equipo, 2-oct: «las tendencias tienen que estar fuera»).
      corto: ['Radar del Mexa: tendencias culturales', 'Hallazgos de las expediciones de Mexa', 'Códigos culturales que las marcas deben observar'],
      ideas: [
        'Radar del Mexa: tendencias culturales y comportamientos emergentes del consumidor mexicano.',
        'Hallazgos de las expediciones de Mexa sobre el consumidor «de a pie».',
        'Códigos culturales, conversaciones y fenómenos que las marcas deberían observar.',
      ],
    },
    {
      udn: 'NeraCode' as Udn,
      // Los tres temas a la vista, en corto (equipo, 2-oct: «las tendencias tienen que estar fuera»).
      corto: ['Tendencias de IA y desarrollo de software', 'Tech Briefs para directivos', 'Construir, comprar o evolucionar sistemas'],
      ideas: [
        'Tendencias en IA, desarrollo de software y transformación tecnológica.',
        'Tech Briefs para directivos: tecnologías emergentes sin lenguaje técnico.',
        'Cuándo construir tecnología propia, comprar soluciones o evolucionar sistemas legacy.',
      ],
    },
    {
      udn: 'UiX' as Udn,
      // Los tres temas a la vista, en corto (equipo, 2-oct: «las tendencias tienen que estar fuera»).
      corto: ['Tendencias UX/UI y comportamiento digital', 'UX Teardowns', 'Diseño que mueve conversión y adopción'],
      ideas: [
        'Tendencias UX/UI y comportamiento digital.',
        'UX Teardowns: experiencias digitales relevantes y por qué funcionan.',
        'Cómo el diseño modifica comportamiento, conversión, adopción y experiencia.',
      ],
    },
  ],
}

export const UPAX_ONE = {
  nace:
    'Nace como un ecosistema de relacionamiento que conecta a UPAX con líderes y tomadores de decisión a través de experiencias, conversaciones y capacidades que convergen.',
  convergencia:
    'Un encuentro mayor que reúne a la comunidad generada alrededor de los Ignites y presenta a UPAX no como un conjunto de empresas aisladas, sino como un ecosistema de capacidades que entiende y transforma los retos del negocio.',
  /**
   * Lo que el equipo contó en la revisión del 2-oct-2026. La ponencia y el concierto van en
   * cajas separadas (Franco, 2-oct). La ponencia es la idea que se le presenta a Cecilia, no un confirmado.
   */
  claves: [
    { titulo: 'Cuándo', icono: 'calendario' as const, dato: 'Primavera 2027', texto: 'Marzo o abril.' },
    { titulo: 'Quiénes', icono: 'personas' as const, dato: '150 a 200', texto: 'Líderes y tomadores de decisión de la comunidad que nace en los Ignites.' },
    { titulo: 'Qué se vive', icono: 'chispa' as const, dato: 'Un día completo', texto: 'Experiencia inmersiva: conferencias, experiencias de cada empresa y speakers externos.' },
    { titulo: 'Ponencia magistral', icono: 'megafono' as const, dato: 'Ricardo Salinas', texto: 'La idea es que dé la conferencia central del encuentro.' },
    { titulo: 'Cierre', icono: 'estrella' as const, dato: 'Concierto', texto: 'En vivo, con coctel al terminar.' },
  ],
  /**
   * Los tres renders. El primero es el mapa del evento (David, 2-oct-2026): el escenario al centro
   * y un espacio por cada empresa. `ancho` y `alto` son los del archivo: la vista ampliada los enseña enteros.
   */
  renders: [
    { id: 'mapa', src: '/estatus-q3/upax-one-mapa.webp', ancho: 1800, alto: 848, pie: 'Así se verá el evento · mapa conceptual', alt: 'Render del mapa de UPAX ONE: un escenario central y un espacio para cada una de las siete empresas del grupo' },
    { id: 'salon', src: '/estatus-q3/upax-one-salon.jpg', ancho: 1600, alto: 902, pie: 'Encuentro de la comunidad', alt: 'Render conceptual del salón de UPAX ONE' },
    {
      id: 'tunel', src: '/estatus-q3/upax-one-tunel.jpg', ancho: 1600, alto: 836, pie: 'Experiencia de llegada', alt: 'Render conceptual del túnel de acceso de UPAX ONE',
      // El archivo trae este párrafo incrustado (con «Tunel» sin acento) y un rótulo de capítulo arriba. Ampliado, el
      // rótulo se recorta (`alto` es menor que el del archivo) y el párrafo se tapa y se escribe aquí como texto, tal cual.
      titulo: 'Túnel inmersivo',
      texto: 'Un túnel anamórfico con imágenes y sonido envolvente sumerge a los invitados en un caso de éxito real, mostrando en menos de dos minutos cómo las distintas capacidades de UPAX se integraron para multiplicar el impacto de una misma campaña.',
    },
  ] as { id: string; src: string; ancho: number; alto: number; pie: string; alt: string; titulo?: string; texto?: string }[],
}

export const LANZAMIENTO_RL_IA = [
  'Logotipo',
  'Storytelling',
  'Materiales comerciales: credenciales, one sheets, infografía y video',
  'Comunicado de prensa',
  'Eventos con medios',
  'Actualización del sitio web',
  'Campaña de lanzamiento',
]

/** Roadmap always on (Iris y Caro). `desde`/`hasta`: 1 = octubre, 2 = noviembre, 3 = diciembre. */
export interface Accion {
  tema: string
  quien: string
  desde: 1 | 2 | 3
  hasta: 1 | 2 | 3
}

export const ROADMAP: { carril: 'PR y medios' | 'Contenidos'; acciones: Accion[] }[] = [
  {
    carril: 'PR y medios',
    acciones: [
      { tema: 'Derecho a la información', quien: 'Research Land', desde: 1, hasta: 1 },
      { tema: 'Ganadores Effie', quien: 'Mexa Creativa', desde: 1, hasta: 2 },
      { tema: 'Tótem IA', quien: 'House of Films', desde: 2, hasta: 2 },
      { tema: 'Tendencias 2027 en la industria publicitaria', quien: 'Mexa Creativa', desde: 3, hasta: 3 },
      { tema: 'Construir la industria que queremos', quien: 'Marketing United', desde: 1, hasta: 2 },
      { tema: 'Tendencias en DOOH 2027', quien: 'Promo Espacio', desde: 2, hasta: 3 },
      { tema: 'Tendencias en activaciones 2027', quien: 'Marketing United', desde: 3, hasta: 3 },
      { tema: 'Fragmentación tecnológica en las empresas', quien: 'NeraCode', desde: 1, hasta: 1 },
      { tema: 'Experiencia de compra en e-commerce', quien: 'UiX', desde: 2, hasta: 2 },
      { tema: 'Research Land + Inteligencia Artificial', quien: 'Research Land', desde: 3, hasta: 3 },
      { tema: 'Experiencia de usuario en el sector financiero', quien: 'UiX', desde: 1, hasta: 1 },
      { tema: 'Buen Fin, aguinaldo y compras en retail', quien: 'Research Land', desde: 2, hasta: 3 },
      { tema: 'Tendencias TI', quien: 'NeraCode', desde: 3, hasta: 3 },
    ],
  },
  {
    carril: 'Contenidos',
    acciones: [
      { tema: 'Presupuestos 2027', quien: 'Grupo UPAX · Marketing United, Mexa Creativa y House of Films', desde: 1, hasta: 1 },
      { tema: 'Radiografía digital', quien: 'Marketing United', desde: 1, hasta: 1 },
      { tema: 'Encuestas con IA', quien: 'Research Land', desde: 1, hasta: 1 },
      { tema: 'Difusión de BAZ como canal', quien: 'Promo Espacio', desde: 1, hasta: 1 },
      { tema: 'Eventos de fin de año', quien: 'Marketing United', desde: 2, hasta: 2 },
      { tema: 'Simulador de pantallas', quien: 'Promo Espacio', desde: 2, hasta: 2 },
      { tema: 'Paquetización de servicios', quien: 'Research Land', desde: 2, hasta: 2 },
      { tema: 'Estudio Soledad', quien: 'Mexa Creativa', desde: 2, hasta: 2 },
      { tema: 'Tema por definir', quien: 'Grupo UPAX · NeraCode y UiX', desde: 3, hasta: 3 },
      { tema: 'Autorregulación de la IA', quien: 'Grupo UPAX · House of Films y Mexa Creativa', desde: 3, hasta: 3 },
    ],
  },
]

/* ───────────────────────────────── ANEXOS ───────────────────────────────── */

/**
 * Estatus de materiales de venta (David). Orden de columnas: RL, PE, MU, MC, HoF, NC, UiX.
 * ACTUALIZADA el 2-oct-2026 con «Materiales UPAX 2.xlsx», la tabla que David le pasó a Franco
 * después de la revisión del equipo. Ojo al transcribirla: en sus celdas «PE» es «Por elaborar»,
 * no Promo Espacio, y sus columnas vienen en otro orden (NC, PE, MU, RL, UiX, HoF, MC).
 */
export type EstadoMaterial = 'hecho' | 'modificacion' | 'aprobacion' | 'elaborar' | 'noAplica' | 'sinDato'

export const ESTADO_MATERIAL: Record<EstadoMaterial, string> = {
  hecho: 'Hecho, actualizado y aprobado',
  modificacion: 'En modificación',
  aprobacion: 'Contenidos en aprobación',
  elaborar: 'Por elaborar',
  noAplica: 'No aplica',
  sinDato: 'Sin estado',
}

export const COLUMNAS_MATERIALES: Udn[] = [
  'Research Land',
  'Promo Espacio',
  'Marketing United',
  'Mexa Creativa',
  'House of Films',
  'NeraCode',
  'UiX',
]

const H = 'hecho', Mo = 'modificacion', A = 'aprobacion', E = 'elaborar', N = 'noAplica'

export const MATERIALES: { material: string; estados: EstadoMaterial[] }[] = [
  { material: 'Credenciales · versión master', estados: [H, H, H, H, N, H, H] },
  { material: 'Credenciales comerciales · versión larga', estados: [H, H, Mo, Mo, N, A, Mo] },
  { material: 'Credenciales comerciales · versión corta', estados: [H, H, Mo, Mo, E, A, Mo] },
  { material: 'One sheet de la empresa', estados: [Mo, Mo, Mo, Mo, H, H, Mo] },
  { material: 'One sheets por servicio', estados: [H, Mo, Mo, Mo, A, Mo, A] },
  { material: 'One sheets por industria', estados: [H, H, Mo, Mo, Mo, E, Mo] },
  { material: 'Video credencial', estados: [H, Mo, H, H, H, H, H] },
]

export const cuentaMateriales = (estado: EstadoMaterial) =>
  MATERIALES.reduce((n, f) => n + f.estados.filter((e) => e === estado).length, 0)

/** Presencia digital (Fernando, Iris y su squad). Cifras tal como las entregó cada dueño. */
export const REDES = [
  { red: 'Instagram', seguidores: 2214, impresiones: 145_835, interacciones: 3290, engagement: 0.0226 },
  { red: 'LinkedIn', seguidores: 3561, impresiones: 92_063, interacciones: 11_688, engagement: 0.127 },
  { red: 'YouTube', seguidores: 22, impresiones: 10_682, interacciones: 445, engagement: 0.0417 },
]

/** El dato de Q2 contra el que el squad compara el engagement de Instagram (insight de redes). */
export const REDES_Q2 = { engagementInstagram: 0.0025 }

/**
 * Paid, por empresa (Orbit, 2-oct-2026). `inversion` es lo que se pagó por los MQL
 * del trimestre: el costo por MQL se calcula, así que cambia solo si cambian los MQL.
 * UiX no tiene MQL propios de paid: sus 4 SQL llegan por cross-sell con NeraCode.
 */
export const PAID: { udn: Udn; mql: number | null; inversion: number | null; sql: number | null; pipeline: number; facturado: number; nota?: string }[] = [
  { udn: 'Research Land', mql: 14, inversion: 20_778.2, sql: 0, pipeline: 1_660_000, facturado: 0 },
  { udn: 'Promo Espacio', mql: 47, inversion: 32_086.35, sql: 16, pipeline: 1_790_000, facturado: 286_000 },
  { udn: 'Marketing United', mql: 41, inversion: 59_632.56, sql: 2, pipeline: 3_250_000, facturado: 2_180_000 },
  { udn: 'House of Films', mql: 47, inversion: 61_520.96, sql: 0, pipeline: 375_000, facturado: 135_000 },
  { udn: 'Mexa Creativa', mql: 58, inversion: 63_930.5, sql: 5, pipeline: 2_250_000, facturado: 2_970_000 },
  { udn: 'NeraCode', mql: 21, inversion: 40_394, sql: 8, pipeline: 17_850_000, facturado: 0 },
  { udn: 'UiX', mql: null, inversion: null, sql: 4, pipeline: 1_190_000, facturado: 0, nota: 'cross-sell con NeraCode' },
]
export const costoMql = (p: (typeof PAID)[number]) => (p.mql && p.inversion ? p.inversion / p.mql : null)
/** Lo que el total de pipeline de paid en Orbit incluye de otra unidad del grupo, sin desglosar aquí. */
export const PAID_PIPELINE_TOTAL = 29_530_000

export const WEB: { udn: Udn; visitas: number; posicion: string; mql: number; sql: number; pipeline: number; facturado: number }[] = [
  { udn: 'Research Land', visitas: 7967, posicion: '2.ª página', mql: 11, sql: 6, pipeline: 3_500_000, facturado: 1_260_000 },
  { udn: 'Promo Espacio', visitas: 11_599, posicion: '1.ª página', mql: 12, sql: 4, pipeline: 3_080_000, facturado: 640_000 },
  { udn: 'Marketing United', visitas: 3594, posicion: '2.ª página', mql: 7, sql: 2, pipeline: 202_000, facturado: 187_000 },
  { udn: 'House of Films', visitas: 3613, posicion: '2.ª página', mql: 1, sql: 1, pipeline: 1_300_000, facturado: 100_000 },
  { udn: 'Mexa Creativa', visitas: 6520, posicion: '1.ª página', mql: 13, sql: 2, pipeline: 0, facturado: 0 },
  { udn: 'NeraCode', visitas: 3452, posicion: '1.ª página', mql: 6, sql: 6, pipeline: 9_620_000, facturado: 0 },
  { udn: 'UiX', visitas: 5630, posicion: '1.ª página', mql: 4, sql: 4, pipeline: 6_510_000, facturado: 921_000 },
]

export const suma = <T>(filas: T[], campo: (f: T) => number | null) => filas.reduce((n, f) => n + (campo(f) ?? 0), 0)

export const INSIGHTS_PAID = [
  'Paid cierra Q3 con 228 MQL y 35 SQL generados por Marketing.',
  'Paid Media cierra Q3 con impacto en revenue: $29.53 M de pipeline activo y $5.57 M facturados y por facturar. Paid no solo genera MQL; también es fuente de negocio.',
]

export const INSIGHTS_REDES = [
  'LinkedIn se consolida como el canal de mayor interacción: 92 mil impresiones, 11.7 mil interacciones y 12.7% de engagement, muy por encima de Instagram (2.26%) y YouTube (4.17%).',
  'Instagram reduce su exposición contra Q2, pero mejora la eficiencia: el engagement pasó de cerca de 0.25% en Q2 a 2.26% en Q3, aun con muchas menos impresiones.',
]

/** Texto del equipo, tal cual (Franco, 1-oct: la línea de IA se deja como la escribió el equipo). */
export const INSIGHTS_WEB = [
  'Los asistentes de IA son un canal emergente. Las visitas desde ChatGPT, Perplexity y similares pasaron de 94 a 224 sesiones (×2.4). Mexa Creativa lidera con 73, con 3:48 min de duración y 30% de rebote. El volumen todavía es chico, pero es el tráfico de mayor intención.',
  'Llegó la misma gente, pero menos personas mostraron interés real: de cada 100 visitantes, antes 37 se quedaban a ver o hacer algo, y ahora solo 33.',
  'La web atrae suficiente gente; convertir es lo difícil. De cada 800 visitas sale un contacto. Aun así, esos contactos ya generan $24 M en oportunidades y $3.1 M en ventas. La prioridad no es atraer más visitas, sino convertir mejor.',
]

export const EQUIPO = {
  intro:
    'En el bootcamp de julio el equipo nombró sus fricciones. Empezamos por las de comunicación, clima y reconocimiento, con cuatro acciones ya en marcha.',
  acciones: [
    { eje: 'Clima e integración', titulo: 'Sudadera oficial', texto: 'Integrantes del equipo diseñaron una propuesta y todo el equipo votó. ¡Ya tenemos sudadera oficial! Además, premiamos al top 3.' },
    { eje: 'Comunicación', titulo: 'Newsletter interno', texto: 'Avance de proyectos, cumpleaños y aniversarios en un solo boletín. Responde a quienes no se enteraban de lo que pasa en el área.' },
    { eje: 'Reconocimiento', titulo: 'Reconocimiento del mes', texto: 'Los propios compañeros nominan y votan. Primer reconocido: Diego Luna (BI), por construir Orbit.' },
    { eje: 'Comunicación y clima', titulo: '1:1 con el CMO', texto: 'Franco conversó uno a uno con cada integrante para escuchar de primera mano y dar seguimiento a inquietudes particulares.' },
  ],
}

/* ─────────── LECTURAS: lo que cada lámina concluye, calculado de sus tablas ─────────── */

/** Lo ganado por empresa: monto, negocios y clientes. */
export const ganadoPorUdn = () => {
  const porUdn = new Map<Udn, { monto: number; negocios: number; clientes: Set<string> }>()
  for (const g of GANADAS) {
    const f = porUdn.get(g.udn) ?? { monto: 0, negocios: 0, clientes: new Set<string>() }
    f.monto += g.valor
    f.negocios += 1
    f.clientes.add(g.empresa)
    porUdn.set(g.udn, f)
  }
  return [...porUdn.entries()]
    .map(([udn, f]) => ({ udn, monto: f.monto, negocios: f.negocios, clientes: [...f.clientes] }))
    .sort((a, b) => b.monto - a.monto)
}

/** Parte del pipeline abierto que ya está en «Evaluando». */
export const parteEvaluando = () =>
  (PIPELINE_ETAPAS.find((e) => e.etapa === 'Evaluando')?.monto ?? 0) / PIPELINE.total

/** Parte de las notas de PR que fue de Research Land. */
export const parteNotasRL = () => (PR.porUdn.find((f) => f.udn === 'Research Land')?.notas ?? 0) / notasEnMedios()

/** Costo promedio por MQL de paid, ponderado por los MQL de cada empresa. */
export const costoPromedioMqlPaid = () => {
  const conDato = PAID.filter((p) => p.mql !== null && p.inversion !== null)
  const mql = conDato.reduce((n, p) => n + (p.mql ?? 0), 0)
  return conDato.reduce((n, p) => n + (p.inversion ?? 0), 0) / mql
}

/** Cociente entre visitas y MQL reportados; no equivale a formularios enviados. */
export const visitasPorMql = () => suma(WEB, (w) => w.visitas) / suma(WEB, (w) => w.mql)

/** Sitios que aparecen en la primera página de Google. */
export const sitiosPrimeraPagina = () => WEB.filter((w) => w.posicion.startsWith('1')).length

/** Materiales hechos y aprobados, por empresa (columnas de la matriz). */
export const materialesListosPorUdn = () =>
  COLUMNAS_MATERIALES.map((udn, i) => ({
    udn,
    listos: MATERIALES.filter((f) => f.estados[i] === 'hecho').length,
    total: MATERIALES.filter((f) => f.estados[i] !== 'noAplica').length,
  }))

/** Acciones del roadmap de Q4, en total y por carril. */
export const accionesRoadmap = () => ROADMAP.reduce((n, c) => n + c.acciones.length, 0)
