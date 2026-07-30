import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Estrella } from './Estrella'

/**
 * ESTE es el componente que se reutiliza en las tres pantallas (espacio de
 * acuerdos, Home y sala — tarea 12 cablea las dos últimas), así que lo que
 * hace al pulsarla importa más que en un botón cualquiera: si aquí decide mal
 * qué mandar a `destacar`, las tres pantallas heredan el mismo error.
 */
describe('Estrella', () => {
  it('sin destacar: un clic la destaca', async () => {
    const usuario = userEvent.setup()
    const destacar = vi.fn().mockResolvedValue(undefined)
    render(<Estrella acuerdoId="a1" destacado={false} destacar={destacar} />)

    await usuario.click(screen.getByRole('button', { name: /destacar/i }))

    expect(destacar).toHaveBeenCalledWith('a1', true)
  })

  it('ya destacada: un clic la quita', async () => {
    const usuario = userEvent.setup()
    const destacar = vi.fn().mockResolvedValue(undefined)
    render(<Estrella acuerdoId="a1" destacado={true} destacar={destacar} />)

    await usuario.click(screen.getByRole('button', { name: /quitar de destacados/i }))

    expect(destacar).toHaveBeenCalledWith('a1', false)
  })

  it('refleja su estado con aria-pressed, no solo con color', () => {
    render(<Estrella acuerdoId="a1" destacado={true} destacar={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('si destacarAction falla, el error llega a la pantalla', async () => {
    const usuario = userEvent.setup()
    const destacar = vi.fn().mockRejectedValue(new Error('Esta acción es solo para el equipo de Marketing Corporativo.'))
    render(<Estrella acuerdoId="a1" destacado={false} destacar={destacar} />)

    await usuario.click(screen.getByRole('button', { name: /destacar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('solo para el equipo')
  })
})
