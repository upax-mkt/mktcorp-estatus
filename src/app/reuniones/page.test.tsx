import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { ReunionResumen } from '@/db/reuniones'
import type { DocumentoCompleto } from '@/db/documentos'

/**
 * `/reuniones` (Tarea 13, ronda 10 — "el ciclo de vida entero" desde la tarea
 * 18): el calendario y "agendar" (`PanelAgenda`, mudado TAL CUAL desde
 * `/agenda`, sin tocar) más las cuatro preguntas del ciclo de una reunión que
 * ya pasó su día — "Próximas" ya vive DENTRO de `PanelAgenda` ("Lo que
 * viene"), así que esta pestaña añade "Por confirmar", "Se dieron, falta su
 * minuta" y "Cerradas". Reemplaza al viejo bloque único "Ya dadas este mes"
 * (con sus etiquetas "Sin presentación"/"Falta la minuta"), absorbido por los
 * tres módulos nuevos — Tarea 18, brief §2.
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
 * `ReunionesPorConfirmar` (tarea 18) se mockea por el mismo motivo 1: es
 * Client Component, y ya tiene su propia suite — aquí solo importa que esta
 * página la monte con los datos y las acciones correctas.
 *
 * Mismo criterio que ya usa este repo para mockear un componente hermano
 * (`ModoPresentar.test.tsx`: `vi.mock('./GrabarReunion', ...)`) — no es una
 * técnica nueva.
 *
 * Lo que SÍ corre de verdad: `fueDada`/`reunionesPorConfirmar`/
 * `reunionesMinutables` (`dominio/reunion`) y `diaCivil` (`lib/fecha`) — es
 * la lógica de esta tarea, y mockearla sería no probar nada. La pieza más
 * importante de esta suite es `cicloDeReuniones` (más abajo), exportada con
 * nombre para probarla directo, sin montar React: es donde vive LA REGLA
 * DURA — ninguna reunión sale en dos módulos a la vez.
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
  marcarPresentadaAction: vi.fn(),
  marcarNoDadaAction: vi.fn(),
  desmarcarNoDadaAction: vi.fn(),
}))

// `slugsDeSalasPausadas` (tarea 18): "Por confirmar" respeta el freeze de
// sala (`reunionesPorConfirmar`, dominio/reunion.ts) — sin esto no hay cómo
// saber qué sala está en pausa desde esta pantalla.
const slugsDeSalasPausadasMock = vi.fn()
vi.mock('@/db/salas', () => ({
  slugsDeSalasPausadas: () => slugsDeSalasPausadasMock(),
}))

const panelAgendaPropsMock = vi.fn()
vi.mock('@/componentes/agenda/PanelAgenda', () => ({
  PanelAgenda: (props: unknown) => {
    panelAgendaPropsMock(props)
    return <div data-testid="panel-agenda-stub">calendario + agendar (stub)</div>
  },
}))

// `ReunionesPorConfirmar` (tarea 18) SE MOCKEA aquí por el mismo motivo que
// `PanelAgenda`: es un Client Component con `useState`/`useTransition` propio,
// y ya tiene su propia suite (`ReunionesPorConfirmar.test.tsx`) que cubre su
// UI — aquí solo importa que `/reuniones` la monte con las reuniones y las
// acciones correctas.
const reunionesPorConfirmarPropsMock = vi.fn()
vi.mock('@/componentes/ReunionesPorConfirmar', () => ({
  ReunionesPorConfirmar: (props: unknown) => {
    reunionesPorConfirmarPropsMock(props)
    return <div data-testid="reuniones-por-confirmar-stub">por confirmar (stub)</div>
  },
}))

const { default: PagReuniones, cicloDeReuniones } = await import('./page')

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
  slugsDeSalasPausadasMock.mockReset().mockResolvedValue(new Set())
  panelAgendaPropsMock.mockClear()
  reunionesPorConfirmarPropsMock.mockClear()
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

/**
 * `cicloDeReuniones` — la función pura detrás de las tres secciones nuevas
 * (tarea 18), exportada con nombre para probarla sin montar React. Recibe
 * `hoyCivil` como parámetro (no lee `new Date()` por su cuenta) — mismo
 * criterio que `fueDada`/`reunionesPorConfirmar` (`dominio/reunion.ts`):
 * quien necesita fijar "ahora" en un test lo pasa, no pelea con
 * temporizadores falsos.
 *
 * ESTA ES LA PIEZA QUE FIJA LA REGLA DURA: ninguna reunión puede salir en dos
 * de los tres módulos a la vez — exactamente el defecto que la revisión
 * final de la ronda 10 ya arregló una vez, entre "En preparación" y "Por
 * confirmar" en `/deck`. `reunionesPorConfirmar` y `reunionesMinutables`
 * (`dominio/reunion.ts`) NO son, por sí solas, mutuamente excluyentes: una
 * reunión `agendada`, con respaldo y el día ya pasado, cumple el criterio de
 * las dos —`reunionesPorConfirmar` porque nadie dijo si se dio, y
 * `reunionesMinutables` porque `tienePresentacion` ya es cierto— y
 * `guardarMinuta` (`src/db/minutas.ts`) NO toca `estado` a propósito, así
 * que hasta una reunión YA MINUTADA puede seguir sin confirmar. Por eso
 * "falta su minuta" y "cerradas" excluyen explícitamente lo que "por
 * confirmar" ya se quedó: la pregunta "¿se dio?" manda mientras siga
 * abierta.
 */
