import { and, eq, isNotNull } from 'drizzle-orm'
import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import { esSquadMktCorp, type SquadMktCorp } from '@/lib/equipos'

/**
 * EL DIRECTORIO DE PERSONAS DE LA APP (ronda 9, tarea 1).
 *
 * QUIÉN puede entrar y con qué permiso. Hasta ahora el equipo entero
 * compartía una sola clave por sala (ver `src/db/claves.ts`); desde esta
 * ronda cada persona entra con su cuenta de Slack (tarea 2, `src/auth/`) y
 * tiene un rol.
 *
 * `src/db/personas.ts` LEE ESTA MISMA TABLA con otra pregunta: quién se puede
 * elegir como responsable de un acuerdo (`genteParaResponsable`). Aquí se
 * administra quién entra y con qué rol; allá solo se lista a los activos.
 *
 * SIN STORE EN MEMORIA, a propósito y a diferencia de `acuerdos.ts`/
 * `sesiones.ts`: el acceso no tiene un modo "sin base de datos" razonable —
 * sin DB no hay contra qué comprobar quién entra. Las lecturas devuelven un
 * valor vacío (`null`/`[]`/`false`); las escrituras que un admin pide a
 * propósito lanzan. Mismo criterio que los otros módulos de acceso,
 * `src/db/claves.ts` y `src/db/enlace-agenda.ts`.
 *
 * `cambiarRol`/`activarPersona` YA NO VIVEN AQUÍ (retiradas en la revisión
 * del coordinador a la ronda 9, tarea 3, por código huérfano): escribían con
 * un `UPDATE` simple, sin forma de inyectarle la condición atómica que la
 * guarda "al menos un admin activo" necesita en su propio `WHERE`.
 * `cambiarRolAction`/`activarPersonaAction` (`src/app/personas/acciones.ts`)
 * escriben directo con Drizzle en su lugar — mismo criterio que ya usan
 * `salas/acciones.ts` y `acuerdos/acciones.ts` para sus propias escrituras
 * con condición. Se dejó esta nota para que el siguiente grep de
 * `cambiarRol(` sepa dónde mirar de verdad.
 */

export type RolPersona = 'admin' | 'editor' | 'viewer'

const ROLES_VALIDOS: readonly RolPersona[] = ['admin', 'editor', 'viewer']

export interface Persona {
  correo: string
  nombre: string
  rol: RolPersona
  squad: SquadMktCorp | null
  activa: boolean
}

export interface NuevaPersona {
  correo: string
  nombre: string
  rol: RolPersona
  squad: SquadMktCorp
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
 * que el cast confía en que la fila solo entró por `altaPersona` (valida con
 * `esRolValido`) o por un `UPDATE` que ya validó lo mismo antes de escribir
 * (`cambiarRolAction`, `src/app/personas/acciones.ts`), o por la migración
 * inicial ('admin').
 */
function aPersona(fila: typeof esquema.personas.$inferSelect): Persona {
  return {
    correo: fila.correo,
    nombre: fila.nombre,
    rol: fila.rol as RolPersona,
    squad: fila.squad && esSquadMktCorp(fila.squad) ? fila.squad : null,
    activa: fila.activa,
  }
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
 * Si el directorio tiene al menos un admin QUE PUEDA ENTRAR DE VERDAD.
 *
 * La usa el portillo de emergencia (`claveDeEquipoSigueSirviendo()`,
 * `src/auth/sesion.ts`) para decidir si la clave de equipo sigue sirviendo.
 * Antes esa decisión miraba `hayAlgunaPersona()` —"¿hay alguna fila?"—, pero
 * eso dejaba un fallo real sin salida (revisión del coordinador a la ronda 9,
 * tarea 3): un directorio con gente pero sin NINGÚN admin activo —posible
 * pese a las guardas de `src/app/personas/acciones.ts`, por un límite
 * estructural del driver de Neon (sin transacciones, no se puede cerrar del
 * todo la carrera entre dos peticiones que degradan a los dos últimos admins
 * a la vez)— se quedaba sin ninguna puerta: ni esta pantalla, ni la clave de
 * equipo, devolvían el acceso; solo SQL a mano. La pregunta correcta no es
 * "¿está vacío?", es "¿queda alguien que pueda dar acceso?" — y por eso
 * `hayAlgunaPersona` se retiró: se quedó sin ningún llamador real.
 *
 * SEGUNDO FALLO DEL MISMO TIPO (revisión final de la rama, punto 2):
 * "¿existe un admin activo EN LA TABLA?" segue siendo la pregunta
 * equivocada. Si el correo de la fila no coincide con el que devuelve Slack
 * —un alias, una letra distinta, un correo dado de alta a mano con una
 * errata— esa persona NUNCA logra entrar (`src/app/api/auth/slack/retorno/
 * route.ts` busca la fila por el correo exacto que trae Slack), y como la
 * fila EXISTE y es admin activa, este portillo tampoco se abre: nadie entra,
 * en ningún lado, y solo queda SQL a mano — el mismo callejón sin salida que
 * motivó el fix anterior, con una puerta distinta.
 *
 * `ultimoAcceso IS NOT NULL` es la diferencia entre "existe un admin" y "hay
 * un admin que ha logrado entrar alguna vez": esa columna SOLO se escribe
 * desde `registrarAcceso()`, más abajo, y `registrarAcceso()` SOLO se llama
 * tras una autenticación real contra Slack que ya resolvió esa fila (nunca al
 * dar de alta a alguien — `altaPersona` no la toca). Mientras NINGÚN admin
 * de la tabla haya entrado ni una vez de verdad, la clave de equipo sigue
 * sirviendo — que es exactamente el estado en el que un correo mal cargado
 * necesita el portillo para poder corregirse a sí mismo. En cuanto UN admin
 * entra una sola vez (con la clave, o porque otro correo sí coincidía), el
 * portillo se cierra otra vez, igual que antes.
 */
export async function hayAlgunAdminActivo(): Promise<boolean> {
  if (!hayDB()) return false
  const fila = (
    await db()
      .select({ correo: esquema.personas.correo })
      .from(esquema.personas)
      .where(
        and(
          eq(esquema.personas.rol, 'admin'),
          eq(esquema.personas.activa, true),
          isNotNull(esquema.personas.ultimoAcceso),
        ),
      )
      .limit(1)
  )[0]
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
  if (!esSquadMktCorp(datos.squad)) throw new Error(`Squad inválido: "${datos.squad}"`)
  await db().insert(esquema.personas).values({
    correo,
    nombre: datos.nombre,
    rol: datos.rol,
    squad: datos.squad,
  })
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
