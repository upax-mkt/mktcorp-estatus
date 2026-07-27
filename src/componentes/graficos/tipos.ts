/**
 * Lo que un gráfico necesita para dibujarse. Es el reflejo, ya en números, de
 * lo que el esquema de decisión deja pedir a la IA (`src/decision/esquema.ts`).
 */

/** En qué eje se lee una serie cuando el gráfico tiene dos escalas. */
export type Eje = 'izquierdo' | 'derecho'

/** Cómo se dibuja una serie. `linea-punteada` es la convención para una meta. */
export type FormaSerie = 'barra' | 'linea' | 'linea-punteada' | 'area'

export interface SerieDatos {
  etiqueta: string
  valores: number[]
  /** Por defecto, barra. */
  forma?: FormaSerie
  /** Por defecto, izquierdo. */
  eje?: Eje
  /** Lo que va delante del número al escribirlo ("$"). */
  prefijo?: string
  /** Lo que va detrás ("%", " MDP"). */
  sufijo?: string
  /**
   * Qué color de la escala le toca (0–5). Por defecto, su posición en el array.
   *
   * Existe porque un gráfico de dos escalas se parte en dos facetas, y cada
   * faceta recibe SU trozo de series: sin esto, la primera serie de la faceta
   * de abajo volvía a pintarse con `--dato-1` —el color que la leyenda, que sí
   * ve la lista entera, había asignado a la primera serie de arriba—. Dos
   * series distintas del mismo color, con una leyenda que decía otra cosa.
   */
  ranuraColor?: number
}

export interface DatosGrafico {
  categorias: string[]
  series: SerieDatos[]
}

/** Escribe un valor con la unidad de su serie: 3591 → "$3,591". */
export function formatearValor(
  valor: number,
  serie: Pick<SerieDatos, 'prefijo' | 'sufijo'>,
): string {
  return `${serie.prefijo ?? ''}${valor.toLocaleString('es-MX')}${serie.sufijo ?? ''}`
}

/**
 * Lo que escribe el EJE. Misma unidad que los rótulos de dato —antes el rótulo
 * decía "$28,235.46" y el eje "29.473", sin decir de qué— y compactado, para
 * que un eje de millones no mida ocho dígitos.
 */
export function formatearTick(valor: number, serie: Pick<SerieDatos, 'prefijo' | 'sufijo'>): string {
  const abs = Math.abs(valor)
  const cuerpo =
    abs >= 1_000_000
      ? `${(valor / 1_000_000).toLocaleString('es-MX', { maximumFractionDigits: 1 })} M`
      : abs >= 10_000
        ? `${(valor / 1_000).toLocaleString('es-MX', { maximumFractionDigits: 0 })} k`
        : valor.toLocaleString('es-MX')
  return `${serie.prefijo ?? ''}${cuerpo}${serie.sufijo ?? ''}`
}

/**
 * El token de color con el que se dibuja una serie. `respaldo` es su posición
 * en la lista, que es lo que manda cuando nadie asignó ranura (un gráfico
 * dibujado suelto, sin pasar por `Grafico`).
 */
export function colorDeSerie(serie: Pick<SerieDatos, 'ranuraColor'>, respaldo = 0): string {
  return `var(--dato-${((serie.ranuraColor ?? respaldo) % 6) + 1})`
}

export function esLinea(serie: SerieDatos): boolean {
  return serie.forma === 'linea' || serie.forma === 'linea-punteada' || serie.forma === 'area'
}
