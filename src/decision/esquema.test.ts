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
