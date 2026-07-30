import { consultarMonday, ErrorMonday, tokenDeMonday } from './red'
import {
  TABLERO, TABLERO_SUBELEMENTOS, COLUMNA, COLUMNA_ELEMENTO, UDN_DE_SALA, SALA_DE_UDN,
  FASE_DE_ESTATUS, estatusDeFase, fechaDeColumna, nombreEnMonday, queSinPrefijo,
  columnasDe, INDICE_UDN,
} from './mapeo'
import type { EstatusGuardado, DestinoMonday } from './mapeo'
// Solo el TIPO: sincronizar.ts importa de aquí en tiempo de ejecución
// (actualizarEnMonday, ErrorMonday, escrituraActiva), así que un import de
// valor en este sentido crearía un ciclo real. `import type` se borra al
// compilar y no lo crea.
import type { EstadoEnMonday } from './sincronizar'

export { ErrorMonday, tokenDeMonday }

/**
 * EL CLIENTE DE MONDAY.
 *
 * Franco: "este módulo se debe conectar a Monday y escribir ida y vuelta".
 *
 * DOS INTERRUPTORES, y son distintos a propósito:
 *
 *   MONDAY_TOKEN            — sin él no hay integración de ninguna clase.
 *   MONDAY_ESCRITURA=si     — sin él se LEE pero no se escribe.
 *
 * El segundo existe porque ese tablero tiene 955 elementos y lo usa el equipo
 * entero: una escritura equivocada no la sufre esta app, la sufre gente que
 * no sabe que esta app existe. Leer es reversible mirando a otro lado;
 * escribir, no.
 *
 * DÓNDE SE ESCRIBEN LOS ACUERDOS — pendiente de Franco. El tablero tiene un
 * grupo "Delivery Mkt Corp 2026" (entregables) y otro "Reuniones Semanales…"
 * que contiene LAS REUNIONES, no sus acuerdos. Ninguno es una lista limpia de
 * compromisos, así que `MONDAY_GRUPO` decide y por defecto no hay ninguno:
 * sin él la escritura se niega en vez de adivinar dónde meter 955 vecinos.
 */

export function mondayConectado(): boolean {
  return tokenDeMonday() !== null
}

export function grupoDeAcuerdos(): string | null {
  const g = process.env.MONDAY_GRUPO
  return g && g.trim().length > 0 ? g.trim() : null
}

/** true si además de leer se puede escribir. Ver la cabecera. */
export function escrituraActiva(): boolean {
  return mondayConectado() && process.env.MONDAY_ESCRITURA === 'si' && grupoDeAcuerdos() !== null
}

export interface AcuerdoDeMonday {
  mondayId: string
  que: string
  salaSlug: string | null
  estatus: EstatusGuardado
  fechaCompromiso: string | null
  responsable: string
  squad?: string
  url: string
}

interface FilaMonday {
  id: string
  name: string
  url: string
  column_values: Array<{ id: string; text: string | null; value: string | null }>
}

function leerFila(fila: FilaMonday): AcuerdoDeMonday {
  const col = (id: string) => fila.column_values.find((c) => c.id === id)
  const udn = col(COLUMNA.udn)?.text ?? null
  const crudaFecha = col(COLUMNA.deadline)
  const fecha = fechaDeColumna(
    crudaFecha?.value ? (JSON.parse(crudaFecha.value) as unknown) : crudaFecha?.text,
  )

  return {
    mondayId: fila.id,
    que: queSinPrefijo(fila.name),
    salaSlug: udn ? (SALA_DE_UDN[udn] ?? null) : null,
    estatus: estatusDeFase(col(COLUMNA.fase)?.text),
    fechaCompromiso: fecha,
    // Una columna de personas puede traer varias; se muestra la lista tal
    // cual. Vacía significa lo mismo que en nuestra app: sin dueño.
    responsable: col(COLUMNA.responsable)?.text?.trim() || 'por asignar',
    squad: col(COLUMNA.squad)?.text ?? undefined,
    url: fila.url,
  }
}

