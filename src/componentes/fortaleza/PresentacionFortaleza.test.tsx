import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { PresentacionFortaleza } from './PresentacionFortaleza'
import { AYUDA, DOLORES } from './contenido'

/**
 * «FORTALEZA MEXICANA», tal como la ven Ceci y la Sra. María Laura de Salinas (ronda 4, 21-oct-2026: la estructura
 * que dictó Ceci el 20-oct).
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
  it('sigue el orden de Ceci: el bastión, lo que descubrimos, por qué creemos, cómo ayudamos, el plan y el cierre', () => {
    const { container } = render(<PresentacionFortaleza />)
    const capas = Array.from(container.querySelectorAll('[data-layout]')).map((p) => p.getAttribute('data-layout'))
    expect(capas).toEqual(['portada', 'descubrimos-1', 'descubrimos-2', 'creemos', 'ayudamos', 'plan', 'cierre'])
  })

  it('los ocho hallazgos van numerados y cada uno dice quién lo atiende', () => {
    const { container } = render(<PresentacionFortaleza />)
    const texto = todo(container)
    for (const d of DOLORES) expect(texto).toContain(d.titulo)
    expect(DOLORES.map((d) => d.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('lo que atiende cada unidad cuadra en las dos direcciones: el hallazgo la nombra y ella lo resuelve', () => {
    for (const d of DOLORES) {
      for (const u of d.atienden) {
        const ayuda = AYUDA.find((a) => a.unidad === u)
        expect(ayuda, `${u} en el hallazgo ${d.n}`).toBeDefined()
        expect(ayuda?.resuelve, `${u} resuelve el ${d.n}`).toContain(d.n)
      }
    }
    for (const a of AYUDA) {
      expect(a.resuelve.length, a.unidad).toBeGreaterThan(0)
      for (const n of a.resuelve) expect(DOLORES[n - 1].atienden, `${a.unidad} en el ${n}`).toContain(a.unidad)
    }
  })

  it('sin JavaScript se leen el dibujo y las ocho unidades completas', () => {
    const { container } = render(<PresentacionFortaleza />)
    const ayudamos = container.querySelector('[data-layout="ayudamos"]')
    expect(ayudamos?.querySelectorAll('article')).toHaveLength(AYUDA.length)
    for (const a of AYUDA) expect(ayudamos?.textContent).toContain(a.frase)
  })

  it('al tocar una unidad se despliega la suya, y «Volver al dibujo» regresa', () => {
    const { container, getAllByText } = render(<PresentacionFortaleza />)
    const ayudamos = container.querySelector<HTMLElement>('[data-layout="ayudamos"]')!
    const nodo = ayudamos.querySelector<HTMLButtonElement>('button[aria-label^="UiX"]')!
    fireEvent.click(nodo)
    expect(ayudamos.dataset.vista).toBe('unidad')
    expect(ayudamos.querySelector('article[data-elegida="true"]')?.id).toBe('ayuda-uix')
    fireEvent.click(getAllByText('Volver al dibujo')[0])
    expect(ayudamos.dataset.vista).toBe('dibujo')
  })

  it('habla claro: sin jerga, sin el aforo, sin transmisiones y sin cifras que no podamos enseñar', () => {
    const texto = todo(render(<PresentacionFortaleza />).container)
    // Ceci: «María no sabe qué es SIDI», «no sabe lo que es programático».
    expect(texto).not.toMatch(/SIDI|program[aá]tic/i)
    // Ceci: el teatro que se va llenando, «eso no es mi trabajo».
    expect(texto).not.toMatch(/Lo queremos lleno|frente \d de 5/i)
    // Ceci: los derechos de transmisión no son de un patrocinador.
    expect(texto).not.toMatch(/transmisi|f[uú]tbol|Monday Night/i)
    // Ceci preguntó «¿cuáles son?» por las 360 empresas: sin la base instalada, no va el número.
    expect(texto).not.toMatch(/360/)
    // Ceci: no nos comprometemos a comprar mesas; se ofrecen a los directivos del grupo.
    expect(texto).not.toMatch(/cenas a cuatro manos con nuestros clientes/i)
  })

  it('nunca lleva precios, montos ni «inversión» (decisión de Franco: ella no es una prospecta)', () => {
    const texto = todo(render(<PresentacionFortaleza />).container)
    expect(texto).not.toMatch(/\$\s?\d/)
    expect(texto).not.toMatch(/MXN|pesos|inversi[oó]n|cotiza|descuento/i)
  })

  it('nombra solo a las unidades que mandaron algo: Mexa Creativa no aparece', () => {
    expect(todo(render(<PresentacionFortaleza />).container)).not.toMatch(/Mexa/i)
  })

  it('cada imagen con contenido dice qué muestra', () => {
    const { container } = render(<PresentacionFortaleza />)
    for (const img of Array.from(container.querySelectorAll('img'))) {
      const decorativa = img.closest('[aria-hidden="true"]') !== null
      if (!decorativa) expect(img.getAttribute('alt'), img.getAttribute('src') ?? '').toBeTruthy()
    }
  })
})
