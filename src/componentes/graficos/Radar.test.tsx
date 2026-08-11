import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Radar } from './Radar'
import { Grafico } from './Grafico'

/**
 * El radar del benchmark de Promo Espacio: siete capacidades puntuadas de 1 a
 * 5, la UDN contra el promedio de su competencia. Es el dato que motivó el
 * gráfico, con los nombres LARGOS de verdad —los que antes había que acortar a
 * "Madurez digital" para que cupieran bajo una barra—.
 */
const CAPACIDADES = {
  categorias: [
    'Momento de compra',
    'Digital y programática',
    'Madurez comercial digital',
    'Cobertura geográfica',
    'Creatividad declarada',
    'Presencia institucional',
    'Escala inventario físico',
  ],
  series: [
    { etiqueta: 'Promo Espacio', valores: [5, 5, 4, 3, 2, 2, 2] },
    { etiqueta: 'Promedio competencia', valores: [1.6, 3.4, 2.6, 4, 2.4, 3.6, 4.2] },
  ],
}

/** El tamaño con el que `Grafico` lo dibuja: 960 de columna por 1.9 de alto. */
const ANCHO = 960
const ALTO = 532

/**
 * El texto completo de un rótulo. Un nombre partido en dos líneas son dos
 * `<tspan>` con su propia posición, no una cadena con un salto: dentro de un
 * SVG no existe el ajuste de línea.
 */
function textoDeEje(rotulo: Element): string {
  const lineas = Array.from(rotulo.querySelectorAll('tspan'))
  return lineas.length > 0
    ? lineas.map((l) => l.textContent).join(' ')
    : (rotulo.textContent ?? '')
}

/**
 * La caja que ocupa un rótulo, estimada igual que la estima el componente
 * (12px de fuente, 0.62 de ancho medio de carácter). No hay otra forma: en
 * jsdom —y dentro de un SVG en general— no se puede medir texto.
 */
function cajaDeRotulo(rotulo: Element) {
  const x = Number(rotulo.getAttribute('x'))
  const y = Number(rotulo.getAttribute('y'))
  const ancla = rotulo.getAttribute('text-anchor')
  const lineas = Array.from(rotulo.querySelectorAll('tspan')).map((l) => l.textContent ?? '')
  const texto = lineas.length > 0 ? lineas : [rotulo.textContent ?? '']
  const ancho = Math.max(...texto.map((t) => t.length * 12 * 0.62))
  const izquierda = ancla === 'start' ? x : ancla === 'end' ? x - ancho : x - ancho / 2
  return {
    izquierda,
    derecha: izquierda + ancho,
    arriba: y - 11,
    abajo: y + (texto.length - 1) * 14 + 4,
  }
}

function seSolapan(a: ReturnType<typeof cajaDeRotulo>, b: ReturnType<typeof cajaDeRotulo>) {
  return (
    a.izquierda < b.derecha && b.izquierda < a.derecha && a.arriba < b.abajo && b.arriba < a.abajo
  )
}

