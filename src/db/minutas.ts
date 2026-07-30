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

/**
 * Un acuerdo propuesto que el equipo confirmó (incluyó y, quizá, editó) antes
 * de publicar.
 *
 * Ya NO es un alias de `AcuerdoPropuesto`, a propósito: ese tipo es el
 * contrato de salida de la IA (spec §9, `EsquemaAcuerdoPropuesto` en
 * src/minuta/esquema.ts, `.strict()`) y la IA nunca decide un id de Monday —
 * solo lee nombres de una transcripción. `responsableMondayId` lo añade una
 * PERSONA al revisar la minuta (ver SelectorResponsable en MinutaCliente.tsx,
 * eligiendo de la lista viva o confirmando la sugerencia de
 * personaMasParecida), nunca el modelo. Si los dos tipos siguieran siendo el
 * mismo, cualquier cambio futuro al esquema de la IA colaría sin querer un
 * campo que la IA no debe poder rellenar.
 */
export interface AcuerdoConfirmado extends AcuerdoPropuesto {
  /** El id de Monday del responsable, si una persona lo confirmó. `null`/ausente = responsable de la UDN. */
  responsableMondayId?: string | null
}

export interface MinutaGuardada {
  id: string
  sesionId: string
  transcripcion: string | null
  textoFinal: string | null
  enviadaA: string[] | null
  createdAt: string // ISO
}

/**
 * De qué sala es la sesión, o `null` si no es de ninguna.
 *
 * Los acuerdos de una minuta se publican EN UNA SALA. Una reunión sin sala
 * —un comité, un arranque de campaña— puede tener minuta igual, pero sus
 * acuerdos no tienen dónde colgarse: se quedan en el texto, que es lo honesto
 * (ver `guardarMinuta`).
 */
async function salaDeSesion(sesionId: string): Promise<string | null> {
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
  return fila.salaSlug ?? null
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

  // Sin sala, los acuerdos confirmados no se publican: no hay dónde. Quedan
  // escritos en el texto de la minuta, que es donde el equipo los leerá.
  for (const acuerdo of salaSlug ? acuerdosConfirmados : []) {
    await crearAcuerdo(salaSlug!, {
      que: acuerdo.que,
      responsable: acuerdo.responsable,
      responsableMondayId: acuerdo.responsableMondayId ?? null,
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

/**
 * Reescribe el texto de una minuta ya publicada, sin tocar la transcripción
 * original ni volver a crear acuerdos.
 *
 * Publicar y corregir son cosas distintas: al publicar se decide qué acuerdos
 * nacen (eso no se repite, o se duplicarían); corregir es arreglar una frase
 * del correo. Por eso esto NO pasa por `guardarMinuta`.
 */
export async function editarTextoMinuta(sesionId: string, textoFinal: string): Promise<void> {
  if (hayDB()) {
    await db()
      .update(esquema.minutas)
      .set({ textoFinal })
      .where(eq(esquema.minutas.sesionId, sesionId))
    return
  }
  const fila = memoria.obtenerMinutaDeSesionMemoria(sesionId)
  if (fila) fila.textoFinal = textoFinal
}

/**
 * Borra la minuta de una sesión.
 *
 * Los acuerdos que se publicaron desde ella NO se borran: ya viven en la sala
 * y pueden llevar semanas moviéndose. Si alguno tampoco debía existir, se
 * elimina por su cuenta desde la sala.
 */
export async function eliminarMinuta(sesionId: string): Promise<void> {
  if (hayDB()) {
    await db().delete(esquema.minutas).where(eq(esquema.minutas.sesionId, sesionId))
    return
  }
  memoria.eliminarMinutaDeSesionMemoria(sesionId)
}

/**
 * Registra una minuta escrita fuera de la app (una junta anterior, un correo
 * que ya existía). No hay transcripción ni acuerdos propuestos por la IA: es
 * texto que el equipo pega tal cual.
 */
export async function cargarMinutaExterna(sesionId: string, textoFinal: string): Promise<void> {
  await salaDeSesion(sesionId)   // valida que la sesión exista
  const ahora = new Date()
  const id = `minuta-externa-${sesionId}-${ahora.getTime()}`

  if (hayDB()) {
    await db()
      .insert(esquema.minutas)
      .values({ id, sesionId, transcripcion: null, textoFinal, enviadaA: [] })
    return
  }
  memoria.insertarMinutaMemoria({
    id,
    sesionId,
    transcripcion: null,
    textoFinal,
    enviadaA: [],
    createdAt: ahora,
  })
}
