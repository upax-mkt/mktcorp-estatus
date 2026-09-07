import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * EL DEFECTO QUE IMPIDIÓ REEMPLAZAR UNA IMAGEN (7-sep-2026).
 *
 * Editar una propuesta borraba sus imágenes e insertaba las nuevas en UNA sola
 * sentencia, con `borradas` e `imagenes` como ramas del mismo `WITH`. Las
 * subconsultas de un CTE comparten snapshot y no ven los efectos de las otras,
 * pero el índice único `imagenes_propuesta_orden_unico` sobre
 * (propuesta_id, orden) sí sigue viendo la fila que el DELETE acaba de marcar.
 * Como `filasDeImagenes` numera desde 1, reemplazar la imagen 1 por otra imagen
 * 1 —el caso normal— chocaba siempre contra la vieja: clave duplicada.
 *
 * Se comprueba leyendo la fuente, como en `filas-imagenes.test.ts` y por la
 * misma razón: `src/db/concurso.ts` importa `server-only` y no se puede montar
 * en un test, así que el contrato se vigila sobre el texto del SQL.
 */
const FUENTE = readFileSync(join(__dirname, '../db/concurso.ts'), 'utf8')

/** El cuerpo de una función exportada, hasta la siguiente declaración. */
function cuerpoDe(nombre: string): string {
  const inicio = FUENTE.indexOf(`export async function ${nombre}(`)
  expect(inicio, `no se encontró ${nombre}`).toBeGreaterThan(-1)
  const resto = FUENTE.slice(inicio + 1)
  const fin = resto.search(/\nasync function |\nexport (async function|function|interface) /)
  return fin === -1 ? resto : resto.slice(0, fin)
}

/**
 * Cada plantilla sql`...` del bloque. Las consultas no llevan acentos graves
 * dentro, así que cerrar en el primer backtick basta y no hace falta un parser.
 */
function plantillasSQL(bloque: string): string[] {
  const plantillas: string[] = []
  let desde = 0
  for (;;) {
    const abre = bloque.indexOf('sql`', desde)
    if (abre === -1) return plantillas
    const cierra = bloque.indexOf('`', abre + 4)
    if (cierra === -1) return plantillas
    plantillas.push(bloque.slice(abre + 4, cierra))
    desde = cierra + 1
  }
}

describe('actualizarPropuestaConcurso', () => {
  const cuerpo = cuerpoDe('actualizarPropuestaConcurso')

  /** ⚠️ EL TEST QUE IMPIDE LA REGRESIÓN. */
  it('nunca borra e inserta imágenes en la misma sentencia', () => {
    for (const plantilla of plantillasSQL(cuerpo)) {
      const borra = /DELETE\s+FROM/i.test(plantilla)
      const inserta = /INSERT\s+INTO/i.test(plantilla)
      expect(
        borra && inserta,
        'un CTE que borra e inserta imágenes choca contra imagenes_propuesta_orden_unico',
      ).toBe(false)
    }
  })

  /**
   * Separarlas no puede costar la atomicidad: si el DELETE se aplicara y el
   * INSERT fallara, la propuesta se quedaría sin ninguna imagen.
   */
  it('manda las sentencias juntas, en una sola transacción', () => {
    expect(cuerpo, 'las sentencias deben viajar en un batch').toMatch(/\.batch\(\[/)
  })

  /**
   * Un lote no se aborta a media marcha: la comprobación de que quien edita es
   * integrante tiene que ir en LAS TRES sentencias, o el DELETE de imágenes se
   * aplicaría a la propuesta de otra persona.
   */
  it('repite el permiso en las tres sentencias del lote', () => {
    const conGuarda = plantillasSQL(cuerpo).filter((p) => p.includes('${esIntegrante}'))
    expect(conGuarda).toHaveLength(3)
    expect(cuerpo).toMatch(/const esIntegrante = sql`\s*EXISTS \(/)
  })
})
