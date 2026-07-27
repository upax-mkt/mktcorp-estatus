import type {
  EntradaCruda,
  Inventario,
  PiezaCifra,
  PiezaInventario,
} from './inventario'

/** Umbral aproximado de largo para distinguir párrafo de lista/texto corto. */
const LARGO_PARRAFO = 120

/** ¿El texto trae viñetas ("-", "*", "•") o saltos de línea que sugieren una lista? */
function pareceLista(texto: string): boolean {
  return /(^|\n)\s*[-*•]/.test(texto) || texto.includes('\n')
}

function itemsDeLista(texto: string): string[] {
  return texto
    .split(/\n+/)
    .map((linea) => linea.replace(/^\s*[-*•]\s*/, '').trim())
    .filter((linea) => linea.length > 0)
}

/**
 * Clasifica una tabla cruda.
 *
 * UNA sola columna de datos (además de la etiqueta de fila) no es una tabla: es
 * la foto de un periodo, y cada fila es una cifra suelta. Se degrada a piezas
 * `cifra` a propósito — así entran en la regla dura de "ninguna cifra del
 * inventario se pierde", que es lo que de verdad protege ese contenido.
 *
 * DOS o más columnas de datos SÍ son una tabla, y se conserva entera. Antes se
 * troceaba en series y la rejilla desaparecía; el resultado era que la app no
 * podía reproducir una comparativa Mayo|Junio ni aunque el equipo la pegara.
 *
 * Con 0 columnas de datos, o sin filas, no hay nada que preservar.
 */
function piezasDeTabla(tabla: string[][]): PiezaInventario[] {
  const [encabezado, ...filas] = tabla
  if (!encabezado) return []

  const columnasDeDatos = encabezado.length - 1

  if (columnasDeDatos <= 0 || filas.length === 0) return []

  if (columnasDeDatos === 1) {
    return filas.map(
      (fila): PiezaCifra => ({
        tipo: 'cifra',
        rotulo: fila[0] ?? '',
        valor: fila[1] ?? '',
      }),
    )
  }

  return [{ tipo: 'tabla', columnas: encabezado, filas }]
}

/**
 * Etapa 1 del motor: convierte el contenido crudo que el equipo pega/carga
 * en un inventario tipado. Determinista, sin red y sin IA.
 */
export function normalizar(crudo: EntradaCruda): Inventario {
  const piezas: PiezaInventario[] = []

  for (const cifra of crudo.cifras ?? []) {
    piezas.push({
      tipo: 'cifra',
      valor: cifra.valor,
      rotulo: cifra.rotulo,
      delta: cifra.delta,
    })
  }

  for (const tabla of crudo.tablas ?? []) {
    piezas.push(...piezasDeTabla(tabla))
  }

  if (crudo.texto !== undefined) {
    const texto = crudo.texto.trim()
    if (texto.length === 0) {
      // Texto vacío o solo espacios: no hay dato que preservar, no se genera
      // una pieza de párrafo vacía que la etapa de IA tendría que filtrar.
    } else if (texto.length > LARGO_PARRAFO) {
      piezas.push({ tipo: 'parrafo', texto })
    } else if (pareceLista(crudo.texto)) {
      piezas.push({ tipo: 'lista', items: itemsDeLista(crudo.texto) })
    } else {
      piezas.push({ tipo: 'parrafo', texto })
    }
  }

  for (const ruta of crudo.imagenes ?? []) {
    piezas.push({ tipo: 'imagen', ruta })
  }

  const inventario: Inventario = { titulo: crudo.titulo, piezas }
  if (crudo.nota !== undefined) {
    inventario.nota = crudo.nota
  }
  return inventario
}
