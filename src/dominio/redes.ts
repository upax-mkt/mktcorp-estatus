/**
 * LOS ENLACES PÚBLICOS DE UNA MARCA — sitio, blog y redes.
 *
 * Franco: *"necesito que todas las salas en el header tengan sus respectivos
 * iconos de redes sociales, sitio web, blog, etc."*.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTA LISTA ES LA ÚNICA, y vive en dominio y no en el componente que
 * pinta los iconos: la escriben tres sitios que no se ven entre sí —el
 * formulario de ajustes, la cabecera de la sala y lo que se guarda en la
 * base—, y un tipo que exista en dos de ellos y no en el tercero se guarda sin
 * error y no se pinta jamás. Es el mismo defecto que ya pasó con las
 * disciplinas del benchmark (`src/dominio/benchmark.ts`), donde una pieza
 * subida caía en un bloque que la página no dibujaba: invisible, silencioso.
 *
 * UN OBJETO EN `salas.redes` Y NO UNA TABLA: un enlace aquí no tiene vida
 * propia —ni fecha, ni dueño, ni permisos, ni existe sin su sala—, y son como
 * mucho diez por marca. Una tabla obligaría a una consulta más en cada carga
 * de sala para pintar una fila de iconos.
 */

/** Las claves que se pueden guardar. El orden es el orden en que se pintan. */
export const REDES = [
  'web',
  'blog',
  'linkedin',
  'instagram',
  'facebook',
  'youtube',
  'tiktok',
  'x',
  'vimeo',
  'behance',
  'spotify',
  'whatsapp',
] as const

export type Red = (typeof REDES)[number]

/**
 * Cómo se llama cada una en el formulario y en el `aria-label` del enlace.
 * El nombre importa: un icono sin texto accesible es un enlace que un lector
 * de pantalla anuncia como "enlace".
 */
export const NOMBRE_DE_RED: Record<Red, string> = {
  web: 'Sitio web',
  blog: 'Blog',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  x: 'X',
  vimeo: 'Vimeo',
  behance: 'Behance',
  spotify: 'Spotify',
  whatsapp: 'WhatsApp',
}

/** Lo que se guarda: clave → URL. Lo ausente sencillamente no se pinta. */
export type RedesDeSala = Partial<Record<Red, string>>

/**
 * SOLO `http(s)`. Estos enlaces se pintan en un `href` de una página que ve
 * gente de fuera, y `javascript:`, `data:` o `vbscript:` en un `href` son
 * ejecución, no navegación. Ya mordió una vez en este repo (el pie de la
 * minuta, ronda 11), así que aquí se filtra en el dominio y no en el
 * formulario: el formulario es una pantalla, y la validación de una pantalla
 * no protege a la Server Action que hay detrás.
 */
export function urlPublicaValida(url: string): boolean {
  try {
    const u = new URL(url.trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Normaliza lo que se escribió: quita espacios, descarta lo vacío y lo que no
 * sea `http(s)`, y devuelve solo las claves conocidas.
 *
 * Devuelve un objeto NUEVO y nunca `undefined`: quien guarda quiere poder
 * escribir "ninguna" —vaciar todos los campos es una forma legítima de
 * decirlo— y `{}` lo expresa sin ambigüedad.
 */
export function sanearRedes(crudo: unknown): RedesDeSala {
  if (!crudo || typeof crudo !== 'object') return {}
  const entrada = crudo as Record<string, unknown>
  const limpio: RedesDeSala = {}
  for (const red of REDES) {
    const v = entrada[red]
    if (typeof v !== 'string') continue
    const url = v.trim()
    if (url.length > 0 && urlPublicaValida(url)) limpio[red] = url
  }
  return limpio
}

/** Las que hay, en el orden de `REDES`. Vacío si no hay ninguna. */
export function redesConEnlace(redes: RedesDeSala | null | undefined): Array<[Red, string]> {
  if (!redes) return []
  return REDES.flatMap((r) => {
    const url = redes[r]
    return url ? ([[r, url]] as Array<[Red, string]>) : []
  })
}
