import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Grafico } from './Grafico'
import { GraficoCartesiano } from './GraficoCartesiano'
import { BarrasHorizontales } from './BarrasHorizontales'
import { Dona } from './Dona'
import { TIPOS_DE_GRAFICO } from '@/decision/esquema'

const PERIODOS = ['Abr', 'May', 'Jun']

function grafico(tipo: string, series: unknown[] = [{ etiqueta: 'Sesiones', valores: [10, 20, 15] }]) {
  return { tipo, periodos: PERIODOS, series } as Parameters<typeof Grafico>[0]['grafico']
}

describe('Grafico — el despachador', () => {
  it('todos los tipos del esquema dibujan algo: ninguno se queda en blanco', () => {
    // El enum del esquema es lo que el modelo puede elegir. Un tipo sin
    // dibujo es un hueco que aparece en la sesión, delante del director.
    for (const tipo of TIPOS_DE_GRAFICO) {
      const { container, unmount } = render(<Grafico grafico={grafico(tipo)} />)
      expect(container.querySelector('svg'), `"${tipo}" no dibujó nada`).not.toBeNull()
      unmount()
    }
  })

  it('pone el título del gráfico cuando lo trae', () => {
    render(<Grafico grafico={{ ...grafico('barras'), titulo: 'Tráfico website' }} />)
    expect(screen.getByText('Tráfico website')).toBeInTheDocument()
  })

  it('en el combo, la forma la decide cada serie', () => {
    const { container } = render(
      <Grafico
        grafico={grafico('combo-barras-lineas', [
          { etiqueta: 'Sesiones', valores: [10, 20, 15], forma: 'barra' },
          { etiqueta: 'Meta', valores: [18, 18, 18], forma: 'linea-punteada' },
        ])}
      />,
    )
    expect(container.querySelectorAll('[data-testid="barra"]')).toHaveLength(3)
    expect(container.querySelector('[data-testid="linea-meta"]')).not.toBeNull()
  })

  it('en "lineas-multiples" el tipo manda: ninguna serie sale como barra', () => {
    const { container } = render(
      <Grafico
        grafico={grafico('lineas-multiples', [
          { etiqueta: 'Coste', valores: [1000, 1200, 900] },
          { etiqueta: 'Clics', valores: [40, 55, 38] },
        ])}
      />,
    )
    expect(container.querySelectorAll('[data-testid="barra"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-testid="linea"]')).toHaveLength(2)
  })
})

describe('GraficoCartesiano — líneas y doble eje', () => {
  const COMBO = {
    categorias: PERIODOS,
    series: [
      { etiqueta: 'Sesiones', valores: [1200, 1366, 968], forma: 'barra' as const },
      { etiqueta: 'Meta', valores: [1000, 1000, 1000], forma: 'linea-punteada' as const },
      { etiqueta: 'CTR', valores: [0.9, 1.1, 0.8], forma: 'linea' as const, eje: 'derecho' as const, sufijo: '%' },
    ],
  }

  it('la meta se dibuja punteada y sin puntos: es una referencia, no una medición', () => {
    const { container } = render(<GraficoCartesiano datos={COMBO} alto={220} />)
    const meta = container.querySelector('[data-testid="linea-meta"]')
    expect(meta?.getAttribute('stroke-dasharray')).toBeTruthy()
    // Los únicos puntos son los de la serie de CTR (3), no los de la meta.
    expect(container.querySelectorAll('[data-testid="punto"]')).toHaveLength(3)
  })

  it('la serie del eje derecho se lee en SU escala, no aplastada contra el suelo', () => {
    const { container } = render(<GraficoCartesiano datos={COMBO} alto={220} />)
    const puntos = Array.from(container.querySelectorAll('[data-testid="punto"]'))
    const ys = puntos.map((p) => Number(p.getAttribute('cy')))
    // Con un solo eje, 0.9 y 1.1 frente a un máximo de 1366 caerían en la
    // misma fila de píxeles. Con dos ejes, se separan de verdad.
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(20)
  })

  it('dibuja los números del eje derecho', () => {
    const { container } = render(<GraficoCartesiano datos={COMBO} alto={220} />)
    expect(container.querySelectorAll('[data-testid="tick-derecho"]').length).toBeGreaterThan(0)
  })

  it('sin serie de eje derecho no aparece un segundo eje vacío', () => {
    const { container } = render(
      <GraficoCartesiano
        datos={{ categorias: PERIODOS, series: [{ etiqueta: 'a', valores: [1, 2, 3] }] }}
        alto={220}
      />,
    )
    expect(container.querySelectorAll('[data-testid="tick-derecho"]')).toHaveLength(0)
  })

  it('mostrarValores escribe el número con su unidad', () => {
    render(
      <GraficoCartesiano
        datos={{ categorias: ['Jun'], series: [{ etiqueta: 'Coste', valores: [3591], prefijo: '$' }] }}
        alto={220}
        mostrarValores
      />,
    )
    expect(screen.getByText('$3,591')).toBeInTheDocument()
  })

  it('un área se rellena bajo su línea', () => {
    const { container } = render(
      <GraficoCartesiano
        datos={{ categorias: PERIODOS, series: [{ etiqueta: 'a', valores: [1, 2, 3], forma: 'area' }] }}
        alto={220}
      />,
    )
    expect(container.querySelector('[data-testid="area"]')).not.toBeNull()
  })
})

