import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { ReunionResumen } from '@/db/reuniones'
import type { DocumentoCompleto } from '@/db/documentos'

/**
 * `/deck` (Deck Designer). SIN TEST HASTA AHORA — esta suite es
 * DELIBERADAMENTE ACOTADA: fija solo los dos hallazgos de la revisión final
 * de la ronda 10 que tocan esta página —hallazgo 1 ("falta minuta" con el
 * mismo sesgo que "Levantar minuta") y hallazgo 2 ("en preparación" duplica
 * lo que ya se cuenta como dado)—, no intenta cubrir el resto (eliminar,
 * descargar minuta/PDF...).
 */

const exigirLecturaMock = vi.fn()
vi.mock('@/auth/roles', () => ({
  exigirLectura: () => exigirLecturaMock(),
  exigirEditor: vi.fn(),
}))

// Mismo motivo que en `reuniones/page.test.tsx`: `connection()` fuera de un
// render real de Next revienta con "invariant expected a request store".
vi.mock('next/server', () => ({ connection: vi.fn().mockResolvedValue(undefined) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const listarReunionesMock = vi.fn()
vi.mock('@/db/reuniones', () => ({
  listarReuniones: () => listarReunionesMock(),
  eliminarReunion: vi.fn(),
}))

const documentoDeReunionMock = vi.fn()
vi.mock('@/db/documentos', () => ({
  documentoDeReunion: (id: string) => documentoDeReunionMock(id),
  eliminarDocumentoDeReunion: vi.fn(),
}))

vi.mock('@/db/minutas', () => ({
  obtenerMinuta: vi.fn().mockResolvedValue(null),
}))

const { default: PagPreparar } = await import('./page')

// ---- fixtures ----

function reunion(datos: Partial<ReunionResumen> & { id: string }): ReunionResumen {
  return {
    salaSlug: 'neracode',
    salaNombre: 'NeraCode',
    salaColor: '#101010',
    fecha: '2026-07-10T18:00:00.000Z',
    titulo: 'Reunión',
    tipo: 'mensual',
    estado: 'agendada',
    noDadaEn: null,
    lugar: null,
    alcance: 'todos',
    participantes: [],
    tieneDocumento: false,
    tieneMinuta: false,
    archivos: 0,
    ...datos,
  }
}

function documentoListo(): DocumentoCompleto {
  return { id: 'doc', reunionId: 'r', estado: 'listo', plantilla: null, items: [] }
}

// "Hoy" real del sistema (sin fake timers, mismo criterio que
// `cliente/[slug]/page.test.ts`): las fechas de fixtures de este archivo
// (julio 2026) quedan cómodamente en el pasado.

beforeEach(() => {
  exigirLecturaMock.mockReset().mockResolvedValue({ rol: 'equipo', rolApp: 'viewer', sub: 'equipo-mkt-corp' })
  listarReunionesMock.mockReset().mockResolvedValue([])
  documentoDeReunionMock.mockReset().mockResolvedValue(null)
})

/**
 * HALLAZGO 1 (parcial) DE LA REVISIÓN FINAL — `faltaMinuta` tenía el mismo
 * sesgo que "Levantar minuta": usaba `r.estado === 'dada'` a secas, mientras
 * `/reuniones` (`reunionesDadasEsteMesPorSala`, tarea de esta misma ronda) ya
 * deduce con `fueDada` — una reunión `agendada` pero maquetada (documento
 * LISTO) y con el día ya pasado también cuenta, sin que nadie la haya
 * confirmado a mano.
 */
describe('PagPreparar (/deck) — "Se dieron, falta su minuta" también cuenta lo deducido (hallazgo 1)', () => {
  it('una agendada maquetada (documento listo) cuyo día ya pasó aparece en "falta su minuta", sin estar confirmada a mano', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-maquetada', titulo: 'Quincenal julio', fecha: '2026-07-10T18:00:00.000Z', estado: 'agendada', tieneDocumento: true }),
    ])
    documentoDeReunionMock.mockResolvedValue(documentoListo())

    render(await PagPreparar())

    expect(screen.getByText(/se dieron, falta su minuta/i)).toBeInTheDocument()
    expect(screen.getByText('Quincenal julio')).toBeInTheDocument()
  })

  it('una agendada SIN respaldo (nada maquetado) no aparece ahí: sigue en preparación, no "dada"', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-sin-respaldo', titulo: 'Standup sin nada', fecha: '2026-07-10T18:00:00.000Z', estado: 'agendada' }),
    ])
    documentoDeReunionMock.mockResolvedValue(null)

    render(await PagPreparar())

    expect(screen.queryByText(/se dieron, falta su minuta/i)).not.toBeInTheDocument()
  })
})

/**
 * HALLAZGO 2 DE LA REVISIÓN FINAL — "En preparación" perdió su segunda
 * mitad al migrar de sesión a reunión: antes de esta corrección era
 * `estado === 'agendada'` a secas, así que una agendada YA deducible como
 * dada (con respaldo y el día pasado) seguía en "En preparación" mientras
 * `/reuniones` ya la contaba en "Ya dadas este mes" — la misma reunión en dos
 * sitios que se contradicen.
 */
describe('PagPreparar (/deck) — "En preparación" no incluye lo que ya se cuenta como dado (hallazgo 2)', () => {
  /**
   * Cada fila de "En preparación" muestra el NOMBRE DE LA SALA como texto
   * principal (`s.salaNombre`), no el título de la reunión —a diferencia de
   * "falta su minuta"/"cerradas", que sí muestran `s.titulo`—, así que la
   * única forma fiable de identificar UNA fila concreta es por el `href`
   * de su link (`/deck/{id}`, único por reunión).
   */
  function hrefsEnPreparacion(): string[] {
    const seccion = screen.getByText('En preparación').closest('section')!
    // `queryAllByRole`, no `getAllByRole`: el caso de éxito de más de un test
    // de aquí abajo es precisamente que la lista quede VACÍA (el vacío
    // "Nada en preparación todavía" no lleva ningún link) — `getAllByRole`
    // lanza cuando no encuentra nada, `queryAllByRole` devuelve `[]`.
    return within(seccion)
      .queryAllByRole('link')
      .map((a) => a.getAttribute('href'))
      .filter((href): href is string => href != null)
  }

  it('una agendada maquetada (con respaldo, día pasado) NO sale en "En preparación"', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-maquetada', titulo: 'Quincenal julio', fecha: '2026-07-10T18:00:00.000Z', estado: 'agendada', tieneDocumento: true }),
    ])
    documentoDeReunionMock.mockResolvedValue(documentoListo())

    render(await PagPreparar())

    expect(hrefsEnPreparacion()).not.toContain('/deck/r-maquetada')
  })

  it('una agendada SIN respaldo todavía sigue en "En preparación"', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-sin-respaldo', titulo: 'Standup sin nada', fecha: '2026-07-10T18:00:00.000Z', estado: 'agendada' }),
    ])
    documentoDeReunionMock.mockResolvedValue(null)

    render(await PagPreparar())

    expect(hrefsEnPreparacion()).toContain('/deck/r-sin-respaldo')
  })

  it('una futura (agendada, sin pasar su día) sigue en "En preparación" aunque esté maquetada', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-futura', titulo: 'Planeación futura', fecha: '2030-01-15T18:00:00.000Z', estado: 'agendada', tieneDocumento: true }),
    ])
    documentoDeReunionMock.mockResolvedValue(documentoListo())

    render(await PagPreparar())

    expect(hrefsEnPreparacion()).toContain('/deck/r-futura')
  })
})
