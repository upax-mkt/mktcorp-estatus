import { describe, it, expect } from 'vitest'
import { TEMAS, obtenerTema, slugsDeSalas } from './index'
import { contraste } from '@/lib/color'
import { derivarEscalaDatos } from '@/lib/escala-datos'

describe('registro de temas', () => {
  it('tiene exactamente las 10 salas', () => {
    expect(slugsDeSalas().sort()).toEqual([
      'ceci', 'grupo-upax', 'house-of-films', 'marketing-united', 'mexa-creativa',
      'neracode', 'promo-espacio', 'research-land', 'uix', 'zeus',
    ])
  })

  it('obtenerTema devuelve el tema pedido', () => {
    expect(obtenerTema('zeus').primario).toBe('#FF004F')
  })

  it('obtenerTema lanza si la sala no existe', () => {
    expect(() => obtenerTema('mkt-corp')).toThrow(/mkt-corp/)
  })
})

describe.each(Object.values(TEMAS))('tema $nombre', (tema) => {
  it('tiene todos los hex en formato válido', () => {
    const hexes = [
      tema.primario, tema.secundario, tema.acento,
      tema.superficieClara, tema.superficieOscura,
      tema.textoSobreClara, tema.textoSobreOscura,
      ...tema.gradiente,
    ]
    for (const h of hexes) expect(h).toMatch(/^#[0-9A-F]{6}$/)
  })

  it('el texto sobre superficie clara contrasta ≥ 4.5:1', () => {
    expect(contraste(tema.textoSobreClara, tema.superficieClara)).toBeGreaterThanOrEqual(4.5)
  })

  it('el texto sobre superficie oscura contrasta ≥ 4.5:1', () => {
    expect(contraste(tema.textoSobreOscura, tema.superficieOscura)).toBeGreaterThanOrEqual(4.5)
  })

  it('su escala de datos es legible sobre ambas superficies', () => {
    for (const superficie of [tema.superficieClara, tema.superficieOscura]) {
      for (const color of derivarEscalaDatos(tema.primario, superficie)) {
        expect(contraste(color, superficie)).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('el gradiente tiene al menos dos paradas', () => {
    expect(tema.gradiente.length).toBeGreaterThanOrEqual(2)
  })
})
