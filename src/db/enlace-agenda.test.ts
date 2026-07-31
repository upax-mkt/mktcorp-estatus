import { describe, it, expect } from 'vitest'
import { esTokenIgual, nuevoToken } from './enlace-agenda'

describe('nuevoToken', () => {
  it('es largo e impredecible: es la única barrera del enlace', () => {
    const a = nuevoToken()
    const b = nuevoToken()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThanOrEqual(32)
    // base64url: sin +, / ni = que rompan una URL
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/)
  })
})

describe('esTokenIgual', () => {
  it('acepta el token exacto', () => {
    expect(esTokenIgual('abc123', 'abc123')).toBe(true)
  })

  it('rechaza cualquier otro, incluida una diferencia de un carácter', () => {
    expect(esTokenIgual('abc123', 'abc124')).toBe(false)
    expect(esTokenIgual('abc123', 'abc12')).toBe(false)
    expect(esTokenIgual('abc123', '')).toBe(false)
  })

  it('sin token guardado nada coincide, ni siquiera la cadena vacía', () => {
    expect(esTokenIgual(null, '')).toBe(false)
    expect(esTokenIgual(null, 'loquesea')).toBe(false)
  })
})
