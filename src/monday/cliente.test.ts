import { describe, it, expect, vi, afterEach } from 'vitest'
import { crearElementoEnDelivery, crearSubelemento, existeElGrupo } from './cliente'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

function conRed(datos: unknown) {
  const espia = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: datos })))
  vi.stubEnv('MONDAY_TOKEN', 'ficticio')
  vi.stubEnv('MONDAY_GRUPO', 'group_mm15cfz2')
  vi.stubEnv('MONDAY_ESCRITURA', 'si')
  vi.stubGlobal('fetch', espia)
  return espia
}

/** Lo que de verdad se mandó, ya parseado. */
function cuerpoDe(espia: ReturnType<typeof vi.fn>, llamada = 0) {
  return JSON.parse(espia.mock.calls[llamada][1].body as string)
}

describe('crearElementoEnDelivery', () => {
  it('manda el nombre con el prefijo de la sala y las columnas del ELEMENTO', async () => {
    const espia = conRed({ create_item: { id: '1', url: 'https://x' } })

    await crearElementoEnDelivery({
      salaSlug: 'mexa-creativa',
      que: 'Enviar propuesta de paid media',
      estatus: 'abierto',
      fechaCompromiso: '2026-08-12',
      responsableMondayId: '65476486',
    })

    const { variables } = cuerpoDe(espia)
    expect(variables.nombre).toBe('MC | Enviar propuesta de paid media')
    const valores = JSON.parse(variables.valores)
    expect(valores['color_mm0ex2j0']).toEqual({ label: 'Mexa Creativa' })
    expect(valores['color_mkz09na']).toEqual({ label: '🚧 Sprint' })
    expect(valores['date_mm1b10rx']).toEqual({ date: '2026-08-12' })
    expect(valores['person']).toEqual({ personsAndTeams: [{ id: 65476486, kind: 'person' }] })
  })

  it('sin fecha manda la columna vacía, para poder quitar una fecha puesta', async () => {
    const espia = conRed({ create_item: { id: '1', url: 'https://x' } })

    await crearElementoEnDelivery({
      salaSlug: 'neracode',
      que: 'Validar cifras',
      estatus: 'abierto',
      fechaCompromiso: null,
      responsableMondayId: null,
    })

    const valores = JSON.parse(cuerpoDe(espia).variables.valores)
    expect(valores['date_mm1b10rx']).toEqual({})
    expect(valores['person']).toBeUndefined()
  })
})

describe('crearSubelemento', () => {
  it('usa las columnas del SUBELEMENTO y no repite el prefijo del padre', async () => {
    const espia = conRed({ create_subitem: { id: '2', url: 'https://y' } })

    await crearSubelemento('123', {
      salaSlug: 'mexa-creativa',
      que: 'Enviar propuesta de paid media',
      estatus: 'cumplido',
      fechaCompromiso: '2026-08-12',
      responsableMondayId: '65476486',
    })

    const { variables } = cuerpoDe(espia)
    expect(variables.nombre).toBe('Enviar propuesta de paid media')
    expect(variables.padre).toBe('123')
    const valores = JSON.parse(variables.valores)
    expect(valores['color_mm15emh7']).toEqual({ label: 'Mexa Creativa' })
    expect(valores['color_mkzjvp66']).toEqual({ label: '✅ Done' })
    expect(valores['date_mm1hnswx']).toEqual({ date: '2026-08-12' })
    expect(valores['color_mm0ex2j0']).toBeUndefined()
  })
})

describe('existeElGrupo', () => {
  it('es falso si el tablero no devuelve el grupo configurado', async () => {
    conRed({ boards: [{ groups: [] }] })
    expect(await existeElGrupo()).toBe(false)
  })

  it('es cierto cuando está', async () => {
    conRed({ boards: [{ groups: [{ id: 'group_mm15cfz2', title: 'Delivery Mkt Corp 2026' }] }] })
    expect(await existeElGrupo()).toBe(true)
  })
})
