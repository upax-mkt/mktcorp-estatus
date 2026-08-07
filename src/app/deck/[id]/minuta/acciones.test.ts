import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * `generarMinutaAction`/`publicarMinutaAction` — el agujero crítico que
 * detectó la revisión de la ronda 9: usaban la vieja `esEquipo()` (que nunca
 * miraba `rolApp`), así que un viewer podía generar Y PUBLICAR una minuta de
 * verdad. `publicarMinutaAction` no es de mentira: crea la reunión si hace
 * falta y persiste el acta con sus acuerdos confirmados — compromisos reales
 * para gente real en cualquiera de las nueve salas. Ninguna de las dos tenía
 * test hasta ahora.
 *
 * Se prueba solo LA GUARDA (orden: `esEditor()` antes que cualquier
 * escritura) — la lógica de `generarMinuta`/`guardarMinuta` en sí ya tiene
 * su propia cobertura en sus módulos.
 *
 * MIGRADO (ronda 10, tarea 5b): mockeaba `@/db/sesiones` (`obtenerSesion`,
 * `crearSesion`); ahora mockea `@/db/reuniones` (`obtenerReunion`,
 * `crearReunion`, `marcarDada`). `marcarDada` se sigue mockeando aunque
 * `acciones.ts` ya no la llame (restaurado el 5-ago: `crearReunion({...,
 * estado: 'dada' })` resuelve el registro retroactivo en una sola llamada,
 * igual que la vieja `crearSesion({ estado: 'presentada' })` — ver el
 * comentario de cabecera de `acciones.ts`) — se deja declarada para poder
 * afirmar `not.toHaveBeenCalled()` y que nadie la reintroduzca sin querer.
 */

const esEditorMock = vi.fn()
vi.mock('@/auth/roles', () => ({
  esEditor: (...args: unknown[]) => esEditorMock(...args),
}))

