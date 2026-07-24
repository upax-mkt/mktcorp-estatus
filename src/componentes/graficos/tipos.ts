export interface SerieDatos {
  etiqueta: string
  valores: number[]
}

export interface DatosGrafico {
  categorias: string[]
  series: SerieDatos[]
}
