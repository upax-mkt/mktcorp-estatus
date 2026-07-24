import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Slide } from './Slide'
import { ProveedorTema } from '@/componentes/ProveedorTema'
import { obtenerTema } from '@/temas'

function pintar(decision: Parameters<typeof Slide>[0]['decision']) {
  return render(
    <ProveedorTema tema={obtenerTema('neracode')} superficie="clara">
      <Slide decision={decision} />
    </ProveedorTema>,
  )
}

describe('Slide', () => {
  it('pinta la portada con su título', () => {
    pintar({ layout: 'portada', titulo: 'Estatus mensual', subtitulo: 'Junio 2026', razon: 'apertura' })
    expect(screen.getByText('Estatus mensual')).toBeInTheDocument()
    expect(screen.getByText('Junio 2026')).toBeInTheDocument()
  })

  it('pinta los KPIs con su delta y su rótulo', () => {
    pintar({
      layout: 'kpis-fila-dos-columnas',
      titulo: 'Performance del sitio web',
      kpis: [{ valor: '9.2', delta: '-0.3', rotulo: 'Posición media' }],
      columnas: [{ titulo: 'Hallazgos', puntos: ['Primero'] }],
      razon: 'cifras + análisis',
    })
    expect(screen.getByText('9.2')).toBeInTheDocument()
    expect(screen.getByText('-0.3')).toBeInTheDocument()
    expect(screen.getByText('Posición media')).toBeInTheDocument()
    expect(screen.getByText('Primero')).toBeInTheDocument()
  })

  it('degrada a layout seguro si el layout no tiene componente, sin reventar el deck', () => {
    pintar({ layout: 'matriz-estados', titulo: 'x', razon: 'y' })
    const slide = screen.getByRole('region', { name: 'x' })
    expect(slide).toHaveAttribute('data-degradado', 'true')
  })
})
