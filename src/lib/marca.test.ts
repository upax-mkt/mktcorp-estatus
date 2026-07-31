import { describe, it, expect } from 'vitest'
import { slugDesdeNombre, derivarMarca } from './marca'
import { contraste } from './color'

describe('slugDesdeNombre', () => {
  it('minúsculas, sin acentos y con guiones', () => {
    expect(slugDesdeNombre('Más Salud')).toBe('mas-salud')
    expect(slugDesdeNombre('Research Land')).toBe('research-land')
    expect(slugDesdeNombre('  Doble  espacio  ')).toBe('doble-espacio')
  })

  it('quita lo que no sirve en una URL', () => {
    expect(slugDesdeNombre('A&B / C')).toBe('a-b-c')
    expect(slugDesdeNombre('¿Qué?')).toBe('que')
  })
})

describe('derivarMarca', () => {
  it('el texto siempre se lee sobre su superficie', () => {
    for (const color of ['#0E7C7B', '#FFE600', '#111111', '#FF0080']) {
      const m = derivarMarca('Prueba', color)
      expect(contraste(m.textoSobreClara, m.superficieClara)).toBeGreaterThanOrEqual(4.5)
      expect(contraste(m.textoSobreOscura, m.superficieOscura)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('conserva el color de marca tal cual: es el dato del brandbook', () => {
    expect(derivarMarca('Prueba', '#0E7C7B').primario).toBe('#0e7c7b')
  })

  it('el degradado empieza en el color de marca y tiene al menos dos paradas', () => {
    const m = derivarMarca('Prueba', '#0E7C7B')
    expect(m.gradiente[0]).toBe('#0e7c7b')
    expect(m.gradiente.length).toBeGreaterThanOrEqual(2)
  })
})
