import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { EstatusQ3 } from './EstatusQ3'

/**
 * EL ESTATUS Q3, TAL COMO LO VE CECI.
 *
 * Sin `IntersectionObserver`, como un navegador que no anima: cada cifra en su
 * valor final y nada escondido. Una animación perdida se perdona; una cifra
 * en cero delante de la CEO, no.
 */
const observadorOriginal = globalThis.IntersectionObserver

beforeEach(() => {
  Reflect.deleteProperty(globalThis, 'IntersectionObserver')
})

afterEach(() => {
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    value: observadorOriginal,
    writable: true,
    configurable: true,
  })
})

const lamina = (contenedor: HTMLElement, layout: string) =>
  within(contenedor.querySelector<HTMLElement>(`[data-layout="${layout}"]`)!)

describe('EstatusQ3', () => {
  it('sigue la agenda del equipo: eventos, funnel, venta, PR, artefactos, Q4 y anexos', () => {
    const { container } = render(<EstatusQ3 />)
    const pantallas = [...container.querySelectorAll('[data-layout]')].map((p) => p.getAttribute('data-layout'))
    expect(pantallas).toEqual([
      'portada', 'eventos', 'evento-kaitai', 'kaitai-confirmados', 'evento-miracle', 'evento-soledad',
      'funnel', 'funnel-insights', 'destacadas', 'ganadas', 'pipeline', 'pr', 'artefactos',
      'inner-circle', 'inner-circle-contenidos', 'upax-one', 'lanzamiento-rl-ia', 'roadmap',
      'anexos', 'materiales', 'digital-redes-paid', 'digital-web', 'equipo', 'gracias',
    ])
  })

  it('Kaitai: 65 ejecutivos, 25 marcas destacadas y +37 de otras empresas, con su cargo', () => {
    const { container } = render(<EstatusQ3 />)
    const kaitai = lamina(container, 'kaitai-confirmados')
    expect(kaitai.getByText('65')).toBeInTheDocument()
    expect(kaitai.getByText('25')).toBeInTheDocument()
    expect(kaitai.getByText('+37')).toBeInTheDocument()
    expect(kaitai.getByRole('img', { name: 'Banorte' })).toBeInTheDocument()
    expect(kaitai.getByText('Head of UX Design')).toBeInTheDocument()
  })

  it('el funnel muestra conversiones calculadas de su tabla, ninguna mayor a 100%', () => {
    const { container } = render(<EstatusQ3 />)
    const funnel = lamina(container, 'funnel')
    expect(funnel.getByText('1.2% desde contactos')).toBeInTheDocument()
    expect(funnel.getByText('27.8% desde MQL')).toBeInTheDocument()
    expect(funnel.getByText('15.5% desde propuestas')).toBeInTheDocument()
    expect(funnel.queryByText(/108/)).not.toBeInTheDocument()
    expect(funnel.queryByText(/1\.76/)).not.toBeInTheDocument()
  })

  it('el 9.3% de facturación va con su base, como pidió Franco', () => {
    const { container } = render(<EstatusQ3 />)
    const insights = lamina(container, 'funnel-insights')
    expect(insights.getByText('9.3%')).toBeInTheDocument()
    expect(insights.getByText(/meta de venta externa de las siete empresas/)).toBeInTheDocument()
  })

  it('lo ganado: 16 negocios con 12 empresas, por $5.49 M', () => {
    const { container } = render(<EstatusQ3 />)
    const ganadas = lamina(container, 'ganadas')
    expect(ganadas.getByRole('heading', { name: '16 negocios ganados con 12 empresas, por $5.49 M' })).toBeInTheDocument()
    expect(ganadas.getAllByRole('row')).toHaveLength(16)
  })

  it('ningún nombre de empresa del grupo va mal escrito y Zeus no aparece', () => {
    const { container } = render(<EstatusQ3 />)
    const texto = container.textContent ?? ''
    expect(texto).not.toMatch(/Neracode|ResearchLand|House Of Films|Mexa creativa|Zeus|Cheff|Engament/)
    expect(texto).toMatch(/NeraCode/)
  })

  it('las cifras se ven en su valor final sin JavaScript de animación', () => {
    render(<EstatusQ3 />)
    expect(screen.getAllByText('29,337').length).toBeGreaterThan(0)
    expect(screen.getByText('$67.76 M')).toBeInTheDocument()
    expect(screen.getAllByText('231').length).toBeGreaterThan(0)
  })
})
