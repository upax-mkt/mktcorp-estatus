import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { EstadoSala } from '@/dominio/salas'

/**
 * EL AGUJERO MÁS GRAVE DE LA RONDA 9, Y EL ÚNICO SIN UN TEST QUE SE CAYERA SI
 * ALGUIEN LO REVIERTE (corrección tras la segunda revisión).
 *
 * `generarTokenDeSala` no es una vista previa: firma, en el momento, un link
 * real de 30 días con acceso de lectura a la sala de un cliente. Antes de la
 * corrección, la guarda era `equipo` (cualquier rol) — hoy es `esAdmin()`. Si
 * alguien revierte `const admin = await esAdmin()` a `const admin = equipo`
 * —exactamente el bug original—, este test se cae. Sin él, los 1049 tests
 * seguían en verde con el agujero abierto.
 *
 * Mismo patrón que `reunion/[id]/page.test.ts`: invocar la página como una
 * función async cualquiera (un Server Component de App Router lo es) y mirar
 * qué se llamó, sin renderizar a DOM — los componentes de la vista se
 * referencian como JSX (`_jsx(Componente, props)`), que NO invoca la función
 * del componente; solo `VistaSala` misma se ejecuta.
 */

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/db/temas', () => ({
  cargarTemas: vi.fn().mockResolvedValue({
    neracode: { nombre: 'NeraCode', primario: '#101010', gradiente: ['#101010', '#202020'] },
  }),
  slugsDeSalas: vi.fn().mockResolvedValue(['neracode']),
}))

const SALA_BASE: EstadoSala = {
  slug: 'neracode',
  nombre: 'NeraCode',
  color: '#101010',
  logoUrl: null,
  diasDesdeUltima: null,
  ultimaSesion: null,
  proximaSesion: null,
  enPreparacion: false,
  acuerdos: [],
  presentaciones: [],
  minutas: [],
  cadencia: 'mensual',
  activa: true,
  pausadaDesde: null,
}

// Una sala con dos reuniones reales —presentación con `sesionId`, sin
// minuta— para el bloque de participación más abajo: `SALA_BASE` a propósito
// no tiene ninguna, así que con ella `reuniones` sale `[]` y la pregunta
// "¿se llamó participantesDe?" nunca se ejercitaría de verdad.
const SALA_CON_REUNIONES: EstadoSala = {
  ...SALA_BASE,
  presentaciones: [
    { fecha: '2026-07-15T10:00:00.000Z', titulo: 'Julio', tipo: 'mensual', sesionId: 'sesion-jul' },
    { fecha: '2026-06-15T10:00:00.000Z', titulo: 'Junio', tipo: 'mensual', sesionId: 'sesion-jun' },
  ],
}

// `acuerdosAbiertos`/`acuerdosVencidos`/`estaCongelado` se conservan REALES
// (importOriginal): son derivados puros sobre `EstadoSala` — con `acuerdos:
// []` no tienen nada que fallar, y no hace falta reimplementarlos aquí. Solo
// `estadoDeSala` (lectura real) se sustituye.
//
// `estadoDeSalaMock` sale del `vi.fn()` (antes vivía inline, sin nombre) para
// poder devolver `SALA_CON_REUNIONES` puntualmente en el bloque de
// participación de más abajo, sin tocar el default (`SALA_BASE`) que usa el
// resto de los tests de este archivo.
const estadoDeSalaMock = vi.fn()
vi.mock('@/db/consultas', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('@/db/consultas')>()
  return { ...real, estadoDeSala: (...args: unknown[]) => estadoDeSalaMock(...args) }
})

// El colaborador bajo prueba del bloque "la participación es solo de
// equipo": `participantesDe`. `resumirParticipacion` no hace falta
// mockearla — nunca corre en este archivo, porque `ParticipantesSesion` es
// un componente que aquí solo se referencia como JSX (ver la cabecera).
const participantesDeMock = vi.fn()
vi.mock('@/db/participacion', () => ({
  participantesDe: (...args: unknown[]) => participantesDeMock(...args),
}))

vi.mock('@/db/acuerdos', () => ({
  moverEstatus: vi.fn(),
  editarAcuerdo: vi.fn(),
  crearAcuerdo: vi.fn(),
  eliminarAcuerdo: vi.fn(),
  refrescarDesdeMonday: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/db/personas', () => ({
  directorio: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/monday/cliente', () => ({
  ErrorMonday: class ErrorMonday extends Error {},
}))

vi.mock('@/db/benchmark', () => ({
  obtenerBenchmark: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/db/archivos', () => ({
  listarArchivos: vi.fn().mockResolvedValue([]),
  registrarArchivo: vi.fn(),
  editarArchivo: vi.fn(),
  eliminarArchivo: vi.fn(),
}))

vi.mock('@vercel/blob', () => ({
  del: vi.fn(),
}))

vi.mock('@/db/claves', () => ({
  estadoDeClave: vi.fn(),
  regenerarClave: vi.fn(),
  quitarClave: vi.fn(),
}))

// El colaborador bajo prueba: `generarTokenDeSala`. El resto de
// `@/auth/sesion` que usa esta página, mockeado con lo mínimo para que el
// camino de lectura llegue completo sin lanzar — `puedeVerEstaSala` en
// `true` (si no, `notFound()` corta antes de llegar a la línea que importa).
const generarTokenDeSalaMock = vi.fn()
vi.mock('@/auth/sesion', () => ({
  secretoConfigurado: vi.fn().mockReturnValue(null),
  puedeEditarAcuerdosDe: vi.fn().mockResolvedValue(false),
  puedeVerEstaSala: vi.fn().mockResolvedValue(true),
  generarTokenDeSala: (...args: unknown[]) => generarTokenDeSalaMock(...args),
  cerrarSesion: vi.fn(),
  exigirEdicionDeAcuerdos: vi.fn(),
}))

