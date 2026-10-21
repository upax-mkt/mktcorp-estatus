import type { Unidad } from './comun'

/**
 * EL TEXTO DE LA PIEZA, en un solo lugar (rondas 4 y 5, 21-oct-2026).
 *
 * Ceci vio la versión anterior el 20-oct y pidió otra cosa (Notas de Voz «Feedback Ceci Fortaleza Mexicana 1» y
 * «UPAX GS 10»): primero el dolor, «si no conoces el antecedente y el dolor, no sabes qué arreglar»; después por qué
 * creemos en Fortaleza Mexicana; y al final cómo ayuda cada unidad, en un dibujo con Fortaleza al centro y cada
 * unidad alrededor. Sin jerga, que se entienda sin que nadie lo explique, con ejemplos y sin prometer el lleno: «mi
 * trabajo es ofrecerte todas estas herramientas».
 *
 * Ronda 5 (21-oct): Franco, «no está wow, no es claro lo que harán las UDNs, debe ser autoexplicativa». Cada unidad
 * tiene su propia pantalla, en orden, con qué es, lo que hará en una frase y lo que produce en grande («que ponga lo
 * que produce… así se ve Malinche montada», Ceci). Ajustada con una revisión independiente contra las palabras de
 * Ceci y con el complemento digital que mandó Marketing United el 20-oct (Antonio Santos).
 *
 * Fuente de cada dolor y de cada acción: `~/CMO Copilot/sesiones/2026-10-20-fortaleza-presentacion/guion-tecnico.md`,
 * secciones «Ronda 4» y «Ronda 5». Nada lleva precio. Solo se compromete lo que cada unidad mandó o acordó.
 */

/** Una imagen: foto real, montaje o ilustración generada, con lo que es escrito en su esquina. */
export type Imagen = { src: string; alt: string; pie: string; marca: string; posicion?: string }

export type Dolor = {
  n: number
  titulo: string
  /** Una frase corta: así se nombra en el «Resuelve» de cada unidad. */
  corto: string
  texto: string
  /** Las unidades que lo atienden, en el orden en que aparecen en sus pantallas. */
  atienden: readonly Unidad[]
  /** La prueba, cuando hay una foto real. */
  evidencia?: Imagen
}

