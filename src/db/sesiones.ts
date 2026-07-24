/**
 * Capa de escritura del flujo de preparación de sesión (spec §6). Con
 * `hayDB()` escribe a Postgres vía Drizzle; sin DB, usa el store en memoria
 * de `src/db/store-memoria.ts` — efímero (no sobrevive un reinicio del
 * proceso), pero suficiente para probar el flujo completo en dev sin
 * DATABASE_URL.
 *
 * Dos capas separadas por item, como pide el spec §4: `contenido` es lo que
 * escribió el equipo (nunca se modifica salvo que el propio equipo lo
 * edite); `resultado` es lo que resolvió el motor de maquetación — nulo
 * hasta que se maqueta la sesión.
 */
import { and, asc, desc, eq } from 'drizzle-orm'
import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import * as memoria from './store-memoria'
import { obtenerTema, slugsDeSalas } from '@/temas'
import type { EntradaCruda } from '@/motor/inventario'
import type { ResultadoMaquetacion } from '@/motor/maquetar'

export type TipoSesion = 'semanal' | 'mensual'
export type EstadoSesion = 'borrador' | 'lista' | 'presentada' | 'minutada'

export interface CifraCruda {
  valor: string
  rotulo: string
  delta?: string
}

/** Lo que el equipo pegó/cargó para un item — capa "contenido cargado" del spec §4. */
export interface ContenidoItemCrudo {
  texto?: string
  cifras?: CifraCruda[]
  nota?: string
}

/** Una entrada de la estructura precargada: qué item, con qué pregunta guía. */
export interface DefinicionItem {
  tipo: string
  titulo: string
  pregunta: string
}

export interface ItemSesion {
  id: string
  orden: number
  tipo: string
  titulo: string
  pregunta: string
  contenido: ContenidoItemCrudo
  llenado: boolean
  /** Lo que resolvió el motor (etapa 2) para este item. Nulo hasta maquetar. */
  resultado: ResultadoMaquetacion | null
}

export interface SesionResumen {
  id: string
  salaSlug: string
  salaNombre: string
  salaColor: string
  tipo: TipoSesion
  alcance: string
  estado: EstadoSesion
  fecha: string // ISO
  totalItems: number
  itemsLlenados: number
}

export interface SesionCompleta extends SesionResumen {
  items: ItemSesion[]
}

/**
 * Estructura precargada por defecto (spec §6, "Paso 1"): los items típicos
 * de un estatus mensual/semanal. `tipo` es el identificador estable que
 * sobrevive a un reordenamiento (el `orden` de cada item sí puede cambiar).
 */
export const ESTRUCTURA_POR_DEFECTO: DefinicionItem[] = [
  {
    tipo: 'portada',
    titulo: 'Portada',
    pregunta: 'Título del estatus y el periodo que cubre. Puedes agregar contexto breve (un subtítulo, el objetivo de la sesión).',
  },
  {
    tipo: 'performance-sitio',
    titulo: 'Performance del sitio web',
    pregunta: 'Pega las cifras de tráfico/SEO (una por línea: valor | rótulo | delta) y describe los hallazgos y acciones principales.',
  },
  {
    tipo: 'pipeline-demanda',
    titulo: 'Pipeline y demanda',
    pregunta: 'Pega las cifras de pipeline/demanda (una por línea: valor | rótulo | delta) y el análisis o narrativa asociada.',
  },
  {
    tipo: 'acuerdos-proximos-pasos',
    titulo: 'Acuerdos y próximos pasos',
    pregunta: 'Lista los acuerdos vigentes y los próximos pasos acordados, con responsable si aplica.',
  },
]

interface EstructuraSesion {
  titulo: string
  items: DefinicionItem[]
}

function leerEstructura(bruta: unknown): EstructuraSesion {
  const e = bruta as Partial<EstructuraSesion> | null | undefined
  return {
    titulo: typeof e?.titulo === 'string' ? e.titulo : '',
    items: Array.isArray(e?.items) ? (e.items as DefinicionItem[]) : [],
  }
}

