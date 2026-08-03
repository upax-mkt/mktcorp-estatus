/**
 * Etapa 1 del motor: tipos del inventario tipado que produce `normalizar()`
 * a partir del contenido crudo que el equipo pega o carga.
 */
import type { BorradorSeccion } from '@/secciones/borrador'
import type { Acuerdo } from '@/dominio/salas'

/** Lo que el equipo pega/carga, sin procesar. */
export interface EntradaCruda {
  titulo: string
  texto?: string
  tablas?: string[][][]
  cifras?: { valor: string; rotulo: string; delta?: string }[]
  imagenes?: string[]
  /** Nota dirigida a la IA (instrucción u observación), se conserva tal cual. */
  nota?: string
  /**
   * La sección ya compuesta a mano en el editor. Cuando viene, MANDA: el
   * maquetado la usa tal cual y no llama a la IA. El resto de campos de aquí
   * son el material crudo del camino asistido, para cuando el equipo prefiere
   * pegar texto y pedir una propuesta.
   */
  seccion?: BorradorSeccion
  /**
   * Acuerdos abiertos de la sala retomados en este item, ya resueltos contra
   * `acuerdos` (ronda 9, tarea 6) — ver `resolverAcuerdosRetomados` en
   * src/db/sesiones.ts. `maquetarBorrador` los añade a la tabla del slide;
   * no participan del camino asistido por IA.
   */
  acuerdosRetomados?: Acuerdo[]
}

/**
 * Una rejilla de datos, tal como el equipo la pegó.
 *
 * Antes había dos piezas —`serie` y `comparativo`— que troceaban la tabla por
 * filas y se quedaban solo con los números. Servían para graficar, pero la
 * TABLA se perdía por el camino: el modelo nunca veía una rejilla, así que no
 * podía devolver una, y la comparativa Mayo|Junio del deck real no tenía forma
 * de existir. Una sola pieza que conserva la rejilla completa cubre los dos
 * casos: el modelo la muestra como tabla, la grafica, o las dos cosas.
 */
export interface PiezaTabla {
  tipo: 'tabla'
  /** Los encabezados, de izquierda a derecha. El primero suele ser la etiqueta de fila. */
  columnas: string[]
  /** Las filas de datos, cada una alineada a `columnas`. */
  filas: string[][]
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
  | PiezaTabla
  | PiezaCifra
  | PiezaLista
  | PiezaParrafo
  | PiezaImagen

export interface Inventario {
  titulo: string
  piezas: PiezaInventario[]
  nota?: string
}
