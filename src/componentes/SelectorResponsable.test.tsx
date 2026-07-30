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

  it('con sugerencia y sin tocar nada, el desplegable arranca vacío y el id no viaja', () => {
    // Lo que se ve elegido es lo que se guarda: la sugerencia se OFRECE, no
    // se aplica. Publicar en este estado no debe mandar ningún id — así el
    // acuerdo queda fuera de la bandeja (ver estadoInicialDeBandeja) hasta
    // que alguien confirme un responsable de verdad.
    const { container } = render(
      <SelectorResponsable
        personas={PERSONAS}
        valorInicial={{ nombre: 'Iris Múgica', mondayId: null }}
        sugerencia={PERSONAS[0]}
      />,
    )

    const select = container.querySelector('select') as HTMLSelectElement
    expect(select.value).toBe('')
    expect(ocultoDe(container, 'responsableMondayId')).toBe('')
    // El texto libre sigue siendo el nombre que trajo la IA, no un id.
    expect(ocultoDe(container, 'responsable')).toBe('Iris Múgica')
    // Pero la sugerencia SÍ se ve, ofrecida como algo aparte para confirmar.
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument()
  })

  it('aceptar la sugerencia con un clic sí manda el id, y el desplegable pasa a mostrarla elegida', async () => {
    const usuario = userEvent.setup()
    const { container } = render(
      <SelectorResponsable
        personas={PERSONAS}
        valorInicial={{ nombre: 'Iris Múgica', mondayId: null }}
        sugerencia={PERSONAS[0]}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: /confirmar/i }))

    const select = container.querySelector('select') as HTMLSelectElement
    expect(select.value).toBe('65476486')
    expect(ocultoDe(container, 'responsableMondayId')).toBe('65476486')
    expect(ocultoDe(container, 'responsable')).toBe('Iris Múgica')
    // Ya no hay nada más que confirmar: el botón desaparece.
    expect(screen.queryByRole('button', { name: /confirmar/i })).toBeNull()
  })

  it('sin sugerencia, no se ofrece ningún botón', () => {
    render(<SelectorResponsable personas={PERSONAS} valorInicial={{ nombre: 'Fernando Ruiz', mondayId: null }} sugerencia={null} />)
    expect(screen.queryByRole('button', { name: /confirmar/i })).toBeNull()
  })

  // Revisión final de la ronda 7, punto 7: este selector se pinta en páginas
  // que se comparten con el cliente interno por enlace firmado de 30 días —
  // el correo de cada persona no debe viajar al HTML, ni siquiera como un
  // atributo "invisible" como `title`.
  it('no expone el correo de nadie en el HTML (ni en title ni en ningún atributo)', () => {
    const { container } = render(<SelectorResponsable personas={PERSONAS} />)
    for (const p of PERSONAS) {
      expect(container.innerHTML).not.toContain(p.correo)
    }
  })
})
