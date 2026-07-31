import { describe, it, expect } from 'vitest'
import { temaDeSala, colorDeTextoDeMarca } from './index'
import { SEMILLA_DE_TEMAS } from './semilla'
import { grupoUpax } from './grupo-upax'
import { contraste } from '@/lib/color'
import { derivarEscalaDatos } from '@/lib/escala-datos'

// Las pruebas de "cuántas salas hay" y "un slug desconocido revienta" viven
// ahora en src/db/temas.test.ts, junto a `cargarTemas`/`slugsDeSalas` — que
// son quienes de verdad conocen el universo de salas (la tabla `salas`).
// Este archivo prueba lo que se quedó aquí: los AYUDANTES puros que no
// dependen de dónde salió el registro.

describe.each(Object.values(SEMILLA_DE_TEMAS))('tema $nombre', (tema) => {
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

describe('temaDeSala — la identidad de lo que no es de ninguna sala', () => {
  it('una reunión sin sala se viste con la del grupo, no con undefined', () => {
    // Grupo UPAX dejó de ser una sala, y el por defecto apuntaba al registro:
    // sin esto, un comité o un arranque se quedaban sin tema, sin colores y
    // sin escala de datos, y el documento reventaba al pintarse.
    const t = temaDeSala(null, SEMILLA_DE_TEMAS)
    expect(t).toBeDefined()
    expect(t.primario).toMatch(/^#/)
    expect(t.slug).toBe(grupoUpax.slug)
    expect(temaDeSala(undefined, SEMILLA_DE_TEMAS).slug).toBe(t.slug)
  })

  it('con sala, la suya', () => {
    expect(temaDeSala('zeus', SEMILLA_DE_TEMAS).slug).toBe('zeus')
  })

  it('un slug que no está en el registro no revienta: cae al tema del grupo', () => {
    // No debería pasar en producción —una sala real siempre tiene su fila—,
    // pero un tema prestado es más barato que la página sin pintarse.
    expect(temaDeSala('mkt-corp-inventado', SEMILLA_DE_TEMAS).slug).toBe(grupoUpax.slug)
  })

  it('con un registro vacío (defensa extrema) sigue devolviendo el tema del grupo, sin romper', () => {
    expect(temaDeSala(null, {}).slug).toBe(grupoUpax.slug)
    expect(temaDeSala('zeus', {}).slug).toBe(grupoUpax.slug)
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
    for (const [slug, tema] of Object.entries(SEMILLA_DE_TEMAS)) {
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
