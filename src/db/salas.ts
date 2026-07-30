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
import { slugsDeSalas } from '@/temas'

function validarSala(slug: string): void {
  if (!slugsDeSalas().includes(slug)) {
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
 * acción, es la regla que repite todo este repo (ver `exigirEquipo` en
 * src/auth/sesion.ts y sus llamadores) — así que se vuelve a preguntar aquí,
 * fresco, justo antes de escribir.
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
  validarSala(slug)
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
  validarSala(slug)
  if (!hayDB()) return
  await db()
    .update(esquema.salas)
    .set({ activa: true, pausadaDesde: null, updatedAt: new Date() })
    .where(and(eq(esquema.salas.slug, slug), eq(esquema.salas.activa, false)))
}
