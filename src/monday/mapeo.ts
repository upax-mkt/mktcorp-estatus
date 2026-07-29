/**
 * El estatus tal como lo guarda la BASE, que es un superconjunto del que
 * enseña la interfaz: `cancelado` existe en la tabla y no en el dominio de
 * pantalla —una sala no muestra los cancelados— pero sí tiene que poder
 * viajar al tablero.
 */
export type EstatusGuardado = 'abierto' | 'cumplido' | 'vencido' | 'cancelado'

/**
 * EL MAPEO entre nuestros acuerdos y el tablero de Monday.
 *
 * Tablero `18044324200` — "Marketing Corporativo ⚡", 955 elementos, lo usa el
 * equipo entero. Los ids de columna salen de su estructura real, no de una
 * suposición: son los que devuelve la API hoy.
 *
 * Vive aparte del cliente a propósito. El mapeo es lo que hay que revisar
 * cuando alguien añada una etiqueta al tablero, y no debería obligar a leer
 * código de red para entenderlo.
 */

export const TABLERO = 18044324200

export const COLUMNA_ELEMENTO = {
  /** El texto del acuerdo. En Monday es el nombre del elemento. */
  que: 'name',
  /** De qué UDN es. */
  udn: 'color_mm0ex2j0',
  /** En qué va. Nuestro `estatus`. */
  fase: 'color_mkz09na',
  /** La fecha compromiso. */
  deadline: 'date_mm1b10rx',
  /** El squad dueño. */
  squad: 'color_mkz0s203',
  /** Quién responde. Columna de PERSONAS: exige ids de Monday, no nombres. */
  responsable: 'person',
} as const

/**
 * El tablero de SUBELEMENTOS. En Monday los subelementos viven en un tablero
 * propio, con columnas propias: las del elemento no valen aquí y usarlas no
 * revienta, simplemente crea el subelemento con todo vacío. Medido el
 * 29-jul-2026.
 */
export const TABLERO_SUBELEMENTOS = 18044759026

export type DestinoMonday = 'elemento' | 'subelemento'

export const COLUMNA_SUBELEMENTO = {
  que: 'name',
  udn: 'color_mm15emh7',
  fase: 'color_mkzjvp66',
  deadline: 'date_mm1hnswx',
  squad: 'color_mm15h1g6',
  responsable: 'person',
} as const

export function columnasDe(destino: DestinoMonday) {
  return destino === 'subelemento' ? COLUMNA_SUBELEMENTO : COLUMNA_ELEMENTO
}

/**
 * El ÍNDICE de cada etiqueta de UdN, no su texto.
 *
 * Para filtrar por una columna de estado, Monday compara contra el índice de la
 * etiqueta —`compare_value: [1]`, no `["Mexa Creativa"]`—. Los índices no son
 * correlativos: los tres últimos que se añadieron valen 105, 156 y 7. Medidos
 * el 29-jul-2026; si alguien reordena las etiquetas del tablero, esto miente y
 * el filtro devuelve la UDN equivocada.
 */
export const INDICE_UDN: Record<string, number> = {
  'zeus': 0,
  'mexa-creativa': 1,
  'neracode': 2,
  'promo-espacio': 3,
  'uix': 4,
  'house-of-films': 7,
  'ceci': 9,
  'grupo-upax': 10,
  'marketing-united': 105,
  'research-land': 156,
}

/** Retrocompatibilidad: COLUMNA es COLUMNA_ELEMENTO. */
export const COLUMNA = COLUMNA_ELEMENTO

/**
 * Nuestro slug de sala ↔ la etiqueta de UdN en Monday.
 *
 * No coinciden y no pueden coincidir: sus etiquetas son nombres para leer
 * ("Grupo Upax", "Neracode" sin la C mayúscula) y los nuestros son
 * identificadores. Escrito a mano y no derivado, porque derivarlo fallaría en
 * silencio el día que alguien renombre una etiqueta.
 *
 * Ceci es "Cecilia Fallabrino" en el tablero. Marketing United y Más Salud
 * existen ahí; Más Salud NO es una UDN nuestra (es de Grupo Salinas) y por
 * eso no aparece: si un acuerdo suyo llegara, se ignora.
 */
