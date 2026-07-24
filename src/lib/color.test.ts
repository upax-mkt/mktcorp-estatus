import { describe, it, expect } from 'vitest'
import { hexARgb, rgbAHex, hexAHsl, hslAHex, luminancia, contraste } from './color'

describe('hexARgb', () => {
  it('convierte un hex de 6 dígitos', () => {
    expect(hexARgb('#3E31CC')).toEqual({ r: 62, g: 49, b: 204 })
  })

  it('acepta hex sin numeral', () => {
    expect(hexARgb('FF004F')).toEqual({ r: 255, g: 0, b: 79 })
  })

  it('rechaza un hex inválido', () => {
    expect(() => hexARgb('#ZZZ')).toThrow()
  })
})

describe('rgbAHex', () => {
  it('vuelve al hex original en mayúsculas', () => {
    expect(rgbAHex(62, 49, 204)).toBe('#3E31CC')
  })

  it('rellena con cero a la izquierda', () => {
    expect(rgbAHex(0, 0, 15)).toBe('#00000F')
  })
})

describe('hexAHsl y hslAHex', () => {
  it('el viaje de ida y vuelta conserva el color', () => {
    const original = '#F72585'
    const { h, s, l } = hexAHsl(original)
    expect(hslAHex(h, s, l)).toBe(original)
  })

  it('el blanco tiene luminosidad 100 y saturación 0', () => {
    const { s, l } = hexAHsl('#FFFFFF')
    expect(l).toBe(100)
    expect(s).toBe(0)
  })
})

describe('luminancia', () => {
  it('el blanco es 1', () => {
    expect(luminancia('#FFFFFF')).toBeCloseTo(1, 4)
  })

  it('el negro es 0', () => {
    expect(luminancia('#000000')).toBeCloseTo(0, 4)
  })
})

describe('contraste', () => {
  it('blanco contra negro es 21', () => {
    expect(contraste('#FFFFFF', '#000000')).toBeCloseTo(21, 2)
  })

  it('un color contra sí mismo es 1', () => {
    expect(contraste('#3E31CC', '#3E31CC')).toBeCloseTo(1, 4)
  })

  it('es simétrico', () => {
    expect(contraste('#F94700', '#11373E')).toBeCloseTo(contraste('#11373E', '#F94700'), 6)
  })
})
