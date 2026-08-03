import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ZonaSoltarAcuerdo } from './ZonaSoltarAcuerdo'

/** Doble mínimo de DataTransfer: solo lo que el componente lee. */
function dataTransfer(id: string) {
  return { getData: () => id, setData: vi.fn(), dropEffect: 'none' }
}

describe('ZonaSoltarAcuerdo', () => {
  it('soltar un acuerdo llama a alSoltar con su id: esta es la zona que de verdad cuenta', () => {
    const alSoltar = vi.fn()
    render(<ZonaSoltarAcuerdo acuerdos={[]} alSoltar={alSoltar} />)
    const zona = screen.getByRole('group', { name: /suelta aquí/i })

    fireEvent.drop(zona, { dataTransfer: dataTransfer('acuerdo-1') })

    expect(alSoltar).toHaveBeenCalledWith('acuerdo-1')
  })

  it('un drop sin id en el dataTransfer no llama a nada', () => {
    const alSoltar = vi.fn()
    render(<ZonaSoltarAcuerdo acuerdos={[]} alSoltar={alSoltar} />)
    const zona = screen.getByRole('group', { name: /suelta aquí/i })

    fireEvent.drop(zona, { dataTransfer: dataTransfer('') })

    expect(alSoltar).not.toHaveBeenCalled()
  })

  it('sin acuerdos retomados todavía, invita a soltar uno', () => {
    render(<ZonaSoltarAcuerdo acuerdos={[]} alSoltar={vi.fn()} />)
    expect(screen.getByText(/suelta aquí un acuerdo/i)).toBeInTheDocument()
  })

  it('con acuerdos ya retomados, dice cuántos — y que ya se ven abajo', () => {
    render(
      <ZonaSoltarAcuerdo
        acuerdos={[{ id: '1', que: 'Mandar propuesta', responsable: 'Iris', fechaCompromiso: null, estatus: 'abierto' }]}
        alSoltar={vi.fn()}
      />,
    )
    expect(screen.getByText(/1 acuerdo retomado/i)).toBeInTheDocument()
  })
})
