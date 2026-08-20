'use server'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db, hayDB } from '@/db/cliente'
import * as esquema from '@/db/esquema'
import { exigirAdmin, exigirEditor } from '@/auth/roles'
import { pausarSala, reactivarSala } from '@/db/salas'
import {
  editarAcuerdo,
  eliminarAcuerdo,
  moverAcuerdoDeSala,
  moverEstatus,
  salaDeAcuerdo,
  type EstatusAcuerdo,
} from '@/db/acuerdos'
import { instanteEnCDMX } from '@/lib/fecha'

// ---- La estrella (tarea 11, ronda 7; su significado cambió en la ronda 14, tarea 5) ----

/**
 * Fija o quita un acuerdo arriba en `/acuerdos`, cruzando las diez salas. Es
 * la ÚNICA acción detrás de la estrella — `Estrella.tsx` no sabe nada de
 * Drizzle, solo recibe esta función por prop — así que el mismo botón sirve
 * en el espacio de acuerdos y en la sala sin que ninguna pantalla
 * reimplemente la regla por su cuenta.
 *
 * Hasta la ronda 14 destacar quería decir "sale en el Home" y el plan era
 * cablear un tercer sitio ahí (tarea 12, nunca escrita); el Home dejó de
 * listar acuerdos (§4 del spec) antes de que esa tarea existiera, así que ya
 * no hay un tercer sitio que cablear — se queda en dos, y esta acción no
 * cambió de firma ni de guarda, solo lo que su resultado significa en
 * pantalla (ver Estrella.tsx y `ordenarDestacadoArriba` en TablaAcuerdos.tsx).
 *
 * `exigirEditor()` y no `exigirEdicionDeAcuerdos(slug)`: fijar decide el
 * orden de una vitrina COMPARTIDA por las diez salas, no el estatus de un
 * compromiso dentro de la sala de su propio dueño. Es Mkt Corp quien cura esa
 * vitrina — el director de la UDN sigue pudiendo mover el estatus y la fecha
 * de los suyos, pero no fijarse arriba por su cuenta para todos.
 */
export async function destacarAction(id: string, destacado: boolean): Promise<void> {
  await exigirEditor()
  // Sin DB no hay nada que persistir — mismo criterio que todosLosAcuerdos()
  // en src/db/consultas.ts, que en ese caso ya devuelve la lista vacía.
  if (!hayDB()) return

  const fila = (
    await db()
      .update(esquema.acuerdos)
      .set({ destacado, updatedAt: new Date() })
      .where(eq(esquema.acuerdos.id, id))
      .returning({ salaSlug: esquema.acuerdos.salaSlug })
  )[0]
  if (!fila) throw new Error(`Acuerdo no encontrado: "${id}"`)

  // Las tres pantallas donde se puede ver o tocar la estrella hoy y mañana:
  // este espacio, el Home (tarea 12) y la propia sala.
  revalidatePath('/acuerdos')
  revalidatePath('/')
  revalidatePath(`/cliente/${fila.salaSlug}`)
}

// ---- El freeze de salas (tarea 12, ronda 7) ----

/**
 * Pausa una sala — ver la cabecera de `pausarSala` (src/db/salas.ts) para el
 * qué y el porqué. Aquí no va `exigirEdicionDeAcuerdos`: decidir si una
 * relación comercial sigue activa es una decisión de Mkt Corp sobre el
 * cliente, distinta de mover el estatus de un compromiso puntual — que sí
 * puede tocar el propio director de la UDN.
 *
 * `exigirAdmin()` y no `exigirEditor()` (ronda 9, tarea 2 — no está en la
 * tabla del brief tal cual, así que queda dicho aquí): congelar o reactivar
 * una sala cambia su fila en `salas` igual que crearla o editarla, y es una
 * decisión sobre la relación comercial con el cliente, no una tarea de
 * contenido del día a día — el mismo nivel que crear/editar salas y marcas.
 */
export async function pausarSalaAction(slug: string): Promise<void> {
  await exigirAdmin()
  await pausarSala(slug)
  // Las cuatro pantallas que un freeze cambia: la propia sala (el
  // interruptor y el aviso), el Home (el bloque "En pausa" y los acuerdos que
  // dejan de contar), el espacio de acuerdos (el bloque "Congelados") y la
  // bandeja (sus pendientes dejan de ofrecerse — ver `entraALaBandeja`).
  revalidatePath(`/cliente/${slug}`)
  revalidatePath('/')
  revalidatePath('/acuerdos')
  revalidatePath('/acuerdos/bandeja')
}

