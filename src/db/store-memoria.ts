/**
 * Store efímero en memoria del proceso servidor, usado por `src/db/sesiones.ts`
 * cuando `!hayDB()`: permite crear/llenar/maquetar una sesión en dev sin
 * DATABASE_URL. Un `Map` por tabla, con la misma forma de fila que
 * `src/db/esquema.ts` (menos los defaults de Postgres, que se ponen a mano).
 *
 * ADVERTENCIA — no persiste entre reinicios del servidor de dev (`npm run
 * dev`) ni entre invocaciones serverless en producción: vive solo mientras el
 * proceso Node sigue arriba. Suficiente para probar el flujo end-to-end en
 * dev; en producción real se necesita DATABASE_URL.
 */

export interface FilaSesionMemoria {
  id: string
  salaSlug: string
  fecha: Date
  tipo: 'semanal' | 'mensual'
  alcance: string
  estado: 'borrador' | 'lista' | 'presentada' | 'minutada'
  estructura: unknown
  createdAt: Date
  updatedAt: Date
}

export interface FilaItemMemoria {
  id: string
  sesionId: string
  orden: number
  tipo: string
  contenidoCrudo: unknown
  decisionMaquetacion: unknown | null
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
  /** Sesión donde nació el acuerdo. Nulo si se dio de alta fuera de una sesión. */
  sesionOrigenId: string | null
  historia: HistoriaAcuerdoMemoria[]
  createdAt: Date
  updatedAt: Date
}

export interface FilaMinutaMemoria {
  id: string
  sesionId: string
  transcripcion: string | null
  textoFinal: string | null
  enviadaA: string[] | null
  createdAt: Date
}

const sesiones = new Map<string, FilaSesionMemoria>()
const items = new Map<string, FilaItemMemoria>()
const acuerdos = new Map<string, FilaAcuerdoMemoria>()
const minutas = new Map<string, FilaMinutaMemoria>()
/** Salas cuyos acuerdos de ejemplo (src/datos-ejemplo.ts) ya se sembraron en `acuerdos`. */
const salasAcuerdosSembradas = new Set<string>()

/** Sólo para tests: vuelve el store a estado vacío. */
export function reiniciarStoreMemoria(): void {
  sesiones.clear()
  items.clear()
  acuerdos.clear()
  minutas.clear()
  salasAcuerdosSembradas.clear()
}

export function insertarSesionMemoria(fila: FilaSesionMemoria): void {
  sesiones.set(fila.id, fila)
}

export function actualizarEstructuraSesionMemoria(sesionId: string, estructura: unknown): void {
  const fila = sesiones.get(sesionId)
  if (!fila) return
  fila.estructura = estructura
  fila.updatedAt = new Date()
}

export function actualizarEstadoSesionMemoria(
  sesionId: string,
  estado: FilaSesionMemoria['estado'],
): void {
  const fila = sesiones.get(sesionId)
  if (!fila) return
  fila.estado = estado
  fila.updatedAt = new Date()
}

export function obtenerSesionMemoria(id: string): FilaSesionMemoria | undefined {
  return sesiones.get(id)
}

/** Más recientes primero — mismo orden que la consulta Drizzle equivalente. */
export function listarSesionesMemoria(): FilaSesionMemoria[] {
  return Array.from(sesiones.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export function insertarItemsMemoria(filas: FilaItemMemoria[]): void {
  for (const fila of filas) items.set(fila.id, fila)
}

export function obtenerItemsDeSesionMemoria(sesionId: string): FilaItemMemoria[] {
  return Array.from(items.values())
    .filter((i) => i.sesionId === sesionId)
    .sort((a, b) => a.orden - b.orden)
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

export function actualizarDecisionItemMemoria(itemId: string, decisionMaquetacion: unknown): void {
  const fila = items.get(itemId)
  if (!fila) return
  fila.decisionMaquetacion = decisionMaquetacion
  fila.updatedAt = new Date()
}

// ---- Acuerdos ----
// Cuelgan de la SALA (spec §4), no de la sesión. En modo memoria, la primera
// vez que se consulta una sala (ver src/db/consultas.ts) se siembra este store
// con sus acuerdos de ejemplo (src/datos-ejemplo.ts) para que mover un estatus
// o editar una fecha en dev, sin DATABASE_URL, tenga algo real sobre qué
// operar — exactamente una vez por sala (`salasAcuerdosSembradas`), para no
// pisar ediciones ya hechas en siembras posteriores.

export function acuerdosDeSalaYaSembrados(salaSlug: string): boolean {
  return salasAcuerdosSembradas.has(salaSlug)
}

export function sembrarAcuerdosDeSalaMemoria(salaSlug: string, filas: FilaAcuerdoMemoria[]): void {
  if (salasAcuerdosSembradas.has(salaSlug)) return
  salasAcuerdosSembradas.add(salaSlug)
  for (const fila of filas) acuerdos.set(fila.id, fila)
}

export function insertarAcuerdoMemoria(fila: FilaAcuerdoMemoria): void {
  acuerdos.set(fila.id, fila)
}

export function obtenerAcuerdoMemoria(id: string): FilaAcuerdoMemoria | undefined {
  return acuerdos.get(id)
}

export function listarAcuerdosDeSalaMemoria(salaSlug: string): FilaAcuerdoMemoria[] {
  return Array.from(acuerdos.values()).filter((a) => a.salaSlug === salaSlug)
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

// ---- Minutas ----

export function insertarMinutaMemoria(fila: FilaMinutaMemoria): void {
  minutas.set(fila.id, fila)
}

/** Una sesión tiene a lo más una minuta (ligada 1:1, spec §4). */
export function obtenerMinutaDeSesionMemoria(sesionId: string): FilaMinutaMemoria | undefined {
  return Array.from(minutas.values()).find((m) => m.sesionId === sesionId)
}

/** Espejo en memoria del borrado real de un acuerdo (ver src/db/acuerdos.ts). */
export function eliminarAcuerdoMemoria(id: string): void {
  acuerdos.delete(id)
}

/** Espejo en memoria del borrado de una minuta (ver src/db/minutas.ts). */
export function eliminarMinutaDeSesionMemoria(sesionId: string): void {
  for (const [id, fila] of minutas) {
    if (fila.sesionId === sesionId) minutas.delete(id)
  }
}

/** Espejo en memoria del borrado de una sesión con sus items (ver src/db/sesiones.ts). */
export function eliminarSesionMemoria(sesionId: string): void {
  sesiones.delete(sesionId)
  for (const [id, fila] of items) {
    if (fila.sesionId === sesionId) items.delete(id)
  }
}
