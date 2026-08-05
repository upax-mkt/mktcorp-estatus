/**
 * Capa de escritura del Documento (ronda 10, tarea 5): lo que se prepara PARA
 * una reunión — el deck, sus secciones, decisiones del motor, parseo de
 * cifras y tablas —, separado de la junta misma (spec §1), que vive en
 * `src/db/reuniones.ts`. Con `hayDB()` escribe a Postgres vía Drizzle; sin
 * DB, usa el store en memoria de `src/db/store-memoria.ts` — mismo patrón que
 * `src/db/sesiones.ts` y `src/db/reuniones.ts`, de los que sale este módulo.
 *
 * DIRECCIÓN DE DEPENDENCIA: este módulo importa de `reuniones.ts` (para crear
 * la reunión de `crearReunionConDocumento` y para leer `salaSlug` al resolver
 * acuerdos retomados), nunca al revés — es lo que fija el plan de la ronda 10
 * para no crear un ciclo. `reuniones.ts` nunca importa de aquí; donde hace
 * falta coordinar en el otro sentido (borrar una reunión que tiene documento),
 * la solución es inyección de dependencia — ver `eliminarDocumentoDeReunion`
 * más abajo y el comentario de `eliminarReunion` en `reuniones.ts`.
 *
 * TAREA 5A: este módulo convive con `src/db/sesiones.ts`, que sigue existiendo
 * intacto y sigue siendo lo que usan las 20 páginas/componentes/tests de hoy.
 * Hay código duplicado entre los dos a propósito — la Tarea 5B borra
 * `sesiones.ts` y migra esos 20 imports; hasta entonces, los dos conviven.
 */
import { and, asc, eq, inArray } from 'drizzle-orm'
import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import * as memoria from './store-memoria'
import { esPermutacionValida } from './orden'
import { crearReunion, obtenerReunion, type DatosDeReunion, type TipoReunion } from './reuniones'
import type { EntradaCruda } from '@/motor/inventario'
import { borradorTieneContenido, type BorradorSeccion } from '@/secciones/borrador'
import { normalizarImagen, type DecisionSlide } from '@/decision/esquema'
import { estatusEfectivo, type Acuerdo, type EstatusAcuerdo } from '@/dominio/salas'
import {
  obtenerPlantilla, tiposFijosDe, type DefinicionItem,
} from '@/secciones/plantillas'
import type { ResultadoMaquetacion } from '@/motor/maquetar'
import { diaCivil, mesLargo } from '@/lib/fecha'

export type { DefinicionItem } from '@/secciones/plantillas'

/**
 * Dos estados, no cinco (spec §1): lo que antes era `estado_sesion` mezclaba
 * la vida de la junta (¿se dio?, ahora `EstadoReunion` en reuniones.ts) con la
 * del documento (¿está listo?). `EstadoDocumento` es solo la segunda mitad —
 * "listo" no dice nada de si la junta se dio, y "borrador" no dice nada de si
 * la junta ya pasó.
 */
export type EstadoDocumento = 'borrador' | 'listo'

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
  /**
   * IDs de acuerdos ABIERTOS de la sala retomados en este item (ronda 9,
   * tarea 6). Es una REFERENCIA, no una copia: aquí solo vive el id. Quien
   * quiera el texto, el responsable o el estatus lo lee resuelto en
   * `ItemDocumento.acuerdosRetomados` (ver `resolverAcuerdosRetomados` más
   * abajo) — nunca de este arreglo. Guardar el texto aquí habría sido
   * exactamente la duplicación que la tarea 6 evita: un acuerdo cerrado
   * desde la sala tiene que verse cerrado aquí también, sin que nadie
   * vuelva a tocar esta sección.
   */
  acuerdoIdsRetomados?: string[]
}

