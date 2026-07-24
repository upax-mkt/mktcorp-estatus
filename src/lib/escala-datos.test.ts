import { describe, it, expect } from 'vitest'
import { derivarEscalaDatos } from './escala-datos'
import { contraste, hexAHsl } from './color'

const CASOS: Array<{ sala: string; primario: string; superficie: string }> = [
  { sala: 'NeraCode',        primario: '#3E31CC', superficie: '#FFFFFF' },
  { sala: 'Research Land',   primario: '#1E0FF2', superficie: '#FFFFFF' },
  { sala: 'Promo Espacio',   primario: '#F94700', superficie: '#FFFFFF' },
  { sala: 'Mexa Creativa',   primario: '#F72585', superficie: '#FFFFFF' },
  { sala: 'Marketing United',primario: '#0000FF', superficie: '#FFFFFF' },
  { sala: 'House of Films',  primario: '#3B7BF7', superficie: '#FFFFFF' },
  { sala: 'UiX',             primario: '#8C59FE', superficie: '#FFFFFF' },
  { sala: 'Zeus',            primario: '#FF004F', superficie: '#FFFFFF' },
  { sala: 'Grupo UPAX',      primario: '#E34714', superficie: '#FFFFFF' },
  { sala: 'NeraCode oscuro', primario: '#3E31CC', superficie: '#07184F' },
]

describe('derivarEscalaDatos', () => {
  it('devuelve la cantidad pedida', () => {
    expect(derivarEscalaDatos('#3E31CC', '#FFFFFF')).toHaveLength(6)
    expect(derivarEscalaDatos('#3E31CC', '#FFFFFF', 4)).toHaveLength(4)
  })

  it('el primer color conserva el matiz del primario', () => {
    const [primero] = derivarEscalaDatos('#F72585', '#FFFFFF')
    const matizPrimario = hexAHsl('#F72585').h
    const matizPrimero = hexAHsl(primero).h
    expect(Math.abs(matizPrimero - matizPrimario)).toBeLessThan(6)
  })

  it.each(CASOS)('$sala: los 6 colores contrastan ≥ 3:1 contra su superficie', ({ primario, superficie }) => {
    for (const color of derivarEscalaDatos(primario, superficie)) {
      expect(contraste(color, superficie)).toBeGreaterThanOrEqual(3)
    }
  })

  it.each(CASOS)('$sala: los matices están separados al menos 20°', ({ primario, superficie }) => {
    const matices = derivarEscalaDatos(primario, superficie).map((c) => hexAHsl(c).h)
    for (let i = 0; i < matices.length; i++) {
      for (let j = i + 1; j < matices.length; j++) {
        const bruto = Math.abs(matices[i] - matices[j])
        const distancia = Math.min(bruto, 360 - bruto)
        expect(distancia).toBeGreaterThanOrEqual(20)
      }
    }
  })

  it('es determinista: la misma entrada da la misma salida', () => {
    expect(derivarEscalaDatos('#00CFAB', '#FFFFFF')).toEqual(derivarEscalaDatos('#00CFAB', '#FFFFFF'))
  })

  it.each(['#0000FF', '#1E0FF2', '#770EB3', '#F94700'])(
    'cumple el umbral incluso sobre superficies saturadas: %s',
    (superficie) => {
      for (const color of derivarEscalaDatos('#3E31CC', superficie)) {
        expect(contraste(color, superficie)).toBeGreaterThanOrEqual(3)
      }
    },
  )
})
