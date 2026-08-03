/**
 * Quién puede ver y hacer qué. Funciones puras: no tocan cookies ni red, así
 * que valen igual en el proxy (Edge), en un Server Component y en un test.
 *
 * Dos roles, según el spec §4 ("solo el equipo Mkt Corp mueve el estatus"):
 *
 * - `equipo`  — Marketing Corporativo. Ve las 10 salas, prepara sesiones,
 *               maqueta, minuta y mueve acuerdos. Desde la ronda 9 cada
 *               sesión de equipo lleva además un `rolApp` (admin/editor/
 *               viewer — ver `Sesion.rolApp` en src/auth/firma.ts) que decide
 *               QUÉ puede hacer dentro de ese universo: `puedeAdministrar`,
 *               `puedeEditarContenido` y `puedeLeer`, más abajo, son esos tres
 *               niveles. `src/auth/roles.ts` los reexporta junto con las
 *               funciones que lanzan (`exigirAdmin`/`exigirEditor`/
 *               `exigirLectura`), siguiendo el mismo patrón que
 *               `exigirEdicionDeAcuerdos` de src/auth/sesion.ts ya usa con
 *               `puedeEditarAcuerdos`: sesión actual → predicado de aquí →
 *               lanza si no pasa.
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

/**
 * Rutas de equipo que además exigen ser ADMIN (ronda 9, tarea 2, paso 7).
 * Crear/editar salas y marcas, y dar de alta o cambiar el rol de una persona,
 * son decisiones de quien administra Mkt Corp, no de cualquiera con cuenta.
 * `/personas` entra aquí desde ya aunque la pantalla la construya la tarea 3:
 * la política no tiene que esperar a que exista la ruta para protegerla.
 */
const SECCIONES_SOLO_ADMIN = ['salas', 'personas']

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

/**
 * QUIÉN PUEDE QUÉ, dentro del equipo (ronda 9, tarea 2).
 *
 * Tres niveles sobre una sesión de `rol: 'equipo'`, del `rolApp` que trae
 * firmado (ver src/auth/firma.ts): admin puede todo, editor prepara/maqueta/
 * minuta/mueve acuerdos pero no toca salas/marcas/personas, viewer solo mira.
 *
 * Un `rolApp` ausente o desconocido no pasa NINGUNO de los tres: falla
 * cerrado. Es lo que hace que una sesión de equipo emitida antes de esta
 * ronda —sin `rolApp`— no herede permisos por accidente; su dueño vuelve a
 * entrar (por Slack, o por el portillo de emergencia mientras el directorio
 * siga vacío — ver `src/app/api/auth/slack/retorno/route.ts` y
 * `src/app/entrar/page.tsx`) y recibe el suyo.
 *
 * Una sesión de sala (el director de una UDN) no gana nada de esto: no tiene
 * `rolApp` y los tres devuelven `false` sin mirar más — su única puerta de
 * escritura es la excepción de `puedeEditarAcuerdos`, más abajo.
 */
export function puedeAdministrar(sesion: Sesion | null): boolean {
  if (!sesion || sesion.rol !== 'equipo') return false
  return sesion.rolApp === 'admin'
}

/** Admin o editor: los dos preparan, maquetan, minutan, publican, mueven acuerdos y suben a Monday. */
export function puedeEditarContenido(sesion: Sesion | null): boolean {
  if (!sesion || sesion.rol !== 'equipo') return false
  return sesion.rolApp === 'admin' || sesion.rolApp === 'editor'
}

/** Los tres roles de equipo pasan esta: al menos pueden ver páginas de solo lectura. */
export function puedeLeer(sesion: Sesion | null): boolean {
  if (!sesion || sesion.rol !== 'equipo') return false
  return sesion.rolApp === 'admin' || sesion.rolApp === 'editor' || sesion.rolApp === 'viewer'
}

/**
 * Quién puede tocar los ACUERDOS de una sala.
 *
 * Marketing Corp —admin o editor, ver `puedeEditarContenido`; un viewer NO—,
 * en todas. Y el director de una UDN, en la suya y solo en la suya (Franco,
 * 28-jul: "solo pueden editar los acuerdos y pendientes").
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
  if (sesion.rol === 'equipo') return puedeEditarContenido(sesion)
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
  if (sesion.rol === 'equipo') {
    // /salas y /personas exigen admin incluso a este nivel optimista (ronda
    // 9, tarea 2, paso 7): un editor o un viewer no deberían ni poder abrir
    // la pantalla, aunque cada acción de ahí adentro ya se protegería igual
    // con `exigirAdmin()` — mismo principio de "el proxy también filtra lo
    // evidente" que el resto de esta función.
    const [primerSegmento] = segmentos(ruta)
    if (SECCIONES_SOLO_ADMIN.includes(primerSegmento)) return puedeAdministrar(sesion)
    // `puedeLeer(sesion)`, NO `true` (revisión final de la rama, punto 1).
    // Todo el equipo compartió una cookie de 7 días SIN `rolApp` hasta esta
    // ronda: con un `true` a ciegas aquí, esa sesión pasaba el filtro
    // optimista de CUALQUIER ruta de equipo salvo /salas y /personas —
    // incluido el Home, que no tenía guarda de página (ver `src/app/page.tsx`
    // y `src/app/error.tsx`) — y solo tropezaba en el primer `exigir*()` real
    // de la página, que LANZA. Sin un límite de error en toda la app, eso era
    // la pantalla genérica de Next con un código ilegible en vez de un
    // `/entrar` limpio. `puedeLeer` exige un `rolApp` válido (admin/editor/
    // viewer, `src/auth/politica.ts`) — la misma condición que ya protege
    // /salas y /personas, aplicada aquí también: una sesión de equipo sin rol
    // de app falla cerrado en TODA la app, no en dos rutas.
    return puedeLeer(sesion)
  }

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
