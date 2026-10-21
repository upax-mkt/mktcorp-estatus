import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { PresentacionFortaleza } from './PresentacionFortaleza'
import { DOLORES, INDICE, PAGINAS } from './contenido'

/**
 * «FORTALEZA MEXICANA», tal como la ven Ceci y la Sra. María Laura de Salinas: la estructura que dictó Ceci el 20-oct
 * y, desde la ronda 5 (21-oct), una pantalla por unidad que se lee sola.
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
  it('sigue el orden de Ceci: el bastión, lo que descubrimos, por qué creemos, el índice, una pantalla por unidad, el plan y el cierre', () => {
    const { container } = render(<PresentacionFortaleza />)
    const capas = Array.from(container.querySelectorAll('[data-layout]')).map((p) => p.getAttribute('data-layout'))
    expect(capas).toEqual([
      'portada',
      'descubrimos-1',
      'descubrimos-2',
      'creemos',
      'indice',
      ...PAGINAS.map((p) => `unidad-${p.id}`),
      'plan',
      'cierre',
    ])
  })

  it('cada unidad dice en su titular lo que hará, lista lo que produce y enseña cómo se verá', () => {
    const { container } = render(<PresentacionFortaleza />)
    for (const p of PAGINAS) {
      const pantalla = container.querySelector(`[data-layout="unidad-${p.id}"]`)!
      expect(pantalla.querySelector('h2')?.textContent, p.id).toBe(p.titulo)
      expect(p.produce.length, p.id).toBeGreaterThan(1)
      // Ceci: «que ponga lo que produce». Ninguna unidad sin una imagen o un dibujo de lo que hará.
      expect(pantalla.querySelectorAll('figure').length, p.id).toBeGreaterThan(0)
    }
  })

  it('cada botón del índice lleva a la pantalla de su unidad', () => {
    const { container } = render(<PresentacionFortaleza />)
    const ligas = Array.from(container.querySelectorAll<HTMLAnchorElement>('[data-layout="indice"] a'))
    expect(ligas).toHaveLength(INDICE.length)
    for (const a of ligas) {
      const destino = a.getAttribute('href')!.slice(1)
      expect(container.querySelector(`#${destino}`), destino).not.toBeNull()
    }
  })

  it('lo que atiende cada unidad cuadra en las dos direcciones: el hallazgo la nombra y ella lo resuelve', () => {
    const resuelve = (u: string) => PAGINAS.filter((p) => p.unidad === u).flatMap((p) => p.resuelve)
    for (const d of DOLORES) {
      for (const u of d.atienden) expect(resuelve(u), `${u} resuelve el ${d.n}`).toContain(d.n)
    }
    for (const p of PAGINAS) {
      for (const n of p.resuelve) expect(DOLORES[n - 1].atienden, `${p.id} en el ${n}`).toContain(p.unidad)
    }
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
    // Ceci: «¿Cuál grupo? No se entiende». Se dice Grupo Salinas o Grupo UPAX, nunca «el grupo» a secas.
    expect(texto).not.toMatch(/\bdel grupo\b/i)
    // Ceci: «las mejores que salgan de esa revisión… ¿De qué habla?».
    expect(texto).not.toMatch(/revisi[oó]n de UiX|salgan de (esa|la) revisi/i)
    // Revisión independiente: «lo invitamos» suena a que paga UPAX; y el nombre en francés no va en una pieza mexicana.
    expect(texto).not.toMatch(/lo invitamos|Le Petit/i)
  })

  it('lo ya conseguido y lo listo para arrancar se distinguen', () => {
    const texto = todo(render(<PresentacionFortaleza />).container)
    expect(texto).toContain('Ya conseguido')
    expect(texto).toContain('Listo para arrancar')
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
