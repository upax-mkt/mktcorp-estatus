import type { Unidad } from './comun'

/**
 * EL TEXTO DE LA PIEZA, en un solo lugar (ronda 6, 21-oct-2026).
 *
 * Ceci revisó la ronda 5 con las unidades (Notas de Voz «UPAX GS 11», 21-oct) y pidió:
 * - «Primero qué descubrimos y luego qué resolvemos, no todo junto»: el diagnóstico lleva solo los problemas, mejor
 *   definidos, uno por idea («no se venden» y «se cambian a mano» son dos cosas distintas).
 * - Ordenar la propuesta por las cuatro partes que Marketing United propuso impulsar («4 propiedades a impulsar»,
 *   20-oct): Malinche, el Frontón como venue, Pelota Mestiza y las experiencias gastronómicas. «Para cada una, te
 *   proponemos esto». Ceci lo aprobó en la sala.
 * - Palabras llanas («videoactivaciones, la compra… no sé qué hablas»), y que cada propuesta diga lo que mandó su unidad.
 * - Lo de Promo Espacio en la ciudad no está conseguido: es una oferta («no conseguimos, lo que les ofrecimos»).
 * - El Frontón es monumento: la fachada no se toca. Afuera, todo va en la plancha y en la ciudad.
 *
 * Fuentes: el material de cada unidad en `~/Downloads/Fortaleza Mexicana/` y las grabaciones, en
 * `~/CMO Copilot/sesiones/2026-10-20-fortaleza-presentacion/guion-tecnico.md` («Ronda 6»). Nada lleva precio. Solo se
 * compromete lo que cada unidad mandó o dijo en la sala.
 */

/** Una imagen: foto real, montaje o ilustración generada, con lo que es escrito en su esquina. */
export type Imagen = {
  src: string
  alt: string
  pie: string
  marca: string
  posicion?: string
  /** Si la imagen se ve completa, a su proporción (por ejemplo «16 / 9»), en vez de recortarse para llenar el cuadro. */
  proporcion?: string
}

const F = '/fortaleza/'

/** Las cuatro partes de Fortaleza Mexicana que hay que impulsar (Marketing United, 20-oct; Ceci, 21-oct). */
export type Propiedad = 'malinche' | 'fronton' | 'pelota' | 'experiencias'

export const PROPIEDADES: readonly { id: Propiedad; nombre: string; que: string; promesa: string }[] = [
  { id: 'malinche', nombre: 'Malinche', que: 'El musical', promesa: 'Que toda la ciudad lo sepa y comprar sea fácil' },
  { id: 'fronton', nombre: 'El Frontón México', que: 'El venue', promesa: 'Que sus pantallas trabajen y se rente toda la semana' },
  { id: 'pelota', nombre: 'Pelota Mestiza', que: 'El restaurante', promesa: 'Que sea destino, con o sin función' },
  { id: 'experiencias', nombre: 'Experiencias gastronómicas', que: 'Las cenas con chefs invitados', promesa: 'Que sus cenas se llenen' },
]

/** Un problema: solo lo que pasa, sin cómo se resuelve (eso va después, en la propuesta). */
export type Dolor = {
  n: number
  propiedad: Propiedad
  titulo: string
  /** Una frase corta: así se nombra en el «Resuelve» de cada propuesta. */
  corto: string
  texto: string
  /** La prueba, cuando hay una foto real. */
  evidencia?: Imagen
}

