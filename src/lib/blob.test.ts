import { describe, it, expect } from 'vitest'
import { rutaDeArchivo, pesoLegible, extensionDe, TIPOS_PERMITIDOS } from './blob'

describe('rutaDeArchivo', () => {
  it('cuelga de la sala y la categoría, para poder leer el store a ojo', () => {
    const ruta = rutaDeArchivo('mexa-creativa', 'presentacion', 'deck.pdf')
    expect(ruta.startsWith('salas/mexa-creativa/presentacion/')).toBe(true)
    expect(ruta.endsWith('-deck.pdf')).toBe(true)
  })

  it('dos subidas del mismo nombre no se pisan', () => {
    const a = rutaDeArchivo('zeus', 'interes', 'estatus.pdf')
    const b = rutaDeArchivo('zeus', 'interes', 'estatus.pdf')
    expect(a).not.toBe(b)
  })

  it('un nombre con acentos, espacios y barras no se escapa de su carpeta', () => {
    const ruta = rutaDeArchivo('uix', 'interes', '../../secreto de año/Informe (final).pdf')
    expect(ruta.startsWith('salas/uix/interes/')).toBe(true)
    expect(ruta).not.toContain('..')
    // Todo lo que no es letra, número, punto o guion se sustituye — incluida
    // la barra, que es lo que permitiría subir fuera de la carpeta.
    expect(ruta.split('salas/uix/interes/')[1]).not.toContain('/')
  })

  it('un nombre larguísimo se recorta y sigue siendo una ruta', () => {
    const largo = `${'a'.repeat(500)}.pdf`
    const ruta = rutaDeArchivo('zeus', 'interes', largo)
    expect(ruta.length).toBeLessThan(160)
  })
})

describe('pesoLegible', () => {
  it('escribe bytes, kilos y megas', () => {
    expect(pesoLegible(840)).toBe('840 B')
    expect(pesoLegible(24_000)).toBe('23 KB')
    expect(pesoLegible(2_400_000)).toBe('2.3 MB')
  })

  it('sin peso no inventa un cero', () => {
    expect(pesoLegible(null)).toBeNull()
    expect(pesoLegible(0)).toBeNull()
  })
})

describe('extensionDe', () => {
  it('saca la extensión en mayúsculas', () => {
    expect(extensionDe('deck.pptx')).toBe('PPTX')
    expect(extensionDe('Informe.PDF')).toBe('PDF')
  })

  it('un nombre sin extensión no deja el icono en blanco', () => {
    expect(extensionDe('LEEME')).toBe('FILE')
    expect(extensionDe('acaba.en.punto.')).toBe('FILE')
  })
})

describe('tipos permitidos', () => {
  it('es una lista blanca: lo ejecutable no está', () => {
    for (const prohibido of ['application/x-msdownload', 'text/html', 'application/javascript']) {
      expect(TIPOS_PERMITIDOS).not.toContain(prohibido)
    }
  })

  it('cubre lo que el equipo cuelga de verdad: decks, excels e imágenes', () => {
    expect(TIPOS_PERMITIDOS).toContain('application/pdf')
    expect(TIPOS_PERMITIDOS).toContain(
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    )
    expect(TIPOS_PERMITIDOS).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    expect(TIPOS_PERMITIDOS).toContain('image/png')
  })
})
