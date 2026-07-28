import { eq } from 'drizzle-orm'
import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import { slugsDeSalas } from '@/temas'

/**
 * LA CLAVE DE UNA SALA.
 *
 * El director de una UDN y su equipo entran tecleando una clave; el sistema
 * reconoce de qué sala es y los lleva a la suya (Franco, 28-jul). Antes el
 * acceso era un link firmado que caducaba a los 30 días: servía para
 * compartirlo una vez, y obligaba a pedir uno nuevo cada mes.
 *
 * SE GUARDA EL HASH. La clave se enseña completa una sola vez, al generarla,
 * y desde entonces solo se puede regenerar — el patrón de cualquier API key.
 * Guardarla recuperable sería más cómodo y convertiría la tabla de salas en
 * una lista de credenciales en claro. Regenerarla es barato: volver a
 * compartirla es un mensaje.
 */

/**
 * Palabras para construir claves que se puedan DICTAR por teléfono.
 *
 * Sin caracteres que se confundan al leerlos en voz alta ni al teclearlos, y
 * sin acentos ni eñes: esta clave va a viajar por WhatsApp y por Slack y va a
 * escribirla alguien en un móvil.
 */
const PALABRAS = [
  'ancla', 'brisa', 'cedro', 'duna', 'eco', 'faro', 'grano', 'hielo',
  'isla', 'jade', 'lino', 'monte', 'nube', 'olivo', 'pino', 'rama',
  'sauce', 'trigo', 'valle', 'yunque', 'zarza', 'arena', 'bruma', 'cima',
]

/** Genera una clave del tipo `faro-arena-3971`. */
export function generarClave(): string {
  const bytes = new Uint32Array(3)
  crypto.getRandomValues(bytes)
  const a = PALABRAS[bytes[0] % PALABRAS.length]
  const b = PALABRAS[bytes[1] % PALABRAS.length]
  const n = 1000 + (bytes[2] % 9000)
  return `${a}-${b}-${n}`
}

/**
 * El hash con el que se guarda.
 *
 * SHA-256 con una sal fija tomada de `SESSION_SECRET`. No es bcrypt ni argon,
 * y aquí es suficiente: la clave la genera el sistema con ~10^11 combinaciones
 * y no la elige una persona, así que no hay diccionario que atacar. Lo que sí
 * importa —y esto lo resuelve— es que la base no guarde credenciales en claro.
 */
async function hashDeClave(clave: string, secreto: string): Promise<string> {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${secreto}:sala:${clave.trim().toLowerCase()}`),
  )
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export interface EstadoClave {
  tiene: boolean
  creadaEn: string | null
}

/** Si la sala ya tiene clave y desde cuándo. Nunca devuelve la clave. */
export async function estadoDeClave(salaSlug: string, secreto: string): Promise<EstadoClave> {
  void secreto
  if (!hayDB()) return { tiene: false, creadaEn: null }
  const fila = (
    await db()
      .select({ hash: esquema.salas.claveHash, creada: esquema.salas.claveCreadaEn })
      .from(esquema.salas)
      .where(eq(esquema.salas.slug, salaSlug))
  )[0]
  return {
    tiene: Boolean(fila?.hash),
    creadaEn: fila?.creada ? fila.creada.toISOString() : null,
  }
}

/**
 * Pone una clave nueva a la sala y la devuelve EN CLARO, una sola vez.
 *
 * Quien llama tiene que enseñarla en ese momento: no hay forma de volver a
 * leerla. Si se pierde, se regenera.
 */
export async function regenerarClave(salaSlug: string, secreto: string): Promise<string> {
  if (!slugsDeSalas().includes(salaSlug)) throw new Error(`Sala desconocida: "${salaSlug}"`)
  if (!hayDB()) throw new Error('Sin base de datos no se pueden guardar claves de sala.')

  const clave = generarClave()
  const hash = await hashDeClave(clave, secreto)
  await db()
    .update(esquema.salas)
    .set({ claveHash: hash, claveCreadaEn: new Date(), updatedAt: new Date() })
    .where(eq(esquema.salas.slug, salaSlug))
  return clave
}

export async function quitarClave(salaSlug: string): Promise<void> {
  if (!hayDB()) return
  await db()
    .update(esquema.salas)
    .set({ claveHash: null, claveCreadaEn: null, updatedAt: new Date() })
    .where(eq(esquema.salas.slug, salaSlug))
}

/**
 * De qué sala es esta clave, si es de alguna.
 *
 * Se comparan HASHES, no cadenas, y se recorren todas las salas siempre —sin
 * cortar en la primera que coincide— para que el tiempo de respuesta no diga
 * nada sobre qué sala acertó ni sobre cuántas tienen clave.
 */
export async function salaDeClave(clave: string, secreto: string): Promise<string | null> {
  const limpia = clave.trim()
  if (limpia.length === 0 || !hayDB()) return null

  const hash = await hashDeClave(limpia, secreto)
  const filas = await db()
    .select({ slug: esquema.salas.slug, hash: esquema.salas.claveHash })
    .from(esquema.salas)

  let encontrada: string | null = null
  for (const fila of filas) {
    if (fila.hash && fila.hash === hash) encontrada = fila.slug
  }
  return encontrada
}
