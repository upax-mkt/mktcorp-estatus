import { eq } from 'drizzle-orm'
import { db, hayDB } from '@/db/cliente'
import * as esquema from '@/db/esquema'
import {
  escrituraActiva, crearEnMonday, actualizarEnMonday, ErrorMonday,
} from './cliente'
import type { EstatusGuardado } from './mapeo'

/**
 * LA SINCRONIZACIÓN con Monday, vista desde nuestro lado.
 *
 * Una regla, y de ella sale todo lo demás: **Monday nunca puede tumbar la
 * app**. El tablero es de otro equipo, vive en otro servicio y se cae cuando
 * se cae. Si marcar un acuerdo como cumplido dependiera de que Monday
 * responda, un incidente suyo se convertiría en un incidente nuestro delante
 * de un director.
 *
 * Así que el orden es SIEMPRE: primero nuestra base, después Monday, y si
 * Monday falla se registra y se sigue. Lo contrario —escribir allá primero
 * para "garantizar" que están alineados— garantiza justo lo opuesto: un
 * acuerdo en el tablero que en la sala no existe.
 *
 * La desincronización que esto admite es acotada y se ve: nuestro dato es el
 * bueno y Monday queda atrás hasta el siguiente movimiento.
 */

/** Lo que pasó al intentar sincronizar. Nunca lanza hacia la interfaz. */
export interface ResultadoSync {
  intentado: boolean
  ok: boolean
  motivo?: string
}

const APAGADO: ResultadoSync = { intentado: false, ok: false }

async function guardarMondayId(acuerdoId: string, mondayId: string): Promise<void> {
  if (!hayDB()) return
  await db()
    .update(esquema.acuerdos)
    .set({ mondayId, updatedAt: new Date() })
    .where(eq(esquema.acuerdos.id, acuerdoId))
}

async function mondayIdDe(acuerdoId: string): Promise<string | null> {
  if (!hayDB()) return null
  const fila = (
    await db()
      .select({ mondayId: esquema.acuerdos.mondayId })
      .from(esquema.acuerdos)
      .where(eq(esquema.acuerdos.id, acuerdoId))
  )[0]
  return fila?.mondayId ?? null
}

/**
 * Manda a Monday un acuerdo recién creado.
 *
 * Se llama DESPUÉS de guardarlo aquí. Si falla, el acuerdo existe igual en la
 * sala: lo único que no pasó es que apareciera en el tablero.
 */
export async function sincronizarAlta(
  acuerdoId: string,
  datos: { salaSlug: string; que: string; estatus: EstatusGuardado; fechaCompromiso: string | null },
): Promise<ResultadoSync> {
  if (!escrituraActiva()) return APAGADO
  try {
    const mondayId = await crearEnMonday(datos)
    await guardarMondayId(acuerdoId, mondayId)
    return { intentado: true, ok: true }
  } catch (error) {
    return {
      intentado: true,
      ok: false,
      motivo: error instanceof ErrorMonday ? error.message : 'Monday no respondió.',
    }
  }
}

/**
 * Lleva a Monday un cambio de estatus o de fecha.
 *
 * Si el acuerdo no tiene `mondayId` —nació antes de conectar el tablero, o su
 * alta falló— se CREA en vez de fallar. Sin eso, un acuerdo quedaría fuera
 * del tablero para siempre por un error de red de hace tres semanas.
 */
export async function sincronizarCambio(
  acuerdoId: string,
  datos: { salaSlug: string; que: string; estatus: EstatusGuardado; fechaCompromiso: string | null },
): Promise<ResultadoSync> {
  if (!escrituraActiva()) return APAGADO
  try {
    const existente = await mondayIdDe(acuerdoId)
    if (existente) {
      await actualizarEnMonday(existente, datos)
    } else {
      const mondayId = await crearEnMonday(datos)
      await guardarMondayId(acuerdoId, mondayId)
    }
    return { intentado: true, ok: true }
  } catch (error) {
    return {
      intentado: true,
      ok: false,
      motivo: error instanceof ErrorMonday ? error.message : 'Monday no respondió.',
    }
  }
}
