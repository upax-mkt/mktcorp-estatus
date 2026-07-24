import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TextoMulticolumna } from './TextoMulticolumna'
import { ProveedorTema } from '@/componentes/ProveedorTema'
import { obtenerTema } from '@/temas'

function pintar(decision: Parameters<typeof TextoMulticolumna>[0]['decision']) {
  return render(
    <ProveedorTema tema={obtenerTema('neracode')} superficie="clara">
      <TextoMulticolumna decision={decision} />
    </ProveedorTema>,
  )
}

describe('TextoMulticolumna', () => {
  it('pinta hasta 4 columnas, cada una con su título y sus puntos', () => {
    pintar({
      layout: 'texto-multicolumna',
      titulo: 'Foco por frente',
      columnas: [
        { titulo: 'Software factory', puntos: ['Dos cuentas nuevas'] },
        { titulo: 'Staff augmentation', puntos: ['Demanda sostenida'] },
        { titulo: 'Modernización', puntos: ['Primer caso de éxito'] },
      ],
      razon: 'x',
    })
    expect(screen.getByText('Software factory')).toBeInTheDocument()
    expect(screen.getByText('Dos cuentas nuevas')).toBeInTheDocument()
    expect(screen.getByText('Staff augmentation')).toBeInTheDocument()
    expect(screen.getByText('Modernización')).toBeInTheDocument()
  })

  it('funciona sin columnas, sin reventar', () => {
    pintar({ layout: 'texto-multicolumna', titulo: 'x', razon: 'y' })
    expect(screen.getByText('x')).toBeInTheDocument()
  })

  it('lleva el atributo de layout y el rol de región', () => {
    pintar({
      layout: 'texto-multicolumna',
      titulo: 'x',
      columnas: [{ titulo: 'a', puntos: ['b'] }],
      razon: 'y',
    })
    const region = screen.getByRole('region', { name: 'x' })
    expect(region).toHaveAttribute('data-layout', 'texto-multicolumna')
  })
})