describe('cicloDeReuniones — la regla dura: ninguna reunión en dos módulos a la vez', () => {
  const HOY_CIVIL = '2026-08-19' // mismo día que HOY, más abajo (12:00 CDMX)

  it('deducida como dada (respaldo + día pasado) pero SIN confirmar: "por confirmar", NUNCA "falta su minuta" — aunque reunionesMinutables también la aceptaría', () => {
    const r = reunion({ id: 'r1', titulo: 'Deducida sin minutar', fecha: '2026-08-10T18:00:00.000Z', estado: 'agendada' })

    const ciclo = cicloDeReuniones([r], [documento('listo', 5, 5)], new Set(), HOY_CIVIL)

    expect(ciclo.porConfirmar.map((x) => x.id)).toEqual(['r1'])
    expect(ciclo.faltaMinuta.map((x) => x.id)).not.toContain('r1')
    expect(ciclo.cerradas.map((x) => x.id)).not.toContain('r1')
  })

  it('YA MINUTADA pero sin confirmar (guardarMinuta no toca `estado`): "por confirmar", NUNCA "cerradas"', () => {
    const r = reunion({
      id: 'r2', titulo: 'Minutada sin confirmar', fecha: '2026-08-11T18:00:00.000Z',
      estado: 'agendada', tieneMinuta: true,
    })

    const ciclo = cicloDeReuniones([r], [documento('listo', 5, 5)], new Set(), HOY_CIVIL)

    expect(ciclo.porConfirmar.map((x) => x.id)).toEqual(['r2'])
    expect(ciclo.cerradas.map((x) => x.id)).not.toContain('r2')
    expect(ciclo.faltaMinuta.map((x) => x.id)).not.toContain('r2')
  })

  it('una vez CONFIRMADA (estado dada) sin minuta: pasa a "falta su minuta" y sale de "por confirmar"', () => {
    const r = reunion({
      id: 'r3', titulo: 'Confirmada, sin minuta', fecha: '2026-08-10T18:00:00.000Z',
      estado: 'dada', tieneMinuta: false,
    })

    const ciclo = cicloDeReuniones([r], [documento('listo', 5, 5)], new Set(), HOY_CIVIL)

    expect(ciclo.faltaMinuta.map((x) => x.id)).toEqual(['r3'])
    expect(ciclo.porConfirmar.map((x) => x.id)).not.toContain('r3')
    expect(ciclo.cerradas.map((x) => x.id)).not.toContain('r3')
  })

  it('CONFIRMADA y MINUTADA: "cerradas", nada más', () => {
    const r = reunion({
      id: 'r4', titulo: 'Cerrada', fecha: '2026-08-10T18:00:00.000Z',
      estado: 'dada', tieneMinuta: true,
    })

    const ciclo = cicloDeReuniones([r], [documento('listo', 5, 5)], new Set(), HOY_CIVIL)

    expect(ciclo.cerradas.map((x) => x.id)).toEqual(['r4'])
    expect(ciclo.porConfirmar.map((x) => x.id)).not.toContain('r4')
    expect(ciclo.faltaMinuta.map((x) => x.id)).not.toContain('r4')
  })

  it('una sala en pausa no ofrece confirmar/negar (freeze — mismo criterio que crearReunion), pero la reunión sigue contando en "falta su minuta"', () => {
    const r = reunion({
      id: 'r5', titulo: 'Sala en pausa', fecha: '2026-08-10T18:00:00.000Z',
      estado: 'agendada', salaSlug: 'uix', salaNombre: 'UiX',
    })

    const ciclo = cicloDeReuniones([r], [documento('listo', 5, 5)], new Set(['uix']), HOY_CIVIL)

    expect(ciclo.porConfirmar.map((x) => x.id)).not.toContain('r5')
    expect(ciclo.faltaMinuta.map((x) => x.id)).toEqual(['r5'])
  })

  it('noDadaEn sigue en "por confirmar" para poder deshacerse — no desaparece al negarla, y su marca viaja con ella', () => {
    const r = reunion({
      id: 'r6', titulo: 'Negada', fecha: '2026-08-10T18:00:00.000Z',
      estado: 'agendada', noDadaEn: '2026-08-11T00:00:00.000Z',
    })

    const ciclo = cicloDeReuniones([r], [documento('listo', 5, 5)], new Set(), HOY_CIVIL)

    expect(ciclo.porConfirmar).toEqual([
      expect.objectContaining({ id: 'r6', noDadaEn: '2026-08-11T00:00:00.000Z' }),
    ])
    expect(ciclo.faltaMinuta.map((x) => x.id)).not.toContain('r6')
  })

  it('"cerradas" se ordena por fecha, la más reciente primero', () => {
    const vieja = reunion({ id: 'r-vieja', fecha: '2026-06-10T18:00:00.000Z', estado: 'dada', tieneMinuta: true })
    const nueva = reunion({ id: 'r-nueva', fecha: '2026-08-05T18:00:00.000Z', estado: 'dada', tieneMinuta: true })

    const ciclo = cicloDeReuniones(
      [vieja, nueva],
      [documento('listo', 1, 1), documento('listo', 1, 1)],
      new Set(),
      HOY_CIVIL,
    )

    expect(ciclo.cerradas.map((x) => x.id)).toEqual(['r-nueva', 'r-vieja'])
  })

  /**
   * NADA SE PIERDE (brief §2, Step 4): "cada reunión que hoy sale [en 'Ya
   * dadas este mes'] y mañana no salga en ninguno" es el defecto a evitar.
   * Las cuatro que esa sección ya contaba (mismas fixtures que su suite
   * vieja) siguen apareciendo, cada una en exactamente un módulo — y la de
   * OTRO MES, que el viejo filtro por mes excluía, ahora también aparece: el
   * filtro de mes desaparece con la sección que lo aplicaba, a propósito
   * (ninguno de los tres módulos nuevos lo pide).
   */
  it('nada se pierde: las que "Ya dadas este mes" ya contaba siguen apareciendo, cada una en un único módulo — y las de fuera del mes también, ahora que ese filtro desaparece', () => {
    const docs = TODAS.map((r) => DOCUMENTOS_POR_ID[r.id] ?? null)

    const ciclo = cicloDeReuniones(TODAS, docs, new Set(), HOY_CIVIL)

    const idsPorConfirmar = new Set(ciclo.porConfirmar.map((x) => x.id))
    const idsFaltaMinuta = new Set(ciclo.faltaMinuta.map((x) => x.id))
    const idsCerradas = new Set(ciclo.cerradas.map((x) => x.id))

    // Sin solaparse entre sí — ninguna de las tres comparte un id con otra.
    for (const id of idsPorConfirmar) {
      expect(idsFaltaMinuta.has(id)).toBe(false)
      expect(idsCerradas.has(id)).toBe(false)
    }
    for (const id of idsFaltaMinuta) expect(idsCerradas.has(id)).toBe(false)

    // Las cuatro que "Ya dadas este mes" ya contaba, cada una en su módulo:
    expect(idsCerradas.has(R_COMPLETA.id)).toBe(true) // dada + minuta
    expect(idsFaltaMinuta.has(R_SIN_MINUTA.id)).toBe(true) // dada, sin minuta
    expect(idsCerradas.has(R_SIN_PRESENTACION.id)).toBe(true) // dada + minuta (sin presentación ya no separa)
    expect(idsFaltaMinuta.has(R_SIN_SALA.id)).toBe(true) // dada, sin minuta, sin sala

    // La de otro mes: "Ya dadas este mes" la excluía por fecha; sin ese
    // filtro, ahora sí aparece (dada + minuta → cerradas).
    expect(idsCerradas.has(R_MES_PASADO.id)).toBe(true)

    // Las que de verdad no tienen nada que mostrar siguen sin aparecer en
    // ninguno de los tres (correcto: "Próximas" y "sin nada" no son de este
    // módulo — la futura la sigue mostrando PanelAgenda, "sin respaldo" no
    // tiene nada que este ciclo pueda contar).
    for (const id of [R_FUTURA.id, R_SIN_RESPALDO.id]) {
      expect(idsPorConfirmar.has(id) || idsFaltaMinuta.has(id) || idsCerradas.has(id)).toBe(false)
    }

    // La cancelada sigue ofreciéndose para deshacerse, en "por confirmar".
    expect(idsPorConfirmar.has(R_CANCELADA.id)).toBe(true)
  })
})

