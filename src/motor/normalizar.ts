import type {
  EntradaCruda,
  Inventario,
  PiezaCifra,
  PiezaComparativo,
  PiezaInventario,
  PiezaSerie,
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
 * Clasifica una tabla cruda: una sola columna de datos (además de la etiqueta
 * de fila) → snapshot de un periodo, una pieza `cifra` por fila (no hay dos
 * periodos que comparar, así que semánticamente son cifras sueltas); dos
 * columnas → comparativo entre dos periodos; tres o más → serie temporal
 * (una pieza por fila/métrica). Con 0 columnas de datos, o sin filas, no hay
 * dato que preservar y la tabla se ignora explícitamente.
 */
function piezasDeTabla(tabla: string[][]): PiezaInventario[] {
  const [encabezado, ...filas] = tabla
  if (!encabezado) return []

  const columnasDeDatos = encabezado.length - 1

  if (columnasDeDatos <= 0 || filas.length === 0) {
    // Encabezado sin columna de datos (o tabla sin filas): no hay ninguna
    // cifra que rescatar, así que se ignora a propósito (no es el bug de
    // "tabla de 1 columna" que se pierde en silencio; aquí no hay nada).
    return []
  }

  if (columnasDeDatos === 1) {
    return filas.map(
      (fila): PiezaCifra => ({
        tipo: 'cifra',
        rotulo: fila[0] ?? '',
        valor: fila[1] ?? '',
      }),
    )
  }

  if (columnasDeDatos === 2) {
    const comparativo: PiezaComparativo = {
      tipo: 'comparativo',
      etiqueta: encabezado[0] ?? '',
      periodos: [encabezado[1], encabezado[2]],
      series: filas.map((fila) => ({
        etiqueta: fila[0] ?? '',
        valores: [fila[1] ?? '', fila[2] ?? ''],
      })),
    }
    return [comparativo]
  }

  const periodos = encabezado.slice(1)
  return filas.map(
    (fila): PiezaSerie => ({
      tipo: 'serie',
      etiqueta: fila[0] ?? '',
      periodos,
      valores: fila.slice(1),
    }),
  )
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