/** Reactiva una sala — ver la cabecera de `reactivarSala` (src/db/salas.ts). */
export async function reactivarSalaAction(slug: string): Promise<void> {
  await exigirAdmin()
  await reactivarSala(slug)
  revalidatePath(`/cliente/${slug}`)
  revalidatePath('/')
  revalidatePath('/acuerdos')
  revalidatePath('/acuerdos/bandeja')
}

// ---- Corregir y eliminar desde la pestaña de acuerdos (ronda 13) ----

/**
 * CORREGIR UN ACUERDO DESDE `/acuerdos`, sin entrar a su sala.
 *
 * Franco (13-ago): *"hay acuerdos que no tienen responsable, y no los puedo
 * editar ni la persona ni el equipo (UDN o Squads de mkt)"*. La pantalla que
 * cruza las nueve salas —la única donde se ven juntos los que están sin
 * dueño— era de solo lectura: para ponerle responsable a uno había que
 * abrir su sala, y para repartir cinco, cinco salas.
 *
 * Es la MISMA edición que hace la sala (`editarAcuerdo` en src/db/acuerdos.ts,
 * que ya recalcula la bandeja si el responsable cambia y sincroniza con
 * la historia, la fecha): aquí no se reimplementa nada, solo cambia desde dónde
 * se llama. Y `exigirEditor()` como allá — corregir el texto de un acuerdo es
 * trabajo de equipo, no una decisión de administración.
 *
 * La sala a revalidar se PREGUNTA a la base (`salaDeAcuerdo`) en vez de
 * viajar desde el cliente: esta pantalla es de todas las salas, y un slug que
 * llega por parámetro es un slug que alguien puede cambiar.
 */
export async function editarAcuerdoEnTablaAction(
  acuerdoId: string,
  cambios: { que: string; responsable: string },
): Promise<{ error?: string }> {
  await exigirEditor()
  try {
    await editarAcuerdo(acuerdoId, cambios)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo guardar' }
  }
  await revalidarAcuerdo(acuerdoId)
  return {}
}

/**
 * ELIMINAR UN ACUERDO DESDE `/acuerdos`. Franco: *"como administrador debo
 * poder eliminar acuerdos desde la pestaña acuerdos"*.
 *
 * `exigirAdmin()` y no `exigirEditor()`, que es lo que pide la MISMA acción
 * dentro de una sala. La diferencia es el alcance de la pantalla: en la sala
 * se borra un acuerdo mirando el contexto de esa UDN; aquí están los de las
 * nueve juntos, filtrables, y el borrado es un DELETE sin papelera. Es
 * también lo que pidió Franco con todas las letras ("como administrador"), y
 * conceder de menos se corrige en una línea — conceder de más lo paga alguien
 * que pierde un compromiso que no era suyo.
 */
export async function eliminarAcuerdoEnTablaAction(acuerdoId: string): Promise<void> {
  await exigirAdmin()
  // El slug se lee ANTES de borrar: después, la fila ya no está y no habría a
  // qué sala revalidar — la vería con el acuerdo aún puesto hasta que algo
  // más la tocara.
  const slug = await salaDeAcuerdo(acuerdoId)
  await eliminarAcuerdo(acuerdoId)
  revalidarPantallasDeAcuerdos(slug)
}

// ---- Estatus y fecha desde la pestaña de acuerdos (ronda 14, tarea 2) ----

/**
 * CAMBIAR EL ESTADO DE UN ACUERDO DESDE `/acuerdos`.
 *
 * `exigirEditor()` y no `exigirAdmin()`: corregir el estado es trabajo de
 * equipo, igual que corregir el texto (`editarAcuerdoEnTablaAction`). Solo
 * ELIMINAR pide admin en esta pantalla, y por un motivo distinto — es un
 * DELETE sin papelera sobre las nueve salas a la vez.
 */
export async function cambiarEstatusEnTablaAction(
  acuerdoId: string,
  estatus: EstatusAcuerdo,
): Promise<void> {
  await exigirEditor()
  await moverEstatus(acuerdoId, estatus)
  await revalidarAcuerdo(acuerdoId)
}

