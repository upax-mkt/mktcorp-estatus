import { describe, expect, it } from 'vitest'
import { FECHAS_CONCURSO } from './config'
import { diaSemana, diaYFecha, fechaCorta, fechaLarga, hora, horaCompacta, mismoDia, ventanaVotacion } from './textos'

/**
 * Se comprueba en CDMX y también desde un instante UTC, porque el servidor de
 * Vercel corre en UTC: si el formateo se hiciera con la hora local del proceso,
 * el cierre de las 13:00 se anunciaría como las 19:00 en producción y como las
 * 13:00 en la laptop de quien lo probó. Es el mismo bug de zona que ya mordió
 * en las reuniones.
 */
describe('los textos de fecha del concurso', () => {
  const { cierrePropuestas, cierreVotacion, ceremonia } = FECHAS_CONCURSO

  it('dice la hora de pared de CDMX, no la del proceso', () => {
    expect(hora(cierrePropuestas)).toBe('13:00')
    expect(hora(cierreVotacion)).toBe('15:00')
    // El mismo instante escrito en UTC: 13:00 CDMX = 19:00 UTC.
    expect(hora(new Date('2026-09-09T19:00:00Z'))).toBe('13:00')
  })

  it('escribe el día y el mes en español', () => {
    expect(fechaLarga(cierrePropuestas)).toBe('9 de septiembre')
    expect(diaSemana(cierrePropuestas)).toBe('miércoles')
    expect(diaYFecha(cierrePropuestas)).toBe('miércoles 9 de septiembre')
    expect(fechaCorta(ceremonia)).toBe('9 SEP')
  })

  it('quita los minutos en punto solo en la etiqueta compacta', () => {
    expect(horaCompacta(ceremonia)).toBe('15')
    expect(horaCompacta(new Date('2026-09-09T10:30:00-06:00'))).toBe('10:30')
  })

  it('reconoce el mismo día civil aunque cambie la hora', () => {
    expect(mismoDia(cierrePropuestas, cierreVotacion)).toBe(true)
    expect(mismoDia(cierrePropuestas, new Date('2026-09-08T10:00:00-06:00'))).toBe(false)
  })

  it('resume la ventana de votación de un solo día en una frase', () => {
    expect(ventanaVotacion()).toBe('ese mismo día de 13:00 a 15:00')
  })
})
