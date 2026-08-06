import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DatosFormulario } from '@/componentes/agenda/FormularioSesion'

/**
 * `src/app/reuniones/acciones.ts` (Tarea 13, ronda 10): las Server Actions de
 * agendar/editar, mudadas TAL CUAL desde `src/app/agenda/page.tsx` a un
 * archivo `'use server'` propio — es lo que permite que `PanelAgenda` (un
 * Client Component) las reciba como prop sin que React intente serializar
 * una función declarada dentro del cuerpo de una página (mismo motivo por el
 * que `instanteDe`, en el `agenda/page.tsx` viejo, vivía FUERA del
 * componente: "las Server Actions la capturaban en su cierre... 'Functions
 * cannot be passed directly to Client Components'").
 *
 * Mismo criterio de cobertura que `src/app/acuerdos/acciones.test.ts`: la
 * guarda (`exigirEditor`) se comprueba ANTES de tocar la base — si alguien
 * reordenara la guarda después de la llamada a `crearReunionConDocumento`/
 * `editarReunion`, estos tests se caen.
 */

const exigirEditorMock = vi.fn()
vi.mock('@/auth/roles', () => ({
  exigirEditor: () => exigirEditorMock(),
}))

const crearReunionConDocumentoMock = vi.fn()
vi.mock('@/db/documentos', () => ({
  crearReunionConDocumento: (...args: unknown[]) => crearReunionConDocumentoMock(...args),
}))

const editarReunionMock = vi.fn()
vi.mock('@/db/reuniones', () => ({
  editarReunion: (...args: unknown[]) => editarReunionMock(...args),
}))

const revalidatePathMock = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}))

// `slugsDeSalas` (hallazgo 4b, revisión final ronda 10): `agendarReunionAction`
// recibía `datos.salaSlug` crudo del formulario y solo lo comprobaba —vía
// `crearReunion`, `src/db/reuniones.ts`— si era truthy; una cadena vacía se
// colaba hasta la base. Ver el describe dedicado, más abajo.
const slugsDeSalasMock = vi.fn()
vi.mock('@/db/temas', () => ({
  slugsDeSalas: () => slugsDeSalasMock(),
}))

const { agendarReunionAction, editarReunionAction } = await import('./acciones')

const DATOS_BASE: DatosFormulario = {
  salaSlug: 'neracode',
  titulo: '  Estatus de agosto  ',
  dia: '2026-08-19',
  hora: '14:30',
  tipo: 'mensual',
  alcance: '  todos  ',
  lugar: '  Sala Norte  ',
  // "Ceci, , Pablo, Ceci," es lo normal al teclear, no la excepción (mismo
  // dato de prueba que usaba `editarSesion`/`editarReunion` — ver el
  // comentario de `editarReunion` en src/db/reuniones.ts).
  participantes: 'Ceci, , Pablo, Ceci,',
}

beforeEach(() => {
  exigirEditorMock.mockReset().mockResolvedValue({ rol: 'equipo', rolApp: 'editor', sub: 'equipo-mkt-corp' })
  crearReunionConDocumentoMock.mockReset().mockResolvedValue({ reunionId: 'r1', documentoId: 'd1' })
  editarReunionMock.mockReset().mockResolvedValue(undefined)
  revalidatePathMock.mockReset()
  slugsDeSalasMock.mockReset().mockResolvedValue(['neracode', 'mexa-creativa', 'uix'])
})

