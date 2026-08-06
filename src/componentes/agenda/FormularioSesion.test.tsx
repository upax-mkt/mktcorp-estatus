import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormularioSesion } from './FormularioSesion'

const SALAS = [{ slug: 'research-land', nombre: 'Research Land', color: '#614ACA' }]

// QUINCENAL EN LA INTERFAZ (ronda 10, tarea 16): el TIPO de una reunión
// concreta —no confundir con la cadencia de la SALA, que elige
// `FormularioSala` (ver su propio test)— gana un tercer valor.
// `PanelAgenda.tsx` ya había ensanchado el tipo para poder RECIBIR una
// reunión quincenal (la comercial de Research Land) sin reventar; lo que
// faltaba era poder ELEGIRLO aquí. Sin estos tests, un `<option>` suelto
// que se desincroniza del enum real (o un cast que lo recorta de vuelta a
// dos valores) habría pasado desapercibido.
//
// ETIQUETA CORREGIDA (revisión final de la ronda 10): el campo se busca por
// "Tipo de reunión", no por "cadencia" — ese nombre quedó reservado para el
// otro eje, el de `FormularioSala`. Ver el comentario de `tipo` en
// `DatosFormulario`, arriba del componente.
describe('FormularioSesion — tipo de reunión (ronda 10, tarea 16: quincenal en la interfaz)', () => {
  it('el tipo de una reunión se puede poner quincenal', () => {
    render(<FormularioSesion salas={SALAS} etiquetaEnviar="Agendar" enviarAction={vi.fn()} />)
    expect(screen.getByRole('option', { name: /quincenal/i })).toBeInTheDocument()
  })

  it('ofrece los tres tipos en orden de más a menos frecuente: Semanal, Quincenal, Mensual', () => {
    render(<FormularioSesion salas={SALAS} etiquetaEnviar="Agendar" enviarAction={vi.fn()} />)
    const opciones = within(screen.getByLabelText(/tipo de reunión/i))
      .getAllByRole('option')
      .map((o) => o.textContent)
    expect(opciones).toEqual(['Semanal', 'Quincenal', 'Mensual'])
  })

  it('al editar una reunión ya quincenal (Research Land), arranca con ese tipo seleccionado', () => {
    render(
      <FormularioSesion
        salas={SALAS}
        etiquetaEnviar="Guardar cambios"
        enviarAction={vi.fn()}
        inicial={{ salaSlug: 'research-land', dia: '2026-08-17', tipo: 'quincenal' }}
      />,
    )
    expect(screen.getByLabelText(/tipo de reunión/i)).toHaveValue('quincenal')
  })

  it('el tipo elegido viaja a enviarAction() junto con el resto', async () => {
    const enviarAction = vi.fn().mockResolvedValue({})
    const usuario = userEvent.setup()
    render(
      <FormularioSesion
        salas={SALAS}
        etiquetaEnviar="Agendar"
        enviarAction={enviarAction}
        inicial={{ dia: '2026-08-17' }}
      />,
    )

    await usuario.selectOptions(screen.getByLabelText(/tipo de reunión/i), 'quincenal')
    await usuario.click(screen.getByRole('button', { name: /agendar/i }))

    expect(enviarAction).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ tipo: 'quincenal' }))
  })
})