export const DOLORES: readonly Dolor[] = [
  {
    n: 1,
    propiedad: 'malinche',
    titulo: 'Casi nadie se entera de Malinche',
    corto: 'Casi nadie se entera',
    texto: 'Le falta difusión y no tiene material para hacer su publicidad.',
  },
  {
    n: 2,
    propiedad: 'malinche',
    titulo: 'A una empresa le cuesta comprar',
    corto: 'A las empresas les cuesta comprar',
    texto: 'No hay paquetes para empresas a la vista, y en línea se venden hasta 8 boletos por compra.',
  },
  {
    n: 3,
    propiedad: 'malinche',
    titulo: 'Los colaboradores de Grupo Salinas no se enteran',
    corto: 'Los colaboradores no se enteran',
    texto: 'No hay un canal para ofrecerles boletos con beneficio ni para saber si el aviso les llegó.',
  },
  {
    n: 4,
    propiedad: 'malinche',
    titulo: 'La boletera propia todavía no está lista',
    corto: 'La boletera no está lista',
    texto: 'Para competir con Ticketmaster necesita seguridad, aguantar mucha venta a la vez y una compra fácil.',
  },
  {
    n: 5,
    propiedad: 'malinche',
    titulo: 'Falta saber quién más vendría',
    corto: 'Falta saber quién más vendría',
    texto: 'La obra gusta a quien la ve, pero no se sabe a quién invitar ni qué detiene a los demás.',
  },
  {
    n: 6,
    propiedad: 'fronton',
    titulo: 'Desde afuera, nadie sabe qué hay adentro',
    corto: 'Nadie sabe qué hay adentro',
    texto: 'El Frontón México todavía no se reconoce como un lugar de espectáculos y de eventos.',
  },
  {
    n: 7,
    propiedad: 'fronton',
    titulo: 'Pocos saben que se renta',
    corto: 'Pocos saben que se renta',
    texto: 'Casi nadie lo piensa como sede de eventos, y de lunes a miércoles el teatro no se usa.',
  },
  {
    n: 8,
    propiedad: 'fronton',
    titulo: 'Las pantallas no se venden',
    corto: 'Las pantallas no se venden',
    texto: 'Nadie las ofrece a patrocinadores, así que hoy no dejan ingresos.',
  },
  {
    n: 9,
    propiedad: 'fronton',
    titulo: 'Las del lobby, la taquilla y las barras se cambian a mano',
    corto: 'Se cambian a mano',
    texto: 'Con una memoria USB. No pueden mostrar el menú ni al patrocinador del día.',
  },
  {
    n: 10,
    propiedad: 'fronton',
    titulo: 'Las dos pantallas grandes del escenario están apagadas',
    corto: 'Las del escenario, apagadas',
    texto: 'No tienen con qué programarse: no se usan ni antes de la función ni en el intermedio.',
  },
  {
    n: 11,
    propiedad: 'pelota',
    titulo: 'Pelota Mestiza todavía no es destino',
    corto: 'Pelota Mestiza no es destino',
    texto: 'Pocos saben que adentro hay un restaurante. Se ve como complemento del show, y los de enfrente se llenan.',
  },
  {
    n: 12,
    propiedad: 'experiencias',
    titulo: 'Las cenas con chefs invitados tienen que llenarse',
    corto: 'Las cenas tienen que llenarse',
    texto: 'Las cenas a cuatro manos de los miércoles son su gran apuesta, y cada semana hay que llenar sus mesas.',
  },
]

/** Las pantallas de «Lo que descubrimos»: una por parte (Pelota Mestiza y sus cenas comparten), con su foto si la hay. */
export const DESCUBRIMOS: readonly { id: string; titulo: string; propiedades: readonly Propiedad[]; foto?: Imagen }[] = [
  { id: 'malinche', titulo: 'En Malinche', propiedades: ['malinche'] },
  {
    id: 'fronton',
    titulo: 'En el Frontón México',
    propiedades: ['fronton'],
    foto: {
      src: F + 'fachada.jpg',
      alt: 'Foto real: la fachada roja del Frontón México, sola, sin nada que diga lo que pasa adentro.',
      pie: 'El Frontón México, por fuera. Es monumento con valor artístico: su fachada no se toca.',
      marca: 'Foto real',
      posicion: '50% 40%',
    },
  },
  {
    id: 'pelota',
    titulo: 'En Pelota Mestiza y sus cenas',
    propiedades: ['pelota', 'experiencias'],
    foto: {
      src: F + 'pelota-mestiza-salon.jpg',
      alt: 'Foto real: el salón de Pelota Mestiza.',
      pie: 'Pelota Mestiza, dentro del Frontón',
      marca: 'Foto real',
    },
  },
]

export type Fortaleza = { titulo: string; texto: string; foto: string; posicion?: string; alt: string }

