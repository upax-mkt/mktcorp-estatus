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
const SECCIONES_DE_EQUIPO = ['preparar', 'motor-demo']

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
  if (partes.length !== 2) return false
  const [seccion, slug] = partes
  if (SECCIONES_DE_EQUIPO.includes(seccion)) return false
  if (seccion !== 'sala' && seccion !== 'demo') return false
  return puedeVerSala(sesion, slug)
}
