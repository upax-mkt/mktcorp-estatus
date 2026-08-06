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
import { and, eq, isNotNull } from 'drizzle-orm'
import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import * as memoria from './store-memoria'
import { sincronizarCambio, reconciliar } from '@/monday/sincronizar'
import { estadoInicialDeBandeja, entraALaBandeja, type EstadoBandeja } from '@/monday/bandeja'
import { leerAcuerdosDeMonday, mondayConectado } from '@/monday/cliente'
import type { DestinoMonday } from '@/monday/mapeo'
import { slugsDeSalas, cargarTemas } from './temas'
import type { Tema } from '@/temas'

export type EstatusAcuerdo = 'abierto' | 'cumplido' | 'vencido' | 'cancelado'

export interface NuevoAcuerdo {
  que: string
  responsable: string
  squad?: string
  prioridad?: string
  fechaCompromiso: Date | null
  /**
   * Reunión donde nació el acuerdo. Omitir si se da de alta fuera de una
   * reunión. Hasta la Tarea 8 convivía con `sesionOrigenId` (campo aparte,
   * columna aparte) mientras convivían los dos modelos; se retiró junto con
   * `sesiones` sin que nadie hubiera llegado a usarlo — desde que
   * `sesiones.ts` desapareció (Tarea 5b) nada da de alta un acuerdo colgado
   * de una fila de `sesiones`.
   */
  reunionOrigenId?: string | null
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

async function validarSala(salaSlug: string): Promise<void> {
  if (!(await slugsDeSalas()).includes(salaSlug)) {
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
  await validarSala(salaSlug)
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
        reunionOrigenId: datos.reunionOrigenId ?? null,
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
      reunionOrigenId: datos.reunionOrigenId ?? null,
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
  let estatusAnterior: EstatusAcuerdo

  if (hayDB()) {
    const conexion = db()
    const actual = (await conexion.select().from(esquema.acuerdos).where(eq(esquema.acuerdos.id, acuerdoId)))[0]
    if (!actual) throw new Error(`Acuerdo no encontrado: "${acuerdoId}"`)
    estatusAnterior = actual.estatus
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
    estatusAnterior = actual.estatus
    const historia = historiaConEntrada(actual.historia, {
      en: ahora.toISOString(),
      estatusAnterior: actual.estatus,
    })
    memoria.actualizarAcuerdoMemoria(acuerdoId, { estatus: nuevoEstatus, historia })
  }

  await sincronizarDespuesDeEditar(acuerdoId, estatusAnterior)
}

/**
 * Lleva a Monday el estado ACTUAL del acuerdo, releyéndolo de nuestra base.
 *
 * Se relee en vez de recibir los campos por parámetro para que lo que viaje
 * al tablero sea lo que quedó guardado, no lo que se pidió guardar: si algo
 * de la escritura no cuajó, Monday no debe recibir una versión que aquí no
 * existe.
 *
 * `estatusAnterior` — el estatus que tenía la fila ANTES de la escritura que
 * disparó esto — se le pasa tal cual a `sincronizarCambio`, que lo usa para
 * decidir si hace falta mandar la columna de Fase (corrección crítica de la
 * revisión final de la ronda 7: ver la cabecera de `actualizarEnMonday` en
 * src/monday/cliente.ts). `moverEstatus` manda el estatus real de antes;
 * `editarAcuerdo` NUNCA cambia el estatus (`CambiosAcuerdo` no tiene ese
 * campo), así que manda el mismo que la fila ya tenía — la comparación de
 * clases da igual siempre, tal como debe ser para una edición que no toca el
 * estatus.
 */
async function sincronizarDespuesDeEditar(acuerdoId: string, estatusAnterior: EstatusAcuerdo): Promise<void> {
  if (!hayDB()) return
  const fila = (await db().select().from(esquema.acuerdos).where(eq(esquema.acuerdos.id, acuerdoId)))[0]
  if (!fila) return
  await sincronizarCambio(
    acuerdoId,
    {
      salaSlug: fila.salaSlug,
      que: fila.que,
      estatus: fila.estatus,
      fechaCompromiso: isoDia(fila.fechaCompromiso),
    },
    estatusAnterior,
  )
}

/** Edita los campos de un acuerdo (qué, responsable, squad, prioridad, fecha), registrando los cambios en su historia. */
export async function editarAcuerdo(acuerdoId: string, cambiosCrudos: CambiosAcuerdo): Promise<void> {
  const ahora = new Date()
  const cambios = cambiosNormalizados(cambiosCrudos)
  let estatusAnterior: EstatusAcuerdo

  if (hayDB()) {
    const conexion = db()
    const actual = (await conexion.select().from(esquema.acuerdos).where(eq(esquema.acuerdos.id, acuerdoId)))[0]
    if (!actual) throw new Error(`Acuerdo no encontrado: "${acuerdoId}"`)
    estatusAnterior = actual.estatus
    const historia = historiaConEntrada(actual.historia, { en: ahora.toISOString(), cambios })
    const bandeja = bandejaTrasEditar(actual.bandeja, cambios)
    await conexion
      .update(esquema.acuerdos)
      .set({ ...cambios, ...(bandeja !== undefined ? { bandeja } : {}), historia, updatedAt: ahora })
      .where(eq(esquema.acuerdos.id, acuerdoId))
  } else {
    const actual = memoria.obtenerAcuerdoMemoria(acuerdoId)
    if (!actual) throw new Error(`Acuerdo no encontrado: "${acuerdoId}"`)
    estatusAnterior = actual.estatus
    const historia = historiaConEntrada(actual.historia, { en: ahora.toISOString(), cambios })
    const bandeja = bandejaTrasEditar(actual.bandeja, cambios)
    memoria.actualizarAcuerdoMemoria(acuerdoId, { ...cambios, ...(bandeja !== undefined ? { bandeja } : {}), historia })
  }

  // `editarAcuerdo` nunca cambia el estatus (CambiosAcuerdo no lo trae), así
  // que `estatusAnterior` es aquí siempre el mismo que el que queda guardado
  // — ver el comentario de `sincronizarDespuesDeEditar` sobre por qué eso es
  // exactamente lo que se necesita para que la Fase no se reescriba.
  await sincronizarDespuesDeEditar(acuerdoId, estatusAnterior)
}

/**
 * Deja constancia de que `reunionId` RETOMA `acuerdoId` — ronda 9, tarea 6.
 * Franco pidió poder "arrastrar" un acuerdo abierto de la sala a la reunión
 * que se está preparando. NO CREA UN ACUERDO NUEVO: darlo de alta otra vez
 * con el mismo `que` daría dos compromisos donde antes había uno —el
 * original seguiría colgando de la sala sin que cerrar el nuevo lo cerrara a
 * él, y viceversa—. El acuerdo es el MISMO; lo único que cambia es que su
 * historia deja constancia de que esta reunión lo retomó, con el mismo campo
 * `cambios` (bolsa libre) que ya usan `editarAcuerdo` y la rama "gana-monday"
 * de `refrescarDesdeMonday` para entradas que no son ni un movimiento de
 * estatus ni una edición de campos.
 *
 * Es la fuente que lee `acuerdosArrastrablesDe` (src/db/consultas.ts) para
 * dejar de ofrecer un acuerdo que esta reunión ya retomó.
 *
 * NO toca `estatus` (retomar no es cerrar) ni sincroniza con Monday: no
 * cambió ningún dato que le importe al tablero.
 */
export async function retomarAcuerdo(acuerdoId: string, reunionId: string): Promise<void> {
  const ahora = new Date()
  // La clave `retomadoEnSesion` se queda tal cual dentro de `cambios` (bolsa
  // libre, sin tipar) aunque el parámetro ya se llame `reunionId`: es dato ya
  // persistido en la historia de acuerdos existentes, y `acuerdos.test.ts` la
  // comprueba tal cual. Renombrarla mezclaría dos formas de la misma entrada
  // en la misma columna sin necesidad — nadie lee esta clave para decidir nada,
  // solo queda como bitácora.
  const entrada: EntradaHistoria = { en: ahora.toISOString(), cambios: { retomadoEnSesion: reunionId } }

  if (hayDB()) {
    const conexion = db()
    const actual = (await conexion.select().from(esquema.acuerdos).where(eq(esquema.acuerdos.id, acuerdoId)))[0]
    if (!actual) throw new Error(`Acuerdo no encontrado: "${acuerdoId}"`)
    const historia = historiaConEntrada(actual.historia, entrada)
    await conexion
      .update(esquema.acuerdos)
      .set({ historia, updatedAt: ahora })
      .where(eq(esquema.acuerdos.id, acuerdoId))
    return
  }

  const actual = memoria.obtenerAcuerdoMemoria(acuerdoId)
  if (!actual) throw new Error(`Acuerdo no encontrado: "${acuerdoId}"`)
  const historia = historiaConEntrada(actual.historia, entrada)
  memoria.actualizarAcuerdoMemoria(acuerdoId, { historia })
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
 * fila con un `salaSlug` que no tiene tema en el registro. No debería pasar
 * —la FK de `acuerdos.salaSlug` exige que la sala exista, y desde la ronda 8
 * las columnas de marca son `NOT NULL`— pero un texto de más en la bandeja
 * es más barato que una bandeja que no carga. Mismo patrón defensivo que
 * `identidadDeSala` en src/app/deck/[id]/minuta/acciones.ts.
 */
function temaDeSalaSeguro(slug: string, registro: Record<string, Tema>): { nombre: string; color?: string } {
  const tema = registro[slug]
  return tema ? { nombre: tema.nombre, color: tema.primario } : { nombre: slug, color: undefined }
}

export interface AcuerdoPendienteDeSubir {
  id: string
  que: string
  responsable: string
  /**
   * El id de Monday del responsable — para poder editarlo ahí mismo con
   * SelectorResponsable (revisión final de la ronda 7, punto 8) sin perder
   * la selección de Mkt Corp que ya tenía. `null` si es de la UDN.
   */
  responsableMondayId: string | null
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

  const registro = await cargarTemas()
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
      const tema = temaDeSalaSeguro(f.salaSlug, registro)
      return {
        id: f.id,
        que: f.que,
        responsable: f.responsable,
        responsableMondayId: f.responsableMondayId,
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
 * Cuánto se considera "recién comprobado" contra Monday antes de volver a
 * preguntarle por el MISMO acuerdo (revisión final de la ronda 7, punto 4).
 *
 * Sin esto, `refrescarDesdeMonday` llamaba a Monday por CADA acuerdo con
 * `mondayId`, en el render de TRES páginas (/acuerdos, /acuerdos/bandeja,
 * /cliente/[slug]), sin ninguna ventana: abrir la misma sala dos veces
 * seguidas —o que un director la recargue— repetía la misma consulta a
 * Monday sin que nada hubiera cambiado. 60 s es corto a propósito: esto no es
 * una caché de datos que casi no cambian (como el directorio de personas,
 * `VIGENCIA_MS` en src/monday/personas.ts, un día completo) — es la vuelta
 * que hace que un cambio del equipo en el tablero se refleje aquí, así que la
 * ventana solo existe para no repetir la MISMA consulta en la MISMA ráfaga de
 * cargas, no para retrasar el reflejo de un cambio real.
 */
const VENTANA_FRESCURA_MS = 60_000

/**
 * LA VUELTA: trae de Monday el estado de los acuerdos que ya viven allá y
 * reconcilia cada uno contra lo que hay aquí — ver `reconciliar` en
 * src/monday/sincronizar.ts.
 *
 * Quien llama a esto es una PÁGINA (/acuerdos, /acuerdos/bandeja,
 * /cliente/[slug]) y la envuelve en try/catch: aquí NO se atrapan los errores
 * de Monday, se dejan subir. Es la regla central de sincronizar.ts —Monday
 * nunca puede tumbar la app— vista desde el otro lado: hay un único llamador
 * por página y es él quien decide qué pasa si esto falla, así que atraparlo
 * aquí también solo escondería el error de quien sí lo necesita. Por la misma
 * razón `leerAcuerdosDeMonday` corre con `reintentarSiLimitado: false` (ver
 * su cabecera en src/monday/cliente.ts): un 429 aquí no puede colgar el
 * render esperando hasta 30 s, se rinde y queda para la siguiente carga.
 *
 * `salaSlug` (revisión final de la ronda 7, punto 4): si se llama desde UNA
 * sala (`/cliente/[slug]`), solo se refrescan los acuerdos de esa sala —antes
 * se traían y reconciliaban los de las nueve, en CADA carga de CUALQUIER
 * sala, para acabar usando solo los de la que se está pintando. Sin
 * `salaSlug` (desde `/acuerdos` o `/acuerdos/bandeja`, que mezclan todas) se
 * refrescan todos los que toquen por ventana de frescura.
 *
 * Sin DB no hay nada que refrescar: el store en memoria no modela las
 * columnas de Monday (ver FilaAcuerdoMemoria en store-memoria.ts), así que
 * ningún acuerdo en memoria tiene un mondayId del que partir.
 */
export async function refrescarDesdeMonday(salaSlug?: string): Promise<void> {
  if (!hayDB() || !mondayConectado()) return
  const conexion = db()

  // SOLO los acuerdos que ya tienen mondayId —nunca el tablero entero (ver la
  // cabecera de leerAcuerdosDeMonday en src/monday/cliente.ts)— y, si se pide
  // desde una sala, solo los de esa sala.
  const condicion = salaSlug
    ? and(isNotNull(esquema.acuerdos.mondayId), eq(esquema.acuerdos.salaSlug, salaSlug))
    : isNotNull(esquema.acuerdos.mondayId)

  const candidatas = await conexion
    .select({
      id: esquema.acuerdos.id,
      mondayId: esquema.acuerdos.mondayId,
      mondayTipo: esquema.acuerdos.mondayTipo,
      estatus: esquema.acuerdos.estatus,
      fechaCompromiso: esquema.acuerdos.fechaCompromiso,
      historia: esquema.acuerdos.historia,
      updatedAt: esquema.acuerdos.updatedAt,
      mondaySincronizadoEn: esquema.acuerdos.mondaySincronizadoEn,
    })
    .from(esquema.acuerdos)
    .where(condicion)

  const ahora = new Date()

  // LA VENTANA DE FRESCURA: fuera de la consulta SQL a propósito — es una
  // comparación en memoria sobre una columna que ya se trajo, no vale una
  // condición más en el WHERE para un puñado de filas por sala.
  const filas = candidatas.filter(
    (f) => !f.mondaySincronizadoEn || ahora.getTime() - f.mondaySincronizadoEn.getTime() > VENTANA_FRESCURA_MS,
  )

  if (filas.length === 0) return

  const refs: Array<{ mondayId: string; tipo: DestinoMonday }> = filas.map((f) => ({
    mondayId: f.mondayId as string,
    // NULL es un acuerdo creado antes de esta ronda (el crearEnMonday viejo
    // solo escribía ELEMENTOS) — mismo criterio que mondayIdDe en
    // src/monday/sincronizar.ts.
    tipo: f.mondayTipo === 'subelemento' ? 'subelemento' : 'elemento',
  }))

  const remotos = await leerAcuerdosDeMonday(refs)

  for (const fila of filas) {
    const remoto = remotos.get(fila.mondayId as string)
    // No debería faltar —leerAcuerdosDeMonday responde por cada id pedido,
    // exista allá o no— pero si faltara, no tocar la fila es lo seguro. Esto
    // incluye el caso "se rindió por un 429": esa llamada lanza en vez de
    // responder a medias (ver ErrorMonday en consultarMonday), así que aquí
    // nunca se ve un `remotos` incompleto por esa causa — un 429 tumba TODO
    // el refresco de esta pasada, no fila por fila, y sin `mondaySincronizadoEn`
    // bumpeado la próxima carga lo vuelve a intentar.
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
          mondaySincronizadoEn: ahora,
        })
        .where(eq(esquema.acuerdos.id, fila.id))
    } else if (resultado === 'desapareció') {
      // El acuerdo NO se borra ni cambia de estatus: lo que se acordó en una
      // reunión no lo deshace un borrado en otro sistema (ver la cabecera de
      // sincronizar.ts). Se deja de sincronizar —mondayId a null— y queda
      // constancia en la historia, con el mismo formato que usa cada cambio
      // de este archivo.
      //
      // `mondayUrl`/`mondayTipo` se limpian aquí también (corrección de la
      // revisión final de la ronda 7, punto 6): antes solo se limpiaba
      // `mondayId`, y la fila se quedaba enseñando "Ver en Monday ↗" a una
      // URL que ya no lleva a ningún sitio (ver TablaAcuerdos.tsx). El
      // aviso en pantalla —el que pide el diseño (§4)— se pinta a partir de
      // `mondayId === null && mondaySincronizadoEn !== null`: la MISMA
      // combinación que deja esta rama, y que un acuerdo que NUNCA se
      // sincronizó no puede tener (ver `AcuerdoConSala.mondayDesvinculado`
      // en src/db/consultas.ts).
      const historia = historiaConEntrada(fila.historia, {
        en: ahora.toISOString(),
        cambios: {
          mondayId: null,
          aviso: 'El elemento ya no existe en Monday: se dejó de sincronizar.',
        },
      })
      await conexion
        .update(esquema.acuerdos)
        .set({
          mondayId: null,
          mondayUrl: null,
          mondayTipo: null,
          historia,
          updatedAt: ahora,
          mondaySincronizadoEn: ahora,
        })
        .where(eq(esquema.acuerdos.id, fila.id))
    } else {
      // 'gana-local': nuestro dato es más nuevo que el de Monday, no hay
      // nada que RECONCILIAR — Monday se pone al día en el siguiente cambio
      // que pase por sincronizarCambio. Pero SÍ se acaba de comprobar contra
      // Monday ahora mismo, y es exactamente esa comprobación la que
      // alimenta la ventana de frescura de arriba: sin bumpear esto aquí, un
      // acuerdo estable —que nunca cambia en Monday— se volvería a consultar
      // en cada carga sin límite, que es el problema que esta corrección
      // existe para evitar.
      await conexion
        .update(esquema.acuerdos)
        .set({ mondaySincronizadoEn: ahora })
        .where(eq(esquema.acuerdos.id, fila.id))
    }
  }
}
