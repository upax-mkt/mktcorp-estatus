/**
 * Capa de acceso a datos que consume el shell (hub + vista de sala).
 *
 * Reimplementa las funciones de src/dominio/salas.ts, ahora async: si
 * hayDB() consultan Postgres vía Drizzle; si no, delegan al fallback de
 * datos de ejemplo — así producción sin DATABASE_URL sigue mostrando el
 * shell exactamente igual.
 *
 * Los derivados puros (acuerdosAbiertos, acuerdosVencidos, temperatura,
 * ordenarPorProximaReunion) no tocan la base de datos — operan sobre EstadoSala
 * ya resuelto, venga de donde venga — así que se re-exportan tal cual desde
 * dominio/salas.ts en vez de duplicar su lógica.
 */
import { desc, eq } from 'drizzle-orm'
import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import * as memoria from './store-memoria'
import { obtenerTema, slugsDeSalas } from '@/temas'
import * as fallback from '@/dominio/salas'
import { esLlenado, type ContenidoItemCrudo } from './sesiones'
import type {
  Acuerdo,
  AcuerdoEnRiesgo,
  EstadoSala,
  Minuta,
  Presentacion,
  PulsoDelMes,
} from '@/dominio/salas'

export type {
  Acuerdo,
  AcuerdoEnRiesgo,
  EstadoSala,
  EstatusAcuerdo,
  Minuta,
  Presentacion,
  PulsoDelMes,
  Temperatura,
} from '@/dominio/salas'

// Derivados puros: misma función, sin importar la fuente de los datos.
export {
  acuerdosAbiertos,
  acuerdosVencidos,
  temperatura,
  ordenarPorProximaReunion,
  estaCongelado,
} from '@/dominio/salas'

const MS_POR_DIA = 86_400_000

function diasEntre(desde: Date, hasta: Date): number {
  return Math.round((hasta.getTime() - desde.getTime()) / MS_POR_DIA)
}