export interface ItemDocumento {
  id: string
  orden: number
  tipo: string
  titulo: string
  pregunta: string
  contenido: ContenidoItemCrudo
  llenado: boolean
  /** `tipo` de la sección base que la contiene. Ausente = es una sección base. */
  padre?: string
  /** Una de las secciones base de la plantilla del documento: se puede editar y reordenar, no borrar. */
  esBase: boolean
  /** Lo que resolvió el motor (etapa 2) para este item. Nulo hasta maquetar. */
  resultado: ResultadoMaquetacion | null
  /**
   * Los acuerdos de `contenido.acuerdoIdsRetomados`, YA RESUELTOS contra la
   * tabla `acuerdos` — con su `que`, `responsable` y estatus EFECTIVO de
   * AHORA, no de cuando se retomaron (ronda 9, tarea 6). Vacío sin DB, sin
   * ids que resolver, o si algún id ya no existe (el acuerdo se borró).
   */
  acuerdosRetomados: Acuerdo[]
}

/**
 * El documento completo: su cabecera y todos sus items.
 *
 * A propósito NO lleva nada de la reunión (título, fecha, sala, participantes):
 * eso vive en `ReunionResumen` (reuniones.ts). Quien necesite las dos cosas
 * las pide por separado — es la separación que persigue toda la ronda 10.
 */
export interface DocumentoCompleto {
  id: string
  reunionId: string
  estado: EstadoDocumento
  items: ItemDocumento[]
  /** Con qué plantilla nació. Decide qué secciones no se pueden borrar. Nulo si nunca se le asignó una. */
  plantilla: string | null
}

/**
 * Lo que vive en `documentos.estructura` (jsonb): solo las DEFINICIONES de
 * sección (tipo, título de respaldo, pregunta, layout, padre). A diferencia
 * de la vieja `EstructuraSesion` (`sesiones.ts`), NO lleva un `titulo`: el
 * título ahora es de la REUNIÓN (`reuniones.titulo`, columna propia y
 * obligatoria) y guardarlo aquí también habría sido la misma clase de
 * duplicación que esta ronda existe para eliminar.
 */
interface EstructuraDocumento {
  items: DefinicionItem[]
}

function leerEstructura(bruto: unknown): EstructuraDocumento {
  const e = bruto as Partial<EstructuraDocumento> | null | undefined
  return {
    items: Array.isArray(e?.items) ? (e.items as DefinicionItem[]) : [],
  }
}

/**
 * El título por defecto de una reunión que no trae uno propio: "Estatus
 * {tipo} · {Mes} de {año}". Mudado de `tituloPorDefecto` (`sesiones.ts:186`,
 * tal cual el nombre) — lo usa `crearReunionConDocumento` cuando
 * `datos.titulo` llega vacío, igual que `crearSesionConEstructura` lo usaba
 * para su `estructura.titulo`.
 *
 * ARREGLADO AL MUDAR (bug preexistente, ver progress.md de la ronda 10): la
 * versión vieja llamaba `fecha.toLocaleDateString('es-MX', {...})` SIN fijar
 * `timeZone`, así que usaba la zona del PROCESO — en Vercel, UTC — y no la de
 * la operación. Una junta creada un día 31 a las 19:00 CDMX es la 01:00 UTC
 * del día 1: sin anclar, el título saltaba al mes siguiente. Aquí se deriva
 * el año/mes CIVIL con `diaCivil` (src/lib/fecha.ts, la fuente única de
 * "fechas ancladas a America/Mexico_City") y se formatea con `mesLargo`, que
 * también ancla — el mismo constraint global que ya cumple el resto de la
 * app, nunca un `timeZone` repetido a mano aquí.
 */
function tituloPorDefecto(tipo: TipoReunion, fecha: Date): string {
  const [anioCivil, mesCivil] = diaCivil(fecha.toISOString()).split('-').map(Number)
  // mesLargo espera el mes 0-indexado (como Date.getMonth()); diaCivil da
  // "YYYY-MM" con el mes en 1-12 ("como se dice en voz alta").
  return `Estatus ${tipo} · ${mesLargo(anioCivil, mesCivil - 1)}`
}

