import { consultarMonday } from './red'

/**
 * EL DIRECTORIO DE GENTE DE MONDAY.
 *
 * La cuenta es "Marketing Corp Grupo UPAX" y sus usuarios son el equipo: 24
 * activos el 29-jul-2026. No se filtran por dominio de correo a propósito —
 * conviven `@upax.com.mx`, `@elektra.com.mx` y `@jansan.mx`, así que el dominio
 * no dice quién es del equipo y filtrarlo dejaría fuera a media plantilla.
 */
export interface PersonaMonday {
  id: string
  nombre: string
  correo: string
}

interface FilaUsuario {
  id: string
  name: string
  email: string
  enabled: boolean
  is_guest: boolean
}

/** Un día. Un directorio de 24 personas no cambia entre dos reuniones. */
const VIGENCIA_MS = 86_400_000

export function hayQueRefrescar(cargadoEn: Date | null, ahora: Date): boolean {
  if (!cargadoEn) return true
  return ahora.getTime() - cargadoEn.getTime() > VIGENCIA_MS
}

export async function personasDeMonday(): Promise<PersonaMonday[]> {
  const datos = await consultarMonday<{ users: FilaUsuario[] }>(
    `query { users(limit: 200) { id name email enabled is_guest } }`,
  )
  return datos.users
    .filter((u) => u.enabled && !u.is_guest)
    .map((u) => ({ id: u.id, nombre: u.name, correo: u.email }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}
