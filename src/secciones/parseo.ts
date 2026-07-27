import type { Vineta } from '@/decision/esquema'
import { ESTADOS_SEMAFORO } from '@/decision/esquema'

/**
 * De lo que el equipo escribe o pega, a la sección estructurada.
 *
 * TRES CONVENCIONES, y solo tres, en todo el editor:
 *
 * 1. **Lo tabular se pega.** Una tabla, una matriz o los datos de un gráfico se
 *    copian de Sheets y se pegan tal cual: las celdas llegan separadas por
 *    tabulador. A mano se separan con "|".
 * 2. **La jerarquía se escribe con sangría.** Dos espacios (o un tabulador) al
 *    principio de una línea la cuelgan de la de arriba. Es lo que ya hace
 *    cualquiera al escribir una lista, y evita widgets anidados.
 * 3. **Lo repetido va en filas de campos**, no en sintaxis: un KPI son tres
 *    cajas, no "valor | rótulo | delta" que hay que recordar.
 *
 * Todo lo de aquí es puro: sin red, sin DOM. Se prueba solo.
 */

/** Separa una línea en celdas. El tabulador manda: una celda de Sheets puede llevar "|". */
export function celdasDeLinea(linea: string): string[] {
  return (linea.includes('\t') ? linea.split('\t') : linea.split('|')).map((c) => c.trim())
}

/** Cuántos niveles de sangría trae la línea. Un tabulador o dos espacios = un nivel. */
function nivelDeSangria(linea: string): number {
  const sangria = linea.match(/^[\t ]*/)?.[0] ?? ''
  let nivel = 0
  for (const caracter of sangria) nivel += caracter === '\t' ? 1 : 0.5
  return Math.floor(nivel)
}

/** Quita la sangría y el marcador de viñeta que la gente escribe por costumbre. */
function limpiarLinea(linea: string): string {
  return linea.replace(/^[\t ]*/, '').replace(/^[-*•]\s*/, '').trim()
}

const ES_URL = /^https?:\/\/\S+$/i

/**
 * Un texto con sangría, convertido en viñetas que cuelgan unas de otras.
 *
 * Una línea puede terminar en "| https://…" para llevar enlace. El "|" no
 * choca con nada aquí: las tablas se pegan en su propio campo.
 *
 * Una sangría que salta dos niveles de golpe no rompe nada: se trata como un
 * solo nivel más. Nadie debería perder su texto por haber tabulado de más.
 */
export function parsearVinetas(texto: string): Vineta[] {
  const raiz: Vineta[] = []
  // Pila de listas abiertas, una por nivel. La posición 0 es la raíz.
  const abiertas: Vineta[][] = [raiz]

  for (const linea of texto.split('\n')) {
    const contenido = limpiarLinea(linea)
    if (contenido.length === 0) continue

    // El nivel nunca puede saltar más de uno respecto a lo ya abierto.
    const nivel = Math.min(nivelDeSangria(linea), abiertas.length - 1)

    const partes = contenido.split('|').map((p) => p.trim())
    const posibleEnlace = partes.length > 1 ? partes[partes.length - 1] : ''
    const llevaEnlace = ES_URL.test(posibleEnlace)

    const vineta: Vineta = {
      texto: llevaEnlace ? partes.slice(0, -1).join(' | ').trim() : contenido,
    }
    if (llevaEnlace) vineta.enlace = posibleEnlace
    if (vineta.texto.length === 0) continue

    abiertas[nivel].push(vineta)
    // Esta viñeta pasa a ser el padre del nivel siguiente.
    vineta.hijos = []
    abiertas[nivel + 1] = vineta.hijos
    abiertas.length = nivel + 2
  }

  return limpiarHijosVacios(raiz)
}

/** `hijos: []` se crea siempre por si viene una sangría; se quita si nadie la usó. */
function limpiarHijosVacios(vinetas: Vineta[]): Vineta[] {
  return vinetas.map((v) => {
    const hijos = v.hijos && v.hijos.length > 0 ? limpiarHijosVacios(v.hijos) : undefined
    const limpia: Vineta = { texto: v.texto }
    if (v.enlace) limpia.enlace = v.enlace
    if (hijos) limpia.hijos = hijos
    return limpia
  })
}

/** El camino inverso: de viñetas a texto con sangría, para volver a editarlas. */
export function escribirVinetas(vinetas: Vineta[] | undefined, nivel = 0): string {
  if (!vinetas || vinetas.length === 0) return ''
  return vinetas
    .map((v) => {
      const linea = '  '.repeat(nivel) + v.texto + (v.enlace ? ` | ${v.enlace}` : '')
      const hijos = escribirVinetas(v.hijos, nivel + 1)
      return hijos ? `${linea}\n${hijos}` : linea
    })
    .join('\n')
}

/**
 * Una rejilla pegada: primera fila los encabezados, el resto los datos.
 *
 * Las filas cortas se rellenan y las largas se recortan al ancho del
 * encabezado: una fila desalineada descuadra la tabla entera, y perder una
 * celda de más es mejor que perder la rejilla.
 */
