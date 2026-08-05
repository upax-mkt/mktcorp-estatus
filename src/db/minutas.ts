/**
 * Persistencia de Minuta (spec §4: "Ligada a una reunión. Guarda la
 * transcripción original, el texto final editado y a quién se envió") y del
 * paso de publicación: los acuerdos confirmados por el equipo se cuelgan de
 * la SALA de la reunión (spec §4, no de la reunión), con `reunionOrigenId`
 * para saber dónde nacieron. Con `hayDB()` escribe a Postgres vía Drizzle;
 * sin DB, usa el store en memoria — mismo patrón que src/db/reuniones.ts.
 *
 * MIGRADO A REUNIONES (ronda 10, tarea 5b) fuera de la lista formal de 20
 * archivos: no importaba `@/db/sesiones` (usaba `esquema.sesiones` y
 * `memoria.*SesionMemoria` directo), así que el grep que midió esa lista no
 * lo encontró. Pero SÍ dependía de que `crearSesion`/`crearSesionConEstructura`
 * (`sesiones.ts`) siguieran sembrando una fila en `esquema.sesiones` por cada
 * reunión — `minutas.sesion_id` es `NOT NULL` + FK a esa tabla. En cuanto
 * `sesiones.ts` desaparece, TODA reunión nueva nace solo en `esquema.reuniones`
 * (`crearReunion`/`crearReunionConDocumento`), así que guardar su minuta
 * habría reventado por violación de clave foránea contra una fila que nunca
 * existió — un fallo que ningún test en memoria detecta (el store no modela
 * la FK) y que solo se habría visto en Postgres, en producción, la primera
 * vez que alguien intentara minutar una reunión creada después de este
 * cambio. Mismo síntoma, mismo arreglo y mismo criterio que ya aplicó la
 * Tarea 5a a `items.sesionId`: la columna deja de ser `NOT NULL` (ver
 * `esquema.ts`), y este módulo pasa a resolver todo por `reunionId`.
 *
 * NO SE TOCA `reuniones.estado`/`noDadaEn` desde aquí a propósito: sería
 * adelantar el trabajo de la Tarea 6 (`src/dominio/reunion.ts`), cuyo
 * `tieneRespaldo` ya cuenta una minuta como prueba de que la junta ocurrió
 * SIN que nadie tenga que forzar `estado: 'dada'` a mano — y hacerlo aquí
 * además dispararía el freeze de sala de `marcarDada` en un sitio donde hoy
 * no se esperaba (ver el reporte de esta tarea, "problemas o preocupaciones").
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
  reunionId: string
  transcripcion: string | null
  textoFinal: string | null
  enviadaA: string[] | null
  createdAt: string // ISO
}

/**
 * De qué sala es la reunión.
 *
 * Los acuerdos de una minuta se publican EN UNA SALA. `DatosDeReunion.salaSlug`
 * es obligatorio desde la Tarea 4 —toda reunión es de una sala—, así que a
 * diferencia de la vieja `salaDeSesion` esto ya no puede devolver `null`;
 * se deja el tipo `string` reflejándolo.
 */
async function salaDeReunion(reunionId: string): Promise<string> {
  if (hayDB()) {
    const fila = (
      await db()
        .select({ salaSlug: esquema.reuniones.salaSlug })
        .from(esquema.reuniones)
        .where(eq(esquema.reuniones.id, reunionId))
    )[0]
    if (!fila) throw new Error(`Reunión no encontrada: "${reunionId}"`)
    return fila.salaSlug
  }
  const fila = memoria.obtenerReunionMemoria(reunionId)
  if (!fila) throw new Error(`Reunión no encontrada: "${reunionId}"`)
  return fila.salaSlug
}

/**
 * Guarda la minuta de una reunión y publica sus acuerdos confirmados en la
 * sala.
 *
 * NO marca la reunión como `dada` ni toca `noDadaEn` — ver el comentario de
 * cabecera de este módulo para el porqué (evitar adelantar la Tarea 6 y
 * disparar el freeze de sala de `marcarDada` en un sitio nuevo).
 */
