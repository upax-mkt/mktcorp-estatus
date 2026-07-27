/**
 * Firma y verificación de sesiones, con HMAC-SHA256 de Web Crypto.
 *
 * Por qué a mano y no una librería: lo único que se necesita es sellar un
 * objeto pequeño ({rol, sala, exp}) para que el navegador no pueda alterarlo.
 * Web Crypto está en el runtime de Node y en el de Edge — el mismo código sirve
 * para el proxy y para los Server Components — y así no se añade dependencia.
 * No se inventa criptografía: se usa la primitiva estándar, y la comparación de
 * firmas la hace `crypto.subtle.verify` (tiempo constante), no un `===`.
 *
 * Formato: base64url(JSON del payload) + "." + base64url(HMAC del payload).
 * El contenido va firmado, NO cifrado: nunca meter aquí nada secreto.
 */

export type RolSesion = 'equipo' | 'sala'

export interface Sesion {
  rol: RolSesion
  /** Slug de la sala. Obligatorio si rol === 'sala'; ausente si rol === 'equipo'. */
  sala?: string
  /** Quién es (correo de Slack o etiqueta). Informativo. */
  sub?: string
  /** Vencimiento, en milisegundos epoch. */
  exp: number
}

// base64url a mano con btoa/atob: `Buffer` no existe en el runtime Edge, donde
// corre el proxy, y este módulo tiene que valer igual en Edge y en Node.

function aBase64Url(bytes: Uint8Array): string {
  let binario = ''
  for (const byte of bytes) binario += String.fromCharCode(byte)
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function textoABase64Url(texto: string): string {
  return aBase64Url(new TextEncoder().encode(texto))
}

// Se construye sobre un ArrayBuffer propio y explícito: `crypto.subtle` exige
// un búfer no compartido, y así el tipo lo garantiza sin conversiones.
function deBase64Url(valor: string): Uint8Array<ArrayBuffer> {
  const base64 = valor.replace(/-/g, '+').replace(/_/g, '/')
  const conRelleno = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  const binario = atob(conRelleno)
  const bytes = new Uint8Array(new ArrayBuffer(binario.length))
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return bytes
}

async function clave(secreto: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secreto),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

/** true si el objeto tiene la forma de una sesión válida. */
function esSesion(valor: unknown): valor is Sesion {
  if (typeof valor !== 'object' || valor === null) return false
  const s = valor as Record<string, unknown>
  if (typeof s.exp !== 'number' || !Number.isFinite(s.exp)) return false
  if (s.rol === 'equipo') return s.sala === undefined || typeof s.sala === 'string'
  // Un acceso de sala sin sala no significa nada: sería un pase en blanco.
  if (s.rol === 'sala') return typeof s.sala === 'string' && s.sala.length > 0
  return false
}

/** Sella una sesión. El resultado es lo que viaja en la cookie o en el link. */
export async function firmar(sesion: Sesion, secreto: string): Promise<string> {
  const cuerpo = textoABase64Url(JSON.stringify(sesion))
  const firma = await crypto.subtle.sign(
    'HMAC',
    await clave(secreto),
    new TextEncoder().encode(cuerpo),
  )
  return `${cuerpo}.${aBase64Url(new Uint8Array(firma))}`
}

/**
 * Abre un token y devuelve la sesión, o `null` si la firma no cuadra, si el
 * contenido no es una sesión bien formada o si ya venció. Nunca lanza: todo
 * fallo es un `null`, para que el llamador tenga un solo camino de rechazo.
 */
export async function verificar(
  token: string | undefined,
  secreto: string,
  ahora: Date = new Date(),
): Promise<Sesion | null> {
  if (!token) return null
  const partes = token.split('.')
  if (partes.length !== 2) return null
  const [cuerpo, firma] = partes
  if (!cuerpo || !firma) return null

  try {
    const valida = await crypto.subtle.verify(
      'HMAC',
      await clave(secreto),
      deBase64Url(firma),
      new TextEncoder().encode(cuerpo),
    )
    if (!valida) return null

    const contenido: unknown = JSON.parse(new TextDecoder().decode(deBase64Url(cuerpo)))
    if (!esSesion(contenido)) return null
    if (contenido.exp < ahora.getTime()) return null
    return contenido
  } catch {
    // base64 corrupto, JSON inválido, etc. — todo es "no autenticado".
    return null
  }
}
