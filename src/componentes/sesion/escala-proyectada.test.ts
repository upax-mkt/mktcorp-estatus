import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * `--escala` TIENE QUE SER UN NÚMERO, y este test existe porque una vez no lo
 * fue y se llevó por delante el modo Presentar entero.
 *
 * Lo que pasó: la escala de proyección se escribió `clamp(1, 100vw / 900,
 * 1.55)`. Los topes son <number> y el valor de en medio es una <length> —una
 * unidad de viewport dividida entre un número sigue siendo longitud—, y
 * `clamp` exige los tres argumentos del mismo tipo. La expresión era inválida.
 *
 * Por qué no se cayó a la vista: `--escala` es una custom property, y esas se
 * guardan sin validar. El error no salta al declararla, salta al USARLA, en
 * cada uno de los `calc(<longitud> * var(--escala))` que dan la tipografía y
 * el espaciado. Todos inválidos a la vez, todos cayendo al valor por defecto
 * del navegador: título a 16 px y viñetas sin sangría, encima de la primera
 * letra. Y solo en modo Presentar, que es donde aplica esa regla — o sea, en
 * la única pantalla que se proyecta delante de un director.
 *
 * Se comprueba leyendo el CSS y no renderizando porque jsdom no calcula
 * `calc()` ni `clamp()`: aquí no hay motor de CSS que pueda delatar el fallo.
 * Lo que sí se puede comprobar, y es exactamente lo que falló, es que el valor
 * declarado sea adimensional.
 */

const CSS = readFileSync(join(__dirname, 'documento.module.css'), 'utf8')

/** Las unidades que convierten un valor en longitud y no en número. */
const UNIDADES = /\d(?:px|rem|em|vw|vh|vmin|vmax|ch|ex|cm|mm|in|pt|pc|%)/gi

/** Cada `--escala: <valor>;` declarado en la hoja, con su número de línea. */
function declaracionesDeEscala(): Array<{ linea: number; valor: string }> {
  return CSS.split('\n').flatMap((texto, i) => {
    const m = texto.match(/--escala:\s*([^;]+);/)
    return m ? [{ linea: i + 1, valor: m[1].trim() }] : []
  })
}

/**
 * Reduce el valor a lo que le queda de "longitud" después de las divisiones:
 * `100vw / 900px` cancela sus dos unidades y queda en número; `100vw / 900`
 * conserva una y por tanto es longitud.
 */
function unidadesSinCancelar(valor: string): number {
  return valor.split(/[,()]/).reduce((suma, trozo) => {
    const partes = trozo.split('/')
    const conUnidad = partes.filter((p) => (p.match(UNIDADES) ?? []).length > 0).length
    // Un cociente de dos longitudes es un número: solo cuenta el desbalance.
    return suma + (partes.length > 1 ? (conUnidad % 2) : conUnidad)
  }, 0)
}

describe('la escala del documento', () => {
  it('declara siempre un número adimensional, nunca una longitud', () => {
    const malas = declaracionesDeEscala().filter((d) => unidadesSinCancelar(d.valor) > 0)
    expect(
      malas,
      `--escala multiplica longitudes en calc(): si ella misma es una longitud, ` +
      `el calc() es inválido y la tipografía cae al tamaño por defecto. ` +
      `Revisa: ${malas.map((m) => `línea ${m.linea} → "${m.valor}"`).join(' · ')}`,
    ).toEqual([])
  })

  it('escala la proyección con el ancho, entre 1 y 1.55', () => {
    // La regla de proyectar es la que rompió: se comprueba que sigue ahí y que
    // conserva sus dos topes, no solo que sea sintácticamente válida.
    const proyectada = declaracionesDeEscala().find((d) => d.valor.includes('clamp'))
    expect(proyectada, 'falta la escala de modo Presentar').toBeDefined()
    expect(proyectada!.valor).toMatch(/clamp\(\s*1\s*,.*,\s*1\.55\s*\)/)
    expect(unidadesSinCancelar(proyectada!.valor)).toBe(0)
  })
})
