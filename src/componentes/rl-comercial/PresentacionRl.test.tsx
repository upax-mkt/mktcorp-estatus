import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { PresentacionRl } from './PresentacionRl'

/**
 * LA PROPUESTA PARA EL ÁREA COMERCIAL DE RESEARCH LAND, tal como la ven Pablo y Gio.
 *
 * Sin `IntersectionObserver`, como un navegador que no puede animar: todo
 * visible y en su estado final. Una animación perdida se perdona; una escena
 * vacía frente al director de la unidad, no.
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

const texto = (container: HTMLElement, capa: string) =>
  container.querySelector(`[data-layout="${capa}"]`)?.textContent ?? ''

describe('PresentacionRl', () => {
  it('son diez escenas en el orden del guion: la respuesta primero y las decisiones al final', () => {
    const { container } = render(<PresentacionRl />)
    const capas = Array.from(container.querySelectorAll('[data-layout]')).map((p) => p.getAttribute('data-layout'))
    expect(capas).toEqual([
      'portada',
      'idea',
      'orbita',
      'organigrama',
      'journey',
      'kpis',
      'candidatos',
      'piloto',
      'plan',
      'decisiones',
    ])
  })

  it('los títulos, leídos seguidos, cuentan la propuesta', () => {
    const { container } = render(<PresentacionRl />)
    // Título genérico desde el 6-oct-2026, igual que la PPT que se le entregó a Pablo: ya no «Proponemos…».
    expect(texto(container, 'portada')).toContain('Nueva estructura comercial 2027')
    expect(texto(container, 'portada')).not.toContain('Proponemos')
    expect(texto(container, 'orbita')).not.toContain('Estructura propuesta')
    expect(texto(container, 'idea')).toContain('El cliente le compra a quien sabe')
    expect(texto(container, 'journey')).toContain('nunca se queda sin dueño')
    expect(texto(container, 'candidatos')).toContain('Rocío Cervantes')
    expect(texto(container, 'decisiones')).toContain('Tres decisiones')
    expect(texto(container, 'decisiones')).not.toContain('para hoy')
  })

  it('la estructura pone a cada persona en su puesto', () => {
    const { container } = render(<PresentacionRl />)
    const organigrama = texto(container, 'organigrama')
    for (const persona of ['Pablo Levy', 'Giovanni Sanabria', 'Elizabeth Gómez', 'Rocío Cervantes', 'Juan Carlos Hesles']) {
      expect(organigrama).toContain(persona)
    }
  })

  it('el journey nombra sus doce pasos', () => {
    const { container } = render(<PresentacionRl />)
    const journey = texto(container, 'journey')
    for (const paso of [
      'Prospección',
      'Reunión de diagnóstico',
      'Calificación',
      'Diseño y cotización',
      'Autorización',
      'Presentación en persona',
      'Seguimiento',
      'Alta y arranque',
      'Ejecución',
      'Entrega de resultados',
      'Facturación y cobro',
      'Recompra',
    ]) {
      expect(journey).toContain(paso)
    }
  })

  it('analiza a las tres candidaturas', () => {
    const { container } = render(<PresentacionRl />)
    const candidatos = texto(container, 'candidatos')
    for (const nombre of ['Rocío Cervantes', 'Violeta Hernández', 'Juan Carlos Gutiérrez']) {
      expect(candidatos).toContain(nombre)
    }
  })

  it('el cliente (el punto) está en cada escena: es el hilo conductor', () => {
    const { container } = render(<PresentacionRl />)
    for (const escena of Array.from(container.querySelectorAll('[data-layout]'))) {
      expect(escena.querySelector('span[aria-hidden="true"]')).not.toBeNull()
    }
  })

  it('no trae la realidad ni números actuales, ni nombres que no van', () => {
    const { container } = render(<PresentacionRl />)
    expect(container.textContent).not.toMatch(/de 95|perdidos|facturaron|\$\d|Nahum/)
  })
})
