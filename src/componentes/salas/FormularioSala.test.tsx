import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormularioSala } from './FormularioSala'

describe('FormularioSala', () => {
  it('propone el slug al escribir el nombre, y se puede corregir', async () => {
    const usuario = userEvent.setup()
    render(<FormularioSala guardar={vi.fn()} slugsUsados={[]} />)
    await usuario.type(screen.getByLabelText(/nombre/i), 'Más Salud')
    expect(screen.getByLabelText(/identificador/i)).toHaveValue('mas-salud')
  })

  it('avisa si el identificador ya está tomado', async () => {
    const usuario = userEvent.setup()
    render(<FormularioSala guardar={vi.fn()} slugsUsados={['mas-salud']} />)
    await usuario.type(screen.getByLabelText(/nombre/i), 'Más Salud')
    expect(screen.getByText(/ya existe una sala/i)).toBeInTheDocument()
  })

  it('al editar, el identificador no se puede cambiar: es la URL de la sala', () => {
    render(<FormularioSala guardar={vi.fn()} slugsUsados={['zeus']} sala={{ slug: 'zeus', nombre: 'Zeus', primario: '#614ACA' }} />)
    expect(screen.getByLabelText(/identificador/i)).toBeDisabled()
  })
})
