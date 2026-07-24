import { describe, it, expect } from 'vitest'
import { layoutsImplementados, esLayoutImplementado } from './catalogo'
import { LAYOUTS } from '@/decision/esquema'

describe('catálogo de layouts', () => {
  it('los implementados son un subconjunto del catálogo declarado', () => {
    for (const l of layoutsImplementados()) {
      expect(LAYOUTS).toContain(l)
    }
  })

  it('hoy están implementados al menos portada y kpis', () => {
    expect(layoutsImplementados()).toEqual(
      expect.arrayContaining(['portada', 'kpis-fila-dos-columnas']),
    )
  })

  it('esLayoutImplementado distingue implementado de solo-declarado', () => {
    expect(esLayoutImplementado('portada')).toBe(true)
    expect(esLayoutImplementado('matriz-estados')).toBe(false)
  })
})
