'use server'
import { eq } from 'drizzle-orm'
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

  const acuerdo = (
    await db().select().from(esquema.acuerdos).where(eq(esquema.acuerdos.id, id))
  )[0]
  if (!acuerdo) throw new Error(`Acuerdo no encontrado: "${id}"`)
  if (acuerdo.bandeja !== 'pendiente') return // ya subido o descartado: no se repite

  const datos = {
    salaSlug: acuerdo.salaSlug,
    que: acuerdo.que,
    estatus: acuerdo.estatus,
    fechaCompromiso: acuerdo.fechaCompromiso
      ? acuerdo.fechaCompromiso.toISOString().slice(0, 10)
      : null,
    responsableMondayId: acuerdo.responsableMondayId,
  }

  const creado =
    destino.tipo === 'subelemento'
      ? await crearSubelemento(destino.padreId, datos)
      : await crearElementoEnDelivery(datos)

  // Se marca DESPUÉS de que Monday confirme. Al revés, un fallo de red dejaría
  // el acuerdo marcado como subido sin estarlo, y nadie volvería a intentarlo.
  await db()
    .update(esquema.acuerdos)
    .set({
      mondayId: creado.id,
      mondayTipo: destino.tipo,
      mondayUrl: creado.url,
      mondaySincronizadoEn: new Date(),
      bandeja: 'subido',
      updatedAt: new Date(),
    })
    .where(eq(esquema.acuerdos.id, id))

  revalidatePath('/acuerdos/bandeja')
  revalidatePath('/acuerdos')
  revalidatePath(`/cliente/${acuerdo.salaSlug}`)
}

export async function descartarAcuerdoAction(id: string): Promise<void> {
  await exigirEquipo()
  if (!hayDB()) return
  // Descartar es definitivo: no borra el acuerdo, lo saca de la bandeja para
  // siempre. Si volviera a ofrecerse al editarlo, la bandeja sería una lista
  // que reaparece, y nadie confía en una lista que reaparece.
  await db()
    .update(esquema.acuerdos)
    .set({ bandeja: 'descartado', updatedAt: new Date() })
    .where(eq(esquema.acuerdos.id, id))
  revalidatePath('/acuerdos/bandeja')
}