export function parsearRejilla(texto: string): string[][] {
  const filas = texto
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map(celdasDeLinea)

  const [encabezado, ...resto] = filas
  if (!encabezado) return []
  const ancho = encabezado.length
  return [encabezado, ...resto.map((f) => Array.from({ length: ancho }, (_, i) => f[i] ?? ''))]
}

export function escribirRejilla(columnas: string[], filas: string[][]): string {
  return [columnas, ...filas].map((f) => f.join(' | ')).join('\n')
}

/**
 * Qué estado de semáforo significa lo que escribió el equipo.
 *
 * Devuelve `undefined` cuando la celda está vacía o no dice nada reconocible:
 * en la tabla real hay tareas cuyo estatus nadie llenó, y poner un estado ahí
 * sería inventarlo.
 */
export function estadoDeTexto(celda: string): (typeof ESTADOS_SEMAFORO)[number] | undefined {
  const t = celda.trim().toLowerCase()
  if (t.length === 0) return undefined
  if (/^(listo|hecho|cumplido|ok|完)/.test(t)) return 'listo'
  if (/^(en proceso|en curso|avanzando|parcial)/.test(t)) return 'en-proceso'
  if (/^(no realizado|no hecho|pendiente|sin avance|atrasado)/.test(t)) return 'no-realizado'
  return undefined
}

/** Los tonos de la matriz, declarados por el equipo: "Vende | alto". */
export const TONOS = ['alto', 'medio', 'bajo', 'neutro'] as const
export type Tono = (typeof TONOS)[number]

export function parsearTonos(texto: string): Map<string, Tono> {
  const mapa = new Map<string, Tono>()
  for (const linea of texto.split('\n')) {
    const [palabra, tono] = celdasDeLinea(linea)
    if (!palabra || !tono) continue
    const normalizado = tono.trim().toLowerCase() as Tono
    if (TONOS.includes(normalizado)) mapa.set(palabra.trim().toLowerCase(), normalizado)
  }
  return mapa
}

export function escribirTonos(mapa: Map<string, Tono>): string {
  return [...mapa.entries()].map(([palabra, tono]) => `${palabra} | ${tono}`).join('\n')
}

/** Líneas sueltas, una idea por línea. Para `cuerpo` y para las leyendas. */
export function parsearLineas(texto: string): string[] {
  return texto
    .split('\n')
    .map((l) => limpiarLinea(l))
    .filter((l) => l.length > 0)
}

/** "Mkt | $36.1 MDP" por línea: las partes en que se abre una cifra. */
export function parsearPartes(texto: string): Array<{ rotulo: string; valor: string }> {
  return texto
    .split('\n')
    .map(celdasDeLinea)
    .filter((c) => c[0]?.length > 0 && c[1]?.length > 0)
    .map((c) => ({ rotulo: c[0], valor: c[1] }))
}

export function escribirPartes(partes: Array<{ rotulo: string; valor: string }> | undefined): string {
  if (!partes || partes.length === 0) return ''
  return partes.map((p) => `${p.rotulo} | ${p.valor}`).join('\n')
}

/**
 * De una rejilla a los datos de un gráfico: la primera fila son los periodos
 * (su primera celda se ignora, es el hueco de la esquina) y cada fila
 * siguiente es una serie, con su nombre en la primera celda.
 *
 * Un valor que no es número se lee como 0 y NO tumba el gráfico: quien pegó
 * una fila con un "n/d" prefiere ver el resto dibujado a perderlo todo.
 * Las comas de millar y los símbolos de moneda se ignoran al leer, porque así
 * es como vienen pegados desde una hoja de cálculo.
 */
export function numeroDeCelda(celda: string): number {
  const limpio = celda.replace(/[^\d.,-]/g, '').replace(/,/g, '')
  const n = Number(limpio)
  return Number.isFinite(n) ? n : 0
}

export interface DatosPegados {
  periodos: string[]
  series: Array<{ etiqueta: string; valores: number[] }>
}

export function parsearDatosDeGrafico(texto: string): DatosPegados {
  const rejilla = parsearRejilla(texto)
  const [encabezado, ...filas] = rejilla
  if (!encabezado) return { periodos: [], series: [] }
  return {
    periodos: encabezado.slice(1).filter((p) => p.length > 0),
    series: filas
      .filter((f) => f[0]?.length > 0)
      .map((f) => ({ etiqueta: f[0], valores: f.slice(1).map(numeroDeCelda) })),
  }
}

export function escribirDatosDeGrafico(
  periodos: string[] | undefined,
  series: Array<{ etiqueta: string; valores: number[] }> | undefined,
): string {
  if (!periodos || periodos.length === 0) return ''
  const filas = (series ?? []).map((s) => [s.etiqueta, ...s.valores.map(String)])
  return escribirRejilla(['', ...periodos], filas)
}
