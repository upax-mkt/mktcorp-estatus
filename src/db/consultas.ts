/**
 * Capa de acceso a datos que consume el shell (hub + vista de sala).
 *
 * Reimplementa las funciones de src/dominio/salas.ts, ahora async: si
 * hayDB() consultan Postgres vía Drizzle; si no, delegan al fallback de
 * src/dominio/salas.ts, que devuelve vacío (ver el comentario junto a la API
 * pública, más abajo, para por qué desde la ronda 8 ya no hay "datos de
 * ejemplo" que mostrar sin base).
 *
 * Los derivados puros (acuerdosAbiertos, acuerdosVencidos, temperatura,
 * ordenarPorProximaReunion) no tocan la base de datos — operan sobre EstadoSala
 * ya resuelto, venga de donde venga — así que se re-exportan tal cual desde
 * dominio/salas.ts en vez de duplicar su lógica.
 */
import { and, desc, eq } from 'drizzle-orm'
import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import { cargarTemas, slugsDeSalas } from './temas'
import type { Tema } from '@/temas'
import * as fallback from '@/dominio/salas'
import * as reunionDominio from '@/dominio/reunion'
import { esLlenado, documentoDeReunion, type ContenidoItemCrudo } from './documentos'
import { diaCivil } from '@/lib/fecha'
import type {
  Acuerdo,
  AcuerdoEnRiesgo,
  EstadoSala,
  PulsoDelMes,
} from '@/dominio/salas'
import { documentoCuentaComoPresentacion } from '@/dominio/reunion'
import type { AcuerdoDeReunion, CaraArchivo, Minuta, Reunion } from '@/dominio/reunion'

export type {
  Acuerdo,
  AcuerdoEnRiesgo,
  EstadoSala,
  EstatusAcuerdo,
  PulsoDelMes,
  Temperatura,
} from '@/dominio/salas'
export type { AcuerdoDeReunion, CaraArchivo, Minuta, Reunion } from '@/dominio/reunion'

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

/**
 * El día, en crudo, de un instante EN UTC — sin anclar a ninguna zona.
 *
 * SOLO para un valor que YA nació anclado a UTC y donde ese anclaje es
 * justo lo que hay que leer de vuelta. Hoy el único caso así en este
 * archivo es `Acuerdo.fechaCompromiso`: nace de un `<input type="date">`
 * vía `new Date('YYYY-MM-DD')` (`src/app/acuerdos/acciones.ts`,
 * `src/app/cliente/[slug]/page.tsx`, `src/componentes/NuevoAcuerdoForm.tsx`,
 * `src/componentes/EditarAcuerdo.tsx`) — JS interpreta esa forma
 * como medianoche UTC, así que su día EN UTC es, por construcción, el día
 * civil que la persona escogió en el calendario (verificado contra la base
 * real: cada `fecha_compromiso` cae en `00:00:00.000Z`, sin excepción).
 * `isoFecha` sobre ese valor recupera exactamente ese día — es el MISMO
 * patrón que usan `isoDia` (`src/db/acuerdos.ts`) y el slice a mano de
 * `src/app/acuerdos/acciones.ts:113`; las tres lecturas tienen que seguir
 * de acuerdo, así que esta función no desaparece mientras esas otras dos
 * sigan vivas.
 *
 * NUNCA para un INSTANTE real —una fecha de reunión, "ahora", cuándo se
 * pausó una sala—: esos SÍ tienen una hora del reloj con sentido (una junta
 * a las 18:00 CDMX es, de verdad, la 01:00 UTC del día siguiente) y
 * `isoFecha` les corta el día equivocado desde las 18:00 CDMX en adelante,
 * todas las tardes, porque Vercel corre en UTC. ESE fue el hallazgo 1/2 de
 * la revisión final de la ronda 10: dos "hoy" distintos convivían en este
 * archivo —`isoFecha(ahora)` aquí y `diaCivil(ahora.toISOString())` en
 * `hoyCivil`, unas líneas más abajo— y solo el segundo es correcto para un
 * instante real. Para esos casos, `diaCivil` (`src/lib/fecha.ts`, anclado a
 * America/Mexico_City) es la única función que se usa en este archivo desde
 * ese arreglo: ver `hoyCivil`, y las conversiones de
 * `ultimaSesion`/`proximaReunion`/`Minuta.fecha`/`pausadaDesde` más abajo.
 */
