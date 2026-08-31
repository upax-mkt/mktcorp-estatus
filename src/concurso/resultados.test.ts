import { describe, expect, it } from 'vitest'
import { puntajeFinal } from './resultados'

/**
 * SIN JURADO: EL RESULTADO ES EL VOTO DEL EQUIPO (31-ago-2026).
 *
 * Franco: *«hoy definimos que no habrá jurado, solo voto del equipo»*. Antes
 * era 70% voto y 30% de una rúbrica de cuatro criterios; esa mitad se retiró
 * entera, no se dejó apagada.
 */
describe('puntajeFinal', () => {
  it('es el porcentaje de los votos emitidos', () => {
    expect(puntajeFinal({ votos: 12, votosTotales: 24 })).toBe(50)
    expect(puntajeFinal({ votos: 6, votosTotales: 24 })).toBe(25)
  })

  it('la más votada gana, sin nada que la corrija', () => {
    const a = puntajeFinal({ votos: 9, votosTotales: 20 })
    const b = puntajeFinal({ votos: 8, votosTotales: 20 })
    expect(a).toBeGreaterThan(b)
  })

  /** Antes de que vote nadie, todas empatan a cero: nada que inventar. */
  it('sin votos emitidos, cero', () => {
    expect(puntajeFinal({ votos: 0, votosTotales: 0 })).toBe(0)
    expect(puntajeFinal({ votos: 3, votosTotales: 0 })).toBe(0)
  })

  it('con todos los votos, cien', () => {
    expect(puntajeFinal({ votos: 23, votosTotales: 23 })).toBe(100)
  })
})
