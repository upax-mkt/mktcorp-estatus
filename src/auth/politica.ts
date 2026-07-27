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
const SECCIONES_DE_EQUIPO = ['preparar']

/** Primer segmento y resto de una ruta: '/sala/neracode' → ['sala', 'neracode']. */
function segmentos(ruta: string): string[] {
  return ruta.split('/').filter((s) => s.length > 0)
}

export function esRutaPublica(ruta: string): boolean {
  return RUTAS_PUBLICAS.includes(ruta)
}

/** Solo Mkt Corp escribe: mover estatus, editar fechas, maquetar, minutar. */
export function puedeEditar(sesion: Sesion | null): boolean {
  return sesion?.rol === 'equipo'
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
  // `/api/archivo/<id>` es el mismo caso que `/sesion/<id>`: lleva un id, y
  // hasta no leer el archivo no se sabe de qué sala es. Pasa el filtro
  // optimista y la ruta comprueba contra la sala REAL del archivo antes de
  // servir un byte. Sin esto, un director no podría abrir los archivos de su
  // propia sala.
  if (partes.length === 3 && partes[0] === 'api' && partes[1] === 'archivo') return true
  if (partes.length !== 2) return false
  const [seccion, slug] = partes
  if (SECCIONES_DE_EQUIPO.includes(seccion)) return false
  // `/sesion/<id>` lleva un id, no un slug: aquí no se puede saber de qué sala
  // es. Pasa el filtro optimista y la PÁGINA comprueba contra la sesión real
  // que ese director puede verla — que es donde vive la verificación que
  // manda, pegada al dato.
  if (seccion === 'sesion') return true
  if (seccion !== 'sala') return false
  return puedeVerSala(sesion, slug)
}
