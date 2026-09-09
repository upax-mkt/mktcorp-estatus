import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * SE VOTABA VIENDO UNA SOLA CARA DEL DISEÑO (9-sep-2026).
 *
 * El lineup sí pintaba las tres imágenes —el `map` estaba bien— pero
 * `.imagenesGrid` era un carrusel horizontal: `grid-auto-flow: column` con
 * `grid-auto-columns: 100%`, así que la vista 2 y la 3 vivían fuera del
 * recuadro. Sin flecha, sin puntos, sin asomo de la siguiente, y en macOS sin
 * barra de scroll visible: nada anunciaba que hubiera más. Quien subió la
 * espalda y las mangas de su sudadera compitió con el frente.
 *
 * ⚠️ EL DEFECTO ERA DE CSS, NO DE JSX, y por eso se vigila el CSS. Un test que
 * solo contara `<img>` en el render habría pasado los dos días que esto estuvo
 * roto.
 */
const CSS = readFileSync(join(__dirname, '../../app/concurso/concurso.module.css'), 'utf8')
const GALERIA = readFileSync(join(__dirname, 'GaleriaConcurso.tsx'), 'utf8')

/** La regla de `.imagenesGrid`, sin las de sus descendientes. */
const REGLA = CSS.match(/^\.imagenesGrid\s*\{([^}]*)\}/m)?.[1] ?? ''

describe('el lineup enseña todas las vistas de una propuesta', () => {
  it('encuentra la regla que las coloca', () => {
    expect(REGLA, 'no se encontró .imagenesGrid en el módulo CSS').not.toBe('')
  })

  it('no vuelve a esconderlas en un carrusel horizontal', () => {
    expect(REGLA).not.toMatch(/grid-auto-flow\s*:\s*column/)
    expect(REGLA).not.toMatch(/overflow-x/)
    expect(REGLA).not.toMatch(/scroll-snap-type/)
  })

  it('y ninguna queda recortada por un alto fijo', () => {
    expect(REGLA).not.toMatch(/(?<!max-)height\s*:/)
  })

  /**
   * La otra mitad del contrato: que se sigan pintando TODAS. Si alguien
   * recortara el `map` a la primera imagen, el CSS de arriba ya no salvaría
   * nada.
   */
  it('pinta una por cada imagen de la propuesta, no solo la primera', () => {
    expect(GALERIA).toMatch(/propuesta\.imagenes\.map\(/)
    expect(GALERIA).not.toMatch(/propuesta\.imagenes\[0\]/)
    expect(GALERIA).not.toMatch(/propuesta\.imagenes\.slice\(/)
  })
})
