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
import { and, asc, eq, inArray, sql } from 'drizzle-orm'
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
import { maquetarBorrador, type ResultadoMaquetacion } from '@/motor/maquetar'
import { diaCivil, fechaCompleta } from '@/lib/fecha'

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
 * {tipo} · {día completo}". Mudado de `tituloPorDefecto` (`sesiones.ts:186`,
 * tal cual el nombre) — lo usa `crearReunionConDocumento` cuando
 * `datos.titulo` llega vacío, igual que `crearSesionConEstructura` lo usaba
 * para su `estructura.titulo`.
 *
 * GRANULARIDAD DE DÍA, NO DE MES (auditoría UX/UI, ronda 11, "el título de
 * una reunión no dice de qué es"): el título es lo único que distingue dos
 * reuniones en una lista, y la versión anterior formateaba solo "{tipo} ·
 * {Mes}" — exactamente lo que NO distingue nada cuando dos reuniones
 * comparten sala, tipo y mes. Caso real: Research Land tiene dos quincenales
 * en la MISMA sala, Comercial y Digital, y las dos nacían "Estatus quincenal
 * · Agosto de 2026" — indistinguibles. `fecha` (el día EXACTO de la reunión)
 * ya llegaba como parámetro y no se usaba para nada más que extraer el mes:
 * es el dato "a mano" que sí distingue casi cualquier par de reuniones (dos
 * quincenales de la misma sala caen, por definición, en días distintos). No
 * es una solución perfecta —no dice "Comercial" ni "Digital", porque eso
 * ningún default puede inventarlo—, es la que deja menos mal parado a quien
 * no escribe un título a mano (ver `crearReunionConDocumento`, que SIEMPRE
 * prefiere el título escrito sobre este).
 *
 * ARREGLADO AL MUDAR, y sigue arreglado (bug preexistente, ver progress.md de
 * la ronda 10): la versión vieja de `sesiones.ts` llamaba
 * `fecha.toLocaleDateString('es-MX', {...})` SIN fijar `timeZone`, así que
 * usaba la zona del PROCESO — en Vercel, UTC — y no la de la operación. Una
 * junta creada un día 31 a las 19:00 CDMX es la 01:00 UTC del día 1: sin
 * anclar, el título saltaba al mes siguiente. Aquí se usa `fechaCompleta`
 * (src/lib/fecha.ts, la fuente única de "fechas ancladas a
 * America/Mexico_City" — misma familia que `diaCivil`, que este módulo sigue
 * usando más abajo para resolver acuerdos retomados) — mismo anclaje que ya
 * usa el resto de la app para mostrar una fecha completa en texto corrido
 * (`fechaCompleta(reunion.fecha)`, en una decena de pantallas), así que esto
 * no reinventa formato: reusa el que ya existe para esta forma exacta de
 * fecha ("3 de agosto de 2026") en vez de construirlo a mano con `mesLargo`
 * (pensado para encabezados de calendario, no para texto corrido).
 */
function tituloPorDefecto(tipo: TipoReunion, fecha: Date): string {
  return `Estatus ${tipo} · ${fechaCompleta(fecha.toISOString())}`
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

/**
 * EL DOCUMENTO ENSEÑA LO QUE HAY ESCRITO AHORA, no la última foto.
 *
 * Franco, editando el estatus de NeraCode: *"cuando aprieto «ver documento»
 * dentro del editor me debería mostrar el preview"*. Lo que veía era su
 * contenido de HACE DOS HORAS: el documento servía `decision_maquetacion`, la
 * foto que dejó el último "Generar la presentación", y sus ediciones no
 * aparecían hasta volver a pulsarlo. Nada se lo decía.
 *
 * Para una sección COMPUESTA A MANO eso no hacía falta nunca: su maquetado es
 * una FUNCIÓN PURA de su borrador (`maquetarBorrador`, determinista y sin
 * red — ver src/motor/maquetar.ts), así que se puede recalcular al leer, sin
 * coste y sin llamar a ningún modelo. Es además exactamente lo que ya calcula
 * la vista previa del editor: por eso las dos coinciden ahora por
 * construcción y no por disciplina.
 *
 * La foto guardada SIGUE MANDANDO para las secciones del camino asistido —las
 * que propuso la IA y no tienen `seccion` en su contenido crudo—, porque ahí
 * recalcular exigiría volver a llamar al modelo: se paga y puede dar otra
 * cosa. En esas, "Generar la presentación" sigue siendo el momento en que se
 * fija el resultado.
 */
function resultadoVigente(
  contenido: ContenidoItemCrudo,
  tituloDeRespaldo: string,
  acuerdosRetomados: Acuerdo[],
  guardada: unknown,
): ResultadoMaquetacion | null {
  if (contenido.seccion) {
    return resultadoConImagenNormalizada(
      maquetarBorrador(contenido.seccion, tituloDeRespaldo, acuerdosRetomados),
    )
  }
  return resultadoConImagenNormalizada((guardada as ResultadoMaquetacion | null) ?? null)
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
        resultado: resultadoVigente(contenido, def.titulo, acuerdosRetomados, row.decisionMaquetacion),
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

  // `diaCivil`, no `.toISOString().slice(0, 10)` (hallazgo 1 de la revisión
  // final de la ronda 10): ese slice lee el día en UTC crudo, y "ahora" es
  // un instante real —en Vercel (UTC), a partir de las 18:00 CDMX ya cae en
  // el día siguiente—, así que un acuerdo retomado con vencimiento HOY se
  // marcaba `vencido` hasta seis horas antes de tiempo. Mismo bug, mismo
  // arreglo, que `hoyCivil` en `src/db/consultas.ts` (`estadoDeSalaDB`,
  // `acuerdosArrastrablesDe`, `todosLosAcuerdos`) — este es el cuarto call
  // site independiente.
  const hoyCivil = diaCivil(new Date().toISOString())
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
    // Este `.toISOString().slice(0, 10)` SÍ se queda tal cual — a propósito,
    // no por descuido: `fechaCompromiso` nace de un `<input type="date">`
    // vía `new Date('YYYY-MM-DD')`, medianoche UTC (verificado contra la
    // base real: cada fila cae en `00:00:00.000Z`), así que su día EN UTC
    // ES el día civil que se escogió. Convertirlo con `diaCivil` lo
    // correría un día hacia atrás en vez de arreglarlo — mismo caso que
    // documenta `isoFecha` en `src/db/consultas.ts`.
    const fechaCompromiso = f.fechaCompromiso ? f.fechaCompromiso.toISOString().slice(0, 10) : null
    mapa.set(f.id, {
      id: f.id,
      que: f.que,
      responsable: f.responsable,
      squad: f.squad ?? undefined,
      fechaCompromiso,
      estatus: estatusEfectivo({ estatus: f.estatus as EstatusAcuerdo, fechaCompromiso }, f.salaActiva, hoyCivil),
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
 *
 * SIN TRANSACCIÓN (anotado en la revisión de la Tarea 5b, `neon-http` no
 * soporta `SELECT FOR UPDATE` ni transacciones — constraint global de la
 * ronda): esto es `crearReunion` + `crearDocumento` + `update(documentos)` +
 * `insert(items)`, cuatro sentencias sueltas. Si algo revienta a la mitad —
 * la conexión se cae justo después de crear el documento, por ejemplo— la
 * reunión queda con un documento sin `estructura` ni items, o incluso sin
 * documento del todo. No es corrupción: `documentoDeReunion` lee una
 * `estructura` nula como `{ items: [] }` (ver `leerEstructura`) y el
 * documento se ve simplemente vacío, listo para que alguien vuelva a
 * `/deck/<id>` y seguir —o, en el caso más raro, para que `crearDocumento`
 * se llame de nuevo a mano sobre esa reunión—; no deja una fila a medio
 * escribir ni una referencia rota. El patrón viene íntegro de la vieja
 * `crearSesionConEstructura` (`sesiones.ts`, ya borrado): esta tarea no lo
 * introdujo, solo lo hereda. Mismo criterio de "documentar el riesgo, no
 * ocultarlo" que ya aplica `eliminarDocumentoDeReunion`, más abajo, para su
 * propia secuencia de dos sentencias.
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

// ---- Items: contenido y secciones ----
// Todo lo de aquí abajo es lo que hoy vive en `sesiones.ts` sobre items,
// mudado con el mismo nombre y firma salvo que el primer parámetro pasa de
// `sesionId` a `documentoId`. A diferencia de la vieja `guardarItemContenido`,
// ninguna de estas funciones dispara una transición de estado tipo
// "empezarAPrepararse": esa transición era 'agendada' → 'borrador', y
// `EstadoDocumento` no tiene un valor 'agendada' — un documento nace
// directamente en 'borrador' (ver `crearDocumento`), así que no hay nada que
// disparar. No es una regla perdida: es una consecuencia de que su
// precondición dejó de existir (ver la comparación lado a lado del reporte).

/** Persiste lo que el equipo escribió para un item. Nunca toca `decisionMaquetacion`. */
export async function guardarItemContenido(
  documentoId: string,
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
    .where(and(eq(esquema.items.id, itemId), eq(esquema.items.documentoId, documentoId)))
}

/**
 * Guarda la sección que el equipo compuso a mano, conservando el material
 * crudo del asistente (si lo hubiera) que vive en el mismo item.
 */
export async function guardarSeccion(
  documentoId: string,
  itemId: string,
  seccion: BorradorSeccion,
): Promise<void> {
  const documento = await obtenerDocumento(documentoId)
  const item = documento?.items.find((i) => i.id === itemId)
  if (!item) throw new Error(`Sección no encontrada: "${itemId}"`)
  await guardarItemContenido(documentoId, itemId, { ...item.contenido, seccion })
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
  items: ItemDocumento[],
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
 * Añade una sección al final del documento.
 *
 * Toca DOS sitios porque el documento los tiene separados a propósito: la
 * `estructura` dice qué secciones lo componen (y sobrevive a reordenar), y la
 * tabla de items guarda el contenido de cada una. El `tipo` de la sección
 * nueva es un id propio: los nombres fijos ("portada") solo valen para las que
 * trae la plantilla, y dos secciones del mismo tipo se pisarían.
 */
export async function anadirSeccion(
  documentoId: string,
  layout: DecisionSlide['layout'],
  nombre: string,
  /** `tipo` de la sección base que la contiene. Sin esto, nace como base. */
  padre?: string,
): Promise<{ itemId: string }> {
  const documento = await obtenerDocumento(documentoId)
  if (!documento) throw new Error(`Documento no encontrado: "${documentoId}"`)

  const itemId = crypto.randomUUID()
  const definicion: DefinicionItem = {
    tipo: `seccion-${itemId}`,
    titulo: nombre,
    pregunta: '',
    layout,
    ...(padre ? { padre } : {}),
  }
  const ahora = new Date()
  const posicion = posicionDeInsercion(documento.items, padre, layout)
  const desplazados = documento.items.slice(posicion)

  const fila = {
    id: itemId,
    documentoId,
    orden: posicion,
    tipo: definicion.tipo,
    contenidoCrudo: { seccion: { layout } } as ContenidoItemCrudo,
    decisionMaquetacion: null as unknown,
  }

  if (hayDB()) {
    const conexion = db()
    // ATÓMICO (deuda de concurrencia, ronda 11): la versión vieja hacía un
    // SELECT de `estructura`, la modificaba en JS (`[...estructura.items,
    // definicion]`) y la reescribía ENTERA con un UPDATE aparte — un
    // leer-modificar-escribir con un hueco real en medio. Dos personas
    // añadiendo secciones a la vez (o el mismo reintento) leían la MISMA
    // `estructura`, cada una le sumaba SU definición en memoria, y la
    // segunda escritura pisaba a la primera. El item de la sección perdida
    // sobrevivía en `items` (el INSERT de abajo es su propia fila, ajeno a
    // esto) pero sin definición en `estructura`, así que
    // `documentoCompletoDeFilas` caía al `def` de respaldo y la pintaba con
    // su tipo crudo (`seccion-<uuid>`). Choca con lo que el producto
    // promete: el borrador es colaborativo (ver el comentario de
    // `avanceDeItems` en src/db/consultas.ts).
    //
    // `jsonb_set` + `||` DENTRO del UPDATE, no un SELECT aparte: `neon-http`
    // no tiene transacción ni `SELECT FOR UPDATE` que cierre ese hueco desde
    // fuera, pero una sola sentencia no lo necesita — Postgres toma el lock
    // de la fila y evalúa el `SET` contra su valor YA bloqueado; una segunda
    // sentencia concurrente espera ese lock y, al correr, lee el valor que
    // la primera ya COMMITEÓ (misma garantía que ya usa el incremento
    // atómico `ediciones + 1` de participacion.ts, y la misma familia de
    // arreglo que `crearAcuerdo` aplica en acuerdos.ts para su propia
    // carrera). Ninguna definición se pierde, sin importar en qué orden
    // corran dos llamadas concurrentes.
    //
    // `coalesce(estructura, '{}'::jsonb)` / `coalesce(...->'items',
    // '[]'::jsonb)`: un documento recién creado con `crearDocumento` (sin
    // pasar por `crearReunionConDocumento`) tiene `estructura` NULL hasta
    // que algo la llena — ver `leerEstructura`.
    //
    // SE APPENDEA AL FINAL, igual que el código viejo (`[...estructura.items,
    // definicion]`), NO en `posicion`: el array de `estructura` NUNCA ha
    // sido lo que decide el orden VISUAL del documento. `documentoCompletoDeFilas`
    // (arriba) ordena los items por la columna `items.orden` y solo usa
    // `estructura.items` como diccionario por `tipo` (`defsPorTipo`, un
    // `Map`) — ni `reordenarItems` ni `moverItem` tocan `estructura` para
    // nada, y el código viejo YA appendeaba al final sin mirar `posicion`
    // (confirmado leyendo esta función ANTES de tocarla, como pide la
    // ronda). Preservar ese append es preservar el comportamiento exacto —y
    // es justo lo que permite resolver esto sin cambiar la FORMA del jsonb.
    await conexion
      .update(esquema.documentos)
      .set({
        estructura: sql`jsonb_set(
          coalesce(${esquema.documentos.estructura}, '{}'::jsonb),
          '{items}',
          coalesce(${esquema.documentos.estructura}->'items', '[]'::jsonb) || ${JSON.stringify([definicion])}::jsonb
        )`,
        updatedAt: ahora,
      })
      .where(eq(esquema.documentos.id, documentoId))
    await conexion.insert(esquema.items).values(fila)
    await Promise.all(
      desplazados.map((i, k) =>
        conexion.update(esquema.items).set({ orden: posicion + 1 + k, updatedAt: ahora }).where(eq(esquema.items.id, i.id)),
      ),
    )
  } else {
    const filaDocumento = memoria.obtenerDocumentoMemoria(documentoId)
    const estructura = leerEstructura(filaDocumento?.estructura)
    memoria.actualizarEstructuraDocumentoMemoria(documentoId, {
      ...estructura,
      items: [...estructura.items, definicion],
    })
    memoria.insertarItemsMemoria([{ ...fila, createdAt: ahora, updatedAt: ahora }])
    desplazados.forEach((i, k) => memoria.actualizarOrdenItemMemoria(i.id, posicion + 1 + k))
  }
  return { itemId }
}

/**
 * Borra una sección y renumera las que quedan.
 *
 * La renumeración importa: sin ella queda un hueco en el orden (0,1,3,4) que
 * el arrastre interpretaría como una permutación inválida y rechazaría.
 */
export async function eliminarSeccion(documentoId: string, itemId: string): Promise<void> {
  const documento = await obtenerDocumento(documentoId)
  if (!documento) return
  const item = documento.items.find((i) => i.id === itemId)
  if (!item) return
  // Las secciones base de la plantilla son la estructura del documento: se
  // editan y se reordenan, no se borran. El editor tampoco ofrece el botón,
  // pero una Server Action es un endpoint y no se confía en que la pantalla
  // lo tape.
  if (item.esBase) throw new Error(`"${item.titulo}" es una sección base: no se puede eliminar.`)

  // Una sección con subsecciones se lleva las suyas: dejarlas huérfanas las
  // haría desaparecer del editor sin desaparecer de la base.
  const aBorrar = new Set([itemId])
  for (const hijo of documento.items) {
    if (hijo.padre === item.tipo) aBorrar.add(hijo.id)
  }
  const tiposBorrados = new Set(documento.items.filter((i) => aBorrar.has(i.id)).map((i) => i.tipo))

  const quedan = documento.items.filter((i) => !aBorrar.has(i.id))
  const ahora = new Date()

  if (hayDB()) {
    const conexion = db()
    // ATÓMICO — misma deuda y mismo razonamiento que `anadirSeccion` (ver su
    // comentario arriba): el código viejo leía `estructura`, la filtraba en
    // JS (`estructura.items.filter(d => !tiposBorrados.has(d.tipo))`) y la
    // reescribía entera. Dos `eliminarSeccion` a la vez (o un reintento)
    // podían resucitar en `estructura` una definición cuyo item YA se había
    // borrado de `items`: la segunda escritura partía de una `estructura`
    // leída ANTES de que la primera quitara la suya, así que la volvía a
    // dejar puesta.
    //
    // `jsonb_array_elements(...) WITH ORDINALITY` + `jsonb_agg(...)` DENTRO
    // del UPDATE: se desarma el array de `estructura`, se descartan los
    // `tipo` de `tiposBorrados` (el mismo `Set` que este archivo ya calculó
    // para borrar los items y renumerar `quedan`, dos líneas más abajo) y se
    // vuelve a armar — todo contra el valor de `estructura` que Postgres ya
    // bloqueó para ESTA sentencia, con la misma garantía de "una sentencia
    // concurrente ve el resultado ya commiteado de la anterior" que usa
    // `anadirSeccion`.
    //
    // ORDEN PRESERVADO EXPLÍCITAMENTE (`WITH ORDINALITY` + `ORDER BY`), no
    // por confiar en que un `jsonb_agg` sin `ORDER BY` mantenga el orden de
    // origen: el resultado es exactamente el de un `.filter()` de JS — mismo
    // contenido, mismo orden relativo, solo sin los tipos borrados. (Y, como
    // documenta `anadirSeccion`, ese orden de todos modos no es el que pinta
    // el documento — pero conservarlo tal cual es más simple de razonar que
    // justificar por qué se podría perder.)
    const tiposBorradosJson = JSON.stringify([...tiposBorrados])
    await conexion
      .update(esquema.documentos)
      .set({
        estructura: sql`jsonb_set(
          coalesce(${esquema.documentos.estructura}, '{}'::jsonb),
          '{items}',
          coalesce(
            (
              select jsonb_agg(elem.value order by elem.ordinalidad)
              from jsonb_array_elements(coalesce(${esquema.documentos.estructura}->'items', '[]'::jsonb))
                with ordinality as elem(value, ordinalidad)
              where not (
                coalesce(elem.value->>'tipo', '') in (select jsonb_array_elements_text(${tiposBorradosJson}::jsonb))
              )
            ),
            '[]'::jsonb
          )
        )`,
        updatedAt: ahora,
      })
      .where(eq(esquema.documentos.id, documentoId))
    await Promise.all(
      [...aBorrar].map((borrarId) =>
        conexion
          .delete(esquema.items)
          .where(and(eq(esquema.items.id, borrarId), eq(esquema.items.documentoId, documentoId))),
      ),
    )
    await Promise.all(
      quedan.map((i, orden) =>
        conexion.update(esquema.items).set({ orden, updatedAt: ahora }).where(eq(esquema.items.id, i.id)),
      ),
    )
    return
  }

  const filaDocumento = memoria.obtenerDocumentoMemoria(documentoId)
  const estructura = leerEstructura(filaDocumento?.estructura)
  memoria.actualizarEstructuraDocumentoMemoria(documentoId, {
    ...estructura,
    items: estructura.items.filter((d) => !tiposBorrados.has(d.tipo)),
  })
  for (const borrarId of aBorrar) memoria.eliminarItemMemoria(borrarId)
  quedan.forEach((i, orden) => memoria.actualizarOrdenItemMemoria(i.id, orden))
}

/**
 * Deja los items del documento en el orden exacto de `idsEnOrden`.
 *
 * Es lo que persiste el arrastre: mover el tercer item al primer sitio no es
 * un intercambio con el vecino, así que se reasigna el orden completo (0..n-1).
 * Se rechaza en silencio cualquier lista que no sea una permutación exacta de
 * los items de este documento — llega del navegador, así que no se confía en ella.
 */
export async function reordenarItems(documentoId: string, idsEnOrden: string[]): Promise<void> {
  const documento = await obtenerDocumento(documentoId)
  if (!documento) return

  // Lo que llega del editor son los BLOQUES en su orden nuevo, no todos los
  // items: las subsecciones no se arrastran sueltas, viajan con el suyo. Aquí
  // se reconstruye el orden completo poniendo cada bloque seguido de sus
  // hijas, en el orden que ya tenían.
  const bases = documento.items.filter((i) => !i.padre).map((i) => i.id)
  if (!esPermutacionValida(bases, idsEnOrden)) return

  const porId = new Map(documento.items.map((i) => [i.id, i]))
  const ordenCompleto = idsEnOrden.flatMap((idBase) => {
    const base = porId.get(idBase)!
    const hijas = documento.items.filter((h) => h.padre === base.tipo).map((h) => h.id)
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
        .where(and(eq(esquema.items.id, itemId), eq(esquema.items.documentoId, documentoId)))
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
  documentoId: string,
  itemId: string,
  direccion: 'arriba' | 'abajo',
): Promise<void> {
  const documento = await obtenerDocumento(documentoId)
  if (!documento) return
  const item = documento.items.find((i) => i.id === itemId)
  if (!item) return

  const hermanas = documento.items.filter((i) => i.padre === item.padre)
  const idx = hermanas.findIndex((i) => i.id === itemId)
  const destino = direccion === 'arriba' ? idx - 1 : idx + 1
  if (destino < 0 || destino >= hermanas.length) return

  const nuevasHermanas = [...hermanas]
  ;[nuevasHermanas[idx], nuevasHermanas[destino]] = [nuevasHermanas[destino], nuevasHermanas[idx]]

  // Se recalcula el orden COMPLETO a partir del árbol nuevo: es más simple de
  // razonar que intercambiar dos números y menos frágil ante huecos.
  const bases = documento.items.filter((i) => !i.padre)
  const basesFinales = item.padre ? bases : nuevasHermanas
  const ordenCompleto = basesFinales.flatMap((base) => {
    const hijas = item.padre === base.tipo
      ? nuevasHermanas
      : documento.items.filter((h) => h.padre === base.tipo)
    return [base.id, ...hijas.map((h) => h.id)]
  })

  await reasignarOrden(documentoId, ordenCompleto)
}

/** Deja los items en el orden 0..n-1 que dice la lista. */
async function reasignarOrden(documentoId: string, idsEnOrden: string[]): Promise<void> {
  if (idsEnOrden.length === 0) return
  if (hayDB()) {
    const conexion = db()
    const ahora = new Date()
    await Promise.all(
      idsEnOrden.map((itemId, posicion) =>
        conexion
          .update(esquema.items)
          .set({ orden: posicion, updatedAt: ahora })
          .where(and(eq(esquema.items.id, itemId), eq(esquema.items.documentoId, documentoId))),
      ),
    )
    return
  }
  idsEnOrden.forEach((itemId, posicion) => memoria.actualizarOrdenItemMemoria(itemId, posicion))
}

/**
 * Guarda las decisiones del motor de maquetación (una por item llenado, en
 * el mismo orden que produjo `entradasCrudasDeDocumento`) y marca el
 * documento como `listo` (ver `marcarListo`) — mismo comportamiento que la
 * vieja `guardarDecisiones` (que dejaba la sesión en `'lista'`), solo que la
 * transición ahora vive en su propia función reutilizable.
 */
export async function guardarDecisiones(
  documentoId: string,
  resultados: ResultadoMaquetacion[],
): Promise<void> {
  const documento = await obtenerDocumento(documentoId)
  if (!documento) throw new Error(`Documento no encontrado: "${documentoId}"`)
  const llenados = documento.items.filter((i) => i.llenado)
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
  } else {
    llenados.forEach((item, i) => memoria.actualizarDecisionItemMemoria(item.id, resultados[i]))
  }
  await marcarListo(documentoId)
}

// ---- Acuerdos retomados (ronda 9, tarea 6) ----

/**
 * En qué item del documento aterriza un acuerdo retomado: el de tipo
 * `'acuerdos-pendientes'` —la sección fija del estatus de UDN, ver
 * `ESTATUS_UDN` en src/secciones/plantillas.ts— si existe; si no, la primera
 * sección que ya sea `pendientes-semaforo` (otra plantilla, como "seguimiento"
 * o "arranque", también trae una). Si ninguna existe, no hay dónde ofrecerlo
 * — `anadirAcuerdoRetomado` lo dice con un error claro en vez de inventar una
 * sección que nadie pidió.
 */
export function itemDeAcuerdosPendientes(documento: DocumentoCompleto): ItemDocumento | undefined {
  return (
    documento.items.find((i) => i.tipo === 'acuerdos-pendientes') ??
    documento.items.find((i) => i.contenido.seccion?.layout === 'pendientes-semaforo')
  )
}

/**
 * Retoma `acuerdoId` en `documentoId`: lo REFERENCIA en la sección de
 * Acuerdos y Pendientes del documento, sin copiar su contenido — se guarda
 * el id, no el texto (ver el comentario de `ContenidoItemCrudo.acuerdoIdsRetomados`).
 * `documentoDeReunion`/`obtenerDocumento` son quienes lo resuelven contra
 * `acuerdos` en cada lectura, así que esto nunca queda desactualizado.
 *
 * Idempotente: retomarlo dos veces no lo duplica en la lista.
 */
export async function anadirAcuerdoRetomado(documentoId: string, acuerdoId: string): Promise<void> {
  const documento = await obtenerDocumento(documentoId)
  if (!documento) throw new Error(`Documento no encontrado: "${documentoId}"`)
  const item = itemDeAcuerdosPendientes(documento)
  if (!item) {
    throw new Error('Este documento no tiene una sección de Acuerdos y Pendientes a la que retomar el acuerdo.')
  }
  const actuales = item.contenido.acuerdoIdsRetomados ?? []
  if (actuales.includes(acuerdoId)) return // ya estaba: nada que hacer.
  await guardarItemContenido(documentoId, item.id, { ...item.contenido, acuerdoIdsRetomados: [...actuales, acuerdoId] })
}

/**
 * Convierte los items llenados de un documento en `EntradaCruda[]` para el
 * motor (etapa 1). Mismo criterio de filtrado y mismo orden que
 * `guardarDecisiones` usa para reasociar sus resultados — llamar a ambas
 * en la misma acción, sin mutaciones intermedias entre una y otra.
 */
export function entradasCrudasDeDocumento(documento: DocumentoCompleto): EntradaCruda[] {
  return documento.items
    .filter((i) => i.llenado)
    .map((i) => ({
      titulo: i.titulo,
      seccion: i.contenido.seccion,
      texto: i.contenido.texto,
      cifras: i.contenido.cifras,
      tablas: i.contenido.tablas,
      imagenes: i.contenido.imagenes,
      nota: i.contenido.nota,
      // Ya resueltos (ver `resolverAcuerdosRetomados`): es lo que hace que
      // "Maquetar" los meta al documento sin que nadie los haya copiado a
      // mano en la tabla de pendientes.
      acuerdosRetomados: i.acuerdosRetomados,
    }))
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
