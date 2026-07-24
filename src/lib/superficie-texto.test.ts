import { describe, it, expect } from 'vitest'
import { ajustarColorParaContraste } from './superficie-texto'
import { contraste, hexAHsl } from './color'

// NOTA (recomposición del degradado, 24-jul): este archivo tenía tests de
// `mejorTextoSobre` y `ajustarGradienteParaTexto`, la maquinaria que ajustaba
// el degradado de marca para llevar texto encima. La decisión de marca cerró
// esa ruta: el degradado se pinta siempre EXACTO y nunca lleva texto, así que
// ambas funciones se quedaron sin consumidor y se retiraron junto con sus
// tests. `ajustarColorParaContraste` sigue viva — es la maquinaria detrás de
// `--primario-sobre-superficie` — así que aquí se prueba directamente en vez
// de a través de la función retirada, sin debilitar la intención original
// (que el color ajustado sea realmente legible).
describe('ajustarColorParaContraste', () => {
  it('no toca el color si ya cumple el mínimo', () => {
    expect(ajustarColorParaContraste('#000000', '#FFFFFF', 4.5)).toBe('#000000')
  })

  it('lleva el color a contrastar ≥ mínimo contra la referencia', () => {
    // #1BE4BA (turquesa NeraCode) sólo da 1.63:1 contra blanco.
    const ajustado = ajustarColorParaContraste('#1BE4BA', '#FFFFFF', 4.5)
    expect(contraste(ajustado, '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
  })

  it('conserva el matiz y la saturación del color original', () => {
    const original = '#1BE4BA'
    const ajustado = ajustarColorParaContraste(original, '#FFFFFF', 4.5)
    const hslOriginal = hexAHsl(original)
    const hslAjustado = hexAHsl(ajustado)
    expect(hslAjustado.h).toBeCloseTo(hslOriginal.h, 0)
    expect(hslAjustado.s).toBeCloseTo(hslOriginal.s, 0)
  })

  it('funciona en ambas direcciones: aclara un color oscuro contra fondo oscuro', () => {
    // Promo Espacio: #F94700 sólo da 2.97:1 contra su superficieClara #EBEBEB.
    const ajustado = ajustarColorParaContraste('#F94700', '#EBEBEB', 4.5)
    expect(contraste(ajustado, '#EBEBEB')).toBeGreaterThanOrEqual(4.5)
  })

  it('si ni el extremo alcanza el mínimo, usa el extremo y no falla', () => {
    // Pedir 21:1 (blanco puro contra negro puro) contra un gris medio nunca
    // se puede lograr sin tocar matiz/saturación: debe devolver el extremo
    // sin lanzar error.
    expect(() => ajustarColorParaContraste('#808080', '#000000', 21)).not.toThrow()
    const ajustado = ajustarColorParaContraste('#808080', '#000000', 21)
    expect(ajustado).toMatch(/^#[0-9A-F]{6}$/)
  })
})
