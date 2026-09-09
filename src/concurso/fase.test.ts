import { describe, expect, it } from 'vitest'
import { faseDelConcurso } from './fase'
import { FECHAS_CONCURSO } from './config'

describe('faseDelConcurso', () => {
  it('recibe propuestas hasta el 9 de septiembre a las 13:00 CDMX', () => {
    expect(faseDelConcurso(new Date('2026-09-09T12:59:59-06:00'))).toBe('recepcion')
  })

  it('sigue en recepción el lunes 7, que era el cierre viejo (prórroga de Franco)', () => {
    expect(faseDelConcurso(new Date('2026-09-07T11:00:00-06:00'))).toBe('recepcion')
    expect(faseDelConcurso(new Date('2026-09-08T18:00:00-06:00'))).toBe('recepcion')
  })

  /**
   * Y sigue abierta a las 10:00 del miércoles, que fue el cierre que se movió
   * el propio día (segunda prórroga, de César): a esa hora se cerró sola con
   * gente todavía subiendo.
   */
  it('sigue en recepción a las 10:00 del miércoles, tras la segunda prórroga', () => {
    expect(faseDelConcurso(new Date('2026-09-09T10:00:00-06:00'))).toBe('recepcion')
  })

  it('abre galería y votación exactamente al cerrar propuestas', () => {
    expect(faseDelConcurso(new Date('2026-09-09T13:00:00-06:00'))).toBe('votacion')
    expect(faseDelConcurso(new Date('2026-09-09T14:59:59-06:00'))).toBe('votacion')
  })

  /**
   * SE VOTA DENTRO DE LA PREMIACIÓN (César, 9-sep-2026). El pase ya no cierra
   * cuando la sala se reúne: sigue una hora más, hasta las 16:00. Si esto
   * volviera a cerrar a las 15:00, el voto moriría justo cuando todo el mundo
   * está mirando la pantalla.
   */
  it('mantiene el pase abierto durante la premiación, hasta las 16:00', () => {
    expect(faseDelConcurso(new Date('2026-09-09T15:00:00-06:00'))).toBe('votacion')
    expect(faseDelConcurso(new Date('2026-09-09T15:59:59-06:00'))).toBe('votacion')
  })

  it('revela resultados al cerrarse el pase, a las 16:00', () => {
    expect(faseDelConcurso(new Date('2026-09-09T16:00:00-06:00'))).toBe('resultados')
  })

  /**
   * NO HAY VENTANA MUERTA, Y SIGUE SIENDO A PROPÓSITO —aunque ya no por la
   * razón de antes—. Cuando el pase cerraba a la vez que empezaba la ceremonia,
   * la fase `cerrado` duraba cero porque las dos fechas eran idénticas; ahora
   * dura cero porque el pase cierra DESPUÉS. La invariante que importa no es
   * que las fechas coincidan, sino que de votar se pase directo al ganador, así
   * que se comprueba eso y no la igualdad.
   */
  it('nunca pasa por la fase intermedia, con estas fechas', () => {
    expect(FECHAS_CONCURSO.cierreVotacion.getTime()).toBeGreaterThanOrEqual(FECHAS_CONCURSO.ceremonia.getTime())
  })

  /**
   * Lo mismo, pero barriendo el tramo entero en vez de un instante suelto: si
   * alguien reabre el hueco, la premiación enseñaría una cuenta regresiva en
   * lugar del ganador.
   */
  it('no deja ningún hueco cerrado entre el voto y el resultado', () => {
    const arranque = FECHAS_CONCURSO.cierrePropuestas.getTime()
    for (let minuto = 0; minuto <= 60 * 4; minuto += 5) {
      const instante = new Date(arranque + minuto * 60_000)
      expect(faseDelConcurso(instante), instante.toISOString()).not.toBe('cerrado')
    }
  })
})
