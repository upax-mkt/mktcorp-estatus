import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GraficoCartesiano } from './GraficoCartesiano'

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
  it('la barra del valor máximo del conjunto llega al borde superior y ocupa el 100% de la altura útil', () => {
    render(<GraficoCartesiano datos={DATOS} alto={200} />)
    const barras = screen.getAllByTestId('barra')

    const basesInferiores = barras.map(
      (b) => Number(b.getAttribute('y')) + Number(b.getAttribute('height')),
    )
    for (const base of basesInferiores) {
      expect(base).toBeCloseTo(basesInferiores[0], 5)
    }

    // Orden de renderizado: categoría externa, serie interna. El máximo
    // (2420) vive en la 3ra categoría ('mar', índice 2) y la 1ra serie
    // ('Total 2026', índice 0) → índice 2*2 + 0 = 4 con 2 series por grupo.
    const indiceValorMaximo = 4
    const barraValorMaximo = barras[indiceValorMaximo]

    expect(Number(barraValorMaximo.getAttribute('y'))).toBeCloseTo(0, 5)
    expect(Number(barraValorMaximo.getAttribute('height'))).toBeCloseTo(basesInferiores[0], 5)
  })

  it('muestra la etiqueta de cada serie en la leyenda', () => {
    render(<GraficoCartesiano datos={DATOS} alto={200} />)
    for (const serie of DATOS.series) {
      expect(screen.getByText(serie.etiqueta)).toBeInTheDocument()
    }
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
    const alturaNegativa = Number(barras[1].getAttribute('height'))
    expect(alturaNegativa).toBeGreaterThan(0)
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
    const alturas = screen.getAllByTestId('barra').map((b) => Number(b.getAttribute('height')))
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
    const rects = container.querySelectorAll('rect[data-testid="barra"]')
    expect(rects.length).toBe(240)
    for (const rect of Array.from(rects)) {
      expect(Number(rect.getAttribute('width'))).toBeGreaterThanOrEqual(0)
      expect(Number(rect.getAttribute('height'))).toBeGreaterThanOrEqual(0)
    }
  })

  it('un cuadrante enteramente en cero mantiene barras planas y no dibuja una línea base engañosa', () => {
    const datosCero = {
      categorias: ['ene', 'feb', 'mar'],
      series: [{ etiqueta: 'Nulo', valores: [0, 0, 0] }],
    }
    const { container } = render(<GraficoCartesiano datos={datosCero} alto={200} />)
    const barras = screen.getAllByTestId('barra')
    expect(barras).toHaveLength(3)
    for (const barra of barras) {
      expect(Number(barra.getAttribute('height'))).toBe(0)
    }
    expect(container.querySelector('[data-testid="linea-cero"]')).not.toBeInTheDocument()
  })

  it('con valores negativos, ninguna etiqueta de valor queda a menos de 12px de la etiqueta de categoría de su grupo', () => {
    const datosNegativos = {
      categorias: ['ene', 'feb', 'mar'],
      series: [{ etiqueta: 'Caída %', valores: [-20, -45, -10] }],
    }
    render(<GraficoCartesiano datos={datosNegativos} alto={200} />)
    for (let i = 0; i < datosNegativos.categorias.length; i++) {
      const yCategoria = Number(screen.getByText(datosNegativos.categorias[i]).getAttribute('y'))
      const valor = datosNegativos.series[0].valores[i]
      const yValor = Number(screen.getByText(valor.toLocaleString('es-MX')).getAttribute('y'))
      expect(Math.abs(yCategoria - yValor)).toBeGreaterThanOrEqual(12)
    }
  })

  it('una serie con etiqueta larga no produce texto que se salga del ancho del viewBox en la leyenda', () => {
    const ancho = 640
    const datosEtiquetaLarga = {
      categorias: ['ene', 'feb'],
      series: [
        { etiqueta: 'Pipeline generado acumulado 2026 vs 2025', valores: [10, 20] },
        { etiqueta: 'Orgánico 2026', valores: [5, 8] },
      ],
    }
    const { container } = render(<GraficoCartesiano datos={datosEtiquetaLarga} alto={200} ancho={ancho} />)

    // La leyenda vive en su propio <g> trasladado; sumamos ese translate al
    // x del <text> y a una estimación (generosa, no medición real de
    // navegador) del ancho del texto ya truncado para confirmar que no cruza
    // el borde derecho del viewBox.
    const svg = container.querySelector('svg')
    const gsDeNivelSuperior = Array.from(svg?.querySelectorAll(':scope > g') ?? [])
    const gLeyenda = gsDeNivelSuperior[gsDeNivelSuperior.length - 1]
    expect(gsDeNivelSuperior.length).toBe(2)
    const transform = gLeyenda!.getAttribute('transform') ?? ''
    const match = transform.match(/translate\(([^,]+),/)
    const translateX = Number(match?.[1])
    expect(Number.isFinite(translateX)).toBe(true)

    const textos = Array.from(gLeyenda!.querySelectorAll('text'))
    expect(textos.length).toBe(2)

    // El texto de la etiqueta larga debe haberse truncado (no aparece
    // completo) y terminar en puntos suspensivos.
    const textoLargo = textos.find((t) => t.textContent?.startsWith('Pipeline'))
    expect(textoLargo).toBeDefined()
    expect(textoLargo!.textContent).not.toBe(datosEtiquetaLarga.series[0].etiqueta)
    expect(textoLargo!.textContent?.endsWith('…')).toBe(true)

    // 7.0px/caracter: un poco más pesimista que el factor que usa el propio
    // componente (fontSize 11 * 0.62 ≈ 6.8px/caracter) para dejar margen de
    // seguridad, sin ser un número irreal para el ancho promedio de un
    // caracter a este tamaño de fuente.
    const ANCHO_ESTIMADO_POR_CARACTER = 7.0
    for (const texto of textos) {
      const x = Number(texto.getAttribute('x'))
      const anchoEstimado = (texto.textContent?.length ?? 0) * ANCHO_ESTIMADO_POR_CARACTER
      expect(translateX + x + anchoEstimado).toBeLessThanOrEqual(ancho)
    }
  })
})
