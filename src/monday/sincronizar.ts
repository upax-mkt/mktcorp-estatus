import { eq } from 'drizzle-orm'
import { db, hayDB } from '@/db/cliente'
import * as esquema from '@/db/esquema'
import { escrituraActiva, actualizarEnMonday, ErrorMonday } from './cliente'
import type { EstatusGuardado, DestinoMonday } from './mapeo'

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
 *
 * SEGUNDA REGLA, desde el 29-jul: **nada se crea solo**. Antes existía
 * `sincronizarAlta` (para el alta) y, si un acuerdo sin `mondayId` cambiaba de
 * estatus, `sincronizarCambio` lo creaba de paso. Las dos rutas se borraron:
 * saltarse la bandeja (ver `src/monday/bandeja.ts`) es justo lo que esta
 * ronda impide. La bandeja es la ÚNICA puerta de entrada a Delivery — un
 * tablero de 950 elementos que mira el equipo entero — y la decide una
 * persona, acuerdo por acuerdo, como elemento nuevo o colgado de uno que ya
 * existe (`crearElementoEnDelivery` / `crearSubelemento` en `cliente.ts`).
 */

/** Lo que pasó al intentar sincronizar. Nunca lanza hacia la interfaz. */
export interface ResultadoSync {
  intentado: boolean
  ok: boolean
  motivo?: string
}

const APAGADO: ResultadoSync = { intentado: false, ok: false }

/** El `mondayId` guardado, y de qué tablero es — un elemento y un subelemento tienen columnas distintas. */
interface RefMonday {
  mondayId: string
  mondayTipo: DestinoMonday
}

async function mondayIdDe(acuerdoId: string): Promise<RefMonday | null> {
  if (!hayDB()) return null
  const fila = (
    await db()
      .select({ mondayId: esquema.acuerdos.mondayId, mondayTipo: esquema.acuerdos.mondayTipo })
      .from(esquema.acuerdos)
      .where(eq(esquema.acuerdos.id, acuerdoId))
  )[0]
  if (!fila?.mondayId) return null
  return {
    mondayId: fila.mondayId,
    // NULL es lo normal en un acuerdo de antes de esta ronda: se creó con el
    // `crearEnMonday` viejo (borrado en esta tarea), que solo escribía
    // ELEMENTOS — el subelemento no existía como destino todavía. A falta de
    // dato, es un elemento.
    mondayTipo: fila.mondayTipo === 'subelemento' ? 'subelemento' : 'elemento',
  }
}

/**
 * Lleva a Monday un cambio de estatus o de fecha.
 *
 * Si el acuerdo no tiene `mondayId` —vive solo en esta app, o todavía espera
 * en la bandeja— NO se crea nada: se devuelve como "no intentado", que no es
 * un error, es que no había nada que sincronizar. Crearlo de paso es
 * exactamente lo que la bandeja existe para decidir.
 *
 * `estatusAnterior` viaja tal cual hasta `actualizarEnMonday`, que decide con
 * él si hace falta escribir la columna de Fase — ver su cabecera en
 * cliente.ts (corrección crítica de la revisión final de la ronda 7).
 */
export async function sincronizarCambio(
  acuerdoId: string,
  datos: { salaSlug: string; que: string; estatus: EstatusGuardado; fechaCompromiso: string | null },
  estatusAnterior: EstatusGuardado,
): Promise<ResultadoSync> {
  if (!escrituraActiva()) return APAGADO
  const ref = await mondayIdDe(acuerdoId)
  if (!ref) return { intentado: false, ok: false }
  try {
    await actualizarEnMonday(ref.mondayId, ref.mondayTipo, datos, estatusAnterior)
    return { intentado: true, ok: true }
  } catch (error) {
    return {
      intentado: true,
      ok: false,
      motivo: error instanceof ErrorMonday ? error.message : 'Monday no respondió.',
    }
  }
}

// ---- La vuelta (tarea 9, ronda 7): qué hacer cuando el estado cambió en los dos lados ----

/**
 * El estado en Monday de UN acuerdo ya sincronizado — lo que trae
 * `leerAcuerdosDeMonday` (cliente.ts) por cada `mondayId` pedido.
 *
 * Vive aquí y no en cliente.ts porque es `reconciliar`, no la lectura, quien
 * define qué forma necesita el dato para decidir.
 */
export interface EstadoEnMonday {
  estatus: EstatusGuardado
  fechaCompromiso: string | null
  actualizadoEn: Date
  existe: boolean
}

/**
 * Quién manda cuando el acuerdo cambió en los dos lados.
 *
 * Gana el más reciente, comparando INSTANTES y no días civiles: por día
 * habría empates cada vez que alguien mueve algo por la mañana aquí y por la
 * tarde allá, y el empate lo tendría que romper una persona.
 *
 * El TEXTO del acuerdo nunca vuelve de Monday, así que no entra en esta
 * comparación: lo que se pactó en la reunión lo dice la minuta, y renombrar
 * el elemento en el tablero no reescribe un acta.
 *
 * Un elemento borrado en Monday (`existe: false`) NO borra nuestro acuerdo:
 * ni siquiera se llega a comparar fechas, se marca `desapareció` sin mirar
 * quién es más reciente — lo que se acordó en una reunión no lo deshace un
 * borrado en otro sistema.
 */
export function reconciliar(
  local: { estatus: EstatusGuardado; fechaCompromiso: string | null; updatedAt: Date },
  remoto: EstadoEnMonday,
): 'gana-local' | 'gana-monday' | 'desapareció' {
  if (!remoto.existe) return 'desapareció'
  return remoto.actualizadoEn > local.updatedAt ? 'gana-monday' : 'gana-local'
}