function tituloPorDefecto(tipo: TipoSesion, fecha: Date): string {
  const mes = fecha.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
  const mesCap = mes.charAt(0).toUpperCase() + mes.slice(1)
  return `Estatus ${tipo} · ${mesCap}`
}

function esLlenado(c: ContenidoItemCrudo | undefined | null): boolean {
  if (!c) return false
  return Boolean((c.texto && c.texto.trim().length > 0) || (c.cifras && c.cifras.length > 0))
}

interface FilaSesionComun {
  id: string
  salaSlug: string
  fecha: Date
  tipo: TipoSesion
  alcance: string
  estado: EstadoSesion
  estructura: unknown
}

interface FilaItemComun {
  id: string
  orden: number
  tipo: string
  contenidoCrudo: unknown
  decisionMaquetacion: unknown
}

function sesionCompletaDeFilas(fila: FilaSesionComun, itemsRows: FilaItemComun[]): SesionCompleta {
  const tema = obtenerTema(fila.salaSlug)
  const estructura = leerEstructura(fila.estructura)
  // Por `tipo`, no por índice: el `orden` de un item cambia al reordenar,
  // pero su `tipo` (identidad de qué pregunta es) no.
  const defsPorTipo = new Map(estructura.items.map((d) => [d.tipo, d]))

  const items: ItemSesion[] = itemsRows
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .map((row) => {
      const def = defsPorTipo.get(row.tipo) ?? { tipo: row.tipo, titulo: row.tipo, pregunta: '' }
      const contenido = (row.contenidoCrudo ?? {}) as ContenidoItemCrudo
      return {
        id: row.id,
        orden: row.orden,
        tipo: row.tipo,
        titulo: def.titulo,
        pregunta: def.pregunta,
        contenido,
        llenado: esLlenado(contenido),
        resultado: (row.decisionMaquetacion as ResultadoMaquetacion | null) ?? null,
      }
    })

  return {
    id: fila.id,
    salaSlug: fila.salaSlug,
    salaNombre: tema.nombre,
    salaColor: tema.primario,
    tipo: fila.tipo,
    alcance: fila.alcance,
    estado: fila.estado,
    fecha: fila.fecha.toISOString(),
    totalItems: items.length,
    itemsLlenados: items.filter((i) => i.llenado).length,
    items,
  }
}

function resumenDeFila(fila: FilaSesionComun, contenidos: ContenidoItemCrudo[]): SesionResumen {
  const tema = obtenerTema(fila.salaSlug)
  return {
    id: fila.id,
    salaSlug: fila.salaSlug,
    salaNombre: tema.nombre,
    salaColor: tema.primario,
    tipo: fila.tipo,
    alcance: fila.alcance,
    estado: fila.estado,
    fecha: fila.fecha.toISOString(),
    totalItems: contenidos.length,
    itemsLlenados: contenidos.filter(esLlenado).length,
  }
}

// ---- Escritura ----

/**
 * Crea la fila de sesión, sin items. Nivel base — normalmente se usa
 * `crearSesionConEstructura`, que además siembra los items de la estructura
 * precargada; `crearSesion` queda disponible por si en el futuro se crea una
 * sesión a partir de una estructura elegida por el usuario (fase posterior).
 */
export async function crearSesion(datos: {
  salaSlug: string
  tipo: TipoSesion
  alcance: string
}): Promise<{ id: string }> {
  if (!slugsDeSalas().includes(datos.salaSlug)) {
    throw new Error(`Sala desconocida: "${datos.salaSlug}"`)
  }
  const id = crypto.randomUUID()
  const ahora = new Date()
  const estructura: EstructuraSesion = { titulo: tituloPorDefecto(datos.tipo, ahora), items: [] }

  if (hayDB()) {
    await db().insert(esquema.sesiones).values({
      id,
      salaSlug: datos.salaSlug,
      fecha: ahora,
      tipo: datos.tipo,
      alcance: datos.alcance,
      estado: 'borrador',
      estructura,
    })
  } else {
    memoria.insertarSesionMemoria({
      id,
      salaSlug: datos.salaSlug,
      fecha: ahora,
      tipo: datos.tipo,
      alcance: datos.alcance,
      estado: 'borrador',
      estructura,
      createdAt: ahora,
      updatedAt: ahora,
    })
  }
  return { id }
}

