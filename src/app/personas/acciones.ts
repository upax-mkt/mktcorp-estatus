'use server'

import { and, eq, ne, exists } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { exigirAdmin } from '@/auth/roles'
import { db, hayDB } from '@/db/cliente'
import * as esquema from '@/db/esquema'
import {
  altaPersona,
  buscarPersona,
  listarPersonas,
  normalizarCorreo,
  esRolValido,
  type RolPersona,
  type NuevaPersona,
} from '@/db/directorio'

/**
 * LAS ACCIONES DE `/personas`: dar de alta, cambiar rol y activar/desactivar.
 *
 * Todas empiezan con `exigirAdmin()`, primera línea, sin excepción — esconder
 * un botón en la pantalla no protege nada: son Server Actions, y quien
 * conozca su nombre las puede llamar sin pasar por la pantalla (ver
 * `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`, sección
 * "Security": "the route is reachable to anyone who can send the same
 * POST"). Mismo criterio que `src/app/salas/acciones.ts`, su modelo.
 *
 * LAS DOS GUARDAS DE ESTA TAREA viven aquí, no en la pantalla, y con test
 * (`acciones.test.ts`):
 *
 * 1. NADIE SE QUITA A SÍ MISMO EL ADMIN NI SE DESACTIVA. Quedarse fuera de
 *    la única pantalla que devuelve el acceso es una trampa sin salida: no
 *    habría forma de volver a entrar salvo tocando la base a mano. Se decide
 *    comparando el correo objetivo contra `sesion.sub` — quién es de verdad
 *    quien pide, no un dato que mande el formulario (el cliente legítimamente
 *    dice QUÉ correo tocar, pero la identidad de quien pide sale de la
 *    sesión firmada, nunca del payload — mismo criterio que el ejemplo
 *    "Safe" de la guía de arriba).
 *
 * 2. TIENE QUE QUEDAR AL MENOS UN ADMIN ACTIVO. La acción que dejaría cero
 *    admins se rechaza diciendo por qué.
 *
 *    EN `cambiarRolAction`/`activarPersonaAction` esto va DENTRO del propio
 *    `WHERE` del `UPDATE` — revisión del coordinador: la primera versión la
 *    comprobaba con una lectura aparte (`listarPersonas()`) y ESCRIBÍA
 *    después, en dos viajes a la base. Dos peticiones casi simultáneas sobre
 *    los dos últimos admins pasaban las dos la comprobación antes de que
 *    ninguna escribiera, y el directorio se quedaba con cero admins — y de
 *    ahí no hay vuelta: el portillo de emergencia solo mira si el directorio
 *    tiene ALGUNA fila, no si le queda algún admin (ver
 *    `src/auth/sesion.ts:claveDeEquipoSigueSirviendo`), así que con gente
 *    dentro y sin admin, ni esta pantalla ni la clave de equipo devuelven el
 *    acceso: solo SQL a mano.
 *
 *    Neon (driver HTTP) no soporta transacciones, así que se cierra como
 *    `subirAcuerdoAction` reclama su fila (`src/app/acuerdos/acciones.ts`,
 *    `WHERE bandeja = 'pendiente'`) y como se resolvió el token de la agenda
 *    en la ronda 8: UNA SOLA sentencia condicional. `existeOtroAdminActivo`,
 *    más abajo, es una subconsulta `EXISTS` que entra en el propio `WHERE`
 *    del `UPDATE` — Postgres la evalúa y escribe en el mismo paso, así que no
 *    hay ventana entre "comprobar" y "escribir" en la que otra petición se
 *    pueda colar. Si el `UPDATE` afecta 0 filas, se distingue "el correo no
 *    existe" de "la guarda lo rechazó" con una lectura POSTERIOR
 *    (`buscarPersona`) que ya no decide nada — solo elige el mensaje.
 *
 *    EN `altaPersonaAction`, en cambio, se queda con la lectura aparte
 *    (`hayAdminActivoOSeraAdmin`, más abajo) — a propósito, no es un
 *    descuido: un ALTA nunca QUITA a nadie, así que en la peor carrera (dos
 *    altas casi simultáneas contra un directorio vacío) cada una lee el
 *    estado ANTES de que la otra escriba — como mucho las dos se rechazan de
 *    más, nunca al revés. Un `INSERT` es monótono: no hay forma de que dos
 *    `INSERT` concurrentes bajen el conteo de admins por debajo de lo que
 *    cada uno vio por separado.
 */