const CAMPOS = `
  id
  name
  url
  column_values(ids: ["${COLUMNA.udn}", "${COLUMNA.fase}", "${COLUMNA.deadline}", "${COLUMNA.squad}", "${COLUMNA.responsable}"]) {
    id
    text
    value
  }
`

/**
 * Los acuerdos de una sala que viven en Monday.
 *
 * Se limita al grupo configurado: sin él, esto devolvería los 955 elementos
 * del tablero como si todos fueran acuerdos de estatus.
 */
export async function acuerdosDeSalaEnMonday(salaSlug: string): Promise<AcuerdoDeMonday[]> {
  const grupo = grupoDeAcuerdos()
  if (!grupo) return []
  const udn = UDN_DE_SALA[salaSlug]
  if (!udn) return []

  const datos = await consultarMonday<{ boards: Array<{ groups: Array<{ items_page: { items: FilaMonday[] } }> }> }>(
    `query ($tablero: [ID!], $grupo: [String!]) {
       boards(ids: $tablero) {
         groups(ids: $grupo) {
           items_page(limit: 200) { items { ${CAMPOS} } }
         }
       }
     }`,
    { tablero: [String(TABLERO)], grupo: [grupo] },
  )

  const items = datos.boards?.[0]?.groups?.[0]?.items_page?.items ?? []
  return items.map(leerFila).filter((a) => a.salaSlug === salaSlug)
}

/** Lo que hace falta para escribir un acuerdo en Monday, sea elemento o subelemento. */
export interface DatosParaMonday {
  salaSlug: string
  que: string
  estatus: EstatusGuardado
  fechaCompromiso: string | null
  responsableMondayId: string | null
}

/**
 * Los valores de columna, comunes a crear y a actualizar.
 *
 * No pide `que`: ese campo es el NOMBRE del elemento (`item_name` en la
 * mutación), nunca una columna. Quien ya tiene un `DatosParaMonday` completo
 * lo puede seguir pasando igual — TypeScript ignora el campo de más.
 *
 * `destino` decide qué juego de columnas usar (ver `columnasDe` en
 * mapeo.ts): el elemento y el subelemento son dos tableros con dos juegos de
 * ids, y usar el del uno en el otro no da error, deja la columna vacía.
 */
function valoresDeColumna(
  datos: {
    salaSlug: string
    estatus: EstatusGuardado
    fechaCompromiso: string | null
    responsableMondayId?: string | null
  },
  destino: DestinoMonday,
): string {
  const col = columnasDe(destino)
  const valores: Record<string, unknown> = {
    [col.udn]: { label: UDN_DE_SALA[datos.salaSlug] },
    [col.fase]: { label: FASE_DE_ESTATUS[datos.estatus] },
    // Una fecha ausente se manda como objeto VACÍO, no se omite: omitirla deja
    // la que hubiera puesto otra persona, y "quitar la fecha" tiene que poder
    // hacerse.
    [col.deadline]: datos.fechaCompromiso ? { date: datos.fechaCompromiso } : {},
  }
  // La columna de personas exige el id numérico. Si no lo tenemos, se omite la
  // columna entera: dejarla vacía es honesto, inventar un id asigna trabajo a
  // quien no toca en un tablero que mira el equipo entero.
  //
  // Truthy a propósito (NO `!= null`): una cadena vacía tampoco es un id real,
  // y mandarla como número da `Number('') === 0` — un id de usuario que no
  // existe y asignaría el acuerdo a nadie. null, undefined y '' se omiten los
  // tres igual.
  if (datos.responsableMondayId) {
    valores[col.responsable] = {
      personsAndTeams: [{ id: Number(datos.responsableMondayId), kind: 'person' }],
    }
  }
  return JSON.stringify(valores)
}

