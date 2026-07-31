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

/**
 * Casos añadidos en la revisión (31-jul): la función CUENTA píxeles con algo
 * de alfa, no PONDERA por intensidad — ver el comentario de cabecera de
 * `tinta.ts`. Sin un test que lo fije, "cuenta" y "pondera" son
 * indistinguibles con los tres casos de arriba (todos usan alfa 0 o 255
 * exactos, nunca algo intermedio).
 */
describe('proporcionDeTinta — cuenta, no pondera (revisión, 31-jul)', () => {
  it('un lienzo entero con alfa=1 (casi invisible, pero no cero) da 1 — igual que alfa=255 en todos', () => {
    const casiInvisible = new Uint8ClampedArray(4 * 10).fill(0)
    for (let i = 3; i < casiInvisible.length; i += 4) casiInvisible[i] = 1
    expect(proporcionDeTinta(casiInvisible)).toBe(1)
  })

  it('un anillo de antialiasing (alfa bajo) alrededor de un núcleo opaco cuenta como tinta igual que el núcleo', () => {
    // Lienzo de 10x10: núcleo opaco 4x4, anillo de alfa=40 alrededor, resto
    // transparente. El resultado debe caer estrictamente entre 0 y 1: ni el
    // núcleo solo, ni el lienzo entero.
    const ancho = 10, alto = 10
    const datos = new Uint8ClampedArray(ancho * alto * 4)
    for (let y = 0; y < alto; y++) {
      for (let x = 0; x < ancho; x++) {
        const i = (y * ancho + x) * 4
        const dx = Math.abs(x - 4.5)
        const dy = Math.abs(y - 4.5)
        datos[i + 3] = dx <= 2 && dy <= 2 ? 255 : dx <= 3 && dy <= 3 ? 40 : 0
      }
    }
    const p = proporcionDeTinta(datos)
    expect(p).toBeGreaterThan(0)
    expect(p).toBeLessThan(1)
  })
})