describe('PagReuniones (/reuniones) — el ciclo de vida entero, en pantalla', () => {
  it('"Por confirmar" monta ReunionesPorConfirmar con las reuniones que corresponde y las tres acciones de ./acciones', async () => {
    // Mismo patrón que el test de agendarAction/editarAction, más abajo:
    // se importa el módulo (mockeado) y se compara contra ESE binding, no
    // contra el mock interno — `./acciones` exporta un wrapper alrededor de
    // cada mock (ver el `vi.mock` de arriba), así que son dos funciones
    // distintas aunque delegen a la misma.
    const { marcarPresentadaAction, marcarNoDadaAction, desmarcarNoDadaAction } = await import('./acciones')
    listarReunionesMock.mockResolvedValue([R_CANCELADA])

    render(await PagReuniones())

    expect(screen.getByText('Por confirmar')).toBeInTheDocument()
    expect(reunionesPorConfirmarPropsMock).toHaveBeenCalledTimes(1)
    const props = reunionesPorConfirmarPropsMock.mock.calls[0][0] as {
      sesiones: Array<{ id: string }>
      marcarPresentadaAction: unknown
      marcarNoDadaAction: unknown
      desmarcarNoDadaAction: unknown
    }
    expect(props.sesiones.map((s) => s.id)).toEqual([R_CANCELADA.id])
    expect(props.marcarPresentadaAction).toBe(marcarPresentadaAction)
    expect(props.marcarNoDadaAction).toBe(marcarNoDadaAction)
    expect(props.desmarcarNoDadaAction).toBe(desmarcarNoDadaAction)
  })

  it('sin nada por confirmar, la sección ni se monta (mismo criterio que el Home)', async () => {
    listarReunionesMock.mockResolvedValue([])

    render(await PagReuniones())

    expect(screen.queryByText('Por confirmar')).not.toBeInTheDocument()
    expect(reunionesPorConfirmarPropsMock).not.toHaveBeenCalled()
  })

  it('"Se dieron, falta su minuta" pinta cada fila enlazada a /deck/{id}/minuta', async () => {
    listarReunionesMock.mockResolvedValue([R_SIN_MINUTA])

    render(await PagReuniones())

    const seccion = screen.getByText('Se dieron, falta su minuta').closest('section')!
    const link = within(seccion).getByText(R_SIN_MINUTA.titulo).closest('a')
    expect(link).toHaveAttribute('href', `/deck/${R_SIN_MINUTA.id}/minuta`)
  })

  it('"Cerradas" pinta cada fila, enlazada a su cliente cuando tiene sala', async () => {
    listarReunionesMock.mockResolvedValue([R_COMPLETA])

    render(await PagReuniones())

    const seccion = screen.getByText('Cerradas').closest('section')!
    const link = within(seccion).getByText(R_COMPLETA.titulo).closest('a')
    expect(link).toHaveAttribute('href', `/cliente/${R_COMPLETA.salaSlug}`)
  })

  it('una reunión CERRADA sin sala (comité) se lee igual, sin enlace roto', async () => {
    const cerradaSinSala = reunion({
      id: 'r-cerrada-sin-sala', titulo: 'Comité cerrado', fecha: '2026-08-05T18:00:00.000Z',
      estado: 'dada', tieneMinuta: true, salaSlug: null, salaNombre: 'Marketing Corp',
    })
    listarReunionesMock.mockResolvedValue([cerradaSinSala])

    render(await PagReuniones())

    const seccion = screen.getByText('Cerradas').closest('section')!
    expect(within(seccion).getByText('Comité cerrado')).toBeInTheDocument()
    expect(within(seccion).queryByRole('link')).not.toBeInTheDocument()
  })

  it('las etiquetas viejas —"Ya dadas este mes", "Sin presentación"— ya no existen', async () => {
    render(await PagReuniones())

    expect(screen.queryByText(/ya dadas este mes/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Sin presentación')).not.toBeInTheDocument()
  })

  it('sin nada pendiente, "falta su minuta" y "cerradas" leen un vacío explícito, no una sección en blanco', async () => {
    listarReunionesMock.mockResolvedValue([])

    render(await PagReuniones())

    expect(screen.getByText('Se dieron, falta su minuta')).toBeInTheDocument()
    expect(screen.getByText(/nada pendiente de minutar/i)).toBeInTheDocument()
    expect(screen.getByText('Cerradas')).toBeInTheDocument()
    expect(screen.getByText(/ninguna reuni.n cerrada/i)).toBeInTheDocument()
  })
})
