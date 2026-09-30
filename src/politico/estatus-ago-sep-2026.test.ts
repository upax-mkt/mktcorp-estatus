import { describe, it, expect } from 'vitest'
import {
  OPORTUNIDADES,
  embudo,
  ganado,
  pipelineAbierto,
  pipelinePorUdn,
  totalDe,
  REUNIONES,
  INSTITUTOS,
} from './estatus-ago-sep-2026'

/**
 * LAS CUENTAS DEL ESTATUS POLÍTICO, fijadas contra el deck de Ángel.
 *
 * El deck traía la fila de Promo Espacio sumada mal ($900,000 en vez de
 * $1,700,000). Estas pruebas existen para que un número de la pestaña nunca
 * vuelva a escribirse a mano: si alguien cambia una fila, los totales se
 * mueven solos y aquí se ve.
 */
describe('estatus político — los totales salen de las filas', () => {
  it('el pipeline abierto, con la corrección de HubSpot del 30-sep: $5,901,774', () => {
    // El deck daba $5,701,774 abiertos + $200,000 ganados. En HubSpot los $200,000
    // de Mónica Sandoval quedaron en Evaluando: son pipeline, no ganado.
    expect(pipelineAbierto()).toBe(5_901_774)
  })

  it('no hay ganado al 30-sep-2026', () => {
    expect(ganado()).toBe(0)
  })

  it('por UDN: Research Land, Promo Espacio (corregido a $1.7M), Marketing United y Mexa', () => {
    expect(pipelinePorUdn()).toEqual([
      { udn: 'Research Land', monto: 2_953_454 },
      { udn: 'Promo Espacio', monto: 1_700_000 },
      { udn: 'Marketing United', monto: 1_058_320 },
      { udn: 'Mexa Creativa', monto: 190_000 },
    ])
  })

  it('la suma por UDN es el mismo pipeline abierto, sin redondeos que se pierdan', () => {
    const suma = pipelinePorUdn().reduce((n, f) => n + f.monto, 0)
    expect(suma).toBe(pipelineAbierto())
  })

  it('Guerrero suma lo mismo que su negocio principal en HubSpot', () => {
    const guerrero = OPORTUNIDADES.find((o) => o.cliente.includes('Guerrero'))
    expect(guerrero && totalDe(guerrero)).toBe(1_807_980)
  })
})

describe('estatus político — el embudo baja y no se inventa', () => {
  it('19 reuniones → 9 oportunidades → 7 en evaluación, sin un «Ganado 0» al final', () => {
    expect(embudo().map((e) => e.valor)).toEqual([19, 9, 7])
  })

  it('el paso «Ganado» vuelve solo si hay un ganado', () => {
    const conGanado = OPORTUNIDADES.map((o, i) => (i === 0 ? { ...o, etapa: 'ganado' as const } : o))
    expect(embudo(conGanado).map((e) => e.etapa)).toContain('Ganado')
  })

  it('cada paso es menor o igual que el anterior', () => {
    const valores = embudo().map((e) => e.valor)
    for (let i = 1; i < valores.length; i++) expect(valores[i]).toBeLessThanOrEqual(valores[i - 1])
  })

  it('las reuniones realizadas son las de credenciales más las de acercamiento', () => {
    expect(REUNIONES.credenciales + REUNIONES.acercamiento).toBe(REUNIONES.realizadas)
  })

  it('son nueve institutos, seis con credenciales y tres con acercamiento', () => {
    expect(INSTITUTOS).toHaveLength(9)
    expect(INSTITUTOS.filter((i) => i.paso === 'credenciales')).toHaveLength(6)
  })
})
