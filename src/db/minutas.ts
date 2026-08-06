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
 * De qué sala es la reunión — `null` si no es de ninguna (un comité, una
 * interna de Mkt Corp; Tarea 8b/8c, 5-ago). Los acuerdos de una minuta se
 * publican EN UNA SALA (spec §4): sin una, `guardarMinuta` (más abajo) no
 * tiene dónde colgarlos como fila y los deja tal cual quedaron — escritos en
 * el texto de la minuta. Vuelve a poder devolver `null`, como la vieja
 * `salaDeSesion` antes de que la Tarea 4 volviera `DatosDeReunion.salaSlug`
 * obligatorio.
 */
async function salaDeReunion(reunionId: string): Promise<string | null> {
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
 * sala — SI TIENE UNA.
 *
 * LA POLÍTICA (Tarea 8c, 5-ago), la misma que `LevantarMinuta` ya promete en
 * pantalla: "Si la asignas a una sala, su minuta y sus acuerdos quedan ahí;
 * sin sala, la minuta existe igual y sus acuerdos se quedan en el texto."
 * Sin `salaSlug` no hay dónde colgar una fila de `acuerdos` (la tabla cuelga
 * de una sala — spec §4), así que `acuerdosConfirmados` se ignora A
 * PROPÓSITO, no por descuido: no se degrada a ninguna sala por defecto ni se
 * lanza un error, simplemente no nace la fila. La minuta en sí —`textoFinal`,
 * con los acuerdos ya escritos dentro por la IA o por quien la revisó— se
 * guarda igual, sala o no.
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
    // ON CONFLICT (reunion_id) DO UPDATE, no un INSERT a ciegas (hallazgo 3
    // de la revisión final de la ronda 10) — mismo patrón que ya usan
    // `src/db/participacion.ts:93-99` y `src/db/enlace-agenda.ts`. Un doble
    // clic o un reintento tras un hipo de red vuelven a llamar a
    // `guardarMinuta` para la MISMA reunión; sin esto, el segundo INSERT
    // chocaba con nada (la tabla no tenía más restricción que la clave
    // primaria) y dejaba dos filas — la «reunión fantasma» que documenta
    // `participacion.ts:75-88`, aquí aplicada a la minuta. `neon-http` no
    // soporta transacciones ni `SELECT FOR UPDATE`: la condición tiene que
    // ir DENTRO de la sentencia, y una sola sentencia atómica es justo lo
    // que Postgres garantiza aquí.
    //
    // El `SET` deja la fila en el mismo estado que dejaría un INSERT
    // fresco —transcripción y texto de ESTA llamada, `enviadaA` de nuevo en
    // `null`— sin tocar `id` ni `createdAt`: la fila conserva su identidad
    // y su fecha de creación real, solo se actualiza su contenido.
    await db()
      .insert(esquema.minutas)
      .values({ id, reunionId, transcripcion, textoFinal, enviadaA: null })
      .onConflictDoUpdate({
        target: esquema.minutas.reunionId,
        set: { transcripcion, textoFinal, enviadaA: null },
      })
  } else {
    memoria.insertarMinutaMemoria({ id, reunionId, transcripcion, textoFinal, enviadaA: null, createdAt: ahora })
  }

  if (salaSlug) {
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
    // Sin `?? reunionId`: `minutas.reunion_id` es NOT NULL desde el
    // hallazgo 3 de la revisión final de la ronda 10 (ver esquema.ts) — el
    // respaldo ya no hace falta, la base lo garantiza.
    reunionId: fila.reunionId,
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
      .values({ id, reunionId, transcripcion: null, textoFinal, enviadaA: [] })
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
