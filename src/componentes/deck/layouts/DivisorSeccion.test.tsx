import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DivisorSeccion } from './DivisorSeccion'
import { ProveedorTema } from '@/componentes/ProveedorTema'
import { obtenerTema } from '@/temas'

function pintar(decision: Parameters<typeof DivisorSeccion>[0]['decision']) {
  return render(
    <ProveedorTema tema={obtenerTema('neracode')} superficie="oscura">
      <DivisorSeccion decision={decision} />
    </ProveedorTema>,
  )
}

describe('DivisorSeccion', () => {
  it('pinta el título y, si existe, el subtítulo', () => {
    pintar({ layout: 'divisor-seccion', titulo: 'Pipeline y demanda', subtitulo: 'Segundo bloque', razon: 'x' })
    expect(screen.getByText('Pipeline y demanda')).toBeInTheDocument()
    expect(screen.getByText('Segundo bloque')).toBeInTheDocument()
  })

  it('funciona sin subtítulo', () => {
    pintar({ layout: 'divisor-seccion', titulo: 'Solo título', razon: 'x' })
    expect(screen.getByText('Solo título')).toBeInTheDocument()
  })

  it('lleva el atributo de layout, el rol de región y la espina decorativa oculta a lectores de pantalla', () => {
    pintar({ layout: 'divisor-seccion', titulo: 'x', razon: 'y' })
    const region = screen.getByRole('region', { name: 'x' })
    expect(region).toHaveAttribute('data-layout', 'divisor-seccion')
    expect(screen.getByTestId('franja-divisor')).toHaveAttribute('aria-hidden', 'true')
  })
})
