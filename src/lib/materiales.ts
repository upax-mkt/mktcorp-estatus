/**
 * QUÉ ES CADA MATERIAL DE UNA SALA, y con qué cara se enseña.
 *
 * Franco, sobre el módulo de la sala: *"aquí no solo la UDN tienen PPT, o PDF,
 * también puede ser un video de YouTube o link de interés. Además la vista
 * debe ser más vistosa con un preview tal vez o miniatura de imagen con el
 * título del doc"*.
 *
 * Así que un material ya no es siempre un fichero, y la lista deja de ser una
 * lista. Este módulo es la única fuente de dos decisiones:
 *
 *  1. QUÉ tipo de material es (fichero, vídeo, enlace) — mirando primero el
 *     enlace y solo después el nombre del fichero.
 *  2. CON QUÉ SE PINTA su miniatura. Tres orígenes, en este orden:
 *     - una imagen subida se pinta a sí misma;
 *     - un vídeo de YouTube usa la portada que YouTube ya genera;
 *     - todo lo demás cae a una carátula tipográfica (la extensión o el
 *       dominio) que se dibuja con CSS, sin pedir nada a la red.
 *
 * NO SE GENERAN MINIATURAS DE PDF NI DE PPT. Haría falta renderizar la
 * primera página en el servidor —una dependencia pesada, tiempo de función y
 * un binario más que guardar y que caducar— para una lista de media docena de
 * elementos. La carátula tipográfica da la misma señal (qué es y cómo se
 * llama) por cero coste.
 */

/** Las tres caras que puede tener un material en la sala. */
export type TipoMaterial = 'imagen' | 'video' | 'enlace' | 'documento'

export interface MaterialParaVista {
  tipo: TipoMaterial
  /** URL de la miniatura, o null si se dibuja la carátula tipográfica. */
  miniatura: string | null
  /** Lo que se escribe en la carátula cuando no hay miniatura ("PDF", "youtube.com"). */
  distintivo: string
  /** A dónde lleva al pulsarlo. */
  destino: string
  /** true si abre fuera de la app (un enlace externo). */
  externo: boolean
}

const EXTENSIONES_IMAGEN = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg']

/**
 * El id de un vídeo de YouTube, o null si esa URL no es de YouTube.
 *
 * Cubre las cuatro formas con las que llega un enlace pegado a mano:
 * `watch?v=`, `youtu.be/`, `/embed/` y `/shorts/`. El id de YouTube es
 * `[A-Za-z0-9_-]{11}`; comprobarlo evita que `youtube.com/@canal` se tome por
 * un vídeo y pida una portada que devolvería un 404.
 */
export function idDeYouTube(url: string): string | null {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  const host = u.hostname.replace(/^www\./, '').toLowerCase()
  const esId = (v: string | null | undefined): string | null =>
    v && /^[A-Za-z0-9_-]{11}$/.test(v) ? v : null

  if (host === 'youtu.be') return esId(u.pathname.slice(1).split('/')[0])
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') return esId(u.searchParams.get('v'))
    const partes = u.pathname.split('/').filter(Boolean)
    if (partes[0] === 'embed' || partes[0] === 'shorts' || partes[0] === 'live') {
      return esId(partes[1])
    }
  }
  return null
}

/** El dominio de un enlace, sin `www.`, para escribirlo en la carátula. */
export function dominioDe(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'enlace'
  }
}

/** La extensión en mayúsculas, para la carátula de un documento. */
export function extensionParaCaratula(nombre: string | null): string {
  const ext = (nombre ?? '').split('.').pop()?.toLowerCase() ?? ''
  if (!ext || ext === nombre?.toLowerCase()) return 'DOC'
  return ext.slice(0, 4).toUpperCase()
}

/**
 * Cómo se enseña este material.
 *
 * Sirve igual a una fila con fichero y a una con enlace: es justo el punto
 * donde las dos formas se unifican, para que la vista no tenga que preguntar
 * cuál de las dos es.
 */
export function materialParaVista(m: {
  id: string
  enlace: string | null
  ruta: string | null
  nombreOriginal: string | null
  tipoContenido: string | null
}): MaterialParaVista {
  if (m.enlace) {
    const idVideo = idDeYouTube(m.enlace)
    if (idVideo) {
      return {
        tipo: 'video',
        // `hqdefault` existe para TODO vídeo; `maxresdefault` solo si el vídeo
        // se subió en alta y devuelve 404 en el resto, que en una rejilla se
        // ve como un hueco.
        miniatura: `https://i.ytimg.com/vi/${idVideo}/hqdefault.jpg`,
        distintivo: 'YouTube',
        destino: m.enlace,
        externo: true,
      }
    }
    return {
      tipo: 'enlace',
      miniatura: null,
      distintivo: dominioDe(m.enlace),
      destino: m.enlace,
      externo: true,
    }
  }

  // Fichero. Se sirve SIEMPRE por /api/archivo/[id], nunca por la URL de Blob:
  // el store es privado y esa ruta es la que comprueba el permiso contra la
  // sala (ver src/lib/blob.ts).
  const destino = `/api/archivo/${m.id}`
  const ext = (m.nombreOriginal ?? '').split('.').pop()?.toLowerCase() ?? ''
  const esImagen =
    EXTENSIONES_IMAGEN.includes(ext) || (m.tipoContenido ?? '').startsWith('image/')

  if (esImagen) {
    return { tipo: 'imagen', miniatura: destino, distintivo: extensionParaCaratula(m.nombreOriginal), destino, externo: false }
  }
  return {
    tipo: 'documento',
    miniatura: null,
    distintivo: extensionParaCaratula(m.nombreOriginal),
    destino,
    externo: false,
  }
}

/**
 * Normaliza y valida un enlace pegado a mano.
 *
 * Solo http/https: `javascript:` en un href es XSS almacenado, y el resto de
 * esquemas (`file:`, `data:`) no tiene sentido en un material que se comparte
 * con una UDN. Mismo criterio que `esUrlSegura` aplica en las secciones de un
 * documento.
 */
export function normalizarEnlace(bruto: string): { url: string } | { error: string } {
  const texto = bruto.trim()
  if (!texto) return { error: 'Escribe el enlace.' }
  // Sin esquema se asume https: nadie escribe "https://" al pegar de memoria.
  const conEsquema = /^[a-z][a-z0-9+.-]*:/i.test(texto) ? texto : `https://${texto}`
  let u: URL
  try {
    u = new URL(conEsquema)
  } catch {
    return { error: 'Ese enlace no se entiende. Revisa que esté completo.' }
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { error: 'Solo se admiten enlaces http o https.' }
  }
  if (!u.hostname.includes('.')) {
    return { error: 'Ese enlace no tiene un dominio válido.' }
  }
  return { url: u.toString() }
}
