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
    expect(contenedor.style.getPropertyValue('--primario')).toBe('#614ACA')
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

  it('renderiza a sus hijos', () => {
    render(
      <ProveedorTema tema={obtenerTema('ceci')} superficie="clara">
        <span>hola</span>
      </ProveedorTema>,
    )
    expect(screen.getByText('hola')).toBeInTheDocument()
  })
})

// Decisión de marca (24-jul): el degradado se pinta SIEMPRE exacto y nunca
// lleva texto. Este test reemplaza al que verificaba contraste texto-sobre-
// degradado (retirado junto con --gradiente-texto y --texto-sobre-gradiente,
// ver superficie-texto.ts): ahora lo que hay que impedir que vuelva es que
// alguien "ajuste" --gradiente para hacerle sitio a texto. Para las 10 salas,
// --gradiente debe reproducir cada parada de tema.gradiente sin alterar
// ningún dígito.
describe.each(Object.values(TEMAS))(
  '$nombre: --gradiente reproduce el degradado de marca EXACTO, sin ajustar',
  (tema) => {
    it('cada parada de --gradiente coincide con tema.gradiente', () => {
      render(
        <ProveedorTema tema={tema} superficie="clara">
          <i />
        </ProveedorTema>,
      )
      const estilo = screen.getByTestId('tema').style
      const gradiente = estilo.getPropertyValue('--gradiente')
      const paradas = gradiente.match(/#[0-9A-Fa-f]{6}/g) ?? []

      expect(paradas).toEqual(tema.gradiente)
    })
  },
)

// Éste es el corazón del arreglo de contraste de --primario-sobre-superficie:
// para las 10 salas del registro y para AMBAS superficies (clara y oscura),
// el token debe contrastar ≥4.5:1 contra --superficie. Antes del fix,
// deck.module.css pintaba texto (.columnaTitulo) directo con --primario, sin
// que nada validara ese par: Promo Espacio caía a 2.97:1 y otras cinco marcas
// quedaban por debajo de 4.5:1 sobre superficieClara. Este test es lo que
// impide que ese defecto vuelva.
describe.each(Object.values(TEMAS))(
  '$nombre: --primario-sobre-superficie contrasta ≥4.5:1 contra --superficie',
  (tema) => {
    it.each(['clara', 'oscura'] as const)('sobre superficie %s', (superficie) => {
      render(
        <ProveedorTema tema={tema} superficie={superficie}>
          <i />
        </ProveedorTema>,
      )
      const estilo = screen.getByTestId('tema').style
      const primarioSobreSuperficie = estilo.getPropertyValue('--primario-sobre-superficie')
      const superficieActiva = estilo.getPropertyValue('--superficie')

      expect(primarioSobreSuperficie).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(contraste(primarioSobreSuperficie, superficieActiva)).toBeGreaterThanOrEqual(4.5)
    })
  },
)

describe('--primario-sobre-superficie', () => {
  it('no toca el primario cuando ya cumple 4.5:1 contra la superficie', () => {
    // NeraCode: #3E31CC contra superficieClara #FFFFFF da 8.35:1, ya cumple.
    render(
      <ProveedorTema tema={obtenerTema('neracode')} superficie="clara">
        <i />
      </ProveedorTema>,
    )
    const estilo = screen.getByTestId('tema').style
    expect(estilo.getPropertyValue('--primario-sobre-superficie')).toBe('#3E31CC')
  })

  it('deja --primario intacto (color de marca puro, sin ajustar)', () => {
    // Promo Espacio: #F94700 sólo da 2.97:1 contra su superficieClara, pero
    // --primario debe seguir publicando el color de marca puro sin tocar.
    render(
      <ProveedorTema tema={obtenerTema('promo-espacio')} superficie="clara">
        <i />
      </ProveedorTema>,
    )
    const estilo = screen.getByTestId('tema').style
    expect(estilo.getPropertyValue('--primario')).toBe('#F94700')
    expect(estilo.getPropertyValue('--primario-sobre-superficie')).not.toBe('#F94700')
  })
})
