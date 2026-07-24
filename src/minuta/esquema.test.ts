import { describe, it, expect } from 'vitest'
import { parsearMinuta, EsquemaMinuta } from './esquema'

const VALIDA = {
  objetivo: 'Revisar el avance del mes y destrabar los pendientes de portafolio.',
  temasYAcuerdos: [
    'Se revisó el avance de campañas de desarrollos especializados',
    'David presentará la nueva propuesta de valor la próxima semana',
  ],
  proximosPasos: 'El equipo retoma en la siguiente sesión mensual con los pendientes cerrados.',
  acuerdosPropuestos: [
    {
      que: 'Presentar nuevas palabras clave y segmentos para campañas',
      responsable: 'Fernando Borges',
      squad: 'Performance',
      prioridad: 'alta',
      fechaCompromiso: '2026-08-01',
    },
    {
      que: 'Construir la nueva propuesta de valor',
      responsable: 'por asignar',
      prioridad: 'media',
      fechaCompromiso: null,
    },
  ],
}

describe('parsearMinuta', () => {
  it('acepta una minuta bien formada', () => {
    expect(parsearMinuta(VALIDA).objetivo).toContain('Revisar el avance')
  })

  it('acepta un acuerdo sin squad (campo opcional)', () => {
    const sinSquad = parsearMinuta(VALIDA).acuerdosPropuestos[1]
    expect(sinSquad.squad).toBeUndefined()
  })

  it('acepta fechaCompromiso null explícito', () => {
    expect(parsearMinuta(VALIDA).acuerdosPropuestos[1].fechaCompromiso).toBeNull()
  })

  it('rechaza una fechaCompromiso que no viene en formato ISO', () => {
    const invalida = {
      ...VALIDA,
      acuerdosPropuestos: [{ ...VALIDA.acuerdosPropuestos[0], fechaCompromiso: '1 de agosto' }],
    }
    expect(() => parsearMinuta(invalida)).toThrow()
  })

  it('rechaza sin objetivo', () => {
    const sinObjetivo: Record<string, unknown> = { ...VALIDA }
    delete sinObjetivo.objetivo
    expect(() => parsearMinuta(sinObjetivo)).toThrow()
  })

  it('rechaza temasYAcuerdos vacío', () => {
    expect(() => parsearMinuta({ ...VALIDA, temasYAcuerdos: [] })).toThrow()
  })

  it('rechaza una clave extra (candado strict)', () => {
    expect(() => parsearMinuta({ ...VALIDA, colorDeMarca: '#FF0000' })).toThrow()
  })

  it('rechaza markup HTML colado en un acuerdo (TextoPlano reutilizado)', () => {
    const conMarkup = {
      ...VALIDA,
      acuerdosPropuestos: [{ ...VALIDA.acuerdosPropuestos[0], que: '<b>Presentar</b> keywords' }],
    }
    expect(() => parsearMinuta(conMarkup)).toThrow()
  })

  it('rechaza Markdown colado en el objetivo (TextoPlano reutilizado)', () => {
    expect(() => parsearMinuta({ ...VALIDA, objetivo: '**Revisar** el avance del mes' })).toThrow()
  })

  it('acepta hasta 20 acuerdos propuestos', () => {
    const veinte = Array.from({ length: 20 }, (_, i) => ({ ...VALIDA.acuerdosPropuestos[0], que: `Acuerdo ${i}` }))
    expect(EsquemaMinuta.safeParse({ ...VALIDA, acuerdosPropuestos: veinte }).success).toBe(true)
  })

  it('rechaza más de 20 acuerdos propuestos', () => {
    const veintiuno = Array.from({ length: 21 }, (_, i) => ({ ...VALIDA.acuerdosPropuestos[0], que: `Acuerdo ${i}` }))
    expect(EsquemaMinuta.safeParse({ ...VALIDA, acuerdosPropuestos: veintiuno }).success).toBe(false)
  })
})