/**
 * Crea la sesión y la siembra con la estructura precargada por defecto (spec
 * §6): es lo que usa el flujo "Nueva sesión". Cada item nace con
 * `contenidoCrudo: {}` (sin llenar).
 */
export async function crearSesionConEstructura(datos: {
  salaSlug: string
  tipo: TipoSesion
  alcance: string
}): Promise<{ id: string }> {
  const { id } = await crearSesion(datos)
  const ahora = new Date()
  const estructura: EstructuraSesion = {
    titulo: tituloPorDefecto(datos.tipo, ahora),
    items: ESTRUCTURA_POR_DEFECTO,
  }

  const filasBase = ESTRUCTURA_POR_DEFECTO.map((d, i) => ({
    id: crypto.randomUUID(),
    sesionId: id,
    orden: i,
    tipo: d.tipo,
    contenidoCrudo: {} as ContenidoItemCrudo,
    decisionMaquetacion: null as unknown,
  }))

  if (hayDB()) {
    const conexion = db()
    await conexion
      .update(esquema.sesiones)
      .set({ estructura, updatedAt: ahora })
      .where(eq(esquema.sesiones.id, id))
    await conexion.insert(esquema.items).values(filasBase)
  } else {
    memoria.actualizarEstructuraSesionMemoria(id, estructura)
    memoria.insertarItemsMemoria(filasBase.map((f) => ({ ...f, createdAt: ahora, updatedAt: ahora })))
  }
  return { id }
}

export async function listarSesiones(): Promise<SesionResumen[]> {
  if (!hayDB()) {
    return memoria.listarSesionesMemoria().map((fila) => {
      const itemsRows = memoria.obtenerItemsDeSesionMemoria(fila.id)
      return resumenDeFila(fila, itemsRows.map((i) => i.contenidoCrudo as ContenidoItemCrudo))
    })
  }

  const conexion = db()
  const filas = await conexion.select().from(esquema.sesiones).orderBy(desc(esquema.sesiones.createdAt))
  const resultado: SesionResumen[] = []
  for (const fila of filas) {
    const itemsRows = await conexion
      .select({ contenidoCrudo: esquema.items.contenidoCrudo })
      .from(esquema.items)
      .where(eq(esquema.items.sesionId, fila.id))
    resultado.push(resumenDeFila(fila, itemsRows.map((i) => i.contenidoCrudo as ContenidoItemCrudo)))
  }
  return resultado
}

export async function obtenerSesion(id: string): Promise<SesionCompleta | null> {
  if (!hayDB()) {
    const fila = memoria.obtenerSesionMemoria(id)
    if (!fila) return null
    return sesionCompletaDeFilas(fila, memoria.obtenerItemsDeSesionMemoria(id))
  }

  const conexion = db()
  const fila = (await conexion.select().from(esquema.sesiones).where(eq(esquema.sesiones.id, id)))[0]
  if (!fila) return null
  const itemsRows = await conexion
    .select()
    .from(esquema.items)
    .where(eq(esquema.items.sesionId, id))
    .orderBy(asc(esquema.items.orden))
  return sesionCompletaDeFilas(fila, itemsRows)
}

/** Persiste lo que el equipo escribió para un item. Nunca toca `decisionMaquetacion`. */
export async function guardarItemContenido(
  sesionId: string,
  itemId: string,
  contenidoCrudo: ContenidoItemCrudo,
): Promise<void> {
  if (!hayDB()) {
    memoria.actualizarContenidoItemMemoria(itemId, contenidoCrudo)
    return
  }
  await db()
    .update(esquema.items)
    .set({ contenidoCrudo, updatedAt: new Date() })
    .where(and(eq(esquema.items.id, itemId), eq(esquema.items.sesionId, sesionId)))
}

