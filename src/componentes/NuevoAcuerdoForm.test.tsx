import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NuevoAcuerdoForm } from './NuevoAcuerdoForm'

const PERSONAS = [
  { id: '65476486', nombre: 'Iris Múgica', correo: 'iris.mugica@jansan.mx' },
]

/**
 * La deuda de la tarea 6, ahora con un borde real que puede producirla: el
 * formulario nunca puede guardar '' como id de Monday — o es un id de
 * verdad, o es null. Con '' convertido a número aguas abajo (Number('') ===
 * 0) el acuerdo se asignaría a un usuario que no existe.
 */
describe('NuevoAcuerdoForm', () => {
  it('sin elegir a nadie de Mkt Corp, manda responsableMondayId null — nunca cadena vacía', async () => {
    const usuario = userEvent.setup()
    const crearAction = vi.fn(async () => {})
    render(<NuevoAcuerdoForm crearAction={crearAction} personas={PERSONAS} />)

    await usuario.click(screen.getByRole('button', { name: '+ Añadir acuerdo' }))
    await usuario.type(screen.getByPlaceholderText('Qué se acordó'), 'Enviar propuesta de paid media')
    await usuario.click(screen.getByRole('button', { name: 'Añadir' }))

    await waitFor(() => expect(crearAction).toHaveBeenCalled())
    expect(crearAction).toHaveBeenCalledWith(
      expect.objectContaining({ responsableMondayId: null }),
    )
  })

  it('eligiendo a alguien de Mkt Corp, manda su id de verdad junto al nombre', async () => {
    const usuario = userEvent.setup()
    const crearAction = vi.fn(async () => {})
    const { container } = render(<NuevoAcuerdoForm crearAction={crearAction} personas={PERSONAS} />)

    await usuario.click(screen.getByRole('button', { name: '+ Añadir acuerdo' }))
    await usuario.type(screen.getByPlaceholderText('Qué se acordó'), 'Enviar propuesta de paid media')
    const select = container.querySelector('select') as HTMLSelectElement
    await usuario.selectOptions(select, '65476486')
    await usuario.click(screen.getByRole('button', { name: 'Añadir' }))

    await waitFor(() => expect(crearAction).toHaveBeenCalled())
    expect(crearAction).toHaveBeenCalledWith(
      expect.objectContaining({ responsableMondayId: '65476486', responsable: 'Iris Múgica' }),
    )
  })
})