vi.mock('@/db/sesiones', () => ({
  crearSesionConEstructura: vi.fn(),
  listarSesiones: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/app/acuerdos/acciones', () => ({
  pausarSalaAction: vi.fn(),
  reactivarSalaAction: vi.fn(),
  destacarAction: vi.fn(),
}))

// Los dos predicados de la ronda 9 bajo control directo — son el eje del
// test: `esLector()` decide si `equipo` (visibilidad general) es `true`,
// `esAdmin()` decide si se genera el token.
const esAdminMock = vi.fn()
const esLectorMock = vi.fn()
vi.mock('@/auth/roles', () => ({
  esAdmin: () => esAdminMock(),
  esLector: () => esLectorMock(),
  exigirAdmin: vi.fn(),
  exigirEditor: vi.fn(),
}))

const { default: VistaSala } = await import('./page')

beforeEach(() => {
  vi.clearAllMocks()
  // `urlBase()` (real, sin mockear) resuelve sin tocar `next/headers` en
  // cuanto `APP_URL` está definida — hace falta para el caso admin, donde
  // `tokenDeAcceso` sale verdadero y la JSX arma el link con `await urlBase()`.
  process.env.APP_URL = 'https://mktcorp-estatus.example'
  generarTokenDeSalaMock.mockResolvedValue('token-firmado-de-prueba')
  // Default para todo el archivo: la sala sin reuniones. El bloque de
  // participación lo pisa puntualmente con `mockResolvedValueOnce`.
  estadoDeSalaMock.mockResolvedValue(SALA_BASE)
  participantesDeMock.mockResolvedValue([])
})

async function invocar() {
  return VistaSala({ params: Promise.resolve({ slug: 'neracode' }) })
}

describe('VistaSala (/cliente/[slug]) — el token de acceso es solo de admin', () => {
  it('viewer: NO se genera el token de acceso de la sala', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)

    await invocar()

    expect(generarTokenDeSalaMock).not.toHaveBeenCalled()
  })

  it('editor: TAMPOCO se genera — la exigencia es admin, no "cualquier equipo"', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)

    await invocar()

    expect(generarTokenDeSalaMock).not.toHaveBeenCalled()
  })

  it('admin: sí se genera el token, para esta sala', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(true)

    await invocar()

    expect(generarTokenDeSalaMock).toHaveBeenCalledWith('neracode')
  })

  it('sin sesión de equipo en absoluto (esLector false): tampoco se genera', async () => {
    // Caso límite real: un director de UDN con el link de su propia sala.
    // `esLector()` en `false` ya haría que el resto de la pantalla se pinte
    // en modo "director" — el token, con más razón, no se genera.
    esLectorMock.mockResolvedValue(false)
    esAdminMock.mockResolvedValue(false)

    await invocar()

    expect(generarTokenDeSalaMock).not.toHaveBeenCalled()
  })
})

/**
 * LA PARTICIPACIÓN DE CADA REUNIÓN (quién preparó, quién presentó) ES SOLO DE
 * EQUIPO — Y LA GUARDA ESTÁ EN LA CARGA, NO EN EL PINTADO (ronda 10).
 *
 * `ReunionesSala` es `'use client'`: lo que esta página le pase de prop se
 * serializa en el payload del navegador aunque el propio componente decida
 * no mostrarlo (la misma fuga que ya se corrigió para `directorio()` en esta
 * pantalla, y para `directorio()` otra vez en `/reunion/[id]`). Por eso el
 * test que importa no es "¿la pantalla del director pinta la línea?" —eso lo
 * cubre `ReunionesSala.test.tsx`, del lado del componente— sino "¿el
 * servidor llegó a PEDIR los nombres siquiera?". Si `participantesDe` nunca
 * se llama, los nombres de Mkt Corp no llegan a existir en este cierre, así
 * que no hay nada que un payload pueda llevarse.
 */
describe('VistaSala (/cliente/[slug]) — la participación de cada reunión es solo de equipo', () => {
  it('director (esLector false): participantesDe NI SIQUIERA SE LLAMA, aunque la sala tenga reuniones', async () => {
    estadoDeSalaMock.mockResolvedValueOnce(SALA_CON_REUNIONES)
    esLectorMock.mockResolvedValue(false)
    esAdminMock.mockResolvedValue(false)

    await invocar()

    expect(participantesDeMock).not.toHaveBeenCalled()
  })

  it('equipo (esLector true): participantesDe se llama para cada sesión de la sala', async () => {
    estadoDeSalaMock.mockResolvedValueOnce(SALA_CON_REUNIONES)
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)

    await invocar()

    expect(participantesDeMock).toHaveBeenCalledTimes(2)
    expect(participantesDeMock).toHaveBeenCalledWith('sesion-jul')
    expect(participantesDeMock).toHaveBeenCalledWith('sesion-jun')
  })

  it('equipo, pero sin ninguna reunión todavía (SALA_BASE): tampoco se llama — no hay qué pedir', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)

    await invocar()

    expect(participantesDeMock).not.toHaveBeenCalled()
  })
})
