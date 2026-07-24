import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LayoutSeguro } from './LayoutSeguro'
import { ProveedorTema } from '@/componentes/ProveedorTema'
import { obtenerTema } from '@/temas'

function pintar(decision: Parameters<typeof LayoutSeguro>[0]['decision'], motivo: string) {
  return render(
    <ProveedorTema tema={obtenerTema('neracode')} superficie="clara">
      <LayoutSeguro decision={decision} motivo={motivo} />
    </ProveedorTema>,
  )
}

describe('LayoutSeguro', () => {
  it('muestra el título y no pierde el contenido', () => {
    pintar(
      { layout: 'matriz-estados', titulo: 'Focos Q3', cuerpo: ['Retail primero', 'Manufactura después'], razon: 'x' },
      'layout sin componente',
    )
    expect(screen.getByText('Focos Q3')).toBeInTheDocument()
    expect(screen.getByText('Retail primero')).toBeInTheDocument()
  })

  it('marca visiblemente que requiere revisión, con el motivo', () => {
    pintar({ layout: 'matriz-estados', titulo: 'x', razon: 'y' }, 'layout sin componente')
    const marca = screen.getByTestId('requiere-revision')
    expect(marca).toHaveTextContent(/revisión/i)
    expect(marca).toHaveTextContent('layout sin componente')
  })
})
