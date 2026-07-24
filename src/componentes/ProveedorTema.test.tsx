import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProveedorTema } from './ProveedorTema'
import { obtenerTema, TEMAS } from '@/temas'
import { contraste } from '@/lib/color'

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

  // NOTA DE CORRECCIÓN (fix legibilidad de gradiente): esta prueba asumía que
  // --texto-sobre-gradiente era siempre textoSobreOscura — ese era exactamente
  // el defecto (1.63:1 de contraste real en NeraCode, casi invisible). Ahora
  // se elige el candidato con mejor contraste mínimo contra las paradas del
  // degradado (mejorTextoSobre): para NeraCode gana textoSobreClara (#07184F,
  // mínimo 2.01:1) sobre textoSobreOscura (#FFFFFF, mínimo 1.63:1). Ver
  // src/lib/superficie-texto.test.ts y la prueba de las 10 marcas más abajo,
  // que es la que impide que el defecto original vuelva.
  it('inyecta el texto sobre gradiente elegido por mejor contraste mínimo, no siempre textoSobreOscura', () => {
    const tema = obtenerTema('neracode')
    render(
      <ProveedorTema tema={tema} superficie="clara">
        <i />
      </ProveedorTema>,
    )
    expect(screen.getByTestId('tema').style.getPropertyValue('--texto-sobre-gradiente')).toBe(
      tema.textoSobreClara,
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

// Éste es el corazón del arreglo: para las 10 salas del registro, el color de
// --texto-sobre-gradiente debe contrastar ≥ 4.5:1 contra TODAS Y CADA UNA de
// las paradas de --gradiente-texto (el degradado ya ajustado para llevar
// texto encima, no el --gradiente de marca puro). Antes del fix, portadas y
// KPIs pintaban texto sobre el degradado de marca sin ajustar: NeraCode caía
// a 1.63:1, Marketing United a 1.27:1, UiX a 1.67:1 — prácticamente
// invisibles. Este test es el que impide que ese defecto vuelva.
describe.each(Object.values(TEMAS))(
  '$nombre: --texto-sobre-gradiente contrasta ≥4.5:1 contra --gradiente-texto',
  (tema) => {
    it('cada parada del degradado ajustado cumple el mínimo WCAG', () => {
      render(
        <ProveedorTema tema={tema} superficie="clara">
          <i />
        </ProveedorTema>,
      )
      const estilo = screen.getByTestId('tema').style
      const textoSobreGradiente = estilo.getPropertyValue('--texto-sobre-gradiente')
      const gradienteTexto = estilo.getPropertyValue('--gradiente-texto')
      const paradas = gradienteTexto.match(/#[0-9A-Fa-f]{6}/g) ?? []

      // Si esto falla, algo rompió el parseo del token CSS, no el contraste.
      expect(paradas.length).toBeGreaterThanOrEqual(tema.gradiente.length)

      for (const parada of paradas) {
        expect(contraste(textoSobreGradiente, parada)).toBeGreaterThanOrEqual(4.5)
      }
    })
  },
)
