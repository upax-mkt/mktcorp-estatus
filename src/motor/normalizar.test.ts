import { describe, it, expect } from 'vitest'
import { normalizar } from './normalizar'

describe('normalizar', () => {
  it('convierte cifras sueltas en piezas de cifra+delta', () => {
    const inv = normalizar({
      titulo: 'Performance del sitio web',
      cifras: [{ valor: '9.2', rotulo: 'Posición media', delta: '-0.3' }],
    })
    const cifra = inv.piezas.find((p) => p.tipo === 'cifra')
    expect(cifra).toMatchObject({ valor: '9.2', rotulo: 'Posición media', delta: '-0.3' })
  })

  it('detecta un párrafo largo como pieza de párrafo', () => {
    const texto = 'No es un deterioro generalizado: las dos páginas con más tráfico mejoraron posición pero perdieron impresiones. El mix de consultas arrastra el promedio.'
    const inv = normalizar({ titulo: 'x', texto })
    expect(inv.piezas.some((p) => p.tipo === 'parrafo')).toBe(true)
  })

  it('conserva ENTERA una tabla de 2 periodos, sin trocearla en series', () => {
    // Antes esto devolvía un `comparativo` y la rejilla se perdía: el modelo
    // no veía una tabla, así que no podía devolver una. La comparativa
    // Mayo|Junio del deck real no tenía forma de existir.
    const inv = normalizar({
      titulo: 'x',
      tablas: [[['', 'Mayo', 'Junio'], ['Sesiones', '1366', '968'], ['MQLs', '3', '1']]],
    })
    expect(inv.piezas).toEqual([
      {
        tipo: 'tabla',
        columnas: ['', 'Mayo', 'Junio'],
        filas: [['Sesiones', '1366', '968'], ['MQLs', '3', '1']],
      },
    ])
  })

  it('una tabla de más de 2 periodos también se conserva entera', () => {
    const inv = normalizar({
      titulo: 'x',
      tablas: [[['Canal', 'Abr', 'May', 'Jun'], ['Orgánico', '10', '12', '9']]],
    })
    expect(inv.piezas).toHaveLength(1)
    expect(inv.piezas[0]).toMatchObject({ tipo: 'tabla', columnas: ['Canal', 'Abr', 'May', 'Jun'] })
  })

  it('conserva la nota dirigida a la IA', () => {
    const inv = normalizar({ titulo: 'x', nota: 'esto va destacado' })
    expect(inv.nota).toBe('esto va destacado')
  })

  it('es determinista', () => {
    const entrada = { titulo: 'x', cifras: [{ valor: '1', rotulo: 'a' }] }
    expect(normalizar(entrada)).toEqual(normalizar(entrada))
  })

  it('convierte una tabla de 1 columna de datos (snapshot de un periodo) en una pieza cifra por fila', () => {
    const inv = normalizar({
      titulo: 'x',
      tablas: [[['Métrica', 'Junio'], ['Sesiones', '968'], ['MQLs', '1']]],
    })
    const cifras = inv.piezas.filter((p) => p.tipo === 'cifra')
    expect(cifras).toHaveLength(2)
    expect(cifras).toContainEqual({ tipo: 'cifra', rotulo: 'Sesiones', valor: '968' })
    expect(cifras).toContainEqual({ tipo: 'cifra', rotulo: 'MQLs', valor: '1' })
  })

  it('ignora sin reventar una tabla de solo encabezado (0 columnas de datos)', () => {
    const inv = normalizar({
      titulo: 'x',
      tablas: [[['Métrica']]],
    })
    expect(inv.piezas).toHaveLength(0)
  })

  it('ignora sin reventar una tabla vacía (sin filas de datos)', () => {
    const inv = normalizar({
      titulo: 'x',
      tablas: [[['Métrica', 'Junio']]],
    })
    expect(inv.piezas).toHaveLength(0)
  })

  it('no genera pieza de párrafo cuando el texto está vacío', () => {
    const inv = normalizar({ titulo: 'x', texto: '' })
    expect(inv.piezas.some((p) => p.tipo === 'parrafo')).toBe(false)
    expect(inv.piezas).toHaveLength(0)
  })

  it('no genera pieza de párrafo cuando el texto es solo espacios en blanco', () => {
    const inv = normalizar({ titulo: 'x', texto: '   \n\t  ' })
    expect(inv.piezas.some((p) => p.tipo === 'parrafo')).toBe(false)
    expect(inv.piezas).toHaveLength(0)
  })
})
