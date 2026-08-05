import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { ReunionResumen } from '@/db/reuniones'
import type { DocumentoCompleto } from '@/db/documentos'

/**
 * `/reuniones` (Tarea 13, ronda 10): el ciclo entero de una reunión en una
 * sola pestaña — el calendario y "agendar", mudados TAL CUAL desde
 * `/agenda` (siguen siendo `PanelAgenda`, sin tocar), y lo nuevo: "Ya dadas
 * este mes", con lo que le falta a cada una.
 *
 * `PanelAgenda` SE MOCKEA en este archivo — no porque no se use de verdad en
 * `page.tsx` (se usa, tal cual, sin rediseñar), sino porque:
 *
 *   1. Es un Client Component con `useRouter()` (`next/navigation`): montarlo
 *      de verdad exige un contexto de App Router que Vitest no arma solo.
 *   2. `FormularioSesion.tsx` —de quien depende `PanelAgenda`— lo tiene OTRA
 *      tarea de esta misma ronda en este momento (ver el brief de la T13:
 *      "Otros agentes tienen: ... FormularioSesion.tsx"). Renderizarlo de
 *      verdad aquí ataría este test al estado de un archivo ajeno en pleno
 *      vuelo.
 *
 * Mismo criterio que ya usa este repo para mockear un componente hermano
 * (`ModoPresentar.test.tsx`: `vi.mock('./GrabarReunion', ...)`) — no es una
 * técnica nueva.
 *
 * Lo que SÍ corre de verdad: `fueDada`/`tienePresentacion` (`dominio/reunion`)
 * y `diaCivil` (`lib/fecha`) — es la lógica nueva de esta tarea, y mockearla
 * sería no probar nada.
 */

const exigirLecturaMock = vi.fn()
vi.mock('@/auth/roles', () => ({
  exigirLectura: () => exigirLecturaMock(),
}))

// `connection()` (next/server), llamado FUERA de cualquier render real de
// Next, revienta con "invariant expected a request store" — se comprobó
// leyendo node_modules/next/dist/server/request/connection.js: sin
// `workAsyncStorage`/`workUnitAsyncStorage` (que solo existen dentro de un
// render real de Next) cae directo a `throwForMissingRequestStore`. Mismo
// motivo por el que `next/cache` se mockea en cualquier Server Action de
// este repo — aquí es el equivalente para un Server Component.
vi.mock('next/server', () => ({ connection: vi.fn().mockResolvedValue(undefined) }))

const listarReunionesMock = vi.fn()
vi.mock('@/db/reuniones', () => ({
  listarReuniones: () => listarReunionesMock(),
}))

const documentoDeReunionMock = vi.fn()
vi.mock('@/db/documentos', () => ({
  documentoDeReunion: (id: string) => documentoDeReunionMock(id),
}))

vi.mock('@/db/temas', () => ({
  slugsDeSalas: vi.fn().mockResolvedValue(['neracode', 'mexa-creativa', 'uix', 'hof']),
  cargarTemas: vi.fn().mockResolvedValue({
    neracode: { nombre: 'NeraCode', primario: '#101010' },
    'mexa-creativa': { nombre: 'Mexa Creativa', primario: '#c0392b' },
    uix: { nombre: 'UiX', primario: '#2b6cc0' },
    hof: { nombre: 'House of Films', primario: '#111827' },
  }),
}))

vi.mock('./acciones', () => ({
  agendarReunionAction: vi.fn(),
  editarReunionAction: vi.fn(),
}))

const panelAgendaPropsMock = vi.fn()
vi.mock('@/componentes/agenda/PanelAgenda', () => ({
  PanelAgenda: (props: unknown) => {
    panelAgendaPropsMock(props)
    return <div data-testid="panel-agenda-stub">calendario + agendar (stub)</div>
  },
}))

const { default: PagReuniones, reunionesDadasEsteMesPorSala } = await import('./page')

// ---- fixtures ----