/**
 * Los valores de columna para ACTUALIZAR un acuerdo que YA EXISTE en Monday —
 * distintos de `valoresDeColumna` (crear), con dos reglas propias que
 * corrigen el hallazgo crítico de la revisión final de la ronda 7:
 *
 * 1. **La UdN nunca se manda.** Un acuerdo no cambia de sala una vez creado
 *    (`CambiosAcuerdo`, en src/db/acuerdos.ts, no tiene `salaSlug`), así que
 *    no hay nada que actualizar — la UdN solo se escribe una vez, al nacer el
 *    elemento (`valoresDeColumna` desde `crearElementoEnDelivery`/
 *    `crearSubelemento`).
 * 2. **La Fase solo se manda si la CLASE de nuestro estatus cambió.** El
 *    tablero distingue seis fases (`⏳Backlog`, `🚧 Sprint`, `👀 Review`, `⚙️
 *    Modificación`, `✅ Done`, `🚫 Detenido`) y `estatusDeFase` (mapeo.ts) las
 *    colapsa a los cuatro estatus nuestros: Backlog/Sprint/Review/
 *    Modificación son las CUATRO `abierto`. Antes de esta corrección,
 *    `actualizarEnMonday` mandaba SIEMPRE `col.fase` con
 *    `FASE_DE_ESTATUS[abierto] = '🚧 Sprint'` — así que cualquier edición
 *    (incluida una que solo mueve la fecha: `editarAcuerdo` ni siquiera puede
 *    tocar el estatus, ver `CambiosAcuerdo`) devolvía a Sprint un acuerdo que
 *    el equipo tenía en Review, Backlog o Modificación. El daño lo sufría
 *    gente que no sabe que esta app existe, la línea roja que el propio
 *    diseño se puso (ver la cabecera de este archivo).
 *
 * `estatusAnterior` es el estatus que tenía el acuerdo ANTES de esta
 * escritura (ver `moverEstatus`/`editarAcuerdo` en src/db/acuerdos.ts, que lo
 * leen de la fila antes de tocarla). Comparar su CLASE (`FASE_DE_ESTATUS`)
 * contra la del estatus nuevo basta para decidir si hace falta escribir la
 * columna — y es más simple y más seguro que leer la fase que Monday tiene
 * AHORA MISMO antes de cada escritura:
 *
 * - No hace falta una consulta de red extra antes de cada actualización:
 *   `FASE_DE_ESTATUS` y `estatusDeFase` son inversas exactas (round-trip
 *   verificado: escribir `FASE_DE_ESTATUS[x]` y releerlo con `estatusDeFase`
 *   devuelve `x`), así que mientras nadie más toque el tablero, la fase
 *   remota YA está en la clase de nuestro último estatus escrito — comparar
 *   antes/después local equivale a comparar contra la fase remota real.
 * - Y cuando alguien SÍ toca el tablero a mano —el caso que de verdad importa
 *   aquí—, leer la fase remota en el momento de escribir mezclaría esta
 *   función con la reconciliación que YA existe para eso (`reconciliar` /
 *   `refrescarDesdeMonday`, ver sincronizar.ts): si el equipo puso el
 *   elemento en `✅ Done` a mano y nosotros mandamos una edición de fecha con
 *   estatus local `abierto` sin cambiar, comparar contra el remoto forzaría
 *   la fase de vuelta a Sprint, pisando ese `Done` — exactamente el tipo de
 *   pelea de escrituras que este archivo (ver su cabecera) existe para
 *   evitar. Comparar solo el antes/después LOCAL nunca pisa un estado que
 *   nosotros no escribimos.
 */
function valoresDeActualizacion(
  datos: { estatus: EstatusGuardado; fechaCompromiso: string | null },
  destino: DestinoMonday,
  estatusAnterior: EstatusGuardado,
): string {
  const col = columnasDe(destino)
  const valores: Record<string, unknown> = {
    [col.deadline]: datos.fechaCompromiso ? { date: datos.fechaCompromiso } : {},
  }
  if (FASE_DE_ESTATUS[estatusAnterior] !== FASE_DE_ESTATUS[datos.estatus]) {
    valores[col.fase] = { label: FASE_DE_ESTATUS[datos.estatus] }
  }
  return JSON.stringify(valores)
}

