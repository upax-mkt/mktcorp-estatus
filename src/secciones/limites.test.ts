import { describe, it, expect } from 'vitest'
import { maquetarBorrador } from '@/motor/maquetar'
import type { BorradorSeccion } from './borrador'

/**
 * LO QUE EL EDITOR DEJA ARMAR Y EL ESQUEMA RECHAZA.
 *
 * Franco: "detecté problemas cuando se configuran algunos elementos y
 * componentes tiran error en la maquetación".
 *
 * Aquí está el porqué. El esquema pone topes —4 cifras, 4 columnas, 2
 * gráficos, 3 tablas, 6 columnas por tabla— y el editor no ponía ninguno: los
 * botones de "añadir" seguían añadiendo. Se descubre al maquetar, después de
 * escribirlo todo, y el aviso que salía era el de Zod en inglés.
 *
 * Los topes viven en `LIMITES` (src/decision/esquema.ts) y los leen los dos
 * lados. Estos tests fijan el contrato: pasarse degrada, y el motivo dice el
 * número.
 */

const BASE = { layout: 'kpis-fila-dos-columnas' as const, titulo: 'Un título' }

function cifras(n: number) {
  return Array.from({ length: n }, (_, i) => ({ valor: `${i + 1}k`, rotulo: `Cifra ${i + 1}` }))
}

function columnas(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    titulo: `Columna ${i + 1}`,
    puntos: [{ texto: 'Una línea' }],
  }))
}

describe('pasarse de los topes del esquema', () => {
  it('una quinta cifra tumba la sección entera', () => {
    const r = maquetarBorrador({ ...BASE, kpis: cifras(5) }, 'Sección')
    expect(r.degradado).toBe(true)
  })

  it('cuatro cifras, que es el tope, pasan', () => {
    const r = maquetarBorrador({ ...BASE, kpis: cifras(4) }, 'Sección')
    expect(r.degradado, r.motivo).toBe(false)
  })

  it('una quinta columna tumba la sección', () => {
    const r = maquetarBorrador(
      { layout: 'texto-multicolumna', titulo: 'T', columnas: columnas(5) } as BorradorSeccion,
      'Sección',
    )
    expect(r.degradado).toBe(true)
  })

  it('una séptima columna de tabla tumba la sección', () => {
    const r = maquetarBorrador(
      {
        layout: 'pendientes-semaforo',
        titulo: 'T',
        tablas: [{
          columnas: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
          filas: [{ celdas: ['1', '2', '3', '4', '5', '6', '7'] }],
        }],
      } as BorradorSeccion,
      'Sección',
    )
    expect(r.degradado).toBe(true)
  })
})

describe('campos obligatorios que el editor deja vacíos', () => {
  it('una columna SIN puntos tumba la sección', () => {
    // El editor deja añadir una columna y dejarla sin líneas. El esquema
    // exige al menos una.
    const r = maquetarBorrador(
      { layout: 'texto-multicolumna', titulo: 'T', columnas: [{ titulo: 'Hallazgos', puntos: [] }] } as BorradorSeccion,
      'Sección',
    )
    expect(r.degradado).toBe(true)
  })

  it('una cifra sin valor tumba la sección', () => {
    const r = maquetarBorrador({ ...BASE, kpis: [{ valor: '', rotulo: 'Impresiones' }] }, 'Sección')
    expect(r.degradado).toBe(true)
  })

  it('un gráfico sin periodos tumba la sección', () => {
    // Pasa al vaciar la fila de encabezados de la rejilla: `construirGrafico`
    // filtra las vacías y `periodos` se queda en [].
    const r = maquetarBorrador(
      {
        layout: 'grafico-y-tabla',
        titulo: 'T',
        graficos: [{ tipo: 'barras', periodos: [], series: [{ etiqueta: 'S', valores: [] }] }],
      } as BorradorSeccion,
      'Sección',
    )
    expect(r.degradado).toBe(true)
  })
})

describe('el motivo que se le enseña a quien escribió la sección', () => {
  it('está en español y dice qué campo y qué tope', () => {
    const r = maquetarBorrador({ ...BASE, kpis: cifras(5) }, 'Sección')
    expect(r.motivo).toMatch(/cifras|Cifras/)
    expect(r.motivo).toMatch(/4/)
    // Nada de "Too big: expected array to have <=4 items".
    expect(r.motivo).not.toMatch(/Too big|expected|array/i)
  })

  it('una columna sin puntos se explica, no se numera', () => {
    const r = maquetarBorrador(
      { layout: 'texto-multicolumna', titulo: 'T', columnas: [{ titulo: 'Hallazgos', puntos: [] }] } as BorradorSeccion,
      'Sección',
    )
    expect(r.motivo).not.toMatch(/Too small|expected|array/i)
    expect(r.motivo).toMatch(/línea|linea|punto/i)
  })
})
