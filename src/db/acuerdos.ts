/**
 * Capa de escritura de Acuerdo (spec §4): cuelga de la SALA, no de la sesión
 * — nace en una sesión (o se da de alta directamente) y sobrevive a todas las
 * siguientes. Con `hayDB()` escribe a Postgres vía Drizzle; sin DB, usa el
 * store en memoria de `src/db/store-memoria.ts` (efímero, ver su cabecera).
 *
 * "Solo el equipo Mkt Corp mueve el estatus" (spec §4): hoy no hay auth (fase
 * posterior, ver tarea "Login SSO Slack y tokens de sala"), así que estas
 * funciones no comprueban identidad todavía — las protege quien las llama
 * (por ahora, solo la vista interna de sala y la publicación de minuta).
 *
 * Historia de cambios: v1 mínima (spec §4), un jsonb por acuerdo con un
 * registro por movimiento de estatus o edición — ver `esquema.acuerdos.historia`.
 */
import { eq } from 'drizzle-orm'
import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import * as memoria from './store-memoria'
import { sincronizarCambio } from '@/monday/sincronizar'
import { estadoInicialDeBandeja, type EstadoBandeja } from '@/monday/bandeja'
import { slugsDeSalas } from '@/temas'

export type EstatusAcuerdo = 'abierto' | 'cumplido' | 'vencido' | 'cancelado'

export interface NuevoAcuerdo {
  que: string
  responsable: string
  squad?: string
  prioridad?: string
  fechaCompromiso: Date | null
  /** Sesión donde nació el acuerdo. Omitir si se da de alta fuera de una sesión. */
  sesionOrigenId?: string | null
  /**
   * El id de usuario de Monday del responsable, solo si es alguien de Mkt
   * Corp. Es lo único que decide si el acuerdo entra a la bandeja — ver
   * src/monday/bandeja.ts. Nulo u omitido = responsable de la UDN.
   */
  responsableMondayId?: string | null
}

export interface CambiosAcuerdo {
  que?: string
  responsable?: string
  squad?: string
  prioridad?: string
  fechaCompromiso?: Date | null
  /**
   * Traerlo en los cambios (aunque sea `null`) recalcula la bandeja del
   * acuerdo — ver `editarAcuerdo`. Omitirlo deja la bandeja como está.
   */
  responsableMondayId?: string | null
}

interface EntradaHistoria {
  en: string // ISO
  estatusAnterior?: EstatusAcuerdo
  cambios?: unknown
}

function historiaConEntrada(historiaPrevia: unknown, entrada: EntradaHistoria): EntradaHistoria[] {
  const previa = Array.isArray(historiaPrevia) ? (historiaPrevia as EntradaHistoria[]) : []
  return [...previa, entrada]
}

function validarSala(salaSlug: string): void {
  if (!slugsDeSalas().includes(salaSlug)) {
    throw new Error(`Sala desconocida: "${salaSlug}"`)
  }
}

function isoDia(d: Date | null | undefined): string | null {
  return d ? d.toISOString().slice(0, 10) : null
}

/**
 * Si la edición trae `responsableMondayId` (aunque sea `null`), recalcula la
 * bandeja con la misma regla del alta. `undefined` indica que la edición no
 * toca ese campo, así que la bandeja no se recalcula.
 *
 * `subido` y `descartado` no se tocan: son estados definitivos (ver
 * src/monday/bandeja.ts) y una edición del responsable no debe reabrir algo
 * que ya se subió a Monday o que alguien ya decidió no subir.
 */
function bandejaTrasEditar(bandejaActual: string, cambios: CambiosAcuerdo): EstadoBandeja | undefined {
  const { responsableMondayId } = cambios
  if (responsableMondayId === undefined) return undefined
  if (bandejaActual !== 'no_aplica' && bandejaActual !== 'pendiente') return undefined
  return estadoInicialDeBandeja(responsableMondayId)
}

/** Da de alta un acuerdo nuevo, siempre en estatus `abierto`. */
export async function crearAcuerdo(salaSlug: string, datos: NuevoAcuerdo): Promise<{ id: string }> {
  validarSala(salaSlug)
  const id = crypto.randomUUID()
  const ahora = new Date()
  const responsableMondayId = datos.responsableMondayId ?? null
  const bandeja = estadoInicialDeBandeja(responsableMondayId)

  if (hayDB()) {
    await db()
      .insert(esquema.acuerdos)
      .values({
        id,
        salaSlug,
        que: datos.que,
        responsable: datos.responsable,
        squad: datos.squad ?? null,
        prioridad: datos.prioridad ?? null,
        fechaCompromiso: datos.fechaCompromiso,
        estatus: 'abierto',
        sesionOrigenId: datos.sesionOrigenId ?? null,
        responsableMondayId,
        bandeja,
        historia: [],
      })
  } else {
    memoria.insertarAcuerdoMemoria({
      id,
      salaSlug,
      que: datos.que,
      responsable: datos.responsable,
      squad: datos.squad,
      prioridad: datos.prioridad,
      fechaCompromiso: datos.fechaCompromiso,
      estatus: 'abierto',
      sesionOrigenId: datos.sesionOrigenId ?? null,
      responsableMondayId,
      bandeja,
      historia: [],
      createdAt: ahora,
      updatedAt: ahora,
    })
  }

  // El alta YA NO escribe en Monday. Antes creaba el elemento sola y eso es lo
  // que Franco cambió el 29-jul: nada entra al tablero del equipo sin que
  // alguien lo confirme en la bandeja (ver src/monday/bandeja.ts). Lo que hace
  // el alta es dejarlo `pendiente` si tiene responsable de Mkt Corp.

  return { id }
}

