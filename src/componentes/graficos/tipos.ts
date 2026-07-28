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
 *
 * LA UNIDAD LA DECIDE EL EJE ENTERO, no cada marca por su cuenta.
 *
 * Antes cada valor miraba su propia magnitud, y un eje que iba de 0 a 15.000
 * salía "15 k · 10 k · 5,000 · 0": tres marcas en miles y una en unidades,
 * en la misma columna. Quien lo lee tiene que hacer la cuenta para saber si
 * 5,000 está por encima o por debajo de 10 k, que es justo lo que un eje
 * existe para ahorrar. Y de paso, "5,000" es más ancho que el carril y se
 * recortaba a "5,0".
 *
 * `techo` es el valor más alto del eje: de él sale la unidad de todas.
 */
export function formatearTick(
  valor: number,
  serie: Pick<SerieDatos, 'prefijo' | 'sufijo'>,
  techo?: number,
): string {
  // El cero no lleva unidad: "0 k" no es más preciso que "0", solo más raro.
  if (valor === 0) return `${serie.prefijo ?? ''}0${serie.sufijo ?? ''}`
  const escala = Math.abs(techo ?? valor)
  const cuerpo =
    escala >= 1_000_000
      ? `${(valor / 1_000_000).toLocaleString('es-MX', { maximumFractionDigits: 1 })} M`
      : escala >= 10_000
        ? `${(valor / 1_000).toLocaleString('es-MX', { maximumFractionDigits: 1 })} k`
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
