/**
 * Store efímero en memoria del proceso servidor, usado por `src/db/reuniones.ts`
 * y `src/db/documentos.ts` cuando `!hayDB()`: permite crear/llenar/maquetar una
 * reunión en dev sin DATABASE_URL. Un `Map` por tabla, con la misma forma de
 * fila que `src/db/esquema.ts` (menos los defaults de Postgres, que se ponen
 * a mano).
 *
 * ADVERTENCIA — no persiste entre reinicios del servidor de dev (`npm run
 * dev`) ni entre invocaciones serverless en producción: vive solo mientras el
 * proceso Node sigue arriba. Suficiente para probar el flujo end-to-end en
 * dev; en producción real se necesita DATABASE_URL.
 *
 * SIN `sesiones`/`FilaSesionMemoria` desde la ronda 10, tarea 5b: el modelo
 * viejo (`src/db/sesiones.ts`) desapareció y con él su doble en memoria. El
 * `Map` y sus funciones vivieron aquí hasta ese momento — ver el historial de
 * git si hace falta consultar la forma que tenían.
 */

export interface FilaItemMemoria {
  id: string
  /**
   * De qué documento es (ronda 10, tarea 5) — mismo campo que
   * `esquema.items.documentoId`. Siempre presente: desde que `sesiones.ts`
   * desapareció (tarea 5b), todo item nace por `documentos.ts`, que lo
   * escribe siempre. `esquema.items.documentoId` sigue siendo nullable en
   * Postgres (una fila vieja, de antes de esta ronda, puede no tenerlo — se
   * vuelve `NOT NULL` en la Tarea 8), pero el store en memoria nunca modela
   * esas filas históricas: arranca vacío en cada proceso.
   */
  documentoId: string
  orden: number
  tipo: string
  contenidoCrudo: unknown
  decisionMaquetacion: unknown | null
  createdAt: Date
  updatedAt: Date
}

/**
 * La junta como entidad propia (ronda 10, tarea 4). Misma forma de fila que
 * `esquema.reuniones` (src/db/esquema.ts), menos los defaults de Postgres,
 * que se ponen a mano.
 */
export interface FilaReunionMemoria {
  id: string
  /**
   * `null` para una reunión que no es de ninguna sala (Tarea 8b, 5-ago) —
   * mismo significado que `esquema.reuniones.salaSlug`/`DatosDeReunion.salaSlug`
   * (`src/db/reuniones.ts`). Ensanchado desde `string`: es el único cambio de
   * este archivo para esa tarea — necesario porque `crearReunion` (su único
   * escritor) pasa a insertar `salaSlug: string | null` en las dos capas
   * (Postgres y este store) y TypeScript no deja pasar un `null` donde este
   * campo exigía `string`.
   */
  salaSlug: string | null
  fecha: Date
  titulo: string
  tipo: 'semanal' | 'quincenal' | 'mensual'
  estado: 'agendada' | 'dada'
  /** Ver la columna homónima en src/db/esquema.ts. */
  noDadaEn: Date | null
  lugar: string | null
  alcance: string
  participantes: unknown[]
  createdAt: Date
  updatedAt: Date
}

/**
 * Lo que se prepara PARA una reunión (ronda 10, tarea 5) — separado de la
 * junta misma, que vive en `FilaReunionMemoria`. Mismo patrón y misma forma
 * que `esquema.documentos` (src/db/esquema.ts), menos los defaults de
 * Postgres, que se ponen a mano igual que en las demás filas de este store.
 */
export interface FilaDocumentoMemoria {
  id: string
  reunionId: string
  estado: 'borrador' | 'listo'
  estructura: unknown
  plantilla: string | null
  createdAt: Date
  updatedAt: Date
}

/** Una entrada de la historia de cambios de un acuerdo — ver src/db/acuerdos.ts. */
export interface HistoriaAcuerdoMemoria {
  en: string // ISO
  estatusAnterior?: string
  cambios?: unknown
}

