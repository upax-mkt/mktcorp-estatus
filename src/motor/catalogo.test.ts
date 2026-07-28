import { describe, it, expect } from 'vitest'
import { layoutsImplementados, esLayoutImplementado } from './catalogo'
import { LAYOUTS } from '@/decision/esquema'
import type { DecisionSlide } from '@/decision/esquema'

describe('catálogo de layouts', () => {
  it('los implementados son un subconjunto del catálogo declarado', () => {
    for (const l of layoutsImplementados()) {
      expect(LAYOUTS).toContain(l)
    }
  })

  it('ya no hay layouts declarados que nadie dibuja', () => {
    // Seis de los trece eran nombres muertos: estaban en el enum pero sin nada
    // que los pintara, así que el motor no podía elegirlos y la mitad de un
    // estatus real no tenía forma posible. Este test cierra esa puerta —
    // añadir un nombre a LAYOUTS obliga a darle papel en el documento.
    expect([...layoutsImplementados()].sort()).toEqual([...LAYOUTS].sort())
  })

  it('esLayoutImplementado rechaza un layout que el documento no conoce', () => {
    expect(esLayoutImplementado('portada')).toBe(true)
    // El caso real que protege: una decisión guardada hace meses en la base,
    // con un layout que desde entonces se quitó del catálogo.
    expect(esLayoutImplementado('layout-retirado' as DecisionSlide['layout'])).toBe(false)
  })
})