/**
 * LA FECHA COMPROMISO, DESDE `/acuerdos`.
 *
 * `null` no es un fallo de validación: "sin fecha" es un estado legítimo y la
 * app ya lo pinta como tal ("sin fecha"), además de ordenarlo aparte — lo
 * abierto sin fecha va al final de lo vivo (`dominio/orden-acuerdos.ts`).
 * Vaciar el campo tiene que poder significar eso, o no habría forma de
 * deshacer una fecha puesta por error.
 *
 * `instanteEnCDMX` y NO `new Date(fecha)`: `fechaCompromiso` es un `Date` y
 * `new Date('2026-09-01')` es medianoche UTC — las 18:00 del 31 de agosto en
 * México, así que el acuerdo se guardaría con un día de menos. Medido para
 * esta tarea (sin tocar la base): `new Date('2026-09-01')` da
 * `diaCivil` = "2026-08-31"; `instanteEnCDMX('2026-09-01', '12:00')` da
 * "2026-09-01", que es lo correcto. Las 12:00 y no las 00:00: un mediodía
 * civil no cambia de día por ningún desfase de zona ni por el horario de
 * verano.
 *
 * LOS SEIS ESCRITORES DE ESTA COLUMNA, no dos (corregido en la revisión final
 * de la ronda 14: la tarea 2 unificó tres y dejó tres con `new Date`). Hoy
 * escriben `fechaCompromiso` con `instanteEnCDMX(dia, '12:00')`: esta acción,
 * `editarEnBandejaAction` (arriba, en este mismo archivo), `editarFechaAction`
 * y `crearAcuerdoAction` de la sala (src/app/cliente/[slug]/page.tsx),
 * `ponerFechaAction` del Home (src/app/page.tsx) y la publicación de minuta
 * (`guardarMinuta`, src/db/minutas.ts). Que coincidan no es orden por el
 * orden: `crearAcuerdo` deduplica los acuerdos de una minuta comparando el
 * INSTANTE exacto de esta columna, así que dos instantes para el mismo día
 * civil le hacían insertar duplicados (hallazgo C1; la secuencia completa,
 * en src/db/minutas.ts y en su test de regresión).
 */
export async function editarFechaEnTablaAction(
  acuerdoId: string,
  fecha: string | null,
): Promise<void> {
  await exigirEditor()
  await editarAcuerdo(acuerdoId, {
    fechaCompromiso: fecha ? instanteEnCDMX(fecha, '12:00') : null,
  })
  await revalidarAcuerdo(acuerdoId)
}

/**
 * MOVER UN ACUERDO DE SALA DESDE `/acuerdos` (ronda 14, tarea 3). Franco: un
 * acuerdo registrado en la sala equivocada hoy solo se arregla borrándolo y
 * volviéndolo a crear, y eso pierde su origen y su historia.
 *
 * `exigirEditor()` y no `exigirAdmin()` — igual que corregir el texto
 * (`editarAcuerdoEnTablaAction`) o el estatus (`cambiarEstatusEnTablaAction`):
 * mover de sala corrige un dato mal capturado, es trabajo de equipo. Solo
 * ELIMINAR pide admin en esta pantalla, y por un motivo que no aplica aquí —
 * es un DELETE sin papelera.
 *
 * ⚠️ SE REVALIDAN LAS DOS SALAS, y el origen se lee ANTES del `await
 * moverAcuerdoDeSala`. Después de mover, `salaDeAcuerdo` ya devuelve la de
 * destino, así que la de origen se quedaría pintando un acuerdo que ya no
 * tiene — el mismo cuidado que `eliminarAcuerdoEnTablaAction` documenta para
 * el borrado, aplicado aquí porque hay DOS pantallas de sala en juego, no
 * una que deja de existir.
 */
export async function moverDeSalaAction(
  acuerdoId: string,
  salaSlug: string,
): Promise<{ error?: string }> {
  await exigirEditor()
  const origen = await salaDeAcuerdo(acuerdoId)
  try {
    await moverAcuerdoDeSala(acuerdoId, salaSlug)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo mover' }
  }
  revalidarPantallasDeAcuerdos(origen)
  revalidarPantallasDeAcuerdos(salaSlug)
  return {}
}

/** Las cuatro pantallas donde un acuerdo puede estar, más su sala. */
async function revalidarAcuerdo(acuerdoId: string): Promise<void> {
  revalidarPantallasDeAcuerdos(await salaDeAcuerdo(acuerdoId))
}

function revalidarPantallasDeAcuerdos(slug: string | null): void {
  revalidatePath('/acuerdos')
  revalidatePath('/acuerdos/bandeja')
  revalidatePath('/')
  if (slug) revalidatePath(`/cliente/${slug}`)
}