export const FORTALEZAS: readonly Fortaleza[] = [
  {
    titulo: 'Una obra que se recomienda',
    texto: 'Quien ve Malinche sale contento y la recomienda.',
    foto: '/fortaleza/calendario-guerrero.jpg',
    posicion: '50% 30%',
    alt: 'Una escena de Malinche: un guerrero con penacho frente al calendario.',
  },
  {
    titulo: 'Un edificio único',
    texto: 'El Frontón México, junto al Monumento a la Revolución: teatro, suites, salas y bares.',
    foto: '/fortaleza/fachada.jpg',
    posicion: '50% 40%',
    alt: 'La fachada roja del Frontón México.',
  },
  {
    titulo: 'Cocina con historia',
    texto: 'Pelota Mestiza y sus cenas a cuatro manos con chefs invitados, los miércoles.',
    foto: '/fortaleza/pelota-comedor.jpg',
    alt: 'Una mesa servida en Pelota Mestiza.',
  },
  {
    titulo: 'Una causa cultural',
    texto: 'Cuenta nuestra historia y nuestra identidad, con voces como la de Juan Miguel Zunzunegui.',
    foto: '/fortaleza/pasillo-calendario.jpg',
    posicion: '30% 50%',
    alt: 'La piedra del calendario en un pasillo del Frontón.',
  },
]

/** Qué es cada unidad, en tres o cuatro palabras, junto a su logo: la Sra. María Laura no conoce las marcas. */
export const QUE_ES: Readonly<Partial<Record<Unidad, string>>> = {
  'promo-espacio': 'Pantallas y publicidad',
  'house-of-films': 'Producción de video',
  'marketing-united': 'Activaciones y experiencias',
  'grupo-upax': 'Marketing Corporativo',
  zeus: 'App de colaboradores',
  uix: 'Diseño de experiencia',
  neracode: 'Software a la medida',
  'research-land': 'Investigación de mercado',
}

/** Lo que se ve de cada propuesta, en grande. */
export type Visual =
  /** Hoy y con la propuesta, el mismo encuadre lado a lado; debajo, una tira de imágenes. */
  | { tipo: 'antesDespues'; hoy: Imagen; con: Imagen; tira: readonly Imagen[] }
  /** Una imagen principal y, si hace falta, una tira debajo. */
  | { tipo: 'foto'; principal: Imagen; tira?: readonly Imagen[] }
  /** Un dibujo hecho en la página (rotulado «Ilustración»). */
  | { tipo: 'dibujo'; dibujo: 'telefono' | 'invitacion' | 'boletera' | 'uix' | 'encuesta'; pie: string }
  /** Las simulaciones que mandó la unidad, a su tamaño, sobre un escenario: el teléfono y sus tarjetas. */
  | { tipo: 'maquetas'; telefono: Imagen; tarjetas: readonly Imagen[]; pie: string }

/**
 * Lo que aporta una unidad. `estado`: «listo» (acordado y listo para arrancar), «curso» (ya empezó) o «siguiente» (para
 * la siguiente temporada). Nada va como «ya conseguido»: Promo Espacio aclaró que lo de la ciudad es una oferta.
 */
export type Aporte = { unidad: Unidad; titulo: string; texto: string; estado?: 'listo' | 'curso' | 'siguiente' }

export type Propuesta = {
  /** Identificador de la pantalla. */
  id: string
  propiedad: Propiedad
  /** Lo que buscamos para esa parte, en una frase llana: es el titular de la pantalla. */
  titulo: string
  aportes: readonly Aporte[]
  /** Los problemas que atiende, por número. */
  resuelve: readonly number[]
  nota?: string
  visual: Visual
}

