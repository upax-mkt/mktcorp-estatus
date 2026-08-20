import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NuevoAcuerdoForm } from './NuevoAcuerdoForm'

const PERSONAS = [{ nombre: 'Iris Múgica', correo: 'iris.mugica@jansan.mx' }]

/**
 * El borde del formulario: qué llega de verdad a `crearAcuerdo` cuando alguien
 * da de alta un acuerdo desde la sala.
 *
 * Hasta el 20-ago-2026 este archivo vigilaba que nunca se guardara `''` como
 * id de Monday (aguas abajo, `Number('') === 0` lo habría asignado a un
 * usuario que no existe). Con Monday desmontado el dueño es un NOMBRE y solo
 * un nombre; lo que hay que vigilar es que un acuerdo sin responsable no
 * nazca con la cadena vacía en su lugar.
 */
describe('NuevoAcuerdoForm', () => {
  it('sin responsable, el acuerdo nace "por asignar" — nunca con una cadena vacía', async () => {
    const usuario = userEvent.setup()
    const crearAction = vi.fn(async () => {})
    render(<NuevoAcuerdoForm crearAction={crearAction} personas={PERSONAS} />)

    await usuario.click(screen.getByRole('button', { name: '+ Añadir acuerdo' }))
    await usuario.type(screen.getByPlaceholderText('Qué se acordó'), 'Enviar propuesta de paid media')
    await usuario.click(screen.getByRole('button', { name: 'Añadir' }))

    await waitFor(() => expect(crearAction).toHaveBeenCalled())
    expect(crearAction).toHaveBeenCalledWith(
      expect.objectContaining({ responsable: 'por asignar' }),
    )
  })

  it('eligiendo a alguien de Mkt Corp, manda su nombre como responsable', async () => {
    const usuario = userEvent.setup()
    const crearAction = vi.fn(async () => {})
    render(<NuevoAcuerdoForm crearAction={crearAction} personas={PERSONAS} />)

    await usuario.click(screen.getByRole('button', { name: '+ Añadir acuerdo' }))
    await usuario.type(screen.getByPlaceholderText('Qué se acordó'), 'Enviar propuesta de paid media')
    await usuario.selectOptions(screen.getByLabelText(/^Responsable de Mkt Corp$/i), 'Iris Múgica')
    await usuario.click(screen.getByRole('button', { name: 'Añadir' }))

    await waitFor(() => expect(crearAction).toHaveBeenCalled())
    expect(crearAction).toHaveBeenCalledWith(
      expect.objectContaining({ responsable: 'Iris Múgica' }),
    )
  })
})
