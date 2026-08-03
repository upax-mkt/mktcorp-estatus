import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CampoImagen } from './CampoImagen'

/**
 * El ancho y la alineación (ronda 9, tarea 7): un tirador de 25 a 100% del
 * ancho de la columna, y a qué lado cae. No hay tests previos de este
 * componente — se cubre aquí el comportamiento nuevo, no se rehace el flujo
 * de subida (ese ya lo ejercitan los tests de integración del editor).
 */
describe('CampoImagen', () => {
  it('sin imagen puesta, no hay tirador ni botones de alineación que ajustar', () => {
    render(<CampoImagen valor={undefined} onChange={vi.fn()} />)
    expect(screen.queryByLabelText(/ancho de la imagen/i)).not.toBeInTheDocument()
  })

  it('con una imagen sin ancho ni alineación puestos, se ve 100% y centro', () => {
    render(<CampoImagen valor={{ url: '/x.png' }} onChange={vi.fn()} />)
    const tirador = screen.getByLabelText(/ancho de la imagen/i) as HTMLInputElement
    expect(tirador.value).toBe('100')
    expect(screen.getByRole('button', { name: 'Centro' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('mover el tirador avisa el nuevo ancho sin perder la URL ni la alineación', () => {
    const onChange = vi.fn()
    render(<CampoImagen valor={{ url: '/x.png', alineacion: 'izquierda' }} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(/ancho de la imagen/i), { target: { value: '60' } })
    expect(onChange).toHaveBeenCalledWith({ url: '/x.png', alineacion: 'izquierda', anchoPorcentaje: 60 })
  })

  it('el tirador no deja bajar de 25 ni subir de 100', () => {
    render(<CampoImagen valor={{ url: '/x.png' }} onChange={vi.fn()} />)
    const tirador = screen.getByLabelText(/ancho de la imagen/i) as HTMLInputElement
    expect(tirador.min).toBe('25')
    expect(tirador.max).toBe('100')
  })

  it('elegir "Derecha" avisa la alineación sin tocar el ancho', () => {
    const onChange = vi.fn()
    render(<CampoImagen valor={{ url: '/x.png', anchoPorcentaje: 40 }} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Derecha' }))
    expect(onChange).toHaveBeenCalledWith({ url: '/x.png', anchoPorcentaje: 40, alineacion: 'derecha' })
  })

  it('quitar la imagen la borra entera, no solo el ancho', () => {
    const onChange = vi.fn()
    render(<CampoImagen valor={{ url: '/x.png', anchoPorcentaje: 40 }} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /quitar/i }))
    expect(onChange).toHaveBeenCalledWith(undefined)
  })
})
