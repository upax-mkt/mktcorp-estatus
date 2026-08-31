import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * EL LINEUP ES ANÓNIMO DE VERDAD (31-ago-2026).
 *
 * Franco: *«en el lineup las propuestas serán anónimas, solo yo podré ver desde
 * la administración quién fue»*.
 *
 * ⚠️ EL ANONIMATO NO ES OCULTAR EL NOMBRE EN PANTALLA. Si los integrantes
 * viajan al navegador y el componente decide no pintarlos, cualquiera los lee
 * abriendo las herramientas del navegador o mirando el HTML servido: el
 * anonimato quedaría a merced de una línea de JSX que alguien puede cambiar sin
 * darse cuenta de lo que sostiene.
 *
 * Por eso `galeriaConcurso` devuelve `PropuestaAnonima`, un tipo que NO TIENE el
 * campo, y `esMia` lo resuelve el servidor: a cada quien se le dice cuál es la
 * suya —que ya sabe— y nada más.
 *
 * Se comprueba leyendo la fuente y no ejecutándola porque `db/concurso.ts`
 * importa `server-only` y no se puede montar en un test. Lo que hay que impedir
 * es que alguien devuelva `integrantes` a ese camino, y eso sí se lee.
 */
const DB = readFileSync(join(__dirname, '../db/concurso.ts'), 'utf8')
const GALERIA_FUENTE = readFileSync(join(__dirname, '../componentes/concurso/GaleriaConcurso.tsx'), 'utf8')
/** Sin comentarios: ese archivo EXPLICA por qué ya no recibe `miCorreo`, y
 *  citarlo no es recibirlo. Mismo criterio que `agendar-no-crea-deck.test.ts`. */
const GALERIA = GALERIA_FUENTE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

describe('la galería no revela quién firma', () => {
  it('devuelve el tipo anónimo, no la propuesta completa', () => {
    expect(DB).toMatch(/export async function galeriaConcurso\([\s\S]{0,220}\): Promise<PropuestaAnonima\[\]>/)
  })

  it('y ese tipo no tiene integrantes', () => {
    const tipo = DB.slice(DB.indexOf('export interface PropuestaAnonima'), DB.indexOf('export async function galeriaConcurso'))
    expect(tipo).not.toContain('integrantes')
    expect(tipo).toContain('esMia')
  })

  /**
   * `esMia` se resuelve en el servidor comparando correos, y solo sale de ahí
   * el booleano. Es lo que permite no ofrecer votar la propia propuesta sin
   * mandar un solo correo al navegador.
   */
  it('esMia se calcula en el servidor', () => {
    const cuerpo = DB.slice(DB.indexOf('export async function galeriaConcurso'), DB.indexOf('export async function propuestasAdministracionConcurso'))
    expect(cuerpo).toMatch(/esMia:\s*Boolean\(/)
    expect(cuerpo).toContain('integrantes.some')
  })

  it('el componente del lineup ya no recibe correos ni autores', () => {
    expect(GALERIA).not.toContain('miCorreo')
    expect(GALERIA).not.toMatch(/propuesta\.integrantes/)
    expect(GALERIA).toContain('propuesta.esMia')
  })

  /**
   * La administración SÍ los ve: es el único sitio, y sin eso no se puede
   * administrar. Va con `PropuestaConcurso`, el tipo completo.
   */
  it('pero la administración sigue viendo al autor', () => {
    expect(DB).toMatch(/propuestasAdministracionConcurso\(\): Promise<PropuestaConcurso\[\]>/)
  })

  /**
   * Y la ceremonia también: el 9 de septiembre se revela de quién era. Los
   * resultados leen las propuestas COMPLETAS, y esa función solo devuelve algo
   * en fase `resultados`, así que no puede adelantarse.
   */
  it('y la revelación del ganador lleva su nombre', () => {
    const cuerpo = DB.slice(DB.indexOf('export async function resultadosConcurso'))
    expect(cuerpo).toContain("faseDelConcurso(ahora) !== 'resultados'")
    expect(cuerpo).toContain('ensamblarPropuestas()')
  })
})

/**
 * SIN JURADO: gana la más votada. Franco, el mismo día: *«hoy definimos que no
 * habrá jurado, solo voto del equipo»*.
 */
describe('el resultado no tiene mitad de jurado', () => {
  it('el cálculo no menciona jurado por ningún lado', () => {
    const resultados = readFileSync(join(__dirname, 'resultados.ts'), 'utf8')
    const codigo = resultados.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(codigo).not.toContain('calificacionJurado')
    expect(codigo).not.toMatch(/0\.7|0\.3\b/)
  })

  it('y la página no le promete al equipo un 70/30 que ya no existe', () => {
    const pagina = readFileSync(join(__dirname, '../app/concurso/page.tsx'), 'utf8')
    const visible = pagina.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(visible).not.toContain('30% del jurado')
    expect(visible).not.toContain('70% del equipo')
  })
})
