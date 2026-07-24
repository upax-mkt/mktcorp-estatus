import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProveedorTema } from './ProveedorTema'
import { obtenerTema } from '@/temas'

describe('ProveedorTema', () => {
  it('inyecta el primario de la sala', () => {
    render(
      <ProveedorTema tema={obtenerTema('zeus')} superficie="clara">
        <span>contenido</span>
      </ProveedorTema>,
    )
    const contenedor = screen.getByTestId('tema')
    expect(contenedor.style.getPropertyValue('--primario')).toBe('#FF004F')
  })

  it('usa la superficie clara u oscura según se pida', () => {
    const { rerender } = render(
      <ProveedorTema tema={obtenerTema('neracode')} superficie="clara"><i /></ProveedorTema>,
    )
    expect(screen.getByTestId('tema').style.getPropertyValue('--superficie')).toBe('#FFFFFF')

    rerender(
      <ProveedorTema tema={obtenerTema('neracode')} superficie="oscura"><i /></ProveedorTema>,
    )
    expect(screen.getByTestId('tema').style.getPropertyValue('--superficie')).toBe('#07184F')
  })

  it('expone seis variables de datos', () => {
    render(<ProveedorTema tema={obtenerTema('uix')} superficie="clara"><i /></ProveedorTema>)
    const estilo = screen.getByTestId('tema').style
    for (let i = 1; i <= 6; i++) {
      expect(estilo.getPropertyValue(`--dato-${i}`)).toMatch(/^#[0-9A-F]{6}$/)
    }
  })

  it('inyecta el texto sobre gradiente igual al textoSobreOscura del tema', () => {
    const tema = obtenerTema('neracode')
    render(
      <ProveedorTema tema={tema} superficie="clara">
        <i />
      </ProveedorTema>,
    )
    expect(screen.getByTestId('tema').style.getPropertyValue('--texto-sobre-gradiente')).toBe(
      tema.textoSobreOscura,
    )
  })

  it('renderiza a sus hijos', () => {
    render(
      <ProveedorTema tema={obtenerTema('ceci')} superficie="clara">
        <span>hola</span>
      </ProveedorTema>,
    )
    expect(screen.getByText('hola')).toBeInTheDocument()
  })
})
