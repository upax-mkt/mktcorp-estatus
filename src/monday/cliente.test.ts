import { describe, it, expect, vi, afterEach } from 'vitest'
import { crearElementoEnDelivery, crearSubelemento, existeElGrupo, actualizarEnMonday, elementosDeDelivery } from './cliente'
import { TABLERO, TABLERO_SUBELEMENTOS } from './mapeo'

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

  it('con responsableMondayId vacío (\'\'), tampoco manda la columna de personas', async () => {
    // Caso que nadie puede producir hoy desde la interfaz (no hay selector de
    // responsable todavía — tarea 10), pero conviene clavarlo antes: una
    // cadena vacía no es un id, y Number('') da 0 — asignaría el acuerdo a un
    // usuario de Monday que no existe.
    const espia = conRed({ create_item: { id: '1', url: 'https://x' } })

    await crearElementoEnDelivery({
      salaSlug: 'neracode',
      que: 'Validar cifras',
      estatus: 'abierto',
      fechaCompromiso: null,
      responsableMondayId: '',
    })

    const valores = JSON.parse(cuerpoDe(espia).variables.valores)
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

describe('actualizarEnMonday', () => {
  // El ternario que elige el tablero (TABLERO vs TABLERO_SUBELEMENTOS) no lo
  // ejercita ningún test de sincronizarCambio: los dos casos de
  // sincronizar.test.ts retornan antes de llegar a llamar esta función. Sin
  // esto, invertir el ternario o dejarlo fijo en TABLERO no lo detecta nadie
  // hasta que la tarea 8 cree subelementos de verdad, contra el tablero real.
  // Cada caso comprueba las DOS cosas que dependen de `destino` a la vez —el
  // tablero Y el juego de columnas— porque son dos piezas de código distintas
  // dentro de la función (el `tablero` del ternario, las `columnasDe(destino)`
  // de valoresDeColumna): un test que solo mirara una no cubre a la otra.
  it('con destino "elemento", manda TABLERO y las columnas del ELEMENTO', async () => {
    const espia = conRed({ change_multiple_column_values: { id: '9' } })

    await actualizarEnMonday('9', 'elemento', {
      salaSlug: 'mexa-creativa',
      estatus: 'cumplido',
      fechaCompromiso: '2026-08-12',
    })

    const { variables } = cuerpoDe(espia)
    expect(variables.tablero).toBe(String(TABLERO))
    const valores = JSON.parse(variables.valores)
    expect(valores['color_mkz09na']).toEqual({ label: '✅ Done' })
    expect(valores['color_mkzjvp66']).toBeUndefined() // fase del SUBELEMENTO: no debe aparecer
  })

  it('con destino "subelemento", manda TABLERO_SUBELEMENTOS y las columnas del SUBELEMENTO', async () => {
    const espia = conRed({ change_multiple_column_values: { id: '9' } })

    await actualizarEnMonday('9', 'subelemento', {
      salaSlug: 'mexa-creativa',
      estatus: 'cumplido',
      fechaCompromiso: '2026-08-12',
    })

    const { variables } = cuerpoDe(espia)
    expect(variables.tablero).toBe(String(TABLERO_SUBELEMENTOS))
    const valores = JSON.parse(variables.valores)
    expect(valores['color_mkzjvp66']).toEqual({ label: '✅ Done' })
    expect(valores['color_mkz09na']).toBeUndefined() // fase del ELEMENTO: no debe aparecer
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

describe('elementosDeDelivery', () => {
  it('filtra por el ÍNDICE de la etiqueta de UdN, no por su texto', async () => {
    const espia = conRed({
      boards: [{ groups: [{ items_page: { items: [{ id: '9', name: 'MC | Campaña Paid media' }] } }] }],
    })

    const elementos = await elementosDeDelivery('mexa-creativa')

    expect(elementos).toEqual([{ id: '9', nombre: 'MC | Campaña Paid media' }])
    const consulta = cuerpoDe(espia).query as string
    expect(consulta).toContain('color_mm0ex2j0')
    expect(cuerpoDe(espia).variables.udn).toEqual([1])
  })

  it('una sala que no está en el tablero devuelve lista vacía sin llamar a nadie', async () => {
    const espia = conRed({ boards: [] })
    expect(await elementosDeDelivery('sala-inventada')).toEqual([])
    expect(espia).not.toHaveBeenCalled()
  })
})
