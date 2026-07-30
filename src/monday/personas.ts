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

/** Minúsculas, sin acentos, espacios colapsados. La única forma de comparar dos nombres de este archivo. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    // NFD separa cada letra acentuada en (letra base + marca diacrítica); esto
    // quita esa marca, dejando solo la letra base. \p{Diacritic} con el flag
    // `u` es la forma explícita de pedir "cualquier marca diacrítica" sin
    // escribir el rango de puntos Unicode a mano.
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Primer nombre + último apellido (normalizados) — cubre que la transcripción omita un segundo nombre o apellido materno. */
function primeroYApellido(nombreCompleto: string): string {
  const partes = normalizar(nombreCompleto).split(' ').filter(Boolean)
  if (partes.length <= 1) return partes[0] ?? ''
  return `${partes[0]} ${partes[partes.length - 1]}`
}

/**
 * LA PERSONA MÁS PARECIDA A UN NOMBRE, o ninguna si la coincidencia no es evidente.
 *
 * Para cuando la IA detecta un responsable leyendo una transcripción: nunca
 * decide sola a quién asignarlo (eso lo confirma una persona, ver
 * SelectorResponsable), pero sí puede OFRECER la coincidencia más obvia de la
 * lista viva para que sea más rápido confirmarla.
 *
 * Deliberadamente sencillo — sin distancia de edición ni librerías de
 * fuzzy-matching: dos niveles, nombre completo normalizado y luego "primer
 * nombre + apellido" normalizado (por si la transcripción omitió un nombre
 * compuesto). Si cualquiera de los dos niveles encuentra más de una persona
 * —dos "Ana García", por ejemplo— NO es evidente cuál es, así que no se
 * sugiere ninguna: es mejor no sugerir nada que sugerir a quien no toca en un
 * tablero que mira todo el equipo.
 */
export function personaMasParecida(nombreDetectado: string, personas: PersonaMonday[]): PersonaMonday | null {
  const nombreNorm = normalizar(nombreDetectado)
  if (nombreNorm === '') return null

  const porNombreCompleto = personas.filter((p) => normalizar(p.nombre) === nombreNorm)
  if (porNombreCompleto.length === 1) return porNombreCompleto[0]
  if (porNombreCompleto.length > 1) return null

  const nombreCorto = primeroYApellido(nombreDetectado)
  if (nombreCorto === '') return null
  const porNombreCorto = personas.filter((p) => primeroYApellido(p.nombre) === nombreCorto)
  if (porNombreCorto.length === 1) return porNombreCorto[0]

  return null
}
