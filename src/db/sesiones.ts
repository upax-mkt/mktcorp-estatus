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
import { esPermutacionValida } from './orden'
import { obtenerTema, slugsDeSalas } from '@/temas'
import type { DecisionSlide } from '@/decision/esquema'
import type { EntradaCruda } from '@/motor/inventario'
import { borradorTieneContenido, type BorradorSeccion } from '@/secciones/borrador'
import type { ResultadoMaquetacion } from '@/motor/maquetar'

export type TipoSesion = 'semanal' | 'mensual'
// Mismo conjunto que el enum de la base (ver src/db/esquema.ts): 'agendada'
// es la sesión que solo tiene fecha, antes de que nadie empiece a llenarla.
export type EstadoSesion = 'agendada' | 'borrador' | 'lista' | 'presentada' | 'minutada'

export interface CifraCruda {
  valor: string
  rotulo: string
  delta?: string
}

/** Lo que el equipo pegó/cargó para un item — capa "contenido cargado" del spec §4. */
export interface ContenidoItemCrudo {
  /**
   * La sección compuesta a mano en el editor. Es el camino PRINCIPAL: cuando
   * está, el maquetado la usa tal cual y no llama a la IA.
   */
  seccion?: BorradorSeccion
  /** Material crudo del camino asistido: se pega texto y se pide una propuesta. */
  texto?: string
  cifras?: CifraCruda[]
  /** Rejillas pegadas (una por bloque). Filas × columnas, ya separadas. */
  tablas?: string[][][]
  /** Rutas o URLs de imágenes que acompañan al item. */
  imagenes?: string[]
  nota?: string
}

/** Una entrada de la estructura de la sesión: qué sección es y cómo se llama. */
export interface DefinicionItem {
  /** Identidad estable de la sección; sobrevive a reordenarla. */
  tipo: string
  /** Nombre de respaldo en la lista, mientras la sección no tenga título propio. */
  titulo: string
  /** Pista de qué poner aquí. */
  pregunta: string
  /** Tipo de sección con el que nace. El equipo puede cambiarlo en el editor. */
  layout?: DecisionSlide['layout']
  /**
   * El `tipo` de la sección base a la que pertenece, si es una subsección.
   * Ausente = es una sección base (un bloque de la sesión).
   *
   * Se guarda el `tipo` del padre y no su id de fila por el mismo motivo que
   * la identidad de un item es su `tipo`: sobrevive a reordenar.
   */
  padre?: string
}

export interface ItemSesion {
  id: string
  orden: number
  tipo: string
  titulo: string
  pregunta: string
  contenido: ContenidoItemCrudo
  llenado: boolean
  /** `tipo` de la sección base que la contiene. Ausente = es una sección base. */
  padre?: string
  /** Una de las ocho secciones base: se puede editar y reordenar, no borrar. */
  esBase: boolean
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
  /** Cómo se llama la sesión. Vive en la estructura congelada; es editable. */
  titulo: string
  /** Quién va. Vacío mientras nadie lo haya dicho. */
  participantes: string[]
  /** Dónde se da: sala física, link, "por definir". */
  lugar: string | null
  totalItems: number
  itemsLlenados: number
}

export interface SesionCompleta extends SesionResumen {
  items: ItemSesion[]
}

/**
 * LAS SECCIONES BASE DE UN ESTATUS. Siempre estas ocho, en este orden.
 *
 * Son los bloques fijos de la reunión: lo que cambia de un mes a otro es qué
 * se cuenta DENTRO de cada uno, no cuáles son. Por eso el editor arranca con
 * las ocho y el trabajo real es añadirles subsecciones.
 *
 * Portada y Agenda llevan contenido propio. Las otras seis son divisores: dan
 * nombre al bloque y su contenido son sus subsecciones.
 */
