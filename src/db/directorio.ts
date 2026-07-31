import { eq } from 'drizzle-orm'
import { db, hayDB } from './cliente'
import * as esquema from './esquema'

/**
 * EL DIRECTORIO DE PERSONAS DE LA APP (ronda 9, tarea 1).
 *
 * QUIÉN puede entrar y con qué permiso. Hasta ahora el equipo entero
 * compartía una sola clave por sala (ver `src/db/claves.ts`); desde esta
 * ronda cada persona entra con su cuenta de Slack (tarea 2, `src/auth/`) y
 * tiene un rol.
 *
 * NO CONFUNDIR con `src/db/personas.ts`: ese es el directorio de la CUENTA DE
 * MONDAY, para asignar responsables de acuerdos — otra tabla (`personas_monday`),
 * otro propósito. Una persona puede estar en los dos directorios, en uno solo
 * o en ninguno.
 *
 * SIN STORE EN MEMORIA, a propósito y a diferencia de `acuerdos.ts`/
 * `sesiones.ts`: el acceso no tiene un modo "sin base de datos" razonable —
 * sin DB no hay contra qué comprobar quién entra. Las lecturas devuelven un
 * valor vacío (`null`/`[]`/`false`); las escrituras que un admin pide a
 * propósito lanzan. Mismo criterio que los otros módulos de acceso,
 * `src/db/claves.ts` y `src/db/enlace-agenda.ts`.
 */

export type RolPersona = 'admin' | 'editor' | 'viewer'

const ROLES_VALIDOS: readonly RolPersona[] = ['admin', 'editor', 'viewer']

export interface Persona {
  correo: string
  nombre: string
  rol: RolPersona
  activa: boolean
}

export interface NuevaPersona {
  correo: string
  nombre: string
  rol: RolPersona
}

/**
 * Recorta y pasa a minúsculas. El correo es la clave primaria de `personas`,
 * así que "Franco@..." y "franco@..." tienen que resolver a la misma fila.
 *
 * `null` si tras recortar no queda un correo: hace falta una arroba con algo
 * a cada lado (no solo "tiene arroba" — " @ " tampoco es un correo).
 */
export function normalizarCorreo(correo: string): string | null {
  const recortado = correo.trim().toLowerCase()
  const arroba = recortado.indexOf('@')
  if (arroba <= 0 || arroba === recortado.length - 1) return null
  return recortado
}

/** Los tres roles válidos y ninguno más — ver `RolPersona`. Sensible a mayúsculas: 'Admin' no vale. */
export function esRolValido(valor: string): valor is RolPersona {
  return (ROLES_VALIDOS as readonly string[]).includes(valor)
}

/**
 * `rol` es texto libre en la base (sin enum — ver `esquema.personas`), así
 * que el cast confía en que la fila solo entró por `altaPersona`/`cambiarRol`
 * (las dos validan con `esRolValido`) o por la migración inicial ('admin').
 */
function aPersona(fila: typeof esquema.personas.$inferSelect): Persona {
  return { correo: fila.correo, nombre: fila.nombre, rol: fila.rol as RolPersona, activa: fila.activa }
}

/** La persona de este correo (normalizado antes de buscar), o `null` si no está o no hay base de datos. */
export async function buscarPersona(correo: string): Promise<Persona | null> {
  if (!hayDB()) return null
  const normalizado = normalizarCorreo(correo)
  if (!normalizado) return null
  const fila = (
    await db().select().from(esquema.personas).where(eq(esquema.personas.correo, normalizado))
  )[0]
  return fila ? aPersona(fila) : null
}

/** Todo el directorio, alfabético por nombre. Sin base de datos, lista vacía. */
export async function listarPersonas(): Promise<Persona[]> {
  if (!hayDB()) return []
  const filas = await db().select().from(esquema.personas)
  return filas.map(aPersona).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

/**
 * Si el directorio tiene al menos una persona.
 *
 * La usa el login (tarea 2) para distinguir "la tabla está vacía" (algo salió
 * mal con la migración: nadie puede entrar, ni el admin) de "este correo no
 * está" (acceso negado normal, la persona simplemente no tiene cuenta) — son
 * dos problemas distintos y conviene poder diagnosticar cuál es cuál.
 */
export async function hayAlgunaPersona(): Promise<boolean> {
  if (!hayDB()) return false
  const fila = (await db().select({ correo: esquema.personas.correo }).from(esquema.personas).limit(1))[0]
  return Boolean(fila)
}

/**
 * Da de alta una persona nueva, activa. Normaliza el correo y rechaza tanto
 * un correo inválido como un rol que no sea uno de los tres — ver
 * `normalizarCorreo`/`esRolValido`. Un correo ya dado de alta lo rechaza la
 * propia base (`correo` es la clave primaria de `personas`).
 */
export async function altaPersona(datos: NuevaPersona): Promise<void> {
  if (!hayDB()) throw new Error('Sin base de datos no se pueden dar de alta personas.')
  const correo = normalizarCorreo(datos.correo)
  if (!correo) throw new Error(`Correo inválido: "${datos.correo}"`)
  if (!esRolValido(datos.rol)) throw new Error(`Rol inválido: "${datos.rol}"`)
  await db().insert(esquema.personas).values({ correo, nombre: datos.nombre, rol: datos.rol })
}

/** Cambia el rol de una persona ya dada de alta. Lanza si el correo no existe en el directorio. */
export async function cambiarRol(correo: string, rol: RolPersona): Promise<void> {
  if (!hayDB()) throw new Error('Sin base de datos no se puede cambiar el rol.')
  const normalizado = normalizarCorreo(correo)
  if (!normalizado) throw new Error(`Correo inválido: "${correo}"`)
  if (!esRolValido(rol)) throw new Error(`Rol inválido: "${rol}"`)
  const actualizadas = await db()
    .update(esquema.personas)
    .set({ rol })
    .where(eq(esquema.personas.correo, normalizado))
    .returning({ correo: esquema.personas.correo })
  if (actualizadas.length === 0) throw new Error(`Persona no encontrada: "${normalizado}"`)
}

/** Activa o desactiva el acceso de una persona, sin borrar su fila. Lanza si el correo no existe. */
export async function activarPersona(correo: string, activa: boolean): Promise<void> {
  if (!hayDB()) throw new Error('Sin base de datos no se puede activar/desactivar personas.')
  const normalizado = normalizarCorreo(correo)
  if (!normalizado) throw new Error(`Correo inválido: "${correo}"`)
  const actualizadas = await db()
    .update(esquema.personas)
    .set({ activa })
    .where(eq(esquema.personas.correo, normalizado))
    .returning({ correo: esquema.personas.correo })
  if (actualizadas.length === 0) throw new Error(`Persona no encontrada: "${normalizado}"`)
}

/**
 * Deja constancia del último acceso, al iniciar sesión (tarea 2).
 *
 * A propósito NO lanza ante un correo inválido o sin base de datos: esto es
 * una escritura de bitácora en el camino del login, y que falle no puede
 * tumbar el acceso de alguien que ya se autenticó contra Slack. Mismo
 * criterio silencioso que `quitarClave`/`revocarEnlaceDeAgenda` en los otros
 * módulos de acceso — una limpieza o un registro que no tiene efecto si no
 * hay nada que actualizar.
 */
export async function registrarAcceso(correo: string): Promise<void> {
  if (!hayDB()) return
  const normalizado = normalizarCorreo(correo)
  if (!normalizado) return
  await db()
    .update(esquema.personas)
    .set({ ultimoAcceso: new Date() })
    .where(eq(esquema.personas.correo, normalizado))
}
