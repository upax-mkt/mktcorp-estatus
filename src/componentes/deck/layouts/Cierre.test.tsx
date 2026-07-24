import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Cierre } from './Cierre'
import { ProveedorTema } from '@/componentes/ProveedorTema'
import { obtenerTema } from '@/temas'

function pintar(decision: Parameters<typeof Cierre>[0]['decision']) {
  return render(
    <ProveedorTema tema={obtenerTema('neracode')} superficie="oscura">
      <Cierre decision={decision} />
    </ProveedorTema>,
  )
}

describe('Cierre', () => {
  it('pinta el título y, si existe, el subtítulo', () => {
    pintar({ layout: 'cierre', titulo: 'Gracias', subtitulo: 'Dudas por Slack', razon: 'x' })
    expect(screen.getByText('Gracias')).toBeInTheDocument()
    expect(screen.getByText('Dudas por Slack')).toBeInTheDocument()
  })

  it('funciona sin subtítulo', () => {
    pintar({ layout: 'cierre', titulo: 'Acuerdos', razon: 'x' })
    expect(screen.getByText('Acuerdos')).toBeInTheDocument()
  })

  it('lleva el atributo de layout, el rol de región y el acento decorativo oculto a lectores de pantalla', () => {
    pintar({ layout: 'cierre', titulo: 'x', razon: 'y' })
    const region = screen.getByRole('region', { name: 'x' })
    expect(region).toHaveAttribute('data-layout', 'cierre')
    expect(screen.getByTestId('acento-cierre')).toHaveAttribute('aria-hidden', 'true')
  })
})
