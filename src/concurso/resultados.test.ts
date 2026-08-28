import { describe, expect, it } from 'vitest'
import { calificacionJurado, puntajeFinal } from './resultados'

describe('calificación del jurado', () => {
  it('aplica 30/25/20/25 sobre valores de 0 a 10', () => {
    expect(calificacionJurado({ creatividad: 10, cultura: 8, viabilidad: 5, atractivo: 9 }))
      .toBe(8.25)
  })

  it('combina 70% del porcentaje de votos y 30% del jurado normalizado', () => {
    expect(puntajeFinal({ votos: 12, votosTotales: 24, jurado: 8 })).toBe(59)
  })

  it('cero votos totales no mejora el resultado', () => {
    expect(puntajeFinal({ votos: 0, votosTotales: 0, jurado: 8 })).toBe(24)
  })
})