function isoFecha(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * La tabla minutas no guarda un título propio: se deriva de la sesión que
 * la originó, igual que el título de una Presentacion. Si la estructura
 * congelada de la sesión trae un `titulo` explícito se usa; si no, se
 * construye a partir de tipo + fecha (mismo patrón que dominio/salas.ts).
 */
function tituloDeSesion(sesion: { tipo: 'semanal' | 'mensual'; fecha: Date; estructura: unknown }): string {
  const estructura = sesion.estructura as { titulo?: unknown } | null
  if (estructura && typeof estructura.titulo === 'string' && estructura.titulo.length > 0) {
    return estructura.titulo
  }
  const mes = sesion.fecha.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
  const mesCap = mes.charAt(0).toUpperCase() + mes.slice(1)
  return `Estatus ${sesion.tipo} · ${mesCap}`
}

interface FilaSesion {
  id: string
  fecha: Date
  tipo: 'semanal' | 'mensual'
  estado: 'agendada' | 'borrador' | 'lista' | 'presentada' | 'minutada'
  estructura: unknown
}

/**
 * Cuánto lleva escrito una sesión en preparación.
 *
 * Antes era una heurística por estado —35% si borrador, 90% si lista— porque
 * no se contaban los items. Se cuentan: una sesión con 3 de 14 secciones
 * escritas dice 21%, no 35%. Y es lo que hace visible el borrador
 * colaborativo: varias personas llenan secciones distintas y la barra sube.
 *
 * `lista` significa maquetada, así que va al 100 aunque queden secciones
 * vacías: alguien ya decidió que con eso se presenta.
 */
function avanceDeItems(estado: FilaSesion['estado'], llenados: number, total: number): number {
  if (estado === 'lista') return 100
  if (total === 0) return 0
  return Math.round((llenados / total) * 100)
}

/**
 * Una sesión "en preparación" es la que ya se está llenando. Una sesión
 * `agendada` todavía no: solo ocupa una fecha en el calendario, y aparece en
 * el hub como próxima sesión, no como trabajo en curso.
 */
function estaEnPreparacion(estado: FilaSesion['estado']): boolean {
  return estado === 'borrador' || estado === 'lista'
}

async function estadoDeSalaDB(slug: string): Promise<EstadoSala | undefined> {
  if (!slugsDeSalas().includes(slug)) return undefined
  const tema = obtenerTema(slug)
  const conexion = db()
  const ahora = new Date()

  const [salaRow, sesionesRows, acuerdosRows, minutasRows, itemsRows] = await Promise.all([
    conexion.select().from(esquema.salas).where(eq(esquema.salas.slug, slug)).then((r) => r[0]),
    conexion
      .select({
        id: esquema.sesiones.id,
        fecha: esquema.sesiones.fecha,
        tipo: esquema.sesiones.tipo,
        estado: esquema.sesiones.estado,
        estructura: esquema.sesiones.estructura,
      })
      .from(esquema.sesiones)
      .where(eq(esquema.sesiones.salaSlug, slug))
      .orderBy(desc(esquema.sesiones.fecha)),
    conexion.select().from(esquema.acuerdos).where(eq(esquema.acuerdos.salaSlug, slug)),
    conexion
      .select({
        id: esquema.minutas.id,
        enviadaA: esquema.minutas.enviadaA,
        sesionId: esquema.minutas.sesionId,
        textoFinal: esquema.minutas.textoFinal,
        fecha: esquema.sesiones.fecha,
        tipo: esquema.sesiones.tipo,
        estructura: esquema.sesiones.estructura,
      })
      .from(esquema.minutas)
      .innerJoin(esquema.sesiones, eq(esquema.minutas.sesionId, esquema.sesiones.id))
      .where(eq(esquema.sesiones.salaSlug, slug))
      .orderBy(desc(esquema.sesiones.fecha)),
    // El contenido de los items, para saber cuánto lleva escrito la sesión
    // que se está preparando. Con join, no una consulta por sesión: son diez
    // salas × N sesiones y el hub las pide todas a la vez.
    conexion
      .select({
        sesionId: esquema.items.sesionId,
        contenidoCrudo: esquema.items.contenidoCrudo,
      })
      .from(esquema.items)
      .innerJoin(esquema.sesiones, eq(esquema.items.sesionId, esquema.sesiones.id))
      .where(eq(esquema.sesiones.salaSlug, slug)),
  ])

  const sesiones = sesionesRows as FilaSesion[]

  const yaSucedidas = sesiones.filter((s) => s.estado === 'presentada' || s.estado === 'minutada')
  const futuras = sesiones
    .filter((s) => s.fecha.getTime() > ahora.getTime())
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
  const enPreparacionRows = sesiones.filter((s) => estaEnPreparacion(s.estado))
  // La que se está preparando: la más próxima, no la primera que devuelva la
  // base. Con dos abiertas a la vez, la que importa es la que toca antes.
  const enPreparacion = [...enPreparacionRows].sort(
    (a, b) => a.fecha.getTime() - b.fecha.getTime(),
  )[0]
  const itemsDeEsa = enPreparacion
    ? itemsRows.filter((i) => i.sesionId === enPreparacion.id)
    : []
  const total = itemsDeEsa.length
  const llenados = itemsDeEsa.filter((i) => esLlenado(i.contenidoCrudo as ContenidoItemCrudo)).length

  const ultima = yaSucedidas[0] // ya viene ordenada desc por fecha
  const proxima = futuras[0]

  const presentaciones: Presentacion[] = yaSucedidas.map((s) => ({
    fecha: isoFecha(s.fecha),
    titulo: tituloDeSesion(s),
    tipo: s.tipo,
    sesionId: s.id,
  }))

  const minutas: Minuta[] = minutasRows.map((m) => ({
    fecha: isoFecha(m.fecha),
    titulo: tituloDeSesion(m),
    enviadaA: Array.isArray(m.enviadaA) ? m.enviadaA.length : 0,
    sesionId: m.sesionId,
    texto: m.textoFinal ?? undefined,
  }))

  // 'cancelado' no existe en el tipo EstatusAcuerdo del shell (solo
  // abierto/cumplido/vencido) — un acuerdo cancelado deja de mostrarse,
  // igual que si nunca hubiera existido para efectos de la sala.
  // `salas.activa` puede faltar si la fila aún no existe (dev sin sembrar):
  // por defecto, activa — mismo criterio que `cadencia: salaRow?.cadencia ??
  // 'mensual'` un poco más abajo.
  const activa = salaRow?.activa ?? true

  const acuerdos: Acuerdo[] = acuerdosRows
    .filter((a) => a.estatus !== 'cancelado')
    .map((a) => ({
      id: a.id,
      que: a.que,
      responsable: a.responsable,
      squad: a.squad ?? undefined,
      fechaCompromiso: a.fechaCompromiso ? isoFecha(a.fechaCompromiso) : null,
      estatus: a.estatus as fallback.EstatusAcuerdo,
      destacado: a.destacado,
    }))
    /**
     * `vencido` se deriva de la fecha, no se lee de la base — ver
     * `estatusEfectivo`. Sin esto un compromiso de hace dos semanas seguía
     * contando como abierto.
     *
     * `estatusEfectivo` y no `estatusVigente` a secas (tarea 12): con la sala
     * en pausa el acuerdo se congela tal cual está guardado —no se pregunta
     * si ya pasó de fecha—, y es la MISMA función la que, en cuanto la sala
     * se reactiva, vuelve a aplicar `estatusVigente` sobre ese acuerdo sin
     * que nadie lo tenga que recalcular a mano.
     */
    .map((a) => ({ ...a, estatus: fallback.estatusEfectivo(a, activa, isoFecha(ahora)) }))

  return {
    slug,
    nombre: tema.nombre,
    color: tema.primario,
    diasDesdeUltima: ultima ? diasEntre(ultima.fecha, ahora) : null,
    ultimaSesion: ultima ? isoFecha(ultima.fecha) : null,
    proximaSesion: proxima ? isoFecha(proxima.fecha) : null,
    enPreparacion: enPreparacionRows.length > 0,
    avancePreparacion: enPreparacion ? avanceDeItems(enPreparacion.estado, llenados, total) : undefined,
    sesionEnPreparacionId: enPreparacion?.id,
    seccionesEscritas: enPreparacion ? llenados : undefined,
    seccionesTotales: enPreparacion ? total : undefined,
    acuerdos,
    presentaciones,
    minutas,
    cadencia: salaRow?.cadencia ?? 'mensual',
    activa,
    pausadaDesde: salaRow?.pausadaDesde ? isoFecha(salaRow.pausadaDesde) : null,
  }
}

async function estadoDeSalasDB(): Promise<EstadoSala[]> {
  const resueltos = await Promise.all(slugsDeSalas().map((slug) => estadoDeSalaDB(slug)))
  return resueltos.filter((s): s is EstadoSala => s != null)
}

/** Misma lógica que fallback.acuerdosEnRiesgo(), sobre EstadoSala ya resuelto. */
function construirRiesgo(salas: EstadoSala[]): AcuerdoEnRiesgo[] {
  const out: AcuerdoEnRiesgo[] = []
  for (const s of salas) {
    // Una sala en freeze no acumula riesgo, está congelada — misma regla que
    // fallback.acuerdosEnRiesgo().
    if (!s.activa) continue
    for (const a of s.acuerdos) {
      if (a.estatus === 'vencido' || (a.estatus === 'abierto' && a.fechaCompromiso == null)) {
        out.push({ ...a, salaSlug: s.slug, salaNombre: s.nombre, salaColor: s.color })
      }
    }
  }
  return out.sort((a, b) => (a.estatus === 'vencido' ? 0 : 1) - (b.estatus === 'vencido' ? 0 : 1))
}

/** Misma lógica que fallback.pulsoDelMes(), sobre EstadoSala ya resuelto. */
function construirPulso(salas: EstadoSala[]): PulsoDelMes {
  const sesionesUltimos30 = salas.filter((s) => s.diasDesdeUltima != null && s.diasDesdeUltima <= 30).length
  const abiertos = salas.reduce((n, s) => n + fallback.acuerdosAbiertos(s), 0)
  const vencidos = salas.reduce((n, s) => n + fallback.acuerdosVencidos(s), 0)
  return {
    salas: salas.length,
    sesionesUltimos30,
    acuerdosAbiertos: abiertos,
    acuerdosVencidos: vencidos,
    salaMasDesatendida: fallback.salaMasDesatendida(salas),
  }
}

// ---- Modo sin DB: todo sale del store en memoria ----
//
// El store arranca VACÍO y solo tiene lo que se haya creado en la app durante
// esta ejecución del proceso. Antes se sembraba con acuerdos de ejemplo para
// que la vista de sala tuviera algo sobre lo que operar en dev; eso significaba
// que la app enseñaba contenido que nadie había escrito. Una sala sin actividad
// se ve vacía, que es la verdad.

function acuerdoDeFilaMemoria(a: memoria.FilaAcuerdoMemoria): Acuerdo {
  return {
    id: a.id,
    que: a.que,
    responsable: a.responsable,
    squad: a.squad,
    fechaCompromiso: a.fechaCompromiso ? isoFecha(a.fechaCompromiso) : null,
    estatus: a.estatus as fallback.EstatusAcuerdo,
  }
}

/** Acuerdos vivos de una sala en modo memoria. 'cancelado' deja de mostrarse, igual que con DB. */
function acuerdosVivosMemoria(salaSlug: string): Acuerdo[] {
  return memoria
    .listarAcuerdosDeSalaMemoria(salaSlug)
    .filter((a) => a.estatus !== 'cancelado')
    .map(acuerdoDeFilaMemoria)
}

async function estadoDeSalasMemoria(): Promise<EstadoSala[]> {
  return fallback.estadoDeSalas().map((s) => ({ ...s, acuerdos: acuerdosVivosMemoria(s.slug) }))
}

async function estadoDeSalaMemoria(slug: string): Promise<EstadoSala | undefined> {
  const base = fallback.estadoDeSala(slug)
  if (!base) return base
  return { ...base, acuerdos: acuerdosVivosMemoria(slug) }
}

// ---- API pública — misma firma que dominio/salas.ts, ahora async ----

export async function estadoDeSalas(): Promise<EstadoSala[]> {
  if (!hayDB()) return estadoDeSalasMemoria()
  return estadoDeSalasDB()
}

export async function estadoDeSala(slug: string): Promise<EstadoSala | undefined> {
  if (!hayDB()) return estadoDeSalaMemoria(slug)
  return estadoDeSalaDB(slug)
}

export async function acuerdosEnRiesgo(): Promise<AcuerdoEnRiesgo[]> {
  if (!hayDB()) return construirRiesgo(await estadoDeSalasMemoria())
  return construirRiesgo(await estadoDeSalasDB())
}

export async function pulsoDelMes(): Promise<PulsoDelMes> {
  if (!hayDB()) return construirPulso(await estadoDeSalasMemoria())
  return construirPulso(await estadoDeSalasDB())
}

// ---- El espacio de acuerdos: las diez salas juntas (tarea 11, ronda 7) ----

/**
 * Un acuerdo con el contexto de su sala, para `/acuerdos`: "qué le debemos a
 * quién esta semana" sin entrar sala por sala.
 *
 * `mondayTipo` es opcional en el TIPO —no en el dato real, que `todosLosAcuerdos`
 * siempre entrega— para que un consumidor que no lo necesita no tenga que
 * inventarlo. Mismo criterio que `AcuerdoPendienteDeSubir.salaColor` en
 * src/db/acuerdos.ts.
 */
export interface AcuerdoConSala extends Acuerdo {
  salaSlug: string
  salaNombre: string
  salaColor: string
  /** Una sala en pausa congela sus acuerdos — ver TablaAcuerdos y la nota de abajo. */
  salaActiva: boolean
  destacado: boolean
  mondayUrl: string | null
  mondayTipo?: string | null
  /** 'no_aplica' | 'pendiente' | 'subido' | 'descartado' — ver src/monday/bandeja.ts. */
  bandeja: string
  /**
   * Se sincronizó con Monday alguna vez y el elemento YA NO EXISTE allá
   * (revisión final de la ronda 7, punto 6): el diseño pide un aviso en este
   * espacio cuando eso pasa (§4 — "se marca... con un aviso en el espacio de
   * acuerdos").
   *
   * Se deriva de `mondayId == null && mondaySincronizadoEn != null` — nunca
   * se guarda como columna aparte. Un acuerdo que NUNCA se subió tiene los
   * dos en null (`mondayDesvinculado` da falso); uno sincronizado que sigue
   * vivo en Monday tiene los dos con valor. Solo el que se subió y luego
   * `refrescarDesdeMonday` marcó como 'desapareció' queda con `mondayId =
   * null` pero `mondaySincronizadoEn` con la fecha de cuando SÍ se sincronizó
   * —esa combinación es la señal, y es la misma rama que limpia
   * `mondayUrl`/`mondayTipo` (ver 'desapareció' en refrescarDesdeMonday,
   * src/db/acuerdos.ts).
   */
  mondayDesvinculado: boolean
}

/**
 * El nombre y color de marca de una sala, sin reventar si algún día hay una
 * fila con un `salaSlug` que no está en `src/temas`. No debería pasar —la FK
 * de `acuerdos.salaSlug` exige que la sala exista, y `crearAcuerdo` ya valida
 * contra `slugsDeSalas()` al dar de alta— pero un texto de más en esta lista
 * es más barato que la pantalla entera sin cargar. Mismo criterio defensivo
 * que `temaDeSalaSeguro` en src/db/acuerdos.ts.
 */
function temaDeSalaSeguro(slug: string): { nombre: string; color: string } {
  try {
    const tema = obtenerTema(slug)
    return { nombre: tema.nombre, color: tema.primario }
  } catch {
    return { nombre: slug, color: '#666666' }
  }
}

/**
 * TODOS los acuerdos de las diez salas, cada uno con su sala encima.
 *
 * Sin DB no hay nada que mostrar (mismo criterio que `acuerdosPendientesDeSubir`
 * en src/db/acuerdos.ts): el store en memoria no modela `salas.activa` ni
 * `acuerdos.destacado`, así que faltaría la mitad del dato.
 *
 * El estatus se deriva con `estatusEfectivo` (tarea 12): con la sala activa
 * es `estatusVigente` tal cual; en pausa, el acuerdo se congela y se respeta
 * el estatus guardado sin preguntar si ya pasó de fecha.
 */
export async function todosLosAcuerdos(): Promise<AcuerdoConSala[]> {
  if (!hayDB()) return []

  const hoy = isoFecha(new Date())
  const filas = await db()
    .select({
      id: esquema.acuerdos.id,
      que: esquema.acuerdos.que,
      responsable: esquema.acuerdos.responsable,
      squad: esquema.acuerdos.squad,
      fechaCompromiso: esquema.acuerdos.fechaCompromiso,
      estatus: esquema.acuerdos.estatus,
      destacado: esquema.acuerdos.destacado,
      mondayUrl: esquema.acuerdos.mondayUrl,
      mondayTipo: esquema.acuerdos.mondayTipo,
      mondayId: esquema.acuerdos.mondayId,
      mondaySincronizadoEn: esquema.acuerdos.mondaySincronizadoEn,
      bandeja: esquema.acuerdos.bandeja,
      salaSlug: esquema.acuerdos.salaSlug,
      salaActiva: esquema.salas.activa,
    })
    .from(esquema.acuerdos)
    .innerJoin(esquema.salas, eq(esquema.acuerdos.salaSlug, esquema.salas.slug))

  return filas
    // 'cancelado' deja de mostrarse, igual que en la vista de sala (ver el
    // comentario de estadoDeSalaDB): un acuerdo cancelado es como si nunca
    // hubiera existido.
    .filter((f) => f.estatus !== 'cancelado')
    .map((f) => {
      const tema = temaDeSalaSeguro(f.salaSlug)
      const fechaCompromiso = f.fechaCompromiso ? isoFecha(f.fechaCompromiso) : null
      const estatusGuardado = f.estatus as fallback.EstatusAcuerdo
      const estatus = fallback.estatusEfectivo({ estatus: estatusGuardado, fechaCompromiso }, f.salaActiva, hoy)
      return {
        id: f.id,
        que: f.que,
        responsable: f.responsable,
        squad: f.squad ?? undefined,
        fechaCompromiso,
        estatus,
        salaSlug: f.salaSlug,
        salaNombre: tema.nombre,
        salaColor: tema.color,
        salaActiva: f.salaActiva,
        destacado: f.destacado,
        mondayUrl: f.mondayUrl,
        mondayTipo: f.mondayTipo,
        bandeja: f.bandeja,
        mondayDesvinculado: f.mondayId == null && f.mondaySincronizadoEn != null,
      }
    })
    // La fecha más próxima primero; sin fecha, al final — mismo criterio que
    // acuerdosPendientesDeSubir: es lo que más urge mirar primero.
    .sort((a, b) => (a.fechaCompromiso ?? '9999-99-99').localeCompare(b.fechaCompromiso ?? '9999-99-99'))
}
