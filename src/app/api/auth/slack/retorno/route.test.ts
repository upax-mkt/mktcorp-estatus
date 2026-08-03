import { describe, it, expect, vi } from 'vitest'
import { COOKIE_ESTADO_SLACK } from '@/auth/slack-rutas'

/**
 * SIN FILTRO POR DOMINIO DE CORREO (ronda 9, fix posterior al directorio
 * real) — este archivo fija el comportamiento nuevo del retorno de Slack: ya
 * no hay una puerta de "el correo es de tal dominio" entre el workspace y el
 * directorio. El porqué completo vive en el comentario de cabecera de
 * `./route.ts`; aquí solo se prueba el efecto: un correo de OTRO dominio del
 * grupo (no `@upax.com.mx`), con fila activa en `personas`, entra igual.
 *
 * Mismo criterio que `src/app/reunion/[id]/page.test.ts` y
 * `src/app/agenda/[token]/page.test.ts`: `GET` es una función async con
 * dependencias sustituibles por dobles — se invoca directo, sin un servidor
 * de Next real. La ruta solo lee `request.url`, así que basta un objeto con
 * esa propiedad.
 *
 * `@/auth/slack-rutas` NO se dobla: es puro (arma una URL, no toca nada) y ya
 * tiene su propio test (`slack-rutas.test.ts`) — se importa aquí de verdad
 * solo para no repetir el nombre literal de la cookie.
 */

const redirectMock = vi.fn((_url: string) => {
  throw new Error('NEXT_REDIRECT')
})
vi.mock('next/navigation', () => ({
  redirect: (url: string) => redirectMock(url),
}))

const cookieStoreMock = { get: vi.fn(), delete: vi.fn() }
vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve(cookieStoreMock),
}))

const secretoConfiguradoMock = vi.fn()
const abrirSesionEquipoMock = vi.fn()
vi.mock('@/auth/sesion', () => ({
  secretoConfigurado: () => secretoConfiguradoMock(),
  abrirSesionEquipo: (...args: unknown[]) => abrirSesionEquipoMock(...args),
}))

const verificarMock = vi.fn()
vi.mock('@/auth/firma', () => ({
  verificar: (...args: unknown[]) => verificarMock(...args),
}))

const slackConfiguradoMock = vi.fn()
const equipoExigidoMock = vi.fn()
const esEquipoPermitidoMock = vi.fn()
const identidadDesdeCodigoMock = vi.fn()
vi.mock('@/auth/slack', () => ({
  slackConfigurado: () => slackConfiguradoMock(),
  equipoExigido: () => equipoExigidoMock(),
  esEquipoPermitido: (...args: unknown[]) => esEquipoPermitidoMock(...args),
  identidadDesdeCodigo: (...args: unknown[]) => identidadDesdeCodigoMock(...args),
}))

const buscarPersonaMock = vi.fn()
const registrarAccesoMock = vi.fn()
vi.mock('@/db/directorio', () => ({
  buscarPersona: (...args: unknown[]) => buscarPersonaMock(...args),
  registrarAcceso: (...args: unknown[]) => registrarAccesoMock(...args),
}))

const { GET } = await import('./route')

describe('GET /api/auth/slack/retorno — sin filtro de dominio de correo', () => {
  it('un correo de otro dominio del grupo, con fila activa en el directorio, entra', async () => {
    secretoConfiguradoMock.mockReturnValue('secreto-de-prueba')
    slackConfiguradoMock.mockReturnValue(true)
    cookieStoreMock.get.mockImplementation((nombre: string) =>
      nombre === COOKIE_ESTADO_SLACK ? { value: 'estado-bueno' } : undefined,
    )
    verificarMock.mockResolvedValue(true)
    equipoExigidoMock.mockReturnValue('E081PBW2ZV2')
    esEquipoPermitidoMock.mockReturnValue(true)
    // Nada de @upax.com.mx: contratada por Elektra, otra entidad del mismo
    // grupo — exactamente el caso que el filtro retirado rechazaba sin motivo.
    identidadDesdeCodigoMock.mockResolvedValue({
      email: 'alguien@elektra.com.mx',
      nombre: 'Alguien de Elektra',
      equipo: 'T123',
      organizacion: 'E081PBW2ZV2',
    })
    buscarPersonaMock.mockResolvedValue({
      correo: 'alguien@elektra.com.mx',
      nombre: 'Alguien de Elektra',
      rol: 'editor',
      activa: true,
    })

    const peticion = {
      url: 'https://estatus.upax.com.mx/api/auth/slack/retorno?code=codigo-bueno&state=estado-bueno',
    } as unknown as Request

    await expect(GET(peticion)).rejects.toThrow('NEXT_REDIRECT')

    // Llegó hasta el final (redirect a Home), no a /entrar con un error.
    expect(redirectMock).toHaveBeenCalledTimes(1)
    expect(redirectMock).toHaveBeenCalledWith('/')

    // Las dos puertas que sí quedan, ejercitadas de verdad — no solo "no
    // truena": el workspace se comprobó, y quien decidió el acceso fue el
    // directorio, con el correo de Elektra tal cual, sin normalizarlo contra
    // ningún dominio.
    expect(esEquipoPermitidoMock).toHaveBeenCalledWith('T123', 'E081PBW2ZV2', 'E081PBW2ZV2')
    expect(buscarPersonaMock).toHaveBeenCalledWith('alguien@elektra.com.mx')
    expect(abrirSesionEquipoMock).toHaveBeenCalledWith('alguien@elektra.com.mx', 'editor')
    expect(registrarAccesoMock).toHaveBeenCalledWith('alguien@elektra.com.mx')
  })
})
