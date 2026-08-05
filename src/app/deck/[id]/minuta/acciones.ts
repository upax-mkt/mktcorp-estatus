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
 * `nueva.salaSlug: null` — UNA REUNIÓN QUE NO ES DE NINGUNA SALA (un comité,
 * un arranque de campaña, una interna de Mkt Corp) — SÍ SE ACEPTA (Tarea 8c,
 * 5-ago). Entre la Tarea 4 (ronda 10) y la Tarea 8b no se aceptaba:
 * `DatosDeReunion.salaSlug` se volvió obligatorio y `publicarMinutaAction`
 * rechazaba el nulo con un mensaje de dominio — una pérdida real de
 * capacidad, documentada en el reporte de la Tarea 5b. La Tarea 8b devolvió
 * el nulo a la capa de datos (`crearReunion` ya lo admite, viste la reunión
 * con la identidad de Marketing Corp — ver `identidadDe`, src/db/reuniones.ts)
 * y esta tarea termina de cablearlo hasta aquí: `contextoDe`/
 * `publicarMinutaAction`, más abajo, ya aceptan `null` de punta a punta.
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
 * `nueva.salaSlug: null` (la reunión "sin sala": un comité, un arranque de
 * campaña, una interna de Mkt Corp) YA NO SE RECHAZA — SE TERMINÓ DE CABLEAR
 * aquí (Tarea 8c, 5-ago). Entre la Tarea 4 y la Tarea 8b sí se rechazaba con
 * un mensaje de dominio (`DatosDeReunion.salaSlug` obligatorio, `crearReunion`
 * no aceptaba otra cosa): una pérdida real de capacidad, documentada en el
 * reporte de la Tarea 5b. La Tarea 8b devolvió el nulo a `crearReunion`
 * (nace con la identidad de Marketing Corp — `identidadDe`,
 * src/db/reuniones.ts) pero paró ahí, a propósito, en el límite de sus
 * archivos: esta acción seguía rechazándolo, así que la capacidad quedaba
 * inerte. Ahora `salaSlug` viaja tal cual hasta `crearReunion`, y
 * `guardarMinuta` (`src/db/minutas.ts`) sabe que sin sala no hay dónde
 * publicar los acuerdos confirmados como filas — se quedan en el texto de la
 * minuta, tal como promete `LevantarMinuta` en pantalla.
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
    let salaSlug: string | null
    if ('reunionId' in de) {
      const reunion = await obtenerReunion(de.reunionId)
      if (!reunion) return { ok: false, error: 'Reunión no encontrada.' }
      reunionId = reunion.id
      salaSlug = reunion.salaSlug
    } else {
      // Aquí, y solo aquí, nace la reunión: ya tiene su acta, así que nace
      // directamente `dada` — es historia, no trabajo en curso, y el freeze
      // de sala la deja pasar (ver el comentario de cabecera). `salaSlug:
      // null` ya no se rechaza (Tarea 8c): `crearReunion` lo admite desde la
      // Tarea 8b y viste la reunión con la identidad de Marketing Corp.
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
    // Sin sala no hay página de cliente que revalidar: una reunión de
    // Marketing Corp no aparece en ninguna de las diez (ver `identidadDe`,
    // src/db/reuniones.ts).
    if (salaSlug) revalidatePath(`/cliente/${salaSlug}`)
    revalidatePath('/')

    return { ok: true, reunionId }
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error)
    return { ok: false, error: mensaje }
  }
}