/** Si un item tiene algo escrito. Lo usa también el hub, para el avance real. Mudado tal cual de `sesiones.ts`. */
export function esLlenado(c: ContenidoItemCrudo | undefined | null): boolean {
  if (!c) return false
  // Una tabla o una imagen sola SÍ es un item llenado: la comparativa Mayo|Junio
  // del deck real es exactamente eso, una tabla sin una línea de texto al lado.
  return Boolean(
    borradorTieneContenido(c.seccion) ||
      (c.texto && c.texto.trim().length > 0) ||
      (c.cifras && c.cifras.length > 0) ||
      (c.tablas && c.tablas.length > 0) ||
      (c.imagenes && c.imagenes.length > 0) ||
      // Arrastrar acuerdos y no escribir nada más sigue siendo trabajo real
      // (ronda 9, tarea 6): sin esto, un documento con tres acuerdos retomados
      // y ni una palabra tecleada se contaba como "0 secciones llenas" y
      // `entradasCrudasDeDocumento` lo dejaba fuera de "Maquetar" — el acuerdo
      // desaparecía del documento sin que nadie lo borrara.
      (c.acuerdoIdsRetomados && c.acuerdoIdsRetomados.length > 0),
  )
}

/**
 * `contenidoCrudo`/`decisionMaquetacion` son `jsonb` sin validar al leer —
 * `unknown` casteado a ciegas, arriba y abajo. Una fila guardada ANTES de la
 * ronda 9 (tarea 7) sigue trayendo `imagen` como una URL suelta, no como el
 * objeto que el código de hoy espera. Se normaliza AQUÍ, en el único lugar
 * por el que pasa TODO lo que sale de la base o de la memoria, para que ni el
 * editor ni el documento tengan que saber que la forma vieja existió. Mudado
 * tal cual de `sesiones.ts` — el caso real que lo disparó sigue en la base.
 */
function contenidoConImagenNormalizada(contenido: ContenidoItemCrudo): ContenidoItemCrudo {
  if (!contenido.seccion) return contenido
  return { ...contenido, seccion: { ...contenido.seccion, imagen: normalizarImagen(contenido.seccion.imagen) } }
}

function resultadoConImagenNormalizada(resultado: ResultadoMaquetacion | null): ResultadoMaquetacion | null {
  if (!resultado?.decision) return resultado
  return { ...resultado, decision: { ...resultado.decision, imagen: normalizarImagen(resultado.decision.imagen) } }
}

interface FilaDocumentoComun {
  id: string
  reunionId: string
  estado: EstadoDocumento
  estructura: unknown
  plantilla: string | null
}

interface FilaItemComun {
  id: string
  orden: number
  tipo: string
  contenidoCrudo: unknown
  decisionMaquetacion: unknown
}

function documentoCompletoDeFilas(
  fila: FilaDocumentoComun,
  itemsRows: FilaItemComun[],
  /** Resuelve `contenido.acuerdoIdsRetomados` → `Acuerdo`. Vacío sin DB. */
  acuerdosPorId: Map<string, Acuerdo>,
): DocumentoCompleto {
  const fijos = tiposFijosDe(fila.plantilla)
  const estructura = leerEstructura(fila.estructura)
  // Por `tipo`, no por índice: el `orden` de un item cambia al reordenar,
  // pero su `tipo` (identidad de qué pregunta es) no.
  const defsPorTipo = new Map(estructura.items.map((d) => [d.tipo, d]))

  const items: ItemDocumento[] = itemsRows
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .map((row) => {
      const def = defsPorTipo.get(row.tipo) ?? { tipo: row.tipo, titulo: row.tipo, pregunta: '' }
      const contenido = contenidoConImagenNormalizada((row.contenidoCrudo ?? {}) as ContenidoItemCrudo)
      // Un id sin fila en el mapa (el acuerdo se borró desde entonces) se
      // descarta en silencio: más barato que reventar el documento por una
      // referencia huérfana. Ver el comentario de `acuerdosRetomados` en
      // `ItemDocumento`.
      const acuerdosRetomados = (contenido.acuerdoIdsRetomados ?? [])
        .map((idAcuerdo) => acuerdosPorId.get(idAcuerdo))
        .filter((a): a is Acuerdo => a != null)
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
        esBase: fijos.has(row.tipo),
        resultado: resultadoConImagenNormalizada((row.decisionMaquetacion as ResultadoMaquetacion | null) ?? null),
        acuerdosRetomados,
      }
    })

  return {
    id: fila.id,
    reunionId: fila.reunionId,
    estado: fila.estado,
    plantilla: fila.plantilla ?? null,
    items,
  }
}

