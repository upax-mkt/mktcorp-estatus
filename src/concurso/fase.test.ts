import { describe, expect, it } from 'vitest'
import { faseDelConcurso } from './fase'
import { FECHAS_CONCURSO } from './config'

describe('faseDelConcurso', () => {
  it('recibe propuestas hasta el 9 de septiembre a las 10:00 CDMX', () => {
    expect(faseDelConcurso(new Date('2026-09-09T09:59:59-06:00'))).toBe('recepcion')
  })

  it('sigue en recepción el lunes 7, que era el cierre viejo (prórroga de Franco)', () => {
    expect(faseDelConcurso(new Date('2026-09-07T11:00:00-06:00'))).toBe('recepcion')
    expect(faseDelConcurso(new Date('2026-09-08T18:00:00-06:00'))).toBe('recepcion')
  })

  it('abre galería y votación exactamente al cerrar propuestas', () => {
    expect(faseDelConcurso(new Date('2026-09-09T10:00:00-06:00'))).toBe('votacion')
    expect(faseDelConcurso(new Date('2026-09-09T14:59:59-06:00'))).toBe('votacion')
  })

  /**
   * NO HAY VENTANA MUERTA, Y ES A PROPÓSITO. El pase cierra en el mismo
   * instante en que arranca la premiación en vivo, así que la fase `cerrado`
   * dura cero: de votar se pasa directo a ver al ganador. Si alguien vuelve a
   * separar las dos fechas, este test lo dice en voz alta.
   */
  it('revela resultados en la ceremonia del miércoles a las 15:00, sin fase intermedia', () => {
    expect(FECHAS_CONCURSO.cierreVotacion.getTime()).toBe(FECHAS_CONCURSO.ceremonia.getTime())
    expect(faseDelConcurso(new Date('2026-09-09T15:00:00-06:00'))).toBe('resultados')
  })
})
