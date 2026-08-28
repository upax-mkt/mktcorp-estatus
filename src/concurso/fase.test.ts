import { describe, expect, it } from 'vitest'
import { faseDelConcurso } from './fase'

describe('faseDelConcurso', () => {
  it('recibe propuestas hasta el 7 de septiembre a las 11:00 CDMX', () => {
    expect(faseDelConcurso(new Date('2026-09-07T10:59:59-06:00'))).toBe('recepcion')
  })

  it('abre galería y votación exactamente al cerrar propuestas', () => {
    expect(faseDelConcurso(new Date('2026-09-07T11:00:00-06:00'))).toBe('votacion')
  })

  it('cierra el pase el martes a las 18:00 y no publica resultado todavía', () => {
    expect(faseDelConcurso(new Date('2026-09-08T18:00:00-06:00'))).toBe('cerrado')
  })

  it('revela resultados en la ceremonia del miércoles a las 15:00', () => {
    expect(faseDelConcurso(new Date('2026-09-09T15:00:00-06:00'))).toBe('resultados')
  })
})
