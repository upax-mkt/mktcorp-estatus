import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * FUGA DE DATOS (corrección de revisión): esta página la puede abrir el rol
 * `sala` —es donde aterriza "Ver presentación" desde su propia sala,
 * `puedeVerEstaSala` lo confirma dentro de la página— y antes de esta
 * corrección `directorio()` (nombre Y CORREO de las 24 personas de Mkt Corp)
 * se pedía SIEMPRE, sin condicionar a quién mira. El dato viajaba entero al
 * payload del navegador vía `ModoPresentar` (`'use client'`), aunque el
 * propio componente decidiera no mostrar el selector de responsable a un
 * director — ver el comentario junto a `directorio()` en `page.tsx`.
 *
 * Este test fija la regla al nivel de la página: `directorio()` —el import,
 * espiado— solo se llama cuando `esLector()` resuelve `true`. Mismo criterio
 * que ya usa `acciones.test.ts` para las Server Actions: una página de App
 * Router es, igual que ellas, una función async con dependencias
 * sustituibles por dobles — no hace falta renderizar a DOM para comprobar
 * esto, solo invocar la función y mirar qué se llamó (y con qué).
 *
 * `esLector()`, no la vieja `esEquipo()` (retirada, corrección post-revisión
 * de la ronda 9): ahora vive en `@/auth/roles`, no en `@/auth/sesion`.
 */

const obtenerSesionMock = vi.fn()
vi.mock('@/db/sesiones', () => ({
  obtenerSesion: (...args: unknown[]) => obtenerSesionMock(...args),
}))

const estadoDeSalaMock = vi.fn()
vi.mock('@/db/consultas', () => ({
  estadoDeSala: (...args: unknown[]) => estadoDeSalaMock(...args),
}))

const puedeVerEstaSalaMock = vi.fn()
vi.mock('@/auth/sesion', () => ({
  puedeVerEstaSala: (...args: unknown[]) => puedeVerEstaSalaMock(...args),
}))

const esLectorMock = vi.fn()
vi.mock('@/auth/roles', () => ({
  esLector: () => esLectorMock(),
}))

const directorioMock = vi.fn()
vi.mock('@/db/personas', () => ({
  directorio: () => directorioMock(),
}))

const { default: PagSesionPublicada } = await import('./page')

// Una sesión real de una sala (neracode, slug registrado en @/temas), con al
// menos un item resuelto — si `secciones` sale vacío la página llama a
// `notFound()` antes de llegar a `directorio()`, y eso no es lo que este test
// quiere ejercitar.
const SESION_BASE = {
  id: 's1',
  salaSlug: 'neracode',
  salaNombre: 'NeraCode',
  items: [
    {
      resultado: {
        decision: { titulo: 'Portada', layout: 'portada' },
        degradado: false,
        motivo: undefined,
      },
    },
  ],
}

beforeEach(() => {
  obtenerSesionMock.mockReset().mockResolvedValue(SESION_BASE)
  estadoDeSalaMock.mockReset().mockResolvedValue({ acuerdos: [] })
  puedeVerEstaSalaMock.mockReset().mockResolvedValue(true)
  esLectorMock.mockReset()
  directorioMock.mockReset().mockResolvedValue([{ id: '1', nombre: 'Franco Cruzat', correo: 'franco@upax.com.mx' }])
})

describe('PagSesionPublicada (/reunion/[id]) — el directorio se CARGA condicionado', () => {
  it('un acceso de sala (el director, vía "Ver presentación" de su sala) no dispara directorio(): el dato ni se pide', async () => {
    esLectorMock.mockResolvedValue(false)

    await PagSesionPublicada({ params: Promise.resolve({ id: 's1' }) })

    // Confirma que de verdad se ejercitó el camino de un director llegando a
    // SU sala (la comprobación real, pegada al dato) y no otra rama.
    expect(puedeVerEstaSalaMock).toHaveBeenCalledWith('neracode')
    expect(directorioMock).not.toHaveBeenCalled()
  })

  it('el equipo sí dispara directorio(): lo necesita el selector de responsable del modo presentación', async () => {
    esLectorMock.mockResolvedValue(true)

    await PagSesionPublicada({ params: Promise.resolve({ id: 's1' }) })

    expect(directorioMock).toHaveBeenCalledTimes(1)
  })
})
