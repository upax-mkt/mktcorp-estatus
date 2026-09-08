import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * ⚠️ LAS FECHAS DEL CONCURSO NO SE ESCRIBEN A MANO EN UNA PANTALLA (7-sep-2026).
 *
 * Al correr el cierre del lunes 11:00 al miércoles 10:00, `config.ts` se
 * actualizó en una línea y la app dejó de aceptar propuestas a la hora nueva
 * —pero el hero seguía diciendo «VOTA 7–8 SEP», las bases «súbelo antes del 7»,
 * el pase «hasta el 8 a las 18:00» y el anuncio del home «hasta el 7 de
 * septiembre, 11:00»—. Cinco textos mintiendo, ningún test rojo: nada compara
 * una frase con una constante.
 *
 * Esto lo hace. Recorre las pantallas del concurso y falla si encuentra una
 * fecha u hora literal fuera de `config.ts`. La única forma de pasar es
 * derivarla de `FECHAS_CONCURSO` con `concurso/textos.ts`.
 *
 * Se miran los archivos y no el render porque el punto es justo el que un
 * render no ve: que la frase y la constante puedan separarse sin que nadie
 * se entere.
 */
const RAIZ = join(__dirname, '../..')

const PANTALLAS = [
  'src/app/concurso/page.tsx',
  ...readdirSync(join(RAIZ, 'src/componentes/concurso'))
    .filter((f) => f.endsWith('.tsx') && !f.includes('.test.'))
    .map((f) => `src/componentes/concurso/${f}`),
]

/** Sin comentarios: ahí las fechas son historia («Franco, 31-ago-2026»), no promesas. */
function codigo(ruta: string): string {
  return readFileSync(join(RAIZ, ruta), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
}

const PROHIBIDO: Array<[string, RegExp]> = [
  ['un mes escrito con letra', /\d{1,2}\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i],
  ['un mes abreviado', /\d{1,2}\s*[–-]?\s*(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\b/],
  ['una hora de reloj', /\b\d{1,2}:\d{2}\b/],
  // La sede se movió de «Sky Lobby, Sala 2» a «Sky 1» el mismo día que las
  // fechas, y estaba escrita a mano en dos pantallas. Ahora vive en CEREMONIA.
  ['la sede escrita a mano', /sky\s*(lobby|\d)/i],
]

describe('las fechas del concurso salen de una sola fuente', () => {
  it.each(PANTALLAS)('%s no escribe ninguna fecha a mano', (ruta) => {
    const fuente = codigo(ruta)
    for (const [que, patron] of PROHIBIDO) {
      const encontrado = fuente.match(patron)
      expect(
        encontrado,
        `${ruta} trae ${que} (${encontrado?.[0]}). Derívala de FECHAS_CONCURSO con concurso/textos.ts.`,
      ).toBeNull()
    }
  })

  it('las pantallas leen la configuración en vez de repetirla', () => {
    const consumidores = PANTALLAS.filter((r) => /FECHAS_CONCURSO/.test(codigo(r)))
    expect(consumidores.length).toBeGreaterThanOrEqual(3)
  })
})
