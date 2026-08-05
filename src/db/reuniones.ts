/**
 * Capa de escritura de Reunión (ronda 10, tarea 4): la junta como entidad
 * propia, separada de lo que se prepara para ella (spec §1). Con `hayDB()`
 * escribe a Postgres vía Drizzle; sin DB, usa el store en memoria de
 * `src/db/store-memoria.ts` — mismo patrón que `src/db/sesiones.ts`, del que
 * sale la mitad "cabecera de la junta" de este módulo.
 *
 * Lo que NO vive aquí: items, secciones, decisiones del motor, parseo de
 * cifras y tablas. Eso es el DOCUMENTO — sigue en `src/db/sesiones.ts` hasta
 * que la Tarea 5 lo saque a `src/db/documentos.ts`.
 *
 * `sesiones.ts` no pierde ninguna de las funciones que este módulo también
 * cubre (`crearSesion`, `marcarPresentada`…): siguen ahí, tal cual, porque
 * `crearSesionConEstructura` —que NO se muda hasta la Tarea 5— las sigue
 * llamando, y media docena de páginas en `src/app/**` siguen importándolas.
 * Este módulo es una implementación nueva e independiente contra el esquema
 * nuevo (`esquema.reuniones`), no un refactor de la vieja.
 */
import { and, asc, desc, eq, gte, lt } from 'drizzle-orm'
import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import * as memoria from './store-memoria'
import { salaEstaActiva } from './salas'
import { cargarTemas, slugsDeSalas } from './temas'
import type { Tema } from '@/temas'
import { diaCivil, horaBreve, instanteEnCDMX } from '@/lib/fecha'
import type { FilaReunionMemoria } from './store-memoria'

export type TipoReunion = 'semanal' | 'quincenal' | 'mensual'

/**
 * Dos estados, no cinco (spec §1): el viejo `estado_sesion` mezclaba la vida
 * de la junta (¿se dio?) con la del documento (¿está listo?). Esa segunda
 * mitad vive ahora en `EstadoDocumento` ('borrador' | 'listo', Tarea 5).
 */
export type EstadoReunion = 'agendada' | 'dada'

export interface ReunionResumen {
  id: string
  salaSlug: string
  salaNombre: string
  salaColor: string
  fecha: string // ISO
  titulo: string
  tipo: TipoReunion
  estado: EstadoReunion
  /**
   * `null` = nadie ha dicho que esta reunión no se dio. Con fecha, alguien lo
   * dijo explícitamente (se canceló, se pospuso) — manda sobre cualquier
   * deducción automática de "se dio" que haga el dominio (ver
   * src/dominio/reunion.ts, Tarea 6). Mismo campo, misma razón de ser que
   * `noDadaEn` en `sesiones` (ver el comentario de la columna en
   * src/db/esquema.ts).
   */
  noDadaEn: string | null // ISO, o null
  /** Dónde se da: sala física, link, "por definir". */
  lugar: string | null
  /** Si tiene un documento (deck) preparado — no dice si está LISTO, solo si existe. */
  tieneDocumento: boolean
  /** Si tiene una minuta guardada. */
  tieneMinuta: boolean
  /** Cuántos archivos (presentaciones antiguas, archivos de interés) cuelgan de esta reunión. */
  archivos: number
}

export interface DatosDeReunion {
  /**
   * De qué sala es. A diferencia de la vieja `DatosDeSesion`, NO es nulo: el
   * esquema nuevo (`esquema.reuniones.salaSlug`) es `NOT NULL` — ver spec §1
   * y la ficha de la Tarea 4. Una reunión sin sala (comité, arranque de
   * campaña) queda fuera de este modelo por ahora.
   */
  salaSlug: string
  fecha: Date
  titulo: string
  tipo: TipoReunion
  lugar?: string | null
  /** 'todos los squads' / squads específicos / tema puntual — texto libre. Por defecto, 'todos'. */
  alcance?: string
  participantes?: unknown[]
}