/**
 * Los acuerdos de `ids`, con su estatus EFECTIVO (freeze de sala incluido) —
 * resueltos AHORA, no guardados de cuando se retomaron. Es lo que garantiza
 * que "si alguien lo cierra desde la sala, se cierra el mismo" en el editor y
 * en el documento: no hay una copia de su estatus en ningún sitio, solo el
 * id, y esto vuelve a preguntarle a `acuerdos` cada vez. Mudado tal cual de
 * `sesiones.ts`.
 *
 * Todos los ids retomados en un documento son de la sala de SU reunión —
 * `acuerdosArrastrablesDe` (src/db/consultas.ts) solo ofrece los de esa
 * sala— así que una sola sala basta para resolver el freeze de todos.
 */
async function resolverAcuerdosRetomados(ids: string[], salaSlug: string | null): Promise<Map<string, Acuerdo>> {
  const mapa = new Map<string, Acuerdo>()
  if (ids.length === 0 || !salaSlug || !hayDB()) return mapa

  const hoy = new Date().toISOString().slice(0, 10)
  const filas = await db()
    .select({
      id: esquema.acuerdos.id,
      que: esquema.acuerdos.que,
      responsable: esquema.acuerdos.responsable,
      squad: esquema.acuerdos.squad,
      fechaCompromiso: esquema.acuerdos.fechaCompromiso,
      estatus: esquema.acuerdos.estatus,
      destacado: esquema.acuerdos.destacado,
      salaActiva: esquema.salas.activa,
    })
    .from(esquema.acuerdos)
    .innerJoin(esquema.salas, eq(esquema.acuerdos.salaSlug, esquema.salas.slug))
    .where(inArray(esquema.acuerdos.id, ids))

  for (const f of filas) {
    const fechaCompromiso = f.fechaCompromiso ? f.fechaCompromiso.toISOString().slice(0, 10) : null
    mapa.set(f.id, {
      id: f.id,
      que: f.que,
      responsable: f.responsable,
      squad: f.squad ?? undefined,
      fechaCompromiso,
      estatus: estatusEfectivo({ estatus: f.estatus as EstatusAcuerdo, fechaCompromiso }, f.salaActiva, hoy),
      destacado: f.destacado,
    })
  }
  return mapa
}

// ---- Lectura ----

/**
 * El documento de una reunión, con sus items — o `null` si nunca se preparó
 * uno (una presentación resuelta en PDF, por ejemplo: la junta puede existir
 * de sobra sin que nadie haya usado esta herramienta para prepararla).
 */
export async function documentoDeReunion(reunionId: string): Promise<DocumentoCompleto | null> {
  if (!hayDB()) {
    const fila = memoria.obtenerDocumentoDeReunionMemoria(reunionId)
    if (!fila) return null
    // Sin DB no hay tabla `acuerdos` que consultar: mapa vacío, mismo
    // criterio que el resto de la app ("sin DB no hay acuerdos que mostrar").
    return documentoCompletoDeFilas(fila, memoria.obtenerItemsDeDocumentoMemoria(fila.id), new Map())
  }

  const conexion = db()
  const fila = (
    await conexion.select().from(esquema.documentos).where(eq(esquema.documentos.reunionId, reunionId))
  )[0]
  if (!fila) return null
  const itemsRows = await conexion
    .select()
    .from(esquema.items)
    .where(eq(esquema.items.documentoId, fila.id))
    .orderBy(asc(esquema.items.orden))

  const idsAcuerdos = [
    ...new Set(itemsRows.flatMap((r) => ((r.contenidoCrudo ?? {}) as ContenidoItemCrudo).acuerdoIdsRetomados ?? [])),
  ]
  const reunion = await obtenerReunion(reunionId)
  const acuerdosPorId = await resolverAcuerdosRetomados(idsAcuerdos, reunion?.salaSlug ?? null)

  return documentoCompletoDeFilas(fila, itemsRows, acuerdosPorId)
}

