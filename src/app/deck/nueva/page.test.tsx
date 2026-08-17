import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * `/deck/nueva` ("Nueva reunión") no tenía suite propia. Esta la abre con el
 * hallazgo que cierra esta ronda de deuda técnica: era la ÚNICA de las tres
 * pantallas que crean una reunión con una forma propia para "¿qué junta
 * es?" —radios rotulados "Qué reunión es", sin el rótulo compartido, sin
 * filtrar por `esClaseDeJunta` y sin la opción "En blanco"—, y la
 * ÚNICA que nacía con una clase elegida por nadie (el radio "Estatus de UDN"
 * traía `defaultChecked`). Ahora reusa `SelectorClaseDeJunta`
 * (`@/componentes/comunes/SelectorClaseDeJunta`) a través del puente
 * `CampoClaseDeJunta.tsx` (este mismo directorio) y arranca sin elegir.
 */

const exigirLecturaMock = vi.fn()
const exigirEditorMock = vi.fn()
vi.mock('@/auth/roles', () => ({
  exigirLectura: () => exigirLecturaMock(),
  exigirEditor: (...args: unknown[]) => exigirEditorMock(...args),
  esAdmin: vi.fn().mockResolvedValue(false),
}))

vi.mock('@/auth/sesion', () => ({ cerrarSesion: vi.fn() }))

// Mismo motivo que en el resto de las páginas de este repo: `connection()`
// fuera de un render real de Next revienta con "invariant expected a request
// store". `redirect` se deja MUDO (no-op): es la ÚLTIMA línea de `crear`, así
// que un doble que no hace nada deja la función terminar sin ruido — no hace
// falta reproducir la navegación real de Next para estos tests.
vi.mock('next/server', () => ({ connection: vi.fn().mockResolvedValue(undefined) }))
const redirectMock = vi.fn()
vi.mock('next/navigation', () => ({ redirect: (...args: unknown[]) => redirectMock(...args) }))

const TEMA_BASE = { nombre: 'NeraCode', primario: '#101010', gradiente: ['#101010', '#202020'] }
const cargarTemasMock = vi.fn()
const slugsDeSalasMock = vi.fn()
vi.mock('@/db/temas', () => ({
  cargarTemas: () => cargarTemasMock(),
  slugsDeSalas: () => slugsDeSalasMock(),
}))

const slugsDeSalasPausadasMock = vi.fn()
vi.mock('@/db/salas', () => ({
  slugsDeSalasPausadas: () => slugsDeSalasPausadasMock(),
}))

const crearReunionConDocumentoMock = vi.fn()
vi.mock('@/db/documentos', () => ({
  crearReunionConDocumento: (...args: unknown[]) => crearReunionConDocumentoMock(...args),
}))

const { default: PagNuevaSesion } = await import('./page')

beforeEach(() => {
  vi.clearAllMocks()
  exigirLecturaMock.mockResolvedValue({ rol: 'equipo', rolApp: 'viewer', sub: 'equipo-mkt-corp' })
  exigirEditorMock.mockResolvedValue({ rol: 'equipo', rolApp: 'editor', sub: 'equipo-mkt-corp' })
  slugsDeSalasMock.mockResolvedValue(['neracode'])
  cargarTemasMock.mockResolvedValue({ neracode: TEMA_BASE })
  slugsDeSalasPausadasMock.mockResolvedValue(new Set())
  crearReunionConDocumentoMock.mockResolvedValue({ reunionId: 'r-nueva', documentoId: 'd-nueva' })
})

async function elegirSalaYEnviar(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.click(screen.getByRole('radio', { name: /neracode/i }))
  await usuario.click(screen.getByRole('button', { name: /crear reunión/i }))
}

describe('PagNuevaSesion (/deck/nueva) — "¿Qué junta es?" reusa el selector compartido', () => {
  it('ofrece el selector compartido, con su mismo rótulo — no los radios "Qué reunión es"', async () => {
    render(await PagNuevaSesion())

    expect(screen.getByLabelText('¿Qué junta es?')).toBeInTheDocument()
    expect(screen.queryByText('Qué reunión es')).not.toBeInTheDocument()
  })

  it('arranca en "Sin clasificar", no en "Estatus de UDN" (antes traía defaultChecked)', async () => {
    render(await PagNuevaSesion())

    const selector = screen.getByLabelText('¿Qué junta es?') as HTMLSelectElement
    expect(selector.value).toBe('')
    expect(within(selector).getByRole('option', { name: 'Sin clasificar' })).toBeInTheDocument()
  })

  it('filtra por clase de junta: "En blanco" vive aparte, no como una clase más', async () => {
    render(await PagNuevaSesion())

    const selector = screen.getByLabelText('¿Qué junta es?')
    expect(within(selector).getByRole('option', { name: 'En blanco' })).toBeInTheDocument()
    // Cinco clases reales — mismo catálogo que ya prueba `SelectorClaseDeJunta.test.tsx`,
    // esto solo fija que ESTA pantalla lo usa filtrado, no la lista cruda.
    expect(within(selector).getByRole('option', { name: 'Estatus de UDN' })).toBeInTheDocument()
    expect(within(selector).getByRole('option', { name: 'Comité o dirección' })).toBeInTheDocument()
  })
})

/**
 * "UNA JUNTA NUEVA NACE CLASIFICADA AUNQUE NADIE LO DECIDA" (cierre de deuda
 * técnica): antes de esta tarea, el radio de "Estatus de UDN" nacía marcado
 * (`defaultChecked={i === 0}`), así que TODA reunión creada desde esta
 * pantalla llegaba a `crearReunionConDocumento` con `plantilla: 'estatus-udn'`
 * aunque nadie hubiera elegido nada. Estos tests fijan que ahora, si nadie
 * toca el selector, `plantilla` NO VIAJA (se omite, no se manda `null` ni la
 * primera del catálogo) — y que si SÍ se elige, viaja tal cual.
 */
describe('PagNuevaSesion (/deck/nueva) — una junta nueva no nace clasificada por nadie', () => {
  it('sin tocar el selector, crearReunionConDocumento NO recibe plantilla', async () => {
    const usuario = userEvent.setup()
    render(await PagNuevaSesion())

    await elegirSalaYEnviar(usuario)

    expect(crearReunionConDocumentoMock).toHaveBeenCalledTimes(1)
    const enviado = crearReunionConDocumentoMock.mock.calls[0][0] as Record<string, unknown>
    expect('plantilla' in enviado).toBe(false)
    expect(enviado.salaSlug).toBe('neracode')
  })

  it('eligiendo una clase, crearReunionConDocumento recibe ese id tal cual', async () => {
    const usuario = userEvent.setup()
    render(await PagNuevaSesion())

    await usuario.selectOptions(screen.getByLabelText('¿Qué junta es?'), 'comite')
    await elegirSalaYEnviar(usuario)

    expect(crearReunionConDocumentoMock).toHaveBeenCalledWith(
      expect.objectContaining({ plantilla: 'comite' }),
    )
  })

  it('eligiendo "En blanco", viaja "en-blanco" — sigue siendo una opción válida, no una clase', async () => {
    const usuario = userEvent.setup()
    render(await PagNuevaSesion())

    await usuario.selectOptions(screen.getByLabelText('¿Qué junta es?'), 'en-blanco')
    await elegirSalaYEnviar(usuario)

    expect(crearReunionConDocumentoMock).toHaveBeenCalledWith(
      expect.objectContaining({ plantilla: 'en-blanco' }),
    )
  })
})
