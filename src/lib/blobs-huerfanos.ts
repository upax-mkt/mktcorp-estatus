/**
 * QUÉ BINARIOS DE VERCEL BLOB YA NO REFERENCIA NADIE.
 *
 * De dónde sale esto: los ocho sitios que borran un archivo llaman a
 * `del(ruta).catch(() => {})` — best-effort a propósito, porque un fallo al
 * borrar el binario no debe tumbar la operación que ya cambió la base. La
 * consecuencia es que si Vercel Blob tiene un mal día, el binario se queda
 * ahí para siempre, pagándose, y NADIE se entera: no había forma de saber
 * cuántos hay ni cuáles son.
 *
 * ⚠️ ESTO SOLO MIRA Y CUENTA. No borra, y no debe aprender a hacerlo: la
 * decisión de tirar un binario de un cliente no se automatiza a partir de una
 * comparación que puede tener un falso positivo por una tabla que se nos
 * olvidó mirar.
 *
 * ⚠️⚠️ Y ESE ES EL RIESGO REAL DE ESTE MÓDULO: **una referencia que no se
 * consulte convierte un archivo vivo en un "huérfano"**. Hoy hay DOS sitios
 * que apuntan a Blob y guardan formatos distintos:
 *
 *   - `archivos.ruta` — el `pathname` pelado (`salas/mexa/credenciales.pdf`).
 *   - `salas.logoUrl` — la URL COMPLETA (`https://….blob.vercel-storage.com/…`),
 *     ver `src/temas/logos.ts`.
 *
 * Por eso todo se normaliza a pathname antes de comparar. Si algún día una
 * tercera columna guarda binarios, va aquí — o sus archivos aparecerán como
 * huérfanos.
 */

/** Un blob tal como lo devuelve `list()` de `@vercel/blob`. */
export interface BlobListado {
  pathname: string
  size: number
  uploadedAt: Date | string
}

export interface Huerfano {
  pathname: string
  size: number
  uploadedAt: string
}

/**
 * DEJA UNA REFERENCIA EN SU PATHNAME, venga como venga.
 *
 * Acepta un `pathname` pelado o una URL completa de Blob. Devuelve `null` para
 * lo que no es una referencia a un binario —`null`, cadena vacía, un enlace de
 * YouTube en `archivos.enlace`, un logo servido desde `/public`— porque
 * meterlo en el conjunto de referencias no haría daño, pero devolverlo como
 * pathname válido sí podría emparejar mal.
 */
export function comoPathname(referencia: string | null | undefined): string | null {
  if (!referencia) return null
  const limpia = referencia.trim()
  if (!limpia) return null
  if (limpia.startsWith('http://') || limpia.startsWith('https://')) {
    try {
      const url = new URL(limpia)
      // Solo las URLs de Blob cuentan: un logo enlazado a otro dominio no es
      // un binario nuestro, y su "pathname" emparejaría con cualquier cosa.
      if (!url.hostname.includes('blob.vercel-storage.com')) return null
      // `URL.pathname` llega con la barra inicial; `list()` los da sin ella.
      return decodeURIComponent(url.pathname.replace(/^\//, '')) || null
    } catch {
      return null
    }
  }
  // Una ruta de `/public` no es un blob: la sirve Next desde el repo.
  if (limpia.startsWith('/')) return null
  return limpia
}

/**
 * Los blobs que no aparecen en ninguna referencia.
 *
 * `referencias` es todo lo que la base apunta a Blob, en cualquiera de sus dos
 * formatos. Un mismo binario referenciado por varias filas se cuenta una vez y
 * NO es huérfano — el caso real: un PDF registrado como material comercial y
 * de nuevo como archivo de interés.
 */
export function blobsHuerfanos(
  blobs: BlobListado[],
  referencias: Array<string | null | undefined>,
): Huerfano[] {
  const vivas = new Set<string>()
  for (const r of referencias) {
    const p = comoPathname(r)
    if (p) vivas.add(p)
  }
  return blobs
    .filter((b) => !vivas.has(b.pathname))
    .map((b) => ({
      pathname: b.pathname,
      size: b.size,
      uploadedAt: typeof b.uploadedAt === 'string' ? b.uploadedAt : b.uploadedAt.toISOString(),
    }))
}

/** Los bytes en la unidad en la que un humano decide si le importan. */
export function enUnidadLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
