import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilaBandeja } from './FilaBandeja'

const PERSONAS = [
  { id: '65476486', nombre: 'Iris Múgica', correo: 'iris.mugica@jansan.mx' },
  { id: '67757625', nombre: 'César Mejía Medina', correo: 'julio.mejiam@upax.com.mx' },
]

const ACUERDO = {
  id: 'a1',
  que: 'Enviar propuesta de paid media',
  responsable: 'Iris Múgica',
  responsableMondayId: '65476486',
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
        personas={PERSONAS}
        subir={vi.fn()}
        descartar={vi.fn()}
        editar={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Elemento nuevo')).toBeChecked()
  })

  it('no deja elegir «subelemento de» sin haber elegido de cuál', () => {
    render(
      <FilaBandeja acuerdo={ACUERDO} elementos={[]} personas={PERSONAS} subir={vi.fn()} descartar={vi.fn()} editar={vi.fn()} />,
    )
    expect(screen.getByLabelText('Subelemento de')).toBeDisabled()
  })

  it('dice de qué sala es: la bandeja mezcla las diez', () => {
    render(
      <FilaBandeja acuerdo={ACUERDO} elementos={[]} personas={PERSONAS} subir={vi.fn()} descartar={vi.fn()} editar={vi.fn()} />,
    )
    expect(screen.getByText('Mexa Creativa')).toBeInTheDocument()
  })
})

/**
 * EDITAR AHÍ MISMO (revisión final de la ronda 7, punto 8): el diseño pide
 * "el acuerdo, su responsable y su fecha, editables ahí mismo" — el último
 * punto donde alguien puede corregir un nombre que la transcripción se comió
 * o una fecha mal detectada ANTES de que aparezca en el tablero del equipo.
 */
describe('FilaBandeja, editar ahí mismo', () => {
  it('arranca en texto plano, sin ningún campo editable a la vista', () => {
    render(
      <FilaBandeja acuerdo={ACUERDO} elementos={[]} personas={PERSONAS} subir={vi.fn()} descartar={vi.fn()} editar={vi.fn()} />,
    )
    expect(screen.queryByLabelText('Qué se acordó')).not.toBeInTheDocument()
    expect(screen.getByText('Enviar propuesta de paid media')).toBeInTheDocument()
  })

  it('«Editar» abre los tres campos precargados con lo que ya tenía', async () => {
    const usuario = userEvent.setup()
    render(
      <FilaBandeja acuerdo={ACUERDO} elementos={[]} personas={PERSONAS} subir={vi.fn()} descartar={vi.fn()} editar={vi.fn()} />,
    )

    await usuario.click(screen.getByRole('button', { name: 'Editar' }))

    expect(screen.getByLabelText('Qué se acordó')).toHaveValue('Enviar propuesta de paid media')
    expect(screen.getByLabelText('Fecha compromiso')).toHaveValue('2026-08-12')
    // El responsable ya tenía id de Mkt Corp: SelectorResponsable lo enseña elegido.
    expect(screen.getByRole('group', { name: /Mkt Corp/ })).toBeInTheDocument()
  })

  it('Cancelar cierra sin guardar y sin llamar a editar', async () => {
    const editarMock = vi.fn()
    const usuario = userEvent.setup()
    render(
      <FilaBandeja acuerdo={ACUERDO} elementos={[]} personas={PERSONAS} subir={vi.fn()} descartar={vi.fn()} editar={editarMock} />,
    )

    await usuario.click(screen.getByRole('button', { name: 'Editar' }))
    await usuario.clear(screen.getByLabelText('Qué se acordó'))
    await usuario.type(screen.getByLabelText('Qué se acordó'), 'Texto a medias')
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(editarMock).not.toHaveBeenCalled()
    // Vuelve al texto ORIGINAL, no al que se estaba escribiendo.
    expect(screen.getByText('Enviar propuesta de paid media')).toBeInTheDocument()
    expect(screen.queryByText('Texto a medias')).not.toBeInTheDocument()
  })

  it('Guardar llama a editar con el id, la sala y los tres campos', async () => {
    const editarMock = vi.fn().mockResolvedValue(undefined)
    const usuario = userEvent.setup()
    render(
      <FilaBandeja acuerdo={ACUERDO} elementos={[]} personas={PERSONAS} subir={vi.fn()} descartar={vi.fn()} editar={editarMock} />,
    )

    await usuario.click(screen.getByRole('button', { name: 'Editar' }))
    await usuario.clear(screen.getByLabelText('Qué se acordó'))
    await usuario.type(screen.getByLabelText('Qué se acordó'), 'Enviar propuesta revisada')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(editarMock).toHaveBeenCalledWith('a1', 'mexa-creativa', {
      que: 'Enviar propuesta revisada',
      responsable: 'Iris Múgica',
      responsableMondayId: '65476486',
      fechaCompromiso: '2026-08-12',
    })
  })

  it('cambiar el responsable a alguien de la UDN manda responsableMondayId null', async () => {
    const editarMock = vi.fn().mockResolvedValue(undefined)
    const usuario = userEvent.setup()
    render(
      <FilaBandeja acuerdo={ACUERDO} elementos={[]} personas={PERSONAS} subir={vi.fn()} descartar={vi.fn()} editar={editarMock} />,
    )

    await usuario.click(screen.getByRole('button', { name: 'Editar' }))
    await usuario.type(screen.getByLabelText(/de la UDN/i), 'Directora de Marketing UDN')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(editarMock).toHaveBeenCalledWith(
      'a1',
      'mexa-creativa',
      expect.objectContaining({ responsable: 'Directora de Marketing UDN', responsableMondayId: null }),
    )
  })

  it('no deja guardar un acuerdo vacío', async () => {
    const editarMock = vi.fn()
    const usuario = userEvent.setup()
    render(
      <FilaBandeja acuerdo={ACUERDO} elementos={[]} personas={PERSONAS} subir={vi.fn()} descartar={vi.fn()} editar={editarMock} />,
    )

    await usuario.click(screen.getByRole('button', { name: 'Editar' }))
    await usuario.clear(screen.getByLabelText('Qué se acordó'))
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
    expect(editarMock).not.toHaveBeenCalled()
  })

  it('si editar falla, el error llega a la pantalla y el formulario sigue abierto', async () => {
    const editarMock = vi.fn().mockRejectedValue(new Error('No se pudo guardar.'))
    const usuario = userEvent.setup()
    render(
      <FilaBandeja acuerdo={ACUERDO} elementos={[]} personas={PERSONAS} subir={vi.fn()} descartar={vi.fn()} editar={editarMock} />,
    )

    await usuario.click(screen.getByRole('button', { name: 'Editar' }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('No se pudo guardar.')).toBeInTheDocument()
    expect(screen.getByLabelText('Qué se acordó')).toBeInTheDocument()
  })
})
