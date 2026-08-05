import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * EL TOKEN SE COMPRUEBA ANTES DE CONSULTAR NADA (tarea 3, ronda 8) — es el
 * punto que más importa de esta pantalla: la política de rutas
 * (`esRutaPublica`, src/auth/politica.ts) deja pasar `/agenda/<token>` por
 * FORMA, no por validez, así que la comprobación real vive en esta página.
 *
 * Este test fija esa regla al nivel de la página: con un token que no
 * valida, `reunionesPublicasDelMes` —la única función que toca la base de
 * datos aquí, mudada de `sesiones.ts` a `reuniones.ts` en la ronda 10, tarea
 * 5b, con la MISMA firma y comportamiento— JAMÁS se llama, y la respuesta es
 * notFound() (404), no un mensaje que distinga "token inválido" de "el
 * enlace nunca existió". Mismo criterio que ya usa reunion/[id]/page.test.ts
 * para "el dato ni se pide": una página de App Router es una función async
 * con dependencias sustituibles por dobles, no hace falta montar un
 * navegador para esto.
 *
 * También fija, con el reloj congelado, que el mes por defecto sale de
 * `src/lib/fecha.ts` (CDMX) y no de la zona del proceso — la app ya tuvo ese
 * bug una vez (ver el comentario de cabecera de fecha.ts).
 */

const tokenValidoMock = vi.fn()
vi.mock('@/db/enlace-agenda', () => ({
  tokenValido: (...args: unknown[]) => tokenValidoMock(...args),
}))

const reunionesPublicasDelMesMock = vi.fn()
vi.mock('@/db/reuniones', () => ({
  reunionesPublicasDelMes: (...args: unknown[]) => reunionesPublicasDelMesMock(...args),
}))

const notFoundMock = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})
vi.mock('next/navigation', () => ({
  notFound: () => notFoundMock(),
}))

const { default: PagAgendaPublica } = await import('./page')

beforeEach(() => {
  tokenValidoMock.mockReset()
  reunionesPublicasDelMesMock.mockReset().mockResolvedValue([])
  notFoundMock.mockClear()
  vi.useFakeTimers()
  // 2026-07-01T02:00 UTC son las 2026-06-30T20:00 en CDMX (UTC-6): un
  // instante donde UTC y CDMX caen en MESES distintos. Si el mes por defecto
  // se resolviera con la zona del proceso en vez de fecha.ts, este test lo
  // atraparía.
  vi.setSystemTime(new Date('2026-07-01T02:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('PagAgendaPublica (/agenda/[token]) — el token se comprueba antes de leer nada', () => {
  it('un token que no valida responde notFound() y jamás llama a reunionesPublicasDelMes', async () => {
    tokenValidoMock.mockResolvedValue(false)

    await expect(
      PagAgendaPublica({
        params: Promise.resolve({ token: 'lo-que-sea' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND')

    expect(tokenValidoMock).toHaveBeenCalledWith('lo-que-sea')
    expect(notFoundMock).toHaveBeenCalledTimes(1)
    expect(reunionesPublicasDelMesMock).not.toHaveBeenCalled()
  })

  it('un token válido, sin ?mes, consulta el mes de HOY resuelto en CDMX', async () => {
    tokenValidoMock.mockResolvedValue(true)

    await PagAgendaPublica({
      params: Promise.resolve({ token: 'bueno' }),
      searchParams: Promise.resolve({}),
    })

    // 2026-06-30 en CDMX, aunque el reloj del sistema (UTC) ya marque julio.
    expect(reunionesPublicasDelMesMock).toHaveBeenCalledWith(2026, 6)
    expect(notFoundMock).not.toHaveBeenCalled()
  })

  it('?mes=2026-08 pide agosto de 2026, sin importar qué día sea hoy', async () => {
    tokenValidoMock.mockResolvedValue(true)

    await PagAgendaPublica({
      params: Promise.resolve({ token: 'bueno' }),
      searchParams: Promise.resolve({ mes: '2026-08' }),
    })

    expect(reunionesPublicasDelMesMock).toHaveBeenCalledWith(2026, 8)
  })

  it('un ?mes con formato inválido cae al mes de hoy, no revienta la página', async () => {
    tokenValidoMock.mockResolvedValue(true)

    await PagAgendaPublica({
      params: Promise.resolve({ token: 'bueno' }),
      searchParams: Promise.resolve({ mes: 'no-es-un-mes' }),
    })

    expect(reunionesPublicasDelMesMock).toHaveBeenCalledWith(2026, 6)
  })

  it('un ?mes con el número de mes fuera de 1-12 también cae al mes de hoy', async () => {
    tokenValidoMock.mockResolvedValue(true)

    await PagAgendaPublica({
      params: Promise.resolve({ token: 'bueno' }),
      searchParams: Promise.resolve({ mes: '2026-13' }),
    })

    expect(reunionesPublicasDelMesMock).toHaveBeenCalledWith(2026, 6)
  })
})
