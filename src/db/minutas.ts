/**
 * Persistencia de Minuta (spec §4: "Ligada a una sesión. Guarda la
 * transcripción original, el texto final editado y a quién se envió") y del
 * paso de publicación: los acuerdos confirmados por el equipo se cuelgan de
 * la SALA de la sesión (spec §4, no de la sesión), con `sesionOrigenId` para
 * saber dónde nacieron. Con `hayDB()` escribe a Postgres vía Drizzle; sin DB,
 * usa el store en memoria — mismo patrón que src/db/sesiones.ts.
 */
import { eq } from 'drizzle-orm'
import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import * as memoria from './store-memoria'
import { crearAcuerdo } from './acuerdos'
import type { AcuerdoPropuesto } from '@/minuta/esquema'

/** Un acuerdo propuesto que el equipo confirmó (incluyó y, quizá, editó) antes de publicar. */
export type AcuerdoConfirmado = AcuerdoPropuesto

export interface MinutaGuardada {
  id: string
  sesionId: string
  transcripcion: string | null
  textoFinal: string | null
  enviadaA: string[] | null
  createdAt: string // ISO
}

async function salaDeSesion(sesionId: string): Promise<string> {
  if (hayDB()) {
    const fila = (
      await db()
        .select({ salaSlug: esquema.sesiones.salaSlug })
        .from(esquema.sesiones)
        .where(eq(esquema.sesiones.id, sesionId))
    )[0]
    if (!fila) throw new Error(`Sesión no encontrada: "${sesionId}"`)
    return fila.salaSlug
  }
  const fila = memoria.obtenerSesionMemoria(sesionId)
  if (!fila) throw new Error(`Sesión no encontrada: "${sesionId}"`)
  return fila.salaSlug
}

/**
 * Guarda la minuta de una sesión y publica sus acuerdos confirmados en la
 * sala. Deja la sesión en estado `minutada` — el final natural de su ciclo
 * (spec §4: `borrador → lista → presentada → minutada`).
 */
export async function guardarMinuta(
  sesionId: string,
  transcripcion: string,
  textoFinal: string,
  acuerdosConfirmados: AcuerdoConfirmado[],
): Promise<{ id: string }> {
  const salaSlug = await salaDeSesion(sesionId)
  const id = crypto.randomUUID()
  const ahora = new Date()

  if (hayDB()) {
    const conexion = db()
    await conexion.insert(esquema.minutas).values({
      id,
      sesionId,
      transcripcion,
      textoFinal,
      enviadaA: null,
    })
    await conexion
      .update(esquema.sesiones)
      .set({ estado: 'minutada', updatedAt: ahora })
      .where(eq(esquema.sesiones.id, sesionId))
  } else {
    memoria.insertarMinutaMemoria({ id, sesionId, transcripcion, textoFinal, enviadaA: null, createdAt: ahora })
    memoria.actualizarEstadoSesionMemoria(sesionId, 'minutada')
  }

  for (const acuerdo of acuerdosConfirmados) {
    await crearAcuerdo(salaSlug, {
      que: acuerdo.que,
      responsable: acuerdo.responsable,
      squad: acuerdo.squad,
      prioridad: acuerdo.prioridad,
      fechaCompromiso: acuerdo.fechaCompromiso ? new Date(acuerdo.fechaCompromiso) : null,
      sesionOrigenId: sesionId,
    })
  }

  return { id }
}

export async function obtenerMinuta(sesionId: string): Promise<MinutaGuardada | null> {
  if (!hayDB()) {
    const fila = memoria.obtenerMinutaDeSesionMemoria(sesionId)
    if (!fila) return null
    return {
      id: fila.id,
      sesionId: fila.sesionId,
      transcripcion: fila.transcripcion,
      textoFinal: fila.textoFinal,
      enviadaA: fila.enviadaA,
      createdAt: fila.createdAt.toISOString(),
    }
  }

  const conexion = db()
  const fila = (await conexion.select().from(esquema.minutas).where(eq(esquema.minutas.sesionId, sesionId)))[0]
  if (!fila) return null
  return {
    id: fila.id,
    sesionId: fila.sesionId,
    transcripcion: fila.transcripcion,
    textoFinal: fila.textoFinal,
    enviadaA: fila.enviadaA,
    createdAt: fila.createdAt.toISOString(),
  }
}
