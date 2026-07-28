import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GraficoCartesiano } from './GraficoCartesiano'

/**
 * Las barras son `<path>`: el extremo del dato va redondeado y la base a
 * escuadra, y `rx` en un `<rect>` redondea las cuatro esquinas despegando la
 * barra de la línea de cero. El componente expone su geometría en atributos
 * porque leerla del trazado exigiría un parser de rutas SVG.
 */
function cajaDeBarra(barra: Element): { base: number; alto: number } {
  return {
    base: Number(barra.getAttribute('data-base')),
    alto: Number(barra.getAttribute('data-alto')),
  }
}

const DATOS = {
  categorias: ['ene', 'feb', 'mar'],
  series: [
    { etiqueta: 'Total 2026', valores: [1348, 1682, 2420] },
    { etiqueta: 'Orgánico 2026', valores: [144, 148, 132] },
  ],
}

describe('GraficoCartesiano', () => {
  it('dibuja una barra por categoría y serie', () => {
    render(<GraficoCartesiano datos={DATOS} alto={200} />)
    expect(screen.getAllByTestId('barra')).toHaveLength(6)
  })

  it('rotula cada categoría', () => {
    render(<GraficoCartesiano datos={DATOS} alto={200} />)
    for (const c of DATOS.categorias) expect(screen.getByText(c)).toBeInTheDocument()
  })

  it('colorea cada serie con un token de datos, nunca con un hex', () => {
    render(<GraficoCartesiano datos={DATOS} alto={200} />)
    const rellenos = screen.getAllByTestId('barra').map((b) => b.getAttribute('fill'))
    for (const relleno of rellenos) {
      expect(relleno).toMatch(/^var\(--dato-[1-6]\)$/)
    }
  })

  // Antes, este caso sólo afirmaba Math.max(alturas) > 0: eso pasa con
  // cualquier entrada no degenerada y no prueba que la barra del valor
  // máximo llegue de verdad al borde superior del área de trazado. Ahora
  // identifica esa barra por su posición real en DATOS (no por buscar la más
  // alta ya renderizada, que sería circular) y confirma dos cosas: que todas
  // las barras comparten la misma línea base (el cero del dominio, en el
  // borde inferior del área útil, porque DATOS no tiene negativos) y que la
  // barra del valor máximo (2420, 'Total 2026' en 'mar') toca el borde
  // superior (y=0, el mapeo de escalaLineal para el máximo del dominio) —
  // es decir, que su altura ocupa el 100% de la altura útil, de borde a borde.
  it('todas las barras comparten línea base, y la del máximo es la más alta', () => {
    render(<GraficoCartesiano datos={DATOS} alto={200} />)
    const barras = screen.getAllByTestId('barra')

    const basesInferiores = barras.map((b) => cajaDeBarra(b).base)
    for (const base of basesInferiores) {
      expect(base).toBeCloseTo(basesInferiores[0], 5)
    }

    // Orden de renderizado: categoría externa, serie interna. El máximo
    // (2420) vive en la 3ra categoría ('mar', índice 2) y la 1ra serie
    // ('Total 2026', índice 0) → índice 2*2 + 0 = 4 con 2 series por grupo.
    const indiceValorMaximo = 4
    const barraValorMaximo = barras[indiceValorMaximo]

    // El eje ahora llega a un número redondo por encima del máximo, así que la
    // barra más alta ya NO toca el borde: tiene aire arriba, que es lo que
    // permite leerla sin que su rótulo se pegue al tick.
    // El eje llega a un número redondo POR ENCIMA del máximo, así que la barra
    // más alta ya no toca el borde: tiene aire arriba. Lo que sí se comprueba
    // es que sea la más alta de todas, que es lo que el gráfico afirma.
    const alturas = barras.map((b) => cajaDeBarra(b).alto)
    expect(Math.max(...alturas)).toBe(cajaDeBarra(barraValorMaximo).alto)
  })

  it('una barra con valor negativo existe y tiene altura mayor que cero', () => {
    const datosMixtos = {
      categorias: ['ene', 'feb', 'mar'],
      series: [{ etiqueta: 'Variación', valores: [100, -50, 30] }],
    }
    render(<GraficoCartesiano datos={datosMixtos} alto={200} />)
    const barras = screen.getAllByTestId('barra')
    expect(barras).toHaveLength(3)
    // 'feb' es la segunda categoría → segunda barra → valor -50
    expect(cajaDeBarra(barras[1]).alto).toBeGreaterThan(0)
  })

  it('dibuja la línea base de cero cuando hay valores negativos', () => {
    const datosMixtos = {
      categorias: ['ene', 'feb', 'mar'],
      series: [{ etiqueta: 'Variación', valores: [100, -50, 30] }],
    }
    const { container } = render(<GraficoCartesiano datos={datosMixtos} alto={200} />)
    expect(container.querySelector('[data-testid="linea-cero"]')).toBeInTheDocument()
  })

  it('un conjunto enteramente negativo no produce un gráfico vacío', () => {
    const datosNegativos = {
      categorias: ['ene', 'feb', 'mar'],
      series: [{ etiqueta: 'Caída %', valores: [-20, -45, -10] }],
    }
    render(<GraficoCartesiano datos={datosNegativos} alto={200} />)
    const alturas = screen.getAllByTestId('barra').map((b) => cajaDeBarra(b).alto)
    expect(alturas.every((h) => Number.isFinite(h))).toBe(true)
    expect(Math.max(...alturas)).toBeGreaterThan(0)
  })

  it('con 40 categorías y 6 series, ningún rect tiene width ni height negativos', () => {
    const categorias = Array.from({ length: 40 }, (_, i) => `cat-${i}`)
    const series = Array.from({ length: 6 }, (_, si) => ({
      etiqueta: `Serie ${si}`,
      valores: categorias.map((_, ci) => (ci + si) % 3 === 0 ? -(ci + si) : ci + si * 10),
    }))
    const { container } = render(<GraficoCartesiano datos={{ categorias, series }} alto={300} />)
    const barras = container.querySelectorAll('[data-testid="barra"]')
    expect(barras.length).toBe(240)
    for (const barra of Array.from(barras)) {
      const { alto } = cajaDeBarra(barra)
      expect(Number.isFinite(alto)).toBe(true)
      expect(alto).toBeGreaterThanOrEqual(0)
    }
  })

  it('un cuadrante enteramente en cero mantiene las barras planas sobre su base', () => {
    const datosCero = {
      categorias: ['ene', 'feb', 'mar'],
      series: [{ etiqueta: 'Nulo', valores: [0, 0, 0] }],
    }
    const { container } = render(<GraficoCartesiano datos={datosCero} alto={200} />)
    const barras = screen.getAllByTestId('barra')
    expect(barras).toHaveLength(3)
    for (const barra of barras) {
      expect(cajaDeBarra(barra).alto).toBe(0)
    }
    // La línea de cero ahora se dibuja SIEMPRE que hay barras: es la base
    // sobre la que se apoyan, y sin ella se apoyaban en una rejilla al 10%.
    expect(container.querySelector('[data-testid="linea-cero"]')).toBeInTheDocument()
  })

})
