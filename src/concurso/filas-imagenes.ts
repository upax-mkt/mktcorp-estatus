import type { ArchivoPropuesta } from './validacion'

/**
 * LAS FILAS DE IMAGEN, CON LAS CLAVES QUE EL SQL SABE LEER.
 *
 * ⚠️ ESTA FUNCIÓN EXISTE POR UN DEFECTO QUE DEJÓ EL CONCURSO INSERVIBLE, y el
 * porqué importa más que el qué.
 *
 * El alta de una propuesta es un CTE que mete las imágenes con
 * `jsonb_to_recordset(...) AS entrada(id text, ruta text, nombre_original text,
 * tipo_contenido text, tamano_bytes integer, orden integer)`. Esos nombres son
 * los de las COLUMNAS, en snake_case. El JSON se construía esparciendo el
 * objeto de dominio —`{ id, ...archivo, orden }`— cuyas claves son camelCase:
 * `nombreOriginal`, `tipoContenido`, `tamanoBytes`.
 *
 * `jsonb_to_recordset` no avisa de una clave que no encuentra: devuelve NULL.
 * Y como las tres columnas son `NOT NULL`, cada intento moría con una
 * violación de restricción. Resultado medido: **ninguna propuesta podía
 * subirse**, con el formulario devolviendo 200 en toda la cadena —token de
 * Blob, subida a Blob, Server Action— y la imagen ya pagada en el store.
 *
 * Nada lo delataba: tsc no ve dentro de una plantilla SQL, y los 2.067 tests
 * pasaban porque ninguno recorría este camino contra una base real.
 *
 * Se aísla aquí, fuera de `db/concurso.ts`, porque ese módulo importa
 * `server-only` y no se puede montar en un test. Aquí la conversión es una
 * función pura, y su test compara las claves que produce contra las que el
 * propio SQL declara — leyéndolo del archivo, para que no vuelvan a
 * separarse en silencio.
 */
export interface FilaImagenSQL {
  id: string
  ruta: string
  nombre_original: string
  tipo_contenido: string
  tamano_bytes: number
  orden: number
}

export function filasDeImagenes(
  archivos: ArchivoPropuesta[],
  nuevoId: () => string,
): FilaImagenSQL[] {
  return archivos.map((a, indice) => ({
    id: nuevoId(),
    ruta: a.ruta,
    nombre_original: a.nombreOriginal,
    tipo_contenido: a.tipoContenido,
    tamano_bytes: a.tamanoBytes,
    orden: indice + 1,
  }))
}