export const DOLORES: readonly Dolor[] = [
  {
    n: 1,
    titulo: 'Casi nadie se entera',
    corto: 'Casi nadie se entera',
    texto: 'Malinche se ve poco fuera del Frontón y le falta material para anunciarse.',
    atienden: ['promo-espacio', 'house-of-films', 'marketing-united', 'grupo-upax'],
  },
  {
    n: 2,
    titulo: 'Las pantallas del Frontón no venden',
    corto: 'Las pantallas no venden',
    texto: 'Las del lobby y la taquilla se cambian a mano, con una memoria USB, y las del escenario no se aprovechan.',
    atienden: ['promo-espacio'],
    evidencia: {
      src: '/fortaleza/pe-taquilla-hoy.jpg',
      alt: 'Foto real: la pantalla de la taquilla del Frontón, apagada.',
      pie: 'La pantalla de taquilla, hoy',
      marca: 'Foto real',
    },
  },
  {
    n: 3,
    titulo: 'Pocos saben que el Frontón se renta',
    corto: 'Pocos rentan el Frontón',
    texto: 'Casi nadie lo piensa como sede de eventos, y de lunes a miércoles el teatro no se usa.',
    atienden: ['house-of-films', 'marketing-united', 'uix'],
  },
  {
    n: 4,
    titulo: 'A una empresa le cuesta comprar',
    corto: 'A las empresas les cuesta comprar',
    texto: 'No hay paquetes para empresas a la vista y en línea se venden hasta 8 boletos por compra.',
    atienden: ['marketing-united', 'grupo-upax', 'uix'],
  },
  {
    n: 5,
    titulo: 'La boletera propia todavía no está lista',
    corto: 'La boletera no está lista',
    texto: 'Para competir con Ticketmaster necesita seguridad, aguantar mucha venta a la vez y una compra fácil.',
    atienden: ['uix', 'neracode'],
  },
  {
    n: 6,
    titulo: 'Los colaboradores de Grupo Salinas no se enteran',
    corto: 'Los colaboradores no se enteran',
    texto: 'No hay un canal para ofrecerles boletos con beneficio ni para saber si el aviso les llegó.',
    atienden: ['house-of-films', 'zeus', 'neracode'],
  },
  {
    n: 7,
    titulo: 'Falta saber quién más vendría',
    corto: 'Falta saber quién más vendría',
    texto: 'La obra gusta a quien la ve, pero no se sabe a quién invitar ni qué detiene a los demás.',
    atienden: ['research-land'],
  },
  {
    n: 8,
    titulo: 'Pelota Mestiza todavía no es destino',
    corto: 'Pelota Mestiza no es destino',
    texto: 'Los restaurantes de enfrente se llenan, y las cenas de los miércoles buscan quién ocupe sus mesas.',
    atienden: ['marketing-united'],
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

/** Lo que se ve de cada unidad, en grande. */
export type Visual =
  /** Hoy y con la unidad, el mismo encuadre lado a lado; debajo, una tira de imágenes. */
  | { tipo: 'antesDespues'; hoy: Imagen; con: Imagen; tira: readonly Imagen[] }
  /** Una imagen principal y, si hace falta, una tira debajo. */
  | { tipo: 'foto'; principal: Imagen; tira?: readonly Imagen[] }
  /** Un dibujo hecho en la página (rotulado «Ilustración»). */
  | { tipo: 'dibujo'; dibujo: 'telefono' | 'invitacion' | 'boletera' | 'uix' | 'encuesta'; pie: string }
  /** Las simulaciones que mandó la unidad, a su tamaño, sobre un escenario: el teléfono y dos tarjetas. */
  | { tipo: 'maquetas'; telefono: Imagen; tarjetas: readonly Imagen[]; pie: string }

/** «Ya conseguido» cuando la unidad ya lo logró; «Listo para arrancar» cuando está acordado pero no corre. */
export type Accion = { titulo: string; texto: string; estado?: 'conseguido' | 'listo' }

export type PaginaDeUnidad = {
  /** Identificador de la pantalla (una unidad puede tener varias: Marketing United). */
  id: string
  unidad: Unidad
  /** Qué es la unidad, en tres o cuatro palabras, junto a su logo: la Sra. María Laura no conoce las marcas. */
  queEs: string
  /** Lo que hará, en una frase llana: es el titular de su pantalla. */
  titulo: string
  produce: readonly Accion[]
  resuelve: readonly number[]
  cuando: string
  nota?: string
  visual: Visual
}

const F = '/fortaleza/'

/** Una pantalla por unidad, en el orden de la historia: que se vea, que se use, que se compre, que se entienda. */
export const PAGINAS: readonly PaginaDeUnidad[] = [
  {
    id: 'promo-espacio',
    unidad: 'promo-espacio',
    queEs: 'Pantallas y publicidad en la ciudad',
    titulo: 'Encendemos las pantallas del Frontón y ponemos a Malinche en toda la ciudad.',
    produce: [
      {
        titulo: 'Las pantallas del Frontón',
        texto: 'Las 10 de las barras y la de taquilla, programadas a distancia, sin memorias USB.',
      },
      {
        titulo: 'El escenario y las suites',
        texto: 'Las pantallas laterales, con Malinche en movimiento y espacio para patrocinadores.',
      },
      { titulo: 'En todas las tiendas', texto: 'Malinche en las pantallas de 1,211 tiendas Elektra y Banco Azteca.' },
      {
        titulo: 'En la ciudad',
        texto: 'En las pantallas de nuestros socios: Forum, los paraderos CETRAM y TeleUrban.',
        estado: 'conseguido',
      },
    ],
    resuelve: [1, 2],
    cuando: 'Desde esta semana',
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
        alt: 'Simulación: la misma pantalla de taquilla, encendida con Malinche.',
        pie: 'La misma pantalla, con Malinche · simulación',
        marca: 'Con Promo Espacio',
      },
      tira: [
        {
          src: F + 'pe-escenario.jpg',
          alt: 'Simulación: la pantalla lateral del escenario del Frontón, encendida con Malinche, sobre una foto real del teatro.',
          pie: 'La pantalla lateral del escenario',
          marca: 'Simulación',
          posicion: '70% 40%',
        },
        {
          src: F + 'pe-barra.jpg',
          alt: 'Simulación: las pantallas de las barras del lobby del Frontón, encendidas con Malinche.',
          pie: 'Las pantallas de las barras',
          marca: 'Simulación',
        },
        {
          src: F + 'pe-tienda.jpg',
          alt: 'Ilustración: Malinche en una pantalla dentro de una tienda.',
          pie: 'En las tiendas',
          marca: 'Ilustración',
        },
      ],
    },
  },
  {
    id: 'house-of-films',
    unidad: 'house-of-films',
    queEs: 'Producción de video',
    titulo: 'Hacemos el spot de Malinche y el contenido para sus redes.',
    produce: [
      { titulo: 'El spot de Malinche', texto: 'Del guion a la producción, para redes, pantallas y aeropuertos.' },
      { titulo: 'Piezas para redes', texto: 'Material del show, listo para publicar.' },
      {
        titulo: 'Cápsulas «¿Sabías que?»',
        texto: 'Con Juan Miguel Zunzunegui, para redes y para los colaboradores de Grupo Salinas.',
      },
      { titulo: 'El Frontón, locación', texto: 'Traemos a nuestros clientes a filmar en sus espacios.' },
    ],
    resuelve: [1, 3, 6],
    cuando: 'Noviembre',
    visual: {
      tipo: 'foto',
      principal: {
        src: F + 'hof-rodaje.jpg',
        alt: 'Ilustración: un rodaje en el escenario del Frontón.',
        pie: 'Un rodaje en el escenario del Frontón',
        marca: 'Ilustración',
      },
    },
  },
  {
    id: 'marketing-united',
    unidad: 'marketing-united',
    queEs: 'Activaciones y experiencias',
    titulo: 'Llevamos a los personajes de Malinche a donde está la gente.',
    produce: [
      {
        titulo: 'Un stand que viaja',
        texto: 'Con pantallas y personajes, vende boletos en corporativos, escuelas y plazas. Ya montamos uno en un evento de Grupo Salinas.',
      },
      { titulo: 'Turistas y visitantes', texto: 'Embajadas, hoteles, agencias de viaje y rutas de Turibus que terminen en el Frontón.' },
      {
        titulo: 'En los autos',
        texto: 'Volantes de Malinche en autos y motos de Uber, DiDi y Rappi en Pedregal, Lomas y Polanco.',
        estado: 'listo',
      },
    ],
    resuelve: [1],
    cuando: 'Noviembre',
    visual: {
      tipo: 'foto',
      principal: {
        src: F + 'mu-cetram.jpg',
        alt: 'Ilustración: personajes de Malinche y una taquilla móvil en un CETRAM, bajo una pantalla que anuncia la obra.',
        pie: 'Personajes y taquilla móvil, bajo una pantalla del CETRAM',
        marca: 'Ilustración',
        posicion: '50% 45%',
      },
    },
  },
  {
    id: 'marketing-united-semana',
    unidad: 'marketing-united',
    queEs: 'Activaciones y experiencias',
    titulo: 'Hacemos que el Frontón y Pelota Mestiza se usen toda la semana.',
    produce: [
      {
        titulo: 'Para empresas',
        texto: 'Un paquete para su gente: boletos, un recorrido por el Frontón, una muestra de la obra y cena.',
      },
      { titulo: 'El Track Day de motos', texto: 'Malinche y una taquilla móvil en el Track Day del 8 de noviembre.' },
      { titulo: 'De lunes a miércoles', texto: 'Escuelas de música y de arte dramático, cine, catas y noches prehispánicas.' },
      { titulo: 'Pelota Mestiza', texto: 'Menús de temporada y una cena con la historia de Malinche proyectada sobre la mesa.' },
    ],
    resuelve: [3, 4, 8],
    cuando: 'Noviembre y diciembre',
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
  {
    id: 'marketing-united-renta',
    unidad: 'marketing-united',
    queEs: 'Activaciones y experiencias',
    titulo: 'Ponemos cada espacio del Frontón frente a quien lo puede rentar.',
    produce: [
      {
        titulo: 'Cada espacio, su cliente',
        texto: 'El teatro de lunes a miércoles, para convenciones; los bares, para celebraciones; la sala, para juntas.',
      },
      { titulo: 'Una página para pedirlo', texto: 'Fotos, montajes y capacidad de cada espacio, con formulario y WhatsApp.' },
      { titulo: 'Seguimiento hasta el contrato', texto: 'Cada solicitud se atiende hasta la visita y la firma.' },
      { titulo: 'Que lo encuentren', texto: 'Eventos y recorridos en LinkedIn e Instagram; Pelota Mestiza, en Google Maps.' },
    ],
    resuelve: [3, 8],
    cuando: 'Noviembre y diciembre',
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
          pie: 'Pedir disponibilidad',
          marca: 'Simulación',
        },
        {
          src: F + 'mu-grupos.jpg',
          alt: 'Simulación de Marketing United: la tarjeta para pedir una experiencia de grupo en Pelota Mestiza.',
          pie: 'Grupos en Pelota Mestiza',
          marca: 'Simulación',
        },
      ],
      pie: 'Así lo propone Marketing United',
    },
  },
  {
    id: 'grupo-upax',
    unidad: 'grupo-upax',
    queEs: 'Marketing Corporativo de Grupo UPAX',
    titulo: 'Abrimos nuestra red: invitamos a nuestros clientes y a la prensa.',
    produce: [
      {
        titulo: 'Nuestros clientes',
        texto: 'Una invitación de Grupo UPAX con un beneficio para ver Malinche; nuestros vendedores la llevan.',
      },
      { titulo: 'La prensa', texto: 'Los editores que publican a Grupo UPAX, invitados a ver Malinche.' },
    ],
    resuelve: [1, 4],
    cuando: 'Noviembre',
    visual: { tipo: 'dibujo', dibujo: 'invitacion', pie: 'La invitación a nuestros clientes' },
  },
  {
    id: 'zeus',
    unidad: 'zeus',
    queEs: 'La app de los colaboradores de Grupo Salinas',
    titulo: 'Ponemos a Malinche en el teléfono de los colaboradores de Grupo Salinas, con un beneficio para ir.',
    produce: [
      { titulo: 'Boletos con beneficio', texto: 'Funciones, compra y boleto digital con QR, dentro de Zeus.' },
      { titulo: 'Avisos que sí llegan', texto: 'Por empresa, área o ubicación, sabiendo quién los leyó.' },
    ],
    resuelve: [6],
    cuando: 'Diciembre',
    nota: 'Lo construye NeraCode dentro de Zeus.',
    visual: { tipo: 'dibujo', dibujo: 'telefono', pie: 'El boleto, en el teléfono del colaborador' },
  },
  {
    id: 'uix',
    unidad: 'uix',
    queEs: 'Diseño de experiencia',
    titulo: 'Hacemos fácil comprar Malinche y rentar el Frontón.',
    produce: [
      {
        titulo: 'Comprar Malinche',
        texto: 'Revisamos paso por paso cómo se entera la gente, cómo compra y qué vive en la función.',
      },
      { titulo: 'Rentar el Frontón', texto: 'La presentación comercial del Frontón y sus paquetes para empresas, rediseñados.' },
    ],
    resuelve: [3, 4, 5],
    cuando: 'Desde esta semana',
    visual: { tipo: 'dibujo', dibujo: 'uix', pie: 'La presentación del Frontón, rediseñada, y el recorrido de quien compra' },
  },
  {
    id: 'neracode',
    unidad: 'neracode',
    queEs: 'Software a la medida',
    titulo: 'Reforzamos su boletera: segura, que no se caiga y fácil de usar.',
    produce: [
      { titulo: 'Segura', texto: 'Con los protocolos de seguridad que hoy le faltan.' },
      { titulo: 'Que no se caiga', texto: 'Lista para mucha venta a la vez.' },
      { titulo: 'Fácil de usar', texto: 'Comprar en pocos pasos, desde el celular.' },
      { titulo: 'Dentro de Zeus', texto: 'El módulo de boletos para los colaboradores de Grupo Salinas.' },
    ],
    resuelve: [5, 6],
    cuando: 'Para la siguiente temporada',
    visual: { tipo: 'dibujo', dibujo: 'boletera', pie: 'Comprar, en tres pasos' },
  },
  {
    id: 'research-land',
    unidad: 'research-land',
    queEs: 'Investigación de mercado',
    titulo: 'Averiguamos quién más puede venir a ver Malinche y qué lo haría volver.',
    produce: [
      { titulo: 'A quién invitar', texto: 'Qué públicos conviene invitar y qué los detiene hoy.' },
      { titulo: 'Quién regresaría', texto: 'Qué tan contentos salen y si la recomiendan.' },
      { titulo: 'Qué se dice', texto: 'Lo que se habla de Malinche en redes y en medios.' },
      { titulo: '«Noche de Jueves»', texto: 'Nuestro podcast, grabado en el Frontón con Juan Miguel Zunzunegui.' },
    ],
    resuelve: [7],
    cuando: 'Para la siguiente temporada',
    visual: { tipo: 'dibujo', dibujo: 'encuesta', pie: 'Tres preguntas a la salida de la función' },
  },
]

