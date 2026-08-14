import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Estrella } from './Estrella'

/**
 * ESTE es el componente que se reutiliza en las dos pantallas donde se puede
 * fijar un acuerdo arriba (el espacio de acuerdos y la sala), así que lo que
 * hace al pulsarla importa más que en un botón cualquiera: si aquí decide mal
 * qué mandar a `destacar`, las dos pantallas heredan el mismo error. El Home
 * también la usa hoy (`ModuloAcuerdos`), pero solo mientras siga listando
 * acuerdos — es la tercera que ronda 14 dejó de prometer (ver la cabecera de
 * Estrella.tsx) y que su propio milestone, pendiente, se encarga de retirar.
 *
 * `/destacar/i` en los dos primeros tests matchea "Fijar arriba en Acuerdos"
 * igual que matchearía "Destacar": ninguno de los dos afirma el texto exacto,
 * solo que EXISTE un botón para marcar. El texto exacto se fija en los tests
 * de abajo y en TablaAcuerdos.test.tsx / ModuloAcuerdos.test.tsx.
 */
describe('Estrella', () => {
  it('sin destacar: un clic la destaca', async () => {
    const usuario = userEvent.setup()
    const destacar = vi.fn().mockResolvedValue(undefined)
    render(<Estrella acuerdoId="a1" destacado={false} destacar={destacar} />)

    await usuario.click(screen.getByRole('button', { name: /fijar arriba/i }))

    expect(destacar).toHaveBeenCalledWith('a1', true)
  })

  it('ya destacada: un clic la quita', async () => {
    const usuario = userEvent.setup()
    const destacar = vi.fn().mockResolvedValue(undefined)
    render(<Estrella acuerdoId="a1" destacado={true} destacar={destacar} />)

    await usuario.click(screen.getByRole('button', { name: /quitar de arriba/i }))

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

    await usuario.click(screen.getByRole('button', { name: /fijar arriba/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('solo para el equipo')
  })
})
