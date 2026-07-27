import { describe, it, expect } from 'vitest'
import { sanearDecision } from './sanear'
import type { DecisionSlide } from '@/decision/esquema'

function decisionCon(kpis: DecisionSlide['kpis']): DecisionSlide {
  return {
    layout: 'kpis-fila-dos-columnas',
    titulo: 'El tráfico cae, pero no por deterioro',
    kpis,
    razon: 'porque sí',
  }
}

describe('sanearDecision', () => {
  it('separa el delta que la IA coló dentro del rótulo', () => {
    // Artefacto visto en producción: el modelo serializó mal el objeto y metió
    // el par delta dentro de la cadena del rótulo.
    const sucia = decisionCon([{ valor: '29k', rotulo: "Impresiones','delta':'-16%" }])
    const limpia = sanearDecision(sucia)
    expect(limpia.kpis).toEqual([{ valor: '29k', rotulo: 'Impresiones', delta: '-16%' }])
  })

  it('reconoce las otras formas en que se cuela el campo', () => {
    const variantes = [
      'Impresiones", "delta": "-16%"',
      'Impresiones, delta: -16%',
      'Impresiones delta=-16%',
    ]
    for (const rotulo of variantes) {
      const limpia = sanearDecision(decisionCon([{ valor: '29k', rotulo }]))
      expect(limpia.kpis?.[0].rotulo).toBe('Impresiones')
      expect(limpia.kpis?.[0].delta).toBe('-16%')
    }
  })

  it('respeta un delta que ya venía bien puesto', () => {
    const buena = decisionCon([{ valor: '29k', rotulo: 'Impresiones', delta: '-16%' }])
    expect(sanearDecision(buena)).toEqual(buena)
  })

  it('no pisa el delta legítimo si además venía basura en el rótulo', () => {
    const mezcla = decisionCon([{ valor: '29k', rotulo: "Impresiones','delta':'-99%", delta: '-16%' }])
    const limpia = sanearDecision(mezcla)
    expect(limpia.kpis?.[0].rotulo).toBe('Impresiones')
    expect(limpia.kpis?.[0].delta).toBe('-16%')
  })

  it('deja en paz un rótulo que solo menciona una variación entre paréntesis', () => {
    // Esto es redacción legítima, no un campo fugado: no se toca.
    const legitima = decisionCon([{ valor: '29k', rotulo: 'Impresiones (vs. mayo)' }])
    expect(sanearDecision(legitima)).toEqual(legitima)
  })

  it('deja en paz un rótulo que usa la palabra delta como texto', () => {
    const legitima = decisionCon([{ valor: '29k', rotulo: 'Delta contra el trimestre' }])
    expect(sanearDecision(legitima)).toEqual(legitima)
  })

  it('limpia comillas y comas colgantes que quedan al final de un rótulo', () => {
    const sucia = decisionCon([{ valor: '29k', rotulo: "Impresiones'," }])
    expect(sanearDecision(sucia).kpis?.[0].rotulo).toBe('Impresiones')
  })

  it('no altera una decisión sin KPIs', () => {
    const sinKpis: DecisionSlide = { layout: 'portada', titulo: 'Estatus', razon: 'portada' }
    expect(sanearDecision(sinKpis)).toEqual(sinKpis)
  })

  it('descarta un delta fugado que quedaría vacío', () => {
    const sucia = decisionCon([{ valor: '29k', rotulo: "Impresiones','delta':''" }])
    const limpia = sanearDecision(sucia)
    expect(limpia.kpis?.[0].rotulo).toBe('Impresiones')
    expect(limpia.kpis?.[0].delta).toBeUndefined()
  })
})
