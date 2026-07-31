/**
 * Quién puede ver y hacer qué. Funciones puras: no tocan cookies ni red, así
 * que valen igual en el proxy (Edge), en un Server Component y en un test.
 *
 * Dos roles, según el spec §4 ("solo el equipo Mkt Corp mueve el estatus"):
 *
 * - `equipo`  — Marketing Corporativo. Ve las 10 salas, prepara sesiones,
 *               maqueta, minuta y mueve acuerdos.
 * - `sala`    — el director de una UDN, que entra por un link firmado. Ve SU
 *               sala y SU deck, en solo lectura. Nada más.
 *
 * Criterio de diseño: lista blanca. Una ruta que nadie contempló se niega en
 * vez de abrirse — si mañana alguien añade /admin, no queda expuesta por
 * olvido.
 */
import type { Sesion } from './firma'

/** Rutas que deben responder sin sesión: si no, no habría forma de entrar. */
const RUTAS_PUBLICAS = ['/entrar', '/api/auth/slack/inicio', '/api/auth/slack/retorno']

/** Rutas de solo-equipo, por prefijo de primer segmento. */
const SECCIONES_DE_EQUIPO = ['deck']

/** Páginas que cuelgan de una sala y su director sí puede ver. */
const HIJAS_DE_SALA = ['benchmark']

/** Primer segmento y resto de una ruta: '/cliente/neracode' → ['cliente', 'neracode']. */
function segmentos(ruta: string): string[] {
  return ruta.split('/').filter((s) => s.length > 0)
}

export function esRutaPublica(ruta: string): boolean {
  if (RUTAS_PUBLICAS.includes(ruta)) return true
  // LA AGENDA COMPARTIDA, y solo ella.
  //
  // Exactamente dos segmentos: `/agenda/<token>` se abre, `/agenda` NO —esa es
  // la pantalla donde el equipo agenda las sesiones— y `/agenda/<token>/loquesea`
  // tampoco. Es la única ruta de esta app que responde sin sesión, así que la
  // condición es por forma exacta y no por prefijo: un `startsWith('/agenda')`
  // abriría la pantalla interna.
  //
  // Aquí NO se valida el token: la política decide por la forma de la ruta y la
  // página comprueba el token antes de leer un solo dato.
  const partes = segmentos(ruta)
  return partes.length === 2 && partes[0] === 'agenda'
}

/** Solo Mkt Corp escribe: mover estatus, editar fechas, maquetar, minutar. */
export function puedeEditar(sesion: Sesion | null): boolean {
  return sesion?.rol === 'equipo'
}

/**
 * Quién puede tocar los ACUERDOS de una sala.
 *
 * Marketing Corp, en todas. Y el director de una UDN, en la suya y solo en la
 * suya (Franco, 28-jul: "solo pueden editar los acuerdos y pendientes").
 *
 * Es la única excepción a "solo Mkt Corp escribe", y tiene sentido: un
 * acuerdo es un compromiso de la UDN. Que su dueño no pueda marcarlo como
 * cumplido obliga a pedirlo por Slack para que alguien lo teclee — el trámite
 * que esta app viene a quitar.
 *
 * NO alcanza a nada más: ni preparar sesiones, ni subir archivos, ni minutar,
 * ni tocar otra sala.
 */
export function puedeEditarAcuerdos(sesion: Sesion | null, slug: string): boolean {
  if (!sesion) return false
  if (sesion.rol === 'equipo') return true
  return sesion.rol === 'sala' && sesion.sala === slug
}

/** El equipo ve todas las salas; un acceso de sala, únicamente la suya. */
export function puedeVerSala(sesion: Sesion | null, slug: string): boolean {
  if (!sesion) return false
  if (sesion.rol === 'equipo') return true
  return sesion.sala === slug
}

/**
 * Si una sesión puede abrir una ruta. El proxy la usa para redirigir a
 * /entrar, pero NO es la única defensa: cada página vuelve a comprobar contra
 * la sesión real (ver src/auth/sesion.ts), como recomienda la guía de
 * autenticación de Next — el proxy es un chequeo optimista.
 */
export function puedeVerRuta(sesion: Sesion | null, ruta: string): boolean {
  if (esRutaPublica(ruta)) return true
  if (!sesion) return false
  if (sesion.rol === 'equipo') return true

  // A partir de aquí: rol 'sala'. Lista blanca estricta.
  const partes = segmentos(ruta)
  // `/api/archivo/<id>` es el mismo caso que `/reunion/<id>`: lleva un id, y
  // hasta no leer el archivo no se sabe de qué sala es. Pasa el filtro
  // optimista y la ruta comprueba contra la sala REAL del archivo antes de
  // servir un byte. Sin esto, un director no podría abrir los archivos de su
  // propia sala.
  if (partes.length === 3 && partes[0] === 'api' && partes[1] === 'archivo') return true
  // Las páginas que cuelgan de un cliente llevan su slug delante, así que
  // aquí SÍ se puede decidir: `/cliente/neracode/benchmark` es del director de
  // NeraCode y de nadie más. Lista blanca de hijas: una ruta nueva bajo
  // /cliente/<slug>/ no se abre por olvido.
  if (partes.length === 3 && partes[0] === 'cliente' && HIJAS_DE_SALA.includes(partes[2])) {
    return puedeVerSala(sesion, partes[1])
  }
  if (partes.length !== 2) return false
  const [seccion, slug] = partes
  if (SECCIONES_DE_EQUIPO.includes(seccion)) return false
  // `/reunion/<id>` lleva un id, no un slug: aquí no se puede saber de qué
  // cliente es. Pasa el filtro optimista y la PÁGINA comprueba contra la
  // sesión real que ese director puede verla — que es donde vive la
  // verificación que manda, pegada al dato.
  if (seccion === 'reunion') return true
  if (seccion !== 'cliente') return false
  return puedeVerSala(sesion, slug)
}
