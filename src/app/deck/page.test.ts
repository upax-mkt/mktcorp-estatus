import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { ReunionResumen } from '@/db/reuniones'
import type { DocumentoCompleto } from '@/db/documentos'

/**
 * `/deck` (Presentaciones — "Deck Designer" hasta la tarea 18). Esta suite
 * fija los dos hallazgos de la revisión final de la ronda 10 que tocan esta
 * página —hallazgo 1 ("falta minuta" con el mismo sesgo que "Levantar
 * minuta") y hallazgo 2 ("en preparación" duplica lo que ya se cuenta como
 * dado)— y, desde la tarea 18, el merge de "Se dieron, falta su minuta" +
 * "Reuniones cerradas" en un solo módulo, "Anteriores": no intenta cubrir el
 * resto (descargar minuta/PDF...).
 */

const exigirLecturaMock = vi.fn()
vi.mock('@/auth/roles', () => ({
  exigirLectura: () => exigirLecturaMock(),
  exigirEditor: vi.fn(),
  // `esAdmin` (ronda 11, tarea 2): `PagPreparar` ahora la llama dentro del
  // `Promise.all` para alimentar a `BarraNavegacion` — sin mockearla aquí,
  // `esAdmin()` es `undefined()` y el `Promise.all` entero rechaza. Mismo
  // mock, mismo motivo, que `src/app/page.test.ts` (Home).
  esAdmin: vi.fn().mockResolvedValue(false),
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
 * HALLAZGO 1 (parcial) DE LA REVISIÓN FINAL — "Anteriores" (antes "falta
 * minuta") tenía el mismo sesgo que "Levantar minuta": usaba `r.estado ===
 * 'dada'` a secas, mientras `/reuniones` ya deduce con `fueDada` — una
 * reunión `agendada` pero maquetada (documento LISTO) y con el día ya pasado
 * también cuenta, sin que nadie la haya confirmado a mano.
 *
 * REESCRITO EN LA TAREA 18: la etiqueta destino pasa de "Se dieron, falta su
 * minuta" a "Anteriores" — ese módulo (con "Reuniones cerradas") se muda a
 * `/reuniones`, y `/deck` se queda con "En preparación" + "Anteriores"
 * (Franco: "el deck designer solo debe tener las presentaciones en
 * preparación y presentaciones anteriores"). El comportamiento que este
 * hallazgo fija —lo deducido por `fueDada` cuenta igual— sigue vivo aquí
 * porque "Anteriores" usa el mismo `fueDada` como único gate.
 */
describe('PagPreparar (/deck) — "Anteriores" también cuenta lo deducido (hallazgo 1)', () => {
  it('una agendada maquetada (documento listo) cuyo día ya pasó aparece en "Anteriores", sin estar confirmada a mano', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-maquetada', titulo: 'Quincenal julio', fecha: '2026-07-10T18:00:00.000Z', estado: 'agendada', tieneDocumento: true }),
    ])
    documentoDeReunionMock.mockResolvedValue(documentoListo())

    render(await PagPreparar())

    expect(screen.getByText('Anteriores')).toBeInTheDocument()
    expect(screen.getByText('Quincenal julio')).toBeInTheDocument()
  })

  it('una agendada SIN respaldo (nada maquetado) no aparece ahí: sigue en preparación, no "dada"', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-sin-respaldo', titulo: 'Standup sin nada', fecha: '2026-07-10T18:00:00.000Z', estado: 'agendada' }),
    ])
    documentoDeReunionMock.mockResolvedValue(null)

    render(await PagPreparar())

    expect(screen.queryByText('Quincenal julio')).not.toBeInTheDocument()
    expect(screen.queryByText('Standup sin nada')).not.toBeInTheDocument()
  })
})

/**
 * TAREA 18 — "Anteriores" reemplaza a "Se dieron, falta su minuta" +
 * "Reuniones cerradas": Franco, el 6-ago, mirando la app desplegada: "el
 * deck designer solo debe tener las presentaciones en preparación y
 * presentaciones anteriores ligadas o no a una reunión". Un solo predicado
 * —`fueDada`, la misma fuente que ya usa "En preparación" para su mitad
 * negativa— decide qué está "antes": ya no importa si tiene minuta o no, esa
 * pregunta es de `/reuniones` ahora.
 */
describe('PagPreparar (/deck) — "Anteriores" absorbe "cerradas" y "falta minuta" (tarea 18)', () => {
  it('una reunión dada CON minuta aparece en "Anteriores" (antes vivía en "Reuniones cerradas")', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-cerrada', titulo: 'Estatus de julio', fecha: '2026-07-05T18:00:00.000Z', estado: 'dada', tieneMinuta: true, tieneDocumento: true }),
    ])
    documentoDeReunionMock.mockResolvedValue(documentoListo())

    render(await PagPreparar())

    const seccion = screen.getByText('Anteriores').closest('section')!
    expect(within(seccion).getByText('Estatus de julio')).toBeInTheDocument()
  })

  it('una reunión dada SIN minuta TAMBIÉN aparece en "Anteriores" — misma sección, no una aparte (antes "Se dieron, falta su minuta")', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-sin-minuta', titulo: 'Kickoff campaña Q3', fecha: '2026-07-08T18:00:00.000Z', estado: 'dada', tieneMinuta: false, tieneDocumento: true }),
    ])
    documentoDeReunionMock.mockResolvedValue(documentoListo())

    render(await PagPreparar())

    const seccion = screen.getByText('Anteriores').closest('section')!
    expect(within(seccion).getByText('Kickoff campaña Q3')).toBeInTheDocument()
  })

  it('las etiquetas viejas —"Se dieron, falta su minuta" y "Reuniones cerradas"— ya no existen: cada cosa en su pestaña', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-cerrada', titulo: 'Estatus de julio', fecha: '2026-07-05T18:00:00.000Z', estado: 'dada', tieneMinuta: true, tieneDocumento: true }),
      reunion({ id: 'r-sin-minuta', titulo: 'Kickoff campaña Q3', fecha: '2026-07-08T18:00:00.000Z', estado: 'dada', tieneMinuta: false, tieneDocumento: true }),
    ])
    documentoDeReunionMock.mockResolvedValue(documentoListo())

    render(await PagPreparar())

    expect(screen.queryByText(/se dieron, falta su minuta/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/reuniones cerradas/i)).not.toBeInTheDocument()
  })

  it('se ordena por fecha de la reunión, la más reciente primero ("se ordena por la presentación": hoy 1:1 con su reunión)', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-vieja', titulo: 'Estatus de junio', fecha: '2026-06-10T18:00:00.000Z', estado: 'dada', tieneMinuta: true, tieneDocumento: true }),
      reunion({ id: 'r-nueva', titulo: 'Estatus de julio', fecha: '2026-07-15T18:00:00.000Z', estado: 'dada', tieneMinuta: true, tieneDocumento: true }),
    ])
    documentoDeReunionMock.mockResolvedValue(documentoListo())

    render(await PagPreparar())

    const seccion = screen.getByText('Anteriores').closest('section')!
    const titulos = within(seccion).getAllByText(/^Estatus de (junio|julio)$/).map((n) => n.textContent)
    expect(titulos).toEqual(['Estatus de julio', 'Estatus de junio'])
  })

  it('una reunión sin minuta muestra "Sin minuta" en vez de un botón de descarga roto (AccionesReunion, reusado sin cambios)', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-sin-minuta', titulo: 'Kickoff campaña Q3', fecha: '2026-07-08T18:00:00.000Z', estado: 'dada', tieneMinuta: false, tieneDocumento: true }),
    ])
    documentoDeReunionMock.mockResolvedValue(documentoListo())

    render(await PagPreparar())

    const seccion = screen.getByText('Anteriores').closest('section')!
    expect(within(seccion).getByText('Sin minuta')).toBeInTheDocument()
  })

  /**
   * LA REGLA DURA, TAMBIÉN AQUÍ: "En preparación" y "Anteriores" son las
   * DOS mitades de `fueDada` (`!fueDada` / `fueDada`) — una partición, no dos
   * listas que puedan coincidir. Mismo defecto, mismas dos pantallas
   * (hallazgo 2, más abajo) que ya se arregló una vez en esta ronda.
   */
  it('ninguna reunión sale en "En preparación" Y en "Anteriores" a la vez', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-en-prep', titulo: 'Standup sin nada', fecha: '2026-07-10T18:00:00.000Z', estado: 'agendada' }),
      reunion({ id: 'r-maquetada', titulo: 'Quincenal julio', fecha: '2026-07-10T18:00:00.000Z', estado: 'agendada', tieneDocumento: true }),
      reunion({ id: 'r-cerrada', titulo: 'Estatus de julio', fecha: '2026-07-05T18:00:00.000Z', estado: 'dada', tieneMinuta: true, tieneDocumento: true }),
    ])
    documentoDeReunionMock.mockImplementation((id: string) =>
      Promise.resolve(id === 'r-en-prep' ? null : documentoListo()),
    )

    render(await PagPreparar())

    // Por HREF, no por texto: "En preparación" pinta el nombre de la SALA
    // como texto principal (ver `hrefsEnPreparacion`, hallazgo 2 arriba), no
    // el título — el `/deck/{id}` de cada fila es el único identificador que
    // sirve en las dos secciones por igual.
    function hrefsDe(tituloSeccion: string): string[] {
      const seccion = screen.getByText(tituloSeccion).closest('section')!
      return within(seccion)
        .queryAllByRole('link')
        .map((a) => a.getAttribute('href'))
        .filter((href): href is string => href != null)
    }

    const enPrep = hrefsDe('En preparación')
    const anteriores = hrefsDe('Anteriores')

    expect(enPrep).toContain('/deck/r-en-prep')
    expect(anteriores).toContain('/deck/r-maquetada')
    expect(anteriores).toContain('/deck/r-cerrada')
    // Y nunca las dos a la vez: ningún href de una sección aparece en la otra.
    for (const href of enPrep) expect(anteriores).not.toContain(href)
    for (const href of anteriores) expect(enPrep).not.toContain(href)
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
