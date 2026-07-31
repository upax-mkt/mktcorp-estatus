'use server'

import { revalidatePath } from 'next/cache'
import { exigirAdmin } from '@/auth/roles'
import { hayDB } from '@/db/cliente'
import {
  altaPersona,
  cambiarRol,
  activarPersona,
  listarPersonas,
  normalizarCorreo,
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
 *    admins se rechaza diciendo por qué — `quedaAlMenosUnAdminActivo`, más
 *    abajo, lo comprueba contra el directorio REAL (`listarPersonas()`), no
 *    contra la sesión de quien pide: esa es solo una foto firmada de cuando
 *    esa persona entró, que puede llevar días desactualizada.
 *
 *    Esta guarda no es solo de `cambiarRolAction`/`activarPersonaAction`: TAMBIÉN
 *    protege `altaPersonaAction`. Parece contraintuitivo —dar de alta nunca
 *    QUITA a nadie— pero hay un camino real: el directorio EMPIEZA vacío, y
 *    mientras está vacío el portillo de emergencia (la clave de equipo, ver
 *    `src/auth/sesion.ts:claveDeEquipoSigueSirviendo`) deja entrar como admin
 *    a quien la teclee. Si esa primera alta se da de alta a SÍ MISMA o a
 *    cualquiera como editor/viewer en vez de admin, el directorio deja de
 *    estar vacío —el portillo se cierra para siempre— y se queda sin ningún
 *    admin: exactamente el "irrecuperable desde la app" que esta guarda
 *    existe para impedir, solo que por la puerta de entrada en vez de por la
 *    de salida.
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
 * Si, tras aplicar un cambio HIPOTÉTICO (sin escribir nada todavía), seguiría
 * quedando al menos un admin activo en el directorio.
 *
 * `correo === null` es el caso de ALTA: no hay una fila existente que
 * modificar, así que la pregunta es "¿ya había un admin activo, o la persona
 * nueva lo es?". Con un correo, es el caso de EDITAR/ACTIVAR: se simula el
 * cambio solo sobre la fila de ese correo y se deja el resto del directorio
 * tal cual.
 */
async function quedaAlMenosUnAdminActivo(
  correo: string | null,
  cambio: { rol?: RolPersona; activa?: boolean },
): Promise<boolean> {
  const personas = await listarPersonas()
  if (correo === null) {
    return personas.some((p) => p.rol === 'admin' && p.activa) || cambio.rol === 'admin'
  }
  return personas.some((p) => {
    const esLaFila = p.correo === correo
    const rol = esLaFila && cambio.rol !== undefined ? cambio.rol : p.rol
    const activa = esLaFila && cambio.activa !== undefined ? cambio.activa : p.activa
    return rol === 'admin' && activa
  })
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

  if (!(await quedaAlMenosUnAdminActivo(null, { rol: datos.rol }))) {
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
 *    se rechaza — nadie se quita el admin a sí mismo.
 * 2. Si tras el cambio no quedaría ningún admin activo, se rechaza —
 *    independiente de quién lo pida: cubre también al admin de una sesión
 *    vieja que ya no es el último, pero cuyo token firmado todavía no lo sabe.
 */
export async function cambiarRolAction(correo: string, rol: RolPersona): Promise<{ error?: string }> {
  const sesion = await exigirAdmin()
  const normalizado = normalizarCorreo(correo)

  if (normalizado && rol !== 'admin' && esUnoMismo(sesion.sub, normalizado)) {
    return { error: MENSAJE_NO_TE_TOQUES }
  }

  // Mismo criterio que en altaPersonaAction: sin base de datos, la guarda 2
  // (que lee `listarPersonas()`) rechazaría igual pero con el motivo
  // equivocado. La guarda 1, arriba, no la toca: es una comparación pura
  // sobre la sesión, cierta con o sin base de datos.
  if (!hayDB()) return { error: 'Sin base de datos no se puede cambiar el rol.' }

  if (normalizado && !(await quedaAlMenosUnAdminActivo(normalizado, { rol }))) {
    return { error: MENSAJE_SIN_ADMINS }
  }

  try {
    await cambiarRol(correo, rol)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo cambiar el rol.' }
  }
  revalidatePath('/personas')
  return {}
}

/**
 * Activa o desactiva a una persona. Mismas dos guardas que `cambiarRolAction`,
 * aplicadas a `activa` en vez de a `rol` — la 1 solo dispara al DESACTIVAR
 * (activarte a ti mismo no tiene ningún riesgo de dejarte fuera).
 */
export async function activarPersonaAction(correo: string, activa: boolean): Promise<{ error?: string }> {
  const sesion = await exigirAdmin()
  const normalizado = normalizarCorreo(correo)

  if (!activa && normalizado && esUnoMismo(sesion.sub, normalizado)) {
    return { error: MENSAJE_NO_TE_TOQUES }
  }

  // Mismo criterio que en las otras dos acciones de este archivo.
  if (!hayDB()) return { error: 'Sin base de datos no se puede activar/desactivar personas.' }

  if (normalizado && !(await quedaAlMenosUnAdminActivo(normalizado, { activa }))) {
    return { error: MENSAJE_SIN_ADMINS }
  }

  try {
    await activarPersona(correo, activa)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo cambiar el acceso.' }
  }
  revalidatePath('/personas')
  return {}
}
