/**
 * Etapa 1 del motor: tipos del inventario tipado que produce `normalizar()`
 * a partir del contenido crudo que el equipo pega o carga.
 */

/** Lo que el equipo pega/carga, sin procesar. */
export interface EntradaCruda {
  titulo: string
  texto?: string
  tablas?: string[][][]
  cifras?: { valor: string; rotulo: string; delta?: string }[]
  imagenes?: string[]
  /** Nota dirigida a la IA (instrucción u observación), se conserva tal cual. */
  nota?: string
}

export interface PiezaSerie {
  tipo: 'serie'
  etiqueta: string
  periodos: string[]
  valores: string[]
}

export interface PiezaComparativo {
  tipo: 'comparativo'
  etiqueta: string
  periodos: [string, string]
  series: { etiqueta: string; valores: [string, string] }[]
}

export interface PiezaCifra {
  tipo: 'cifra'
  valor: string
  rotulo: string
  delta?: string
}

export interface PiezaLista {
  tipo: 'lista'
  items: string[]
}

export interface PiezaParrafo {
  tipo: 'parrafo'
  texto: string
}

export interface PiezaImagen {
  tipo: 'imagen'
  ruta: string
}

export type PiezaInventario =
  | PiezaSerie
  | PiezaComparativo
  | PiezaCifra
  | PiezaLista
  | PiezaParrafo
  | PiezaImagen

export interface Inventario {
  titulo: string
  piezas: PiezaInventario[]
  nota?: string
}