export const UDN_DE_SALA: Record<string, string> = {
  'research-land': 'Research Land',
  'promo-espacio': 'Promo Espacio',
  'marketing-united': 'Marketing United',
  'mexa-creativa': 'Mexa Creativa',
  'house-of-films': 'House of Films',
  'uix': 'UiX',
  'neracode': 'Neracode',
  'zeus': 'Zeus',
  'grupo-upax': 'Grupo Upax',
  'ceci': 'Cecilia Fallabrino',
}

export const SALA_DE_UDN: Record<string, string> = Object.fromEntries(
  Object.entries(UDN_DE_SALA).map(([slug, etiqueta]) => [etiqueta, slug]),
)

/**
 * Nuestro estatus → la Fase de Monday.
 *
 * `vencido` no tiene equivalente y no debe tenerlo: en nuestra app se DERIVA
 * de que la fecha quedó atrás (ver `estatusVigente`), no es un estado que
 * alguien elige. Escribirlo en Monday sería congelar en el tablero algo que
 * cambia solo con el calendario, y quedaría mintiendo en cuanto se moviera la
 * fecha. Un vencido va como Sprint: sigue abierto, y su retraso lo dice su
 * deadline.
 */
export const FASE_DE_ESTATUS: Record<EstatusGuardado, string> = {
  abierto: '🚧 Sprint',
  vencido: '🚧 Sprint',
  cumplido: '✅ Done',
  // Cancelado no es cumplido: el compromiso se dejó sin efecto. "Detenido" es
  // lo más cerca que tiene el tablero, y deja claro que ahí no se trabaja.
  cancelado: '🚫 Detenido',
}

/**
 * La Fase de Monday → nuestro estatus.
 *
 * Muchas a una: el tablero distingue seis fases de trabajo y a nosotros solo
 * nos importa si el compromiso sigue vivo. "Detenido" cuenta como abierto
 * —está parado, no cumplido— y quien mire la sala verá que su fecha pasó.
 */
export function estatusDeFase(fase: string | null | undefined): EstatusGuardado {
  if (!fase) return 'abierto'
  if (fase.includes('Done') || fase.includes('Materiales listos')) return 'cumplido'
  return 'abierto'
}

/**
 * La fecha que trae una columna de tipo `date` de Monday.
 *
 * Devuelve `null` con más formas de las que parece: sin fecha llega `null`, y
 * una fecha BORRADA llega como `{"changed_at": "…"}` — un objeto sin fecha
 * dentro. Leerlo sin comprobar daría un "[object Object]" por fecha
 * compromiso. Salió mirando elementos reales del tablero.
 */
export function fechaDeColumna(valor: unknown): string | null {
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor
  if (valor && typeof valor === 'object') {
    const date = (valor as { date?: unknown }).date
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  }
  return null
}

/**
 * El nombre del elemento en Monday.
 *
 * El tablero usa un prefijo por unidad —"RL | Weekly 27julio26", "Zeus |
 * Product sheets"— y respetarlo es lo que hace que nuestros acuerdos se lean
 * como parte del tablero y no como algo que llegó de fuera.
 */
const PREFIJO: Record<string, string> = {
  'research-land': 'RL', 'promo-espacio': 'PE', 'marketing-united': 'MU',
  'mexa-creativa': 'MC', 'house-of-films': 'HOF', 'uix': 'UIX',
  'neracode': 'NC', 'zeus': 'Zeus', 'grupo-upax': 'GU', 'ceci': 'CF',
}

export function nombreEnMonday(salaSlug: string, que: string): string {
  const p = PREFIJO[salaSlug]
  return p ? `${p} | ${que}` : que
}

/** Quita el prefijo al leer, para que la sala no muestre "NC | …". */
export function queSinPrefijo(nombre: string): string {
  const corte = nombre.indexOf(' | ')
  if (corte <= 0 || corte > 6) return nombre
  return nombre.slice(corte + 3)
}
