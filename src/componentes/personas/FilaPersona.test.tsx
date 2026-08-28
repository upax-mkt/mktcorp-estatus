import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FilaPersona } from './FilaPersona'

const PERSONA = {
  correo: 'iris.mugica@jansan.mx',
  nombre: 'Iris Múgica',
  rol: 'editor' as const,
  squad: 'Squad Web y Contenidos' as const,
  activa: true,
}

describe('FilaPersona', () => {
  it('enseña el correo, que es la clave: dos personas pueden llamarse igual', () => {
    render(<FilaPersona persona={PERSONA} esYo={false} cambiarRol={vi.fn()} cambiarSquad={vi.fn()} activar={vi.fn()} />)
    expect(screen.getByText('iris.mugica@jansan.mx')).toBeInTheDocument()
  })

  it('a ti mismo no te deja quitarte el admin ni desactivarte', () => {
    render(<FilaPersona persona={{ ...PERSONA, rol: 'admin' }} esYo={true} cambiarRol={vi.fn()} cambiarSquad={vi.fn()} activar={vi.fn()} />)
    expect(screen.getByLabelText(/rol/i)).toBeDisabled()
    expect(screen.queryByRole('button', { name: /desactivar/i })).not.toBeInTheDocument()
  })

  it('una persona desactivada se ve apagada y se puede reactivar', () => {
    render(<FilaPersona persona={{ ...PERSONA, activa: false }} esYo={false} cambiarRol={vi.fn()} cambiarSquad={vi.fn()} activar={vi.fn()} />)
    expect(screen.getByRole('button', { name: /activar/i })).toBeInTheDocument()
  })
})

// Cobertura extra sobre lo pedido en el brief: que el componente de verdad
// LLAME a las acciones con lo que corresponde, no solo que se vea bien.
describe('FilaPersona — interacción', () => {
  it('elegir otro rol en el select llama a cambiarRol con el nuevo valor', () => {
    const cambiarRol = vi.fn().mockResolvedValue({})
    render(<FilaPersona persona={PERSONA} esYo={false} cambiarRol={cambiarRol} cambiarSquad={vi.fn()} activar={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/rol/i), { target: { value: 'admin' } })
    expect(cambiarRol).toHaveBeenCalledExactlyOnceWith('admin')
  })

  it('elegir el mismo rol que ya tiene no llama a cambiarRol: no hay cambio que hacer', () => {
    const cambiarRol = vi.fn().mockResolvedValue({})
    render(<FilaPersona persona={PERSONA} esYo={false} cambiarRol={cambiarRol} cambiarSquad={vi.fn()} activar={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/rol/i), { target: { value: PERSONA.rol } })
    expect(cambiarRol).not.toHaveBeenCalled()
  })

  it('pulsar Desactivar llama a activar(false)', () => {
    const activar = vi.fn().mockResolvedValue({})
    render(<FilaPersona persona={PERSONA} esYo={false} cambiarRol={vi.fn()} cambiarSquad={vi.fn()} activar={activar} />)
    fireEvent.click(screen.getByRole('button', { name: /desactivar/i }))
    expect(activar).toHaveBeenCalledExactlyOnceWith(false)
  })

  it('pulsar Activar llama a activar(true)', () => {
    const activar = vi.fn().mockResolvedValue({})
    render(<FilaPersona persona={{ ...PERSONA, activa: false }} esYo={false} cambiarRol={vi.fn()} cambiarSquad={vi.fn()} activar={activar} />)
    fireEvent.click(screen.getByRole('button', { name: /activar/i }))
    expect(activar).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('un error que devuelve la acción del servidor se enseña en pantalla', async () => {
    const activar = vi.fn().mockResolvedValue({ error: 'Esta acción dejaría el directorio sin ningún administrador activo.' })
    render(<FilaPersona persona={PERSONA} esYo={false} cambiarRol={vi.fn()} cambiarSquad={vi.fn()} activar={activar} />)
    fireEvent.click(screen.getByRole('button', { name: /desactivar/i }))
    expect(await screen.findByText(/sin ningún administrador activo/i)).toBeInTheDocument()
  })

  it('esYo no quita el botón Activar: reactivarte a ti mismo no es el riesgo de la guarda', () => {
    render(<FilaPersona persona={{ ...PERSONA, rol: 'admin', activa: false }} esYo={true} cambiarRol={vi.fn()} cambiarSquad={vi.fn()} activar={vi.fn()} />)
    expect(screen.getByRole('button', { name: /activar/i })).toBeInTheDocument()
  })

  it('cambiar el squad llama a la acción con el catálogo vigente', () => {
    const cambiarSquad = vi.fn().mockResolvedValue({})
    render(<FilaPersona persona={PERSONA} esYo={false} cambiarRol={vi.fn()} cambiarSquad={cambiarSquad} activar={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/squad de iris/i), { target: { value: 'RevOps & Analytics' } })
    expect(cambiarSquad).toHaveBeenCalledExactlyOnceWith('RevOps & Analytics')
  })
})
