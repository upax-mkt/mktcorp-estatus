import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * MISMO PATRÓN QUE `src/db/reuniones.test.ts` y `src/db/sesiones.test.ts`
 * (léelos antes de tocar esto): `salaEstaActiva` va mockeada porque el store
 * en memoria no modela la tabla `salas` ni su columna `activa`. El resto del
 * módulo (`./store-memoria`, `./esquema`, `./reuniones`, `./acuerdos`) sigue
 * siendo el real.
 */

const salaEstaActivaMock = vi.fn()
vi.mock('./salas', () => ({
  salaEstaActiva: (...args: unknown[]) => salaEstaActivaMock(...args),
}))

const {
  crearDocumento, documentoDeReunion, marcarListo, crearReunionConDocumento, eliminarDocumentoDeReunion,
} = await import('./documentos')
const { crearReunion, obtenerReunion, eliminarReunion } = await import('./reuniones')
const { reiniciarStoreMemoria } = await import('./store-memoria')

beforeEach(() => {
  reiniciarStoreMemoria()
  salaEstaActivaMock.mockReset().mockResolvedValue(true)
})

describe('documentoDeReunion', () => {
  it('una reunión tiene como mucho un documento — la base lo impide, no el código', async () => {
    const { id } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    await crearDocumento(id)
    await expect(crearDocumento(id)).rejects.toThrow()
  })

  it('una reunión puede no tener documento: el PDF también es una presentación', async () => {
    const { id } = await crearReunion({ salaSlug: 'research-land', fecha: new Date(), titulo: 'Quincenal Comercial', tipo: 'quincenal' })
    expect(await documentoDeReunion(id)).toBeNull()
  })

  it('el documento nace en borrador y pasa a listo, y eso no dice nada de si la junta se dio', async () => {
    const { id } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    const doc = await crearDocumento(id)
    expect((await documentoDeReunion(id))!.estado).toBe('borrador')
    await marcarListo(doc.id)
    expect((await documentoDeReunion(id))!.estado).toBe('listo')
    expect((await obtenerReunion(id))!.estado).toBe('agendada')
  })
})
