import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PresentacionRl } from './PresentacionRl'

/**
 * LA REVISIÓN COMERCIAL DE RESEARCH LAND, tal como la ven Pablo y Gio.
 *
 * Sin `IntersectionObserver`, como un navegador que no puede animar: cada
 * cifra en su valor final y nada escondido. Una animación perdida se perdona;
 * una cifra en cero frente al director de la unidad, no.
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

describe('PresentacionRl', () => {
  it('son seis pantallas, cada una proyectable por ModoPresentar', () => {
    const { container } = render(<PresentacionRl />)
    const pantallas = container.querySelectorAll('[data-layout]')
    expect(Array.from(pantallas).map((p) => p.getAttribute('data-layout'))).toEqual([
      'numero',
      'perdidas',
      'pm',
      'ejecutiva',
      'ajustes',
      'siguientes',
    ])
  })

  it('abre con su número en el valor final: 2 de 95', () => {
    const { container } = render(<PresentacionRl />)
    const cifra = container.querySelector('[data-layout="numero"]')
    expect(cifra?.textContent).toContain('2de 95')
    expect(cifra?.textContent).toContain('89 se perdieron. 4 siguen abiertas.')
  })

  it('los motivos de pérdida salen de los 120 perdidos y el competidor queda en 3%', () => {
    render(<PresentacionRl />)
    for (const valor of ['32%', '23%', '18%', '3%']) {
      expect(screen.getAllByText(valor).length).toBeGreaterThan(0)
    }
    expect(screen.getByText('Contra un competidor')).toBeTruthy()
  })

  it('la meta se lee contra lo facturado: $10.2M en 2025 y $34.8M en el plan', () => {
    const { container } = render(<PresentacionRl />)
    const ajustes = container.querySelector('[data-layout="ajustes"]')?.textContent ?? ''
    expect(ajustes).toContain('$10.2M')
    expect(ajustes).toContain('$34.8M')
  })

  it('nombra a la PM recomendada y no trae cifras por persona', () => {
    const { container } = render(<PresentacionRl />)
    expect(screen.getByText('Recomendamos a Rocío Cervantes')).toBeTruthy()
    expect(container.textContent).not.toMatch(/Nahum/)
  })
})
