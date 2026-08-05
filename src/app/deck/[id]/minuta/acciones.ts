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
import { obtenerReunion, crearReunion } from '@/db/reuniones'
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
 * PUBLICAR una minuta de verdad — `publicarMinutaAction` crea la reunión si
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
 * O una reunión que YA EXISTE, o una descrita a mano que todavía no se ha
 * registrado. La segunda es la que evita las reuniones fantasma: una reunión
 * que solo existió como intento de minuta no debe quedar en la app.
 *
 * `nueva.salaSlug` sigue siendo `string | null` en el TIPO (mudado tal cual
 * de la vieja `DeQueReunion`), pero `contextoDe`/`publicarMinutaAction` de
 * abajo YA NO ACEPTAN `null` en la práctica: `DatosDeReunion.salaSlug` es
 * obligatorio desde la Tarea 4, así que un `null` aquí se rechaza con un
 * mensaje de dominio en vez de intentar escribir contra una restricción que
 * lo va a rebotar. Ver el reporte de la Tarea 5b — es una pérdida real de
 * capacidad (antes existía un camino honesto para una junta sin UDN, con sus
 * acuerdos quedando solo en el texto) que esta migración no resuelve, solo
 * evita que reviente en silencio.
 */
export type DeQueReunion =
  | { reunionId: string }
  | { nueva: { titulo: string; fecha: string; salaSlug: string | null } }

/** El contexto que necesita el modelo, venga de donde venga. */
async function contextoDe(de: DeQueReunion) {
  if ('reunionId' in de) {
    const reunion = await obtenerReunion(de.reunionId)
    if (!reunion) return null
    return {
      id: reunion.id,
      salaSlug: reunion.salaSlug as string | null,
      salaNombre: reunion.salaNombre,
      tipo: reunion.tipo,
      alcance: reunion.alcance,
      fecha: reunion.fecha,
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
    const reunion = await contextoDe(de)
    if (!reunion) return { ok: false, error: 'Reunión no encontrada.' }

    // El molde de SU sala, si lo tiene; si no, el general; si tampoco, el de
    // siempre. Nadie se queda sin poder minutar por falta de configuración.
    const molde = await moldeDeMinuta(reunion.salaSlug)

    const resultado = await generarMinuta(
      {
        id: reunion.id,
        salaSlug: reunion.salaSlug,
        salaNombre: reunion.salaNombre,
        tipo: reunion.tipo,
        alcance: reunion.alcance,
        fecha: reunion.fecha,
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
  reunionId?: string
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
 *
 * UNA DESVIACIÓN DE COMPORTAMIENTO, no a la ligera — ver el reporte de la
 * Tarea 5b para el detalle completo:
 *
 * `nueva.salaSlug: null` (la reunión "sin sala") se RECHAZA con un mensaje
 * de dominio: `DatosDeReunion.salaSlug` es obligatorio desde la Tarea 4 y
 * `crearReunion` no acepta otra cosa. Antes esto registraba la reunión
 * igual y sus acuerdos confirmados se quedaban sin publicar (ver
 * `guardarMinuta` viejo, que solo publicaba `if (salaSlug)`).
 *
 * LO QUE YA NO ES UNA DESVIACIÓN (arreglado el 5-ago, hallazgo de la
 * revisión de la Tarea 5b): el atajo "esto es historia, no trabajo nuevo"
 * de la vieja `crearSesion({ estado: 'presentada' })` SÍ tiene equivalente
 * hoy — `crearReunion({ ..., estado: 'dada' })` (ver el comentario de
 * `DatosDeReunion.estado`, src/db/reuniones.ts). Nace ya dada, en un solo
 * paso, sin pasar por `marcarDada` — que sigue siendo freeze-guardado, a
 * propósito, para la confirmación de una reunión YA EXISTENTE (ver el
 * comentario de `marcarDada`: confirmar es gestión, no historia). Minutar
 * retroactivamente una junta de una sala en pausa vuelve a funcionar, igual
 * que antes de esta ronda.
 */
export async function publicarMinutaAction(
  de: DeQueReunion,
  transcripcion: string,
  textoFinal: string,
  acuerdosConfirmados: AcuerdoConfirmado[],
): Promise<EstadoPublicacion> {
  try {
    if (!(await esEditor())) return { ok: false, error: SOLO_EDITOR }

    let reunionId: string
    let salaSlug: string
    if ('reunionId' in de) {
      const reunion = await obtenerReunion(de.reunionId)
      if (!reunion) return { ok: false, error: 'Reunión no encontrada.' }
      reunionId = reunion.id
      salaSlug = reunion.salaSlug
    } else {
      if (!de.nueva.salaSlug) {
        return {
          ok: false,
          error: 'Esta reunión necesita una sala: el registro de reuniones sin sala no está disponible.',
        }
      }
      // Aquí, y solo aquí, nace la reunión: ya tiene su acta, así que nace
      // directamente `dada` — es historia, no trabajo en curso, y el freeze
      // de sala la deja pasar (ver el comentario de cabecera).
      const creada = await crearReunion({
        salaSlug: de.nueva.salaSlug,
        titulo: de.nueva.titulo,
        tipo: 'mensual',
        alcance: 'todos',
        fecha: new Date(de.nueva.fecha),
        estado: 'dada',
      })
      reunionId = creada.id
      salaSlug = de.nueva.salaSlug
    }

    await guardarMinuta(reunionId, transcripcion, textoFinal, acuerdosConfirmados)

    // `esEditor()` ya confirmó arriba que hay sesión de equipo; se vuelve a
    // pedir aquí (no se reutiliza ese booleano) porque es la única forma de
    // llegar al correo de quién publica sin cambiar la guarda de permiso ya
    // probada en acciones.test.ts.
    const quien = await sesionActual()
    if (quien?.sub) await registrarEdicion(reunionId, quien.sub)

    revalidatePath(`/deck/${reunionId}`)
    revalidatePath(`/deck/${reunionId}/minuta`)
    revalidatePath('/deck')
    revalidatePath(`/cliente/${salaSlug}`)
    revalidatePath('/')

    return { ok: true, reunionId }
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error)
    return { ok: false, error: mensaje }
  }
}
