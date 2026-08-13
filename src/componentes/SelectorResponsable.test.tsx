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

  /**
   * Monday está apagado en esta app, así que el desplegable se llena del
   * directorio propio y sus ids llevan el prefijo `app:` — que NO es un id
   * del tablero y no puede acabar en `responsableMondayId`.
   */
  it('elegir a alguien del directorio propio guarda su nombre y ningún id de Monday', async () => {
    const usuario = userEvent.setup()
    const { container } = render(
      <SelectorResponsable personas={[{ id: 'app:Ileana Cruz', nombre: 'Ileana Cruz', correo: 'x@upax.com.mx' }]} />,
    )
    await usuario.selectOptions(screen.getByLabelText(/Responsable de Mkt Corp/i), 'app:Ileana Cruz')
    expect(ocultoDe(container, 'responsable')).toBe('Ileana Cruz')
    expect(ocultoDe(container, 'responsableMondayId')).toBe('')
  })

  it('el correo del directorio propio tampoco viaja al HTML: el id va sobre el nombre', () => {
    const { container } = render(
      <SelectorResponsable personas={[{ id: 'app:Ileana Cruz', nombre: 'Ileana Cruz', correo: 'ileana@upax.com.mx' }]} />,
    )
    expect(container.innerHTML).not.toContain('ileana@upax.com.mx')
  })

  /**
   * UN EQUIPO COMO RESPONSABLE (13-ago). Franco: *"no los puedo editar ni la
   * persona ni el equipo (UDN o Squads de mkt)"*. Un compromiso puede ser de
   * un squad entero, y hasta hoy la única forma era teclear su nombre en el
   * campo de la UDN — que produce tres grafías del mismo squad.
   */
  describe('con equipos', () => {
    const EQUIPOS = { squads: ['RevOps & Analytics', 'Inbound Studio'], udns: ['NeraCode'] }

    it('no se ofrece ningún equipo si la pantalla no pasa la lista', () => {
      render(<SelectorResponsable personas={PERSONAS} />)
      expect(screen.queryByLabelText(/equipo/i)).toBeNull()
    })

    it('elegir un equipo manda su nombre y deja el id de Monday vacío: un squad no es un usuario del tablero', async () => {
      const usuario = userEvent.setup()
      const { container } = render(<SelectorResponsable personas={PERSONAS} equipos={EQUIPOS} />)
      await usuario.selectOptions(screen.getByLabelText(/equipo responsable/i), 'RevOps & Analytics')
      expect(ocultoDe(container, 'responsable')).toBe('RevOps & Analytics')
      expect(ocultoDe(container, 'responsableMondayId')).toBe('')
    })

    it('elegir equipo limpia a la persona, y elegir persona limpia al equipo: un acuerdo tiene UN responsable', async () => {
      const usuario = userEvent.setup()
      const { container } = render(<SelectorResponsable personas={PERSONAS} equipos={EQUIPOS} />)
      const equipo = screen.getByLabelText(/equipo responsable/i) as HTMLSelectElement

      await usuario.selectOptions(screen.getByLabelText(/Responsable de Mkt Corp/i), '65476486')
      await usuario.selectOptions(equipo, 'Inbound Studio')
      expect(ocultoDe(container, 'responsable')).toBe('Inbound Studio')
      expect(ocultoDe(container, 'responsableMondayId')).toBe('')

      await usuario.selectOptions(screen.getByLabelText(/Responsable de Mkt Corp/i), '65476486')
      expect(ocultoDe(container, 'responsable')).toBe('Iris Múgica')
      expect(equipo.value).toBe('')
    })

    it('escribir un nombre de la UDN también limpia el equipo elegido', async () => {
      const usuario = userEvent.setup()
      const { container } = render(<SelectorResponsable personas={PERSONAS} equipos={EQUIPOS} />)
      await usuario.selectOptions(screen.getByLabelText(/equipo responsable/i), 'NeraCode')
      await usuario.type(screen.getByLabelText(/de la UDN/i), 'Pablo Levy')
      expect(ocultoDe(container, 'responsable')).toBe('Pablo Levy')
      expect((screen.getByLabelText(/equipo responsable/i) as HTMLSelectElement).value).toBe('')
    })

    /**
     * Sin esto, reabrir un acuerdo cuyo responsable es un squad lo enseñaría
     * en el campo de texto libre —como si alguien lo hubiera tecleado— y
     * guardarlo sin tocar nada lo dejaría igual pero por otro camino. El
     * control en el que aparece es lo que le dice a quien edita qué clase de
     * responsable tiene delante.
     */
    it('reabre en el desplegable de equipo lo que se guardó como equipo, no en el texto libre', () => {
      render(
        <SelectorResponsable
          personas={PERSONAS}
          equipos={EQUIPOS}
          valorInicial={{ nombre: 'Inbound Studio', mondayId: null }}
        />,
      )
      expect((screen.getByLabelText(/equipo responsable/i) as HTMLSelectElement).value).toBe('Inbound Studio')
      expect(screen.getByLabelText(/de la UDN/i)).toHaveValue('')
    })

    it('un nombre que no es de ningún equipo sigue reabriendo en el texto libre', () => {
      render(
        <SelectorResponsable
          personas={PERSONAS}
          equipos={EQUIPOS}
          valorInicial={{ nombre: 'Pablo Levy', mondayId: null }}
        />,
      )
      expect(screen.getByLabelText(/de la UDN/i)).toHaveValue('Pablo Levy')
      expect((screen.getByLabelText(/equipo responsable/i) as HTMLSelectElement).value).toBe('')
    })
  })
})
