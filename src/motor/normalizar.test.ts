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

  it('convierte una tabla de 2 periodos en un comparativo', () => {
    const inv = normalizar({
      titulo: 'x',
      tablas: [[['', 'Mayo', 'Junio'], ['Sesiones', '1366', '968'], ['MQLs', '3', '1']]],
    })
    const comp = inv.piezas.find((p) => p.tipo === 'comparativo')
    expect(comp).toBeTruthy()
    expect(comp).toMatchObject({ periodos: ['Mayo', 'Junio'] })
  })

  it('conserva la nota dirigida a la IA', () => {
    const inv = normalizar({ titulo: 'x', nota: 'esto va destacado' })
    expect(inv.nota).toBe('esto va destacado')
  })

  it('es determinista', () => {
    const entrada = { titulo: 'x', cifras: [{ valor: '1', rotulo: 'a' }] }
    expect(normalizar(entrada)).toEqual(normalizar(entrada))
  })
})