/**
 * ¿Sigue existiendo el grupo al que escribimos, y CUÁL es?
 *
 * Existe por lo que le pasó al dashboard viejo: escribe desde hace meses a un
 * grupo que alguien borró, y nadie se enteró porque nada avisa. Un id de grupo
 * en una constante no es una garantía de nada.
 *
 * Devuelve también `titulo` (revisión final de la ronda 7): existir no es lo
 * mismo que ser el grupo correcto. `MONDAY_GRUPO` es un id a mano en
 * `.env` — si alguien lo cambia por el de "Reuniones Semanales", "Done" o un
 * Benchmark, ese grupo SÍ existe y esta función diría que todo está bien,
 * pero cada acuerdo que se suba aterrizaría en el sitio equivocado del
 * tablero que mira el equipo entero. La query ya pedía `title`; antes se
 * descartaba. No se compara contra un nombre escrito a mano en el código
 * —el equipo puede renombrar el grupo en Monday sin avisar— así que la
 * defensa no es una comparación automática: es enseñárselo a quien confirma
 * la subida (ver la bandeja), para que sea una persona quien lo reconozca.
 */
export async function existeElGrupo(): Promise<{ existe: boolean; titulo: string | null }> {
  const grupo = grupoDeAcuerdos()
  if (!grupo) return { existe: false, titulo: null }
  const datos = await consultarMonday<{ boards: Array<{ groups: Array<{ id: string; title: string }> }> }>(
    `query ($tablero: [ID!], $grupo: [String!]) {
       boards(ids: $tablero) { groups(ids: $grupo) { id title } }
     }`,
    { tablero: [String(TABLERO)], grupo: [grupo] },
  )
  const encontrado = datos.boards?.[0]?.groups?.[0]
  return { existe: encontrado != null, titulo: encontrado?.title ?? null }
}

/** Crea el acuerdo como elemento nuevo en el grupo de Delivery. */
export async function crearElementoEnDelivery(
  datos: DatosParaMonday,
): Promise<{ id: string; url: string }> {
  if (!escrituraActiva()) throw new ErrorMonday('La escritura a Monday está desactivada.')
  const respuesta = await consultarMonday<{ create_item: { id: string; url: string } }>(
    `mutation ($tablero: ID!, $grupo: String!, $nombre: String!, $valores: JSON!) {
       create_item(board_id: $tablero, group_id: $grupo, item_name: $nombre, column_values: $valores) { id url }
     }`,
    {
      tablero: String(TABLERO),
      grupo: grupoDeAcuerdos(),
      nombre: nombreEnMonday(datos.salaSlug, datos.que),
      valores: valoresDeColumna(datos, 'elemento'),
    },
  )
  return respuesta.create_item
}

/**
 * Cuelga el acuerdo de un elemento que ya existe.
 *
 * El nombre va SIN prefijo: el padre ya dice de qué unidad es, y repetirlo
 * daría "MC | MC | …" en el tablero.
 */
export async function crearSubelemento(
  padreId: string,
  datos: DatosParaMonday,
): Promise<{ id: string; url: string }> {
  if (!escrituraActiva()) throw new ErrorMonday('La escritura a Monday está desactivada.')
  const respuesta = await consultarMonday<{ create_subitem: { id: string; url: string } }>(
    `mutation ($padre: ID!, $nombre: String!, $valores: JSON!) {
       create_subitem(parent_item_id: $padre, item_name: $nombre, column_values: $valores) { id url }
     }`,
    { padre: padreId, nombre: datos.que, valores: valoresDeColumna(datos, 'subelemento') },
  )
  return respuesta.create_subitem
}