/**
 * Con qué nombre y color se etiqueta una reunión, dado el registro de temas
 * YA CARGADO — función pura, no vuelve a consultar la base por su cuenta.
 * Sin la rama "sin sala" de `identidadDe` (src/db/sesiones.ts): `salaSlug`
 * siempre está aquí.
 */
function identidadDeSala(salaSlug: string, registro: Record<string, Tema>): { nombre: string; color: string } {
  const tema = registro[salaSlug]
  // Defensivo: no debería pasar (la FK de esquema.reuniones.salaSlug exige
  // que la sala exista), pero un texto de más es más barato que reventar la
  // reunión entera. Mismo criterio que `temaDeSalaSeguro` en src/db/acuerdos.ts.
  return tema ? { nombre: tema.nombre, color: tema.primario } : { nombre: salaSlug, color: '#666666' }
}

interface FilaReunionComun {
  id: string
  salaSlug: string
  fecha: Date
  titulo: string
  tipo: TipoReunion
  estado: EstadoReunion
  noDadaEn: Date | null
  lugar: string | null
}

function resumenDeFilaReunion(
  fila: FilaReunionComun,
  registro: Record<string, Tema>,
  tieneDocumento: boolean,
  tieneMinuta: boolean,
  archivos: number,
): ReunionResumen {
  const identidad = identidadDeSala(fila.salaSlug, registro)
  return {
    id: fila.id,
    salaSlug: fila.salaSlug,
    salaNombre: identidad.nombre,
    salaColor: identidad.color,
    fecha: fila.fecha.toISOString(),
    titulo: fila.titulo,
    tipo: fila.tipo,
    estado: fila.estado,
    noDadaEn: fila.noDadaEn ? fila.noDadaEn.toISOString() : null,
    lugar: fila.lugar,
    tieneDocumento,
    tieneMinuta,
    archivos,
  }
}

// ---- Escritura ----

export async function crearReunion(datos: DatosDeReunion): Promise<{ id: string }> {
  if (!(await slugsDeSalas()).includes(datos.salaSlug)) {
    throw new Error(`Sala desconocida: "${datos.salaSlug}"`)
  }
  /**
   * UNA SALA EN FREEZE NO ADMITE REUNIONES NUEVAS (mismo rechazo que
   * `crearSesion`, src/db/sesiones.ts, tarea 12 ronda 7 — se conserva íntegro
   * en esta mudanza). A diferencia de `crearSesion`, no hay que preguntar
   * primero "¿es trabajo nuevo?": `DatosDeReunion` no tiene un parámetro de
   * estado — toda reunión nace `agendada` (ver más abajo) — así que el
   * freeze se comprueba siempre que hay sala, sin la rama que antes dejaba
   * pasar una `presentada` histórica.
   */
  if (!(await salaEstaActiva(datos.salaSlug))) {
    const registro = await cargarTemas()
    throw new Error(
      `${identidadDeSala(datos.salaSlug, registro).nombre} está pausada: reactívala antes de crear una reunión nueva.`,
    )
  }

  const id = crypto.randomUUID()
  const ahora = new Date()
  const comun = {
    id,
    salaSlug: datos.salaSlug,
    fecha: datos.fecha,
    titulo: datos.titulo,
    tipo: datos.tipo,
    // Una reunión nace agendada, nunca dada: agendar no es haber ocurrido
    // (spec §1). No hay parámetro de estado en `DatosDeReunion` porque no
    // hace falta: el caso de "registrar una junta que ya pasó" que antes
    // colaba `estado: 'presentada'` en `crearSesion` se resuelve marcándola
    // dada después, no fingiendo un nacimiento distinto.
    estado: 'agendada' as const,
    // Nace sin que nadie haya dicho que no se dio — ver la columna en
    // src/db/esquema.ts.
    noDadaEn: null,
    lugar: datos.lugar ?? null,
    alcance: datos.alcance ?? 'todos',
    participantes: datos.participantes ?? [],
  }

  if (hayDB()) {
    await db().insert(esquema.reuniones).values(comun)
  } else {
    memoria.insertarReunionMemoria({ ...comun, createdAt: ahora, updatedAt: ahora })
  }
  return { id }
}

