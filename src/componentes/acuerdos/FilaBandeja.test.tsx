import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FilaBandeja } from './FilaBandeja'

const ACUERDO = {
  id: 'a1',
  que: 'Enviar propuesta de paid media',
  responsable: 'Iris Múgica',
  salaSlug: 'mexa-creativa',
  salaNombre: 'Mexa Creativa',
  fechaCompromiso: '2026-08-12',
}

describe('FilaBandeja', () => {
  it('empieza en «elemento nuevo»: colgar de algo es la excepción, no lo normal', () => {
    render(
      <FilaBandeja
        acuerdo={ACUERDO}
        elementos={[{ id: '9', nombre: 'MC | Campaña Paid media' }]}
        subir={vi.fn()}
        descartar={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Elemento nuevo')).toBeChecked()
  })

  it('no deja elegir «subelemento de» sin haber elegido de cuál', () => {
    render(<FilaBandeja acuerdo={ACUERDO} elementos={[]} subir={vi.fn()} descartar={vi.fn()} />)
    expect(screen.getByLabelText('Subelemento de')).toBeDisabled()
  })

  it('dice de qué sala es: la bandeja mezcla las diez', () => {
    render(<FilaBandeja acuerdo={ACUERDO} elementos={[]} subir={vi.fn()} descartar={vi.fn()} />)
    expect(screen.getByText('Mexa Creativa')).toBeInTheDocument()
  })
})
