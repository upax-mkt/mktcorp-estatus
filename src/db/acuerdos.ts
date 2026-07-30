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
import { eq, isNotNull } from 'drizzle-orm'
import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import * as memoria from './store-memoria'
import { sincronizarCambio, reconciliar } from '@/monday/sincronizar'
import { estadoInicialDeBandeja, entraALaBandeja, type EstadoBandeja } from '@/monday/bandeja'
import { leerAcuerdosDeMonday, mondayConectado } from '@/monday/cliente'
import type { DestinoMonday } from '@/monday/mapeo'
import { slugsDeSalas, obtenerTema } from '@/temas'

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
 * Cadena vacía nunca es un id de Monday: o es un id de verdad, o es `null`.
 * Colada hasta la columna de personas de Monday, `''` se convierte en
 * `Number('') === 0` — el id de un usuario que no existe, y el acuerdo se
 * asignaría a quien no toca (el fallo que ya costó dos rondas de arreglo en
 * la tarea 6). Esto vivía solo en el borde del formulario de alta; vive
 * también aquí, en la capa de escritura, para que ningún llamador —el que ya
 * existe, el que se escriba después— tenga que acordarse por su cuenta.
 */
function normalizarResponsableMondayId(id: string | null | undefined): string | null {
  if (id == null) return null
  const recortado = id.trim()
  return recortado.length > 0 ? recortado : null
}

/**
 * `cambios` con `responsableMondayId` ya normalizado, antes de usarse para
 * calcular la bandeja o para escribir en la base. Si el campo NO viene
 * (`undefined`), se deja tal cual — es la señal que `bandejaTrasEditar`
 * necesita para saber que esta edición no toca el responsable.
 */
