import { describe, it, expect } from 'vitest'
import { parsearMinuta, EsquemaMinuta } from './esquema'

const VALIDA = {
  // Un texto por bloque del molde, en su orden. Los nombres de los bloques no
  // están aquí a propósito: los pone el equipo al editar el molde, y por eso
  // el esquema solo puede fijar cuántos son y que vengan en orden.
  bloques: [
    'Revisar el avance del mes con NeraCode.',
    'Se revisó el avance de campañas de desarrollos especializados.',
    'David presentará la nueva propuesta de valor la próxima semana.',
    'Se vuelve a revisar en la sesión de agosto.',
  ],
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
    expect(parsearMinuta(VALIDA).bloques[0]).toContain('Revisar el avance')
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

  it('rechaza sin bloques', () => {
    const sinBloques: Record<string, unknown> = { ...VALIDA }
    delete sinBloques.bloques
    expect(() => parsearMinuta(sinBloques)).toThrow()
  })

  it('rechaza la lista de bloques vacía', () => {
    expect(() => parsearMinuta({ ...VALIDA, bloques: [] })).toThrow()
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

  it('rechaza Markdown colado en un bloque (TextoPlano reutilizado)', () => {
    expect(() => parsearMinuta({ ...VALIDA, bloques: ['**Revisar** el avance del mes'] })).toThrow()
  })

  it('acepta hasta 8 acuerdos, y rechaza el noveno', () => {
    // Ocho y no veinte: con veinte salieron veinte, y catorce iban sin dueño.
    // Eso no es una lista de compromisos, es la reunión transcrita en filas.
    const uno = VALIDA.acuerdosPropuestos[0]
    expect(EsquemaMinuta.safeParse({ ...VALIDA, acuerdosPropuestos: Array(8).fill(uno) }).success).toBe(true)
    expect(EsquemaMinuta.safeParse({ ...VALIDA, acuerdosPropuestos: Array(9).fill(uno) }).success).toBe(false)
  })

  it('rechaza un bloque que se convirtió en un acta paralela', () => {
    // El tope de largo es lo único que de verdad frena: con la instrucción
    // sola, el modelo devolvió viñetas de párrafo entero.
    const kilometrico = 'x'.repeat(901)
    expect(EsquemaMinuta.safeParse({ ...VALIDA, bloques: [kilometrico] }).success).toBe(false)
  })

  it('rechaza más de 20 acuerdos propuestos', () => {
    const veintiuno = Array.from({ length: 21 }, (_, i) => ({ ...VALIDA.acuerdosPropuestos[0], que: `Acuerdo ${i}` }))
    expect(EsquemaMinuta.safeParse({ ...VALIDA, acuerdosPropuestos: veintiuno }).success).toBe(false)
  })
})
