import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import { sql } from 'drizzle-orm'

/**
 * EL ENLACE PÚBLICO DE LA AGENDA.
 *
 * Es la única puerta de esta app que se abre sin sesión, así que el token es
 * lo único que separa la agenda de cualquiera que pruebe una URL. 32 bytes
 * aleatorios: no se adivina.
 *
 * No hay enlace por defecto. Si nadie lo ha generado, no existe.
 */
export function nuevoToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Compara el token de la URL con el guardado.
 *
 * Sin token guardado NADA coincide, ni la cadena vacía: si no, una app recién
 * desplegada tendría la agenda abierta con `/agenda/`.
 */
export function esTokenIgual(guardado: string | null, recibido: string): boolean {
  if (guardado === null || guardado.length === 0) return false
  return guardado === recibido
}

export async function tokenDeAgenda(): Promise<string | null> {
  if (!hayDB()) return null
  // La tabla solo puede tener una fila (id = 1). Si está vacía, retorna null.
  const fila = (await db().select().from(esquema.enlaceAgenda).where(
    sql`${esquema.enlaceAgenda.id} = 1`
  ))[0]
  return fila?.token ?? null
}

/**
 * Genera un token nuevo y lo guarda de forma atómica.
 *
 * Usa INSERT ... ON CONFLICT (id) DO UPDATE: una sola sentencia atómica.
 * Imposibilita race conditions porque Postgres garantiza que la sentencia
 * se ejecuta completa. Sin transacciones (neon-http no las soporta) pero
 * con atomicidad de Postgres.
 */
export async function generarEnlaceDeAgenda(): Promise<string> {
  if (!hayDB()) throw new Error('Sin base de datos no se puede generar el enlace.')
  const token = nuevoToken()
  // Upsert: si existe (id=1), actualiza el token y creadoEn; si no, crea la fila.
  await db()
    .insert(esquema.enlaceAgenda)
    .values({ id: 1, token, creadoEn: new Date() })
    .onConflictDoUpdate({
      target: esquema.enlaceAgenda.id,
      set: { token, creadoEn: new Date() },
    })
  return token
}

export async function revocarEnlaceDeAgenda(): Promise<void> {
  if (!hayDB()) return
  // Borra por id para asegurar que borramos siempre la única fila posible.
  await db().delete(esquema.enlaceAgenda).where(
    sql`${esquema.enlaceAgenda.id} = 1`
  )
}

export async function tokenValido(recibido: string): Promise<boolean> {
  return esTokenIgual(await tokenDeAgenda(), recibido)
}