/**
 * El documento por SU PROPIO id — a diferencia de `documentoDeReunion`
 * (la lectura pública, por reunión), esto es lo que necesitan las
 * operaciones de item de aquí abajo, que solo reciben `documentoId`. No se
 * expone: nada fuera de este módulo tiene un `documentoId` sin haber pasado
 * antes por `documentoDeReunion` o por lo que devuelve `crearDocumento`.
 */
async function obtenerDocumento(documentoId: string): Promise<DocumentoCompleto | null> {
  if (!hayDB()) {
    const fila = memoria.obtenerDocumentoMemoria(documentoId)
    if (!fila) return null
    return documentoCompletoDeFilas(fila, memoria.obtenerItemsDeDocumentoMemoria(documentoId), new Map())
  }

  const conexion = db()
  const fila = (await conexion.select().from(esquema.documentos).where(eq(esquema.documentos.id, documentoId)))[0]
  if (!fila) return null
  const itemsRows = await conexion
    .select()
    .from(esquema.items)
    .where(eq(esquema.items.documentoId, documentoId))
    .orderBy(asc(esquema.items.orden))

  const idsAcuerdos = [
    ...new Set(itemsRows.flatMap((r) => ((r.contenidoCrudo ?? {}) as ContenidoItemCrudo).acuerdoIdsRetomados ?? [])),
  ]
  const reunion = await obtenerReunion(fila.reunionId)
  const acuerdosPorId = await resolverAcuerdosRetomados(idsAcuerdos, reunion?.salaSlug ?? null)

  return documentoCompletoDeFilas(fila, itemsRows, acuerdosPorId)
}

// ---- Escritura ----

/**
 * Crea la fila de documento, sin items — nivel base, análogo a la vieja
 * `crearSesion`. Normalmente se usa `crearReunionConDocumento`, que además
 * siembra los items de la plantilla; esta queda disponible para el caso de
 * preparar un documento para una reunión que ya existía sin uno.
 *
 * La UNICIDAD (una reunión, a lo más un documento) la impone la BASE —
 * `documentos.reunion_id` es `UNIQUE`, y `neon-http` no tiene transacción que
 * lo resuelva de otra forma (ver el constraint global de la ronda 10). Sin
 * DB, el store en memoria reproduce el mismo rechazo a mano (ver
 * `insertarDocumentoMemoria`, src/db/store-memoria.ts) — si no lo hiciera, el
 * primer test de este módulo pasaría sin que el store respetara la regla que
 * dice proteger.
 */
export async function crearDocumento(reunionId: string, plantilla?: string): Promise<{ id: string }> {
  const id = crypto.randomUUID()
  const ahora = new Date()
  const comun = {
    id,
    reunionId,
    estado: 'borrador' as const,
    estructura: null as unknown,
    plantilla: plantilla ?? null,
  }

  if (hayDB()) {
    await db().insert(esquema.documentos).values(comun)
  } else {
    memoria.insertarDocumentoMemoria({ ...comun, createdAt: ahora, updatedAt: ahora })
  }
  return { id }
}

/**
 * "Este documento ya está listo." No dice nada sobre si la junta se dio —
 * esa es `EstadoReunion` (reuniones.ts), una pregunta aparte desde que el
 * spec §1 separó las dos vidas que antes mezclaba `estado_sesion`.
 *
 * Sin guardián de estado: marcar listo un documento que ya estaba listo es
 * seguro e idempotente (una escritura que deja el mismo valor).
 */
export async function marcarListo(documentoId: string): Promise<void> {
  if (hayDB()) {
    await db()
      .update(esquema.documentos)
      .set({ estado: 'listo', updatedAt: new Date() })
      .where(eq(esquema.documentos.id, documentoId))
    return
  }
  memoria.actualizarEstadoDocumentoMemoria(documentoId, 'listo')
}