export async function listarReuniones(): Promise<ReunionResumen[]> {
  const registro = await cargarTemas()

  if (!hayDB()) {
    // Sin DB no hay `documentos`/`minutas`/`archivos` ligados por `reunionId`
    // que este store modele todavía (la Tarea 5 le añade `documentos`): los
    // tres se quedan en su valor conservador, mismo criterio de honestidad
    // que `sesionesPublicasDelMes`/`acuerdosPendientesDeSubir` — no fingir un
    // dato que no se puede consultar de verdad.
    return memoria.listarReunionesMemoria().map((fila) => resumenDeFilaReunion(fila, registro, false, false, 0))
  }

  const conexion = db()
  const filas = await conexion.select().from(esquema.reuniones).orderBy(desc(esquema.reuniones.createdAt))

  // Tres consultas de "¿quién tiene qué" — no una por reunión: con una
  // docena de reuniones eso serían docenas de viajes a la base para una
  // casilla. Mismo patrón que `listarSesiones` con `conMinuta`.
  const conDocumento = new Set(
    (await conexion.select({ reunionId: esquema.documentos.reunionId }).from(esquema.documentos)).map(
      (d) => d.reunionId,
    ),
  )
  const conMinuta = new Set(
    (await conexion.select({ reunionId: esquema.minutas.reunionId }).from(esquema.minutas))
      .map((m) => m.reunionId)
      .filter((v): v is string => v != null),
  )
  const archivosPorReunion = new Map<string, number>()
  for (const fila of await conexion.select({ reunionId: esquema.archivos.reunionId }).from(esquema.archivos)) {
    if (!fila.reunionId) continue
    archivosPorReunion.set(fila.reunionId, (archivosPorReunion.get(fila.reunionId) ?? 0) + 1)
  }

  return filas.map((fila) =>
    resumenDeFilaReunion(
      fila,
      registro,
      conDocumento.has(fila.id),
      conMinuta.has(fila.id),
      archivosPorReunion.get(fila.id) ?? 0,
    ),
  )
}

export async function obtenerReunion(id: string): Promise<ReunionResumen | null> {
  const registro = await cargarTemas()

  if (!hayDB()) {
    const fila = memoria.obtenerReunionMemoria(id)
    if (!fila) return null
    return resumenDeFilaReunion(fila, registro, false, false, 0)
  }

  const conexion = db()
  const fila = (await conexion.select().from(esquema.reuniones).where(eq(esquema.reuniones.id, id)))[0]
  if (!fila) return null

  const [documento] = await conexion
    .select({ id: esquema.documentos.id })
    .from(esquema.documentos)
    .where(eq(esquema.documentos.reunionId, id))
  const [minuta] = await conexion
    .select({ id: esquema.minutas.id })
    .from(esquema.minutas)
    .where(eq(esquema.minutas.reunionId, id))
  const archivosDeReunion = await conexion
    .select({ id: esquema.archivos.id })
    .from(esquema.archivos)
    .where(eq(esquema.archivos.reunionId, id))

  return resumenDeFilaReunion(fila, registro, Boolean(documento), Boolean(minuta), archivosDeReunion.length)
}

/**
 * Cambia los datos de la reunión: cuándo, cómo se llama, qué tipo, quién va,
 * dónde, para quién es.
 *
 * `cambios.salaSlug`, si viene, se IGNORA — mismo criterio que `editarSesion`
 * (src/db/sesiones.ts), que nunca tocó `salaSlug`: de qué sala es una reunión
 * no es editable después de crearla. `Partial<DatosDeReunion>` lo admite en
 * el tipo porque `DatosDeReunion` lo tiene como campo obligatorio de
 * creación, no porque este método deba aplicarlo.
 */
