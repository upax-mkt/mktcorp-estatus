import type { Unidad } from './comun'

/**
 * EL TEXTO DE LA PIEZA, en un solo lugar (ronda 4, 21-oct-2026).
 *
 * Ceci vio la versión anterior el 20-oct y pidió otra cosa (Notas de Voz «Feedback Ceci Fortaleza Mexicana 1» y
 * «UPAX GS 10»): primero el dolor, «si no conoces el antecedente y el dolor, no sabes qué arreglar»; después por qué
 * creemos en Fortaleza Mexicana; y al final cómo ayuda cada unidad, en un dibujo con Fortaleza al centro y cada
 * unidad alrededor, como botones que se despliegan. Sin jerga, que se entienda sin que nadie lo explique, con
 * ejemplos y sin prometer el lleno: «mi trabajo es ofrecerte todas estas herramientas».
 *
 * Fuente de cada dolor y de cada acción: `~/CMO Copilot/sesiones/2026-10-20-fortaleza-presentacion/guion-tecnico.md`,
 * sección «Ronda 4». Nada lleva precio. Solo se compromete lo que cada unidad mandó o acordó.
 */

export type Dolor = {
  n: number
  titulo: string
  texto: string
  /** Las unidades que lo atienden, en el orden en que aparecen en «Cómo podemos ayudar». */
  atienden: readonly Unidad[]
}

