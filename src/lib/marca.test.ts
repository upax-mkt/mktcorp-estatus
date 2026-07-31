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

  // --- Correcciones de revisión (30-jul) ---
  //
  // La revisión probó con #000000 y #FFFFFF (además de los cuatro colores de
  // arriba) y encontró que secundario y acento salían IDÉNTICOS en ambos
  // casos: con saturación 0 el matiz no distingue nada, y los dos clamps de
  // luminosidad chocaban contra el mismo tope del rango. Estos dos colores se
  // suman aquí a propósito a los cuatro originales: sin ellos, una
  // implementación degenerada -los tres colores iguales al primario- habría
  // pasado los cinco tests de arriba sin que nadie lo notara.
  const COLORES_DE_PRUEBA = ['#0E7C7B', '#FFE600', '#111111', '#FF0080', '#000000', '#FFFFFF']

  it('secundario y acento difieren entre sí y del primario', () => {
    for (const color of COLORES_DE_PRUEBA) {
      const m = derivarMarca('Prueba', color)
      expect(m.secundario, color).not.toBe(m.acento)
      expect(m.secundario, color).not.toBe(m.primario)
      expect(m.acento, color).not.toBe(m.primario)
    }
  })

  it('la segunda parada del degradado no es igual a la primera', () => {
    for (const color of COLORES_DE_PRUEBA) {
      const m = derivarMarca('Prueba', color)
      expect(m.gradiente[1], color).not.toBe(m.gradiente[0])
    }
  })
})

describe('slugDesdeNombre — contrato de cadena vacía (revisión, 30-jul)', () => {
  // La revisión probó cinco nombres sin ningún carácter alfanumérico y los
  // cinco dieron '' sin avisar. Ese slug termina como identificador de una
  // sala (clave primaria, segmento de URL), así que el comportamiento queda
  // fijado aquí como contrato probado, no solo como comentario en el código.
  it('da cadena vacía cuando el nombre no aporta ningún carácter alfanumérico', () => {
    for (const nombre of ['', '   ', '###', '---', '🎉🎉']) {
      expect(slugDesdeNombre(nombre), JSON.stringify(nombre)).toBe('')
    }
  })
})
