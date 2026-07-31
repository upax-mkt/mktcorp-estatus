import { describe, it, expect } from 'vitest'
import { proporcionDeTinta } from './tinta'

describe('proporcionDeTinta', () => {
  it('un lienzo medio lleno da la mitad', () => {
    // 4 píxeles: 2 opacos, 2 transparentes
    const datos = new Uint8ClampedArray([0,0,0,255, 0,0,0,255, 0,0,0,0, 0,0,0,0])
    expect(proporcionDeTinta(datos)).toBeCloseTo(0.5)
  })

  it('sin transparencia da 1, que es la señal de un logo con fondo', () => {
    const datos = new Uint8ClampedArray([0,0,0,255, 0,0,0,255])
    expect(proporcionDeTinta(datos)).toBe(1)
  })

  it('un lienzo vacío da 0 sin dividir por cero', () => {
    expect(proporcionDeTinta(new Uint8ClampedArray([]))).toBe(0)
  })
})
