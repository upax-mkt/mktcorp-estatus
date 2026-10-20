import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { PresentacionFortaleza } from './PresentacionFortaleza'
import { BUTACAS, TOTAL, BASE, TRAMO, limite, rangoDe } from './Aforo'

/**
 * «LO QUEREMOS LLENO», tal como la ven Ceci y la Sra. María Laura de Salinas.
 *
 * Sin `IntersectionObserver`, como un navegador que no puede animar: todo visible y en su estado final. Una
 * animación perdida se perdona; una escena vacía frente a ella, no.
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

const todo = (container: HTMLElement) => container.textContent ?? ''

describe('PresentacionFortaleza', () => {
  it('son dieciséis pantallas en el orden del guion: la cumbre sola y, después, la petición', () => {
    const { container } = render(<PresentacionFortaleza />)
    const capas = Array.from(container.querySelectorAll('[data-layout]')).map((p) => p.getAttribute('data-layout'))
    expect(capas).toEqual([
      'portada', 'escuchamos', 'joya', 'sumar', 'ahora', 'nuestro',
      'ciudad', 'calle', 'grupo', 'semana', 'usos', 'comprar', 'medir',
      'ruta', 'lleno', 'cierre',
    ])
  })

  it('el cierre hace la pregunta, y la cumbre no lleva nada más que su título', () => {
    const { container } = render(<PresentacionFortaleza />)
    expect(container.querySelector('[data-layout="cierre"]')?.textContent).toContain('¿Qué llenamos primero')
    expect(container.querySelector('[data-layout="lleno"]')?.textContent).not.toContain('¿Qué llenamos primero')
  })

  it('el título se dice al abrir y al cerrar', () => {
    const { container } = render(<PresentacionFortaleza />)
    expect(container.querySelector('[data-layout="portada"]')?.textContent).toContain('Lo queremos lleno.')
    expect(container.querySelector('[data-layout="lleno"]')?.textContent).toContain('Lo queremos lleno.')
  })

  it('nunca lleva precios, montos ni «inversión» (decisión de Franco: ella no es una prospecta)', () => {
    const { container } = render(<PresentacionFortaleza />)
    const texto = todo(container)
    expect(texto).not.toMatch(/\$\s?\d/)
    expect(texto).not.toMatch(/MXN|pesos|inversi[oó]n|cotiza/i)
  })

  it('nombra solo a las unidades que mandaron algo: Mexa Creativa no aparece', () => {
    const { container } = render(<PresentacionFortaleza />)
    expect(todo(container)).not.toMatch(/Mexa/i)
  })

  it('cada imagen con contenido dice qué muestra', () => {
    const { container } = render(<PresentacionFortaleza />)
    for (const img of Array.from(container.querySelectorAll('img'))) {
      const decorativa = img.closest('[aria-hidden="true"]') !== null
      if (!decorativa) expect(img.getAttribute('alt'), img.getAttribute('src') ?? '').toBeTruthy()
    }
  })
})

describe('el aforo (hilo conductor)', () => {
  it('es un teatro de unas 380 butacas con geometría fija', () => {
    expect(TOTAL).toBeGreaterThan(330)
    expect(TOTAL).toBeLessThan(430)
    const ordenes = new Set(BUTACAS.map((b) => b.orden))
    expect(ordenes.size).toBe(TOTAL)
  })

  it('abre a la mitad, cada frente suma 8 % y la cumbre lo llena', () => {
    expect(limite(0)).toBe(BASE)
    expect(Math.round((BASE / TOTAL) * 100)).toBe(50)
    expect(limite(5)).toBe(BASE + 5 * TRAMO)
    expect(Math.round((limite(5) / TOTAL) * 100)).toBe(90)
    expect(limite(5, true)).toBe(TOTAL)
    expect(rangoDe('cumbre')).toEqual([BASE + 5 * TRAMO, TOTAL])
  })
})
