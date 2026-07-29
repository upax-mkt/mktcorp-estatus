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
import { obtenerSesion, crearSesion } from '@/db/sesiones'
import { obtenerTema } from '@/temas'
import { generarMinuta } from '@/minuta/generar'
import { moldeDeMinuta } from '@/db/plantillas'
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

/** El nombre del cliente, para dárselo al modelo como contexto. */
function identidadDeSala(slug: string): string {
  try {
    return obtenerTema(slug).nombre
  } catch {
    return 'Marketing Corp'
  }
}

/**
 * De qué reunión es la minuta.
 *
 * O una sesión que YA EXISTE, o una descrita a mano que todavía no se ha
 * registrado. La segunda es la que evita las reuniones fantasma: una reunión
 * que solo existió como intento de minuta no debe quedar en la app.
 */
export type DeQueReunion =
  | { sesionId: string }
  | { nueva: { titulo: string; fecha: string; salaSlug: string | null } }

/** El contexto que necesita el modelo, venga de donde venga. */
async function contextoDe(de: DeQueReunion) {
  if ('sesionId' in de) {
    const sesion = await obtenerSesion(de.sesionId)
    if (!sesion) return null
    return {
      id: sesion.id,
      salaSlug: sesion.salaSlug,
      salaNombre: sesion.salaNombre,
      tipo: sesion.tipo,
      alcance: sesion.alcance,
      fecha: sesion.fecha,
    }
  }
  const slug = de.nueva.salaSlug
  return {
    id: undefined,
    salaSlug: slug,
    salaNombre: slug ? identidadDeSala(slug) : 'Marketing Corp',
    tipo: 'mensual' as const,
    alcance: 'todos',
    fecha: de.nueva.fecha,
  }
}

export async function generarMinutaAction(de: DeQueReunion, transcripcion: string): Promise<EstadoGeneracion> {
  try {
    if (!(await esEquipo())) return { ok: false, error: SOLO_EQUIPO }
    const sesion = await contextoDe(de)
    if (!sesion) return { ok: false, error: 'Sesión no encontrada.' }

    // El molde de SU sala, si lo tiene; si no, el general; si tampoco, el de
    // siempre. Nadie se queda sin poder minutar por falta de configuración.
    const molde = await moldeDeMinuta(sesion.salaSlug)

    const resultado = await generarMinuta(
      {
        id: sesion.id,
        salaSlug: sesion.salaSlug,
        salaNombre: sesion.salaNombre,
        tipo: sesion.tipo,
        alcance: sesion.alcance,
        fecha: sesion.fecha,
      },
      transcripcion,
      undefined,
      molde,
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
  /** La reunión a la que quedó ligada. Al describirla a mano, nace aquí. */
  sesionId?: string
}

/**
 * LA REUNIÓN SE CREA AL PUBLICAR, no al empezar a minutar.
 *
 * Franco: "fueron intentos de generar una minuta, no debería haberse creado
 * como una reunión". Y es exacto: se registraba al pulsar «Continuar», antes
 * de que existiera nada — así que cada intento fallido o abandonado dejaba una
 * reunión fantasma, marcada como presentada, que además aparecía luego en «se
 * dieron, falta su minuta» pidiendo un acta que nunca iba a llegar.
 *
 * Una reunión existe porque tiene una minuta o una presentación. Un intento no
 * es ninguna de las dos.
 */
export async function publicarMinutaAction(
  de: DeQueReunion,
  transcripcion: string,
  textoFinal: string,
  acuerdosConfirmados: AcuerdoConfirmado[],
): Promise<EstadoPublicacion> {
  try {
    if (!(await esEquipo())) return { ok: false, error: SOLO_EQUIPO }

    let sesionId: string
    let salaSlug: string | null
    if ('sesionId' in de) {
      const sesion = await obtenerSesion(de.sesionId)
      if (!sesion) return { ok: false, error: 'Sesión no encontrada.' }
      sesionId = sesion.id
      salaSlug = sesion.salaSlug
    } else {
      // Aquí, y solo aquí, nace la reunión: ya tiene su acta.
      const creada = await crearSesion({
        salaSlug: de.nueva.salaSlug,
        titulo: de.nueva.titulo,
        tipo: 'mensual',
        alcance: 'todos',
        fecha: new Date(de.nueva.fecha),
        estado: 'presentada',
      })
      sesionId = creada.id
      salaSlug = de.nueva.salaSlug
    }

    await guardarMinuta(sesionId, transcripcion, textoFinal, acuerdosConfirmados)

    revalidatePath(`/deck/${sesionId}`)
    revalidatePath(`/deck/${sesionId}/minuta`)
    revalidatePath('/deck')
    if (salaSlug) revalidatePath(`/cliente/${salaSlug}`)
    revalidatePath('/')

    return { ok: true, sesionId }
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error)
    return { ok: false, error: mensaje }
  }
}