/** El mensaje es el mismo en las dos acciones que pueden dispararla: mismo texto, misma explicación. */
const MENSAJE_NO_TE_TOQUES =
  'No puedes hacerte esto a ti mismo: te dejaría fuera de la única pantalla que devuelve el acceso, sin forma de volver a entrar salvo tocando la base de datos a mano.'

const MENSAJE_SIN_ADMINS =
  'Esta acción dejaría el directorio sin ningún administrador activo: nadie podría volver a dar de alta ni corregir a nadie. Rechazada.'

/** true si `correoDeLaSesion` (normalizado) es la misma persona que `correoObjetivo` (ya normalizado). */
function esUnoMismo(correoDeLaSesion: string | undefined, correoObjetivo: string): boolean {
  if (!correoDeLaSesion) return false
  return normalizarCorreo(correoDeLaSesion) === correoObjetivo
}

/**
 * Condición SQL —para meter dentro de un `WHERE`— de "existe OTRA fila,
 * activa, con rol admin". Es la mitad de la guarda 2 que sí cabe dentro de
 * una sola sentencia: `correoExcluido` es siempre la fila que se está
 * escribiendo, así que esto pregunta "¿queda algún admin FUERA de esta
 * fila?", nunca por la fila propia (que es justo lo que va a cambiar).
 */
function existeOtroAdminActivo(correoExcluido: string) {
  return exists(
    db()
      .select({ correo: esquema.personas.correo })
      .from(esquema.personas)
      .where(
        and(
          ne(esquema.personas.correo, correoExcluido),
          eq(esquema.personas.rol, 'admin'),
          eq(esquema.personas.activa, true),
        ),
      ),
  )
}

/**
 * Guarda 2, SOLO para `altaPersonaAction` — ver en la cabecera del archivo
 * por qué esta SÍ puede quedarse con una lectura aparte sin abrir una
 * ventana de carrera insegura (un alta es monótona, nunca quita a nadie).
 */
async function hayAdminActivoOSeraAdmin(rolNuevo: RolPersona): Promise<boolean> {
  const personas = await listarPersonas()
  return personas.some((p) => p.rol === 'admin' && p.activa) || rolNuevo === 'admin'
}

/**
 * Da de alta una persona. Guarda 2 (ver cabecera del archivo): si el
 * directorio todavía no tiene ningún admin activo, la persona nueva TIENE
 * que serlo — si no, se rechaza antes de escribir nada.
 */
export async function altaPersonaAction(datos: NuevaPersona): Promise<{ error?: string }> {
  await exigirAdmin()

  // Antes de la guarda 2: sin base de datos, `listarPersonas()` cae a `[]` a
  // propósito (ver la cabecera de src/db/directorio.ts) y esa lista vacía
  // haría que la guarda de abajo rechazara con "sin ningún administrador
  // activo" — cierto, pero no la razón real. Esta comprobación deja que sea
  // `altaPersona()`, más abajo, quien lo diga tal como es.
  if (!hayDB()) return { error: 'Sin base de datos no se pueden dar de alta personas.' }

  if (!(await hayAdminActivoOSeraAdmin(datos.rol))) {
    return { error: MENSAJE_SIN_ADMINS }
  }

  try {
    await altaPersona(datos)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo dar de alta a la persona.' }
  }
  revalidatePath('/personas')
  revalidatePath('/')
  return {}
}