export interface FilaAcuerdoMemoria {
  id: string
  salaSlug: string
  que: string
  responsable: string
  squad?: string
  prioridad?: string
  fechaCompromiso: Date | null
  estatus: 'abierto' | 'cumplido' | 'vencido' | 'cancelado'
  /**
   * Reunión donde nació el acuerdo (ronda 10, tarea 4). Nulo si se dio de
   * alta fuera de una reunión, o si la reunión que lo originó ya se borró
   * (ver `anularReunionOrigenDeAcuerdosMemoria`: la clave se anula, no
   * cascada).
   */
  reunionOrigenId: string | null
  /** El id de usuario de Monday del responsable, si es alguien de Mkt Corp — ver src/monday/bandeja.ts. */
  responsableMondayId: string | null
  /** 'no_aplica' | 'pendiente' | 'subido' | 'descartado' — ver src/monday/bandeja.ts. */
  bandeja: string
  historia: HistoriaAcuerdoMemoria[]
  createdAt: Date
  updatedAt: Date
}

export interface FilaMinutaMemoria {
  id: string
  /**
   * De qué reunión es. Se llamó `sesionId` hasta la ronda 10, tarea 5b: el
   * único llamador (`src/db/minutas.ts`) pasó a resolver todo por reunión en
   * cuanto `sesiones.ts` (y su fila en `esquema.sesiones`, de la que
   * `esquema.minutas.sesion_id` dependía con un FK `NOT NULL`) desaparecieron
   * — ver el comentario de cabecera de `minutas.ts`.
   */
  reunionId: string
  transcripcion: string | null
  textoFinal: string | null
  enviadaA: string[] | null
  createdAt: Date
}

export interface FilaArchivoMemoria {
  id: string
  salaSlug: string | null
  /** De qué reunión es, si es una imagen o vídeo incrustado en su documento. Se llamaba `sesionId`. */
  reunionId?: string | null
  categoria: 'presentacion' | 'interes' | 'imagen' | 'video'
  titulo: string
  fecha: Date | null
  ruta: string
  nombreOriginal: string
  tipoContenido: string | null
  tamanoBytes: number | null
  subidoPor: string | null
  createdAt: Date
  updatedAt: Date
}

const reuniones = new Map<string, FilaReunionMemoria>()
const documentos = new Map<string, FilaDocumentoMemoria>()
const items = new Map<string, FilaItemMemoria>()
const acuerdos = new Map<string, FilaAcuerdoMemoria>()
const minutas = new Map<string, FilaMinutaMemoria>()
const archivos = new Map<string, FilaArchivoMemoria>()
/** Sólo para tests: vuelve el store a estado vacío. */
export function reiniciarStoreMemoria(): void {
  reuniones.clear()
  documentos.clear()
  items.clear()
  acuerdos.clear()
  minutas.clear()
  archivos.clear()
}

// ---- Reuniones (ronda 10, tarea 4) ----
// La junta como entidad propia. Un Map, una función por operación.

export function insertarReunionMemoria(fila: FilaReunionMemoria): void {
  reuniones.set(fila.id, fila)
}

export function obtenerReunionMemoria(id: string): FilaReunionMemoria | undefined {
  return reuniones.get(id)
}

