import { db, hayDB } from './cliente'
import * as esquema from './esquema'

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
  const fila = (await db().select().from(esquema.enlaceAgenda).limit(1))[0]
  return fila?.token ?? null
}

/** Genera uno nuevo y borra el anterior: solo hay un enlace vivo a la vez. */
export async function generarEnlaceDeAgenda(): Promise<string> {
  if (!hayDB()) throw new Error('Sin base de datos no se puede generar el enlace.')
  const token = nuevoToken()
  await db().delete(esquema.enlaceAgenda)
  await db().insert(esquema.enlaceAgenda).values({ token })
  return token
}

export async function revocarEnlaceDeAgenda(): Promise<void> {
  if (!hayDB()) return
  await db().delete(esquema.enlaceAgenda)
}

export async function tokenValido(recibido: string): Promise<boolean> {
  return esTokenIgual(await tokenDeAgenda(), recibido)
}
