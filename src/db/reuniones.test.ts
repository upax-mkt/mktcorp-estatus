import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * MISMO PATRÓN QUE `src/db/sesiones.test.ts` (léelo antes de tocar esto):
 * `salaEstaActiva` va mockeada porque el store en memoria no modela la tabla
 * `salas` ni su columna `activa` — es lo mínimo necesario para probar el
 * rechazo de sala en pausa. El resto del módulo (`./store-memoria`,
 * `./esquema`, `./temas`, `./acuerdos`) sigue siendo el real.
 */

const salaEstaActivaMock = vi.fn()
vi.mock('./salas', () => ({
  salaEstaActiva: (...args: unknown[]) => salaEstaActivaMock(...args),
}))

const {
  crearReunion, obtenerReunion, marcarDada, marcarNoDada, desmarcarNoDada, eliminarReunion, reunionesPublicasDelMes,
} = await import('./reuniones')
const { reiniciarStoreMemoria, obtenerAcuerdoMemoria } = await import('./store-memoria')
const { crearAcuerdo } = await import('./acuerdos')

beforeEach(() => {
  reiniciarStoreMemoria()
  salaEstaActivaMock.mockReset().mockResolvedValue(true)
})

describe('crearReunion', () => {
  it('una sala en pausa no admite reuniones nuevas', async () => {
    salaEstaActivaMock.mockResolvedValue(false)
    await expect(crearReunion({ salaSlug: 'zeus', fecha: new Date(), titulo: 'x', tipo: 'mensual' }))
      .rejects.toThrow(/pausada/i)
  })

  it('nace agendada, no dada: agendar no es haber ocurrido', async () => {
    const { id } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    expect((await obtenerReunion(id))!.estado).toBe('agendada')
  })
})

describe('marcarNoDada', () => {
  it('deja constancia sin borrar que estaba agendada', async () => {
    const { id } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    await marcarNoDada(id)
    const r = (await obtenerReunion(id))!
    expect(r.noDadaEn).not.toBeNull()
    expect(r.estado).toBe('agendada')
  })

  it('se puede deshacer', async () => {
    const { id } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    await marcarNoDada(id)
    await desmarcarNoDada(id)
    expect((await obtenerReunion(id))!.noDadaEn).toBeNull()
  })

  /**
   * MISMO FREEZE QUE `crearReunion` (regla #5 del brief: "el rechazo de sala
   * en pausa" se conserva íntegra, y no solo para crear). No viene dado
   * verbatim en el brief, pero implementar el guardián sin un test que lo
   * ejerza sería exactamente lo que la autorevisión pide no hacer.
   */
  it('una sala en pausa también rechaza marcarNoDada', async () => {
    const { id } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    salaEstaActivaMock.mockResolvedValue(false)
    await expect(marcarNoDada(id)).rejects.toThrow(/pausada/i)
  })
})

describe('marcarDada', () => {
  it('una reunión sin documento y sin archivo también se puede dar por dada', async () => {
    // El caso de Franco: la junta ocurrió, todavía no se ha cargado nada.
    const { id } = await crearReunion({ salaSlug: 'research-land', fecha: new Date(), titulo: 'Quincenal Comercial', tipo: 'quincenal' })
    await marcarDada(id)
    expect((await obtenerReunion(id))!.estado).toBe('dada')
  })

  /** Mismo freeze — ver el comentario en 'marcarNoDada' arriba. */
  it('una sala en pausa también rechaza marcarDada', async () => {
    const { id } = await crearReunion({ salaSlug: 'research-land', fecha: new Date(), titulo: 'Quincenal Comercial', tipo: 'quincenal' })
    salaEstaActivaMock.mockResolvedValue(false)
    await expect(marcarDada(id)).rejects.toThrow(/pausada/i)
  })
})

describe('eliminarReunion', () => {
  it('sus acuerdos sobreviven: un compromiso no desaparece porque se borre la junta', async () => {
    // `obtenerAcuerdoMemoria` es como leen los tests de acuerdos que ya
    // existen (src/db/acuerdos.test.ts) — no hay `obtenerAcuerdo` público.
    const { id } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    const acuerdo = await crearAcuerdo('neracode', {
      que: 'Cruce de paid media', responsable: 'Fernando',
      fechaCompromiso: null, reunionOrigenId: id,
    })
    await eliminarReunion(id)
    const vivo = obtenerAcuerdoMemoria(acuerdo.id)
    expect(vivo).not.toBeNull()
    expect(vivo!.reunionOrigenId).toBeNull()   // la clave ajena se anula, no cascada
  })
})

/**
 * SIN DB, `reunionesPublicasDelMes` NO PUEDE FINGIR — mismo motivo que la
 * `sesionesPublicasDelMes` de la que viene (ver src/db/sesiones.test.ts): el
 * store en memoria no modela `salas.activa`, así que no hay forma honesta de
 * decidir qué sala está en pausa sin una DB real.
 */
describe('reunionesPublicasDelMes — sin DB no hay nada que anunciar', () => {
  it('devuelve la lista vacía, no una mentira sobre qué salas están activas', async () => {
    const reuniones = await reunionesPublicasDelMes(2026, 8)
    expect(reuniones).toEqual([])
  })
})
