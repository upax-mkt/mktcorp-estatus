import {
  TABLERO, COLUMNA, UDN_DE_SALA, SALA_DE_UDN,
  FASE_DE_ESTATUS, estatusDeFase, fechaDeColumna, nombreEnMonday, queSinPrefijo,
} from './mapeo'
import type { EstatusGuardado } from './mapeo'

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

const API = 'https://api.monday.com/v2'

export function tokenDeMonday(): string | null {
  const t = process.env.MONDAY_TOKEN
  return t && t.trim().length > 0 ? t.trim() : null
}

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

export class ErrorMonday extends Error {}

async function consultar<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const token = tokenDeMonday()
  if (!token) throw new ErrorMonday('Falta MONDAY_TOKEN.')

  const respuesta = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
      // La API de Monday versiona por cabecera. Fijarla evita que un cambio
      // de su versión por defecto rompa esto sin que nadie toque el código.
      'API-Version': '2024-10',
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!respuesta.ok) {
    throw new ErrorMonday(`Monday respondió ${respuesta.status}.`)
  }
  const cuerpo = (await respuesta.json()) as { data?: T; errors?: Array<{ message: string }> }
  // Monday devuelve 200 con `errors` dentro: sin esto, un fallo de permisos
  // llegaría como un resultado vacío y parecería "no hay acuerdos".
  if (cuerpo.errors?.length) {
    throw new ErrorMonday(cuerpo.errors.map((e) => e.message).join('; '))
  }
  if (!cuerpo.data) throw new ErrorMonday('Monday no devolvió datos.')
  return cuerpo.data
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

  const datos = await consultar<{ boards: Array<{ groups: Array<{ items_page: { items: FilaMonday[] } }> }> }>(
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

function valoresDeColumna(datos: {
  salaSlug: string
  estatus: EstatusGuardado
  fechaCompromiso: string | null
}): string {
  const valores: Record<string, unknown> = {
    [COLUMNA.udn]: { label: UDN_DE_SALA[datos.salaSlug] },
    [COLUMNA.fase]: { label: FASE_DE_ESTATUS[datos.estatus] },
  }
  // Una fecha ausente se manda como objeto VACÍO, no se omite: omitirla deja
  // la que hubiera puesto otra persona, y "quitar la fecha" tiene que poder
  // hacerse.
  valores[COLUMNA.deadline] = datos.fechaCompromiso ? { date: datos.fechaCompromiso } : {}
  return JSON.stringify(valores)
}

/**
 * Crea el acuerdo en Monday y devuelve su id.
 *
 * El responsable NO se escribe: la columna es de personas y exige el id de
 * usuario de Monday, mientras que nuestro `responsable` es un nombre escrito
 * a mano ("Fernando Ruiz", "por asignar"). Adivinar la correspondencia
 * asignaría tareas a quien no toca, y en un tablero que el equipo entero mira
 * eso es peor que dejar la columna vacía. Queda como pendiente declarado.
 */
export async function crearEnMonday(datos: {
  salaSlug: string
  que: string
  estatus: EstatusGuardado
  fechaCompromiso: string | null
}): Promise<string> {
  if (!escrituraActiva()) throw new ErrorMonday('La escritura a Monday está desactivada.')

  const respuesta = await consultar<{ create_item: { id: string } }>(
    `mutation ($tablero: ID!, $grupo: String!, $nombre: String!, $valores: JSON!) {
       create_item(board_id: $tablero, group_id: $grupo, item_name: $nombre, column_values: $valores) { id }
     }`,
    {
      tablero: String(TABLERO),
      grupo: grupoDeAcuerdos(),
      nombre: nombreEnMonday(datos.salaSlug, datos.que),
      valores: valoresDeColumna(datos),
    },
  )
  return respuesta.create_item.id
}

/** Mueve el estatus y la fecha de un acuerdo que ya existe en Monday. */
export async function actualizarEnMonday(
  mondayId: string,
  datos: { salaSlug: string; estatus: EstatusGuardado; fechaCompromiso: string | null },
): Promise<void> {
  if (!escrituraActiva()) throw new ErrorMonday('La escritura a Monday está desactivada.')

  await consultar(
    `mutation ($tablero: ID!, $item: ID!, $valores: JSON!) {
       change_multiple_column_values(board_id: $tablero, item_id: $item, column_values: $valores) { id }
     }`,
    { tablero: String(TABLERO), item: mondayId, valores: valoresDeColumna(datos) },
  )
}

/** Borra un elemento. Lo usa la verificación, para no dejar rastro. */
export async function borrarEnMonday(mondayId: string): Promise<void> {
  if (!escrituraActiva()) throw new ErrorMonday('La escritura a Monday está desactivada.')
  await consultar(`mutation ($item: ID!) { delete_item(item_id: $item) { id } }`, { item: mondayId })
}
