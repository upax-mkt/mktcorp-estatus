import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { PresentacionRl } from './PresentacionRl'

/**
 * LA PROPUESTA PARA EL ÁREA COMERCIAL DE RESEARCH LAND, tal como la ven Pablo y Gio.
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

const pantalla = (container: HTMLElement, capa: string) =>
  container.querySelector(`[data-layout="${capa}"]`)?.textContent ?? ''

describe('PresentacionRl', () => {
  it('son diez pantallas, todas de propuesta: sin realidad ni números actuales', () => {
    const { container } = render(<PresentacionRl />)
    const capas = Array.from(container.querySelectorAll('[data-layout]')).map((p) => p.getAttribute('data-layout'))
    expect(capas).toEqual([
      'portada',
      'principios',
      'estructura',
      'roles-comerciales',
      'roles-areas',
      'journey',
      'candidatos',
      'ejecutiva',
      'precio',
      'plan',
    ])
  })

  it('la estructura pone a cada persona en su puesto', () => {
    const { container } = render(<PresentacionRl />)
    const estructura = pantalla(container, 'estructura')
    for (const persona of ['Pablo Levy', 'Giovanni Sanabria', 'Elizabeth Gómez', 'Rocío Cervantes', 'Juan Carlos Hesles']) {
      expect(estructura).toContain(persona)
    }
  })

  it('el journey tiene doce pasos y dos puertas', () => {
    const { container } = render(<PresentacionRl />)
    const journey = container.querySelector('[data-layout="journey"]')
    expect(journey?.querySelectorAll('ol > li[data-puerta], ol > li:not([data-puerta])').length).toBe(12)
    expect(journey?.querySelectorAll('[data-puerta="true"]').length).toBe(2)
  })

  it('analiza a los tres candidatos y recomienda a uno', () => {
    const { container } = render(<PresentacionRl />)
    const candidatos = pantalla(container, 'candidatos')
    for (const nombre of ['Rocío Cervantes', 'Violeta Hernández', 'Juan Carlos Gutiérrez']) {
      expect(candidatos).toContain(nombre)
    }
    expect(container.querySelectorAll('[data-recomendada="true"]').length).toBe(1)
  })

  it('no trae la realidad ni números actuales', () => {
    const { container } = render(<PresentacionRl />)
    expect(container.textContent).not.toMatch(/de 95|perdidos|facturaron|\$34\.8M/)
  })

  it('no trae cifras por persona', () => {
    const { container } = render(<PresentacionRl />)
    expect(container.textContent).not.toMatch(/Nahum/)
  })
})
