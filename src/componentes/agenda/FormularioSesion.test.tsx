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

/**
 * TÍTULO (auditoría UX/UI, ronda 11 — "el título de una reunión no dice de
 * qué es"): a diferencia de `AgendarRapido.tsx` (el atajo del Home, que hasta
 * esta ronda no ofrecía el campo), este formulario completo YA tenía "Título"
 * desde antes — pero sin un test propio que lo demostrara: nada en esta
 * suite lo ejercitaba. Estos tests fijan el comportamiento que la auditoría
 * dio por sentado que faltaba aquí (no faltaba el campo; faltaba la prueba
 * de que sobrevive hasta `enviarAction` sin que nada lo recorte ni lo pise) y
 * cierran el mismo vocabulario que ahora también ofrece `AgendarRapido.tsx`:
 * el campo se llama "Título" en los dos formularios.
 */
describe('FormularioSesion — título (auditoría UX/UI, ronda 11)', () => {
  it('ofrece un campo de Título, y no bloquea "Agendar" si se deja vacío (opcional también aquí)', () => {
    render(
      <FormularioSesion
        salas={SALAS}
        etiquetaEnviar="Agendar"
        enviarAction={vi.fn()}
        inicial={{ dia: '2026-08-17' }}
      />,
    )
    const campo = screen.getByLabelText(/título/i)
    expect(campo).toBeInTheDocument()
    expect(campo).not.toBeRequired()
    expect(screen.getByRole('button', { name: /agendar/i })).not.toBeDisabled()
  })

  it('un título escrito a mano viaja tal cual a enviarAction() — nada lo recorta ni lo sustituye en el cliente', async () => {
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

    await usuario.type(screen.getByLabelText(/título/i), 'Estatus Comercial Quincenal')
    await usuario.click(screen.getByRole('button', { name: /agendar/i }))

    expect(enviarAction).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ titulo: 'Estatus Comercial Quincenal' }),
    )
  })

  it('al editar, arranca con el título que ya tenía la reunión — no en blanco', () => {
    render(
      <FormularioSesion
        salas={SALAS}
        etiquetaEnviar="Guardar cambios"
        enviarAction={vi.fn()}
        inicial={{ salaSlug: 'research-land', dia: '2026-08-03', titulo: 'Estatus Comercial Quincenal' }}
      />,
    )
    expect(screen.getByLabelText(/título/i)).toHaveValue('Estatus Comercial Quincenal')
  })
})
