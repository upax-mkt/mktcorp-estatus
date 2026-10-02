import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GaleriaQ3 } from './GaleriaQ3'

describe('galería de campañas', () => {
  it('cambia de campaña con teclado y abre la pieza completa sin salir de la presentación', async () => {
    const user = userEvent.setup()
    render(<GaleriaQ3 grupos={[
      { nombre: 'Kaitai', materiales: [{ src: '/a.webp', alt: 'Invitación Kaitai', ancho: 640, alto: 1000 }] },
      { nombre: 'Soledad', materiales: [{ src: '/b.webp', alt: 'Invitación Soledad', ancho: 640, alto: 1200 }] },
    ]} />)
    screen.getByRole('button', { name: 'Soledad' }).focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('img', { name: 'Invitación Soledad' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Ver pieza completa/ }))
    expect(screen.getByRole('dialog', { name: 'Invitación Soledad' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cerrar detalle' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
