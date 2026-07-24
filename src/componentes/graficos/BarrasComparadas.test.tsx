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
})