/** Lo que va en el dibujo de «Fortaleza Mexicana, al centro»: cada unidad una vez, con lo que hace en dos palabras. */
export const INDICE: readonly { unidad: Unidad; rotulo: string; pagina: string }[] = [
  { unidad: 'promo-espacio', rotulo: 'Pantallas', pagina: 'promo-espacio' },
  { unidad: 'house-of-films', rotulo: 'Video', pagina: 'house-of-films' },
  { unidad: 'marketing-united', rotulo: 'Activaciones', pagina: 'marketing-united' },
  { unidad: 'grupo-upax', rotulo: 'Clientes y prensa', pagina: 'grupo-upax' },
  { unidad: 'zeus', rotulo: 'Colaboradores', pagina: 'zeus' },
  { unidad: 'uix', rotulo: 'La compra', pagina: 'uix' },
  { unidad: 'neracode', rotulo: 'Boletera', pagina: 'neracode' },
  { unidad: 'research-land', rotulo: 'El público', pagina: 'research-land' },
]

/** El nombre llano de lo que hace cada unidad (el del índice): así se dice en «Lo resolvemos con». */
export const ROTULO: Readonly<Partial<Record<Unidad, string>>> = Object.fromEntries(INDICE.map((i) => [i.unidad, i.rotulo]))