/**
 * Mueve el estatus y la fecha de un acuerdo que ya existe en Monday.
 *
 * `destino` importa tanto como el id: un elemento y su subelemento no solo
 * tienen columnas distintas (ver `columnasDe` en mapeo.ts), viven en TABLEROS
 * distintos — el subelemento es un item de `TABLERO_SUBELEMENTOS`, no de
 * `TABLERO`. Mandar el board_id del elemento con el id de un subelemento no
 * lo mueve: Monday responde que el item no existe en ese tablero, porque de
 * verdad no existe ahí.
 *
 * `estatusAnterior` — el estatus del acuerdo antes de esta escritura — decide
 * si se manda la columna de Fase. Es OBLIGATORIO y a propósito no tiene
 * valor por defecto: un default "manda siempre" reintroduciría en silencio el
 * bug crítico de la revisión final de la ronda 7 (ver `valoresDeActualizacion`
 * para el porqué completo), y uno "nunca manda" dejaría acuerdos que sí
 * cambiaron de estatus sin reflejarse en el tablero. Cada llamador tiene que
 * decidirlo explícitamente.
 */
export async function actualizarEnMonday(
  mondayId: string,
  destino: DestinoMonday,
  datos: { estatus: EstatusGuardado; fechaCompromiso: string | null },
  estatusAnterior: EstatusGuardado,
): Promise<void> {
  if (!escrituraActiva()) throw new ErrorMonday('La escritura a Monday está desactivada.')

  await consultarMonday(
    `mutation ($tablero: ID!, $item: ID!, $valores: JSON!) {
       change_multiple_column_values(board_id: $tablero, item_id: $item, column_values: $valores) { id }
     }`,
    {
      tablero: String(destino === 'subelemento' ? TABLERO_SUBELEMENTOS : TABLERO),
      item: mondayId,
      valores: valoresDeActualizacion(datos, destino, estatusAnterior),
    },
  )
}

/** Borra un elemento. Lo usa la verificación, para no dejar rastro. */
export async function borrarEnMonday(mondayId: string): Promise<void> {
  if (!escrituraActiva()) throw new ErrorMonday('La escritura a Monday está desactivada.')
  await consultarMonday(`mutation ($item: ID!) { delete_item(item_id: $item) { id } }`, { item: mondayId })
}

export interface ElementoDeDelivery {
  id: string
  nombre: string
}

/**
 * Los elementos de Delivery de una UDN, para poder colgarles un acuerdo.
 *
 * Filtrar por la columna de UdN es lo que hace que la lista sea usable: el
 * grupo entero tiene 950 elementos y una UDN tiene ocho. Monday compara las
 * columnas de estado por el ÍNDICE de la etiqueta, no por su texto — ver
 * INDICE_UDN en mapeo.ts.
 *
 * Devuelve un objeto con `elementos` (la lista) y `truncado` (si se llegó al
 * límite de 100). Si hay más elementos, `truncado` es cierto y el consumidor debe
 * advertir al usuario: hoy una UDN tiene ocho, pero la pantalla tiene que estar
 * preparada por si el tablero crece.
 */
export async function elementosDeDelivery(
  salaSlug: string,
): Promise<{ elementos: ElementoDeDelivery[]; truncado: boolean }> {
  const grupo = grupoDeAcuerdos()
  const indice = INDICE_UDN[salaSlug]
  if (!grupo || indice === undefined) return { elementos: [], truncado: false }

  const datos = await consultarMonday<{
    boards: Array<{ groups: Array<{ items_page: { items: Array<{ id: string; name: string }> } }> }>
  }>(
    `query ($tablero: [ID!], $grupo: [String!], $udn: [CompareValue!]) {
       boards(ids: $tablero) {
         groups(ids: $grupo) {
           items_page(limit: 100, query_params: {
             rules: [{ column_id: "${COLUMNA_ELEMENTO.udn}", compare_value: $udn, operator: any_of }]
           }) { items { id name } }
         }
       }
     }`,
    { tablero: [String(TABLERO)], grupo: [grupo], udn: [indice] },
  )

  const items = datos.boards?.[0]?.groups?.[0]?.items_page?.items ?? []
  const elementos = items.map((i) => ({ id: i.id, nombre: i.name }))
  const truncado = elementos.length === 100
  return { elementos, truncado }
}

