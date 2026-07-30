import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SelectorResponsable } from './SelectorResponsable'

const PERSONAS = [
  { id: '65476486', nombre: 'Iris Múgica', correo: 'iris.mugica@jansan.mx' },
  { id: '67757625', nombre: 'César Mejía Medina', correo: 'julio.mejiam@upax.com.mx' },
]

describe('SelectorResponsable', () => {
  it('separa a Mkt Corp de la UDN: de ahí sale si el acuerdo viaja al tablero', () => {
    render(<SelectorResponsable personas={PERSONAS} />)
    expect(screen.getByRole('group', { name: /Mkt Corp/ })).toBeInTheDocument()
    expect(screen.getByLabelText(/de la UDN/i)).toBeInTheDocument()
  })

  it('sin directorio no bloquea: se puede escribir un responsable de la UDN igual', () => {
    render(<SelectorResponsable personas={[]} />)
    expect(screen.getByText(/no se pudo cargar la gente de Monday/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/de la UDN/i)).toBeEnabled()
  })

  it('elegir a alguien de Mkt Corp manda su id junto al nombre', async () => {
    const { container } = render(<SelectorResponsable personas={PERSONAS} valorInicial={{ nombre: 'Iris Múgica', mondayId: '65476486' }} />)
    const oculto = container.querySelector('input[name="responsableMondayId"]') as HTMLInputElement
    expect(oculto.value).toBe('65476486')
  })
})