describe('Radar', () => {
  it('un polígono por serie, con su color de dato', () => {
    const { container } = render(<Radar datos={CAPACIDADES} alto={ALTO} ancho={ANCHO} />)
    // `area` y no un testid propio: es el nombre que la animación de entrada ya
    // conoce (grafico.module.css), y con él el polígono aparece, se queda
    // quieto al imprimir y respeta `prefers-reduced-motion` sin una regla más.
    const poligonos = container.querySelectorAll('polygon[data-testid="area"]')
    expect(poligonos).toHaveLength(2)
    for (const p of Array.from(poligonos)) {
      expect(p.getAttribute('fill')).toMatch(/^var\(--dato-[1-6]\)$/)
      expect(p.getAttribute('stroke')).toMatch(/^var\(--dato-[1-6]\)$/)
      // Siete vértices: uno por capacidad.
      expect((p.getAttribute('points') ?? '').trim().split(/\s+/)).toHaveLength(7)
    }
  })

  it('cada eje lleva su nombre, entero', () => {
    const { container } = render(<Radar datos={CAPACIDADES} alto={ALTO} ancho={ANCHO} />)
    const rotulos = Array.from(container.querySelectorAll('[data-testid="eje-rotulo"]'))
    expect(rotulos).toHaveLength(7)
    const nombres = rotulos.map(textoDeEje)
    for (const categoria of CAPACIDADES.categorias) {
      expect(nombres, `falta el eje "${categoria}"`).toContain(categoria)
    }
    // Y ninguno recortado: con este lienzo caben todos.
    expect(nombres.some((n) => n.includes('…'))).toBe(false)
  })

  it('la rejilla concéntrica va rotulada: sin escala, un polígono no dice cuánto', () => {
    const { container } = render(<Radar datos={CAPACIDADES} alto={ALTO} ancho={ANCHO} />)
    // Cinco anillos para una escala de 1 a 5, uno por entero.
    const anillos = Array.from(container.querySelectorAll('[data-testid="anillo-rotulo"]'))
    expect(anillos.map((a) => a.textContent)).toEqual(['1', '2', '3', '4', '5'])
    // El cero, en el centro: sin él una escala de 1 a 5 se lee como si el
    // centro valiera 1, y todas las distancias quedan infladas.
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('el color no es la única señal: cada serie trae su trazo y su marcador', () => {
    const { container } = render(<Radar datos={CAPACIDADES} alto={ALTO} ancho={ANCHO} />)
    const [primera, segunda] = Array.from(container.querySelectorAll('polygon[data-testid="area"]'))
    // La primera va continua; la segunda, discontinua.
    expect(primera.getAttribute('stroke-dasharray')).toBeNull()
    expect(segunda.getAttribute('stroke-dasharray')).toBeTruthy()

    // Y sus marcadores son formas distintas, no el mismo círculo de dos
    // colores: impreso en blanco y negro las dos series siguen separándose.
    const formaDe = (etiqueta: string) =>
      container.querySelector(`[data-testid="punto"][data-serie="${etiqueta}"]`)?.getAttribute('d')
    expect(formaDe('Promo Espacio')).not.toBe(formaDe('Promedio competencia'))
  })

  it('un marcador por vértice y serie, con la ranura que anima su entrada', () => {
    const { container } = render(<Radar datos={CAPACIDADES} alto={ALTO} ancho={ANCHO} />)
    const marcas = Array.from(container.querySelectorAll('[data-testid="punto"]'))
    expect(marcas).toHaveLength(14)
    // `--i` es lo que escalona la animación de entrada: sin ella los catorce
    // marcadores aparecen a la vez, que es un parpadeo, no un gráfico.
    expect((marcas[0] as HTMLElement).style.getPropertyValue('--i')).toBe('0')
  })
})

describe('los rótulos de los ejes — el defecto que motivó el gráfico', () => {
  it('se anclan según el cuadrante: a la derecha crecen hacia fuera, a la izquierda hacia dentro', () => {
    const { container } = render(<Radar datos={CAPACIDADES} alto={ALTO} ancho={ANCHO} />)
    const rotulos = Array.from(container.querySelectorAll('[data-testid="eje-rotulo"]'))
    const porNombre = new Map(rotulos.map((r) => [textoDeEje(r), r]))

    // El primer eje va a las 12 en punto: centrado sobre su vértice.
    expect(porNombre.get('Momento de compra')?.getAttribute('text-anchor')).toBe('middle')
    // El segundo cae a la derecha: el texto arranca en el vértice.
    expect(porNombre.get('Digital y programática')?.getAttribute('text-anchor')).toBe('start')
    // El último cae a la izquierda: el texto TERMINA en el vértice. Con
    // `start` —o con `middle`— se metía dentro del polígono.
    expect(porNombre.get('Escala inventario físico')?.getAttribute('text-anchor')).toBe('end')
  })

  it('ninguno se sale del lienzo', () => {
    const { container } = render(<Radar datos={CAPACIDADES} alto={ALTO} ancho={ANCHO} />)
    for (const rotulo of Array.from(container.querySelectorAll('[data-testid="eje-rotulo"]'))) {
      const caja = cajaDeRotulo(rotulo)
      expect(caja.izquierda, `"${textoDeEje(rotulo)}" se sale por la izquierda`).toBeGreaterThanOrEqual(0)
      expect(caja.derecha, `"${textoDeEje(rotulo)}" se sale por la derecha`).toBeLessThanOrEqual(ANCHO)
      expect(caja.arriba).toBeGreaterThanOrEqual(0)
      expect(caja.abajo).toBeLessThanOrEqual(ALTO)
    }
  })

  it.each([
    ['siete nombres largos', CAPACIDADES.categorias],
    // El tope del esquema: doce periodos. Con doce ejes los rótulos se acercan
    // entre sí más que con siete, que es donde un radar se rompe primero.
    ['doce ejes', Array.from({ length: 12 }, (_, i) => `Criterio ${i + 1}`)],
  ])('no se encabalgan entre ellos (%s)', (_caso, categorias) => {
    const { container } = render(
      <Radar
        datos={{ categorias, series: [{ etiqueta: 'x', valores: categorias.map(() => 3) }] }}
        alto={ALTO}
        ancho={ANCHO}
      />,
    )
    const cajas = Array.from(container.querySelectorAll('[data-testid="eje-rotulo"]')).map((r) => ({
      texto: textoDeEje(r),
      caja: cajaDeRotulo(r),
    }))
    for (let i = 0; i < cajas.length; i++) {
      for (let j = i + 1; j < cajas.length; j++) {
        expect(
          seSolapan(cajas[i].caja, cajas[j].caja),
          `"${cajas[i].texto}" se monta sobre "${cajas[j].texto}"`,
        ).toBe(false)
      }
    }
  })

  it('un nombre que no cabe se parte por palabras, no a media palabra', () => {
    const { container } = render(
      <Radar
        datos={{
          categorias: ['Madurez comercial digital de la operación', 'B', 'C'],
          series: [{ etiqueta: 'x', valores: [3, 2, 1] }],
        }}
        alto={ALTO}
        ancho={ANCHO}
      />,
    )
    const largo = Array.from(container.querySelectorAll('[data-testid="eje-rotulo"]')).find((r) =>
      textoDeEje(r).startsWith('Madurez'),
    )
    const lineas = Array.from(largo?.querySelectorAll('tspan') ?? []).map((l) => l.textContent ?? '')
    expect(lineas.length).toBeGreaterThan(1)
    // Cada línea empieza y acaba en palabra entera.
    for (const linea of lineas) {
      expect(linea).not.toMatch(/^\s|\s$/)
    }
    expect(lineas.join(' ')).toBe('Madurez comercial digital de la operación')
    // Las dos líneas comparten columna: cada `tspan` repite su `x`, porque un
    // salto de línea dentro de un SVG no existe.
    const xs = Array.from(largo?.querySelectorAll('tspan') ?? []).map((l) => l.getAttribute('x'))
    expect(new Set(xs).size).toBe(1)
  })

  it('un nombre imposible se recorta con puntos suspensivos en vez de invadir el dibujo', () => {
    const { container } = render(
      <Radar
        datos={{
          categorias: ['Supercalifragilisticoexpialidosisimplacablemente indivisible', 'B', 'C'],
          series: [{ etiqueta: 'x', valores: [3, 2, 1] }],
        }}
        alto={ALTO}
        ancho={ANCHO}
      />,
    )
    const textos = Array.from(container.querySelectorAll('[data-testid="eje-rotulo"]')).map(textoDeEje)
    expect(textos.some((t) => t.includes('…'))).toBe(true)
  })
})

describe('los datos raros no lo rompen', () => {
  it('aguanta un cero: el vértice se apoya en el centro y no desaparece el gráfico', () => {
    const { container } = render(
      <Radar
        datos={{
          categorias: ['a', 'b', 'c', 'd'],
          series: [{ etiqueta: 'Con hueco', valores: [0, 3, 0, 5] }],
        }}
        alto={ALTO}
        ancho={ANCHO}
      />,
    )
    const puntos = (container.querySelector('polygon[data-testid="area"]')?.getAttribute('points') ?? '')
      .trim()
      .split(/\s+/)
      .map((par) => par.split(',').map(Number))
    expect(puntos).toHaveLength(4)
    for (const [x, y] of puntos) {
      expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true)
    }
    // El valor 0 cae EXACTAMENTE en el centro del radar, que es donde nacen
    // los radios de la rejilla.
    const radio = container.querySelector('line')
    const centro = [Number(radio?.getAttribute('x1')), Number(radio?.getAttribute('y1'))]
    expect(centro[0]).toBe(ANCHO / 2)
    expect(puntos[0]).toEqual(centro)
    expect(puntos[2]).toEqual(centro)
  })

  it('una serie entera en cero dibuja la rejilla igual, sin dividir por cero', () => {
    const { container } = render(
      <Radar
        datos={{ categorias: ['a', 'b', 'c'], series: [{ etiqueta: 'Nulo', valores: [0, 0, 0] }] }}
        alto={ALTO}
        ancho={ANCHO}
      />,
    )
    expect(container.querySelector('svg')).not.toBeNull()
    const anillos = container.querySelectorAll('[data-testid="anillo-rotulo"]')
    expect(anillos.length).toBeGreaterThan(0)
    const puntos = container.querySelector('polygon[data-testid="area"]')?.getAttribute('points') ?? ''
    expect(puntos).not.toContain('NaN')
  })

  it('una serie con menos valores que categorías no lo rompe', () => {
    // El motor valida que cada serie traiga un valor por periodo, pero una
    // sección montada a mano en el editor puede quedarse a medias: el gráfico
    // no puede caerse por eso —ni inventar un valor—.
    const { container } = render(
      <Radar
        datos={{
          categorias: ['a', 'b', 'c', 'd', 'e'],
          series: [
            { etiqueta: 'Completa', valores: [1, 2, 3, 4, 5] },
            { etiqueta: 'A medias', valores: [4, 2] },
          ],
        }}
        alto={ALTO}
        ancho={ANCHO}
      />,
    )
    const poligonos = Array.from(container.querySelectorAll('polygon[data-testid="area"]'))
    expect(poligonos).toHaveLength(2)
    // Los dos polígonos tienen cinco vértices: los que faltan se apoyan en el
    // centro, que es donde vive el cero.
    for (const p of poligonos) {
      const pares = (p.getAttribute('points') ?? '').trim().split(/\s+/)
      expect(pares).toHaveLength(5)
      expect(pares.join(' ')).not.toContain('NaN')
    }
    expect(container.querySelectorAll('[data-testid="punto"]')).toHaveLength(10)
  })

  it('un solo eje no dibuja un polígono degenerado ni divide por cero', () => {
    const { container } = render(
      <Radar
        datos={{ categorias: ['único'], series: [{ etiqueta: 'x', valores: [3] }] }}
        alto={ALTO}
        ancho={ANCHO}
      />,
    )
    expect(container.querySelector('svg')?.innerHTML).not.toContain('NaN')
  })
})

describe('el radar dentro del despachador', () => {
  it('el tipo "radar" dibuja un radar, no unas barras', () => {
    const { container } = render(
      <Grafico
        grafico={
          {
            tipo: 'radar',
            titulo: 'Radar de capacidades',
            periodos: CAPACIDADES.categorias,
            series: CAPACIDADES.series,
          } as Parameters<typeof Grafico>[0]['grafico']
        }
      />,
    )
    expect(container.querySelectorAll('[data-testid="barra"]')).toHaveLength(0)
    expect(container.querySelectorAll('polygon[data-testid="area"]')).toHaveLength(2)
    expect(container.querySelectorAll('[data-testid="eje-rotulo"]')).toHaveLength(7)
  })

  it('la leyenda distingue las series por trazo, no solo por color', () => {
    // Si la muestra fuera un cuadradito de color por serie, quien no distingue
    // los dos colores tampoco podría decir cuál de los dos polígonos es cuál.
    const { container } = render(
      <Grafico
        grafico={
          {
            tipo: 'radar',
            periodos: CAPACIDADES.categorias,
            series: CAPACIDADES.series,
          } as Parameters<typeof Grafico>[0]['grafico']
        }
      />,
    )
    const muestras = Array.from(container.querySelectorAll('li span[data-forma]')).map((m) =>
      m.getAttribute('data-forma'),
    )
    expect(muestras).toEqual(['linea', 'linea-punteada'])
  })

  it('con dos "ejes" no se parte en facetas: un radar tiene una sola escala', () => {
    const { container } = render(
      <Grafico
        grafico={
          {
            tipo: 'radar',
            periodos: ['a', 'b', 'c'],
            series: [
              { etiqueta: 'Una', valores: [1, 2, 3] },
              { etiqueta: 'Otra', valores: [3, 2, 1], eje: 'derecho' },
            ],
          } as Parameters<typeof Grafico>[0]['grafico']
        }
      />,
    )
    expect(container.querySelectorAll('svg')).toHaveLength(1)
    expect(container.querySelectorAll('polygon[data-testid="area"]')).toHaveLength(2)
  })
})
