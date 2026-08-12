import { describe, it, expect } from 'vitest'
import { hexARgb, rgbAHex, hexAHsl, hslAHex, luminancia, contraste } from './color'
import { derivarMarca } from './marca'

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

/**
 * DE UN COLOR SIN TONO NO SE PUEDE DERIVAR UNA PALETA.
 *
 * Franco: *"cuando selecciono el negro solo me hace combinaciones de grises,
 * siendo que hoy tiene negro, azul y otros"*.
 *
 * No era un fallo de `derivarMarca`: es geometría. El secundario y el acento
 * salen ROTANDO EL TONO del primario, y el negro, el blanco y el gris tienen
 * croma cero — no hay tono que girar, así que rotarlos devuelve el mismo
 * color. Con cualquier color saturado funciona.
 *
 * Este test no pide que eso cambie: fija POR QUÉ el formulario tuvo que dejar
 * escribir el secundario y el acento a mano. Si alguien un día "arregla" la
 * derivación para que invente un tono a partir del negro, esto se pone rojo y
 * le obliga a explicar de dónde lo saca.
 */
describe('derivarMarca — el límite que obliga a escribir los colores a mano', () => {
  it('de un color saturado sí salen tres colores distintos', () => {
    const m = derivarMarca('Zeus', '#614ACA')
    expect(m.secundario).not.toBe(m.primario)
    expect(m.acento).not.toBe(m.primario)
    expect(m.acento).not.toBe(m.secundario)
  })

  it.each(['#000000', '#FFFFFF', '#808080'])(
    'de %s no: sin tono que girar, la paleta entera queda en la misma escala',
    (sinTono) => {
      const m = derivarMarca('X', sinTono)
      // Lo que se comprueba es que NO aporta un color nuevo: los tres son
      // neutros. Es exactamente lo que Franco vio como "escalas de gris".
      for (const c of [m.primario, m.secundario, m.acento]) {
        const { r, g, b } = hexARgb(c)
        expect(Math.max(r, g, b) - Math.min(r, g, b), `${c} tiene tono`).toBeLessThan(12)
      }
    },
  )
})
