import { eq, sql } from 'drizzle-orm'
import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import { listarPersonas } from './directorio'

/**
 * QUIÉN PREPARÓ CADA SESIÓN Y QUIÉN LA PRESENTÓ (ronda 9, tarea 4).
 *
 * Franco: «debe irse registrando quién de los editores está editando o
 * quiénes están en vivo interactuando, así puedo ver quién de mis gerentes
 * participó en el desarrollo de la presentación».
 *
 * Dos señales, una sola tabla (`esquema.participacion`, clave compuesta
 * sesión+correo):
 *
 * - `ediciones`/`primeraEdicion`/`ultimaEdicion` — quién tocó el CONTENIDO:
 *   guardó una sección, la añadió o la quitó, reordenó, maquetó o publicó la
 *   minuta. Lo escribe `registrarEdicion`, desde esas acciones y SOLO desde
 *   ellas — abrir una sesión para mirarla no es participar.
 * - `presento` — quién abrió el MODO PRESENTACIÓN mientras la reunión
 *   ocurría. No hay señal más fiable sin presencia en tiempo real, que es un
 *   sistema entero para responder una pregunta que se contesta con un
 *   registro. Lo escribe `registrarPresentacion`, desde `ModoPresentar`
 *   (`src/componentes/sesion/ModoPresentar.tsx`).
 *
 * Las dos son UNA SOLA SENTENCIA con `ON CONFLICT` (mismo patrón que
 * `generarEnlaceDeAgenda`, src/db/enlace-agenda.ts): leer-y-escribir para
 * sumar uno ha causado un fallo distinto en cada una de las tres rondas
 * anteriores, incluido uno esta misma semana que podía dejar la app sin
 * administradores (ver la cabecera de src/app/personas/acciones.ts).
 *
 * LO QUE ESTO NO DICE, y hay que decirlo en pantalla —`ParticipantesSesion`,
 * src/componentes/sesion/ParticipantesSesion.tsx—: no distingue quién habló,
 * cuánto participó, ni si estuvo atento. Dice quién tocó la presentación y
 * quién la abrió. Vender más que eso sería mentir con datos.
 */

export interface Participante {
  correo: string
  nombre: string
  ediciones: number
  presento: boolean
  ultimaEdicion: Date
}

export interface ResumenParticipacion {
  /** Nombres de quienes editaron al menos una vez, de quien más tocó a quien menos. */
  prepararon: string[]
  /** Nombres de quienes abrieron el modo presentación. */
  presentaron: string[]
}

/**
 * Pura: separa "quién preparó" de "quién presentó" y ordena a quien preparó
 * por cuánto tocó la sesión (más ediciones, primero). Quien solo presentó sin
 * editar ninguna vez (`ediciones === 0`) no entra en `prepararon` — presentar
 * no es preparar, aunque lo haga la misma persona.
 */
export function resumirParticipacion(participantes: Participante[]): ResumenParticipacion {
  return {
    prepararon: participantes
      .filter((p) => p.ediciones > 0)
      .sort((a, b) => b.ediciones - a.ediciones)
      .map((p) => p.nombre),
    presentaron: participantes.filter((p) => p.presento).map((p) => p.nombre),
  }
}

/**
 * Deja constancia de que `correo` tocó el CONTENIDO de `sesionId`. Una sola
 * sentencia: inserta la fila en 1 edición, o si ya existe (misma sesión,
 * mismo correo) suma uno y mueve `ultimaEdicion` — nunca lee antes de
 * escribir.
 *
 * NUNCA PROPAGA (revisión de la ronda 9, tarea 4 — hallazgo del revisor).
 * `publicarMinutaAction` (`src/app/deck/[id]/minuta/acciones.ts`) llama a
 * esta función DESPUÉS de crear la sesión y guardar la minuta, dentro de su
 * propio try/catch. Si esta escritura fallara (un hipo transitorio de red
 * contra Neon) y el error se dejara subir, ese try/catch lo atraparía y
 * devolvería «no se pudo publicar» — con el acta YA publicada de verdad. Un
 * reintento del usuario, con el mismo `{ nueva: ... }`, volvería a crear la
 * sesión y su minuta: la misma «reunión fantasma» que el comentario de esa
 * función documenta como corregida en otra ronda. Esto es bitácora, no el
 * dato que importa: nunca puede tumbar a quien la llama, en ninguno de los
 * trece sitios que la usan (doce hasta la tarea 4; `retomarAcuerdoAction`,
 * en el propio `src/app/deck/[id]/page.tsx`, se sumó en la tarea 6).
 * `console.error` es el único rastro que queda.
 */
export async function registrarEdicion(sesionId: string, correo: string): Promise<void> {
  if (!hayDB()) return
  const ahora = new Date()
  try {
    await db()
      .insert(esquema.participacion)
      .values({ sesionId, correo, primeraEdicion: ahora, ultimaEdicion: ahora, ediciones: 1, presento: false })
      .onConflictDoUpdate({
        target: [esquema.participacion.sesionId, esquema.participacion.correo],
        set: { ultimaEdicion: ahora, ediciones: sql`${esquema.participacion.ediciones} + 1` },
      })
  } catch (error) {
    console.error(`[registrarEdicion] no se pudo registrar la edición de "${correo}" en "${sesionId}":`, error)
  }
}

/**
 * Deja constancia de que `correo` abrió el modo presentación de `sesionId`.
 * Misma sentencia atómica; a propósito NO toca `ediciones` ni `ultimaEdicion`
 * en el conflicto — presentar no es editar, aunque sea la misma fila.
 */
export async function registrarPresentacion(sesionId: string, correo: string): Promise<void> {
  if (!hayDB()) return
  const ahora = new Date()
  await db()
    .insert(esquema.participacion)
    .values({ sesionId, correo, primeraEdicion: ahora, ultimaEdicion: ahora, ediciones: 0, presento: true })
    .onConflictDoUpdate({
      target: [esquema.participacion.sesionId, esquema.participacion.correo],
      set: { presento: true },
    })
}

/**
 * Quién ha tocado `sesionId`, con su nombre resuelto contra el directorio de
 * personas (`src/db/directorio.ts`). Sin base de datos, lista vacía.
 *
 * Si alguien editó y luego se dio de baja del directorio, no desaparece de
 * la lista: se enseña su correo. Perdería el sentido "quién preparó esto" si
 * se borrara a la primera baja.
 */
export async function participantesDe(sesionId: string): Promise<Participante[]> {
  if (!hayDB()) return []
  const [filas, personas] = await Promise.all([
    db().select().from(esquema.participacion).where(eq(esquema.participacion.sesionId, sesionId)),
    listarPersonas(),
  ])
  const nombreDe = new Map(personas.map((p) => [p.correo, p.nombre] as const))
  return filas.map((f) => ({
    correo: f.correo,
    nombre: nombreDe.get(f.correo) ?? f.correo,
    ediciones: f.ediciones,
    presento: f.presento,
    ultimaEdicion: f.ultimaEdicion,
  }))
}
