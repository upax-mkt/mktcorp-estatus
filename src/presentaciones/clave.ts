import type { PresentacionWeb } from './registro'

/**
 * LA CLAVE SENCILLA DE UNA PRESENTACIÓN (6-oct-2026). Franco la pidió «algo simple»: se compara sin distinguir
 * mayúsculas ni espacios de los bordes, para que se pueda dictar por teléfono. Vive en una variable de entorno de
 * Vercel (`claveEnv` del registro); sin ella, nadie entra por clave. Misma comparación por digest que la clave de
 * equipo (`src/auth/sesion.ts`).
 */
const normalizar = (v: string) => v.trim().toLowerCase()

export function claveConfigurada(p: PresentacionWeb): boolean {
  const real = p.claveEnv ? process.env[p.claveEnv] : undefined
  return Boolean(real && real.trim().length > 0)
}

export async function claveCorrecta(p: PresentacionWeb, intento: string): Promise<boolean> {
  const real = p.claveEnv ? process.env[p.claveEnv] : undefined
  if (!real || real.trim().length === 0) return false
  const [a, b] = await Promise.all([digest(normalizar(intento)), digest(normalizar(real))])
  return a === b
}

async function digest(valor: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(valor))
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, '0')).join('')
}