const sesionActualMock = vi.fn()
vi.mock('@/auth/sesion', () => ({
  sesionActual: (...args: unknown[]) => sesionActualMock(...args),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const obtenerReunionMock = vi.fn()
const crearReunionMock = vi.fn()
const marcarDadaMock = vi.fn()
vi.mock('@/db/reuniones', () => ({
  obtenerReunion: (...args: unknown[]) => obtenerReunionMock(...args),
  crearReunion: (...args: unknown[]) => crearReunionMock(...args),
  marcarDada: (...args: unknown[]) => marcarDadaMock(...args),
}))

// No se ejercita en ninguno de los caminos probados aquí ({reunionId: ...}),
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

const registrarEdicionMock = vi.fn()
vi.mock('@/db/participacion', () => ({
  registrarEdicion: (...args: unknown[]) => registrarEdicionMock(...args),
}))

const { generarMinutaAction, publicarMinutaAction } = await import('./acciones')

const REUNION_FALSA = {
  id: 'reu-1',
  salaSlug: 'neracode',
  salaNombre: 'NeraCode',
  tipo: 'mensual' as const,
  alcance: 'todos',
  fecha: '2026-08-01T16:00:00.000Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  obtenerReunionMock.mockResolvedValue(REUNION_FALSA)
  moldeDeMinutaMock.mockResolvedValue(null)
  generarMinutaMock.mockResolvedValue({
    textoCorreo: 'Correo generado',
    bloques: ['bloque uno', 'bloque dos'],
    acuerdosPropuestos: [],
    insumosCorreo: { salaSlug: 'neracode', molde: null, reunionId: 'reu-1', contexto: { reunion: 'x', fecha: 'y' } },
  })
  guardarMinutaMock.mockResolvedValue(undefined)
  marcarDadaMock.mockResolvedValue(undefined)
  sesionActualMock.mockResolvedValue({
    rol: 'equipo',
    sub: 'iris@upax.com.mx',
    rolApp: 'editor',
    exp: Date.now() + 1000,
  })
})

describe('generarMinutaAction', () => {
  it('sin permiso de edición: rechaza y no llama al modelo', async () => {
    esEditorMock.mockResolvedValue(false)

    const resultado = await generarMinutaAction({ reunionId: 'reu-1' }, 'transcripción cruda')

    expect(resultado).toEqual({
      ok: false,
      error: 'Esta acción requiere permiso de edición en Marketing Corporativo.',
    })
    expect(generarMinutaMock).not.toHaveBeenCalled()
    expect(obtenerReunionMock).not.toHaveBeenCalled()
  })

  it('con editor: genera y devuelve el borrador', async () => {
    esEditorMock.mockResolvedValue(true)

    const resultado = await generarMinutaAction({ reunionId: 'reu-1' }, 'transcripción cruda')

    expect(resultado.ok).toBe(true)
    expect(generarMinutaMock).toHaveBeenCalledTimes(1)
  })

  /**
   * EL HALLAZGO (ronda 11, tarea 1): además del texto ya ensamblado, esta
   * acción también devuelve los `bloques` crudos y los `insumosCorreo` — lo
   * que `MinutaCliente.tsx` necesita para volver a llamar a `ensamblarCorreo`
   * EN EL CLIENTE cada vez que cambian los acuerdos, sin pedirle al servidor
   * que regenere nada.
   */
  it('con editor: devuelve también los bloques y los insumos para rearmar el correo en el cliente', async () => {
    esEditorMock.mockResolvedValue(true)

    const resultado = await generarMinutaAction({ reunionId: 'reu-1' }, 'transcripción cruda')

    expect(resultado.bloques).toEqual(['bloque uno', 'bloque dos'])
    expect(resultado.insumosCorreo).toEqual({
      salaSlug: 'neracode', molde: null, reunionId: 'reu-1', contexto: { reunion: 'x', fecha: 'y' },
    })
  })

  /**
   * EL CUADRO DE FEEDBACK PARA LA IA (ronda 11, tarea 1): lo que se escribe en
   * "¿qué entendió mal?" viaja como quinto argumento hasta `generarMinuta`,
   * que lo añade al prompt como corrección — ver prompt.test.ts para la
   * prueba de que ahí se marca aparte y nunca toca el SYSTEM de Franco.
   */
  it('manda la corrección del equipo a generarMinuta cuando se pide regenerar con feedback', async () => {
    esEditorMock.mockResolvedValue(true)

    await generarMinutaAction({ reunionId: 'reu-1' }, 'transcripción cruda', 'Fernando no Fernanda, fue Iris')

    expect(generarMinutaMock.mock.calls[0][4]).toBe('Fernando no Fernanda, fue Iris')
  })

  it('sin corrección (generación normal): no manda nada de más a generarMinuta', async () => {
    esEditorMock.mockResolvedValue(true)

    await generarMinutaAction({ reunionId: 'reu-1' }, 'transcripción cruda')

    expect(generarMinutaMock.mock.calls[0][4]).toBeUndefined()
  })
})

describe('publicarMinutaAction', () => {
  it('sin permiso de edición: rechaza ANTES de crear la reunión o guardar la minuta', async () => {
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
    expect(crearReunionMock).not.toHaveBeenCalled()
    expect(marcarDadaMock).not.toHaveBeenCalled()
    expect(guardarMinutaMock).not.toHaveBeenCalled()
    expect(registrarEdicionMock).not.toHaveBeenCalled()
  })

  it('con editor: publica de verdad — crea la reunión ya dada, guarda la minuta y registra a quien publicó (ronda 9, tarea 4)', async () => {
    esEditorMock.mockResolvedValue(true)
    crearReunionMock.mockResolvedValue({ id: 'reu-nueva' })

    const resultado = await publicarMinutaAction(
      { nueva: { titulo: 'Reunión de prueba', fecha: '2026-08-01T16:00:00.000Z', salaSlug: 'neracode' } },
      'transcripción',
      'texto final del correo',
      [],
    )

    expect(resultado).toEqual({ ok: true, reunionId: 'reu-nueva' })
    // Nace YA dada, en un solo paso (restaurado el 5-ago) — es historia, no
    // trabajo en curso: ni siquiera pasa por `marcarDada` (ver el
    // comentario de cabecera de acciones.ts).
    expect(crearReunionMock).toHaveBeenCalledWith(expect.objectContaining({ estado: 'dada' }))
    expect(marcarDadaMock).not.toHaveBeenCalled()
    expect(guardarMinutaMock).toHaveBeenCalledWith('reu-nueva', 'transcripción', 'texto final del correo', [])
    expect(registrarEdicionMock).toHaveBeenCalledWith('reu-nueva', 'iris@upax.com.mx')
  })

  it('sin sala (nueva.salaSlug nulo): publica igual — la reunión nace con la identidad de Marketing Corp (Tarea 8c)', async () => {
    // Franco, Tarea 8b: "necesito poder utilizar el componente para crear
    // minutas de otras reuniones" — un comité, una interna de Mkt Corp.
    // `crearReunion` ya admite `salaSlug: null` desde la Tarea 8b (nace con
    // la identidad de Marketing Corp, `identidadDe` en src/db/reuniones.ts);
    // esta acción ya no lo rechaza (Tarea 8c).
    esEditorMock.mockResolvedValue(true)
    crearReunionMock.mockResolvedValue({ id: 'reu-comite' })

    const resultado = await publicarMinutaAction(
      { nueva: { titulo: 'Comité de dirección', fecha: '2026-08-01T16:00:00.000Z', salaSlug: null } },
      'transcripción',
      'texto final del correo',
      [],
    )

    expect(resultado).toEqual({ ok: true, reunionId: 'reu-comite' })
    // Nace ya dada, con `salaSlug: null` tal cual — nada lo sustituye por un
    // valor por defecto ni lo rechaza.
    expect(crearReunionMock).toHaveBeenCalledWith(
      expect.objectContaining({ salaSlug: null, estado: 'dada' }),
    )
    expect(guardarMinutaMock).toHaveBeenCalledWith('reu-comite', 'transcripción', 'texto final del correo', [])
  })

  it('sin correo en la sesión (caso raro): publica igual y no registra participación', async () => {
    esEditorMock.mockResolvedValue(true)
    crearReunionMock.mockResolvedValue({ id: 'reu-nueva' })
    sesionActualMock.mockResolvedValue(null)

    const resultado = await publicarMinutaAction(
      { nueva: { titulo: 'Reunión de prueba', fecha: '2026-08-01T16:00:00.000Z', salaSlug: 'neracode' } },
      'transcripción',
      'texto final del correo',
      [],
    )

    expect(resultado).toEqual({ ok: true, reunionId: 'reu-nueva' })
    expect(registrarEdicionMock).not.toHaveBeenCalled()
  })
})