/** Lo que proponemos, por parte: Malinche, el Frontón, Pelota Mestiza y las experiencias gastronómicas. */
export const PROPUESTAS: readonly Propuesta[] = [
  {
    id: 'malinche-ciudad',
    propiedad: 'malinche',
    titulo: 'Que toda la ciudad sepa que Malinche está en el Frontón.',
    aportes: [
      {
        unidad: 'promo-espacio',
        titulo: 'Malinche en nuestras pantallas',
        texto: 'Con sus días y horarios, en los paraderos CETRAM, Forum Buenavista, TeleUrban y las 1,211 sucursales de Banco Azteca y Elektra.',
        estado: 'listo',
      },
      {
        unidad: 'marketing-united',
        titulo: 'Personajes y un stand donde está la gente',
        texto: 'En la plancha del Monumento, corporativos, escuelas y plazas; para turistas, embajadas, hoteles y recorridos de Turibus.',
      },
      {
        unidad: 'house-of-films',
        titulo: 'El spot y la publicidad de Malinche',
        texto: 'El guion, el spot y las piezas para redes; y revisar y ajustar lo que hoy publica.',
      },
      {
        unidad: 'grupo-upax',
        titulo: 'Nuestros clientes y la prensa',
        texto: 'Una invitación con un beneficio para ver Malinche, y los editores que nos publican, invitados a una función.',
      },
    ],
    resuelve: [1, 6],
    nota: 'La fachada del Frontón no se toca: afuera, todo va en la plancha y en la ciudad.',
    visual: {
      tipo: 'foto',
      principal: {
        src: F + 'anuncio-malinche.jpg',
        alt: 'Simulación: el anuncio de Malinche para pantallas, con la protagonista, el logo, los días y horarios de función y dónde comprar boletos.',
        pie: 'El anuncio de Malinche, como iría en nuestras pantallas',
        marca: 'Simulación',
        proporcion: '16 / 9',
      },
    },
  },
  {
    id: 'malinche-compra',
    propiedad: 'malinche',
    titulo: 'Que comprar Malinche sea fácil para todos.',
    aportes: [
      {
        unidad: 'uix',
        titulo: 'Cómo se compra, paso por paso',
        texto: 'Revisamos cómo se entera la gente, cómo compra y qué vive en la función, y proponemos mejoras.',
        estado: 'curso',
      },
      {
        unidad: 'marketing-united',
        titulo: 'Un kit para empresas',
        texto: 'Boletos para su gente, un rally y una muestra de la obra en sus oficinas.',
      },
      {
        unidad: 'zeus',
        titulo: 'En el teléfono de los colaboradores',
        texto: 'Boletos con beneficio y avisos dentro de Zeus, la app de Grupo Salinas. Lo construye NeraCode.',
      },
      { unidad: 'neracode', titulo: 'Su boletera, reforzada', texto: 'Segura, que no se caiga y fácil de usar.', estado: 'siguiente' },
      {
        unidad: 'research-land',
        titulo: 'Quién más puede venir',
        texto: 'A quién invitar, qué lo detiene y qué se dice de la obra.',
        estado: 'siguiente',
      },
    ],
    resuelve: [2, 3, 4, 5],
    visual: { tipo: 'dibujo', dibujo: 'telefono', pie: 'El boleto, en el teléfono del colaborador' },
  },
  {
    id: 'fronton-pantallas',
    propiedad: 'fronton',
    titulo: 'Que las pantallas del Frontón trabajen y dejen ingresos.',
    aportes: [
      {
        unidad: 'promo-espacio',
        titulo: 'Lobby, taquilla y barras',
        texto: 'Conectamos sus pantallas a nuestros reproductores: el menú, la función y el patrocinador del día, cambiados a distancia.',
      },
      {
        unidad: 'promo-espacio',
        titulo: 'Las pantallas grandes del escenario',
        texto: 'Les ponemos nuestra plataforma para anunciar marcas antes de la función y en el intermedio.',
      },
      {
        unidad: 'promo-espacio',
        titulo: 'Patrocinadores que paguen',
        texto: 'Vendemos esos espacios a marcas: las pantallas empiezan a dejar ingresos.',
      },
      {
        unidad: 'promo-espacio',
        titulo: 'Posters LED, suites y algo distinto',
        texto: 'Posters LED en el acceso, pantallas en las suites y, para lo innovador que pidieron, banners que simulan fuego.',
      },
    ],
    resuelve: [8, 9, 10],
    nota: 'Todo con equipo que ya tenemos. Primero, una revisión técnica con su equipo de tecnología.',
    visual: {
      tipo: 'antesDespues',
      hoy: {
        src: F + 'pe-taquilla-hoy.jpg',
        alt: 'Foto real: la pantalla de la taquilla del Frontón, apagada.',
        pie: 'La pantalla de taquilla · foto real',
        marca: 'Hoy',
      },
      con: {
        src: F + 'pe-taquilla.jpg',
        alt: 'Simulación: la misma pantalla de taquilla, encendida con el anuncio de Malinche: días, horarios y dónde comprar.',
        pie: 'La misma pantalla, vendiendo la función · simulación',
        marca: 'Con Promo Espacio',
      },
      tira: [
        {
          src: F + 'pe-barra.jpg',
          alt: 'Simulación: las pantallas de las barras del lobby, encendidas con el menú y la función del día.',
          pie: 'Las barras, con su menú',
          marca: 'Simulación',
        },
        {
          src: F + 'pe-poster.jpg',
          alt: 'Simulación: un poster LED de Promo Espacio con el anuncio de Malinche.',
          pie: 'Un poster LED como los que instalaríamos',
          marca: 'Simulación',
        },
      ],
    },
  },
  {
    id: 'fronton-renta',
    propiedad: 'fronton',
    titulo: 'Que el Frontón se rente toda la semana.',
    aportes: [
      {
        unidad: 'marketing-united',
        titulo: 'Cada espacio, frente a quien lo puede rentar',
        texto: 'El teatro para convenciones, Templo Canalla para lanzamientos, los bares para celebraciones y la Sala de Consejo para juntas, cada uno con su página para pedirlo.',
      },
      {
        unidad: 'marketing-united',
        titulo: 'De lunes a miércoles',
        texto: 'Exámenes de escuelas de música y de arte dramático, cine, catas y noches prehispánicas.',
      },
      {
        unidad: 'promo-espacio',
        titulo: 'El Frontón, en nuestras pantallas',
        texto: 'Lo anunciamos como sede para eventos de empresas, con nuestros socios.',
        estado: 'listo',
      },
      {
        unidad: 'house-of-films',
        titulo: 'Locación para nuestros clientes',
        texto: 'Traemos a filmar a nuestros clientes y grabamos ahí contenido de entretenimiento.',
      },
      {
        unidad: 'uix',
        titulo: 'Su presentación comercial, rediseñada',
        texto: 'Los documentos con los que se vende el Frontón, a la altura del lugar.',
      },
    ],
    resuelve: [6, 7],
    visual: {
      tipo: 'maquetas',
      telefono: {
        src: F + 'mu-reel.jpg',
        alt: 'Simulación de Marketing United: un video para redes en el bar Última Noche, en un teléfono.',
        pie: 'Un video para redes en Última Noche',
        marca: 'Simulación',
      },
      tarjetas: [
        {
          src: F + 'mu-formulario.jpg',
          alt: 'Simulación de Marketing United: el formulario para pedir disponibilidad de un espacio, con fecha, horario, asistentes y WhatsApp.',
          pie: 'Pedir disponibilidad de un espacio',
          marca: 'Simulación',
        },
      ],
      pie: 'Así lo propone Marketing United',
    },
  },
  {
    id: 'pelota',
    propiedad: 'pelota',
    titulo: 'Que Pelota Mestiza sea destino, con o sin función.',
    aportes: [
      {
        unidad: 'marketing-united',
        titulo: 'Celebraciones y reuniones',
        texto: 'Aniversarios, fin de año, comidas de negocios y reuniones de empresas.',
      },
      {
        unidad: 'marketing-united',
        titulo: 'Que la encuentren y reserven',
        texto: 'En Instagram y Google Maps, con menú y fotos, y reservación por WhatsApp u OpenTable.',
      },
      {
        unidad: 'marketing-united',
        titulo: 'Menús de temporada y clientes frecuentes',
        texto: 'Un motivo nuevo para volver, avisado por correo y WhatsApp a quienes ya fueron.',
      },
      {
        unidad: 'house-of-films',
        titulo: '«Noche de Jueves»',
        texto: 'El podcast con Juan Miguel Zunzunegui, grabado ahí y con Pelota Mestiza como patrocinador.',
      },
    ],
    resuelve: [11],
    visual: {
      tipo: 'foto',
      principal: {
        src: F + 'mu-pelota.jpg',
        alt: 'Simulación de Marketing United: Pelota Mestiza en Instagram y Google Maps, con menú, reservación de mesa y experiencias para grupos.',
        pie: 'Así lo propone Marketing United',
        marca: 'Simulación',
        proporcion: '16 / 10',
      },
    },
  },
  {
    id: 'experiencias',
    propiedad: 'experiencias',
    titulo: 'Que sus cenas y experiencias se llenen.',
    aportes: [
      {
        unidad: 'marketing-united',
        titulo: 'Una cena con la historia de Malinche',
        texto: 'La historia, proyectada sobre la mesa mientras se cena.',
      },
      {
        unidad: 'marketing-united',
        titulo: 'Escuelas de gastronomía',
        texto: 'Concursos y cierres de curso con la chef Lula: cocinar en la cocina de Pelota Mestiza.',
      },
      {
        unidad: 'marketing-united',
        titulo: 'Grupos y empresas',
        texto: 'Una forma sencilla de pedir una cena para grupo, y reuniones y offsites de corporativos.',
      },
      {
        unidad: 'marketing-united',
        titulo: 'Recorridos de noche',
        texto: 'Recorridos que terminen en una cena o en el bar.',
      },
    ],
    resuelve: [12],
    visual: {
      tipo: 'foto',
      principal: {
        src: F + 'pelota-le-petit-malinche.jpg',
        alt: 'Ilustración: una cena en Pelota Mestiza con la historia de Malinche proyectada sobre la mesa.',
        pie: 'La historia de Malinche, proyectada sobre la mesa',
        marca: 'Ilustración',
      },
    },
  },
]

