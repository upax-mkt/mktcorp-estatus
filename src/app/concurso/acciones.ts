'use server'

import { revalidatePath } from 'next/cache'
import { exigirAdmin, exigirLectura } from '@/auth/roles'
import {
  actualizarPropuestaConcurso,
  crearPropuestaConcurso,
  guardarCalificacionConcurso,
  guardarJuradoConcurso,
  establecerVisibilidadPropuestaConcurso,
  registrarVotoConcurso,
  type DatosGuardarPropuesta,
} from '@/db/concurso'

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

export async function guardarJuradoAction(nombres: string[]): Promise<EstadoAccionConcurso> {
  await exigirAdmin()
  try {
    await guardarJuradoConcurso(nombres)
    revalidatePath('/concurso')
    return { ok: 'Jurado guardado.' }
  } catch (error) {
    return { error: mensaje(error) }
  }
}

export async function guardarCalificacionAction(
  propuestaId: string,
  posicionJurado: number,
  rubrica: { creatividad: number; cultura: number; viabilidad: number; atractivo: number },
): Promise<EstadoAccionConcurso> {
  await exigirAdmin()
  try {
    await guardarCalificacionConcurso(propuestaId, posicionJurado, rubrica)
    revalidatePath('/concurso')
    return { ok: 'Evaluación guardada.' }
  } catch (error) {
    return { error: mensaje(error) }
  }
}