describe('agendarReunionAction', () => {
  it('exige edición ANTES de crear la reunión: sin permiso, no llega a la base', async () => {
    exigirEditorMock.mockRejectedValueOnce(
      new Error('Esta acción requiere permiso de edición en Marketing Corporativo.'),
    )

    await expect(agendarReunionAction(DATOS_BASE)).rejects.toThrow('permiso de edición')

    expect(crearReunionConDocumentoMock).not.toHaveBeenCalled()
  })

  it('ancla la fecha a America/Mexico_City (día+hora del formulario), no a la del proceso', async () => {
    await agendarReunionAction(DATOS_BASE)

    const llamada = crearReunionConDocumentoMock.mock.calls[0][0]
    // -06:00 fijo: México central no cambia de huso (ver src/lib/fecha.ts,
    // `instanteEnCDMX`). Si esto se anclara a la zona del proceso (UTC en
    // Vercel), la reunión de las 14:30 se guardaría a otra hora.
    expect(llamada.fecha).toEqual(new Date('2026-08-19T14:30:00-06:00'))
  })

  it('sin hora, asume las 10:00 — una reunión sin hora se asume de mañana (regla de esta pantalla, no del helper genérico)', async () => {
    await agendarReunionAction({ ...DATOS_BASE, hora: '' })

    const llamada = crearReunionConDocumentoMock.mock.calls[0][0]
    expect(llamada.fecha).toEqual(new Date('2026-08-19T10:00:00-06:00'))
  })

  it('recorta título y alcance, separa participantes por coma y limpia vacíos/duplicados de forma', async () => {
    await agendarReunionAction(DATOS_BASE)

    expect(crearReunionConDocumentoMock).toHaveBeenCalledWith({
      salaSlug: 'neracode',
      tipo: 'mensual',
      alcance: 'todos',
      fecha: new Date('2026-08-19T14:30:00-06:00'),
      titulo: 'Estatus de agosto',
      participantes: ['Ceci', 'Pablo', 'Ceci'],
      lugar: 'Sala Norte',
    })
  })

  it('alcance vacío cae a "todos"', async () => {
    await agendarReunionAction({ ...DATOS_BASE, alcance: '   ' })

    expect(crearReunionConDocumentoMock).toHaveBeenCalledWith(expect.objectContaining({ alcance: 'todos' }))
  })

  it('lugar vacío se manda como null, no como cadena vacía', async () => {
    await agendarReunionAction({ ...DATOS_BASE, lugar: '   ' })

    expect(crearReunionConDocumentoMock).toHaveBeenCalledWith(expect.objectContaining({ lugar: null }))
  })

  it('revalida /reuniones y / — no /agenda: la pestaña vive en su casa nueva', async () => {
    await agendarReunionAction(DATOS_BASE)

    expect(revalidatePathMock).toHaveBeenCalledWith('/reuniones')
    expect(revalidatePathMock).toHaveBeenCalledWith('/')
    expect(revalidatePathMock).not.toHaveBeenCalledWith('/agenda')
  })

  it('si crearReunionConDocumento lanza, devuelve { error } con su mensaje en vez de reventar, y no revalida nada', async () => {
    crearReunionConDocumentoMock.mockRejectedValueOnce(new Error('Sala pausada.'))

    const resultado = await agendarReunionAction(DATOS_BASE)

    expect(resultado).toEqual({ error: 'Sala pausada.' })
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('un error que no es Error (raro, pero posible) cae a un mensaje genérico', async () => {
    crearReunionConDocumentoMock.mockRejectedValueOnce('boom')

    const resultado = await agendarReunionAction(DATOS_BASE)

    expect(resultado).toEqual({ error: 'No se pudo agendar la reunión.' })
  })

  /**
   * HALLAZGO 4b DE LA REVISIÓN FINAL (ronda 10) — `salaSlug` llegaba crudo
   * del formulario y `crearReunion` (`src/db/reuniones.ts`) solo lo
   * comprobaba SI ERA TRUTHY (`datos.salaSlug &&`): una cadena vacía se
   * colaba hasta ahí, revienta contra la clave ajena de Postgres, y el
   * `catch` de esta acción devolvía ese mensaje crudo a la pantalla.
   * `src/app/deck/nueva/page.tsx` sí valida (`!salaSlug ||
   * !slugsDeSalas().includes(salaSlug)`) — mismo criterio, copiado aquí.
   */
  describe('salaSlug se valida ANTES de crear (hallazgo 4b)', () => {
    it('salaSlug vacío se rechaza sin llegar a crearReunionConDocumento', async () => {
      const resultado = await agendarReunionAction({ ...DATOS_BASE, salaSlug: '' })

      expect(resultado.error).toBeTruthy()
      expect(crearReunionConDocumentoMock).not.toHaveBeenCalled()
    })

    it('salaSlug desconocido (no está en slugsDeSalas()) también se rechaza', async () => {
      const resultado = await agendarReunionAction({ ...DATOS_BASE, salaSlug: 'sala-que-no-existe' })

      expect(resultado.error).toContain('sala-que-no-existe')
      expect(crearReunionConDocumentoMock).not.toHaveBeenCalled()
    })

    it('con una sala real, sigue funcionando con normalidad', async () => {
      const resultado = await agendarReunionAction(DATOS_BASE)

      expect(resultado).toEqual({})
      expect(crearReunionConDocumentoMock).toHaveBeenCalled()
    })
  })
})

describe('editarReunionAction', () => {
  it('exige edición ANTES de guardar: sin permiso, no llega a la base', async () => {
    exigirEditorMock.mockRejectedValueOnce(
      new Error('Esta acción requiere permiso de edición en Marketing Corporativo.'),
    )

    await expect(editarReunionAction('r1', DATOS_BASE)).rejects.toThrow('permiso de edición')

    expect(editarReunionMock).not.toHaveBeenCalled()
  })

  it('llama a editarReunion con el id y los datos saneados — sin salaSlug, que no es editable', async () => {
    await editarReunionAction('r1', DATOS_BASE)

    expect(editarReunionMock).toHaveBeenCalledWith('r1', {
      fecha: new Date('2026-08-19T14:30:00-06:00'),
      titulo: 'Estatus de agosto',
      tipo: 'mensual',
      alcance: 'todos',
      participantes: ['Ceci', 'Pablo', 'Ceci'],
      lugar: 'Sala Norte',
    })
  })

  it('revalida /reuniones y /', async () => {
    await editarReunionAction('r1', DATOS_BASE)

    expect(revalidatePathMock).toHaveBeenCalledWith('/reuniones')
    expect(revalidatePathMock).toHaveBeenCalledWith('/')
  })

  it('si editarReunion lanza, devuelve { error } con su mensaje', async () => {
    editarReunionMock.mockRejectedValueOnce(new Error('Reunión no encontrada: "r1"'))

    const resultado = await editarReunionAction('r1', DATOS_BASE)

    expect(resultado).toEqual({ error: 'Reunión no encontrada: "r1"' })
  })
})