function reunion(datos: Partial<ReunionResumen> & { id: string }): ReunionResumen {
  return {
    salaSlug: 'neracode',
    salaNombre: 'NeraCode',
    salaColor: '#101010',
    fecha: '2026-08-10T18:00:00.000Z',
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

function documento(estado: 'borrador' | 'listo', llenados: number, total: number): DocumentoCompleto {
  return {
    id: 'doc', reunionId: 'r', estado, plantilla: null,
    items: Array.from({ length: total }, (_, i) => ({ llenado: i < llenados })) as DocumentoCompleto['items'],
  }
}

// 2026-08-19T18:00:00Z = 2026-08-19 12:00 CDMX (bien lejos de cualquier
// frontera de día): "hoy" = 19 de agosto de 2026.
const HOY = new Date('2026-08-19T18:00:00.000Z')

const R_COMPLETA = reunion({
  id: 'r-completa', titulo: 'Estatus de agosto', fecha: '2026-08-10T18:00:00.000Z',
  estado: 'dada', tieneMinuta: true,
})
const R_SIN_MINUTA = reunion({
  id: 'r-sin-minuta', titulo: 'Kickoff campaña Q3', fecha: '2026-08-05T18:00:00.000Z',
  estado: 'dada', tieneMinuta: false,
})
const R_SIN_PRESENTACION = reunion({
  id: 'r-sin-presentacion', titulo: 'Revisión de creativos', fecha: '2026-08-12T18:00:00.000Z',
  estado: 'dada', tieneMinuta: true, salaSlug: 'mexa-creativa', salaNombre: 'Mexa Creativa', salaColor: '#c0392b',
})
const R_SIN_SALA = reunion({
  id: 'r-sin-sala', titulo: 'Comité de crisis', fecha: '2026-08-15T18:00:00.000Z',
  estado: 'dada', tieneMinuta: false, salaSlug: null, salaNombre: 'Marketing Corp', salaColor: '#E34714',
})
const R_FUTURA = reunion({
  id: 'r-futura', titulo: 'Planeación septiembre', fecha: '2026-08-25T18:00:00.000Z',
  estado: 'agendada',
})
const R_MES_PASADO = reunion({
  id: 'r-mes-pasado', titulo: 'Estatus de julio', fecha: '2026-07-20T18:00:00.000Z',
  estado: 'dada', tieneMinuta: true, salaSlug: 'uix', salaNombre: 'UiX', salaColor: '#2b6cc0',
})
const R_SIN_RESPALDO = reunion({
  id: 'r-sin-respaldo', titulo: 'Standup sin nada encima', fecha: '2026-08-01T18:00:00.000Z',
  estado: 'agendada', salaSlug: 'uix', salaNombre: 'UiX', salaColor: '#2b6cc0',
})
const R_CANCELADA = reunion({
  id: 'r-cancelada', titulo: 'Sesión pospuesta', fecha: '2026-08-08T18:00:00.000Z',
  estado: 'agendada', noDadaEn: '2026-08-09T00:00:00.000Z', tieneMinuta: false,
  salaSlug: 'hof', salaNombre: 'House of Films', salaColor: '#111827',
})

const TODAS = [
  R_COMPLETA, R_SIN_MINUTA, R_SIN_PRESENTACION, R_SIN_SALA,
  R_FUTURA, R_MES_PASADO, R_SIN_RESPALDO, R_CANCELADA,
]

const DOCUMENTOS_POR_ID: Record<string, DocumentoCompleto | null> = {
  'r-completa': documento('listo', 5, 5),
  'r-sin-minuta': documento('listo', 5, 5),
  'r-sin-presentacion': documento('borrador', 1, 5),
  'r-sin-sala': null, // sin documento en absoluto — comité, nace de una minuta suelta
  'r-futura': documento('borrador', 0, 5),
  'r-mes-pasado': documento('listo', 5, 5),
  'r-sin-respaldo': null,
  'r-cancelada': documento('listo', 5, 5), // tiene respaldo, pero noDadaEn manda
}

beforeEach(() => {
  exigirLecturaMock.mockReset().mockResolvedValue({ rol: 'equipo', rolApp: 'viewer', sub: 'equipo-mkt-corp' })
  listarReunionesMock.mockReset().mockResolvedValue(TODAS)
  documentoDeReunionMock.mockReset().mockImplementation((id: string) =>
    Promise.resolve(DOCUMENTOS_POR_ID[id] ?? null),
  )
  panelAgendaPropsMock.mockClear()
  vi.useFakeTimers()
  vi.setSystemTime(HOY)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('PagReuniones (/reuniones) — la lectura se exige antes de listar nada', () => {
  it('sin exigirLectura(), la página rechaza y listarReuniones ni se llama', async () => {
    exigirLecturaMock.mockRejectedValueOnce(new Error('Necesitas una cuenta de Marketing Corporativo para ver esto.'))

    await expect(PagReuniones()).rejects.toThrow('Necesitas una cuenta')

    expect(listarReunionesMock).not.toHaveBeenCalled()
  })
})

describe('PagReuniones (/reuniones) — el calendario y "agendar" (PanelAgenda) se mudan tal cual', () => {
  it('renderiza PanelAgenda con TODAS las reuniones (la vista de "próximas" filtra del lado del panel, no aquí)', async () => {
    render(await PagReuniones())

    expect(screen.getByTestId('panel-agenda-stub')).toBeInTheDocument()
    expect(panelAgendaPropsMock).toHaveBeenCalledTimes(1)
    const props = panelAgendaPropsMock.mock.calls[0][0] as { sesiones: unknown[]; salas: unknown[]; hoy: string }
    expect(props.sesiones).toHaveLength(TODAS.length)
    expect(props.salas).toEqual([
      { slug: 'neracode', nombre: 'NeraCode', color: '#101010' },
      { slug: 'mexa-creativa', nombre: 'Mexa Creativa', color: '#c0392b' },
      { slug: 'uix', nombre: 'UiX', color: '#2b6cc0' },
      { slug: 'hof', nombre: 'House of Films', color: '#111827' },
    ])
    expect(props.hoy).toBe(HOY.toISOString())
  })

  it('agendarAction/editarAction que recibe PanelAgenda son las de ./acciones (mudadas a su propio archivo)', async () => {
    const { agendarReunionAction, editarReunionAction } = await import('./acciones')

    render(await PagReuniones())

    const props = panelAgendaPropsMock.mock.calls[0][0] as {
      agendarAction: unknown
      editarAction: unknown
    }
    expect(props.agendarAction).toBe(agendarReunionAction)
    expect(props.editarAction).toBe(editarReunionAction)
  })
})

describe('PagReuniones (/reuniones) — "Ya dadas este mes"', () => {
  it('cuenta y agrupa solo lo que fueDada() Y es de este mes — ni lo futuro, ni lo de otro mes, ni lo sin respaldo, ni lo cancelado', async () => {
    render(await PagReuniones())

    expect(screen.getByText(/ya dadas este mes/i)).toBeInTheDocument()
    // Las 4 que sí cuentan: completa, sin-minuta, sin-presentación, sin-sala.
    expect(within(screen.getByText(/ya dadas este mes/i).closest('section')!).getByText('4')).toBeInTheDocument()

    for (const titulo of [R_COMPLETA.titulo, R_SIN_MINUTA.titulo, R_SIN_PRESENTACION.titulo, R_SIN_SALA.titulo]) {
      expect(screen.getByText(titulo)).toBeInTheDocument()
    }
    // Las 4 que NO: futura (no pasó), mes pasado (fueDada pero no es agosto),
    // sin respaldo (nada que la respalde, aunque el día ya pasó), cancelada
    // (noDadaEn manda sobre el respaldo que sí tiene).
    for (const titulo of [R_FUTURA.titulo, R_MES_PASADO.titulo, R_SIN_RESPALDO.titulo, R_CANCELADA.titulo]) {
      expect(screen.queryByText(titulo)).not.toBeInTheDocument()
    }
  })

  it('dice lo que le falta a cada una: "Falta la minuta" (sin minuta) y "Sin presentación" (sin documento listo ni archivos)', async () => {
    render(await PagReuniones())

    // Exactamente 2 con minuta pendiente (sin-minuta, sin-sala) y 2 sin
    // presentación (sin-presentación, sin-sala) — sin-sala lleva las dos.
    expect(screen.getAllByText('Falta la minuta')).toHaveLength(2)
    expect(screen.getAllByText('Sin presentación')).toHaveLength(2)
  })

  it('una reunión completa (documento listo Y minuta) no lleva ninguna etiqueta de faltante', async () => {
    render(await PagReuniones())

    const fila = screen.getByText(R_COMPLETA.titulo).closest('li')!
    expect(within(fila).queryByText('Falta la minuta')).not.toBeInTheDocument()
    expect(within(fila).queryByText('Sin presentación')).not.toBeInTheDocument()
  })

  it('una reunión SIN SALA (comité, Tarea 8b) aparece agrupada bajo "Marketing Corp" — no rompe el agrupado ni sale sin nombre', async () => {
    render(await PagReuniones())

    expect(screen.getByText('Marketing Corp')).toBeInTheDocument()
    const grupo = screen.getByText('Marketing Corp').closest('div')!
    expect(within(grupo).getByText(R_SIN_SALA.titulo)).toBeInTheDocument()
  })

  it('sin ninguna reunión dada este mes, se lee un vacío explícito en vez de una sección en blanco', async () => {
    listarReunionesMock.mockResolvedValue([R_FUTURA, R_MES_PASADO])

    render(await PagReuniones())

    expect(screen.getByText(/ya dadas este mes/i)).toBeInTheDocument()
    expect(screen.getByText(/ninguna reuni.n.*se ha dado/i)).toBeInTheDocument()
  })
})

/**
 * `reunionesDadasEsteMesPorSala` — la función pura detrás del bloque de
 * arriba, exportada con nombre para probarla sin montar React. Recibe `hoy`
 * como parámetro (no lee `new Date()` por su cuenta) — mismo criterio que
 * `fueDada`/`textoProxima` (`dominio/reunion.ts`, `lib/fecha.ts`): quien
 * necesita fijar "ahora" en un test lo pasa, no pelea con temporizadores
 * falsos.
 */
describe('reunionesDadasEsteMesPorSala — el mes se ancla a America/Mexico_City, no a UTC', () => {
  it('una reunión a las 22:00 CDMX del día 30 (=04:00 UTC del día 1) cuenta en el mes de JUNIO, no julio', async () => {
    // "hoy": 2026-07-01T02:00 UTC = 2026-06-30T20:00 CDMX → hoyCivil
    // '2026-06-30', mes '2026-06'. Mismo instante que usa
    // `agenda/[token]/page.test.ts` para fijar esta misma regla.
    const hoy = new Date('2026-07-01T02:00:00.000Z')
    // 2026-07-01T04:00 UTC = 2026-06-30T22:00 CDMX: por el RELOJ (UTC) ya es
    // julio; por el DÍA CIVIL en México sigue siendo el 30 de junio. Si el
    // agrupador comparara `fecha.slice(0, 7)` a pelo (sin `diaCivil`), esta
    // reunión caería en "2026-07" y el test de abajo fallaría.
    const trampa = reunion({
      id: 'r-trampa', titulo: 'Trampa de huso horario', fecha: '2026-07-01T04:00:00.000Z', estado: 'dada',
    })

    const grupos = reunionesDadasEsteMesPorSala([trampa], [documento('listo', 1, 1)], hoy)

    expect(grupos.flatMap((g) => g.reuniones).map((r) => r.id)).toEqual(['r-trampa'])
  })

  it('"hoy" nunca cuenta como "ya pasado" para la deducción automática (mismo criterio que fueDada)', () => {
    const hoy = new Date('2026-08-19T18:00:00.000Z') // 12:00 CDMX
    const deHoy = reunion({
      id: 'r-de-hoy', titulo: 'Reunión de esta misma tarde', fecha: '2026-08-19T20:00:00.000Z', estado: 'agendada',
    })

    const grupos = reunionesDadasEsteMesPorSala([deHoy], [documento('listo', 1, 1)], hoy)

    expect(grupos).toEqual([])
  })

  it('con respaldo Y el día ya estrictamente pasado, se deduce dada aunque nadie la haya confirmado a mano', () => {
    const hoy = new Date('2026-08-19T18:00:00.000Z')
    const ayer = reunion({
      id: 'r-ayer', titulo: 'Reunión de ayer, nunca confirmada', fecha: '2026-08-18T18:00:00.000Z', estado: 'agendada',
    })

    const grupos = reunionesDadasEsteMesPorSala([ayer], [documento('listo', 1, 1)], hoy)

    expect(grupos.flatMap((g) => g.reuniones).map((r) => r.id)).toEqual(['r-ayer'])
  })

  it('agrupa alfabéticamente por nombre de sala (es), y dentro de cada grupo, la más reciente primero', () => {
    const hoy = new Date('2026-08-19T18:00:00.000Z')
    const uixVieja = reunion({
      id: 'uix-vieja', fecha: '2026-08-02T18:00:00.000Z', estado: 'dada',
      salaSlug: 'uix', salaNombre: 'UiX', salaColor: '#2b6cc0',
    })
    const uixNueva = reunion({
      id: 'uix-nueva', fecha: '2026-08-16T18:00:00.000Z', estado: 'dada',
      salaSlug: 'uix', salaNombre: 'UiX', salaColor: '#2b6cc0',
    })
    const marketingCorp = reunion({
      id: 'mc', fecha: '2026-08-04T18:00:00.000Z', estado: 'dada',
      salaSlug: null, salaNombre: 'Marketing Corp', salaColor: '#E34714',
    })

    const grupos = reunionesDadasEsteMesPorSala(
      [uixVieja, uixNueva, marketingCorp],
      [documento('listo', 1, 1), documento('listo', 1, 1), documento('listo', 1, 1)],
      hoy,
    )

    expect(grupos.map((g) => g.salaNombre)).toEqual(['Marketing Corp', 'UiX'])
    expect(grupos.find((g) => g.salaNombre === 'UiX')!.reuniones.map((r) => r.id)).toEqual(['uix-nueva', 'uix-vieja'])
  })
})
