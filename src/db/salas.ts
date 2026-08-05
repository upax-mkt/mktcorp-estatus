/**
 * Lectura puntual y escritura de la tabla `salas`: el freeze comercial
 * (tarea 12, ronda 7).
 *
 * Vive APARTE de `src/db/consultas.ts` —que es la capa de lectura para el
 * shell, con el join pesado sala+sesiones+acuerdos+minutas— porque
 * `crearSesion` (src/db/sesiones.ts) necesita preguntar "¿esta sala sigue
 * activa AHORA MISMO?" antes de escribir, y consultas.ts ya importa de
 * sesiones.ts (para `esLlenado`): importar en el sentido contrario crearía un
 * ciclo. Este módulo no depende de ninguno de los dos, así que ambos —y
 * `src/app/acuerdos/acciones.ts`— lo pueden usar sin problema.
 */
import { and, eq } from 'drizzle-orm'
import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import { cargarTemas } from './temas'

/**
 * ¿EXISTE esta sala? — no "¿es una de las nueve salas de cliente?" (ronda 10,
 * tarea 15b). Hasta el 5-ago esta función hacía la segunda pregunta por la
 * primera: comprobaba contra `slugsDeSalas()` (src/db/temas.ts), la lista
 * CURADA de las 8 UDNs + Ceci que sirve para LISTAR, SELECCIONAR y ADMITIR
 * sesiones/acuerdos/archivos/claves NUEVAS — y esa lista excluye a
 * `grupo-upax` a propósito desde el 24-jul (ver su comentario en temas.ts).
 * Efecto colateral: `grupo-upax`, una fila real y activa en `salas`, no se
 * podía pausar ni reactivar — reventaba con "Sala desconocida" — porque la
 * pregunta que de verdad hace falta aquí ("¿la fila está en la tabla?") se
 * respondía con la lista equivocada.
 *
 * `pausarSala`/`reactivarSala` no necesitan saber si el slug es una de las
 * nueve navegables para un director; necesitan saber si hay una FILA sobre la
 * que escribir. `cargarTemas()` es la lectura completa de `salas` —las diez
 * filas, `grupo-upax` incluida— así que preguntarle a su registro es
 * preguntar exactamente eso. Que la fila siga además ACTIVA es una pregunta
 * distinta (`salaEstaActiva`, abajo) que ya se resuelve fresca, dentro del
 * propio UPDATE, cada vez que se pausa o reactiva.
 *
 * `Object.keys(registro)` y no `slug in registro`: `registro` es un objeto
 * plano y `in` recorre también la cadena de prototipos (`'constructor' in {}`
 * da `true`), lo que dejaría pasar un slug inventado que coincida con una
 * propiedad heredada de `Object`. `Object.keys()` solo trae las llaves
 * PROPIAS del registro — ninguna sala se llama así, pero un slug inventado
 * sigue sin poder colarse (ver el test correspondiente).
 *
 * Si mañana hace falta otra sala nueva de verdad (no `grupo-upax`, que ya
 * existe): sigue sin poder crearse desde aquí — esto solo valida sobre lo que
 * YA está en la tabla, no da de alta nada. Alta de salas sigue siendo
 * `crearSalaAction` (src/app/salas/acciones.ts).
 *
 * Sin DB, `cargarTemas()` cae a `SEMILLA_DE_TEMAS` (src/temas/semilla.ts):
 * las diez marcas tal como estaban en código, `grupo-upax` incluida — así que
 * esta validación se comporta igual con o sin base, sin mockear Postgres
 * (ver src/db/salas.test.ts).
 */
async function validarSala(slug: string): Promise<void> {
  const registro = await cargarTemas()
  if (!Object.keys(registro).includes(slug)) {
    throw new Error(`Sala desconocida: "${slug}"`)
  }
}

/**
 * Si la sala sigue activa AHORA MISMO — sin fiarse de un estado ya resuelto
 * (un `EstadoSala` leído al pintar una página, por ejemplo).
 *
 * Hace falta porque una Server Action —o, más abajo en la pila, `crearSesion`—
 * vive más que el render que la disparó: si alguien pausa la sala en otra
 * pestaña mientras esta sigue abierta, un cierre que confiara en el estado de
 * cuando se pintó la página seguiría viendo la sala activa. Esconder el botón
 * de "preparar sesión nueva" no alcanza — ocultar un botón no protege una
 * acción, es la regla que repite todo este repo (ver `exigirAdmin`/
 * `exigirEditor`/`exigirLectura` en src/auth/roles.ts y sus llamadores) —
 * así que se vuelve a preguntar aquí, fresco, justo antes de escribir.
 *
 * Sin DB no hay freeze que consultar: el store en memoria no modela
 * `salas.activa` (mismo motivo que en `todosLosAcuerdos`, consultas.ts), así
 * que toda sala se trata como activa.
 */
export async function salaEstaActiva(slug: string): Promise<boolean> {
  if (!hayDB()) return true
  const fila = (
    await db().select({ activa: esquema.salas.activa }).from(esquema.salas).where(eq(esquema.salas.slug, slug))
  )[0]
  return fila?.activa ?? true
}

/** El `slug` de cada sala en pausa. Para marcarlas en un selector sin traer toda su fila. */
export async function slugsDeSalasPausadas(): Promise<Set<string>> {
  if (!hayDB()) return new Set()
  const filas = await db()
    .select({ slug: esquema.salas.slug })
    .from(esquema.salas)
    .where(eq(esquema.salas.activa, false))
  return new Set(filas.map((f) => f.slug))
}

/**
 * Pausa una sala: freeze comercial, sin reuniones ni gestión hasta nuevo
 * aviso. No se borra nada — su historia sigue entera y se consulta — pero
 * desde este momento sus acuerdos dejan de vencer (ver `estatusEfectivo`,
 * src/dominio/salas.ts) y no se puede preparar una sesión nueva para ella
 * (ver `crearSesion`, src/db/sesiones.ts).
 *
 * El WHERE exige `activa = true`, igual que la reclamación de
 * `subirAcuerdoAction` (src/app/acuerdos/acciones.ts): una pestaña vieja que
 * vuelva a mandar "pausar" sobre una sala que ya está en pausa no debe pisar
 * la fecha de freeze original con la de hoy.
 */
export async function pausarSala(slug: string): Promise<void> {
  await validarSala(slug)
  if (!hayDB()) return
  await db()
    .update(esquema.salas)
    .set({ activa: false, pausadaDesde: new Date(), updatedAt: new Date() })
    .where(and(eq(esquema.salas.slug, slug), eq(esquema.salas.activa, true)))
}

/**
 * Reactiva una sala: sus acuerdos VUELVEN A CORRER. Uno que ya pasó de fecha
 * aparece vencido ese mismo día — la contrapartida exacta de pausar: si
 * congelar impide que venzan, reactivar tiene que devolverles el
 * vencimiento, no dejarlos en un limbo permanente. No hace falta recalcular
 * nada aquí: `estatusEfectivo` ya lo hace al LEER, así que basta con volver a
 * poner `activa = true` (ver su test en src/dominio/salas.test.ts).
 */
export async function reactivarSala(slug: string): Promise<void> {
  await validarSala(slug)
  if (!hayDB()) return
  await db()
    .update(esquema.salas)
    .set({ activa: true, pausadaDesde: null, updatedAt: new Date() })
    .where(and(eq(esquema.salas.slug, slug), eq(esquema.salas.activa, false)))
}