export async function guardarMinuta(
  reunionId: string,
  transcripcion: string,
  textoFinal: string,
  acuerdosConfirmados: AcuerdoConfirmado[],
): Promise<{ id: string }> {
  const salaSlug = await salaDeReunion(reunionId)
  const id = crypto.randomUUID()
  const ahora = new Date()

  if (hayDB()) {
    await db().insert(esquema.minutas).values({
      id,
      sesionId: null,
      reunionId,
      transcripcion,
      textoFinal,
      enviadaA: null,
    })
  } else {
    memoria.insertarMinutaMemoria({ id, reunionId, transcripcion, textoFinal, enviadaA: null, createdAt: ahora })
  }

  for (const acuerdo of acuerdosConfirmados) {
    await crearAcuerdo(salaSlug, {
      que: acuerdo.que,
      responsable: acuerdo.responsable,
      responsableMondayId: acuerdo.responsableMondayId ?? null,
      squad: acuerdo.squad,
      prioridad: acuerdo.prioridad,
      fechaCompromiso: acuerdo.fechaCompromiso ? new Date(acuerdo.fechaCompromiso) : null,
      reunionOrigenId: reunionId,
    })
  }

  return { id }
}

export async function obtenerMinuta(reunionId: string): Promise<MinutaGuardada | null> {
  if (!hayDB()) {
    const fila = memoria.obtenerMinutaDeReunionMemoria(reunionId)
    if (!fila) return null
    return {
      id: fila.id,
      reunionId: fila.reunionId,
      transcripcion: fila.transcripcion,
      textoFinal: fila.textoFinal,
      enviadaA: fila.enviadaA,
      createdAt: fila.createdAt.toISOString(),
    }
  }

  const conexion = db()
  const fila = (await conexion.select().from(esquema.minutas).where(eq(esquema.minutas.reunionId, reunionId)))[0]
  if (!fila) return null
  return {
    id: fila.id,
    reunionId: fila.reunionId ?? reunionId,
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
export async function editarTextoMinuta(reunionId: string, textoFinal: string): Promise<void> {
  if (hayDB()) {
    await db()
      .update(esquema.minutas)
      .set({ textoFinal })
      .where(eq(esquema.minutas.reunionId, reunionId))
    return
  }
  const fila = memoria.obtenerMinutaDeReunionMemoria(reunionId)
  if (fila) fila.textoFinal = textoFinal
}

/**
 * Borra la minuta de una reunión.
 *
 * Los acuerdos que se publicaron desde ella NO se borran: ya viven en la sala
 * y pueden llevar semanas moviéndose. Si alguno tampoco debía existir, se
 * elimina por su cuenta desde la sala.
 */
export async function eliminarMinuta(reunionId: string): Promise<void> {
  if (hayDB()) {
    await db().delete(esquema.minutas).where(eq(esquema.minutas.reunionId, reunionId))
    return
  }
  memoria.eliminarMinutaDeReunionMemoria(reunionId)
}

/**
 * Registra una minuta escrita fuera de la app (una junta anterior, un correo
 * que ya existía). No hay transcripción ni acuerdos propuestos por la IA: es
 * texto que el equipo pega tal cual.
 */
export async function cargarMinutaExterna(reunionId: string, textoFinal: string): Promise<void> {
  await salaDeReunion(reunionId)   // valida que la reunión exista
  const ahora = new Date()
  const id = `minuta-externa-${reunionId}-${ahora.getTime()}`

  if (hayDB()) {
    await db()
      .insert(esquema.minutas)
      .values({ id, sesionId: null, reunionId, transcripcion: null, textoFinal, enviadaA: [] })
    return
  }
  memoria.insertarMinutaMemoria({
    id,
    reunionId,
    transcripcion: null,
    textoFinal,
    enviadaA: [],
    createdAt: ahora,
  })
}
