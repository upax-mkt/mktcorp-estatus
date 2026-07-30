import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SelectorResponsable } from './SelectorResponsable'

const PERSONAS = [
  { id: '65476486', nombre: 'Iris Múgica', correo: 'iris.mugica@jansan.mx' },
  { id: '67757625', nombre: 'César Mejía Medina', correo: 'julio.mejiam@upax.com.mx' },
]

function ocultoDe(container: HTMLElement, name: string): string {
  return (container.querySelector(`input[name="${name}"]`) as HTMLInputElement).value
}

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

  it('elegir en uno limpia el otro, con interacción real en los dos sentidos', async () => {
    const usuario = userEvent.setup()
    const { container } = render(<SelectorResponsable personas={PERSONAS} />)
    const select = container.querySelector('select') as HTMLSelectElement
    const libreInput = screen.getByLabelText(/de la UDN/i)

    // Elegir de Mkt Corp y LUEGO escribir libre: el id tiene que volver a vacío.
    await usuario.selectOptions(select, '65476486')
    expect(ocultoDe(container, 'responsableMondayId')).toBe('65476486')
    await usuario.type(libreInput, 'Alguien de la UDN')
    expect(ocultoDe(container, 'responsableMondayId')).toBe('')
    expect(ocultoDe(container, 'responsable')).toBe('Alguien de la UDN')

    // El caso inverso: escribir libre y LUEGO elegir de Mkt Corp borra el texto libre.
    await usuario.selectOptions(select, '')
    await usuario.clear(libreInput)
    await usuario.type(libreInput, 'Otra persona de la UDN')
    expect(libreInput).toHaveValue('Otra persona de la UDN')
    await usuario.selectOptions(select, '67757625')
    expect(libreInput).toHaveValue('')
    expect(ocultoDe(container, 'responsableMondayId')).toBe('67757625')
    expect(ocultoDe(container, 'responsable')).toBe('César Mejía Medina')
  })

  it('escribir en el campo de la UDN manda ese texto como responsable y el id vacío', async () => {
    const usuario = userEvent.setup()
    const { container } = render(<SelectorResponsable personas={PERSONAS} />)

    await usuario.type(screen.getByLabelText(/de la UDN/i), 'Fernando Ruiz')

    expect(ocultoDe(container, 'responsable')).toBe('Fernando Ruiz')
    expect(ocultoDe(container, 'responsableMondayId')).toBe('')
  })

  it('una sugerencia de personaMasParecida() se preselecciona pero se ve como sugerencia, no como un hecho', async () => {
    const usuario = userEvent.setup()
    const { container } = render(
      <SelectorResponsable
        personas={PERSONAS}
        valorInicial={{ nombre: 'Iris Múgica', mondayId: '65476486', sugerido: true }}
      />,
    )

    // Preseleccionada de verdad: el id viaja aunque nadie la haya tocado.
    expect(ocultoDe(container, 'responsableMondayId')).toBe('65476486')
    // Pero marcada como sugerencia, no como una elección confirmada.
    expect(screen.getByText(/sugerencia/i)).toBeInTheDocument()

    // Confirmar (tocar el selector, aunque sea a la misma persona) apaga el aviso.
    const select = container.querySelector('select') as HTMLSelectElement
    await usuario.selectOptions(select, '65476486')
    expect(screen.queryByText(/sugerencia/i)).toBeNull()
  })

  it('sin sugerido, un valorInicial con id se ve como una elección normal, no como sugerencia', () => {
    render(<SelectorResponsable personas={PERSONAS} valorInicial={{ nombre: 'Iris Múgica', mondayId: '65476486' }} />)
    expect(screen.queryByText(/sugerencia/i)).toBeNull()
  })
})
