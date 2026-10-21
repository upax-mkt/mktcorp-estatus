import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { PresentacionFortaleza } from './PresentacionFortaleza'
import { DESCUBRIMOS, DOLORES, PROPIEDADES, PROPUESTAS } from './contenido'

/**
 * «FORTALEZA MEXICANA», tal como la ven Ceci y la Sra. María Laura de Salinas: la estructura que dictó Ceci el 20-oct
 * y lo que ajustó al revisarla con las unidades el 21-oct (Notas de Voz «UPAX GS 11»): primero solo los problemas,
 * después lo que proponemos por las cuatro partes de Fortaleza Mexicana.
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
  it('sigue el orden de Ceci: el bastión, lo que descubrimos, por qué creemos, el índice, lo que proponemos, el plan y el cierre', () => {
    const { container } = render(<PresentacionFortaleza />)
    const capas = Array.from(container.querySelectorAll('[data-layout]')).map((p) => p.getAttribute('data-layout'))
    expect(capas).toEqual([
      'portada',
      ...DESCUBRIMOS.map((g) => `descubrimos-${g.id}`),
      'creemos',
      'indice',
      ...PROPUESTAS.map((p) => `propuesta-${p.id}`),
      'plan',
      'cierre',
    ])
  })

  it('lo que descubrimos lleva solo los problemas: nada de cómo se resuelve (Ceci: «no todo junto»)', () => {
    const { container } = render(<PresentacionFortaleza />)
    for (const g of DESCUBRIMOS) {
      const pantalla = container.querySelector(`[data-layout="descubrimos-${g.id}"]`)!
      expect(pantalla.textContent, g.id).not.toMatch(/lo resolvemos|resuelve|proponemos esto/i)
      for (const u of ['Promo Espacio', 'Marketing United', 'House of Films', 'NeraCode', 'Research Land', 'UiX', 'Zeus']) {
        expect(pantalla.textContent, `${g.id} nombra a ${u}`).not.toContain(u)
      }
    }
    // Cada problema aparece una vez, en la pantalla de su parte.
    const numeros = DESCUBRIMOS.flatMap((g) => DOLORES.filter((d) => g.propiedades.includes(d.propiedad)).map((d) => d.n))
    expect(numeros).toEqual(DOLORES.map((d) => d.n))
  })

  it('un problema por idea: que no se venden y que se cambian a mano son dos problemas (Ceci, 21-oct)', () => {
    const venden = DOLORES.find((d) => /no se venden/i.test(d.titulo))
    const mano = DOLORES.find((d) => /a mano/i.test(d.titulo))
    expect(venden).toBeDefined()
    expect(mano).toBeDefined()
    expect(venden!.n).not.toBe(mano!.n)
    expect(venden!.texto).not.toMatch(/USB|a mano/i)
  })

  it('el Frontón lleva su foto por fuera en lo que descubrimos', () => {
    const { container } = render(<PresentacionFortaleza />)
    const fronton = container.querySelector('[data-layout="descubrimos-fronton"]')!
    expect(fronton.querySelector('img[src*="fachada"]')).not.toBeNull()
  })

  it('cada propuesta dice en su titular lo que buscamos, nombra a quien lo hace y enseña cómo se verá', () => {
    const { container } = render(<PresentacionFortaleza />)
    for (const p of PROPUESTAS) {
      const pantalla = container.querySelector(`[data-layout="propuesta-${p.id}"]`)!
      expect(pantalla.querySelector('h2')?.textContent, p.id).toBe(p.titulo)
      expect(p.aportes.length, p.id).toBeGreaterThan(1)
      // El logo de cada unidad que aporta.
      for (const u of new Set(p.aportes.map((a) => a.unidad))) {
        expect(pantalla.querySelectorAll('img').length, `${p.id}: ${u}`).toBeGreaterThan(0)
      }
      expect(pantalla.querySelectorAll('figure').length, p.id).toBeGreaterThan(0)
    }
  })

  it('las cuatro partes de Fortaleza Mexicana tienen su propuesta, y cada botón del índice lleva a ella', () => {
    const { container } = render(<PresentacionFortaleza />)
    for (const parte of PROPIEDADES) {
      expect(PROPUESTAS.some((p) => p.propiedad === parte.id), parte.id).toBe(true)
    }
    const ligas = Array.from(container.querySelectorAll<HTMLAnchorElement>('[data-layout="indice"] a'))
    expect(ligas).toHaveLength(PROPIEDADES.length)
    for (const a of ligas) {
      const destino = a.getAttribute('href')!.slice(1)
      expect(destino).not.toBe('propuesta-')
      expect(container.querySelector(`#${destino}`), destino).not.toBeNull()
    }
  })

  it('cada problema tiene al menos una propuesta que lo atiende, y cada propuesta nombra problemas que existen', () => {
    const atendidos = new Set(PROPUESTAS.flatMap((p) => p.resuelve))
    for (const d of DOLORES) expect(atendidos.has(d.n), `el ${d.n}`).toBe(true)
    for (const p of PROPUESTAS) {
      for (const n of p.resuelve) expect(DOLORES[n - 1]?.n, `${p.id} en el ${n}`).toBe(n)
    }
  })

  it('habla claro: sin jerga, sin el aforo, sin transmisiones y sin cifras que no podamos enseñar', () => {
    const texto = todo(render(<PresentacionFortaleza />).container)
    // Ceci: «María no sabe qué es SIDI», «no sabe lo que es programático».
    expect(texto).not.toMatch(/SIDI|program[aá]tic/i)
    // Ceci, 21-oct: «videoactivaciones, la compra… no sé qué hablas».
    expect(texto).not.toMatch(/videoactivaci|Lo resolvemos con/i)
    // Ceci: el teatro que se va llenando, «eso no es mi trabajo».
    expect(texto).not.toMatch(/Lo queremos lleno|frente \d de 5/i)
    // Ceci: los derechos de transmisión no son de un patrocinador.
    expect(texto).not.toMatch(/transmisi|f[uú]tbol|Monday Night/i)
    // Ceci preguntó «¿cuáles son?» por las 360 empresas: sin la base instalada, no va el número.
    expect(texto).not.toMatch(/360/)
    // Ceci: no nos comprometemos a comprar mesas.
    expect(texto).not.toMatch(/cenas a cuatro manos con nuestros clientes/i)
    // Ceci: «¿Cuál grupo? No se entiende». Se dice Grupo Salinas o Grupo UPAX, nunca «el grupo» a secas.
    expect(texto).not.toMatch(/\bdel grupo\b/i)
    // Ceci: «las mejores que salgan de esa revisión… ¿De qué habla?».
    expect(texto).not.toMatch(/revisi[oó]n de UiX|salgan de (esa|la) revisi/i)
    // Revisión independiente: «lo invitamos» suena a que paga UPAX; y el nombre en francés no va en una pieza mexicana.
    expect(texto).not.toMatch(/lo invitamos|Le Petit/i)
  })

  it('nada va como «ya conseguido»: Promo Espacio aclaró que lo de la ciudad es una oferta (21-oct)', () => {
    const texto = todo(render(<PresentacionFortaleza />).container)
    expect(texto).not.toMatch(/Ya conseguido|Ya corre/i)
    expect(texto).toContain('Listo para arrancar')
    expect(texto).toContain('Siguiente temporada')
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
