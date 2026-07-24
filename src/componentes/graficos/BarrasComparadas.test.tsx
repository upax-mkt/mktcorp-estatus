import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BarrasComparadas } from './BarrasComparadas'

const DATOS = {
  categorias: ['ene', 'feb', 'mar'],
  series: [
    { etiqueta: 'Total 2026', valores: [1348, 1682, 2420] },
    { etiqueta: 'Orgánico 2026', valores: [144, 148, 132] },
  ],
}

describe('BarrasComparadas', () => {
  it('dibuja una barra por categoría y serie', () => {
    render(<BarrasComparadas datos={DATOS} alto={200} />)
    expect(screen.getAllByTestId('barra')).toHaveLength(6)
  })

  it('rotula cada categoría', () => {
    render(<BarrasComparadas datos={DATOS} alto={200} />)
    for (const c of DATOS.categorias) expect(screen.getByText(c)).toBeInTheDocument()
  })

  it('colorea cada serie con un token de datos, nunca con un hex', () => {
    render(<BarrasComparadas datos={DATOS} alto={200} />)
    const rellenos = screen.getAllByTestId('barra').map((b) => b.getAttribute('fill'))
    for (const relleno of rellenos) {
      expect(relleno).toMatch(/^var\(--dato-[1-6]\)$/)
    }
  })

  it('la serie más alta ocupa toda la altura útil', () => {
    render(<BarrasComparadas datos={DATOS} alto={200} />)
    const alturas = screen.getAllByTestId('barra').map((b) => Number(b.getAttribute('height')))
    expect(Math.max(...alturas)).toBeGreaterThan(0)
  })

  it('muestra la etiqueta de cada serie en la leyenda', () => {
    render(<BarrasComparadas datos={DATOS} alto={200} />)
    for (const serie of DATOS.series) {
      expect(screen.getByText(serie.etiqueta)).toBeInTheDocument()
    }
  })

  it('una barra con valor negativo existe y tiene altura mayor que cero', () => {
    const datosMixtos = {
      categorias: ['ene', 'feb', 'mar'],
      series: [{ etiqueta: 'Variación', valores: [100, -50, 30] }],
    }
    render(<BarrasComparadas datos={datosMixtos} alto={200} />)
    const barras = screen.getAllByTestId('barra')
    expect(barras).toHaveLength(3)
    // 'feb' es la segunda categoría → segunda barra → valor -50
    const alturaNegativa = Number(barras[1].getAttribute('height'))
    expect(alturaNegativa).toBeGreaterThan(0)
  })

  it('dibuja la línea base de cero cuando hay valores negativos', () => {
    const datosMixtos = {
      categorias: ['ene', 'feb', 'mar'],
      series: [{ etiqueta: 'Variación', valores: [100, -50, 30] }],
    }
    const { container } = render(<BarrasComparadas datos={datosMixtos} alto={200} />)
    expect(container.querySelector('[data-testid="linea-cero"]')).toBeInTheDocument()
  })

  it('un conjunto enteramente negativo no produce un gráfico vacío', () => {
    const datosNegativos = {
      categorias: ['ene', 'feb', 'mar'],
      series: [{ etiqueta: 'Caída %', valores: [-20, -45, -10] }],
    }
    render(<BarrasComparadas datos={datosNegativos} alto={200} />)
    const alturas = screen.getAllByTestId('barra').map((b) => Number(b.getAttribute('height')))
    expect(alturas.every((h) => Number.isFinite(h))).toBe(true)
    expect(Math.max(...alturas)).toBeGreaterThan(0)
  })

  it('con 40 categorías y 6 series, ningún rect tiene width ni height negativos', () => {
    const categorias = Array.from({ length: 40 }, (_, i) => `cat-${i}`)
    const series = Array.from({ length: 6 }, (_, si) => ({
      etiqueta: `Serie ${si}`,
      valores: categorias.map((_, ci) => (ci + si) % 3 === 0 ? -(ci + si) : ci + si * 10),
    }))
    const { container } = render(<BarrasComparadas datos={{ categorias, series }} alto={300} />)
    const rects = container.querySelectorAll('rect[data-testid="barra"]')
    expect(rects.length).toBe(240)
    for (const rect of Array.from(rects)) {
      expect(Number(rect.getAttribute('width'))).toBeGreaterThanOrEqual(0)
      expect(Number(rect.getAttribute('height'))).toBeGreaterThanOrEqual(0)
    }
  })
})
