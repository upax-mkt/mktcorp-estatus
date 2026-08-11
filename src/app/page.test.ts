import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { EstadoSala } from '@/dominio/salas'
import type { Reunion } from '@/dominio/reunion'

/**
 * El Home (`/`). SIN TEST HASTA AHORA — esta suite es DELIBERADAMENTE
 * ACOTADA: fija solo el hallazgo 1 de la revisión final de la ronda 10
 * ("Levantar minuta" volvía a exigir papeleo), no intenta cubrir el resto de
 * esta página (acuerdos, calendario, agendar rápido, salir...). Mismo
 * criterio de mocking que `reuniones/page.test.tsx`: los componentes hijos
 * se sustituyen por dobles que capturan sus props — no hace falta un App
 * Router real montado ni abrir ningún `<dialog>` para comprobar QUÉ LE LLEGA
 * a `ModuloMinutas`.
 */

const exigirLecturaMock = vi.fn()
vi.mock('@/auth/roles', () => ({
  exigirLectura: () => exigirLecturaMock(),
  exigirEditor: vi.fn(),
  esAdmin: vi.fn().mockResolvedValue(false),
}))

// `connection()` (next/server), llamado FUERA de cualquier render real de
// Next, revienta con "invariant expected a request store" — mismo motivo por
// el que `reuniones/page.test.tsx` la mockea.
vi.mock('next/server', () => ({ connection: vi.fn().mockResolvedValue(undefined) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const estadoDeSalasMock = vi.fn()
// Reconfigurable por test (mismo patrón que `estadoDeSalasMock`): hace falta
// para probar el singular/plural del pulso (extra de la auditoría UX/UI,
// ronda 11) sin depender del valor fijo que bastaba hasta ahora.
const pulsoDelMesMock = vi.fn()
/**
 * El desplegable de Clientes de la barra pide la lista de salas
 * (`clientesParaBarra()`); esta suite no va de eso, así que se dobla.
 */
vi.mock('@/db/temas', () => ({
  slugsDeSalas: () => Promise.resolve(['neracode', 'mexa-creativa']),
  cargarTemas: () => Promise.resolve({
    neracode: { nombre: 'NeraCode', primario: '#101010' },
    'mexa-creativa': { nombre: 'Mexa Creativa', primario: '#c0392b' },
  }),
}))

vi.mock('@/db/consultas', () => ({
  estadoDeSalas: () => estadoDeSalasMock(),
  ordenarPorProximaReunion: (salas: EstadoSala[]) => salas,
  temperatura: vi.fn().mockReturnValue('reciente'),
  acuerdosAbiertos: vi.fn().mockReturnValue(0),
  acuerdosVencidos: vi.fn().mockReturnValue(0),
  todosLosAcuerdos: vi.fn().mockResolvedValue([]),
  pulsoDelMes: () => pulsoDelMesMock(),
}))

vi.mock('@/db/acuerdos', () => ({
  moverEstatus: vi.fn(),
  editarAcuerdo: vi.fn(),
}))

vi.mock('@/app/acuerdos/acciones', () => ({
  destacarAction: vi.fn(),
}))

vi.mock('@/db/reuniones', () => ({
  listarReuniones: vi.fn().mockResolvedValue([]),
  marcarDada: vi.fn(),
  marcarNoDada: vi.fn(),
  desmarcarNoDada: vi.fn(),
}))

const crearReunionConDocumentoMock = vi.fn()
vi.mock('@/db/documentos', () => ({
  crearReunionConDocumento: (...args: unknown[]) => crearReunionConDocumentoMock(...args),
}))

vi.mock('@/db/participacion', () => ({
  registrarEdicion: vi.fn(),
}))

vi.mock('@/db/personas', () => ({
  directorio: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/db/plantillas', () => ({
  moldeDeMinuta: vi.fn().mockResolvedValue({}),
  guardarMoldeDeMinuta: vi.fn(),
}))

vi.mock('@/auth/sesion', () => ({
  cerrarSesion: vi.fn(),
}))

vi.mock('@/db/cliente', () => ({
  hayDB: vi.fn().mockReturnValue(true),
}))

// Componentes hijos: dobles mudos — nada de este archivo necesita verlos
// pintados, solo saber qué prop les llegó. Mismo patrón que `PanelAgenda` en
// `reuniones/page.test.tsx`.
vi.mock('@/componentes/hogar/ModuloAcuerdos', () => ({ ModuloAcuerdos: () => null }))
vi.mock('@/componentes/hogar/ModuloCalendario', () => ({ ModuloCalendario: () => null }))
// Captura props (mismo patrón que `moduloMinutasPropsMock`, más abajo): hace
// falta para poder invocar `agendar` (el cierre de `agendarRapidoAction`)
// desde fuera y comprobar qué le llega a `crearReunionConDocumento` — ver el
// describe "Agendar rápido" (auditoría UX/UI, ronda 11).
const agendarRapidoPropsMock = vi.fn()
vi.mock('@/componentes/hogar/AgendarRapido', () => ({
  AgendarRapido: (props: unknown) => {
    agendarRapidoPropsMock(props)
    return null
  },
}))
vi.mock('@/componentes/ReunionesPorConfirmar', () => ({ ReunionesPorConfirmar: () => null }))

const moduloMinutasPropsMock = vi.fn()
vi.mock('@/componentes/hogar/ModuloMinutas', () => ({
  ModuloMinutas: (props: unknown) => {
    moduloMinutasPropsMock(props)
    return null
  },
}))

const { default: Hub } = await import('./page')

const REUNION_BASE: Reunion = {
  id: 'r1',
  fecha: '2026-07-15T10:00:00.000Z',
  titulo: 'Quincenal julio',
  tipo: 'mensual',
  estado: 'agendada',
  noDadaEn: null,
  documentoListo: false,
  archivos: [],
  acuerdos: [],
}

const SALA_BASE: EstadoSala = {
  slug: 'neracode',
  nombre: 'NeraCode',
  color: '#101010',
  logoUrl: null,
  diasDesdeUltima: null,
  ultimaSesion: null,
  proximaReunion: null,
  enPreparacion: false,
  acuerdos: [],
  reuniones: [],
  cadencia: 'mensual',
  activa: true,
  pausadaDesde: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  exigirLecturaMock.mockResolvedValue({ rol: 'equipo', rolApp: 'viewer', sub: 'equipo-mkt-corp' })
  estadoDeSalasMock.mockResolvedValue([])
  pulsoDelMesMock.mockResolvedValue({
    salas: 0, reunionesEsteMes: 0, reunionesDadas: 0, acuerdosAbiertos: 0, acuerdosVencidos: 0,
    salaMasDesatendida: null,
  })
})

/**
 * HALLAZGO 1 DE LA REVISIÓN FINAL (ronda 10) — "Levantar minuta" volvió a
 * exigir papeleo, Y ES UNA REGRESIÓN DE LA LECCIÓN DE LA RONDA 4.
 *
 * `sinMinuta` (lo que llega a `ModuloMinutas` como `pendientes`) llamaba a
 * `sesionesMinutables` (dominio/salas.ts) sobre `reuniones` —el
 * `ReunionResumen[]` plano de `listarReuniones()`—, cuyo filtro `estado !==
 * 'borrador' && estado !== 'agendada'` se escribió para el modelo viejo de
 * cinco estados. Con `EstadoReunion = 'agendada' | 'dada'` (ronda 10) ese
 * filtro pasó a significar SOLO 'dada': una reunión maquetada (con su
 * documento LISTO) pero sin confirmar a mano no aparecía como pendiente de
 * minutar, pese a que el propio comentario de la función dice lo contrario.
 *
 * El reemplazo, `reunionesMinutables` (dominio/reunion.ts, escrita en esta
 * misma ronda), opera sobre las `Reunion[]` de CADA sala
 * (`salasCrudas[].reuniones`, con su respaldo completo ya cosido) y usa el
 * criterio correcto: `estado === 'dada' || tienePresentacion(r)`.
 */
describe('Hub (/) — "Levantar minuta" no exige confirmar a mano (hallazgo 1)', () => {
  it('una reunión maquetada (agendada, documento listo) cuyo día ya pasó llega a ModuloMinutas como pendiente', async () => {
    estadoDeSalasMock.mockResolvedValue([
      { ...SALA_BASE, reuniones: [{ ...REUNION_BASE, id: 'r-maquetada', documentoListo: true }] },
    ])

    render(await Hub())

    const props = moduloMinutasPropsMock.mock.calls[0][0] as { pendientes: Array<{ id: string }> }
    expect(props.pendientes.map((p) => p.id)).toContain('r-maquetada')
  })

  it('una agendada SIN ningún respaldo no aparece como pendiente: no hay nada que transcribir', async () => {
    estadoDeSalasMock.mockResolvedValue([
      { ...SALA_BASE, reuniones: [{ ...REUNION_BASE, id: 'r-sin-respaldo', documentoListo: false }] },
    ])

    render(await Hub())

    const props = moduloMinutasPropsMock.mock.calls[0][0] as { pendientes: Array<{ id: string }> }
    expect(props.pendientes.map((p) => p.id)).not.toContain('r-sin-respaldo')
  })

  it('una ya explícitamente dada, sin minuta, sigue apareciendo (lo explícito nunca se pierde)', async () => {
    estadoDeSalasMock.mockResolvedValue([
      { ...SALA_BASE, reuniones: [{ ...REUNION_BASE, id: 'r-dada', estado: 'dada' }] },
    ])

    render(await Hub())

    const props = moduloMinutasPropsMock.mock.calls[0][0] as { pendientes: Array<{ id: string }> }
    expect(props.pendientes.map((p) => p.id)).toContain('r-dada')
  })

  it('cruza dos salas y ordena de la más reciente a la más antigua, con el nombre/color de SU sala', async () => {
    estadoDeSalasMock.mockResolvedValue([
      {
        ...SALA_BASE, slug: 'neracode', nombre: 'NeraCode', color: '#101010',
        reuniones: [{ ...REUNION_BASE, id: 'r-vieja', fecha: '2026-06-01T10:00:00.000Z', documentoListo: true }],
      },
      {
        ...SALA_BASE, slug: 'uix', nombre: 'UiX', color: '#2b6cc0',
        reuniones: [{ ...REUNION_BASE, id: 'r-nueva', fecha: '2026-07-20T10:00:00.000Z', documentoListo: true }],
      },
    ])

    render(await Hub())

    const props = moduloMinutasPropsMock.mock.calls[0][0] as {
      pendientes: Array<{ id: string; salaNombre?: string }>
    }
    expect(props.pendientes.map((p) => p.id)).toEqual(['r-nueva', 'r-vieja'])
    expect(props.pendientes.find((p) => p.id === 'r-nueva')?.salaNombre).toBe('UiX')
    expect(props.pendientes.find((p) => p.id === 'r-vieja')?.salaNombre).toBe('NeraCode')
  })
})

/**
 * EXTRA DE LA AUDITORÍA UX/UI (ronda 11): la fila de estadísticas decía "1
 * YA SE DIERON" y "1 VENCIDOS" —plural con número singular— y "Los clientes"
 * decía "ORDENADAS por próxima reunión" —adjetivo femenino para un sustantivo
 * masculino—. Mismo criterio que ya usa esta misma pantalla más abajo, en la
 * píldora de cada tarjeta de sala (`vencido{vencidos > 1 ? 's' : ''}`).
 */
describe('Hub (/) — singular/plural del pulso y género de "Los clientes" (extra de la auditoría UX/UI)', () => {
  it('con exactamente 1 reunión ya dada dice "ya se dio", no "ya se dieron"', async () => {
    pulsoDelMesMock.mockResolvedValue({
      salas: 0, reunionesEsteMes: 1, reunionesDadas: 1, acuerdosAbiertos: 0, acuerdosVencidos: 0,
      salaMasDesatendida: null,
    })

    render(await Hub())

    expect(screen.getByText('ya se dio')).toBeInTheDocument()
    expect(screen.queryByText('ya se dieron')).not.toBeInTheDocument()
  })

  it('con más de 1 reunión ya dada sigue diciendo "ya se dieron"', async () => {
    pulsoDelMesMock.mockResolvedValue({
      salas: 0, reunionesEsteMes: 2, reunionesDadas: 2, acuerdosAbiertos: 0, acuerdosVencidos: 0,
      salaMasDesatendida: null,
    })

    render(await Hub())

    expect(screen.getByText('ya se dieron')).toBeInTheDocument()
  })

  it('con 0 reuniones dadas dice "ya se dieron" (plural por defecto, como antes)', async () => {
    render(await Hub())

    expect(screen.getByText('ya se dieron')).toBeInTheDocument()
  })

  it('con exactamente 1 acuerdo vencido dice "vencido", no "vencidos"', async () => {
    pulsoDelMesMock.mockResolvedValue({
      salas: 0, reunionesEsteMes: 0, reunionesDadas: 0, acuerdosAbiertos: 0, acuerdosVencidos: 1,
      salaMasDesatendida: null,
    })

    render(await Hub())

    expect(screen.getByText('vencido')).toBeInTheDocument()
    expect(screen.queryByText('vencidos')).not.toBeInTheDocument()
  })

  it('con más de 1 acuerdo vencido sigue diciendo "vencidos"', async () => {
    pulsoDelMesMock.mockResolvedValue({
      salas: 0, reunionesEsteMes: 0, reunionesDadas: 0, acuerdosAbiertos: 0, acuerdosVencidos: 3,
      salaMasDesatendida: null,
    })

    render(await Hub())

    expect(screen.getByText('vencidos')).toBeInTheDocument()
  })

  it('"Los clientes" ordena con adjetivo masculino: "ordenados", no "ordenadas"', async () => {
    render(await Hub())

    expect(screen.getByText('ordenados por próxima reunión')).toBeInTheDocument()
    expect(screen.queryByText('ordenadas por próxima reunión')).not.toBeInTheDocument()
  })
})

/**
 * AGENDAR RÁPIDO: EL TÍTULO LLEGA HASTA LA BASE (auditoría UX/UI, ronda 11).
 *
 * `AgendarRapido.tsx` gana un campo de Título opcional en esta misma ronda —
 * pero un campo que el componente recoge y nadie reenvía es exactamente el
 * defecto de rondas pasadas que el brief pide no repetir ("se construyó, se
 * probó, y nadie lo montó en pantalla"): `agendarRapidoAction`, AQUÍ, mandaba
 * `titulo: ''` FIJO a `crearReunionConDocumento` sin mirar `datos.titulo` —
 * cualquier cosa que el formulario recogiera se perdía en este único punto de
 * paso. Este describe es la prueba de que ya no: lo que llega en `datos`
 * viaja tal cual hasta la llamada a la base.
 */
describe('Hub (/) — "Agendar rápido" manda el título hasta la base (auditoría UX/UI, ronda 11)', () => {
  it('un título escrito viaja de agendar() a crearReunionConDocumento, sin quedarse fijo en una cadena vacía', async () => {
    render(await Hub())

    const { agendar } = agendarRapidoPropsMock.mock.calls[0][0] as {
      agendar: (datos: {
        salaSlug: string; dia: string; hora: string; tipo: string; titulo: string
      }) => Promise<{ error?: string }>
    }
    await agendar({
      salaSlug: 'neracode', dia: '2026-08-19', hora: '10:00', tipo: 'mensual',
      titulo: 'Estatus Comercial Quincenal',
    })

    expect(crearReunionConDocumentoMock).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Estatus Comercial Quincenal' }),
    )
  })

  it('sin título, manda cadena vacía — crearReunionConDocumento es quien sabe convertirla en un título por defecto legible', async () => {
    render(await Hub())

    const { agendar } = agendarRapidoPropsMock.mock.calls[0][0] as {
      agendar: (datos: {
        salaSlug: string; dia: string; hora: string; tipo: string; titulo: string
      }) => Promise<{ error?: string }>
    }
    await agendar({ salaSlug: 'neracode', dia: '2026-08-19', hora: '10:00', tipo: 'mensual', titulo: '' })

    expect(crearReunionConDocumentoMock).toHaveBeenCalledWith(expect.objectContaining({ titulo: '' }))
  })
})