/**
 * Reordena un item de la sesión intercambiando su `orden` con el del vecino
 * inmediato. V1 simple (sin drag&drop, ver spec §6) — suficiente para una
 * agenda de 4 items.
 */
export async function moverItem(
  sesionId: string,
  itemId: string,
  direccion: 'arriba' | 'abajo',
): Promise<void> {
  const sesion = await obtenerSesion(sesionId)
  if (!sesion) return
  const idx = sesion.items.findIndex((i) => i.id === itemId)
  if (idx === -1) return
  const destino = direccion === 'arriba' ? idx - 1 : idx + 1
  if (destino < 0 || destino >= sesion.items.length) return

  const a = sesion.items[idx]
  const b = sesion.items[destino]

  if (hayDB()) {
    const conexion = db()
    await conexion.update(esquema.items).set({ orden: b.orden, updatedAt: new Date() }).where(eq(esquema.items.id, a.id))
    await conexion.update(esquema.items).set({ orden: a.orden, updatedAt: new Date() }).where(eq(esquema.items.id, b.id))
  } else {
    memoria.actualizarOrdenItemMemoria(a.id, b.orden)
    memoria.actualizarOrdenItemMemoria(b.id, a.orden)
  }
}

/**
 * Convierte los items llenados de una sesión en `EntradaCruda[]` para el
 * motor (etapa 1). Mismo criterio de filtrado y mismo orden que
 * `guardarDecisiones` usa para reasociar sus resultados — llamar a ambas
 * en la misma acción, sin mutaciones intermedias entre una y otra.
 */
export function entradasCrudasDeSesion(sesion: SesionCompleta): EntradaCruda[] {
  return sesion.items
    .filter((i) => i.llenado)
    .map((i) => ({
      titulo: i.titulo,
      texto: i.contenido.texto,
      cifras: i.contenido.cifras,
      nota: i.contenido.nota,
    }))
}

/**
 * Guarda las decisiones del motor de maquetación (una por item llenado, en
 * el mismo orden que produjo `entradasCrudasDeSesion`) y marca la sesión
 * como `lista`.
 */
export async function guardarDecisiones(
  sesionId: string,
  resultados: ResultadoMaquetacion[],
): Promise<void> {
  const sesion = await obtenerSesion(sesionId)
  if (!sesion) throw new Error(`Sesión no encontrada: "${sesionId}"`)
  const llenados = sesion.items.filter((i) => i.llenado)
  if (llenados.length !== resultados.length) {
    throw new Error(
      `guardarDecisiones: ${resultados.length} resultado(s) no coincide con ${llenados.length} item(s) llenado(s)`,
    )
  }

  if (hayDB()) {
    const conexion = db()
    await Promise.all(
      llenados.map((item, i) =>
        conexion
          .update(esquema.items)
          .set({ decisionMaquetacion: resultados[i], updatedAt: new Date() })
          .where(eq(esquema.items.id, item.id)),
      ),
    )
    await conexion
      .update(esquema.sesiones)
      .set({ estado: 'lista', updatedAt: new Date() })
      .where(eq(esquema.sesiones.id, sesionId))
  } else {
    llenados.forEach((item, i) => memoria.actualizarDecisionItemMemoria(item.id, resultados[i]))
    memoria.actualizarEstadoSesionMemoria(sesionId, 'lista')
  }
}

// ---- Helpers de formato para el textarea de cifras ("valor | rótulo | delta") ----

export function parsearCifrasTexto(texto: string): CifraCruda[] {
  return texto
    .split('\n')
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0)
    .map((linea) => {
      const partes = linea.split('|').map((p) => p.trim())
      const delta = partes[2]
      return { valor: partes[0] ?? '', rotulo: partes[1] ?? '', delta: delta ? delta : undefined }
    })
    .filter((c) => c.valor.length > 0 && c.rotulo.length > 0)
}

export function formatearCifrasTexto(cifras: CifraCruda[] | undefined): string {
  if (!cifras || cifras.length === 0) return ''
  return cifras
    .map((c) => [c.valor, c.rotulo, c.delta].filter((v) => v !== undefined && v !== '').join(' | '))
    .join('\n')
}
