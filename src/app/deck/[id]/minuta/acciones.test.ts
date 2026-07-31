import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * `generarMinutaAction`/`publicarMinutaAction` — el agujero crítico que
 * detectó la revisión de la ronda 9: usaban la vieja `esEquipo()` (que nunca
 * miraba `rolApp`), así que un viewer podía generar Y PUBLICAR una minuta de
 * verdad. `publicarMinutaAction` no es de mentira: crea la sesión si hace
 * falta y persiste el acta con sus acuerdos confirmados — compromisos reales
 * para gente real en cualquiera de las nueve salas. Ninguna de las dos tenía
 * test hasta ahora.
 *
 * Se prueba solo LA GUARDA (orden: `esEditor()` antes que cualquier
 * escritura) — la lógica de `generarMinuta`/`guardarMinuta` en sí ya tiene
 * su propia cobertura en sus módulos.
 */

const esEditorMock = vi.fn()
vi.mock('@/auth/roles', () => ({
  esEditor: (...args: unknown[]) => esEditorMock(...args),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const obtenerSesionMock = vi.fn()
const crearSesionMock = vi.fn()
vi.mock('@/db/sesiones', () => ({
  obtenerSesion: (...args: unknown[]) => obtenerSesionMock(...args),
  crearSesion: (...args: unknown[]) => crearSesionMock(...args),
}))

// No se ejercita en ninguno de los caminos probados aquí ({sesionId: ...}),
// pero `identidadDeSala` (dentro de acciones.ts) la importa para el camino
// {nueva: ...} — mismo criterio defensivo que ya usa este repo en otros
// dobles (ver src/app/acuerdos/acciones.test.ts): sin mock, el import
// quedaría `undefined` y reventaría si algo la llegara a invocar.
vi.mock('@/db/temas', () => ({
  cargarTemas: vi.fn(),
}))

const generarMinutaMock = vi.fn()
vi.mock('@/minuta/generar', () => ({
  generarMinuta: (...args: unknown[]) => generarMinutaMock(...args),
}))

const moldeDeMinutaMock = vi.fn()
vi.mock('@/db/plantillas', () => ({
  moldeDeMinuta: (...args: unknown[]) => moldeDeMinutaMock(...args),
}))

const guardarMinutaMock = vi.fn()
vi.mock('@/db/minutas', () => ({
  guardarMinuta: (...args: unknown[]) => guardarMinutaMock(...args),
}))

const { generarMinutaAction, publicarMinutaAction } = await import('./acciones')

const SESION_FALSA = {
  id: 'ses-1',
  salaSlug: 'neracode',
  salaNombre: 'NeraCode',
  tipo: 'mensual' as const,
  alcance: 'todos',
  fecha: '2026-08-01T16:00:00.000Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  obtenerSesionMock.mockResolvedValue(SESION_FALSA)
  moldeDeMinutaMock.mockResolvedValue(null)
  generarMinutaMock.mockResolvedValue({ textoCorreo: 'Correo generado', acuerdosPropuestos: [] })
  guardarMinutaMock.mockResolvedValue(undefined)
})

describe('generarMinutaAction', () => {
  it('sin permiso de edición: rechaza y no llama al modelo', async () => {
    esEditorMock.mockResolvedValue(false)

    const resultado = await generarMinutaAction({ sesionId: 'ses-1' }, 'transcripción cruda')

    expect(resultado).toEqual({
      ok: false,
      error: 'Esta acción requiere permiso de edición en Marketing Corporativo.',
    })
    expect(generarMinutaMock).not.toHaveBeenCalled()
    expect(obtenerSesionMock).not.toHaveBeenCalled()
  })

  it('con editor: genera y devuelve el borrador', async () => {
    esEditorMock.mockResolvedValue(true)

    const resultado = await generarMinutaAction({ sesionId: 'ses-1' }, 'transcripción cruda')

    expect(resultado.ok).toBe(true)
    expect(generarMinutaMock).toHaveBeenCalledTimes(1)
  })
})

describe('publicarMinutaAction', () => {
  it('sin permiso de edición: rechaza ANTES de crear la sesión o guardar la minuta', async () => {
    esEditorMock.mockResolvedValue(false)

    const resultado = await publicarMinutaAction(
      { nueva: { titulo: 'Reunión de prueba', fecha: '2026-08-01T16:00:00.000Z', salaSlug: 'neracode' } },
      'transcripción',
      'texto final del correo',
      [],
    )

    expect(resultado).toEqual({
      ok: false,
      error: 'Esta acción requiere permiso de edición en Marketing Corporativo.',
    })
    // Lo más importante: NINGUNA escritura ocurrió. Publicar es lo que crea
    // la reunión y los acuerdos confirmados — si esto se llamara igual, el
    // rechazo sería de mentira.
    expect(crearSesionMock).not.toHaveBeenCalled()
    expect(guardarMinutaMock).not.toHaveBeenCalled()
  })

  it('con editor: publica de verdad — crea la sesión y guarda la minuta', async () => {
    esEditorMock.mockResolvedValue(true)
    crearSesionMock.mockResolvedValue({ id: 'ses-nueva' })

    const resultado = await publicarMinutaAction(
      { nueva: { titulo: 'Reunión de prueba', fecha: '2026-08-01T16:00:00.000Z', salaSlug: 'neracode' } },
      'transcripción',
      'texto final del correo',
      [],
    )

    expect(resultado).toEqual({ ok: true, sesionId: 'ses-nueva' })
    expect(guardarMinutaMock).toHaveBeenCalledWith('ses-nueva', 'transcripción', 'texto final del correo', [])
  })
})
