import { describe, it, expect } from 'vitest'
import { SQUADS_MKT_CORP, equiposPara, esEquipo, esSquadMktCorp } from './equipos'

describe('equipos que pueden ser responsables', () => {
  it('los squads de Mkt Corp son los seis de la foto vigente', () => {
    // Siete desde el 28-ago-2026: se suma 'Político-Electoral', la vertical de
    // Ángel Toledano. Era el único en 'Sin squad', y esa etiqueta describía una
    // carencia donde hay un encargo.
    expect(SQUADS_MKT_CORP).toHaveLength(7)
    expect(SQUADS_MKT_CORP).toContain('Político-Electoral')
    expect(SQUADS_MKT_CORP).toContain('Squad Paid y RRSS')
    expect(SQUADS_MKT_CORP).toContain('Squad Web y Contenidos')
    expect(SQUADS_MKT_CORP).toContain('RevOps & Analytics')
    expect(SQUADS_MKT_CORP).toContain('Sin squad')
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
    expect(esEquipo('Squad Paid y RRSS', equipos)).toBe(true)
    expect(esEquipo('NeraCode', equipos)).toBe(true)
    expect(esEquipo('Iris Múgica', equipos)).toBe(false)
    expect(esEquipo('', equipos)).toBe(false)
  })

  it('rechaza nombres históricos o inventados como squad vigente', () => {
    expect(esSquadMktCorp('Squad Paid y RRSS')).toBe(true)
    expect(esSquadMktCorp('Inbound Studio')).toBe(false)
    expect(esSquadMktCorp('')).toBe(false)
  })
})
