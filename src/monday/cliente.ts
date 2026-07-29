import { consultarMonday, ErrorMonday, tokenDeMonday } from './red'
import {
  TABLERO, TABLERO_SUBELEMENTOS, COLUMNA, UDN_DE_SALA, SALA_DE_UDN,
  FASE_DE_ESTATUS, estatusDeFase, fechaDeColumna, nombreEnMonday, queSinPrefijo,
  columnasDe,
} from './mapeo'
import type { EstatusGuardado, DestinoMonday } from './mapeo'

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
 * ¿Sigue existiendo el grupo al que escribimos?
 *
 * Existe por lo que le pasó al dashboard viejo: escribe desde hace meses a un
 * grupo que alguien borró, y nadie se enteró porque nada avisa. Un id de grupo
 * en una constante no es una garantía de nada.
 */
export async function existeElGrupo(): Promise<boolean> {
  const grupo = grupoDeAcuerdos()
  if (!grupo) return false
  const datos = await consultarMonday<{ boards: Array<{ groups: Array<{ id: string }> }> }>(
    `query ($tablero: [ID!], $grupo: [String!]) {
       boards(ids: $tablero) { groups(ids: $grupo) { id title } }
     }`,
    { tablero: [String(TABLERO)], grupo: [grupo] },
  )
  return (datos.boards?.[0]?.groups?.length ?? 0) > 0
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
 */
export async function actualizarEnMonday(
  mondayId: string,
  destino: DestinoMonday,
  datos: { salaSlug: string; estatus: EstatusGuardado; fechaCompromiso: string | null },
): Promise<void> {
  if (!escrituraActiva()) throw new ErrorMonday('La escritura a Monday está desactivada.')

  await consultarMonday(
    `mutation ($tablero: ID!, $item: ID!, $valores: JSON!) {
       change_multiple_column_values(board_id: $tablero, item_id: $item, column_values: $valores) { id }
     }`,
    {
      tablero: String(destino === 'subelemento' ? TABLERO_SUBELEMENTOS : TABLERO),
      item: mondayId,
      valores: valoresDeColumna(datos, destino),
    },
  )
}

/** Borra un elemento. Lo usa la verificación, para no dejar rastro. */
export async function borrarEnMonday(mondayId: string): Promise<void> {
  if (!escrituraActiva()) throw new ErrorMonday('La escritura a Monday está desactivada.')
  await consultarMonday(`mutation ($item: ID!) { delete_item(item_id: $item) { id } }`, { item: mondayId })
}
