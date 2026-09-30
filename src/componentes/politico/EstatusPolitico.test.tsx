import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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
  it('son diez pantallas, cada una proyectable por ModoPresentar', () => {
    const { container } = render(<EstatusPolitico />)
    const pantallas = container.querySelectorAll('[data-layout]')
    expect(pantallas).toHaveLength(10)
    expect([...pantallas].map((p) => p.getAttribute('data-layout'))).toEqual([
      'portada', 'cifras', 'ganado', 'embudo', 'pipeline', 'oportunidades', 'institutos', 'partidos', 'inbound', 'siguientes',
    ])
  })

  it('las cifras se ven en su valor final sin JavaScript de animación', () => {
    render(<EstatusPolitico />)
    expect(screen.getAllByText('$200 mil').length).toBeGreaterThan(0)
    expect(screen.getAllByText('$5.7 M').length).toBeGreaterThan(0)
    expect(screen.getByText('$5,701,774')).toBeInTheDocument()
  })

  it('Promo Espacio suma $1,700,000 — la corrección del deck de Ángel', () => {
    render(<EstatusPolitico />)
    expect(screen.getByText('$1,700,000')).toBeInTheDocument()
  })

  it('el embudo baja de 19 reuniones a 1 ganado', () => {
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
