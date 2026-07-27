'use server'

/**
 * Server actions de la minuta (spec §9). Se invocan desde MinutaCliente.tsx
 * como funciones directas (no `<form action>`), por lo que reciben argumentos
 * normales en vez de `FormData` — patrón soportado explícitamente para
 * Server Functions invocadas desde manejadores de evento en un Client
 * Component.
 */
import { revalidatePath } from 'next/cache'
import { esEquipo } from '@/auth/sesion'
import { obtenerSesion } from '@/db/sesiones'
import { generarMinuta } from '@/minuta/generar'
import { guardarMinuta, type AcuerdoConfirmado } from '@/db/minutas'
import type { AcuerdoPropuesto } from '@/minuta/esquema'

export interface EstadoGeneracion {
  ok: boolean
  error?: string
  textoCorreo?: string
  acuerdosPropuestos?: AcuerdoPropuesto[]
}

/**
 * Minutar es trabajo de Mkt Corp. Estas dos acciones devuelven su error en el
 * resultado en vez de lanzar (MinutaCliente lo pinta), así que el rechazo por
 * permisos sigue el mismo camino.
 */
const SOLO_EQUIPO = 'Esta acción es solo para el equipo de Marketing Corporativo.'

export async function generarMinutaAction(sesionId: string, transcripcion: string): Promise<EstadoGeneracion> {
  try {
    if (!(await esEquipo())) return { ok: false, error: SOLO_EQUIPO }
    const sesion = await obtenerSesion(sesionId)
    if (!sesion) return { ok: false, error: 'Sesión no encontrada.' }

    const resultado = await generarMinuta(
      {
        salaSlug: sesion.salaSlug,
        salaNombre: sesion.salaNombre,
        tipo: sesion.tipo,
        alcance: sesion.alcance,
        fecha: sesion.fecha,
      },
      transcripcion,
    )
    return { ok: true, textoCorreo: resultado.textoCorreo, acuerdosPropuestos: resultado.acuerdosPropuestos }
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error)
    return { ok: false, error: mensaje }
  }
}

export interface EstadoPublicacion {
  ok: boolean
  error?: string
}

export async function publicarMinutaAction(
  sesionId: string,
  transcripcion: string,
  textoFinal: string,
  acuerdosConfirmados: AcuerdoConfirmado[],
): Promise<EstadoPublicacion> {
  try {
    if (!(await esEquipo())) return { ok: false, error: SOLO_EQUIPO }
    const sesion = await obtenerSesion(sesionId)
    if (!sesion) return { ok: false, error: 'Sesión no encontrada.' }

    await guardarMinuta(sesionId, transcripcion, textoFinal, acuerdosConfirmados)

    revalidatePath(`/preparar/${sesionId}`)
    revalidatePath(`/preparar/${sesionId}/minuta`)
    revalidatePath('/preparar')
    revalidatePath(`/sala/${sesion.salaSlug}`)
    revalidatePath('/')

    return { ok: true }
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error)
    return { ok: false, error: mensaje }
  }
}
