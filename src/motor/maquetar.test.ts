import { describe, it, expect, vi } from 'vitest'
import { maquetarItem } from './maquetar'
import { obtenerTema } from '@/temas'

const crudo = { titulo: 'Performance', cifras: [{ valor: '9.2', rotulo: 'Posición', delta: '-0.3' }] }
const valida = { layout: 'kpis-fila-dos-columnas', titulo: 'Performance',
  kpis: [{ valor: '9.2', delta: '-0.3', rotulo: 'Posición' }], razon: 'r' }
const invalida = { layout: 'matriz-estados', titulo: 'Performance', razon: 'r' }

describe('maquetarItem', () => {
  it('reintenta cuando la primera decisión no valida y acepta la segunda', async () => {
    const parse = vi.fn()
      .mockResolvedValueOnce({ parsed_output: invalida })
      .mockResolvedValueOnce({ parsed_output: valida })
    const r = await maquetarItem(crudo, obtenerTema('neracode'), { messages: { parse } })
    expect(r.degradado).toBe(false)
    expect(r.decision.layout).toBe('kpis-fila-dos-columnas')
    expect(parse).toHaveBeenCalledTimes(2)
  })

  it('degrada al layout seguro si ambos intentos fallan', async () => {
    const parse = vi.fn().mockResolvedValue({ parsed_output: invalida })
    const r = await maquetarItem(crudo, obtenerTema('neracode'), { messages: { parse } })
    expect(r.degradado).toBe(true)
    expect(r.motivo).toMatch(/matriz-estados|no implementado/i)
  })
})