export async function editarReunion(id: string, cambios: Partial<DatosDeReunion>): Promise<void> {
  const actual = await obtenerReunion(id)
  if (!actual) throw new Error(`Reunión no encontrada: "${id}"`)

  const titulo = cambios.titulo?.trim()
  if (titulo !== undefined && titulo.length === 0) {
    throw new Error('La reunión necesita un título.')
  }

  const ahora = new Date()
  const columnas: Record<string, unknown> = { updatedAt: ahora }
  if (cambios.fecha !== undefined) columnas.fecha = cambios.fecha
  if (titulo !== undefined) columnas.titulo = titulo
  if (cambios.tipo !== undefined) columnas.tipo = cambios.tipo
  if (cambios.alcance !== undefined) columnas.alcance = cambios.alcance
  if (cambios.participantes !== undefined) columnas.participantes = cambios.participantes
  if (cambios.lugar !== undefined) columnas.lugar = cambios.lugar?.trim() || null

  if (hayDB()) {
    await db().update(esquema.reuniones).set(columnas).where(eq(esquema.reuniones.id, id))
    return
  }
  memoria.actualizarDatosReunionMemoria(id, columnas as Partial<Pick<FilaReunionMemoria, 'fecha' | 'titulo' | 'tipo' | 'alcance' | 'participantes' | 'lugar'>>)
}

/**
 * "Esta reunión ya se dio."
 *
 * Idempotente hacia adelante: una reunión ya `dada` no revienta por volver a
 * pulsar, ni vuelve a preguntar por el freeze de su sala — mismo criterio que
 * `marcarPresentada` (src/db/sesiones.ts).
 */
export async function marcarDada(id: string): Promise<void> {
  const reunion = await obtenerReunion(id)
  if (!reunion) throw new Error(`Reunión no encontrada: "${id}"`)
  if (reunion.estado === 'dada') return

  // FREEZE DE LA SALA: confirmar que una reunión se dio es gestión, y una
  // sala en pausa no admite gestión — mismo guardián que `crearReunion`.
  if (!(await salaEstaActiva(reunion.salaSlug))) {
    throw new Error(`${reunion.salaNombre} está pausada: reactívala antes de confirmar esta reunión.`)
  }

  if (hayDB()) {
    await db()
      .update(esquema.reuniones)
      // noDadaEn: null — si alguien la había marcado "no se dio" y ahora
      // resulta que sí, lo explícito nuevo gana (ver el comentario de la
      // columna en src/db/esquema.ts).
      .set({ estado: 'dada', noDadaEn: null, updatedAt: new Date() })
      .where(eq(esquema.reuniones.id, id))
    return
  }
  memoria.actualizarEstadoReunionMemoria(id, 'dada')
}

/**
 * "Esta reunión no se dio." Se canceló, se pospuso — el freno de mano de
 * cualquier deducción automática de "se dio" (ver src/dominio/reunion.ts,
 * Tarea 6). No tiene sentido decir "no se dio" de algo que YA se confirmó
 * que sí (`dada`): eso es otra función que nadie pidió.
 */
export async function marcarNoDada(id: string): Promise<void> {
  const reunion = await obtenerReunion(id)
  if (!reunion) throw new Error(`Reunión no encontrada: "${id}"`)
  if (reunion.estado === 'dada') {
    throw new Error('Esta reunión ya se marcó como dada: no se puede decir que no se dio.')
  }
  // Mismo freeze que `marcarDada`: negar también es gestión.
  if (!(await salaEstaActiva(reunion.salaSlug))) {
    throw new Error(`${reunion.salaNombre} está pausada: reactívala antes de marcar esta reunión.`)
  }

  const ahora = new Date()
  if (hayDB()) {
    await db()
      .update(esquema.reuniones)
      .set({ noDadaEn: ahora, updatedAt: ahora })
      .where(eq(esquema.reuniones.id, id))
    return
  }
  memoria.actualizarNoDadaReunionMemoria(id, ahora)
}

