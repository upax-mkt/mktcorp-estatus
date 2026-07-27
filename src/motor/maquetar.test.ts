import { describe, it, expect, vi } from 'vitest'
import { maquetarItem, maquetarSesion } from './maquetar'
import { obtenerTema } from '@/temas'
import * as normalizarMod from './normalizar'

const crudo = { titulo: 'Performance', cifras: [{ valor: '9.2', rotulo: 'Posición', delta: '-0.3' }] }
const valida = { layout: 'kpis-fila-dos-columnas', titulo: 'Performance',
  kpis: [{ valor: '9.2', delta: '-0.3', rotulo: 'Posición' }], razon: 'r' }
// Una sección declarada y vacía. Ya no quedan layouts sin dibujo con los que
// provocar un rechazo, y perder una cifra tampoco sirve: `sanearDecision` la
// repone del inventario antes de validar, que es exactamente su trabajo. Un
// bloque anunciado sin contenido, en cambio, no hay de dónde repararlo.
const invalida = { layout: 'texto-multicolumna', titulo: 'Performance', columnas: [], razon: 'r' }

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
    expect(r.motivo).toMatch(/columnas viene vacía/i)
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

describe('una sección compuesta a mano no pasa por la IA', () => {
  it('se maqueta sin llamar al modelo ni una vez', async () => {
    const parse = vi.fn()
    const resultados = await maquetarSesion(
      [{
        titulo: 'Pendientes',
        seccion: {
          layout: 'pendientes-semaforo',
          titulo: 'Pendientes de la sesión pasada',
          tablas: [{ columnas: ['Responsable', 'Tarea'], filas: [{ celdas: ['Ileana', 'Cerrar el brief'] }] }],
        },
      }],
      'neracode',
      { messages: { parse } },
    )
    expect(parse).not.toHaveBeenCalled()
    expect(resultados[0].degradado).toBe(false)
    expect(resultados[0].decision.titulo).toBe('Pendientes de la sesión pasada')
  })

  it('una sesión entera armada a mano no necesita cliente de IA', async () => {
    // Sin `cliente` y sin ANTHROPIC_API_KEY, `crearClientePorDefecto()` lanza.
    // Que esto pase demuestra que ni siquiera se intenta crearlo.
    const previa = process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    try {
      const resultados = await maquetarSesion(
        [{ titulo: 'Portada', seccion: { layout: 'portada', titulo: 'Estatus mensual' } }],
        'neracode',
      )
      expect(resultados[0].degradado).toBe(false)
    } finally {
      if (previa !== undefined) process.env.ANTHROPIC_API_KEY = previa
    }
  })

  it('una sección a medias se degrada diciendo qué le falta, en vez de desaparecer', async () => {
    const resultados = await maquetarSesion(
      [{ titulo: 'Cifras', seccion: { layout: 'kpis-fila-dos-columnas', titulo: 'Performance' } }],
      'neracode',
      { messages: { parse: vi.fn() } },
    )
    expect(resultados[0].degradado).toBe(true)
    expect(resultados[0].motivo).toContain('al menos una cifra')
  })
})
