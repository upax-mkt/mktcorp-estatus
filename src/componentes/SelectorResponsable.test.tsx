import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SelectorResponsable } from './SelectorResponsable'

const PERSONAS = [
  { nombre: 'Iris Múgica', correo: 'iris.mugica@jansan.mx' },
  { nombre: 'César Mejía Medina', correo: 'julio.mejiam@upax.com.mx' },
]

function ocultoDe(container: HTMLElement, name: string): string {
  return (container.querySelector(`input[name="${name}"]`) as HTMLInputElement).value
}

describe('SelectorResponsable', () => {
  it('separa a Mkt Corp de la UDN: son dos controles distintos', () => {
    render(<SelectorResponsable personas={PERSONAS} />)
    expect(screen.getByRole('group', { name: /Mkt Corp/ })).toBeInTheDocument()
    expect(screen.getByLabelText(/de la UDN/i)).toBeInTheDocument()
  })

  it('sin lista de Mkt Corp no bloquea: se puede escribir un responsable de la UDN igual', () => {
    render(<SelectorResponsable personas={[]} />)
    expect(screen.getByText(/no se pudo cargar la gente de mkt corp/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/de la UDN/i)).toBeEnabled()
  })

  it('elegir a alguien de Mkt Corp manda su nombre como responsable', async () => {
    const usuario = userEvent.setup()
    const { container } = render(<SelectorResponsable personas={PERSONAS} />)

    await usuario.selectOptions(screen.getByLabelText(/^Responsable de Mkt Corp$/i), 'Iris Múgica')

    expect(ocultoDe(container, 'responsable')).toBe('Iris Múgica')
  })

  it('elegir en uno limpia el otro, con interacción real en los dos sentidos', async () => {
    const usuario = userEvent.setup()
    const { container } = render(<SelectorResponsable personas={PERSONAS} />)
    const select = screen.getByLabelText(/^Responsable de Mkt Corp$/i) as HTMLSelectElement
    const libreInput = screen.getByLabelText(/de la UDN/i)

    // Elegir de Mkt Corp y LUEGO escribir libre: gana lo escrito.
    await usuario.selectOptions(select, 'Iris Múgica')
    expect(ocultoDe(container, 'responsable')).toBe('Iris Múgica')
    await usuario.type(libreInput, 'Alguien de la UDN')
    expect(select.value).toBe('')
    expect(ocultoDe(container, 'responsable')).toBe('Alguien de la UDN')

    // El caso inverso: escribir libre y LUEGO elegir de Mkt Corp borra el texto libre.
    await usuario.clear(libreInput)
    await usuario.type(libreInput, 'Otra persona de la UDN')
    expect(libreInput).toHaveValue('Otra persona de la UDN')
    await usuario.selectOptions(select, 'César Mejía Medina')
    expect(libreInput).toHaveValue('')
    expect(ocultoDe(container, 'responsable')).toBe('César Mejía Medina')
  })

  it('escribir en el campo de la UDN manda ese texto como responsable', async () => {
    const usuario = userEvent.setup()
    const { container } = render(<SelectorResponsable personas={PERSONAS} />)

    await usuario.type(screen.getByLabelText(/de la UDN/i), 'Fernando Ruiz')

    expect(ocultoDe(container, 'responsable')).toBe('Fernando Ruiz')
  })

  it('con sugerencia y sin tocar nada, el desplegable arranca vacío: se OFRECE, no se aplica', () => {
    // Lo que se ve elegido es lo que se guarda. Publicar en este estado deja
    // el nombre que trajo la IA como texto, no como una asignación que nadie
    // confirmó.
    const { container } = render(
      <SelectorResponsable personas={PERSONAS} valorInicial="Iris Múgica" sugerencia={PERSONAS[0]} />,
    )

    const select = screen.getByLabelText(/^Responsable de Mkt Corp$/i) as HTMLSelectElement
    expect(select.value).toBe('')
    // El texto libre sigue siendo el nombre que trajo la IA.
    expect(ocultoDe(container, 'responsable')).toBe('Iris Múgica')
    // Pero la sugerencia SÍ se ve, ofrecida como algo aparte para confirmar.
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument()
  })

  /**
   * ⚠️ EL DESPLEGABLE ARRANCA VACÍO AUNQUE EL NOMBRE COINCIDA EXACTAMENTE con
   * alguien de la lista. Sin este test, "reabrir en el control correcto"
   * parece una mejora inofensiva — y en la minuta significa que la persona
   * que la IA nombró aparece YA ELEGIDA y se guarda sin que nadie la
   * confirme: el defecto que corrigió la ronda 7, por otra puerta.
   */
  it('un nombre idéntico al de alguien de Mkt Corp tampoco preselecciona a nadie', () => {
    const { container } = render(
      <SelectorResponsable personas={PERSONAS} valorInicial="César Mejía Medina" />,
    )

    expect((screen.getByLabelText(/^Responsable de Mkt Corp$/i) as HTMLSelectElement).value).toBe('')
    expect(screen.getByLabelText(/de la UDN/i)).toHaveValue('César Mejía Medina')
    expect(ocultoDe(container, 'responsable')).toBe('César Mejía Medina')
  })

  it('aceptar la sugerencia con un clic sí la elige, y el desplegable pasa a mostrarla', async () => {
    const usuario = userEvent.setup()
    const { container } = render(
      <SelectorResponsable personas={PERSONAS} valorInicial="Iris Múgica" sugerencia={PERSONAS[0]} />,
    )

    await usuario.click(screen.getByRole('button', { name: /confirmar/i }))

    expect((screen.getByLabelText(/^Responsable de Mkt Corp$/i) as HTMLSelectElement).value).toBe('Iris Múgica')
    expect(ocultoDe(container, 'responsable')).toBe('Iris Múgica')
    // Ya no hay nada más que confirmar: el botón desaparece.
    expect(screen.queryByRole('button', { name: /confirmar/i })).toBeNull()
  })

  it('sin sugerencia, no se ofrece ningún botón', () => {
    render(<SelectorResponsable personas={PERSONAS} valorInicial="Fernando Ruiz" sugerencia={null} />)
    expect(screen.queryByRole('button', { name: /confirmar/i })).toBeNull()
  })

  // Revisión final de la ronda 7, punto 7: este selector se pinta en páginas
  // que se comparten con el cliente interno por enlace firmado de 30 días —
  // el correo de cada persona no debe viajar al HTML, ni siquiera como un
  // atributo "invisible" como `title`. Por eso el `value` de cada opción es
  // el NOMBRE, que además es lo único que se guarda.
  it('no expone el correo de nadie en el HTML (ni en title ni en ningún atributo)', () => {
    const { container } = render(<SelectorResponsable personas={PERSONAS} />)
    for (const p of PERSONAS) {
      expect(container.innerHTML).not.toContain(p.correo)
    }
  })

  /**
   * UN EQUIPO COMO RESPONSABLE (13-ago). Franco: *"no los puedo editar ni la
   * persona ni el equipo (UDN o Squads de mkt)"*. Un compromiso puede ser de
   * un squad entero, y hasta entonces la única forma era teclear su nombre en
   * el campo de la UDN — que produce tres grafías del mismo squad.
   */
  describe('con equipos', () => {
    const EQUIPOS = { squads: ['RevOps & Analytics', 'Inbound Studio'], udns: ['NeraCode'] }

    it('no se ofrece ningún equipo si la pantalla no pasa la lista', () => {
      render(<SelectorResponsable personas={PERSONAS} />)
      expect(screen.queryByLabelText(/equipo/i)).toBeNull()
    })

    it('elegir un equipo manda su nombre como responsable', async () => {
      const usuario = userEvent.setup()
      const { container } = render(<SelectorResponsable personas={PERSONAS} equipos={EQUIPOS} />)
      await usuario.selectOptions(screen.getByLabelText(/equipo responsable/i), 'RevOps & Analytics')
      expect(ocultoDe(container, 'responsable')).toBe('RevOps & Analytics')
    })

    it('elegir equipo limpia a la persona, y elegir persona limpia al equipo: un acuerdo tiene UN responsable', async () => {
      const usuario = userEvent.setup()
      const { container } = render(<SelectorResponsable personas={PERSONAS} equipos={EQUIPOS} />)
      const equipo = screen.getByLabelText(/equipo responsable/i) as HTMLSelectElement

      await usuario.selectOptions(screen.getByLabelText(/^Responsable de Mkt Corp$/i), 'Iris Múgica')
      await usuario.selectOptions(equipo, 'Inbound Studio')
      expect(ocultoDe(container, 'responsable')).toBe('Inbound Studio')
      expect((screen.getByLabelText(/^Responsable de Mkt Corp$/i) as HTMLSelectElement).value).toBe('')

      await usuario.selectOptions(screen.getByLabelText(/^Responsable de Mkt Corp$/i), 'Iris Múgica')
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
      render(<SelectorResponsable personas={PERSONAS} equipos={EQUIPOS} valorInicial="Inbound Studio" />)
      expect((screen.getByLabelText(/equipo responsable/i) as HTMLSelectElement).value).toBe('Inbound Studio')
      expect(screen.getByLabelText(/de la UDN/i)).toHaveValue('')
    })

    it('un nombre que no es de ningún equipo sigue reabriendo en el texto libre', () => {
      render(<SelectorResponsable personas={PERSONAS} equipos={EQUIPOS} valorInicial="Pablo Levy" />)
      expect(screen.getByLabelText(/de la UDN/i)).toHaveValue('Pablo Levy')
      expect((screen.getByLabelText(/equipo responsable/i) as HTMLSelectElement).value).toBe('')
    })
  })
})