/**
 * Deshace `marcarNoDada`. Sin guardián de estado ni de freeze — limpiar la
 * marca es seguro sin importar en qué estado esté hoy la reunión, e
 * idempotente si nunca se había puesto.
 */
export async function desmarcarNoDada(id: string): Promise<void> {
  if (hayDB()) {
    await db()
      .update(esquema.reuniones)
      .set({ noDadaEn: null, updatedAt: new Date() })
      .where(eq(esquema.reuniones.id, id))
    return
  }
  memoria.actualizarNoDadaReunionMemoria(id, null)
}

/**
 * Borra una reunión.
 *
 * Los acuerdos que nacieron en ella NO se borran: cuelgan de la SALA, no de
 * la reunión (spec §4) — sobreviven a todas las siguientes. Se suelta la
 * referencia (`reunionOrigenId: null`) antes de borrar, o la clave foránea lo
 * impediría — mismo criterio, íntegro, que `eliminarSesion` con
 * `sesionOrigenId` (src/db/sesiones.ts).
 *
 * RESUELTO EN LA TAREA 5 (herencia de la T4): si esta reunión tiene un
 * documento, `esquema.documentos.reunionId` es `NOT NULL` + `UNIQUE` — el
 * DELETE de más abajo revienta por violación de clave foránea a menos que el
 * documento (y los items que cuelgan de él) se borre antes. Este módulo no
 * puede importar `src/db/documentos.ts` sin invertir la dirección de
 * dependencia que fija el plan (documentos.ts → reuniones.ts, nunca al
 * revés), así que la solución es inyección: quien SÍ conoce los dos módulos
 * —el llamador, hoy `documentos.ts` mismo a través de
 * `eliminarDocumentoDeReunion`, mañana una Server Action— pasa aquí la
 * función que sabe borrar el documento. Sin `eliminarDocumento` (el caso de
 * hoy en `reuniones.test.ts`, y el de cualquier reunión que nunca llegó a
 * tener documento) el comportamiento es EXACTAMENTE el de antes.
 *
 * DEFENSIVO (hallazgo de la revisión de la T4, anotado en el plan de la ronda
 * 10): sin `eliminarDocumento`, una reunión que SÍ tiene documento no debe
 * fallar con una violación de clave foránea cruda del driver (23503) cuando
 * haya DB, ni dejar un documento huérfano en silencio cuando no la haya — las
 * dos son peores que decir claramente qué falta. Se comprueba con
 * `esquema.documentos`/`store-memoria` directamente (infraestructura
 * compartida, no el módulo `documentos.ts`): no es la dirección de
 * dependencia prohibida, es el mismo tipo de acceso que ya hace este archivo
 * a `esquema.acuerdos`/`esquema.minutas`.
 */
export async function eliminarReunion(
  id: string,
  eliminarDocumento?: (reunionId: string) => Promise<void>,
): Promise<void> {
  if (eliminarDocumento) {
    await eliminarDocumento(id)
  } else if (await tieneDocumento(id)) {
    throw new Error(
      `No se puede borrar la reunión "${id}": tiene un documento. Pasa "eliminarDocumentoDeReunion" ` +
        '(src/db/documentos.ts) como segundo argumento de eliminarReunion.',
    )
  }

  if (hayDB()) {
    const conexion = db()
    await conexion
      .update(esquema.acuerdos)
      .set({ reunionOrigenId: null })
      .where(eq(esquema.acuerdos.reunionOrigenId, id))
    await conexion.delete(esquema.minutas).where(eq(esquema.minutas.reunionId, id))
    await conexion.delete(esquema.participacion).where(eq(esquema.participacion.reunionId, id))
    await conexion.delete(esquema.reuniones).where(eq(esquema.reuniones.id, id))
    return
  }
  memoria.anularReunionOrigenDeAcuerdosMemoria(id)
  memoria.eliminarReunionMemoria(id)
}