export type Paso = { que: string; quien: readonly Unidad[]; conseguido?: boolean }

/**
 * EL PLAN DE ACCIÓN, por tiempo: lo de esta semana, cada mes hasta el cierre de temporada y, aparte, lo que es para la
 * siguiente. Sobre la ruta que Ceci aprobó el 20-oct («está bueno»); en la sala pidieron «un plan de acción rápido».
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
        { que: 'Malinche en Forum, los CETRAM y TeleUrban', quien: ['promo-espacio'], conseguido: true },
        { que: 'Las pantallas del Frontón, conectadas', quien: ['promo-espacio'] },
        { que: 'Revisión de cómo se compra Malinche', quien: ['uix'] },
        { que: 'Un responsable por unidad', quien: ['grupo-upax'] },
      ],
    },
    {
      cuando: 'Noviembre',
      etapa: 'Que se vea',
      pasos: [
        { que: 'Malinche en las tiendas', quien: ['promo-espacio'] },
        { que: 'El spot y las piezas para redes', quien: ['house-of-films'] },
        { que: 'Stand, personajes y Track Day (8 de noviembre)', quien: ['marketing-united'] },
        { que: 'Invitación a nuestros clientes y a la prensa', quien: ['grupo-upax'] },
      ],
    },
    {
      cuando: 'Diciembre',
      etapa: 'Fin de año',
      pasos: [
        { que: 'Funciones y fiestas de empresas', quien: ['marketing-united', 'grupo-upax'] },
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
