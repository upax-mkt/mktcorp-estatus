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

// `acuerdosAbiertos`/`acuerdosVencidos`/`estaCongelado` se conservan REALES
// (importOriginal): son derivados puros sobre `EstadoSala` — con `acuerdos:
// []` no tienen nada que fallar, y no hace falta reimplementarlos aquí. Solo
// `estadoDeSala` (lectura real) se sustituye.
vi.mock('@/db/consultas', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('@/db/consultas')>()
  return { ...real, estadoDeSala: vi.fn().mockResolvedValue(SALA_BASE) }
})

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
