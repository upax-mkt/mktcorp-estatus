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

const sesiones = new Map<string, FilaSesionMemoria>()
const items = new Map<string, FilaItemMemoria>()

/** Sólo para tests: vuelve el store a estado vacío. */
export function reiniciarStoreMemoria(): void {
  sesiones.clear()
  items.clear()
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