function cambiosNormalizados(cambios: CambiosAcuerdo): CambiosAcuerdo {
  if (cambios.responsableMondayId === undefined) return cambios
  return { ...cambios, responsableMondayId: normalizarResponsableMondayId(cambios.responsableMondayId) }
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
  const responsableMondayId = normalizarResponsableMondayId(datos.responsableMondayId)
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
export async function editarAcuerdo(acuerdoId: string, cambiosCrudos: CambiosAcuerdo): Promise<void> {
  const ahora = new Date()
  const cambios = cambiosNormalizados(cambiosCrudos)

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

// ---- La bandeja (tarea 8, ronda 7) ----

/**
 * El nombre y color de marca de una sala, sin reventar si algún día hay una
 * fila con un `salaSlug` que no está en `src/temas`. No debería pasar —la FK
 * de `acuerdos.salaSlug` exige que la sala exista, y el registro de temas es
 * lo que decide qué salas existen— pero un texto de más en la bandeja es más
 * barato que una bandeja que no carga. Mismo patrón defensivo que
 * `identidadDeSala` en src/app/deck/[id]/minuta/acciones.ts.
 */
function temaDeSalaSeguro(slug: string): { nombre: string; color?: string } {
  try {
    const tema = obtenerTema(slug)
    return { nombre: tema.nombre, color: tema.primario }
  } catch {
    return { nombre: slug, color: undefined }
  }
}

export interface AcuerdoPendienteDeSubir {
  id: string
  que: string
  responsable: string
  salaSlug: string
  salaNombre: string
  /** Para el filo de color de la fila (ver FilaBandeja) — opcional porque no todo consumidor lo necesita. */
  salaColor?: string
  /** yyyy-mm-dd, o null si no tiene fecha compromiso. */
  fechaCompromiso: string | null
}

/**
 * Los acuerdos que esperan una decisión en la bandeja: `bandeja = 'pendiente'`,
 * con responsable de Mkt Corp, de una sala que no está en pausa.
 *
 * El WHERE de Postgres ya filtra por `bandeja = 'pendiente'` para no traer la
 * tabla entera, pero la condición COMPLETA —que también exige responsable y
 * sala activa (`salas.activa`)— se vuelve a comprobar con `entraALaBandeja`:
 * es la única regla de qué entra a la bandeja (src/monday/bandeja.ts, ya
 * probada en bandeja.test.ts) y conviene tenerla escrita en un solo sitio, no
 * repetida aquí en SQL y allá en TypeScript donde se puedan desincronizar.
 * Hoy todas las salas están activas, pero el filtro tiene que estar puesto
 * desde ya: es lo que congela los acuerdos de una sala en freeze (tarea 12).
 *
 * Sin DB no hay bandeja que mostrar: el store en memoria no modela la tabla
 * `salas` ni su columna `activa` (ver src/db/store-memoria.ts), así que falta
 * la mitad de la regla — devolver `[]` es más honesto que fingir que todas
 * las salas están activas.
 */
export async function acuerdosPendientesDeSubir(): Promise<AcuerdoPendienteDeSubir[]> {
  if (!hayDB()) return []

  const filas = await db()
    .select({
      id: esquema.acuerdos.id,
      que: esquema.acuerdos.que,
      responsable: esquema.acuerdos.responsable,
      salaSlug: esquema.acuerdos.salaSlug,
      fechaCompromiso: esquema.acuerdos.fechaCompromiso,
      responsableMondayId: esquema.acuerdos.responsableMondayId,
      bandeja: esquema.acuerdos.bandeja,
      salaActiva: esquema.salas.activa,
    })
    .from(esquema.acuerdos)
    .innerJoin(esquema.salas, eq(esquema.acuerdos.salaSlug, esquema.salas.slug))
    .where(eq(esquema.acuerdos.bandeja, 'pendiente'))

  return filas
    .filter((f) =>
      entraALaBandeja({
        responsableMondayId: f.responsableMondayId,
        bandeja: f.bandeja as EstadoBandeja,
        salaActiva: f.salaActiva,
      }),
    )
    .map((f) => {
      const tema = temaDeSalaSeguro(f.salaSlug)
      return {
        id: f.id,
        que: f.que,
        responsable: f.responsable,
        salaSlug: f.salaSlug,
        salaNombre: tema.nombre,
        salaColor: tema.color,
        fechaCompromiso: isoDia(f.fechaCompromiso),
      }
    })
    // La fecha más próxima primero; sin fecha, al final: es lo que más urge decidir.
    .sort((a, b) => (a.fechaCompromiso ?? '9999-99-99').localeCompare(b.fechaCompromiso ?? '9999-99-99'))
}

// ---- La vuelta (tarea 9, ronda 7) ----

/**
 * LA VUELTA: trae de Monday el estado de los acuerdos que ya viven allá y
 * reconcilia cada uno contra lo que hay aquí — ver `reconciliar` en
 * src/monday/sincronizar.ts.
 *
 * Quien llama a esto es una PÁGINA (/acuerdos, /cliente/[slug]) y la
 * envuelve en try/catch: aquí NO se atrapan los errores de Monday, se dejan
 * subir. Es la regla central de sincronizar.ts —Monday nunca puede tumbar la
 * app— vista desde el otro lado: hay un único llamador por página y es él
 * quien decide qué pasa si esto falla, así que atraparlo aquí también solo
 * escondería el error de quien sí lo necesita.
 *
 * Sin DB no hay nada que refrescar: el store en memoria no modela las
 * columnas de Monday (ver FilaAcuerdoMemoria en store-memoria.ts), así que
 * ningún acuerdo en memoria tiene un mondayId del que partir.
 */
export async function refrescarDesdeMonday(): Promise<void> {
  if (!hayDB() || !mondayConectado()) return
  const conexion = db()

  // SOLO los acuerdos que ya tienen mondayId — nunca el tablero entero (ver
  // la cabecera de leerAcuerdosDeMonday en src/monday/cliente.ts).
  const filas = await conexion
    .select({
      id: esquema.acuerdos.id,
      mondayId: esquema.acuerdos.mondayId,
      mondayTipo: esquema.acuerdos.mondayTipo,
      estatus: esquema.acuerdos.estatus,
      fechaCompromiso: esquema.acuerdos.fechaCompromiso,
      historia: esquema.acuerdos.historia,
      updatedAt: esquema.acuerdos.updatedAt,
    })
    .from(esquema.acuerdos)
    .where(isNotNull(esquema.acuerdos.mondayId))

  if (filas.length === 0) return

  const refs: Array<{ mondayId: string; tipo: DestinoMonday }> = filas.map((f) => ({
    mondayId: f.mondayId as string,
    // NULL es un acuerdo creado antes de esta ronda (el crearEnMonday viejo
    // solo escribía ELEMENTOS) — mismo criterio que mondayIdDe en
    // src/monday/sincronizar.ts.
    tipo: f.mondayTipo === 'subelemento' ? 'subelemento' : 'elemento',
  }))

  const remotos = await leerAcuerdosDeMonday(refs)
  const ahora = new Date()

  for (const fila of filas) {
    const remoto = remotos.get(fila.mondayId as string)
    // No debería faltar —leerAcuerdosDeMonday responde por cada id pedido,
    // exista allá o no— pero si faltara, no tocar la fila es lo seguro.
    if (!remoto) continue

    const resultado = reconciliar(
      { estatus: fila.estatus, fechaCompromiso: isoDia(fila.fechaCompromiso), updatedAt: fila.updatedAt },
      remoto,
    )

    if (resultado === 'gana-monday') {
      // Deja rastro en la historia, igual que moverEstatus/editarAcuerdo:
      // sin esto, un acuerdo que cambia de estatus por la vuelta no se
      // distingue de uno que cambió por un clic en la sala, y es
      // precisamente esa distinción la que hace falta para diagnosticar un
      // caso como el de 'cancelado' resucitando (ver mapeo.ts,
      // estatusDeFase) si algo parecido volviera a pasar de otra forma.
      // `origen: 'monday'` es la marca que falta en las entradas de
      // editarAcuerdo (su `cambios` es tal cual lo que pidió la persona).
      const historia = historiaConEntrada(fila.historia, {
        en: ahora.toISOString(),
        estatusAnterior: fila.estatus,
        cambios: { origen: 'monday', estatus: remoto.estatus, fechaCompromiso: remoto.fechaCompromiso },
      })
      await conexion
        .update(esquema.acuerdos)
        .set({
          estatus: remoto.estatus,
          fechaCompromiso: remoto.fechaCompromiso ? new Date(remoto.fechaCompromiso) : null,
          historia,
          updatedAt: ahora,
        })
        .where(eq(esquema.acuerdos.id, fila.id))
    } else if (resultado === 'desapareció') {
      // El acuerdo NO se borra ni cambia de estatus: lo que se acordó en una
      // reunión no lo deshace un borrado en otro sistema (ver la cabecera de
      // sincronizar.ts). Se deja de sincronizar —mondayId a null— y queda
      // constancia en la historia, con el mismo formato que usa cada cambio
      // de este archivo.
      const historia = historiaConEntrada(fila.historia, {
        en: ahora.toISOString(),
        cambios: {
          mondayId: null,
          aviso: 'El elemento ya no existe en Monday: se dejó de sincronizar.',
        },
      })
      await conexion
        .update(esquema.acuerdos)
        .set({ mondayId: null, historia, updatedAt: ahora })
        .where(eq(esquema.acuerdos.id, fila.id))
    }
    // 'gana-local': nuestro dato es más nuevo que el de Monday, no hay nada
    // que hacer — Monday se pone al día en el siguiente cambio que pase por
    // sincronizarCambio.
  }
}
