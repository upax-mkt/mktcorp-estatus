import { describe, it, expect } from 'vitest'
import { ordenTrasMover, esPermutacionValida } from './orden'

describe('ordenTrasMover', () => {
  const ids = ['a', 'b', 'c', 'd']

  it('mueve un item hacia abajo', () => {
    expect(ordenTrasMover(ids, 'a', 2)).toEqual(['b', 'c', 'a', 'd'])
  })

  it('mueve un item hacia arriba', () => {
    expect(ordenTrasMover(ids, 'd', 1)).toEqual(['a', 'd', 'b', 'c'])
  })

  it('llevar al principio y al final', () => {
    expect(ordenTrasMover(ids, 'c', 0)).toEqual(['c', 'a', 'b', 'd'])
    expect(ordenTrasMover(ids, 'a', 3)).toEqual(['b', 'c', 'd', 'a'])
  })

  it('soltar en el mismo sitio no cambia nada', () => {
    expect(ordenTrasMover(ids, 'b', 1)).toEqual(ids)
  })

  it('recorta un destino fuera de rango en vez de romper la lista', () => {
    expect(ordenTrasMover(ids, 'a', 99)).toEqual(['b', 'c', 'd', 'a'])
    expect(ordenTrasMover(ids, 'd', -5)).toEqual(['d', 'a', 'b', 'c'])
  })

  it('devuelve la lista intacta si el item no existe', () => {
    expect(ordenTrasMover(ids, 'z', 0)).toEqual(ids)
  })
})

describe('esPermutacionValida', () => {
  const actuales = ['a', 'b', 'c']

  it('acepta los mismos ids en otro orden', () => {
    expect(esPermutacionValida(actuales, ['c', 'a', 'b'])).toBe(true)
  })

  it('rechaza si falta alguno', () => {
    expect(esPermutacionValida(actuales, ['a', 'b'])).toBe(false)
  })

  it('rechaza si aparece uno de fuera', () => {
    expect(esPermutacionValida(actuales, ['a', 'b', 'z'])).toBe(false)
  })

  it('rechaza duplicados que disimulan un id perdido', () => {
    expect(esPermutacionValida(actuales, ['a', 'b', 'b'])).toBe(false)
  })

  it('rechaza una lista vacía cuando hay items', () => {
    expect(esPermutacionValida(actuales, [])).toBe(false)
  })
})
