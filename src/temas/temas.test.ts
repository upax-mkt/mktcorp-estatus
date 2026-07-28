import { describe, it, expect } from 'vitest'
import { TEMAS, obtenerTema, slugsDeSalas, temaDeSala, colorDeTextoDeMarca } from './index'
import { contraste } from '@/lib/color'
import { derivarEscalaDatos } from '@/lib/escala-datos'

describe('registro de temas', () => {
  it('tiene exactamente las 9 salas: las 8 UDNs y Ceci', () => {
    // Grupo UPAX salió del registro: era la misma habitación que Ceci contada
    // dos veces —mismo logotipo, mismo interlocutor— y en el Home aparecían
    // como dos tarjetas idénticas. Su TEMA sigue existiendo, porque de ahí
    // saca Ceci su identidad; lo que ya no existe es la sala.
    expect(slugsDeSalas().sort()).toEqual([
      'ceci', 'house-of-films', 'marketing-united', 'mexa-creativa',
      'neracode', 'promo-espacio', 'research-land', 'uix', 'zeus',
    ])
  })

  it('obtenerTema devuelve el tema pedido', () => {
    // El principal del brandbook 2026 (Pantone 275c). El #FF004F que había
    // aquí es uno de sus dos acentos: estaban intercambiados.
    expect(obtenerTema('zeus').primario).toBe('#614ACA')
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

describe('la identidad de lo que no es de ninguna sala', () => {
  it('una reunión sin sala se viste con la del grupo, no con undefined', () => {
    // Grupo UPAX dejó de ser una sala, y el por defecto apuntaba al registro:
    // sin esto, un comité o un arranque se quedaban sin tema, sin colores y
    // sin escala de datos, y el documento reventaba al pintarse.
    const t = temaDeSala(null)
    expect(t).toBeDefined()
    expect(t.primario).toMatch(/^#/)
    expect(temaDeSala(undefined).slug).toBe(t.slug)
  })

  it('con sala, la suya', () => {
    expect(temaDeSala('zeus').slug).toBe('zeus')
  })
})

describe('el color de marca en TEXTO', () => {
  /**
   * Franco: "el verde de MU no tiene buena lectura en textos, es muy flúor".
   *
   * Medido: el #DCFF00 de Marketing United da 1,14:1 sobre blanco — no es poco
   * contraste, es invisible. Y no era el único: seis de las nueve marcas
   * bajaban de 4,5:1.
   *
   * Dos tokens con trabajos distintos: `--marca` es el color EXACTO del
   * brandbook, para rellenos y filos donde no hay nada que leer;
   * `--marca-texto` es el mismo matiz oscurecido lo justo. Este test es el que
   * impide que una marca nueva entre con un color ilegible sin que nadie lo
   * note.
   */
  it('todas las marcas alcanzan 4,5:1 sobre blanco como texto', () => {
    for (const [slug, tema] of Object.entries(TEMAS)) {
      const c = contraste(colorDeTextoDeMarca(tema.primario), '#ffffff')
      expect(c, `${slug} se lee a ${c.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('una marca que YA se lee no se toca', () => {
    // Research Land está a 8,4:1: ajustarla sería apagarla sin motivo.
    expect(colorDeTextoDeMarca('#770EB3')).toBe('#770EB3')
  })

  it('conserva el matiz: el verde sigue siendo verde', () => {
    // Lo que se ajusta es la luminosidad, no el tono. Un ajuste que cambiara
    // el matiz dejaría de ser la marca.
    const ajustado = colorDeTextoDeMarca('#DCFF00')
    expect(ajustado).not.toBe('#DCFF00')
    const [, r, g, b] = /^#(..)(..)(..)$/.exec(ajustado)!.map((x, i) => (i ? parseInt(x, 16) : 0))
    expect(g).toBeGreaterThan(r)
    expect(g).toBeGreaterThan(b)
  })
})