interface FilaLeida {
  id: string
  updated_at: string
  column_values: Array<{ id: string; text: string | null; value: string | null }>
}

/**
 * EL ESTADO EN MONDAY de los acuerdos que ya subimos — la vuelta.
 *
 * Pide SOLO los ids que ya conocemos, nunca el grupo: recorrer Delivery
 * serían 950 elementos para enterarse de veinte. Por eso usa `items(ids:
 * …)`, la consulta raíz de Monday que trae elementos por id sin pasar por
 * board/group — a diferencia de `acuerdosDeSalaEnMonday` y
 * `elementosDeDelivery`, que sí necesitan recorrer un grupo porque todavía
 * no saben qué id buscan.
 *
 * Dos consultas como mucho —una por tipo—, porque las columnas que hay que
 * leer (`columnasDe`) son distintas en el elemento y en el subelemento.
 *
 * El NOMBRE del elemento no se pide: el texto del acuerdo no vuelve de
 * Monday (ver la cabecera de sincronizar.ts). Si alguien renombra el
 * elemento allá, aquí se conserva lo que se pactó en la reunión.
 *
 * Un id que Monday no devuelve es un elemento borrado allá, y eso NO borra
 * nuestro acuerdo: se marca `existe: false` para que `reconciliar` (en
 * sincronizar.ts) decida — nunca se decide aquí.
 *
 * `reintentarSiLimitado: false` (revisión final de la ronda 7, punto 4): la
 * ÚNICA llamadora de esta función es `refrescarDesdeMonday`
 * (src/db/acuerdos.ts), que corre DENTRO del render de tres páginas. Un 429
 * ahí no puede esperar hasta 30 s con el `Retry-After` de Monday —eso es
 * colgar la carga de quien abrió la sala, no "tardar"—; se rinde al instante
 * y deja el refresco para la siguiente carga (`refrescarDesdeMondaySeguro`,
 * en cada página, ya atrapa cualquier `ErrorMonday`).
 */
export async function leerAcuerdosDeMonday(
  refs: Array<{ mondayId: string; tipo: DestinoMonday }>,
): Promise<Map<string, EstadoEnMonday>> {
  const salida = new Map<string, EstadoEnMonday>()
  if (refs.length === 0 || !mondayConectado()) return salida

  for (const tipo of ['elemento', 'subelemento'] as DestinoMonday[]) {
    const ids = refs.filter((r) => r.tipo === tipo).map((r) => r.mondayId)
    if (ids.length === 0) continue

    const col = columnasDe(tipo)
    const datos = await consultarMonday<{ items: FilaLeida[] }>(
      `query ($ids: [ID!]!) {
         items(ids: $ids) {
           id
           updated_at
           column_values(ids: ["${col.fase}", "${col.deadline}"]) { id text value }
         }
       }`,
      { ids },
      { reintentarSiLimitado: false },
    )

    const vistos = new Set<string>()
    for (const fila of datos.items ?? []) {
      const celda = (id: string) => fila.column_values.find((c) => c.id === id)
      const fecha = celda(col.deadline)
      salida.set(fila.id, {
        estatus: estatusDeFase(celda(col.fase)?.text),
        fechaCompromiso: fechaDeColumna(
          fecha?.value ? (JSON.parse(fecha.value) as unknown) : fecha?.text,
        ),
        actualizadoEn: new Date(fila.updated_at),
        existe: true,
      })
      vistos.add(fila.id)
    }

    // Los pedidos que Monday NO devolvió: elementos borrados allá.
    for (const id of ids) {
      if (!vistos.has(id)) {
        salida.set(id, {
          estatus: 'abierto',
          fechaCompromiso: null,
          actualizadoEn: new Date(0),
          existe: false,
        })
      }
    }
  }

  return salida
}
