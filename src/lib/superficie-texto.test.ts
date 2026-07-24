import { describe, it, expect } from 'vitest'
import { mejorTextoSobre, ajustarGradienteParaTexto } from './superficie-texto'
import { contraste, hexAHsl } from './color'

describe('mejorTextoSobre', () => {
  it('elige el candidato con mayor contraste mínimo, no el de mayor promedio', () => {
    // Contra la parada turquesa clara, el blanco es casi ilegible (1.63:1);
    // contra la parada morada, el blanco gana por mucho (8.35:1). El oscuro
    // reparte mejor: 2.01:1 y 10.26:1. Su peor caso (2.01) supera al peor
    // caso del blanco (1.63), aunque el blanco tenga mejor promedio.
    const paradas = ['#3E31CC', '#1BE4BA']
    const candidatos = ['#FFFFFF', '#07184F']
    expect(mejorTextoSobre(paradas, candidatos)).toBe('#07184F')
  })

  it('con una sola parada, elige el candidato de mayor contraste simple', () => {
    expect(mejorTextoSobre(['#000000'], ['#FFFFFF', '#333333'])).toBe('#FFFFFF')
  })

  it('con un solo candidato, lo devuelve sin importar el contraste', () => {
    expect(mejorTextoSobre(['#FFFFFF', '#EEEEEE'], ['#000000'])).toBe('#000000')
  })

  it('lanza si no hay candidatos', () => {
    expect(() => mejorTextoSobre(['#000000'], [])).toThrow()
  })
})

describe('ajustarGradienteParaTexto', () => {
  it('no toca una parada que ya cumple el mínimo', () => {
    const [ajustada] = ajustarGradienteParaTexto(['#000000'], '#FFFFFF', 4.5)
    expect(ajustada).toBe('#000000')
  })

  it('lleva cada parada a contrastar ≥ mínimo contra el texto', () => {
    // #1BE4BA (turquesa NeraCode) sólo da 1.63:1 contra blanco.
    const [ajustada] = ajustarGradienteParaTexto(['#1BE4BA'], '#FFFFFF', 4.5)
    expect(contraste(ajustada, '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
  })

  it('conserva el matiz y la saturación de la parada original', () => {
    const original = '#1BE4BA'
    const [ajustada] = ajustarGradienteParaTexto([original], '#FFFFFF', 4.5)
    const hslOriginal = hexAHsl(original)
    const hslAjustada = hexAHsl(ajustada)
    expect(hslAjustada.h).toBeCloseTo(hslOriginal.h, 0)
    expect(hslAjustada.s).toBeCloseTo(hslOriginal.s, 0)
  })

  it('ajusta cada parada de forma independiente', () => {
    const paradas = ['#3E31CC', '#1BE4BA']
    const ajustadas = ajustarGradienteParaTexto(paradas, '#FFFFFF', 4.5)
    expect(ajustadas).toHaveLength(2)
    for (const parada of ajustadas) {
      expect(contraste(parada, '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('si ni el extremo alcanza el mínimo, usa el extremo y no falla', () => {
    // Pedir 21:1 (blanco puro contra negro puro) contra un gris medio nunca
    // se puede lograr sin tocar matiz/saturación: debe devolver el extremo
    // (blanco, ya que #808080 está más cerca de blanco en contraste con
    // negro) sin lanzar error.
    expect(() => ajustarGradienteParaTexto(['#808080'], '#000000', 21)).not.toThrow()
    const [ajustada] = ajustarGradienteParaTexto(['#808080'], '#000000', 21)
    expect(ajustada).toMatch(/^#[0-9A-F]{6}$/)
  })

  it('respeta el mínimo por defecto de 4.5 cuando no se pasa el parámetro', () => {
    const [ajustada] = ajustarGradienteParaTexto(['#1BE4BA'], '#FFFFFF')
    expect(contraste(ajustada, '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
  })
})