export const ESTRUCTURA_POR_DEFECTO: DefinicionItem[] = [
  {
    tipo: 'portada',
    titulo: 'Portada',
    pregunta: 'De qué estatus se trata y qué periodo cubre.',
    layout: 'portada',
  },
  {
    tipo: 'agenda',
    titulo: 'Agenda',
    pregunta: 'Los bloques de la sesión. En el documento se vuelven un índice navegable.',
    layout: 'agenda',
  },
  {
    tipo: 'acuerdos-pendientes',
    titulo: 'Acuerdos y Pendientes',
    // Sección ÚNICA, no un bloque: lo que se repasa aquí es la tabla de
    // pendientes de la sesión pasada. Abrirle una subsección llamada
    // "Pendientes" era decir dos veces lo mismo.
    pregunta: 'La tabla de lo que quedó de la sesión pasada, con su semáforo.',
    layout: 'pendientes-semaforo',
  },
  {
    tipo: 'portafolio-ecosistema',
    titulo: 'Portafolio & Ecosistema',
    pregunta: 'Servicios, herramientas comerciales y materiales.',
    layout: 'divisor-seccion',
  },
  {
    tipo: 'performance-conversion',
    titulo: 'Performance & Conversión',
    pregunta: 'Sitio web, paid media, conversión.',
    layout: 'divisor-seccion',
  },
  {
    tipo: 'campanas-360',
    titulo: 'Campañas 360',
    pregunta: 'Campañas en curso y su resultado.',
    layout: 'divisor-seccion',
  },
  {
    tipo: 'revops',
    titulo: 'RevOps',
    pregunta: 'Datos, procesos y herramientas de ingresos.',
    layout: 'divisor-seccion',
  },
  {
    tipo: 'outbound-pipeline',
    titulo: 'Outbound & Pipeline',
    pregunta: 'Prospección, cumplimiento y pipeline.',
    layout: 'divisor-seccion',
  },
]

/** Los `tipo` de las ocho secciones base: no se pueden borrar del editor. */
export const TIPOS_BASE = new Set(ESTRUCTURA_POR_DEFECTO.map((d) => d.tipo))

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

/** Si un item tiene algo escrito. Lo usa también el hub, para el avance real. */
export function esLlenado(c: ContenidoItemCrudo | undefined | null): boolean {
  if (!c) return false
  // Una tabla o una imagen sola SÍ es un item llenado: la comparativa Mayo|Junio
  // del deck real es exactamente eso, una tabla sin una línea de texto al lado.
  return Boolean(
    borradorTieneContenido(c.seccion) ||
      (c.texto && c.texto.trim().length > 0) ||
      (c.cifras && c.cifras.length > 0) ||
      (c.tablas && c.tablas.length > 0) ||
      (c.imagenes && c.imagenes.length > 0),
  )
}