function isoFecha(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Cuánto lleva escrito el documento de una reunión en preparación.
 *
 * Antes era una heurística por estado de la SESIÓN —35% si borrador, 90% si
 * lista— porque no se contaban los items. Se cuentan: un documento con 3 de
 * 14 secciones escritas dice 21%, no 35%. Y es lo que hace visible el
 * borrador colaborativo: varias personas llenan secciones distintas y la
 * barra sube.
 *
 * MIGRADO A `documentoListo` EN LA TAREA 7 (era `estado === 'lista'` sobre la
 * sesión): el equivalente de "maquetada" ahora es el documento, no la
 * reunión — ver `EstadoDocumento`, `db/documentos.ts`. Va al 100 aunque
 * queden secciones vacías: alguien ya decidió que con eso se presenta.
 */
function avanceDeItems(documentoListo: boolean, llenados: number, total: number): number {
  if (documentoListo) return 100
  if (total === 0) return 0
  return Math.round((llenados / total) * 100)
}

async function estadoDeSalaDB(slug: string): Promise<EstadoSala | undefined> {
  if (!(await slugsDeSalas()).includes(slug)) return undefined
  const registro = await cargarTemas()
  const tema = registro[slug]
  if (!tema) return undefined // defensivo: no debería pasar, ver cargarTemas()
  const conexion = db()
  const ahora = new Date()

  // LA CONSULTA PASA A `esquema.reuniones` (Tarea 7), no `esquema.sesiones`:
  // desde la migración de la ronda 10 (`drizzle/0020_partir_sesiones.sql`),
  // TODA reunión —migrada o nueva— nace en `reuniones`; `sesiones` queda
  // congelada en el snapshot del momento de migrar (`crearReunion` nunca
  // vuelve a escribir ahí). Seguir leyendo de `sesiones` habría dejado
  // invisible cualquier reunión creada después de migrar — el mismo defecto,
  // por la misma razón, que el JOIN de minutas de más abajo.
  const [salaRow, reunionesRows, acuerdosRows, minutasRows, archivosRows, itemsRows] = await Promise.all([
    conexion.select().from(esquema.salas).where(eq(esquema.salas.slug, slug)).then((r) => r[0]),
    // LEFT JOIN a `documentos`: una reunión puede no tener uno todavía (una
    // junta agendada a secas) o nunca tenerlo (la que se registró solo con
    // minuta) — `documentoDeReunion` documenta el mismo caso. `documentoId`/
    // `documentoEstado` salen `null` cuando no hay fila, y de ahí sale
    // `documentoListo` más abajo.
    conexion
      .select({
        id: esquema.reuniones.id,
        fecha: esquema.reuniones.fecha,
        titulo: esquema.reuniones.titulo,
        tipo: esquema.reuniones.tipo,
        estado: esquema.reuniones.estado,
        noDadaEn: esquema.reuniones.noDadaEn,
        // ⚠️ SIN ESTA LÍNEA `Reunion.plantilla` LLEGA `undefined` EN
        // PRODUCCIÓN Y `tsc` NO DICE NADA (ronda 14.3, tarea 1): el tipo ya
        // lo exige (`dominio/reunion.ts`), pero un `select` que no la pida no
        // revienta en compilación — es el MISMO defecto, verificado contra
        // este mismo repo, que dejó a `editarReunion` sin escribir la
        // columna (dos Críticos, milestone 2). Fijado por
        // `db/consultas.test.ts` (describe "plantilla viaja...").
        plantilla: esquema.reuniones.plantilla,
        documentoId: esquema.documentos.id,
        documentoEstado: esquema.documentos.estado,
      })
      .from(esquema.reuniones)
      .leftJoin(esquema.documentos, eq(esquema.documentos.reunionId, esquema.reuniones.id))
      .where(eq(esquema.reuniones.salaSlug, slug))
      .orderBy(desc(esquema.reuniones.fecha)),
    conexion.select().from(esquema.acuerdos).where(eq(esquema.acuerdos.salaSlug, slug)),
    // HALLAZGO HEREDADO DE LA T5 (cerrado aquí): este JOIN era por
    // `sesionId`. Desde la Tarea 5b toda minuta nueva se guarda con
    // `sesionId: null` y `reunionId` poblado (`guardarMinuta`,
    // `cargarMinutaExterna` — `src/db/minutas.ts`), así que un JOIN por
    // `sesionId` la dejaba fuera: la UDN vería "falta la minuta" en una
    // reunión que sí la tiene. `reunionId` es además la fuente del título y
    // la fecha: la reunión ya los trae en columna propia, así que no hace
    // falta derivarlos de una `estructura` congelada (lo que hacía
    // `tituloDeSesion`, retirada en esta misma tarea).
    conexion
      .select({
        reunionId: esquema.minutas.reunionId,
        enviadaA: esquema.minutas.enviadaA,
        textoFinal: esquema.minutas.textoFinal,
        fecha: esquema.reuniones.fecha,
        titulo: esquema.reuniones.titulo,
      })
      .from(esquema.minutas)
      .innerJoin(esquema.reuniones, eq(esquema.minutas.reunionId, esquema.reuniones.id))
      .where(eq(esquema.reuniones.salaSlug, slug)),
    // Los archivos de presentación colgados de una reunión (Tarea 7): la cara
    // "archivo" de una junta, junto a su documento y su minuta — ver
    // `CaraArchivo`, `dominio/reunion.ts`. Solo `categoria: 'presentacion'`:
    // una imagen o un vídeo incrustado en una sección (`'imagen'`/`'video'`)
    // es contenido DE un documento, no un archivo colgado de la reunión en
    // sí, y no tiene sentido ofrecerlo como "la presentación" de la junta.
    conexion
      .select({
        id: esquema.archivos.id,
        titulo: esquema.archivos.titulo,
        nombreOriginal: esquema.archivos.nombreOriginal,
        reunionId: esquema.archivos.reunionId,
      })
      .from(esquema.archivos)
      .innerJoin(esquema.reuniones, eq(esquema.archivos.reunionId, esquema.reuniones.id))
      .where(and(eq(esquema.reuniones.salaSlug, slug), eq(esquema.archivos.categoria, 'presentacion'))),
    // El contenido de los items, para saber cuánto lleva escrito el documento
    // que se está preparando. Por `documentoId` (Tarea 7), no por `sesionId`:
    // un item de una reunión nueva solo cuelga de su documento (ver la
    // cabecera de `db/documentos.ts`), así que un JOIN por `sesionId` no lo
    // vería. Con join y no una consulta por reunión: son diez salas × N
    // reuniones y el hub las pide todas a la vez.
    conexion
      .select({
        documentoId: esquema.items.documentoId,
        contenidoCrudo: esquema.items.contenidoCrudo,
      })
      .from(esquema.items)
      .innerJoin(esquema.documentos, eq(esquema.items.documentoId, esquema.documentos.id))
      .innerJoin(esquema.reuniones, eq(esquema.documentos.reunionId, esquema.reuniones.id))
      .where(eq(esquema.reuniones.salaSlug, slug)),
  ])

  const hoyCivil = diaCivil(ahora.toISOString())

  /** Cuántas secciones tiene cada documento, de los items que ya se pidieron. */
  const seccionesPorDocumento = new Map<string, number>()
  for (const item of itemsRows) {
    seccionesPorDocumento.set(item.documentoId, (seccionesPorDocumento.get(item.documentoId) ?? 0) + 1)
  }

  // La base de cada reunión —sin archivos, minuta ni acuerdos todavía—, tal
  // como la pide `reunionesDeSala` (`dominio/reunion.ts`). `documentoListo`,
  // no `Boolean(documentoId)`: en los datos reales casi toda reunión tiene
  // documento desde que se agenda (la plantilla nace con la junta, ver
  // `crearReunionConDocumento`), así que su mera existencia no prueba nada —
  // el umbral es el documento TERMINADO, igual que el viejo estado `lista`.
  const reunionesBase: Array<Omit<Reunion, 'archivos' | 'minuta' | 'acuerdos'>> = reunionesRows.map((r) => ({
    id: r.id,
    fecha: r.fecha.toISOString(),
    titulo: r.titulo,
    tipo: r.tipo,
    estado: r.estado,
    noDadaEn: r.noDadaEn ? r.noDadaEn.toISOString() : null,
    // `?? null`, no `r.plantilla` a secas: dice "sin clasificar" con la
    // misma palabra que el resto del dominio usa para ese estado, en vez de
    // dejar pasar el `undefined` crudo que devolvería una columna nula.
    plantilla: r.plantilla ?? null,
    documentoId: r.documentoId ?? undefined,
    // `documentoCuentaComoPresentacion` y no `estado === 'listo'` a secas
    // (ronda 13): un documento LISTO Y VACÍO no es una presentación — ver el
    // porqué en `dominio/reunion.ts`. Las secciones se cuentan de `itemsRows`,
    // que esta misma consulta ya trajo para la barra de avance.
    documentoListo: documentoCuentaComoPresentacion(
      r.documentoEstado,
      r.documentoId ? seccionesPorDocumento.get(r.documentoId) ?? 0 : 0,
    ),
  }))

  const archivos: Array<CaraArchivo & { reunionId: string }> = archivosRows.map((a) => ({
    id: a.id,
    titulo: a.titulo,
    // `?? ''`: `nombre_original` pasó a nullable cuando un material de sala
    // pudo ser un ENLACE en vez de un fichero (ronda 12). Aquí no puede
    // serlo: esta consulta filtra `categoria = 'presentacion'` y una
    // presentación de una reunión solo nace de una subida, que siempre trae
    // su nombre. El fallback existe para no propagar el nulo a la cara de la
    // reunión, donde el nombre se usa para pintar la extensión.
    nombreOriginal: a.nombreOriginal ?? '',
    // Servido por la ruta que ya comprueba permiso contra la reunión dueña
    // del archivo — ver `src/app/api/archivo/[id]/route.ts`.
    url: `/api/archivo/${a.id}`,
    // `!`: el INNER JOIN de arriba (`archivos.reunionId = reuniones.id`) ya
    // descarta toda fila sin `reunionId` — la columna es nullable en el
    // esquema (archivos sin reunión también existen), pero no en lo que
    // sobrevive a este JOIN.
    reunionId: a.reunionId!,
  }))

  const minutas: Array<Minuta & { reunionId: string }> = minutasRows.map((m) => ({
    // Sin `!`: `minutas.reunion_id` es NOT NULL desde el hallazgo 3 de la
    // revisión final de la ronda 10 (ver esquema.ts) — ya no hace falta
    // fingir contra el tipo lo que la base garantiza de verdad.
    reunionId: m.reunionId,
    // `diaCivil`, no `isoFecha`: `m.fecha` es `reuniones.fecha` —un instante
    // real, anclado a CDMX al escribirse (`instanteEnCDMX`)—, no un valor
    // congelado en UTC. Hallazgo 2 de la revisión final de la ronda 10:
    // verificado contra la base, Marketing United dio su junta el 22-jul a
    // las 18:00 CDMX, la 00:00 UTC del 23-jul — `isoFecha` leía "23-jul".
    fecha: diaCivil(m.fecha.toISOString()),
    titulo: m.titulo,
    enviadaA: Array.isArray(m.enviadaA) ? m.enviadaA.length : 0,
    texto: m.textoFinal ?? undefined,
  }))

  // `salas.activa` puede faltar si la fila aún no existe (dev sin sembrar):
  // por defecto, activa — mismo criterio que `cadencia: salaRow?.cadencia ??
  // 'mensual'` más abajo. Se calcula AQUÍ (antes vivía junto a `acuerdos`, más
  // abajo) porque `acuerdos` la necesita para `estatusEfectivo`, y de
  // `acuerdos` sale ahora también `acuerdosParaReuniones` — ver su comentario.
  const activa = salaRow?.activa ?? true

  // TODOS los acuerdos de la sala, con su estatus de HOY y su reunión de
  // origen (`reunionOrigenId`, tarea 10 — antes se perdía al armar el
  // dominio: `Acuerdo`, dominio/salas.ts, no lo traía). 'cancelado' no existe
  // en el tipo EstatusAcuerdo del shell (solo abierto/cumplido/vencido) — un
  // acuerdo cancelado deja de mostrarse, igual que si nunca hubiera existido
  // para efectos de la sala.
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
      reunionOrigenId: a.reunionOrigenId,
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
     *
     * `hoyCivil`, no `isoFecha(ahora)` (hallazgo 1 de la revisión final de
     * la ronda 10): en Vercel (UTC), a partir de las 18:00 CDMX
     * `isoFecha(ahora)` ya devuelve el día siguiente, así que un acuerdo con
     * `fechaCompromiso` de HOY se marcaba `vencido` hasta seis horas antes
     * de tiempo, todas las tardes. `hoyCivil` ya se calculó arriba, para
     * `fueDada` — antes de este arreglo convivían dos "hoy" distintos en
     * esta misma función.
     */
    .map((a) => ({ ...a, estatus: fallback.estatusEfectivo(a, activa, hoyCivil) }))

  /**
   * LOS ACUERDOS AGRUPADOS POR REUNIÓN (tarea 10): se derivan de `acuerdos`
   * —el mismo array de arriba, no una segunda lectura de `acuerdosRows`— para
   * que `Reunion.acuerdos` herede el MISMO estatus de hoy (`estatusEfectivo`)
   * que ya se calculó ahí, en vez de recalcularlo dos veces o, peor, mostrar
   * el estatus crudo de la base. Antes de esta tarea era justo eso: una
   * segunda `.map()` sobre `acuerdosRows` con `a.estatus` sin pasar por
   * `estatusEfectivo` — un acuerdo vencido desde hace semanas seguía
   * apareciendo "abierto" en el desplegable de su reunión (`AcuerdosDeReunion`,
   * src/componentes/reuniones).
   *
   * `reunionOrigenId != null` es el filtro real: un acuerdo levantado a mano
   * (nunca nació en una junta) o cuya reunión se borró (la FK se anula, no
   * cascada — ver `dominio/reunion.ts`) no cuelga de ninguna reunión y no debe
   * aparecer en ningún desplegable — sigue vivo en `acuerdos`, arriba, que es
   * donde se le da seguimiento.
   */
  const acuerdosParaReuniones: Array<AcuerdoDeReunion & { reunionOrigenId: string }> = acuerdos
    .filter((a): a is typeof a & { reunionOrigenId: string } => a.reunionOrigenId != null)
    .map((a) => ({
      id: a.id,
      que: a.que,
      responsable: a.responsable,
      estatus: a.estatus,
      fechaCompromiso: a.fechaCompromiso,
      reunionOrigenId: a.reunionOrigenId,
    }))

  // LAS REUNIONES DE LA SALA, ya cosidas — sustituye a `presentaciones` +
  // `minutas` (dos listas paralelas emparejadas a mano). Ver `EstadoSala.reuniones`.
  const reuniones = reunionDominio.reunionesDeSala({
    reuniones: reunionesBase,
    archivos,
    minutas,
    acuerdos: acuerdosParaReuniones,
  })

  // `fueDada` (`dominio/reunion.ts`) es la ÚNICA verdad de "¿esta reunión ya
  // ocurrió?": la misma pregunta que responde el pulso del mes
  // (`construirPulso`, más abajo) y las dos tienen que estar de acuerdo o
  // vuelve a haber dos verdades distintas sobre si una reunión sucedió.
  const yaSucedidas = reuniones.filter((r) => reunionDominio.fueDada(r, hoyCivil)) // reuniones ya viene desc por fecha
  const futuras = reuniones
    .filter((r) => new Date(r.fecha).getTime() > ahora.getTime())
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
  // "En preparación": tiene un documento (algo, aunque esté vacío) y todavía
  // no se cuenta como dada. Ya no "borrador o lista" (esa distinción era del
  // viejo estado fundido de la sesión): el equivalente hoy es tener
  // `documentoId` —nace con la reunión, ver `crearReunionConDocumento`— sin
  // que `fueDada` la haya dado ya por ocurrida.
  const enPreparacionRows = reuniones.filter((r) => r.documentoId != null && !reunionDominio.fueDada(r, hoyCivil))
  // La que se está preparando: la más próxima, no la primera que devuelva la
  // base. Con dos abiertas a la vez, la que importa es la que toca antes.
  const enPreparacion = [...enPreparacionRows].sort((a, b) => a.fecha.localeCompare(b.fecha))[0]
  const itemsDeEsa = enPreparacion
    ? itemsRows.filter((i) => i.documentoId === enPreparacion.documentoId)
    : []
  const total = itemsDeEsa.length
  const llenados = itemsDeEsa.filter((i) => esLlenado(i.contenidoCrudo as ContenidoItemCrudo)).length

  const ultima = yaSucedidas[0]
  const proxima = futuras[0]

  // `activa` y `acuerdos` se calculan arriba, junto a `acuerdosParaReuniones`
  // (tarea 10) — ver su comentario para el porqué de que vivan ahí y no aquí.

  return {
    slug,
    nombre: tema.nombre,
    color: tema.primario,
    gradiente: tema.gradiente,
    diasDesdeUltima: ultima ? diasEntre(new Date(ultima.fecha), ahora) : null,
    // `diaCivil(ultima.fecha)`/`diaCivil(proxima.fecha)`, no
    // `isoFecha(new Date(...))` (hallazgo 2 de la revisión final de la
    // ronda 10, EL SÍNTOMA VERIFICADO): Mexa Creativa dio su reunión el
    // 15-jul a las 18:00 CDMX —la 00:00 UTC del 16-jul—, y la tarjeta del
    // hub decía "última reunión: 16 de julio". `ultima.fecha`/`proxima.fecha`
    // ya son el ISO completo del instante (`reunionesBase`, arriba: `r.fecha
    // .toISOString()`), así que `diaCivil` se les aplica directo, sin el
    // `new Date(...)` intermedio que solo repetía el mismo valor.
    ultimaSesion: ultima ? diaCivil(ultima.fecha) : null,
    proximaReunion: proxima ? diaCivil(proxima.fecha) : null,
    enPreparacion: enPreparacionRows.length > 0,
    avancePreparacion: enPreparacion ? avanceDeItems(enPreparacion.documentoListo, llenados, total) : undefined,
    documentoEnPreparacionId: enPreparacion?.id,
    seccionesEscritas: enPreparacion ? llenados : undefined,
    seccionesTotales: enPreparacion ? total : undefined,
    acuerdos,
    reuniones,
    cadencia: salaRow?.cadencia ?? 'mensual',
    activa,
    // `salaRow.pausadaDesde` es `new Date()` al momento del clic
    // (`src/db/salas.ts`) — un instante real, mismo caso que
    // `ultimaSesion`/`proximaReunion`: `diaCivil`, no `isoFecha`.
    pausadaDesde: salaRow?.pausadaDesde ? diaCivil(salaRow.pausadaDesde.toISOString()) : null,
    // Revisión final de la rama, punto 3: de la fila cruda, no de `tema`
    // (`Tema`/`cargarTemas()` no la traen a propósito — el logo nunca formó
    // parte de ese tipo, ver esquema.ts). `archivoDeLogo` cae al archivo
    // estático cuando esto es `null`.
    logoUrl: salaRow?.logoUrl ?? null,
  }
}

async function estadoDeSalasDB(): Promise<EstadoSala[]> {
  const slugs = await slugsDeSalas()
  const resueltos = await Promise.all(slugs.map((slug) => estadoDeSalaDB(slug)))
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

/**
 * EL PULSO DEL MES: dos cifras honestas donde antes había una que mezclaba
 * dos preguntas.
 *
 * Franco: «en el contador dice solo una sesión en el mes siendo que están
 * agendadas todas y registradas en la app». El campo que esto reemplaza,
 * `sesionesUltimos30`, no contaba lo que la etiqueta del hub prometía
 * ("con sesión este mes"): contaba SALAS —no reuniones— cuya ÚLTIMA sesión
 * `presentada`/`minutada` cayera en los últimos 30 días CORRIDOS desde hoy,
 * no en el mes natural. Con nueve salas sin ninguna sesión marcada como
 * presentada y una sola con una `minutada` reciente, el hub decía "1" aunque
 * hubiera ocho reuniones agendadas para este mes — el síntoma exacto.
 *
 * Ahora son dos preguntas, cada una con su cifra, sobre el MISMO mes:
 *
 * - `reunionesEsteMes`: cuántas REUNIONES —no salas: una sala con dos
 *   sesiones este mes cuenta dos— tienen su fecha en el mes NATURAL en
 *   curso, hora CDMX (`diaCivil`, la fuente única de "a qué día/mes
 *   pertenece un instante" — ver src/lib/fecha.ts), en cualquier estado. Las
 *   de una sala en pausa no cuentan: `activa === false` es justo "no hay
 *   reuniones ni gestión hasta nuevo aviso" (mismo criterio que
 *   `acuerdosAbiertos`/`acuerdosVencidos`, un poco más arriba).
 * - `reunionesDadas`: de esas mismas, cuántas ya se dieron según `fueDada`
 *   (`dominio/reunion.ts`) — explícita (`estado === 'dada'`) o deducida (algo
 *   la respalda —documento terminado, un archivo, o su minuta— y su día
 *   civil ya pasó, sin marcar "no se dio"). Es la MISMA función que usa
 *   `estadoDeSalaDB` para decidir `EstadoSala.reuniones`: si aquí y allá
 *   respondieran distinto, el pulso y "la sala" dirían dos cosas diferentes
 *   sobre si una reunión ocurrió — por eso este helper itera `sala.reuniones`
 *   (Tarea 7; antes `sala.sesiones`, un `SesionDeSala[]` retirado con esa
 *   tarea por no traer respaldo con que deducir "dada" bajo el modelo nuevo)
 *   y no una lista aparte.
 */
// Exportada — a diferencia de construirRiesgo, sin test directo — porque es
// la función exacta detrás del síntoma que reportó Franco: se prueba sola,
// sin pasar por Postgres, con el mismo criterio que el resto de "derivados
// puros" de este archivo (ver la cabecera). Ver src/db/consultas.test.ts.
export function construirPulso(salas: EstadoSala[], hoyCivil: string): PulsoDelMes {
  const mesActual = hoyCivil.slice(0, 7) // 'YYYY-MM'
  let reunionesEsteMes = 0
  let reunionesDadas = 0
  for (const sala of salas) {
    if (!sala.activa) continue
    for (const reunion of sala.reuniones) {
      if (diaCivil(reunion.fecha).slice(0, 7) !== mesActual) continue
      reunionesEsteMes++
      if (reunionDominio.fueDada(reunion, hoyCivil)) reunionesDadas++
    }
  }
  const abiertos = salas.reduce((n, s) => n + fallback.acuerdosAbiertos(s), 0)
  const vencidos = salas.reduce((n, s) => n + fallback.acuerdosVencidos(s), 0)
  return {
    salas: salas.length,
    reunionesEsteMes,
    reunionesDadas,
    acuerdosAbiertos: abiertos,
    acuerdosVencidos: vencidos,
    salaMasDesatendida: fallback.salaMasDesatendida(salas),
  }
}

// ---- API pública — misma firma que dominio/salas.ts, ahora async ----
//
// Sin DB delegan a `fallback.estadoDeSalas()` (src/dominio/salas.ts), que
// desde la ronda 8 (tarea 5) siempre devuelve `[]`: el store en memoria
// arranca vacío y solo tiene lo que se haya creado en la app durante esta
// ejecución del proceso, pero ya no hay de dónde sacar NI SIQUIERA el nombre
// o el color de una sala sin base —eso también es dato editable ahora, no
// configuración de código— así que no hay una lista de salas honesta que
// ofrecer. Hasta la tarea 5 este módulo sí armaba un `EstadoSala` por sala
// (usando `src/temas` para nombre/color) y le colgaba los acuerdos que
// hubiera en memoria; con `fallback.estadoDeSalas()` siempre vacío, esas
// cuatro funciones intermedias (`estadoDeSalasMemoria`, `estadoDeSalaMemoria`
// y sus dos ayudantes) solo podían devolver resultados vacíos también —
// código inalcanzable en la práctica, se quitaron en la revisión de esta
// tarea.

export async function estadoDeSalas(): Promise<EstadoSala[]> {
  if (!hayDB()) return fallback.estadoDeSalas()
  return estadoDeSalasDB()
}

export async function estadoDeSala(slug: string): Promise<EstadoSala | undefined> {
  if (!hayDB()) return fallback.estadoDeSalas().find((s) => s.slug === slug)
  return estadoDeSalaDB(slug)
}

export async function acuerdosEnRiesgo(): Promise<AcuerdoEnRiesgo[]> {
  if (!hayDB()) return construirRiesgo(fallback.estadoDeSalas())
  return construirRiesgo(await estadoDeSalasDB())
}

export async function pulsoDelMes(): Promise<PulsoDelMes> {
  const hoyCivil = diaCivil(new Date().toISOString())
  if (!hayDB()) return construirPulso(fallback.estadoDeSalas(), hoyCivil)
  return construirPulso(await estadoDeSalasDB(), hoyCivil)
}

// ---- Arrastrar acuerdos abiertos a la reunión (ronda 9, tarea 6) ----

/**
 * Los acuerdos que se pueden arrastrar a `reunionId`: los ABIERTOS de
 * `salaSlug` —abierto o vencido, con el mismo `estatusEfectivo` que usa toda
 * la app, freeze de la sala incluido— que el documento de esta reunión
 * TODAVÍA no retomó.
 *
 * "Abiertos de la sala" y no "de la última reunión" (Franco pidió lo
 * segundo, literalmente): un compromiso de hace dos meses que sigue sin
 * cerrarse es justo el que hay que retomar, y limitar la oferta a la reunión
 * anterior dejaría fuera lo más urgente. Los vencidos primero los ordena
 * `AcuerdosArrastrables` (src/componentes/editor), no esta función — aquí no
 * se promete un orden.
 *
 * "Ya retomado" se lee del PROPIO DOCUMENTO, no de una marca aparte
 * (revisión: la primera versión leía la `historia` del acuerdo, que solo
 * decía "se tocó" sin que nada cambiara en pantalla). `documentoDeReunion`
 * (ronda 10, tarea 5b — antes `obtenerSesion`) ya resuelve
 * `acuerdoIdsRetomados` de cada item contra la tabla `acuerdos` (ver
 * `resolverAcuerdosRetomados`, src/db/documentos.ts) — es la MISMA resolución
 * que usa el editor y "Maquetar", así que preguntarle a ella es preguntar
 * exactamente lo que decide si el acuerdo YA aparece en este documento. Una
 * reunión sin documento (todavía no se preparó nada) no tiene nada retomado
 * que descontar — `documentoDeReunion` da `null` y `yaRetomados` queda vacío.
 *
 * Sin DB no hay nada que ofrecer, mismo criterio que `todosLosAcuerdos`.
 */
export async function acuerdosArrastrablesDe(salaSlug: string, reunionId: string): Promise<Acuerdo[]> {
  if (!hayDB()) return []

  const [documento, filas] = await Promise.all([
    documentoDeReunion(reunionId),
    db()
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
      .where(eq(esquema.acuerdos.salaSlug, salaSlug)),
  ])

  const yaRetomados = new Set((documento?.items ?? []).flatMap((i) => i.acuerdosRetomados.map((a) => a.id)))
  // `diaCivil`, no `isoFecha(new Date())` (hallazgo 1 de la revisión final
  // de la ronda 10): "ahora" es un instante real, no un valor congelado en
  // UTC — ver el comentario de cabecera de `isoFecha`, arriba.
  const hoyCivil = diaCivil(new Date().toISOString())

  return filas
    .map((f) => {
      // `fechaCompromiso` SÍ sigue usando `isoFecha` — es la excepción que
      // documenta su comentario de cabecera, no un descuido.
      const fechaCompromiso = f.fechaCompromiso ? isoFecha(f.fechaCompromiso) : null
      const estatus = fallback.estatusEfectivo(
        { estatus: f.estatus as fallback.EstatusAcuerdo, fechaCompromiso },
        f.salaActiva,
        hoyCivil,
      )
      return {
        id: f.id,
        que: f.que,
        responsable: f.responsable,
        squad: f.squad ?? undefined,
        fechaCompromiso,
        estatus,
        destacado: f.destacado,
      }
    })
    .filter((a) => a.estatus === 'abierto' || a.estatus === 'vencido')
    .filter((a) => !yaRetomados.has(a.id))
}

// ---- El espacio de acuerdos: las diez salas juntas (tarea 11, ronda 7) ----

/**
 * Un acuerdo con el contexto de su sala, para `/acuerdos`: "qué le debemos a
 * quién esta semana" sin entrar sala por sala.
 */
export interface AcuerdoConSala extends Acuerdo {
  /**
   * El día de la reunión en la que se acordó, si salió de una. Acompaña al
   * `reunionOrigenId` que ya venía de `Acuerdo`: el id solo no basta para
   * escribir "de la reunión del 23 jul", y sin esa línea el Home no puede
   * pintar la misma fila que la sala.
   */
  reunionOrigenFecha?: string | null
  salaSlug: string
  salaNombre: string
  salaColor: string
  /** Una sala en pausa congela sus acuerdos — ver TablaAcuerdos y la nota de abajo. */
  salaActiva: boolean
  destacado: boolean
}

/**
 * El nombre y color de marca de una sala, sin reventar si algún día hay una
 * fila con un `salaSlug` que no tiene tema en el registro. No debería pasar
 * —la FK de `acuerdos.salaSlug` exige que la sala exista, `crearAcuerdo` ya
 * valida contra `slugsDeSalas()` al dar de alta, y desde la ronda 8 las
 * columnas de marca son `NOT NULL`— pero un texto de más en esta lista es
 * más barato que la pantalla entera sin cargar.
 *
 * `AcuerdoConSala.salaColor` es un `string` obligatorio, así que aquí hace
 * falta devolver un color de verdad (`'#666666'`) cuando no hay tema.
 */
function temaDeSalaSeguro(slug: string, registro: Record<string, Tema>): { nombre: string; color: string } {
  const tema = registro[slug]
  return tema ? { nombre: tema.nombre, color: tema.primario } : { nombre: slug, color: '#666666' }
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

  // `diaCivil`, no `isoFecha(new Date())` (hallazgo 1 de la revisión final
  // de la ronda 10) — mismo motivo que en `acuerdosArrastrablesDe`, arriba:
  // este es el TERCER call site independiente del mismo bug en este archivo.
  const hoyCivil = diaCivil(new Date().toISOString())
  const registro = await cargarTemas()
  const filas = await db()
    .select({
      id: esquema.acuerdos.id,
      que: esquema.acuerdos.que,
      responsable: esquema.acuerdos.responsable,
      squad: esquema.acuerdos.squad,
      fechaCompromiso: esquema.acuerdos.fechaCompromiso,
      estatus: esquema.acuerdos.estatus,
      destacado: esquema.acuerdos.destacado,
      salaSlug: esquema.acuerdos.salaSlug,
      salaActiva: esquema.salas.activa,
      // DE QUÉ REUNIÓN SALIÓ, con su FECHA (ronda 12). El id ya viajaba y no
      // servía de nada aquí: para escribir "de la reunión del 23 jul" hace
      // falta el día, y sin él el Home no podía pintar la misma fila que la
      // sala — que es lo que pidió Franco. `leftJoin` porque un acuerdo puede
      // no venir de ninguna reunión (se levantan también a mano).
      reunionOrigenId: esquema.acuerdos.reunionOrigenId,
      reunionOrigenFecha: esquema.reuniones.fecha,
    })
    .from(esquema.acuerdos)
    .innerJoin(esquema.salas, eq(esquema.acuerdos.salaSlug, esquema.salas.slug))
    .leftJoin(esquema.reuniones, eq(esquema.acuerdos.reunionOrigenId, esquema.reuniones.id))

  return filas
    // 'cancelado' deja de mostrarse, igual que en la vista de sala (ver el
    // comentario de estadoDeSalaDB): un acuerdo cancelado es como si nunca
    // hubiera existido.
    .filter((f) => f.estatus !== 'cancelado')
    .map((f) => {
      const tema = temaDeSalaSeguro(f.salaSlug, registro)
      // `fechaCompromiso` SÍ sigue usando `isoFecha` — ver su comentario de
      // cabecera: es la excepción, no un descuido.
      const fechaCompromiso = f.fechaCompromiso ? isoFecha(f.fechaCompromiso) : null
      const estatusGuardado = f.estatus as fallback.EstatusAcuerdo
      const estatus = fallback.estatusEfectivo({ estatus: estatusGuardado, fechaCompromiso }, f.salaActiva, hoyCivil)
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
        reunionOrigenId: f.reunionOrigenId,
        // Día civil anclado a CDMX, como toda fecha que se ESCRIBE en esta
        // app: el instante guardado en UTC se corre un día si se recorta a
        // secas (ver la cabecera de `lib/fecha.ts`).
        reunionOrigenFecha: f.reunionOrigenFecha ? diaCivil(f.reunionOrigenFecha.toISOString()) : null,
      }
    })
    // La fecha más próxima primero; sin fecha, al final — mismo criterio que
    // acuerdosPendientesDeSubir: es lo que más urge mirar primero.
    .sort((a, b) => (a.fechaCompromiso ?? '9999-99-99').localeCompare(b.fechaCompromiso ?? '9999-99-99'))
}
