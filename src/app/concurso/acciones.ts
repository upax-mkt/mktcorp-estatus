'use server'

import { revalidatePath } from 'next/cache'
import { exigirAdmin, exigirLectura } from '@/auth/roles'
import { del } from '@vercel/blob'
import {
  actualizarPropuestaConcurso,
  editarPropuestaComoAdmin,
  eliminarMiPropuestaConcurso,
  eliminarPropuestaConcurso,
  crearPropuestaConcurso,
  establecerFaseConcurso,
  establecerVisibilidadPropuestaConcurso,
  registrarVotoConcurso,
  type DatosGuardarPropuesta,
} from '@/db/concurso'
import { esFaseConcurso, type FaseConcurso } from '@/concurso/fase'

export interface EstadoAccionConcurso {
  error?: string
  ok?: string
}

function mensaje(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo completar la acción.'
}

export async function crearPropuestaAction(datos: DatosGuardarPropuesta): Promise<EstadoAccionConcurso> {
  const sesion = await exigirLectura()
  if (!sesion.sub) return { error: 'La sesión no contiene una identidad válida.' }
  try {
    await crearPropuestaConcurso(sesion.sub, datos)
    revalidatePath('/concurso')
    return { ok: 'Propuesta registrada. Podrás editarla hasta el cierre.' }
  } catch (error) {
    return { error: mensaje(error) }
  }
}

export async function actualizarPropuestaAction(
  propuestaId: string,
  datos: Omit<DatosGuardarPropuesta, 'coautorCorreo'>,
): Promise<EstadoAccionConcurso> {
  const sesion = await exigirLectura()
  if (!sesion.sub) return { error: 'La sesión no contiene una identidad válida.' }
  try {
    await actualizarPropuestaConcurso(propuestaId, sesion.sub, datos)
    revalidatePath('/concurso')
    return { ok: 'Cambios guardados.' }
  } catch (error) {
    return { error: mensaje(error) }
  }
}

export async function votarAction(propuestaId: string): Promise<EstadoAccionConcurso> {
  const sesion = await exigirLectura()
  if (!sesion.sub) return { error: 'La sesión no contiene una identidad válida.' }
  try {
    await registrarVotoConcurso(sesion.sub, propuestaId)
    revalidatePath('/concurso')
    return { ok: 'Tu pase quedó registrado. Puedes cambiarlo hasta el cierre.' }
  } catch (error) {
    return { error: mensaje(error) }
  }
}

export async function establecerVisibilidadPropuestaAction(
  propuestaId: string,
  visible: boolean,
  motivo = '',
): Promise<EstadoAccionConcurso> {
  await exigirAdmin()
  try {
    await establecerVisibilidadPropuestaConcurso(propuestaId, visible, motivo)
    revalidatePath('/concurso')
    return { ok: visible ? 'Propuesta visible.' : 'Propuesta oculta.' }
  } catch (error) {
    return { error: mensaje(error) }
  }
}

/**
 * Borrar una propuesta: solo admin, y se lleva también sus binarios.
 *
 * `del(...).catch(() => {})` en cada uno, como el resto de la app: un fallo al
 * borrar el binario no puede tumbar una operación que YA quitó la fila, y lo
 * que quede huérfano lo caza `scripts/blobs-huerfanos.ts`.
 */
export async function eliminarPropuestaAction(propuestaId: string): Promise<EstadoAccionConcurso> {
  await exigirAdmin()
  try {
    const rutas = await eliminarPropuestaConcurso(propuestaId)
    for (const ruta of rutas) await del(ruta).catch(() => {})
    revalidatePath('/concurso')
    return { ok: 'Propuesta eliminada.' }
  } catch (error) {
    return { error: mensaje(error) }
  }
}

/**
 * ABRIR O CERRAR EL CONCURSO A MANO. Solo admin.
 *
 * `null` suelta el interruptor y devuelve el mando al calendario. Se valida
 * que la fase sea una de las cuatro AUNQUE venga de un `select` nuestro: esto
 * es un Server Action, o sea un endpoint público, y quien lo llame puede
 * mandar lo que quiera. Una fase inventada se guardaría tal cual y dejaría el
 * concurso en un estado que ninguna pantalla sabe pintar.
 */
export async function establecerFaseConcursoAction(fase: FaseConcurso | null): Promise<EstadoAccionConcurso> {
  const sesion = await exigirAdmin()
  if (fase !== null && !esFaseConcurso(fase)) return { error: 'Esa fase no existe.' }
  try {
    await establecerFaseConcurso(fase, sesion.sub ?? 'desconocido')
    revalidatePath('/concurso')
    revalidatePath('/')
    return { ok: fase === null ? 'El concurso vuelve a seguir el calendario.' : `Concurso en fase «${fase}».` }
  } catch (error) {
    return { error: mensaje(error) }
  }
}

/** Corregir el título o el concepto de una propuesta ajena. Solo admin, y no toca imágenes. */
export async function editarPropuestaComoAdminAction(
  propuestaId: string,
  datos: { titulo: string; descripcion: string },
): Promise<EstadoAccionConcurso> {
  await exigirAdmin()
  try {
    await editarPropuestaComoAdmin(propuestaId, datos)
    revalidatePath('/concurso')
    return { ok: 'Propuesta corregida.' }
  } catch (error) {
    return { error: mensaje(error) }
  }
}

/**
 * RETIRAR LA PROPIA PROPUESTA. No es admin: la comprobación de que quien pide
 * firma esa propuesta la hace la capa de datos contra la fila, no esta.
 *
 * Los binarios se borran igual que en el borrado de administración, con el
 * mismo `catch` vacío y por el mismo motivo: la fila YA no existe, y un fallo
 * de Blob no puede convertir eso en un error para quien acaba de retirarla.
 */
export async function eliminarMiPropuestaAction(propuestaId: string): Promise<EstadoAccionConcurso> {
  const sesion = await exigirLectura()
  if (!sesion.sub) return { error: 'La sesión no contiene una identidad válida.' }
  try {
    const rutas = await eliminarMiPropuestaConcurso(propuestaId, sesion.sub)
    for (const ruta of rutas) await del(ruta).catch(() => {})
    revalidatePath('/concurso')
    return { ok: 'Retiraste tu propuesta. Puedes subir otra mientras siga abierta la recepción.' }
  } catch (error) {
    return { error: mensaje(error) }
  }
}