describe('BarrasHorizontales', () => {
  const DATOS = {
    categorias: ['Organic Search', 'Paid Search', 'Direct'],
    series: [
      { etiqueta: '2025', valores: [340, 120, 90] },
      { etiqueta: '2026', valores: [410, 96, 105] },
    ],
  }

  it('dibuja una barra por categoría y serie', () => {
    const { container } = render(<BarrasHorizontales datos={DATOS} alto={220} />)
    expect(container.querySelectorAll('[data-testid="barra"]')).toHaveLength(6)
  })

  it('la barra mayor es más larga que la menor, y ninguna tiene ancho negativo', () => {
    const { container } = render(<BarrasHorizontales datos={DATOS} alto={220} />)
    const anchos = Array.from(container.querySelectorAll('[data-testid="barra"]')).map((b) =>
      Number(b.getAttribute('width')),
    )
    expect(Math.min(...anchos)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...anchos)).toBeGreaterThan(Math.min(...anchos))
  })

  it('rotula cada categoría y cada serie', () => {
    render(<BarrasHorizontales datos={DATOS} alto={220} />)
    expect(screen.getByText('Paid Search')).toBeInTheDocument()
    expect(screen.getByText('2026')).toBeInTheDocument()
  })

  it('una etiqueta larga se recorta en vez de invadir las barras', () => {
    render(
      <BarrasHorizontales
        datos={{ categorias: ['Búsqueda orgánica de marca y genérica'], series: [{ etiqueta: 'x', valores: [1] }] }}
        alto={120}
      />,
    )
    expect(screen.getByText(/…$/)).toBeInTheDocument()
  })
})

describe('Dona', () => {
  const DATOS = {
    categorias: ['Mkt', 'Comercial'],
    series: [{ etiqueta: 'Pipeline', valores: [12, 27], prefijo: '$', sufijo: ' MDP' }],
  }

  it('un sector por categoría, con su color de dato', () => {
    const { container } = render(<Dona datos={DATOS} alto={220} />)
    const sectores = container.querySelectorAll('[data-testid="sector"]')
    expect(sectores).toHaveLength(2)
    for (const s of Array.from(sectores)) {
      expect(s.getAttribute('fill')).toMatch(/^var\(--dato-[1-6]\)$/)
    }
  })

  it('la leyenda trae el valor con su unidad', () => {
    render(<Dona datos={DATOS} alto={220} />)
    expect(screen.getByText(/\$27 MDP/)).toBeInTheDocument()
  })

  it('un total de cero no revienta ni dibuja sectores fantasma', () => {
    const { container } = render(
      <Dona datos={{ categorias: ['a', 'b'], series: [{ etiqueta: 'x', valores: [0, 0] }] }} alto={220} />,
    )
    expect(container.querySelectorAll('[data-testid="sector"]')).toHaveLength(0)
  })
})

describe('etiquetas de valor que no se pisan', () => {
  it('dos series con valores cercanos escriben sus números en alturas distintas', () => {
    // Con doble eje esto pasa aunque las magnitudes no se parezcan: $29,472 y
    // 571 caen en la misma fila de píxeles porque cada uno va contra su tope.
    render(
      <GraficoCartesiano
        datos={{
          categorias: ['Mayo', 'Junio'],
          series: [
            { etiqueta: 'Inversión', valores: [28235, 29472], forma: 'linea', prefijo: '$' },
            { etiqueta: 'Clics', valores: [635, 571], forma: 'linea', eje: 'derecho' },
          ],
        }}
        alto={220}
        mostrarValores
      />,
    )
    const inversion = Number(screen.getByText('$29,472').getAttribute('y'))
    const clics = Number(screen.getByText('571').getAttribute('y'))
    expect(Math.abs(inversion - clics)).toBeGreaterThanOrEqual(12)
  })
})