interface FilaSesionComun {
  id: string
  salaSlug: string
  fecha: Date
  tipo: TipoSesion
  alcance: string
  estado: EstadoSesion
  estructura: unknown
  participantes?: string[] | null
  lugar?: string | null
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
        // El título que escribió el equipo manda sobre el nombre de plantilla:
        // en la lista de secciones se quiere leer "Performance · Sitio web",
        // no "Sección 4".
        titulo: contenido.seccion?.titulo?.trim() || def.titulo,
        pregunta: def.pregunta,
        contenido,
        llenado: esLlenado(contenido),
        padre: def.padre,
        esBase: TIPOS_BASE.has(row.tipo),
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
    titulo: estructura.titulo || tituloPorDefecto(fila.tipo, fila.fecha),
    participantes: fila.participantes ?? [],
    lugar: fila.lugar ?? null,
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
    titulo: leerEstructura(fila.estructura).titulo || tituloPorDefecto(fila.tipo, fila.fecha),
    participantes: fila.participantes ?? [],
    lugar: fila.lugar ?? null,
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
export interface DatosDeSesion {
  salaSlug: string
  tipo: TipoSesion
  alcance: string
  /** Cuándo es. Por defecto, ahora — el flujo viejo de "Nueva sesión". */
  fecha?: Date
  /** Cómo se llama. Por defecto, "Estatus mensual · Julio de 2026". */
  titulo?: string
  participantes?: string[]
  lugar?: string | null
  /**
   * `agendada` es una fecha en el calendario que nadie ha empezado a llenar;
   * `borrador` es trabajo en curso. El hub los distingue.
   */
  estado?: Extract<EstadoSesion, 'agendada' | 'borrador'>
}

export async function crearSesion(datos: DatosDeSesion): Promise<{ id: string }> {
  if (!slugsDeSalas().includes(datos.salaSlug)) {
    throw new Error(`Sala desconocida: "${datos.salaSlug}"`)
  }
  const id = crypto.randomUUID()
  const ahora = new Date()
  const fecha = datos.fecha ?? ahora
  const estructura: EstructuraSesion = {
    titulo: datos.titulo?.trim() || tituloPorDefecto(datos.tipo, fecha),
    items: [],
  }
  const comun = {
    id,
    salaSlug: datos.salaSlug,
    fecha,
    tipo: datos.tipo,
    alcance: datos.alcance,
    estado: datos.estado ?? ('borrador' as const),
    estructura,
    participantes: datos.participantes ?? [],
    lugar: datos.lugar ?? null,
  }

  if (hayDB()) {
    await db().insert(esquema.sesiones).values(comun)
  } else {
    memoria.insertarSesionMemoria({ ...comun, createdAt: ahora, updatedAt: ahora })
  }
  return { id }
}

/**
 * Crea la sesión y la siembra con la estructura precargada por defecto (spec
 * §6): es lo que usa el flujo "Nueva sesión". Cada item nace con
 * `contenidoCrudo: {}` (sin llenar).
 */
export async function crearSesionConEstructura(datos: DatosDeSesion): Promise<{ id: string }> {
  const { id } = await crearSesion(datos)
  const ahora = new Date()
  const estructura: EstructuraSesion = {
    titulo: datos.titulo?.trim() || tituloPorDefecto(datos.tipo, datos.fecha ?? ahora),
    items: ESTRUCTURA_POR_DEFECTO,
  }

  const filasBase = ESTRUCTURA_POR_DEFECTO.map((d, i) => ({
    id: crypto.randomUUID(),
    sesionId: id,
    orden: i,
    tipo: d.tipo,
    // Nace solo con su tipo de sección elegido. El TÍTULO no se siembra: si
    // lo hiciera, la sección contaría como escrita y una sesión recién creada
    // diría "8/8 listas" sin que nadie haya tocado nada. El nombre de la
    // sección ("RevOps") actúa como título de respaldo al maquetar — ver
    // `aDecision` en src/secciones/borrador.ts.
    contenidoCrudo: { seccion: { layout: d.layout } } as ContenidoItemCrudo,
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
    await empezarAPrepararse(sesionId)
    return
  }
  await db()
    .update(esquema.items)
    .set({ contenidoCrudo, updatedAt: new Date() })
    .where(and(eq(esquema.items.id, itemId), eq(esquema.items.sesionId, sesionId)))
  await empezarAPrepararse(sesionId)
}

/**
 * Una sesión agendada deja de ser solo una fecha en cuanto alguien escribe
 * algo en ella.
 *
 * Va aquí y no en un botón porque nadie pulsa "empezar a preparar": se abre
 * la sesión y se escribe. Si el paso dependiera de acordarse, el hub seguiría
 * diciendo "agendada" con la mitad del estatus ya redactado.
 */
async function empezarAPrepararse(sesionId: string): Promise<void> {
  if (hayDB()) {
    await db()
      .update(esquema.sesiones)
      .set({ estado: 'borrador', updatedAt: new Date() })
      .where(and(eq(esquema.sesiones.id, sesionId), eq(esquema.sesiones.estado, 'agendada')))
    return
  }
  const fila = memoria.obtenerSesionMemoria(sesionId)
  if (fila?.estado === 'agendada') memoria.actualizarEstadoSesionMemoria(sesionId, 'borrador')
}


/**
 * Guarda la sección que el equipo compuso a mano, conservando el material
 * crudo del asistente (si lo hubiera) que vive en el mismo item.
 */
export async function guardarSeccion(
  sesionId: string,
  itemId: string,
  seccion: BorradorSeccion,
): Promise<void> {
  const sesion = await obtenerSesion(sesionId)
  const item = sesion?.items.find((i) => i.id === itemId)
  if (!item) throw new Error(`Sección no encontrada: "${itemId}"`)
  await guardarItemContenido(sesionId, itemId, { ...item.contenido, seccion })
}

/**
 * Añade una sección al final de la sesión.
 *
 * Toca DOS sitios porque la sesión los tiene separados a propósito: la
 * `estructura` dice qué secciones la componen (y sobrevive a reordenar), y la
 * tabla de items guarda el contenido de cada una. El `tipo` de la sección
 * nueva es un id propio: los nombres fijos ("portada") solo valen para las que
 * trae la plantilla, y dos secciones del mismo tipo se pisarían.
 */
export async function anadirSeccion(
  sesionId: string,
  layout: DecisionSlide['layout'],
  nombre: string,
  /** `tipo` de la sección base que la contiene. Sin esto, nace como base. */
  padre?: string,
): Promise<{ itemId: string }> {
  const sesion = await obtenerSesion(sesionId)
  if (!sesion) throw new Error(`Sesión no encontrada: "${sesionId}"`)

  const itemId = crypto.randomUUID()
  const definicion: DefinicionItem = {
    tipo: `seccion-${itemId}`,
    titulo: nombre,
    pregunta: '',
    layout,
    ...(padre ? { padre } : {}),
  }
  const ahora = new Date()
  const posicion = posicionDeInsercion(sesion.items, padre, layout)
  const desplazados = sesion.items.slice(posicion)

  const fila = {
    id: itemId,
    sesionId,
    orden: posicion,
    tipo: definicion.tipo,
    contenidoCrudo: { seccion: { layout } } as ContenidoItemCrudo,
    decisionMaquetacion: null as unknown,
  }

  if (hayDB()) {
    const conexion = db()
    const [filaSesion] = await conexion
      .select({ estructura: esquema.sesiones.estructura })
      .from(esquema.sesiones)
      .where(eq(esquema.sesiones.id, sesionId))
    const estructura = leerEstructura(filaSesion?.estructura)
    await conexion
      .update(esquema.sesiones)
      .set({ estructura: { ...estructura, items: [...estructura.items, definicion] }, updatedAt: ahora })
      .where(eq(esquema.sesiones.id, sesionId))
    await conexion.insert(esquema.items).values(fila)
    await Promise.all(
      desplazados.map((i, k) =>
        conexion.update(esquema.items).set({ orden: posicion + 1 + k, updatedAt: ahora }).where(eq(esquema.items.id, i.id)),
      ),
    )
  } else {
    const filaSesion = memoria.obtenerSesionMemoria(sesionId)
    const estructura = leerEstructura(filaSesion?.estructura)
    memoria.actualizarEstructuraSesionMemoria(sesionId, {
      ...estructura,
      items: [...estructura.items, definicion],
    })
    memoria.insertarItemsMemoria([{ ...fila, createdAt: ahora, updatedAt: ahora }])
    desplazados.forEach((i, k) => memoria.actualizarOrdenItemMemoria(i.id, posicion + 1 + k))
  }
  return { itemId }
}

/**
 * Dónde entra una sección nueva.
 *
 * - Una SUBSECCIÓN entra al final de las de su bloque, justo antes de la
 *   siguiente sección base. Así el documento se lee en el orden en que está
 *   escrito y nadie tiene que arrastrarla a su sitio.
 * - Una sección BASE entra al final, pero antes del cierre si lo hay: el
 *   cierre es el final por definición.
 */
function posicionDeInsercion(
  items: ItemSesion[],
  padre: string | undefined,
  layout: DecisionSlide['layout'],
): number {
  if (padre) {
    const inicio = items.findIndex((i) => i.tipo === padre)
    if (inicio < 0) return items.length
    // Justo antes del siguiente item que NO cuelgue de este padre.
    let fin = inicio + 1
    while (fin < items.length && items[fin].padre === padre) fin++
    return fin
  }
  const indiceCierre = items.findIndex((i) => i.contenido.seccion?.layout === 'cierre')
  return indiceCierre >= 0 && layout !== 'cierre' ? indiceCierre : items.length
}

/**
 * Borra una sección y renumera las que quedan.
 *
 * La renumeración importa: sin ella queda un hueco en el orden (0,1,3,4) que
 * el arrastre interpretaría como una permutación inválida y rechazaría.
 */
export async function eliminarSeccion(sesionId: string, itemId: string): Promise<void> {
  const sesion = await obtenerSesion(sesionId)
  if (!sesion) return
  const item = sesion.items.find((i) => i.id === itemId)
  if (!item) return
  // Las ocho secciones base son la estructura de la reunión: se editan y se
  // reordenan, no se borran. El editor tampoco ofrece el botón, pero una
  // Server Action es un endpoint y no se confía en que la pantalla lo tape.
  if (item.esBase) throw new Error(`"${item.titulo}" es una sección base: no se puede eliminar.`)

  // Una sección con subsecciones se lleva las suyas: dejarlas huérfanas las
  // haría desaparecer del editor sin desaparecer de la base.
  const aBorrar = new Set([itemId])
  for (const hijo of sesion.items) {
    if (hijo.padre === item.tipo) aBorrar.add(hijo.id)
  }
  const tiposBorrados = new Set(sesion.items.filter((i) => aBorrar.has(i.id)).map((i) => i.tipo))

  const quedan = sesion.items.filter((i) => !aBorrar.has(i.id))
  const ahora = new Date()

  if (hayDB()) {
    const conexion = db()
    const [filaSesion] = await conexion
      .select({ estructura: esquema.sesiones.estructura })
      .from(esquema.sesiones)
      .where(eq(esquema.sesiones.id, sesionId))
    const estructura = leerEstructura(filaSesion?.estructura)
    await conexion
      .update(esquema.sesiones)
      .set({
        estructura: { ...estructura, items: estructura.items.filter((d) => !tiposBorrados.has(d.tipo)) },
        updatedAt: ahora,
      })
      .where(eq(esquema.sesiones.id, sesionId))
    await Promise.all(
      [...aBorrar].map((borrarId) =>
        conexion
          .delete(esquema.items)
          .where(and(eq(esquema.items.id, borrarId), eq(esquema.items.sesionId, sesionId))),
      ),
    )
    await Promise.all(
      quedan.map((i, orden) =>
        conexion.update(esquema.items).set({ orden, updatedAt: ahora }).where(eq(esquema.items.id, i.id)),
      ),
    )
    return
  }

  const filaSesion = memoria.obtenerSesionMemoria(sesionId)
  const estructura = leerEstructura(filaSesion?.estructura)
  memoria.actualizarEstructuraSesionMemoria(sesionId, {
    ...estructura,
    items: estructura.items.filter((d) => !tiposBorrados.has(d.tipo)),
  })
  for (const borrarId of aBorrar) memoria.eliminarItemMemoria(borrarId)
  quedan.forEach((i, orden) => memoria.actualizarOrdenItemMemoria(i.id, orden))
}

/**
 * Deja los items de la sesión en el orden exacto de `idsEnOrden`.
 *
 * Es lo que persiste el arrastre: mover el tercer item al primer sitio no es
 * un intercambio con el vecino, así que se reasigna el orden completo (0..n-1).
 * Se rechaza en silencio cualquier lista que no sea una permutación exacta de
 * los items de esta sesión — llega del navegador, así que no se confía en ella.
 */
export async function reordenarItems(sesionId: string, idsEnOrden: string[]): Promise<void> {
  const sesion = await obtenerSesion(sesionId)
  if (!sesion) return

  // Lo que llega del editor son los BLOQUES en su orden nuevo, no todos los
  // items: las subsecciones no se arrastran sueltas, viajan con el suyo. Aquí
  // se reconstruye el orden completo poniendo cada bloque seguido de sus
  // hijas, en el orden que ya tenían.
  const bases = sesion.items.filter((i) => !i.padre).map((i) => i.id)
  if (!esPermutacionValida(bases, idsEnOrden)) return

  const porId = new Map(sesion.items.map((i) => [i.id, i]))
  const ordenCompleto = idsEnOrden.flatMap((idBase) => {
    const base = porId.get(idBase)!
    const hijas = sesion.items.filter((h) => h.padre === base.tipo).map((h) => h.id)
    return [idBase, ...hijas]
  })
  idsEnOrden = ordenCompleto

  if (hayDB()) {
    const conexion = db()
    const ahora = new Date()
    for (const [posicion, itemId] of idsEnOrden.entries()) {
      await conexion
        .update(esquema.items)
        .set({ orden: posicion, updatedAt: ahora })
        .where(and(eq(esquema.items.id, itemId), eq(esquema.items.sesionId, sesionId)))
    }
    return
  }

  idsEnOrden.forEach((itemId, posicion) => {
    memoria.actualizarOrdenItemMemoria(itemId, posicion)
  })
}

/**
 * Mueve una sección un puesto arriba o abajo, ENTRE SUS HERMANAS.
 *
 * Es lo que usan los botones ↑/↓, el camino accesible por teclado del que el
 * arrastre es solo un atajo. Una subsección se mueve dentro de su bloque; un
 * bloque se mueve entre bloques y se lleva sus subsecciones. Sin esta regla,
 * bajar una subsección la sacaría de su bloque y entraría en el siguiente sin
 * que nadie lo pidiera.
 */
export async function moverItem(
  sesionId: string,
  itemId: string,
  direccion: 'arriba' | 'abajo',
): Promise<void> {
  const sesion = await obtenerSesion(sesionId)
  if (!sesion) return
  const item = sesion.items.find((i) => i.id === itemId)
  if (!item) return

  const hermanas = sesion.items.filter((i) => i.padre === item.padre)
  const idx = hermanas.findIndex((i) => i.id === itemId)
  const destino = direccion === 'arriba' ? idx - 1 : idx + 1
  if (destino < 0 || destino >= hermanas.length) return

  const nuevasHermanas = [...hermanas]
  ;[nuevasHermanas[idx], nuevasHermanas[destino]] = [nuevasHermanas[destino], nuevasHermanas[idx]]

  // Se recalcula el orden COMPLETO a partir del árbol nuevo: es más simple de
  // razonar que intercambiar dos números y menos frágil ante huecos.
  const bases = sesion.items.filter((i) => !i.padre)
  const basesFinales = item.padre ? bases : nuevasHermanas
  const ordenCompleto = basesFinales.flatMap((base) => {
    const hijas = item.padre === base.tipo
      ? nuevasHermanas
      : sesion.items.filter((h) => h.padre === base.tipo)
    return [base.id, ...hijas.map((h) => h.id)]
  })

  await reasignarOrden(sesionId, ordenCompleto)
}

/** Deja los items en el orden 0..n-1 que dice la lista. */
async function reasignarOrden(sesionId: string, idsEnOrden: string[]): Promise<void> {
  if (idsEnOrden.length === 0) return
  if (hayDB()) {
    const conexion = db()
    const ahora = new Date()
    await Promise.all(
      idsEnOrden.map((itemId, posicion) =>
        conexion
          .update(esquema.items)
          .set({ orden: posicion, updatedAt: ahora })
          .where(and(eq(esquema.items.id, itemId), eq(esquema.items.sesionId, sesionId))),
      ),
    )
    return
  }
  idsEnOrden.forEach((itemId, posicion) => memoria.actualizarOrdenItemMemoria(itemId, posicion))
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
      seccion: i.contenido.seccion,
      texto: i.contenido.texto,
      cifras: i.contenido.cifras,
      tablas: i.contenido.tablas,
      imagenes: i.contenido.imagenes,
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

/**
 * Convierte una tabla pegada en la rejilla que espera el motor.
 *
 * Acepta las DOS formas en que llega una tabla en la vida real: pegada desde
 * Google Sheets o Excel (las celdas vienen separadas por tabulador) o escrita a
 * mano con barras. Es el caso que más pesa —en el deck de referencia la tabla
 * aparece tres veces— y obligar a reescribirla a mano era garantizar que nadie
 * la metiera.
 *
 * La primera línea es el encabezado. Las filas cortas se rellenan y las largas
 * se recortan al ancho del encabezado: una fila desalineada descuadraría la
 * tabla entera, y perder una celda de más es mejor que perder la rejilla.
 */
export function parsearTablaTexto(texto: string): string[][] {
  const filas = texto
    .split('\n')
    .filter((linea) => linea.trim().length > 0)
    .map((linea) =>
      // Tabulador primero: una celda pegada desde Sheets puede contener "|"
      // como parte de su texto, pero nunca un tabulador.
      (linea.includes('\t') ? linea.split('\t') : linea.split('|')).map((c) => c.trim()),
    )

  const [encabezado, ...resto] = filas
  if (!encabezado) return []

  const ancho = encabezado.length
  return [
    encabezado,
    ...resto.map((fila) => Array.from({ length: ancho }, (_, i) => fila[i] ?? '')),
  ]
}

export function formatearTablaTexto(tablas: string[][][] | undefined): string {
  if (!tablas || tablas.length === 0) return ''
  return tablas[0].map((fila) => fila.join(' | ')).join('\n')
}

/**
 * Borra una sesión con todo lo que cuelga de ella: sus items (contenido y
 * decisiones del motor) y su minuta.
 *
 * Los acuerdos publicados desde su minuta NO se borran: cuelgan de la sala, no
 * de la sesión (spec §4) — nacen aquí pero sobreviven a todas las siguientes.
 * Borrar la sesión que los originó no puede llevárselos por delante.
 */
/**
 * Cambia los datos de la reunión: cuándo, cómo se llama, quién va, dónde.
 *
 * El título vive dentro de la estructura congelada y no en su propia columna
 * porque es lo que ya guardaba; sacarlo obligaría a migrar las sesiones
 * existentes para no ganar nada. Se lee siempre por `leerEstructura`.
 */
export async function editarSesion(
  sesionId: string,
  cambios: {
    fecha?: Date
    titulo?: string
    tipo?: TipoSesion
    alcance?: string
    participantes?: string[]
    lugar?: string | null
  },
): Promise<void> {
  const actual = await obtenerSesion(sesionId)
  if (!actual) throw new Error(`Sesión no encontrada: "${sesionId}"`)

  const titulo = cambios.titulo?.trim()
  if (titulo !== undefined && titulo.length === 0) {
    throw new Error('La sesión necesita un título.')
  }

  const ahora = new Date()
  const columnas: Record<string, unknown> = { updatedAt: ahora }
  if (cambios.fecha !== undefined) columnas.fecha = cambios.fecha
  if (cambios.tipo !== undefined) columnas.tipo = cambios.tipo
  if (cambios.alcance !== undefined) columnas.alcance = cambios.alcance
  if (cambios.participantes !== undefined) {
    // Sin nombres vacíos ni repetidos: la lista se escribe a mano, separada
    // por comas, y "Ceci, , Pablo," es lo normal, no la excepción.
    columnas.participantes = [
      ...new Set(cambios.participantes.map((p) => p.trim()).filter((p) => p.length > 0)),
    ]
  }
  if (cambios.lugar !== undefined) columnas.lugar = cambios.lugar?.trim() || null

  if (hayDB()) {
    if (titulo !== undefined) {
      const fila = (
        await db()
          .select({ estructura: esquema.sesiones.estructura })
          .from(esquema.sesiones)
          .where(eq(esquema.sesiones.id, sesionId))
      )[0]
      columnas.estructura = { ...leerEstructura(fila?.estructura), titulo }
    }
    await db().update(esquema.sesiones).set(columnas).where(eq(esquema.sesiones.id, sesionId))
    return
  }

  const fila = memoria.obtenerSesionMemoria(sesionId)
  if (!fila) return
  if (titulo !== undefined) {
    memoria.actualizarEstructuraSesionMemoria(sesionId, {
      ...leerEstructura(fila.estructura),
      titulo,
    })
  }
  memoria.actualizarDatosSesionMemoria(sesionId, {
    ...(columnas.fecha ? { fecha: columnas.fecha as Date } : {}),
    ...(columnas.tipo ? { tipo: columnas.tipo as TipoSesion } : {}),
    ...(columnas.alcance !== undefined ? { alcance: columnas.alcance as string } : {}),
    ...(columnas.participantes ? { participantes: columnas.participantes as string[] } : {}),
    ...(cambios.lugar !== undefined ? { lugar: columnas.lugar as string | null } : {}),
  })
}

/**
 * "Esta sesión ya se dio."
 *
 * Es el eslabón que faltaba entre preparar y la sala. El ciclo del spec §4 es
 * `borrador → lista → presentada → minutada`, pero NADA movía a `presentada`:
 * una sesión maquetada se quedaba en `lista` para siempre, y como la sala
 * lista como presentaciones las que ya sucedieron, la sesión no aparecía
 * nunca en la sala de su UDN. Tampoco había de dónde nacer una minuta.
 *
 * No lo hace "Maquetar" —maquetar es preparar, y se maqueta días antes— ni el
 * modo Presentar, que solo proyecta a pantalla completa y puede ensayarse. Lo
 * dice una persona cuando la reunión terminó.
 *
 * Es idempotente hacia adelante: una sesión ya `minutada` no retrocede a
 * `presentada` por volver a pulsar.
 */
export async function marcarPresentada(sesionId: string): Promise<void> {
  const sesion = await obtenerSesion(sesionId)
  if (!sesion) throw new Error(`Sesión no encontrada: "${sesionId}"`)
  if (sesion.estado === 'presentada' || sesion.estado === 'minutada') return
  if (sesion.estado === 'borrador') {
    throw new Error('Una sesión en borrador no se ha presentado: primero hay que maquetarla.')
  }

  if (hayDB()) {
    await db()
      .update(esquema.sesiones)
      .set({ estado: 'presentada', updatedAt: new Date() })
      .where(eq(esquema.sesiones.id, sesionId))
    return
  }
  memoria.actualizarEstadoSesionMemoria(sesionId, 'presentada')
}

export async function eliminarSesion(sesionId: string): Promise<void> {
  if (hayDB()) {
    const conexion = db()
    // Los acuerdos referencian la sesión de origen: se suelta la referencia
    // antes de borrar, o la clave foránea lo impide.
    await conexion
      .update(esquema.acuerdos)
      .set({ sesionOrigenId: null })
      .where(eq(esquema.acuerdos.sesionOrigenId, sesionId))
    await conexion.delete(esquema.minutas).where(eq(esquema.minutas.sesionId, sesionId))
    await conexion.delete(esquema.items).where(eq(esquema.items.sesionId, sesionId))
    await conexion.delete(esquema.sesiones).where(eq(esquema.sesiones.id, sesionId))
    return
  }
  memoria.eliminarMinutaDeSesionMemoria(sesionId)
  memoria.eliminarSesionMemoria(sesionId)
}
