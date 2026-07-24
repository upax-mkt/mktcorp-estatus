import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ImagenASangre } from './ImagenASangre'
import { ProveedorTema } from '@/componentes/ProveedorTema'
import { obtenerTema } from '@/temas'

function pintar(decision: Parameters<typeof ImagenASangre>[0]['decision']) {
  return render(
    <ProveedorTema tema={obtenerTema('neracode')} superficie="oscura">
      <ImagenASangre decision={decision} />
    </ProveedorTema>,
  )
}

describe('ImagenASangre', () => {
  it('pinta la imagen a sangre, con el título y el subtítulo superpuestos', () => {
    pintar({
      layout: 'imagen-a-sangre',
      titulo: 'Staff augmentation',
      subtitulo: 'El foco del trimestre',
      imagen: 'https://ejemplo.com/foto.jpg',
      razon: 'x',
    })
    // alt="" quita la imagen del árbol de accesibilidad como "img" (rol
    // implícito "presentation"): se busca por testid, no por rol.
    const imagen = screen.getByTestId('imagen-sangre')
    expect(imagen).toHaveAttribute('src', 'https://ejemplo.com/foto.jpg')
    expect(imagen).toHaveAttribute('alt', '')
    expect(screen.getByText('Staff augmentation')).toBeInTheDocument()
    expect(screen.getByText('El foco del trimestre')).toBeInTheDocument()
  })

  it('sin `imagen`, cae al placeholder de marca en vez de romper', () => {
    pintar({ layout: 'imagen-a-sangre', titulo: 'x', razon: 'y' })
    expect(screen.queryByTestId('imagen-sangre')).not.toBeInTheDocument()
    expect(screen.getByTestId('placeholder-imagen-sangre')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('x')).toBeInTheDocument()
  })

  it('lleva el atributo de layout y el rol de región', () => {
    pintar({ layout: 'imagen-a-sangre', titulo: 'x', razon: 'y' })
    const region = screen.getByRole('region', { name: 'x' })
    expect(region).toHaveAttribute('data-layout', 'imagen-a-sangre')
  })
})
