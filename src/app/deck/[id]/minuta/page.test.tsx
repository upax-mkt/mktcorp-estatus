import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { ReunionResumen } from '@/db/reuniones'

/**
 * `/deck/[id]/minuta` — SIN TEST HASTA AHORA. Esta suite es DELIBERADAMENTE
 * ACOTADA (mismo criterio que `src/app/page.test.ts`): fija solo los dos
 * hallazgos de la auditoría UX/UI del 7-ago que tocan este archivo —
 *
 * 1. el "← Cuestionario" del volver, que ya no es el nombre de la pantalla a
 *    la que apunta (`/deck/[id]`, hoy el editor del documento de la
 *    reunión) — aparece en las DOS ramas de la función (reunión futura y ya
 *    dada), así que las dos se prueban;
 * 2. el estado vacío de una reunión futura, que era una franja de texto en
 *    una página en blanco sin ninguna salida real: ahora ofrece preparar el
 *    documento de ESTA reunión o volver a la lista, las dos como enlaces de
 *    verdad (no texto suelto).
 *
 * No repite la cobertura de generar/publicar/eliminar minuta —eso ya lo
 * cubren `MinutaCliente.test.tsx` y `acciones.test.ts`— así que
 * `MinutaCliente`, `MinutaExternaForm` y `MinutaPublicada` se sustituyen por
 * dobles mudos: esta suite no necesita verlos pintados.
 */

const exigirLecturaMock = vi.fn()
const esAdminMock = vi.fn()
vi.mock('@/auth/roles', () => ({
  exigirLectura: () => exigirLecturaMock(),
  exigirEditor: vi.fn(),
  esAdmin: () => esAdminMock(),
}))

vi.mock('@/auth/sesion', () => ({
  cerrarSesion: vi.fn(),
}))

// `connection()` (next/server), llamado fuera de cualquier render real de
// Next, revienta con "invariant expected a request store" — mismo motivo
// documentado en `src/app/page.test.ts`.
vi.mock('next/server', () => ({ connection: vi.fn().mockResolvedValue(undefined) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const obtenerReunionMock = vi.fn()
vi.mock('@/db/reuniones', () => ({
  obtenerReunion: (id: string) => obtenerReunionMock(id),
}))

const obtenerMinutaMock = vi.fn()
vi.mock('@/db/minutas', () => ({
  obtenerMinuta: (id: string) => obtenerMinutaMock(id),
  editarTextoMinuta: vi.fn(),
  eliminarMinuta: vi.fn(),
  cargarMinutaExterna: vi.fn(),
}))

vi.mock('@/db/participacion', () => ({
  registrarEdicion: vi.fn(),
}))

vi.mock('@/db/personas', () => ({
  genteParaResponsable: vi.fn().mockResolvedValue([]),
}))

vi.mock('./MinutaCliente', () => ({ MinutaCliente: () => null }))
vi.mock('@/componentes/MinutaExternaForm', () => ({ MinutaExternaForm: () => null }))
vi.mock('@/componentes/MinutaPublicada', () => ({ MinutaPublicada: () => null }))

const { default: PagMinutaSesion } = await import('./page')

const REUNION_BASE: ReunionResumen = {
  id: 'r1',
  salaSlug: 'neracode',
  salaNombre: 'NeraCode',
  salaColor: '#101010',
  fecha: '2020-01-15T10:00:00.000Z',
  titulo: 'Quincenal enero',
  tipo: 'mensual',
  estado: 'agendada',
  noDadaEn: null,
  lugar: null,
  alcance: 'todos los squads',
  participantes: [],
  tieneDocumento: false,
  tieneMinuta: false,
  archivos: 0,
}

beforeEach(() => {
  vi.clearAllMocks()
  exigirLecturaMock.mockResolvedValue({ rol: 'equipo', rolApp: 'viewer', sub: 'equipo-mkt-corp' })
  esAdminMock.mockResolvedValue(false)
  obtenerMinutaMock.mockResolvedValue(null)
})

describe('PagMinutaSesion (/deck/[id]/minuta) — el volver ya no dice "Cuestionario" (auditoría UX/UI, 7-ago)', () => {
  it('reunión futura (todavía no se dio): el volver no dice "Cuestionario"', async () => {
    obtenerReunionMock.mockResolvedValue({ ...REUNION_BASE, fecha: '2099-06-15T10:00:00.000Z' })

    render(await PagMinutaSesion({ params: Promise.resolve({ id: 'r1' }) }))

    expect(screen.queryByText(/Cuestionario/i)).not.toBeInTheDocument()
  })

  it('reunión ya dada, sin minuta todavía: el volver tampoco dice "Cuestionario"', async () => {
    obtenerReunionMock.mockResolvedValue({ ...REUNION_BASE, fecha: '2020-01-15T10:00:00.000Z' })

    render(await PagMinutaSesion({ params: Promise.resolve({ id: 'r1' }) }))

    expect(screen.queryByText(/Cuestionario/i)).not.toBeInTheDocument()
    // El volver sigue apuntando a esta misma reunión, no a la lista.
    expect(screen.getByRole('link', { name: /editar documento/i })).toHaveAttribute('href', '/deck/r1')
  })
})

describe('PagMinutaSesion (/deck/[id]/minuta) — el vacío de una reunión futura ofrece una salida de verdad (auditoría UX/UI, 7-ago)', () => {
  it('ofrece un enlace de verdad para preparar el documento de ESTA reunión', async () => {
    obtenerReunionMock.mockResolvedValue({ ...REUNION_BASE, fecha: '2099-06-15T10:00:00.000Z' })

    render(await PagMinutaSesion({ params: Promise.resolve({ id: 'r1' }) }))

    // Con dentro de <main>, no del "Presentaciones" de BarraNavegacion (que
    // siempre está, cambie o no este vacío) — así la prueba solo pasa por lo
    // que de verdad se tocó en esta ronda.
    const main = within(screen.getByRole('main'))
    const enlace = main.getByRole('link', { name: /preparar el documento/i })
    expect(enlace).toHaveAttribute('href', '/deck/r1')
  })

  it('ofrece un enlace de verdad de vuelta a la lista de Presentaciones', async () => {
    obtenerReunionMock.mockResolvedValue({ ...REUNION_BASE, fecha: '2099-06-15T10:00:00.000Z' })

    render(await PagMinutaSesion({ params: Promise.resolve({ id: 'r1' }) }))

    const main = within(screen.getByRole('main'))
    const enlace = main.getByRole('link', { name: /presentaciones/i })
    expect(enlace).toHaveAttribute('href', '/deck')
  })

  it('ya no deja "Volver al cuestionario" como texto suelto sin enlace', async () => {
    obtenerReunionMock.mockResolvedValue({ ...REUNION_BASE, fecha: '2099-06-15T10:00:00.000Z' })

    render(await PagMinutaSesion({ params: Promise.resolve({ id: 'r1' }) }))

    expect(screen.queryByText(/volver al cuestionario/i)).not.toBeInTheDocument()
  })
})
