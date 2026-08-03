'use server'

/**
 * Server actions de la minuta (spec §9). Se invocan desde MinutaCliente.tsx
 * como funciones directas (no `<form action>`), por lo que reciben argumentos
 * normales en vez de `FormData` — patrón soportado explícitamente para
 * Server Functions invocadas desde manejadores de evento en un Client
 * Component.
 */
import { revalidatePath } from 'next/cache'
import { esEditor } from '@/auth/roles'
import { sesionActual } from '@/auth/sesion'
import { obtenerSesion, crearSesion } from '@/db/sesiones'
import { cargarTemas } from '@/db/temas'
import { generarMinuta } from '@/minuta/generar'
import { moldeDeMinuta } from '@/db/plantillas'
import { guardarMinuta, type AcuerdoConfirmado } from '@/db/minutas'
import { registrarEdicion } from '@/db/participacion'
import type { AcuerdoPropuesto } from '@/minuta/esquema'

export interface EstadoGeneracion {
  ok: boolean
  error?: string
  textoCorreo?: string
  acuerdosPropuestos?: AcuerdoPropuesto[]
}

/**
 * Minutar es trabajo de edición de Mkt Corp (admin o editor, no viewer).
 * Estas dos acciones devuelven su error en el resultado en vez de lanzar
 * (MinutaCliente lo pinta), así que el rechazo por permisos sigue el mismo
 * camino.
 *
 * `esEditor()`, no la vieja `esEquipo()` (agujero crítico corregido tras
 * revisión de la ronda 9): con `esEquipo()` cualquier viewer podía generar Y
 * PUBLICAR una minuta de verdad — `publicarMinutaAction` crea la sesión si
 * hace falta y persiste el acta con sus acuerdos confirmados, compromisos
 * reales para gente real en cualquiera de las nueve salas. Ninguna pantalla
 * exige nada antes de esta: la comprobación que cuenta es esta.
 */
const SOLO_EDITOR = 'Esta acción requiere permiso de edición en Marketing Corporativo.'

/** El nombre del cliente, para dárselo al modelo como contexto. */
async function identidadDeSala(slug: string): Promise<string> {
  const registro = await cargarTemas()
  return registro[slug]?.nombre ?? 'Marketing Corp'
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
    salaNombre: slug ? await identidadDeSala(slug) : 'Marketing Corp',
    tipo: 'mensual' as const,
    alcance: 'todos',
    fecha: de.nueva.fecha,
  }
}

export async function generarMinutaAction(de: DeQueReunion, transcripcion: string): Promise<EstadoGeneracion> {
  try {
    if (!(await esEditor())) return { ok: false, error: SOLO_EDITOR }
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
    if (!(await esEditor())) return { ok: false, error: SOLO_EDITOR }

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

    // `esEditor()` ya confirmó arriba que hay sesión de equipo; se vuelve a
    // pedir aquí (no se reutiliza ese booleano) porque es la única forma de
    // llegar al correo de quién publica sin cambiar la guarda de permiso ya
    // probada en acciones.test.ts.
    const quien = await sesionActual()
    if (quien?.sub) await registrarEdicion(sesionId, quien.sub)

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