/**
 * Crea la reunión y su documento con la plantilla de una vez — sustituye a
 * `crearSesionConEstructura` (sesiones.ts:454). Es la que usa `/agenda`, y la
 * razón de que en la base real las 10 reuniones migradas tengan documento.
 *
 * Vive AQUÍ y no en `reuniones.ts` para no invertir la dirección de
 * dependencia (este módulo importa de `reuniones.ts`, nunca al revés).
 *
 * `datos.titulo` es obligatorio en el TIPO (`DatosDeReunion.titulo: string`),
 * pero `/agenda` deja el campo en blanco con normalidad — hoy le manda
 * `undefined` a `crearSesionConEstructura` (cuyo `titulo` sí es opcional) y
 * confía en el título por defecto. Aquí el equivalente en tiempo de
 * ejecución es la cadena vacía: si `datos.titulo` llega vacío o solo
 * espacios, se usa `tituloPorDefecto` — igual que el flujo viejo.
 */
export async function crearReunionConDocumento(
  datos: DatosDeReunion & { plantilla?: string },
): Promise<{ reunionId: string; documentoId: string }> {
  const titulo = datos.titulo?.trim() || tituloPorDefecto(datos.tipo, datos.fecha)
  const { id: reunionId } = await crearReunion({ ...datos, titulo })

  // Las secciones con las que nace salen de LA PLANTILLA, no de una
  // constante: un comité no arranca con los ocho bloques del estatus de una
  // UDN. `obtenerPlantilla` ya resuelve el "estatus-udn" por defecto cuando
  // `datos.plantilla` no viene o no existe.
  const plantilla = obtenerPlantilla(datos.plantilla)
  const { id: documentoId } = await crearDocumento(reunionId, plantilla.id)

  const ahora = new Date()
  const estructura: EstructuraDocumento = { items: plantilla.items }
  const filasBase = plantilla.items.map((d, i) => ({
    id: crypto.randomUUID(),
    documentoId,
    orden: i,
    tipo: d.tipo,
    // Nace solo con su tipo de sección elegido. El TÍTULO no se siembra: si
    // lo hiciera, la sección contaría como escrita y un documento recién
    // creado diría "8/8 listas" sin que nadie haya tocado nada.
    contenidoCrudo: { seccion: { layout: d.layout } } as ContenidoItemCrudo,
    decisionMaquetacion: null as unknown,
  }))

  if (hayDB()) {
    const conexion = db()
    await conexion
      .update(esquema.documentos)
      .set({ estructura, updatedAt: ahora })
      .where(eq(esquema.documentos.id, documentoId))
    await conexion.insert(esquema.items).values(filasBase)
  } else {
    memoria.actualizarEstructuraDocumentoMemoria(documentoId, estructura)
    memoria.insertarItemsMemoria(filasBase.map((f) => ({ ...f, createdAt: ahora, updatedAt: ahora })))
  }
  return { reunionId, documentoId }
}

/**
 * Borra el documento de una reunión (y sus items), si tiene uno. No-op si no
 * lo tiene: una reunión sin documento (el PDF que también es una
 * presentación) no tiene nada que borrar aquí.
 *
 * Existe para resolver la herencia de la Tarea 4: `documentos.reunionId` es
 * `NOT NULL` + `UNIQUE`, así que borrar una reunión con documento revienta
 * contra esa clave foránea a menos que el documento se borre ANTES. Como
 * `reuniones.ts` no puede importar de este módulo (invertiría la dirección
 * de dependencia que fija el plan), esta función se EXPONE para que quien
 * orquesta el borrado se la pase a `eliminarReunion` como parámetro — ver el
 * comentario de `eliminarReunion` en `reuniones.ts` para la alternativa que
 * se descartó y por qué.
 */
export async function eliminarDocumentoDeReunion(reunionId: string): Promise<void> {
  if (hayDB()) {
    const conexion = db()
    const [documento] = await conexion
      .select({ id: esquema.documentos.id })
      .from(esquema.documentos)
      .where(eq(esquema.documentos.reunionId, reunionId))
    if (!documento) return
    await conexion.delete(esquema.items).where(eq(esquema.items.documentoId, documento.id))
    await conexion.delete(esquema.documentos).where(eq(esquema.documentos.id, documento.id))
    return
  }
  const documento = memoria.obtenerDocumentoDeReunionMemoria(reunionId)
  if (!documento) return
  memoria.eliminarItemsDeDocumentoMemoria(documento.id)
  memoria.eliminarDocumentoMemoria(documento.id)
}
