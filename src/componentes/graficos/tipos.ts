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

export function esLinea(serie: SerieDatos): boolean {
  return serie.forma === 'linea' || serie.forma === 'linea-punteada' || serie.forma === 'area'
}
