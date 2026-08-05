import { describe, it, expect } from 'vitest'
import { parsearTablaTexto, formatearTablaTexto, parsearCifrasTexto } from './documentos'

/**
 * La captura de una tabla es el cuello de botella del cuestionario: en el deck
 * de referencia (Mexa Creativa, junio 2026) la tabla aparece tres veces, y
 * hasta ahora no había forma de meter ninguna. Estos tests fijan el contrato de
 * cómo llega desde el navegador.
 */
describe('parsearTablaTexto', () => {
  it('lee una tabla pegada desde Sheets (celdas separadas por tabulador)', () => {
    const pegado = '\tMayo\tJunio\nSesiones\t1,366\t968\nMQLs\t3\t1'
    expect(parsearTablaTexto(pegado)).toEqual([
      ['', 'Mayo', 'Junio'],
      ['Sesiones', '1,366', '968'],
      ['MQLs', '3', '1'],
    ])
  })

  it('lee una tabla escrita a mano con barras', () => {
    const escrito = ' | Mayo | Junio\nSesiones | 1,366 | 968'
    expect(parsearTablaTexto(escrito)).toEqual([
      ['', 'Mayo', 'Junio'],
      ['Sesiones', '1,366', '968'],
    ])
  })

  it('el tabulador manda sobre la barra: una celda de Sheets puede contener "|"', () => {
    const pegado = 'Métrica\tJunio\nSQL | Opp\t12'
    expect(parsearTablaTexto(pegado)).toEqual([
      ['Métrica', 'Junio'],
      ['SQL | Opp', '12'],
    ])
  })

  it('cuadra las filas al ancho del encabezado', () => {
    // Una fila corta (falta una celda) y una larga (sobra). Sin esto la tabla
    // sale descuadrada y el render pinta columnas que no existen.
    const pegado = 'Métrica\tMayo\tJunio\nSesiones\t1366\nMQLs\t3\t1\t99'
    expect(parsearTablaTexto(pegado)).toEqual([
      ['Métrica', 'Mayo', 'Junio'],
      ['Sesiones', '1366', ''],
      ['MQLs', '3', '1'],
    ])
  })

  it('ignora las líneas en blanco de en medio', () => {
    expect(parsearTablaTexto('a\tb\n\n1\t2\n   \n')).toEqual([['a', 'b'], ['1', '2']])
  })

  it('devuelve vacío cuando no hay nada que leer', () => {
    expect(parsearTablaTexto('')).toEqual([])
    expect(parsearTablaTexto('   \n  ')).toEqual([])
  })

  it('lo que se guarda se puede volver a editar sin perder nada', () => {
    const original = '\tMayo\tJunio\nSesiones\t1,366\t968'
    const tabla = parsearTablaTexto(original)
    expect(parsearTablaTexto(formatearTablaTexto([tabla]))).toEqual(tabla)
  })
})

describe('formatearTablaTexto', () => {
  it('sin tabla, el campo se muestra vacío', () => {
    expect(formatearTablaTexto(undefined)).toBe('')
    expect(formatearTablaTexto([])).toBe('')
  })
})

describe('parsearCifrasTexto', () => {
  it('lee valor, rótulo y delta, y descarta la línea sin rótulo', () => {
    expect(parsearCifrasTexto('9.2 | Posición media | -0.3\n29k | Impresiones\nbasura')).toEqual([
      { valor: '9.2', rotulo: 'Posición media', delta: '-0.3' },
      { valor: '29k', rotulo: 'Impresiones', delta: undefined },
    ])
  })
})