/** Mueve el estatus de un acuerdo, dejando registro del estatus anterior en su historia. */
export async function moverEstatus(acuerdoId: string, nuevoEstatus: EstatusAcuerdo): Promise<void> {
  const ahora = new Date()

  if (hayDB()) {
    const conexion = db()
    const actual = (await conexion.select().from(esquema.acuerdos).where(eq(esquema.acuerdos.id, acuerdoId)))[0]
    if (!actual) throw new Error(`Acuerdo no encontrado: "${acuerdoId}"`)
    const historia = historiaConEntrada(actual.historia, {
      en: ahora.toISOString(),
      estatusAnterior: actual.estatus,
    })
    await conexion
      .update(esquema.acuerdos)
      .set({ estatus: nuevoEstatus, historia, updatedAt: ahora })
      .where(eq(esquema.acuerdos.id, acuerdoId))
  } else {
    const actual = memoria.obtenerAcuerdoMemoria(acuerdoId)
    if (!actual) throw new Error(`Acuerdo no encontrado: "${acuerdoId}"`)
    const historia = historiaConEntrada(actual.historia, {
      en: ahora.toISOString(),
      estatusAnterior: actual.estatus,
    })
    memoria.actualizarAcuerdoMemoria(acuerdoId, { estatus: nuevoEstatus, historia })
  }

  await sincronizarDespuesDeEditar(acuerdoId)
}

/**
 * Lleva a Monday el estado ACTUAL del acuerdo, releyéndolo de nuestra base.
 *
 * Se relee en vez de recibir los campos por parámetro para que lo que viaje
 * al tablero sea lo que quedó guardado, no lo que se pidió guardar: si algo
 * de la escritura no cuajó, Monday no debe recibir una versión que aquí no
 * existe.
 */
async function sincronizarDespuesDeEditar(acuerdoId: string): Promise<void> {
  if (!hayDB()) return
  const fila = (await db().select().from(esquema.acuerdos).where(eq(esquema.acuerdos.id, acuerdoId)))[0]
  if (!fila) return
  await sincronizarCambio(acuerdoId, {
    salaSlug: fila.salaSlug,
    que: fila.que,
    estatus: fila.estatus,
    fechaCompromiso: isoDia(fila.fechaCompromiso),
  })
}

/** Edita los campos de un acuerdo (qué, responsable, squad, prioridad, fecha), registrando los cambios en su historia. */
export async function editarAcuerdo(acuerdoId: string, cambios: CambiosAcuerdo): Promise<void> {
  const ahora = new Date()

  if (hayDB()) {
    const conexion = db()
    const actual = (await conexion.select().from(esquema.acuerdos).where(eq(esquema.acuerdos.id, acuerdoId)))[0]
    if (!actual) throw new Error(`Acuerdo no encontrado: "${acuerdoId}"`)
    const historia = historiaConEntrada(actual.historia, { en: ahora.toISOString(), cambios })
    const bandeja = bandejaTrasEditar(actual.bandeja, cambios)
    await conexion
      .update(esquema.acuerdos)
      .set({ ...cambios, ...(bandeja !== undefined ? { bandeja } : {}), historia, updatedAt: ahora })
      .where(eq(esquema.acuerdos.id, acuerdoId))
  } else {
    const actual = memoria.obtenerAcuerdoMemoria(acuerdoId)
    if (!actual) throw new Error(`Acuerdo no encontrado: "${acuerdoId}"`)
    const historia = historiaConEntrada(actual.historia, { en: ahora.toISOString(), cambios })
    const bandeja = bandejaTrasEditar(actual.bandeja, cambios)
    memoria.actualizarAcuerdoMemoria(acuerdoId, { ...cambios, ...(bandeja !== undefined ? { bandeja } : {}), historia })
  }

  await sincronizarDespuesDeEditar(acuerdoId)
}

/**
 * Borra un acuerdo de verdad, con su historia.
 *
 * Distinto de `moverEstatus(id, 'cancelado')`: cancelar es una decisión de
 * negocio —el acuerdo existió y se dejó sin efecto— y la fila se conserva.
 * Esto es para lo que nunca debió existir: un duplicado, un error de dedo, una
 * línea que la IA sacó de una transcripción y no era un acuerdo. No hay
 * papelera: la vista que llama pide confirmación antes.
 */
export async function eliminarAcuerdo(acuerdoId: string): Promise<void> {
  if (hayDB()) {
    await db().delete(esquema.acuerdos).where(eq(esquema.acuerdos.id, acuerdoId))
    return
  }
  memoria.eliminarAcuerdoMemoria(acuerdoId)
}
