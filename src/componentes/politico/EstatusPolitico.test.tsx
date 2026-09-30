import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { EstatusPolitico } from './EstatusPolitico'

/**
 * LA PRESENTACIÓN DEL ESTATUS POLÍTICO, tal como la ve Ceci.
 *
 * Se quita `IntersectionObserver` para ver exactamente lo que ve un navegador
 * que no puede animar: cada cifra en su valor final y nada escondido. Es el
 * contrato que importa — una animación perdida se perdona; una cifra en cero
 * delante de la CEO, no.
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

describe('EstatusPolitico', () => {
  it('son nueve pantallas, cada una proyectable por ModoPresentar', () => {
    const { container } = render(<EstatusPolitico />)
    const pantallas = container.querySelectorAll('[data-layout]')
    expect(pantallas).toHaveLength(9)
    expect([...pantallas].map((p) => p.getAttribute('data-layout'))).toEqual([
      'portada', 'bimestre', 'embudo', 'pipeline', 'oportunidades', 'institutos', 'partidos', 'inbound', 'siguientes',
    ])
  })

  it('el bimestre cuenta el pipeline (Franco, 30-sep-2026)', () => {
    const { container } = render(<EstatusPolitico />)
    const seccion = container.querySelector<HTMLElement>('[data-layout="bimestre"]')!
    const lamina = within(seccion)
    expect(lamina.getByRole('heading', { name: 'Estamos generando pipeline' })).toBeInTheDocument()
    expect(lamina.getByText('de pipeline abierto, en 9 oportunidades')).toBeInTheDocument()
    // La primera cifra de la lámina —la grande— es el pipeline abierto.
    const cifras = [...seccion.querySelectorAll('span')].map((s) => s.textContent).filter((t) => t?.startsWith('$'))
    expect(cifras[0]).toBe('$5.9 M')
    expect(lamina.getByText('partidos con los que ya estamos en conversación')).toBeInTheDocument()
  })

  it('al 30-sep-2026 nada dice «ganado»: HubSpot dejó los $200 mil en evaluación', () => {
    render(<EstatusPolitico />)
    expect(screen.queryByText('Ganado por facturar')).not.toBeInTheDocument()
    expect(screen.queryByText(/primer negocio ganado/i)).not.toBeInTheDocument()
  })

  it('Añorve está en partidos y en lo que sigue, con Jorge Teherán como contacto', () => {
    const { container } = render(<EstatusPolitico />)
    const partidos = within(container.querySelector<HTMLElement>('[data-layout="partidos"]')!)
    expect(partidos.getByText('Senador Manuel Añorve · Guerrero')).toBeInTheDocument()
    expect(partidos.getByText(/Jorge Teherán/)).toBeInTheDocument()
    const sigue = within(container.querySelector<HTMLElement>('[data-layout="siguientes"]')!)
    expect(sigue.getByText(/Visita a UPAX del senador Manuel Añorve/)).toBeInTheDocument()
  })

  it('lo que sigue pide el GO de Ceci para salir a vender Radar Político', () => {
    const { container } = render(<EstatusPolitico />)
    const lamina = within(container.querySelector<HTMLElement>('[data-layout="siguientes"]')!)
    expect(lamina.getByText('Necesitamos tu GO')).toBeInTheDocument()
    expect(lamina.getByRole('heading', { name: 'Radar Político es una solución que podemos salir a vender' })).toBeInTheDocument()
    expect(lamina.getByText(/NeraCode nos ayuda a desarrollar la infraestructura/)).toBeInTheDocument()
  })

  it('las cifras se ven en su valor final sin JavaScript de animación', () => {
    render(<EstatusPolitico />)
    expect(screen.getAllByText('$5.9 M').length).toBeGreaterThan(0)
    expect(screen.getByText('$5,901,774')).toBeInTheDocument()
  })

  it('Promo Espacio suma $1,700,000 — la corrección del deck de Ángel', () => {
    render(<EstatusPolitico />)
    expect(screen.getByText('$1,700,000')).toBeInTheDocument()
  })

  it('el embudo baja de 19 reuniones a 9 oportunidades', () => {
    render(<EstatusPolitico />)
    expect(screen.getByRole('heading', { name: 'De 19 reuniones salieron 9 oportunidades' })).toBeInTheDocument()
  })

  it('nombra los nueve institutos y a los partidos, como pidió Franco', () => {
    render(<EstatusPolitico />)
    expect(screen.getByRole('heading', { name: '9 institutos electorales ya nos conocen' })).toBeInTheDocument()
    expect(screen.getByText('Equipo del senador Ricardo Anaya')).toBeInTheDocument()
    expect(screen.getByText('SOMOS MX')).toBeInTheDocument()
  })
})