export const DOLORES: readonly Dolor[] = [
  {
    n: 1,
    titulo: 'Casi nadie se entera',
    texto: 'Malinche tiene poca publicidad: se ve poco en la ciudad y le falta material para anunciarse.',
    atienden: ['promo-espacio', 'house-of-films', 'marketing-united', 'grupo-upax'],
  },
  {
    n: 2,
    titulo: 'Las pantallas del Frontón no venden',
    texto: 'Las del lobby y la taquilla se cambian a mano, con una memoria USB, y las del escenario no se aprovechan.',
    atienden: ['promo-espacio', 'house-of-films'],
  },
  {
    n: 3,
    titulo: 'Pocos saben que el Frontón se renta',
    texto: 'Casi nadie lo piensa como sede de eventos, y de lunes a miércoles el teatro no se usa.',
    atienden: ['marketing-united', 'house-of-films'],
  },
  {
    n: 4,
    titulo: 'A una empresa le cuesta comprar',
    texto: 'No hay paquetes para empresas a la vista y en línea se venden hasta 8 boletos por compra.',
    atienden: ['marketing-united', 'grupo-upax', 'uix'],
  },
  {
    n: 5,
    titulo: 'La boletera propia todavía no está lista',
    texto: 'Para competir con Ticketmaster necesita seguridad, aguantar mucha venta a la vez y una compra fácil.',
    atienden: ['uix', 'neracode'],
  },
  {
    n: 6,
    titulo: 'Los colaboradores del grupo no se enteran',
    texto: 'No hay un canal para ofrecerles boletos con beneficio ni para saber si el aviso les llegó.',
    atienden: ['house-of-films', 'zeus', 'neracode'],
  },
  {
    n: 7,
    titulo: 'No sabemos quién más puede venir',
    texto: 'La obra gusta a quien la ve, pero falta saber a quién invitar, qué detiene a los demás y quién regresaría.',
    atienden: ['research-land'],
  },
  {
    n: 8,
    titulo: 'Pelota Mestiza todavía no es destino',
    texto: 'Los restaurantes de enfrente se llenan, y las cenas de los miércoles buscan quién ocupe sus mesas.',
    atienden: ['marketing-united', 'grupo-upax'],
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

/** Una imagen de ejemplo: una foto (montaje o ilustración) o un dibujo hecho en la página. */
export type Ejemplo =
  | {
      tipo: 'foto'
      src: string
      alt: string
      pie: string
      marca?: 'Simulación' | 'Ilustración'
      posicion?: string
    }
  | { tipo: 'telefono' | 'recorrido' | 'boletera' | 'invitacion'; pie: string }

export type Accion = { titulo: string; texto: string; hecho?: boolean }

export type Ayuda = {
  unidad: Unidad
  /** Lo que hace, en dos o tres palabras: va debajo de su logo en el dibujo. */
  rotulo: string
  frase: string
  resuelve: readonly number[]
  acciones: readonly Accion[]
  /** Quién lo opera, cuando no es la unidad misma. */
  nota?: string
  ejemplos: readonly Ejemplo[]
}

/** Las unidades en el dibujo, en el sentido del reloj desde arriba. */
export const AYUDA: readonly Ayuda[] = [
  {
    unidad: 'promo-espacio',
    rotulo: 'Pantallas',
    frase: 'Encendemos las pantallas del Frontón y llevamos Malinche a las pantallas de la ciudad.',
    resuelve: [1, 2],
    acciones: [
      {
        titulo: 'En el Frontón',
        texto:
          'Las 10 pantallas de las barras y la de taquilla, programadas desde una oficina, sin memorias USB.',
      },
      {
        titulo: 'En el escenario y las suites',
        texto: 'Las del escenario y las de las suites, con contenido que vende en el intermedio y espacio para patrocinadores.',
      },
      {
        titulo: 'En todas las tiendas',
        texto: 'Malinche, el Frontón y Pelota Mestiza en las pantallas de las 1,211 tiendas Elektra y Banco Azteca.',
      },
      {
        titulo: 'En la ciudad',
        texto: 'Malinche en las pantallas de nuestros socios en Forum, los CETRAM y TeleUrban.',
        hecho: true,
      },
      { titulo: 'En la calle', texto: 'Un mapa de los mejores lugares para anunciar Malinche en la ciudad.' },
    ],
    ejemplos: [
      {
        tipo: 'foto',
        src: '/fortaleza/pe-barra.jpg',
        alt: 'Simulación: las pantallas de las barras del lobby del Frontón, encendidas con Malinche.',
        pie: 'Las pantallas de las barras',
        marca: 'Simulación',
      },
      {
        tipo: 'foto',
        src: '/fortaleza/pe-taquilla.jpg',
        alt: 'Simulación: la pantalla de la taquilla del Frontón, encendida con Malinche.',
        pie: 'La pantalla de taquilla',
        marca: 'Simulación',
      },
      {
        tipo: 'foto',
        src: '/fortaleza/pe-poster.jpg',
        alt: 'Simulación: Malinche en un poster LED de la red de Promo Espacio.',
        pie: 'Un poster LED de nuestra red',
        marca: 'Simulación',
        posicion: '100% 50%',
      },
    ],
  },
  {
    unidad: 'house-of-films',
    rotulo: 'Video',
    frase: 'Hacemos la publicidad en video de Malinche y del Frontón.',
    resuelve: [1, 2, 3, 6],
    acciones: [
      { titulo: 'El spot de Malinche', texto: 'Del guion a la producción, con sus versiones para redes y para las pantallas.' },
      { titulo: 'El video del Frontón', texto: 'Sus espacios, para ofrecerlos a empresas y eventos.' },
      { titulo: 'Lo que pasa en las pantallas', texto: 'El contenido de las pantallas del lobby, las suites y el escenario.' },
      {
        titulo: 'Cápsulas «¿Sabías que?»',
        texto: 'Con Juan Miguel Zunzunegui, para redes y para los colaboradores del grupo.',
      },
    ],
    ejemplos: [
      {
        tipo: 'foto',
        src: '/fortaleza/hof-rodaje.jpg',
        alt: 'Ilustración: un rodaje en el escenario del Frontón.',
        pie: 'Un rodaje en el escenario del Frontón',
        marca: 'Ilustración',
      },
    ],
  },
  {
    unidad: 'marketing-united',
    rotulo: 'Activaciones',
    frase: 'Llevamos Malinche a donde está la gente.',
    resuelve: [1, 3, 4, 8],
    acciones: [
      {
        titulo: 'Un stand que viaja',
        texto:
          'Con pantallas y personajes, vende boletos en corporativos, escuelas y plazas. Ya montamos uno para la fiesta de Ricardo Salinas.',
      },
      {
        titulo: 'Turistas y visitantes',
        texto: 'Embajadas, hoteles, agencias de viaje y rutas de Turibus que terminen en el Frontón.',
      },
      {
        titulo: 'Empresas',
        texto: 'Un kit con boletos, rally, showcase y cena, y el Frontón en nuestro catálogo de sedes.',
      },
      {
        titulo: 'De lunes a miércoles',
        texto: 'Escuelas de música y de arte dramático, cine, catas y noches prehispánicas.',
      },
      {
        titulo: 'Pelota Mestiza',
        texto: 'Menús de temporada, la chef Lula y «Le Petit Malinche»: la historia proyectada sobre la mesa.',
      },
      {
        titulo: 'En los autos',
        texto: 'Flyers de Malinche en autos y motos de apps en Pedregal, Lomas y Polanco.',
        hecho: true,
      },
    ],
    ejemplos: [
      {
        tipo: 'foto',
        src: '/fortaleza/pelota-le-petit-malinche.jpg',
        alt: 'Ilustración: una cena en Pelota Mestiza con la historia de Malinche proyectada sobre la mesa.',
        pie: '«Le Petit Malinche»: la historia, sobre la mesa',
        marca: 'Ilustración',
      },
    ],
  },
  {
    unidad: 'grupo-upax',
    rotulo: 'Clientes y prensa',
    frase: 'Abrimos nuestra red: clientes, directivos y prensa.',
    resuelve: [1, 4, 8],
    acciones: [
      {
        titulo: 'Nuestros clientes',
        texto: 'Los invitamos con una comunicación de Grupo UPAX y con los comerciales de cada unidad, con un beneficio por ser clientes.',
      },
      {
        titulo: 'Los directivos del grupo',
        texto: 'Les ofrecemos las mesas de las cenas de los miércoles y funciones para sus equipos.',
      },
      { titulo: 'La prensa', texto: 'Invitamos a ver Malinche a los editores que publican a Grupo UPAX.' },
    ],
    nota: 'Lo coordina Marketing Corporativo.',
    ejemplos: [{ tipo: 'invitacion', pie: 'La invitación a nuestros clientes' }],
  },
  {
    unidad: 'zeus',
    rotulo: 'Colaboradores',
    frase: 'Los boletos llegan a los colaboradores del grupo, en la app que ya usan.',
    resuelve: [6],
    acciones: [
      {
        titulo: 'Boletos con beneficio',
        texto: 'Funciones, compra y boleto digital con QR, con el beneficio para colaboradores.',
      },
      { titulo: 'Avisos que sí llegan', texto: 'Por empresa, área o ubicación, y sabiendo quién los leyó.' },
    ],
    nota: 'Lo construye NeraCode dentro de Zeus, la plataforma de Capital Humano del grupo.',
    ejemplos: [{ tipo: 'telefono', pie: 'El boleto, en el teléfono del colaborador' }],
  },
  {
    unidad: 'neracode',
    rotulo: 'Boletera',
    frase: 'Una boletera a la altura del software que desarrollamos.',
    resuelve: [5, 6],
    acciones: [
      {
        titulo: 'La boletera de Fortaleza',
        texto: 'Segura, lista para mucha venta a la vez y fácil de usar, con las mejoras que salgan de la revisión de UiX.',
      },
      { titulo: 'Dentro de Zeus', texto: 'El módulo de boletos y avisos para los colaboradores del grupo.' },
    ],
    ejemplos: [{ tipo: 'boletera', pie: 'Comprar, en tres pasos' }],
  },
  {
    unidad: 'uix',
    rotulo: 'La compra',
    frase: 'Una compra fácil, de principio a fin.',
    resuelve: [4, 5],
    acciones: [
      {
        titulo: 'El recorrido de quien compra',
        texto: 'Revisamos cómo descubren Malinche, cómo compran, qué encuentran en la función y qué pasa después, y proponemos cómo mejorarlo.',
      },
      {
        titulo: 'Una oferta que se entiende',
        texto: 'La presentación comercial del Frontón y sus paquetes, rediseñados para que se entiendan y se vendan.',
      },
    ],
    ejemplos: [{ tipo: 'recorrido', pie: 'El recorrido que revisamos' }],
  },
  {
    unidad: 'research-land',
    rotulo: 'El público',
    frase: 'Averiguamos quién más puede venir y qué lo haría volver.',
    resuelve: [7],
    acciones: [
      { titulo: 'A quién invitar', texto: 'Qué públicos conviene invitar y qué los detiene hoy.' },
      { titulo: 'Quién regresaría', texto: 'Qué tan contentos salen quienes ya fueron y si la recomiendan.' },
      { titulo: 'Qué se dice', texto: 'Lo que se habla de Malinche en redes y en medios.' },
      { titulo: '«Noche de Jueves»', texto: 'Nuestro podcast, grabado en el Frontón con Juan Miguel Zunzunegui.' },
    ],
    ejemplos: [
      {
        tipo: 'foto',
        src: '/fortaleza/rl-encuesta.jpg',
        alt: 'Ilustración: una encuesta a la salida de la función, en el lobby del Frontón.',
        pie: 'Una encuesta a la salida de la función',
        marca: 'Ilustración',
      },
    ],
  },
]

export type Paso = { que: string; quien: string }
export type Mes = { mes: string; etapa: string; pasos: readonly Paso[] }

/** La ruta que Ceci aprobó el 20-oct («está bueno»), ahora con quién hace cada cosa. */
export const PLAN: readonly Mes[] = [
  {
    mes: 'Octubre',
    etapa: 'Arranque',
    pasos: [
      { que: 'Un responsable por unidad', quien: 'Grupo UPAX' },
      { que: 'Pantallas del Frontón conectadas', quien: 'Promo Espacio' },
      { que: 'Revisión de la compra', quien: 'UiX' },
    ],
  },
  {
    mes: 'Noviembre',
    etapa: 'Primeros resultados',
    pasos: [
      { que: 'Malinche en tiendas y en la ciudad', quien: 'Promo Espacio' },
      { que: 'Spot y video del Frontón', quien: 'House of Films' },
      { que: 'Kit para empresas y Track Day (8 de noviembre)', quien: 'Marketing United' },
      { que: 'Invitación a clientes y prensa', quien: 'Grupo UPAX' },
    ],
  },
  {
    mes: 'Diciembre',
    etapa: 'Fin de año',
    pasos: [
      { que: 'Funciones y fiestas de empresas', quien: 'Marketing United · Grupo UPAX' },
      { que: 'Aviso y beneficio para colaboradores', quien: 'Zeus · NeraCode' },
      { que: 'Menús de temporada en Pelota Mestiza', quien: 'Marketing United' },
    ],
  },
  {
    mes: 'Enero',
    etapa: 'Cierre de temporada',
    pasos: [
      { que: 'Lo que dice el público', quien: 'Research Land' },
      { que: 'Resultados y plan 2027', quien: 'Todas las unidades' },
    ],
  },
]
