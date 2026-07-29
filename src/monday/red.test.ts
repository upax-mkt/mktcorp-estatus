import { describe, it, expect, vi, afterEach } from 'vitest'
import { consultarMonday, ErrorMonday } from './red'

function respuesta(cuerpo: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(cuerpo), {
    status: init.status ?? 200,
    headers: init.headers,
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('consultarMonday', () => {
  it('reintenta una vez ante un 429 y respeta su Retry-After', async () => {
    vi.stubEnv('MONDAY_TOKEN', 'ficticio')
    const fetchFalso = vi
      .fn()
      .mockResolvedValueOnce(respuesta({}, { status: 429, headers: { 'Retry-After': '1' } }))
      .mockResolvedValueOnce(respuesta({ data: { ok: true } }))
    vi.stubGlobal('fetch', fetchFalso)

    const datos = await consultarMonday<{ ok: boolean }>('query { ok }')

    expect(datos.ok).toBe(true)
    expect(fetchFalso).toHaveBeenCalledTimes(2)
  })

  it(
    'se rinde al segundo 429 y lo dice con los segundos que pidió Monday',
    async () => {
      vi.stubEnv('MONDAY_TOKEN', 'ficticio')
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(() =>
          Promise.resolve(respuesta({}, { status: 429, headers: { 'Retry-After': '7' } })),
        ),
      )

      await expect(consultarMonday('query { ok }')).rejects.toThrow(/7 s/)
    },
    15000,
  )

  it('un 200 con errors dentro es un error, no un resultado vacío', async () => {
    vi.stubEnv('MONDAY_TOKEN', 'ficticio')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() =>
        Promise.resolve(respuesta({ errors: [{ message: 'No tienes permiso' }] })),
      ),
    )

    await expect(consultarMonday('query { ok }')).rejects.toThrow(ErrorMonday)
    await expect(consultarMonday('query { ok }')).rejects.toThrow('No tienes permiso')
  })

  it('sin token no llama a nadie', async () => {
    vi.stubEnv('MONDAY_TOKEN', '')
    const fetchFalso = vi.fn()
    vi.stubGlobal('fetch', fetchFalso)

    await expect(consultarMonday('query { ok }')).rejects.toThrow(/MONDAY_TOKEN/)
    expect(fetchFalso).not.toHaveBeenCalled()
  })
})