/** Si `reunionId` tiene un documento — ver el comentario defensivo de `eliminarReunion`. */
async function tieneDocumento(reunionId: string): Promise<boolean> {
  if (hayDB()) {
    const [documento] = await db()
      .select({ id: esquema.documentos.id })
      .from(esquema.documentos)
      .where(eq(esquema.documentos.reunionId, reunionId))
    return Boolean(documento)
  }
  return memoria.obtenerDocumentoDeReunionMemoria(reunionId) != null
}

// ---- Agenda pública ----

export interface ReunionPublica {
  salaSlug: string
  salaNombre: string
  salaColor: string
  /** ISO, día civil de México. */
  fecha: string
  /** 'HH:MM' en hora de México. */
  hora: string
}

/**
 * El primer instante de un mes, anclado a CDMX. Mudado tal cual desde
 * `sesiones.ts` — es la instancia concreta de "las fechas se comparan por día
 * civil anclado a America/Mexico_City" que este módulo tiene que conservar.
 */
function inicioDeMes(anio: number, mes: number): Date {
  return instanteEnCDMX(`${anio}-${String(mes).padStart(2, '0')}-01`, '00:00')
}

/**
 * Las reuniones de un mes, para la agenda que se comparte fuera.
 *
 * Deja fuera las salas EN PAUSA —no tienen reuniones que anunciar—, igual que
 * `sesionesPublicasDelMes`. Lo que SÍ cambia respecto a esa función: no hay
 * filtro de estado tipo "sin las que están en borrador". `EstadoReunion` no
 * tiene un valor `'borrador'` — esa mitad de la vida vieja de la sesión ahora
 * es `EstadoDocumento` (Tarea 5), una pregunta aparte de "¿es una fecha
 * comprometida?". Toda reunión, `agendada` o `dada`, ya es una fecha
 * comprometida con la sala — nace así (ver `crearReunion`) — así que no hay
 * nada análogo a "trabajo en curso, no anunciar todavía" que filtrar aquí.
 */
export async function reunionesPublicasDelMes(anio: number, mes: number): Promise<ReunionPublica[]> {
  // Sin DB no hay `salas.activa` que consultar — mismo motivo que
  // `sesionesPublicasDelMes`: el store en memoria no modela esa columna, y
  // fingir que todas las salas están activas sería mentir.
  if (!hayDB()) return []

  const inicio = inicioDeMes(anio, mes)
  const finExclusivo = mes === 12 ? inicioDeMes(anio + 1, 1) : inicioDeMes(anio, mes + 1)

  const filas = await db()
    .select({
      salaSlug: esquema.reuniones.salaSlug,
      fecha: esquema.reuniones.fecha,
      salaNombre: esquema.salas.nombre,
      salaColor: esquema.salas.primario,
    })
    .from(esquema.reuniones)
    .innerJoin(esquema.salas, eq(esquema.reuniones.salaSlug, esquema.salas.slug))
    .where(
      and(
        eq(esquema.salas.activa, true),
        gte(esquema.reuniones.fecha, inicio),
        lt(esquema.reuniones.fecha, finExclusivo),
      ),
    )
    .orderBy(asc(esquema.reuniones.fecha))

  // GRUPO UPAX NO ES UNA UDN: NO SE ANUNCIA AQUÍ — misma exclusión, íntegra,
  // que `sesionesPublicasDelMes` (ver su comentario en src/db/sesiones.ts).
  // A diferencia de esa función, no hace falta filtrar `salaSlug !== null`
  // primero: `esquema.reuniones.salaSlug` es `NOT NULL`.
  const slugsReales = await slugsDeSalas()
  return filas
    .filter((fila) => slugsReales.includes(fila.salaSlug))
    .map((fila) => {
      const iso = fila.fecha.toISOString()
      return {
        salaSlug: fila.salaSlug,
        salaNombre: fila.salaNombre,
        salaColor: fila.salaColor,
        fecha: diaCivil(iso),
        hora: horaBreve(iso),
      }
    })
}
