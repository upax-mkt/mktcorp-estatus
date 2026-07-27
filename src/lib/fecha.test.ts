import { describe, it, expect } from 'vitest'
import {
  fechaLarga, textoDiasDesde, textoProxima, diasHasta,
  fechaBreve, fechaBreveConAnio, fechaCompleta,
} from './fecha'

// Mediodía del 24 de julio de 2026 EN CDMX, escrito como instante absoluto
// (UTC-6). Si se escribiera '2026-07-24T12:00:00' sin zona, cada máquina lo
// leería en su hora local y el test mediría la zona del proceso, no el código.
const REFERENCIA = new Date('2026-07-24T18:00:00Z')

describe('formato de una fecha civil', () => {
  it('no se corre un día según la zona del proceso', () => {
    // El bug que motivó este módulo: en un servidor en UTC salía "19 ago" y
    // en una máquina en México "18 ago" para la misma fecha del dominio.
    expect(fechaBreve('2026-08-19')).toBe('19 ago')
    expect(fechaBreveConAnio('2026-08-19')).toBe('19 ago 26')
    expect(fechaCompleta('2026-08-19')).toBe('19 de agosto de 2026')
  })

  it('respeta el primer día del mes, el caso donde el corrimiento sería más visible', () => {
    expect(fechaBreve('2026-01-01')).toBe('1 ene')
    expect(fechaCompleta('2026-01-01')).toBe('1 de enero de 2026')
  })

  it('acepta también el ISO completo que devuelve la base de datos', () => {
    // La base guarda timestamps; los datos de ejemplo, fechas de solo día.
    // Las dos formas circulan por la app y ninguna puede dar "Invalid Date".
    expect(fechaBreve('2026-08-19T12:00:00.000Z')).toBe('19 ago')
    expect(fechaBreveConAnio('2026-08-19T12:00:00.000Z')).toBe('19 ago 26')
    expect(fechaCompleta('2026-08-19T12:00:00.000Z')).toBe('19 de agosto de 2026')
  })

  it('cuenta los días igual venga la fecha con hora o sin ella', () => {
    expect(diasHasta('2026-07-26T12:00:00.000Z', REFERENCIA)).toBe(2)
  })
})

describe('fechaLarga', () => {
  it('escribe día de la semana, día y mes en español', () => {
    expect(fechaLarga(REFERENCIA)).toBe('viernes, 24 de julio')
  })
})

describe('textoDiasDesde', () => {
  it('dice "sin sesión aún" cuando nunca hubo una', () => {
    expect(textoDiasDesde(null)).toBe('sin sesión aún')
  })

  it('trata 0 y 1 como hoy y ayer, no como "hace N días"', () => {
    expect(textoDiasDesde(0)).toBe('hoy')
    expect(textoDiasDesde(1)).toBe('ayer')
  })

  it('pluraliza a partir de dos días', () => {
    expect(textoDiasDesde(2)).toBe('hace 2 días')
    expect(textoDiasDesde(48)).toBe('hace 48 días')
  })
})

describe('diasHasta', () => {
  it('cuenta los días que faltan desde la referencia', () => {
    expect(diasHasta('2026-07-26', REFERENCIA)).toBe(2)
  })

  it('devuelve negativo si la fecha ya pasó', () => {
    expect(diasHasta('2026-07-20', REFERENCIA)).toBe(-4)
  })
})

describe('textoProxima', () => {
  it('avisa cuando no hay próxima sesión agendada', () => {
    expect(textoProxima(null, REFERENCIA)).toBe('sin próxima sesión agendada')
  })

  it('incluye el conteo de días cuando la sesión está por venir', () => {
    expect(textoProxima('2026-08-19', REFERENCIA)).toBe('próxima 19 ago · en 26 d')
  })

  it('omite el conteo cuando la fecha ya pasó (una sesión agendada que no se dio)', () => {
    expect(textoProxima('2026-07-20', REFERENCIA)).toBe('próxima 20 jul')
  })
})
