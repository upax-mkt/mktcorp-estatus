/**
 * QUIÉN PUEDE QUÉ.
 *
 * Un rol desconocido o ausente no puede nada: falla cerrado. Es lo que hace que
 * una sesión emitida antes de esta ronda —sin `rolApp`— no herede permisos por
 * accidente; su dueño vuelve a entrar por Slack y recibe el suyo.
 *
 * Los tres predicados puros (`puedeAdministrar`/`puedeEditarContenido`/
 * `puedeLeer`) viven en `src/auth/politica.ts`, junto al resto de "quién puede
 * ver y hacer qué" (`puedeEditarAcuerdos`, `puedeVerSala`, `puedeVerRuta`) —
 * ahí es donde `puedeVerRuta` y `puedeEditarAcuerdos` ya los necesitan para sí
 * mismos, así que viven donde no crean un ciclo de imports (politica.ts es
 * puro: no toca cookies; este módulo sí, por `sesionActual()`). Este archivo
 * los reexporta para que quien los use no tenga que saber en qué archivo se
 * definieron, y añade las funciones que LANZAN y las que devuelven `boolean`
 * para condicionar una pantalla.
 *
 * ESTA ES LA ÚNICA VÍA DE AUTORIZACIÓN DE ESTE REPO, a propósito.
 *
 * Hasta la ronda 9 existía además `esEquipo()`/`exigirEquipo()`
 * (`src/auth/sesion.ts`, ya retiradas), respaldadas por un `puedeEditar()`
 * que solo miraba `sesion.rol === 'equipo'` y **nunca el `rolApp`** — una
 * cuarta vía que no pasaba por ninguno de los tres predicados de aquí arriba.
 * El resultado: 7 sitios seguían dejando pasar a CUALQUIER equipo —viewer
 * incluido, y hasta una sesión sin `rolApp`— a acciones que debían ser de
 * editor o de admin (publicar una minuta, generar el enlace de acceso de una
 * sala, subir archivos a Blob). Se corrigió repartiendo esos 7 sitios igual
 * que las 47 llamadas originales, y retirando la vía vieja del todo — no
 * había forma de que un grep por nombre de función la seleccionara si nadie
 * sabía que existía. Si hace falta un `boolean` para una pantalla, usar
 * `esAdmin()`/`esEditor()`/`esLector()`, de aquí — nunca escribir un chequeo
 * nuevo que mire `sesion.rol` a mano sin pasar por un predicado de arriba.
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

// ---- Las mismas tres, en boolean — para condicionar una pantalla ----
//
// El equivalente de las tres de arriba pero sin lanzar: para decidir qué
// pintar (mostrar un botón, cargar el directorio, generar un enlace), no
// para proteger una escritura — eso lo siguen haciendo las que lanzan, en el
// propio Server Action o Route Handler, pegadas al dato. Sustituyen a la
// vieja `esEquipo()` (retirada, ver la cabecera de este archivo): cada una
// mira el `rolApp` de verdad, así que una sesión sin rol no pasa ninguna.

/** true si quien pide administra Marketing Corporativo (rolApp === 'admin'). */
export async function esAdmin(): Promise<boolean> {
  return puedeAdministrar(await sesionActual())
}

/** true si quien pide puede editar contenido (rolApp === 'admin' o 'editor'). */
export async function esEditor(): Promise<boolean> {
  return puedeEditarContenido(await sesionActual())
}

/** true si quien pide es del equipo con cualquiera de los tres roles de app. */
export async function esLector(): Promise<boolean> {
  return puedeLeer(await sesionActual())
}
