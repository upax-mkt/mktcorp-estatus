import { describe, it, expect, vi } from 'vitest'
import { decidir } from './decidir'
import { obtenerTema } from '@/temas'

const inv = { titulo: 'Performance', piezas: [{ tipo: 'cifra' as const, valor: '9.2', rotulo: 'Posición', delta: '-0.3' }] }

function clienteQueDevuelve(decision: unknown) {
  return { messages: { parse: vi.fn().mockResolvedValue({ parsed_output: decision, stop_reason: 'end_turn' }) } }
}

describe('decidir', () => {
  it('devuelve la decisión validada contra el esquema', async () => {
    const valida = { layout: 'kpis-fila-dos-columnas', titulo: 'Performance',
      kpis: [{ valor: '9.2', delta: '-0.3', rotulo: 'Posición' }], razon: 'una cifra con delta' }
    const d = await decidir(inv, obtenerTema('neracode'), clienteQueDevuelve(valida))
    expect(d.layout).toBe('kpis-fila-dos-columnas')
  })

  it('rechaza una decisión con estilo aunque el modelo la haya devuelto', async () => {
    const conColor = { layout: 'portada', titulo: 'x', razon: 'y', color: '#FF0000' }
    await expect(decidir(inv, obtenerTema('neracode'), clienteQueDevuelve(conColor))).rejects.toThrow()
  })

  it('lanza un error claro si falta la API (parsed_output nulo)', async () => {
    const cliente = { messages: { parse: vi.fn().mockResolvedValue({ parsed_output: null, stop_reason: 'refusal' }) } }
    await expect(decidir(inv, obtenerTema('neracode'), cliente)).rejects.toThrow(/no devolvió|refus/i)
  })
})
