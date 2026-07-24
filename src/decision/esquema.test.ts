import { describe, it, expect } from 'vitest'
import { parsearDecision, esDecisionValida } from './esquema'

const VALIDA = {
  layout: 'kpis-fila-dos-columnas',
  titulo: 'Performance del sitio web',
  kpis: [
    { valor: '9.2', delta: '-0.3', rotulo: 'Posición media' },
    { valor: '29k', delta: '-16%', rotulo: 'Impresiones' },
  ],
  columnas: [
    { titulo: 'Principales hallazgos', puntos: ['No es un deterioro generalizado'] },
    { titulo: 'Acciones prioritarias', puntos: ['Reforzar contenido'] },
  ],
  razon: '4 cifras con delta + 2 bloques de análisis',
}

describe('parsearDecision', () => {
  it('acepta una decisión bien formada', () => {
    expect(parsearDecision(VALIDA).titulo).toBe('Performance del sitio web')
  })

  it('rechaza un layout que no está en el catálogo', () => {
    expect(() => parsearDecision({ ...VALIDA, layout: 'lo-que-se-me-ocurrio' })).toThrow()
  })

  it('rechaza una decisión sin razón', () => {
    const { razon, ...sinRazon } = VALIDA
    expect(() => parsearDecision(sinRazon)).toThrow()
  })

  it('rechaza estilos: la IA no puede mandar color', () => {
    expect(() => parsearDecision({ ...VALIDA, color: '#FF0000' })).toThrow()
  })

  it('rechaza estilos: la IA no puede mandar CSS ni HTML', () => {
    expect(() => parsearDecision({ ...VALIDA, css: 'p{color:red}' })).toThrow()
    expect(() => parsearDecision({ ...VALIDA, html: '<b>x</b>' })).toThrow()
  })

  it('rechaza un KPI sin rótulo', () => {
    expect(() => parsearDecision({ ...VALIDA, kpis: [{ valor: '9.2' }] })).toThrow()
  })

  it('acepta un gráfico con tipo del catálogo', () => {
    const conGrafico = { ...VALIDA, grafico: { tipo: 'barras-comparadas', serie: 'trafico_mensual' } }
    expect(parsearDecision(conGrafico).grafico?.tipo).toBe('barras-comparadas')
  })

  it('rechaza un tipo de gráfico inventado', () => {
    expect(() => parsearDecision({ ...VALIDA, grafico: { tipo: 'burbujas-3d', serie: 'x' } })).toThrow()
  })
})

describe('esDecisionValida', () => {
  it('devuelve true o false sin lanzar', () => {
    expect(esDecisionValida(VALIDA)).toBe(true)
    expect(esDecisionValida({ layout: 'portada' })).toBe(false)
  })
})

describe('TextoPlano — cierre de la rendija de markup/estilo en cadenas', () => {
  it('rechaza markup HTML en titulo', () => {
    expect(() =>
      parsearDecision({ ...VALIDA, titulo: '<div style="color:#FF0000">Resultados</div>' })
    ).toThrow()
  })

  it('rechaza markup HTML en un punto de columnas', () => {
    expect(() =>
      parsearDecision({
        ...VALIDA,
        columnas: [
          {
            titulo: 'Principales hallazgos',
            puntos: ['<span style="color:red">Ojo aquí</span>'],
          },
        ],
      })
    ).toThrow()
  })

  it('rechaza style= en el rótulo de un KPI', () => {
    expect(() =>
      parsearDecision({
        ...VALIDA,
        kpis: [{ valor: '9.2', delta: '-0.3', rotulo: 'Posición media style="color:red"' }],
      })
    ).toThrow()
  })

  it('rechaza CSS inline en cuerpo', () => {
    expect(() =>
      parsearDecision({ ...VALIDA, cuerpo: ['Texto normal', 'background: #FFFFFF; color: red;'] })
    ).toThrow()
  })

  it('rechaza una imagen con esquema javascript:', () => {
    expect(() =>
      parsearDecision({ ...VALIDA, imagen: 'javascript:alert(1)' })
    ).toThrow()
  })

  it('rechaza una imagen con esquema data:', () => {
    expect(() =>
      parsearDecision({ ...VALIDA, imagen: 'data:text/html;base64,PHNjcmlwdD4=' })
    ).toThrow()
  })

  it('rechaza una imagen con esquema file:', () => {
    expect(() => parsearDecision({ ...VALIDA, imagen: 'file:///etc/passwd' })).toThrow()
  })

  it('acepta una imagen como ruta relativa o URL https', () => {
    expect(
      esDecisionValida({ ...VALIDA, imagen: '/assets/grafico-1.png' })
    ).toBe(true)
    expect(
      esDecisionValida({ ...VALIDA, imagen: 'https://cdn.upax.com.mx/grafico-1.png' })
    ).toBe(true)
  })

  it('acepta contenido legítimo del proyecto: números, deltas, moneda, flechas y frases con acentos', () => {
    const decisionLegitima = {
      layout: 'comparativa-periodos',
      titulo: 'Comparativa de resultados: Mayo vs Junio',
      subtitulo: 'Modelo de staff augmentation, SQL → Opp',
      kpis: [
        { valor: '9.2', delta: '-0.3', rotulo: 'Posición media' },
        { valor: '$4.2 MDP', delta: '-16%', rotulo: 'Facturación, mes vs mes' },
      ],
      columnas: [
        {
          titulo: 'Principales hallazgos',
          puntos: [
            'No es un deterioro generalizado',
            'El staff augmentation creció 12%, con una caída en SQL → Opp',
          ],
        },
      ],
      cuerpo: ['Este trimestre, ingresos de $4.2 MDP con un delta de -16% vs mayo.'],
      grafico: { tipo: 'barras-comparadas', serie: 'trafico_mensual' },
      razon: '4 cifras con delta + 2 bloques de análisis, comparando Mayo vs Junio',
    }

    expect(esDecisionValida(decisionLegitima)).toBe(true)
    expect(parsearDecision(decisionLegitima).titulo).toBe('Comparativa de resultados: Mayo vs Junio')
  })
})
