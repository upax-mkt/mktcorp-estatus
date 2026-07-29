'use server'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db, hayDB } from '@/db/cliente'
import * as esquema from '@/db/esquema'
import { exigirEquipo } from '@/auth/sesion'
import { existeElGrupo, crearElementoEnDelivery, crearSubelemento } from '@/monday/cliente'

/**
 * Las acciones de la bandeja. Todas empiezan comprobando la sesión: esto
 * escribe en el tablero de 950 elementos que usa el equipo entero, y ocultar un
 * botón no protege una acción.
 */
export async function subirAcuerdoAction(
  id: string,
  destino: { tipo: 'elemento' } | { tipo: 'subelemento'; padreId: string },
): Promise<void> {
  await exigirEquipo()
  if (!hayDB()) throw new Error('Sin base de datos no hay nada que subir.')

  // El grupo se comprueba ANTES de escribir. Es la lección del dashboard viejo:
  // lleva meses mandando elementos a un grupo que alguien borró, y nada avisa.
  if (!(await existeElGrupo())) {
    throw new Error(
      `El grupo ${process.env.MONDAY_GRUPO ?? '(sin configurar)'} no existe en el tablero. No se sube nada hasta arreglarlo.`,
    )
  }

  /**
   * RECLAMA LA FILA ANTES DE LLAMAR A MONDAY, no después (revisión de Franco
   * a esta tarea).
   *
   * Antes, esto leía el acuerdo (SELECT), llamaba a Monday, y SOLO ENTONCES
   * marcaba `bandeja = 'subido'`. Con dos pestañas abiertas sobre el mismo
   * acuerdo, las dos leen `pendiente` antes de que ninguna escriba nada, y
   * las dos llaman a Monday: dos elementos para el mismo acuerdo en un
   * tablero que mira todo el equipo — justo lo que esta bandeja existe para
   * evitar.
   *
   * Este UPDATE con `WHERE bandeja = 'pendiente'` es la reclamación. Postgres
   * lo resuelve de forma atómica: de dos peticiones que lleguen a la vez,
   * solo una afecta una fila (y se lleva los datos frescos por RETURNING);
   * la otra afecta cero y se retira aquí mismo, SIN haber llamado a Monday.
   */
  const reclamada = (
    await db()
      .update(esquema.acuerdos)
      .set({ bandeja: 'subido', updatedAt: new Date() })
      .where(and(eq(esquema.acuerdos.id, id), eq(esquema.acuerdos.bandeja, 'pendiente')))
      .returning({
        salaSlug: esquema.acuerdos.salaSlug,
        que: esquema.acuerdos.que,
        estatus: esquema.acuerdos.estatus,
        fechaCompromiso: esquema.acuerdos.fechaCompromiso,
        responsableMondayId: esquema.acuerdos.responsableMondayId,
      })
  )[0]

  if (!reclamada) {
    // No se reclamó: o el id no existe, o ya no estaba 'pendiente' (subido,
    // descartado, o ganado por otra pestaña justo ahora). Se distingue el
    // primer caso —merece un error explícito— del resto, que se retira en
    // silencio: es lo mismo que ya hacía este camino antes de esta revisión
    // ("ya subido o descartado: no se repite"), solo que ahora también cubre
    // "otra pestaña lo reclamó primero".
    const existe = (
      await db().select({ id: esquema.acuerdos.id }).from(esquema.acuerdos).where(eq(esquema.acuerdos.id, id))
    )[0]
    if (!existe) throw new Error(`Acuerdo no encontrado: "${id}"`)
    return
  }

  const datos = {
    salaSlug: reclamada.salaSlug,
    que: reclamada.que,
    estatus: reclamada.estatus,
    fechaCompromiso: reclamada.fechaCompromiso
      ? reclamada.fechaCompromiso.toISOString().slice(0, 10)
      : null,
    responsableMondayId: reclamada.responsableMondayId,
  }

  let creado: { id: string; url: string }
  try {
    creado =
      destino.tipo === 'subelemento'
        ? await crearSubelemento(destino.padreId, datos)
        : await crearElementoEnDelivery(datos)
  } catch (error) {
    // Monday NO confirmó nada: es seguro devolver la fila a 'pendiente' para
    // que se pueda reintentar sin miedo a duplicar.
    await db()
      .update(esquema.acuerdos)
      .set({ bandeja: 'pendiente', updatedAt: new Date() })
      .where(and(eq(esquema.acuerdos.id, id), eq(esquema.acuerdos.bandeja, 'subido')))
    throw error
  }

  /**
   * A PARTIR DE AQUÍ MONDAY YA CONFIRMÓ que el elemento existe. Si el UPDATE
   * de abajo fallara (la base cae, el proceso muere a mitad), a propósito NO
   * se revierte `bandeja` a 'pendiente': hacerlo dejaría reintentar y crear
   * un SEGUNDO elemento en Monday para el mismo acuerdo — el mismo duplicado
   * que toda esta reclamación existe para evitar, solo que disparado por un
   * fallo de escritura en vez de un doble clic.
   *
   * La fila se queda `bandeja = 'subido'` con `monday_id` nulo. Es un estado
   * raro pero DETECTABLE (`bandeja = 'subido' AND monday_id IS NULL`) y
   * arreglable desde la app; un elemento duplicado en un tablero de 950
   * filas que mira todo el equipo lo tiene que limpiar a mano alguien que ni
   * sabe que esta app existe. Entre un estado raro visible y un duplicado
   * invisible, se elige el primero — decisión de Franco en la revisión de
   * esta tarea. No lo "simplifiques" quitando el guardado en dos pasos.
   */
  await db()
    .update(esquema.acuerdos)
    .set({
      mondayId: creado.id,
      mondayTipo: destino.tipo,
      mondayUrl: creado.url,
      mondaySincronizadoEn: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(esquema.acuerdos.id, id))

  revalidatePath('/acuerdos/bandeja')
  revalidatePath('/acuerdos')
  revalidatePath(`/cliente/${reclamada.salaSlug}`)
}

export async function descartarAcuerdoAction(id: string): Promise<void> {
  await exigirEquipo()
  if (!hayDB()) return
  // Descartar es definitivo: no borra el acuerdo, lo saca de la bandeja para
  // siempre. Si volviera a ofrecerse al editarlo, la bandeja sería una lista
  // que reaparece, y nadie confía en una lista que reaparece.
  //
  // El WHERE exige `bandeja = 'pendiente'`, igual que la reclamación de
  // arriba (revisión de Franco): sin esto, una pestaña vieja podía descartar
  // un acuerdo que OTRA pestaña ya había subido de verdad, dejando una fila
  // con `mondayId`/`mondayUrl` reales pero `bandeja = 'descartado'` —
  // mintiendo sobre qué pasó, porque `bandeja` es la única fuente de verdad
  // de ese estado (ver src/monday/bandeja.ts) y no puede decir dos cosas a
  // la vez.
  await db()
    .update(esquema.acuerdos)
    .set({ bandeja: 'descartado', updatedAt: new Date() })
    .where(and(eq(esquema.acuerdos.id, id), eq(esquema.acuerdos.bandeja, 'pendiente')))
  revalidatePath('/acuerdos/bandeja')
}