/** Más recientes primero — mismo orden que la consulta Drizzle equivalente. */
export function listarReunionesMemoria(): FilaReunionMemoria[] {
  return Array.from(reuniones.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

/** Espejo en memoria de `editarReunion` (ver src/db/reuniones.ts). */
export function actualizarDatosReunionMemoria(
  reunionId: string,
  cambios: Partial<Pick<FilaReunionMemoria, 'fecha' | 'titulo' | 'tipo' | 'alcance' | 'participantes' | 'lugar'>>,
): void {
  const fila = reuniones.get(reunionId)
  if (!fila) return
  reuniones.set(reunionId, { ...fila, ...cambios, updatedAt: new Date() })
}

/** Espejo en memoria de `marcarDada` (ver src/db/reuniones.ts). */
export function actualizarEstadoReunionMemoria(reunionId: string, estado: FilaReunionMemoria['estado']): void {
  const fila = reuniones.get(reunionId)
  if (!fila) return
  fila.estado = estado
  // Confirmar que la reunión se dio es más fuerte que una marca "no se dio"
  // puesta antes — mismo razonamiento que el camino de Postgres (`marcarDada`,
  // `guardarMinuta`, y el re-maquetado en src/db/documentos.ts).
  fila.noDadaEn = null
  fila.updatedAt = new Date()
}

/** Espejo en memoria de `marcarNoDada`/`desmarcarNoDada` (ver src/db/reuniones.ts). */
export function actualizarNoDadaReunionMemoria(reunionId: string, valor: Date | null): void {
  const fila = reuniones.get(reunionId)
  if (!fila) return
  fila.noDadaEn = valor
  fila.updatedAt = new Date()
}

/** Espejo en memoria del borrado de una reunión (ver src/db/reuniones.ts). */
export function eliminarReunionMemoria(reunionId: string): void {
  reuniones.delete(reunionId)
}

// ---- Documentos (ronda 10, tarea 5) ----
// Lo que se prepara PARA una reunión. Mismo patrón que `reuniones` arriba.

/**
 * Espejo en memoria de la restricción `documentos.reunion_id UNIQUE` (ver
 * src/db/esquema.ts): contra Postgres, un segundo INSERT para la misma
 * reunión revienta contra esa restricción sin que el código tenga que
 * preguntar antes — "la base lo impide, no el código". Sin DB real hay que
 * reproducir el mismo rechazo a mano, o el store dejaría crear dos documentos
 * para la misma reunión sin que nada se quejara.
 */
export function insertarDocumentoMemoria(fila: FilaDocumentoMemoria): void {
  const existente = Array.from(documentos.values()).find((d) => d.reunionId === fila.reunionId)
  if (existente) {
    throw new Error(
      `La reunión "${fila.reunionId}" ya tiene un documento ("${existente.id}"): una reunión tiene como mucho uno.`,
    )
  }
  documentos.set(fila.id, fila)
}

export function obtenerDocumentoMemoria(id: string): FilaDocumentoMemoria | undefined {
  return documentos.get(id)
}

/** Un documento cuelga de una reunión 1:1 — a lo más una fila por `reunionId`. */
export function obtenerDocumentoDeReunionMemoria(reunionId: string): FilaDocumentoMemoria | undefined {
  return Array.from(documentos.values()).find((d) => d.reunionId === reunionId)
}

export function actualizarEstructuraDocumentoMemoria(documentoId: string, estructura: unknown): void {
  const fila = documentos.get(documentoId)
  if (!fila) return
  fila.estructura = estructura
  fila.updatedAt = new Date()
}

/** Espejo en memoria de `marcarListo` (ver src/db/documentos.ts). */
export function actualizarEstadoDocumentoMemoria(documentoId: string, estado: FilaDocumentoMemoria['estado']): void {
  const fila = documentos.get(documentoId)
  if (!fila) return
  fila.estado = estado
  fila.updatedAt = new Date()
}

/** Espejo en memoria del borrado de un documento (ver `eliminarDocumentoDeReunion`, src/db/documentos.ts). */
export function eliminarDocumentoMemoria(documentoId: string): void {
  documentos.delete(documentoId)
}

export function insertarItemsMemoria(filas: FilaItemMemoria[]): void {
  for (const fila of filas) items.set(fila.id, fila)
}

export function obtenerItemsDeDocumentoMemoria(documentoId: string): FilaItemMemoria[] {
  return Array.from(items.values())
    .filter((i) => i.documentoId === documentoId)
    .sort((a, b) => a.orden - b.orden)
}

/** Espejo en memoria del borrado en cascada de los items de un documento (ver `eliminarDocumentoDeReunion`). */
export function eliminarItemsDeDocumentoMemoria(documentoId: string): void {
  for (const [id, fila] of items) {
    if (fila.documentoId === documentoId) items.delete(id)
  }
}

export function actualizarContenidoItemMemoria(itemId: string, contenidoCrudo: unknown): void {
  const fila = items.get(itemId)
  if (!fila) return
  fila.contenidoCrudo = contenidoCrudo
  fila.updatedAt = new Date()
}

export function actualizarOrdenItemMemoria(itemId: string, orden: number): void {
  const fila = items.get(itemId)
  if (!fila) return
  fila.orden = orden
  fila.updatedAt = new Date()
}

export function eliminarItemMemoria(itemId: string): void {
  items.delete(itemId)
}

export function actualizarDecisionItemMemoria(itemId: string, decisionMaquetacion: unknown): void {
  const fila = items.get(itemId)
  if (!fila) return
  fila.decisionMaquetacion = decisionMaquetacion
  fila.updatedAt = new Date()
}

// ---- Acuerdos ----
// Los acuerdos cuelgan de la SALA (spec §4), no de la sesión. El store arranca
// vacío: solo contiene lo que se haya creado en la app.

export function insertarAcuerdoMemoria(fila: FilaAcuerdoMemoria): void {
  acuerdos.set(fila.id, fila)
}

export function obtenerAcuerdoMemoria(id: string): FilaAcuerdoMemoria | undefined {
  return acuerdos.get(id)
}

export function actualizarAcuerdoMemoria(
  id: string,
  cambios: Partial<Omit<FilaAcuerdoMemoria, 'id' | 'salaSlug' | 'createdAt'>>,
): void {
  const fila = acuerdos.get(id)
  if (!fila) return
  Object.assign(fila, cambios)
  fila.updatedAt = new Date()
}

/**
 * Anula `reunionOrigenId` en todos los acuerdos que apuntaban a `reunionId`
 * — espejo en memoria de la parte de `eliminarReunion` (ver
 * src/db/reuniones.ts) que suelta la referencia ANTES de borrar la reunión:
 * un compromiso no desaparece porque se borre la junta que lo originó. Mismo
 * criterio que ya aplica Postgres sobre `acuerdos.reunion_origen_id` (columna
 * NULLABLE a propósito, ver src/db/esquema.ts) — la clave se anula, no
 * cascada.
 */
export function anularReunionOrigenDeAcuerdosMemoria(reunionId: string): void {
  for (const fila of acuerdos.values()) {
    if (fila.reunionOrigenId === reunionId) {
      fila.reunionOrigenId = null
      fila.updatedAt = new Date()
    }
  }
}

// ---- Minutas ----

export function insertarMinutaMemoria(fila: FilaMinutaMemoria): void {
  minutas.set(fila.id, fila)
}

/** Una reunión tiene a lo más una minuta (ligada 1:1, spec §4). */
export function obtenerMinutaDeReunionMemoria(reunionId: string): FilaMinutaMemoria | undefined {
  return Array.from(minutas.values()).find((m) => m.reunionId === reunionId)
}

/** Espejo en memoria del borrado real de un acuerdo (ver src/db/acuerdos.ts). */
export function eliminarAcuerdoMemoria(id: string): void {
  acuerdos.delete(id)
}

/** Espejo en memoria del borrado de una minuta (ver src/db/minutas.ts). */
export function eliminarMinutaDeReunionMemoria(reunionId: string): void {
  for (const [id, fila] of minutas) {
    if (fila.reunionId === reunionId) minutas.delete(id)
  }
}

// ---- Archivos de sala (ver src/db/archivos.ts) ----

export function insertarArchivoMemoria(fila: FilaArchivoMemoria): void {
  archivos.set(fila.id, fila)
}

export function obtenerArchivoMemoria(id: string): FilaArchivoMemoria | undefined {
  return archivos.get(id)
}

export function listarArchivosDeSalaMemoria(salaSlug: string): FilaArchivoMemoria[] {
  return [...archivos.values()].filter((a) => a.salaSlug === salaSlug)
}

export function actualizarArchivoMemoria(
  id: string,
  cambios: Partial<Pick<FilaArchivoMemoria, 'titulo' | 'fecha'>>,
): void {
  const fila = archivos.get(id)
  if (!fila) return
  archivos.set(id, { ...fila, ...cambios, updatedAt: new Date() })
}

export function eliminarArchivoMemoria(id: string): void {
  archivos.delete(id)
}
