import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

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
 *
 * MIGRADO (ronda 10, tarea 5b): mockeaba `@/db/sesiones` (`obtenerSesion`,
 * que devolvía reunión + documento fundidos en un solo objeto); ahora
 * mockea por separado `@/db/reuniones` (`obtenerReunion`) y `@/db/documentos`
 * (`documentoDeReunion`) — no importaba `@/db/sesiones` por nombre (lo
 * mockeaba por string), así que no apareció en el grep que midió la lista de
 * 20 archivos de la tarea.
 */

const obtenerReunionMock = vi.fn()
vi.mock('@/db/reuniones', () => ({
  obtenerReunion: (...args: unknown[]) => obtenerReunionMock(...args),
}))

const documentoDeReunionMock = vi.fn()
vi.mock('@/db/documentos', () => ({
  documentoDeReunion: (...args: unknown[]) => documentoDeReunionMock(...args),
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
// `exigirLectura` no la ejercita ningún test de aquí (vive dentro de
// `registrarPresentacionAction`, que estos tests no invocan — llaman a la
// página directo, sin montar el árbol de React ni hacer clic en "Presentar")
// pero se incluye en el doble para que la página siga important-eable si
// algún día un test SÍ la ejercita: sin esto, `undefined()` reventaría.
vi.mock('@/auth/roles', () => ({
  esLector: () => esLectorMock(),
  exigirLectura: vi.fn(),
}))

const directorioMock = vi.fn()
vi.mock('@/db/personas', () => ({
  directorio: () => directorioMock(),
}))

// Mismo motivo que `exigirLectura` arriba: `registrarPresentacion` solo la
// usa `registrarPresentacionAction`, que ningún test de aquí invoca.
vi.mock('@/db/participacion', () => ({
  registrarPresentacion: vi.fn(),
}))

// `DocumentoSesion` (fuera de mi lista de archivos de esta tarea) se
// sustituye por un doble mudo: el describe de "hallazgo 3" (más abajo) solo
// necesita el `<header>` de ESTA página, no el documento entero — y evita
// arrastrar cualquier dependencia propia del componente real a este archivo.
vi.mock('@/componentes/sesion/DocumentoSesion', () => ({
  DocumentoSesion: () => null,
}))

const { default: PagSesionPublicada } = await import('./page')

// Una reunión real de una sala (neracode, slug registrado en @/temas), con su
// documento trayendo al menos un item resuelto — si `secciones` sale vacío
// la página llama a `notFound()` antes de llegar a `directorio()`, y eso no
// es lo que este test quiere ejercitar.
const REUNION_BASE = {
  id: 's1',
  salaSlug: 'neracode',
  salaNombre: 'NeraCode',
}
const DOCUMENTO_BASE = {
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
  obtenerReunionMock.mockReset().mockResolvedValue(REUNION_BASE)
  documentoDeReunionMock.mockReset().mockResolvedValue(DOCUMENTO_BASE)
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

/**
 * SIN SALA (comité, interna de Mkt Corp — Tarea 8c, 5-ago): una reunión así
 * no pertenece a ninguna UDN, así que no hay clave de sala que darle a
 * `puedeVerEstaSala`. El permiso cae al general de lectura (`esLector()`) —
 * exactamente lo que hacía el modelo viejo cuando `sesion.salaSlug` era nulo
 * (`sesion.salaSlug ? await puedeVerEstaSala(...) : await esLector()`, git
 * show d5396be:src/app/reunion/[id]/page.tsx).
 */
describe('PagSesionPublicada (/reunion/[id]) — sin sala (comité, Tarea 8c)', () => {
  it('el permiso cae a esLector(), no a puedeVerEstaSala: sin sala no hay UDN a la que preguntarle', async () => {
    obtenerReunionMock.mockResolvedValue({ ...REUNION_BASE, salaSlug: null })
    esLectorMock.mockResolvedValue(true)

    await PagSesionPublicada({ params: Promise.resolve({ id: 's1' }) })

    expect(puedeVerEstaSalaMock).not.toHaveBeenCalled()
    expect(esLectorMock).toHaveBeenCalled()
    // El equipo (esLector true) sigue viendo el directorio, igual que en
    // cualquier otra reunión — la caída a esLector() no le quita nada.
    expect(directorioMock).toHaveBeenCalledTimes(1)
  })

  it('sin lectura general tampoco: nadie sin sesión de equipo entra a una reunión sin sala', async () => {
    obtenerReunionMock.mockResolvedValue({ ...REUNION_BASE, salaSlug: null })
    esLectorMock.mockResolvedValue(false)

    // notFound() de Next lanza fuera de un request real — es la señal de que
    // la página cortó antes de pintar nada, ni de cargar directorio().
    await expect(PagSesionPublicada({ params: Promise.resolve({ id: 's1' }) })).rejects.toThrow()

    expect(puedeVerEstaSalaMock).not.toHaveBeenCalled()
    expect(directorioMock).not.toHaveBeenCalled()
  })

  it('no hay sala de la que leer estado: estadoDeSala ni se llama (mismo criterio que el modelo viejo)', async () => {
    obtenerReunionMock.mockResolvedValue({ ...REUNION_BASE, salaSlug: null })
    esLectorMock.mockResolvedValue(true)

    await PagSesionPublicada({ params: Promise.resolve({ id: 's1' }) })

    expect(estadoDeSalaMock).not.toHaveBeenCalled()
  })
})

/**
 * HALLAZGO 3 DE LA REVISIÓN FINAL (ronda 10) — ENLACE ROTO EN UNA REUNIÓN
 * SIN SALA.
 *
 * El link "← {reunion.salaNombre}" de la cabecera apuntaba SIEMPRE a
 * `/cliente/${reunion.salaSlug}`: con una reunión de comité (sin sala,
 * `salaSlug: null`), eso produce `/cliente/null`. El título sí resuelve bien
 * ("Marketing Corp", `identidadDe`, `db/reuniones.ts`) — es solo el `href` el
 * que está mal. `deck/[id]/documento/page.tsx:129-135` sí condiciona su
 * enlace equivalente ("Presentada · ver en la sala →"); esta pantalla era la
 * única de las tres hermanas que no lo hacía.
 */
describe('PagSesionPublicada (/reunion/[id]) — el link de la cabecera no produce /cliente/null (hallazgo 3)', () => {
  it('con sala: el link "← {sala}" va a /cliente/{slug}, como siempre', async () => {
    esLectorMock.mockResolvedValue(true)

    render(await PagSesionPublicada({ params: Promise.resolve({ id: 's1' }) }))

    expect(screen.getByRole('link', { name: /NeraCode/ })).toHaveAttribute('href', '/cliente/neracode')
  })

  it('SIN sala (comité, Tarea 8b): el link "← {salaNombre}" NUNCA apunta a /cliente/null', async () => {
    obtenerReunionMock.mockResolvedValue({ ...REUNION_BASE, salaSlug: null, salaNombre: 'Marketing Corp' })
    esLectorMock.mockResolvedValue(true)

    render(await PagSesionPublicada({ params: Promise.resolve({ id: 's1' }) }))

    const enlace = screen.getByRole('link', { name: /Marketing Corp/ })
    expect(enlace).not.toHaveAttribute('href', '/cliente/null')
    // `/reuniones`, el destino que ofrece el hallazgo para "lo que no es de
    // ninguna sala" — ver el reporte de esta tarea para la otra opción
    // (condicionar a un `<span>`, como `deck/[id]/documento/page.tsx`).
    expect(enlace).toHaveAttribute('href', '/reuniones')
  })
})
