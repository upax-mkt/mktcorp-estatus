import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotasDePrensa } from './NotasDePrensa'

const NOTA = {
  id: 'n1',
  titulo: 'UPAX lleva la medición de audiencias al punto de venta',
  enlace: 'https://www.eleconomista.com.mx/empresas/nota',
  medio: 'El Economista',
  fecha: '2026-08-12',
  ruta: null as string | null,
  nombreOriginal: null as string | null,
}

describe('NotasDePrensa', () => {
  it('cada nota lleva a su medio, en pestaña nueva: la nota vive fuera de la app', () => {
    render(<NotasDePrensa titulo="Notas de Prensa" notas={[NOTA]} equipo={false} />)
    const enlace = screen.getByRole('link', { name: /medición de audiencias/i })
    expect(enlace).toHaveAttribute('href', NOTA.enlace)
    expect(enlace).toHaveAttribute('target', '_blank')
    expect(enlace).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
  })

  it('enseña el medio y la fecha, que es lo que sitúa una nota', () => {
    render(<NotasDePrensa titulo="Notas de Prensa" notas={[NOTA]} equipo={false} />)
    expect(screen.getByText('El Economista')).toBeInTheDocument()
    expect(screen.getByText(/12 ago/i)).toBeInTheDocument()
  })

  /**
   * La portada se SUBE y se sirve por la ruta de la app. Nunca se le pide una
   * imagen al medio: sería una petición a un tercero desde la sala PÚBLICA de
   * un cliente, y le revelaría la IP de quien mira.
   */
  it('la portada, cuando la hay, sale de la propia app y nunca del sitio del medio', () => {
    const { container } = render(
      <NotasDePrensa
        titulo="Notas de Prensa"
        notas={[{ ...NOTA, ruta: 'salas/mexa/prensa/uuid-portada.jpg', nombreOriginal: 'p.jpg' }]}
        equipo={false}
      />,
    )
    const img = container.querySelector('img') as HTMLImageElement
    expect(img.getAttribute('src')).toBe('/api/archivo/n1')
    expect(container.innerHTML).not.toContain('eleconomista.com.mx/favicon')
  })

  /**
   * ⚠️ LO QUE ESTE CASO FIJA ES EL DEFECTO QUE FRANCO CAZÓ. La primera versión
   * era una rejilla y, sin portada, pintaba el nombre del medio DOS VECES por
   * nota (una en la carátula de color, otra en la ficha) dentro de una caja
   * enorme. Con datos reales —cinco notas, ninguna con portada— eran 600 px
   * para cinco titulares. En una lista, una nota sin imagen no deja hueco
   * ninguno y el medio se dice una sola vez.
   */
  it('sin portada no falta nada, y el medio se dice UNA vez', () => {
    const { container } = render(<NotasDePrensa titulo="Notas de Prensa" notas={[NOTA]} equipo={false} />)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getAllByText('El Economista')).toHaveLength(1)
  })

  /**
   * Regla de la ronda 12: un módulo vacío no existe para quien solo mira; al
   * equipo se le enseña vacío porque ESE vacío es la puerta para cargarlo.
   */
  it('vacío no se le muestra al director de la UDN', () => {
    const { container } = render(<NotasDePrensa titulo="Notas de Prensa" notas={[]} equipo={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('vacío SÍ se le muestra al equipo, con su explicación', () => {
    render(
      <NotasDePrensa titulo="Notas de Prensa" notas={[]} equipo>
        <button type="button">+ Añadir nota</button>
      </NotasDePrensa>,
    )
    expect(screen.getByText(/todavía no hay notas/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /añadir nota/i })).toBeInTheDocument()
  })

  it('quien solo mira no ve ni renombrar ni quitar', () => {
    render(<NotasDePrensa titulo="Notas de Prensa" notas={[NOTA]} equipo={false} />)
    expect(screen.queryByRole('button', { name: /quitar/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /corregir/i })).toBeNull()
  })

  it('el equipo puede quitar una nota, y se le pregunta antes', async () => {
    const usuario = userEvent.setup()
    const eliminar = vi.fn().mockResolvedValue({})
    render(
      <NotasDePrensa titulo="Notas de Prensa" notas={[NOTA]} equipo eliminarAction={eliminar} />,
    )

    await usuario.click(screen.getByRole('button', { name: /quitar/i }))
    expect(eliminar).not.toHaveBeenCalled()
    await usuario.click(screen.getByRole('button', { name: /^borrar$/i }))
    expect(eliminar).toHaveBeenCalledWith('n1')
  })

  it('una nota sin fecha no inventa ninguna', () => {
    render(<NotasDePrensa titulo="Notas de Prensa" notas={[{ ...NOTA, fecha: null }]} equipo={false} />)
    expect(screen.getByText('El Economista')).toBeInTheDocument()
    expect(screen.queryByText(/\d+ (ago|sep|ene)/i)).toBeNull()
  })
})
