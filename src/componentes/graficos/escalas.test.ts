import { describe, it, expect } from 'vitest'
import { escalaLineal } from './escalas'

describe('escalaLineal', () => {
  it('mapea el mínimo al inicio del rango', () => {
    expect(escalaLineal([0, 100], [0, 300])(0)).toBe(0)
  })

  it('mapea el máximo al fin del rango', () => {
    expect(escalaLineal([0, 100], [0, 300])(100)).toBe(300)
  })

  it('interpola los intermedios', () => {
    expect(escalaLineal([0, 100], [0, 300])(50)).toBe(150)
  })

  it('admite un rango invertido, como el eje Y del SVG', () => {
    const y = escalaLineal([0, 100], [200, 0])
    expect(y(0)).toBe(200)
    expect(y(100)).toBe(0)
  })

  it('no revienta con dominio de ancho cero', () => {
    expect(Number.isFinite(escalaLineal([5, 5], [0, 100])(5))).toBe(true)
  })
})
