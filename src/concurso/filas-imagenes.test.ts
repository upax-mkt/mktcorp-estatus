import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { filasDeImagenes } from './filas-imagenes'

/**
 * EL DEFECTO QUE DEJÓ EL CONCURSO INSERVIBLE (28-ago-2026).
 *
 * El JSON de imágenes viajaba con claves camelCase —`nombreOriginal`,
 * `tipoContenido`, `tamanoBytes`— y el `jsonb_to_recordset` del alta las
 * declara en snake_case, que es como se llaman las columnas. Postgres no avisa
 * de una clave ausente: devuelve NULL. Las tres columnas son `NOT NULL`, así
 * que **ninguna propuesta podía crearse**, y la cadena entera respondía 200:
 * token de Blob, subida a Blob y Server Action. Solo la base decía la verdad.
 *
 * Ni tsc ni los 2.067 tests podían verlo: el desajuste vive DENTRO de una
 * plantilla SQL, que para TypeScript es una cadena, y ningún test recorría
 * este camino contra una base de verdad.
 */
const ARCHIVOS = [
  {
    ruta: 'concurso/sudadera-2026/abc-diseno.png',
    nombreOriginal: 'diseño.png',
    tipoContenido: 'image/png',
    tamanoBytes: 7875,
  },
  {
    ruta: 'concurso/sudadera-2026/def-espalda.jpg',
    nombreOriginal: 'espalda.jpg',
    tipoContenido: 'image/jpeg',
    tamanoBytes: 120_000,
  },
]

/** Ids deterministas: lo que se comprueba es el mapeo, no el generador. */
function idsDePrueba() {
  let n = 0
  return () => `id-${++n}`
}

describe('filasDeImagenes', () => {
  it('traduce las claves del dominio a los nombres de columna', () => {
    const [primera] = filasDeImagenes(ARCHIVOS, idsDePrueba())

    expect(primera).toEqual({
      id: 'id-1',
      ruta: 'concurso/sudadera-2026/abc-diseno.png',
      nombre_original: 'diseño.png',
      tipo_contenido: 'image/png',
      tamano_bytes: 7875,
      orden: 1,
    })
  })

  /**
   * Las claves camelCase NO pueden sobrevivir al viaje: son justo las que
   * `jsonb_to_recordset` ignora, convirtiendo la fila en tres NULL.
   */
  it('no deja pasar ninguna clave camelCase', () => {
    for (const fila of filasDeImagenes(ARCHIVOS, idsDePrueba())) {
      for (const clave of Object.keys(fila)) {
        expect(clave, `"${clave}" viajaría en camelCase y llegaría como NULL`).not.toMatch(/[A-Z]/)
      }
    }
  })

  it('numera el orden desde uno y respeta el que trae la lista', () => {
    const filas = filasDeImagenes(ARCHIVOS, idsDePrueba())
    expect(filas.map((f) => f.orden)).toEqual([1, 2])
    expect(filas.map((f) => f.nombre_original)).toEqual(['diseño.png', 'espalda.jpg'])
  })

  it('sin archivos no produce filas', () => {
    expect(filasDeImagenes([], idsDePrueba())).toEqual([])
  })

  /**
   * ⚠️ EL TEST QUE DE VERDAD IMPIDE LA REGRESIÓN.
   *
   * Los de arriba fijan las claves que alguien escribió a mano hoy; este las
   * compara contra las que el SQL declara AHORA MISMO, leyéndolas del archivo.
   * Si alguien renombra una columna en el `jsonb_to_recordset` y no toca esta
   * función —o al revés—, el test cae. Sin él, las dos mitades del contrato
   * pueden separarse otra vez sin que nada se queje, que es exactamente lo que
   * pasó.
   */
  it('sus claves son las que el SQL del alta declara, ni una más ni una menos', () => {
    const fuente = readFileSync(join(__dirname, '../db/concurso.ts'), 'utf8')

    // El bloque `entrada(...)` que describe las columnas de imagen.
    const bloques = [...fuente.matchAll(/AS entrada\(([^)]*id text[^)]*)\)/g)]
    expect(bloques.length, 'no se encontró el jsonb_to_recordset de imágenes').toBeGreaterThan(0)

    const [fila] = filasDeImagenes(ARCHIVOS, idsDePrueba())
    const nuestras = Object.keys(fila).sort()

    for (const bloque of bloques) {
      const declaradas = [...bloque[1].matchAll(/(\w+)\s+(?:text|integer|bigint|boolean)/g)]
        .map((m) => m[1])
        .sort()
      expect(nuestras, `el SQL declara [${declaradas}] y la función produce [${nuestras}]`).toEqual(
        declaradas,
      )
    }
  })
})
