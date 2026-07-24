import { describe, it, expect, vi } from 'vitest'
import { maquetarItem, maquetarSesion } from './maquetar'
import { obtenerTema } from '@/temas'
import * as normalizarMod from './normalizar'

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

  it('degrada al layout seguro si ambos intentos fallan la validación', async () => {
    const parse = vi.fn().mockResolvedValue({ parsed_output: invalida })
    const r = await maquetarItem(crudo, obtenerTema('neracode'), { messages: { parse } })
    expect(r.degradado).toBe(true)
    expect(r.motivo).toMatch(/matriz-estados|no implementado/i)
  })

  it('degrada sin propagar si decidir() lanza en ambos intentos', async () => {
    const parse = vi.fn().mockResolvedValue({ parsed_output: null, stop_reason: 'refusal' })
    const r = await maquetarItem(crudo, obtenerTema('neracode'), { messages: { parse } })
    expect(parse).toHaveBeenCalledTimes(2)
    expect(r.degradado).toBe(true)
    expect(r.motivo).toMatch(/el modelo no produjo una decisión válida/i)
    expect(r.decision.titulo).toBe('Performance')
  })

  it('reintenta cuando decidir() lanza en el primer intento y acepta la segunda', async () => {
    const parse = vi.fn()
      .mockResolvedValueOnce({ parsed_output: null, stop_reason: 'refusal' })
      .mockResolvedValueOnce({ parsed_output: valida })
    const r = await maquetarItem(crudo, obtenerTema('neracode'), { messages: { parse } })
    expect(parse).toHaveBeenCalledTimes(2)
    expect(r.degradado).toBe(false)
    expect(r.decision.layout).toBe('kpis-fila-dos-columnas')
  })
})

describe('maquetarSesion', () => {
  it('devuelve un ResultadoMaquetacion por item, en orden, sin paralelismo', async () => {
    const parse = vi.fn().mockResolvedValue({ parsed_output: valida })
    const items = [crudo, { titulo: 'Otro', texto: 'algo' }]
    const resultados = await maquetarSesion(items, 'neracode', { messages: { parse } })
    expect(resultados).toHaveLength(2)
    expect(resultados[0].degradado).toBe(false)
    expect(resultados[1].degradado).toBe(false)
  })

  it('un item cuyo decidir() lanza en ambos intentos no tumba la sesión: los demás quedan intactos', async () => {
    let llamada = 0
    const parse = vi.fn().mockImplementation(async () => {
      llamada += 1
      if (llamada <= 2) throw new Error('boom inesperado')
      return { parsed_output: valida }
    })
    const items = [
      { titulo: 'Falla', cifras: [{ valor: '1', rotulo: 'x' }] },
      { titulo: 'Bien', cifras: [{ valor: '9.2', rotulo: 'Posición', delta: '-0.3' }] },
    ]
    const resultados = await maquetarSesion(items, 'neracode', { messages: { parse } })
    expect(resultados).toHaveLength(2)
    expect(resultados[0].degradado).toBe(true)
    expect(resultados[0].decision.titulo).toBe('Falla')
    expect(resultados[1].degradado).toBe(false)
    expect(resultados[1].decision.layout).toBe('kpis-fila-dos-columnas')
  })

  it('un item cuyo maquetarItem falla de forma imprevista (fuera de decidir) no tumba la sesión', async () => {
    const spy = vi.spyOn(normalizarMod, 'normalizar').mockImplementationOnce(() => {
      throw new Error('normalizar rompió de forma imprevista')
    })
    const parse = vi.fn().mockResolvedValue({ parsed_output: valida })
    const items = [
      { titulo: 'Falla', cifras: [{ valor: '1', rotulo: 'x' }] },
      { titulo: 'Bien', cifras: [{ valor: '9.2', rotulo: 'Posición', delta: '-0.3' }] },
    ]
    const resultados = await maquetarSesion(items, 'neracode', { messages: { parse } })
    expect(resultados).toHaveLength(2)
    expect(resultados[0].degradado).toBe(true)
    expect(resultados[0].motivo).toMatch(/fallo inesperado/i)
    expect(resultados[1].degradado).toBe(false)
    expect(resultados[1].decision.layout).toBe('kpis-fila-dos-columnas')
    spy.mockRestore()
  })
})
