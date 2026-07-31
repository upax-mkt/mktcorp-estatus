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

/**
 * COLISIÓN SIMÉTRICA CON LA SUPERFICIE OSCURA (revisión de la tarea 6,
 * 31-jul) — confirmada empíricamente, igual que la colisión con la
 * superficie clara que ya documenta `VistaPreviaMarca.tsx`: con un primario
 * casi negro, `derivarMarca` desatura y oscurece ese mismo matiz hasta la
 * superficie oscura, y si el primario ya estaba pegado al negro, las dos
 * salen literalmente el mismo hex.
 *
 * `#1f1f1f` (gris puro, L≈12, el mismo L que `L_SUPERFICIE_OSCURA`) es el
 * caso exacto, análogo a `#f7f7f7` para la superficie clara.
 *
 * FIJADO AQUÍ COMO CONTRATO PROBADO, sin resolverlo todavía: a diferencia de
 * la colisión clara, esta NO tiene una vista previa que avise —
 * `VistaPreviaMarca` solo detecta `primario === superficieClara`— porque el
 * brief de la tarea 6 describía explícitamente el caso claro, no el
 * simétrico. Queda documentado para quien decida si vale la pena avisar
 * también de este lado.
 */
describe('derivarMarca — colisión primario/superficieOscura con un primario casi negro', () => {
  it('con #1f1f1f, primario y superficieOscura son el mismo hex', () => {
    const m = derivarMarca('Sala Oscura', '#1f1f1f')
    expect(m.primario).toBe(m.superficieOscura)
  })

  it('el texto sobre esa superficie sigue siendo legible: textoSobreOscura parte de blanco, no del primario, así que no hereda la colisión', () => {
    const m = derivarMarca('Sala Oscura', '#1f1f1f')
    expect(contraste(m.textoSobreOscura, m.superficieOscura)).toBeGreaterThanOrEqual(4.5)
  })

  it('existen otros grises que también colisionan: no es un único punto aislado', () => {
    const colisiones: string[] = []
    for (let v = 0; v <= 255; v++) {
      const hex = `#${v.toString(16).padStart(2, '0').repeat(3)}`
      const m = derivarMarca('Sala de prueba', hex)
      if (m.primario === m.superficieOscura) colisiones.push(hex)
    }
    expect(colisiones.length).toBeGreaterThan(0)
  })
})
