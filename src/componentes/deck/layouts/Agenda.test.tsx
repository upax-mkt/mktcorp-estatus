import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Agenda } from './Agenda'
import { ProveedorTema } from '@/componentes/ProveedorTema'
import { obtenerTema } from '@/temas'

function pintar(decision: Parameters<typeof Agenda>[0]['decision']) {
  return render(
    <ProveedorTema tema={obtenerTema('neracode')} superficie="clara">
      <Agenda decision={decision} />
    </ProveedorTema>,
  )
}

describe('Agenda', () => {
  it('numera cada punto del cuerpo, en orden, desde 01', () => {
    pintar({
      layout: 'agenda',
      titulo: 'Agenda',
      cuerpo: ['Performance del sitio', 'Pipeline y demanda', 'Acuerdos'],
      razon: 'x',
    })
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('02')).toBeInTheDocument()
    expect(screen.getByText('03')).toBeInTheDocument()
    expect(screen.getByText('Performance del sitio')).toBeInTheDocument()
    expect(screen.getByText('Acuerdos')).toBeInTheDocument()
  })

  it('funciona sin cuerpo (agenda vacía, sin reventar)', () => {
    pintar({ layout: 'agenda', titulo: 'Agenda', razon: 'x' })
    expect(screen.getByText('Agenda')).toBeInTheDocument()
  })

  it('lleva el atributo de layout y el rol de región', () => {
    pintar({ layout: 'agenda', titulo: 'x', cuerpo: ['uno'], razon: 'y' })
    const region = screen.getByRole('region', { name: 'x' })
    expect(region).toHaveAttribute('data-layout', 'agenda')
  })
})
