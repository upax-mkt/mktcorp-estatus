import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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
  it('son doce pantallas: el diagnóstico cabe en una y el resto es propuesta', () => {
    const { container } = render(<PresentacionRl />)
    const capas = Array.from(container.querySelectorAll('[data-layout]')).map((p) => p.getAttribute('data-layout'))
    expect(capas).toEqual([
      'portada',
      'partida',
      'principios',
      'estructura',
      'roles-comerciales',
      'roles-areas',
      'journey',
      'candidatos',
      'ejecutiva',
      'meta',
      'precio',
      'plan',
    ])
  })

  it('el punto de partida es su número en el valor final y los motivos de los 120 perdidos', () => {
    const { container } = render(<PresentacionRl />)
    const partida = pantalla(container, 'partida')
    expect(partida).toContain('2de 95')
    for (const valor of ['32%', '23%', '18%', '3%']) {
      expect(partida).toContain(valor)
    }
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

  it('la meta se traduce con los supuestos del plan: 84 proyectos, 420 propuestas, 35 al mes', () => {
    const { container } = render(<PresentacionRl />)
    const meta = pantalla(container, 'meta')
    expect(meta).toContain('$34.8M')
    expect(meta).toContain('84')
    expect(meta).toContain('420')
    expect(screen.getByText('La meta pide 35 presentaciones al mes')).toBeTruthy()
  })

  it('no trae cifras por persona', () => {
    const { container } = render(<PresentacionRl />)
    expect(container.textContent).not.toMatch(/Nahum/)
  })
})