export type Paso = { que: string; quien: readonly Unidad[]; conseguido?: boolean }

/**
 * EL PLAN DE ACCIÓN, por tiempo: lo de esta semana, cada mes hasta el cierre de temporada y, aparte, lo que es para la
 * siguiente. Sobre la ruta que Ceci aprobó el 20-oct («está bueno»); en la sala pidieron «un plan de acción rápido».
 * Nada va como «ya corre»: lo de Promo Espacio en la ciudad es una oferta lista para arrancar (21-oct).
 */
export const PLAN: {
  columnas: readonly { cuando: string; etapa: string; pasos: readonly Paso[] }[]
  siguiente: readonly Paso[]
} = {
  columnas: [
    {
      cuando: 'Esta semana',
      etapa: 'Arranque',
      pasos: [
        { que: 'Revisión técnica de las pantallas del Frontón con su equipo', quien: ['promo-espacio'] },
        { que: 'Revisión de cómo se compra Malinche', quien: ['uix'] },
        { que: 'Un responsable por unidad', quien: ['grupo-upax'] },
      ],
    },
    {
      cuando: 'Noviembre',
      etapa: 'Que se vea',
      pasos: [
        { que: 'Malinche en nuestras pantallas, y las del Frontón encendidas', quien: ['promo-espacio'] },
        { que: 'El spot y las piezas para redes', quien: ['house-of-films'] },
        { que: 'Personajes, stand y Track Day (8 de noviembre)', quien: ['marketing-united'] },
        { que: 'Invitación a nuestros clientes y a la prensa', quien: ['grupo-upax'] },
      ],
    },
    {
      cuando: 'Diciembre',
      etapa: 'Fin de año',
      pasos: [
        { que: 'Funciones, cenas y fiestas de empresas', quien: ['marketing-united', 'grupo-upax'] },
        { que: 'Cada espacio del Frontón, con su página para rentarlo', quien: ['marketing-united', 'uix'] },
        { que: 'Aviso y beneficio para colaboradores', quien: ['zeus', 'neracode'] },
      ],
    },
    {
      cuando: '30 de enero',
      etapa: 'Cierre de temporada',
      pasos: [{ que: 'Resultados de cada unidad y plan 2027', quien: ['grupo-upax'] }],
    },
  ],
  siguiente: [
    { que: 'La boletera, reforzada', quien: ['neracode'] },
    { que: 'Quién más puede venir y qué se dice de Malinche', quien: ['research-land'] },
  ],
}
