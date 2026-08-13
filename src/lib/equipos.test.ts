import { describe, it, expect } from 'vitest'
import { SQUADS_MKT_CORP, equiposPara, esEquipo } from './equipos'

describe('equipos que pueden ser responsables', () => {
  it('los squads de Mkt Corp son los seis de la foto vigente', () => {
    expect(SQUADS_MKT_CORP).toHaveLength(6)
    expect(SQUADS_MKT_CORP).toContain('Inbound Studio')
    expect(SQUADS_MKT_CORP).toContain('RevOps & Analytics')
    expect(SQUADS_MKT_CORP).toContain('BD Político')
  })

  it('las UDN salen de las salas vivas, no de una lista escrita a mano', () => {
    const { udns } = equiposPara([
      { nombre: 'NeraCode', activa: true },
      { nombre: 'Zeus', activa: false },
    ])
    expect(udns).toEqual(['NeraCode'])
  })

  it('una sala en pausa no se ofrece: no se le encarga trabajo nuevo a quien está en freeze', () => {
    const { udns } = equiposPara([{ nombre: 'Zeus', activa: false }])
    expect(udns).toEqual([])
  })

  /**
   * Esto es lo que permite reabrir el editor en el control correcto sin
   * guardar una columna que diga "esto es un equipo": el nombre se compara
   * contra la lista, que es determinista.
   */
  it('reconoce un nombre guardado como equipo, y no confunde a una persona', () => {
    const equipos = equiposPara([{ nombre: 'NeraCode', activa: true }])
    expect(esEquipo('Inbound Studio', equipos)).toBe(true)
    expect(esEquipo('NeraCode', equipos)).toBe(true)
    expect(esEquipo('Iris Múgica', equipos)).toBe(false)
    expect(esEquipo('', equipos)).toBe(false)
  })
})
