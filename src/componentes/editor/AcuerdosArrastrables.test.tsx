import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AcuerdosArrastrables } from './AcuerdosArrastrables'

const A = (id: string, que: string, fecha: string | null, estatus = 'abierto') =>
  ({ id, que, responsable: 'Iris', fechaCompromiso: fecha, estatus })

describe('AcuerdosArrastrables', () => {
  it('los vencidos van primero: son los que hay que retomar', () => {
    render(<AcuerdosArrastrables acuerdos={[A('1','al día','2026-12-01'), A('2','vencido','2026-01-01','vencido')]} alArrastrar={vi.fn()} />)
    const filas = screen.getAllByRole('listitem')
    expect(filas[0]).toHaveTextContent('vencido')
  })

  it('sin acuerdos abiertos lo dice, en vez de una columna muda', () => {
    render(<AcuerdosArrastrables acuerdos={[]} alArrastrar={vi.fn()} />)
    expect(screen.getByText(/no hay acuerdos abiertos/i)).toBeInTheDocument()
  })

  it('cada acuerdo se puede arrastrar y también añadir con un botón', () => {
    render(<AcuerdosArrastrables acuerdos={[A('1','algo','2026-12-01')]} alArrastrar={vi.fn()} />)
    expect(screen.getByRole('listitem')).toHaveAttribute('draggable', 'true')
    expect(screen.getByRole('button', { name: /añadir/i })).toBeInTheDocument()
  })
})
