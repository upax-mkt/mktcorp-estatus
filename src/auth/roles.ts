/**
 * QUIÉN PUEDE QUÉ.
 *
 * Un rol desconocido o ausente no puede nada: falla cerrado. Es lo que hace que
 * una sesión emitida antes de esta ronda —sin `rolApp`— no herede permisos por
 * accidente; su dueño vuelve a entrar por Slack y recibe el suyo.
 *
 * Los tres predicados puros (`puedeAdministrar`/`puedeEditarContenido`/
 * `puedeLeer`) viven en `src/auth/politica.ts`, junto al resto de "quién puede
 * ver y hacer qué" (`puedeEditar`, `puedeEditarAcuerdos`, `puedeVerSala`,
 * `puedeVerRuta`) — ahí es donde `puedeVerRuta` y `puedeEditarAcuerdos` ya los
 * necesitan para sí mismos, así que viven donde no crean un ciclo de imports
 * (politica.ts es puro: no toca cookies; este módulo sí, por `sesionActual()`).
 * Este archivo los reexporta para que quien los use no tenga que saber en qué
 * archivo se definieron, y añade las tres funciones que LANZAN, siguiendo el
 * mismo patrón que `exigirEquipo` en `src/auth/sesion.ts`.
 */
import { sesionActual } from './sesion'
import { puedeAdministrar, puedeEditarContenido, puedeLeer } from './politica'
import type { Sesion } from './firma'

export { puedeAdministrar, puedeEditarContenido, puedeLeer }

/**
 * Lanza si quien pide no es admin. Usar al inicio de toda acción que crea o
 * edita salas y marcas, personas, o el enlace público de la agenda.
 */
export async function exigirAdmin(): Promise<Sesion> {
  const sesion = await sesionActual()
  if (!puedeAdministrar(sesion)) {
    throw new Error('Esta acción es solo para administradores de Marketing Corporativo.')
  }
  return sesion as Sesion
}

/**
 * Lanza si quien pide no puede editar contenido. Usar al inicio de toda
 * acción que prepara, maqueta, minuta, publica, mueve acuerdos o sube a
 * Monday. La pasan admin y editor; viewer no.
 */
export async function exigirEditor(): Promise<Sesion> {
  const sesion = await sesionActual()
  if (!puedeEditarContenido(sesion)) {
    throw new Error('Esta acción requiere permiso de edición en Marketing Corporativo.')
  }
  return sesion as Sesion
}

/**
 * Lanza si quien pide ni siquiera puede leer. Usar en páginas de equipo que
 * solo muestran, sin ninguna escritura propia. La pasan los tres roles de
 * equipo (admin, editor, viewer); una sesión de sala o sin sesión, no.
 */
export async function exigirLectura(): Promise<Sesion> {
  const sesion = await sesionActual()
  if (!puedeLeer(sesion)) {
    throw new Error('Necesitas una cuenta de Marketing Corporativo para ver esto.')
  }
  return sesion as Sesion
}