/**
 * Cambia el rol de una persona. Las dos guardas de la tarea, en orden:
 *
 * 1. Si el correo objetivo es el de quien pide Y el rol nuevo no es 'admin',
 *    se rechaza — nadie se quita el admin a sí mismo. Comparación pura sobre
 *    la sesión, sin tocar la base.
 * 2. Si el rol nuevo no es 'admin', el propio `UPDATE` exige en su `WHERE`
 *    que YA exista otra fila admin activa (`existeOtroAdminActivo`) — si no,
 *    afecta 0 filas y se rechaza. Cuando el rol nuevo SÍ es 'admin' no hay
 *    ningún riesgo que cubrir (nunca se resta un admin), así que el `WHERE`
 *    se queda en la comprobación simple del correo.
 */
export async function cambiarRolAction(correo: string, rol: RolPersona): Promise<{ error?: string }> {
  const sesion = await exigirAdmin()
  const normalizado = normalizarCorreo(correo)

  if (normalizado && rol !== 'admin' && esUnoMismo(sesion.sub, normalizado)) {
    return { error: MENSAJE_NO_TE_TOQUES }
  }

  if (!hayDB()) return { error: 'Sin base de datos no se puede cambiar el rol.' }
  if (!normalizado) return { error: `Correo inválido: "${correo}"` }
  if (!esRolValido(rol)) return { error: `Rol inválido: "${rol}"` }

  try {
    const condicion =
      rol === 'admin'
        ? eq(esquema.personas.correo, normalizado)
        : and(eq(esquema.personas.correo, normalizado), existeOtroAdminActivo(normalizado))

    const actualizadas = await db()
      .update(esquema.personas)
      .set({ rol })
      .where(condicion)
      .returning({ correo: esquema.personas.correo })

    if (actualizadas.length === 0) {
      // 0 filas es ambiguo entre "el correo no existe" y "la guarda 2 lo
      // rechazó" — se distingue con una lectura POSTERIOR, que ya no decide
      // nada (el rechazo ya pasó): solo elige cuál de los dos mensajes es
      // el real. Mismo criterio que `subirAcuerdoAction` con `existe`.
      const existente = await buscarPersona(normalizado)
      return { error: existente ? MENSAJE_SIN_ADMINS : `Persona no encontrada: "${normalizado}"` }
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo cambiar el rol.' }
  }
  revalidatePath('/personas')
  return {}
}

/**
 * Activa o desactiva a una persona. Mismas dos guardas que `cambiarRolAction`
 * y misma técnica atómica, aplicadas a `activa` en vez de a `rol`:
 *
 * 1. Solo dispara al DESACTIVAR (activarte a ti mismo no tiene ningún riesgo
 *    de dejarte fuera).
 * 2. Solo al desactivar: el `WHERE` exige `existeOtroAdminActivo` cuando
 *    `activa` pasa a `false`. Activar nunca resta, así que no necesita nada
 *    extra en el `WHERE`.
 */
export async function activarPersonaAction(correo: string, activa: boolean): Promise<{ error?: string }> {
  const sesion = await exigirAdmin()
  const normalizado = normalizarCorreo(correo)

  if (!activa && normalizado && esUnoMismo(sesion.sub, normalizado)) {
    return { error: MENSAJE_NO_TE_TOQUES }
  }

  if (!hayDB()) return { error: 'Sin base de datos no se puede activar/desactivar personas.' }
  if (!normalizado) return { error: `Correo inválido: "${correo}"` }

  try {
    const condicion = activa
      ? eq(esquema.personas.correo, normalizado)
      : and(eq(esquema.personas.correo, normalizado), existeOtroAdminActivo(normalizado))

    const actualizadas = await db()
      .update(esquema.personas)
      .set({ activa })
      .where(condicion)
      .returning({ correo: esquema.personas.correo })

    if (actualizadas.length === 0) {
      const existente = await buscarPersona(normalizado)
      return { error: existente ? MENSAJE_SIN_ADMINS : `Persona no encontrada: "${normalizado}"` }
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo cambiar el acceso.' }
  }
  revalidatePath('/personas')
  return {}
}
