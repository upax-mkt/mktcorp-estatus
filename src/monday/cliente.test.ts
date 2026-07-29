import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  crearElementoEnDelivery, crearSubelemento, existeElGrupo, actualizarEnMonday, elementosDeDelivery,
  leerAcuerdosDeMonday,
} from './cliente'
import { TABLERO, TABLERO_SUBELEMENTOS, COLUMNA_ELEMENTO, COLUMNA_SUBELEMENTO } from './mapeo'

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
  it('filtra por el ÍNDICE de la etiqueta de UdN para mexa-creativa (índice 1)', async () => {
    const espia = conRed({
      boards: [{ groups: [{ items_page: { items: [{ id: '9', name: 'MC | Campaña Paid media' }] } }] }],
    })

    const resultado = await elementosDeDelivery('mexa-creativa')

    expect(resultado.elementos).toEqual([{ id: '9', nombre: 'MC | Campaña Paid media' }])
    expect(resultado.truncado).toBe(false)
    const consulta = cuerpoDe(espia).query as string
    expect(consulta).toContain('color_mm0ex2j0')
    expect(cuerpoDe(espia).variables.udn).toEqual([1])
  })

  it('filtra por el ÍNDICE correcto para otra UDN como research-land (índice 156)', async () => {
    const espia = conRed({
      boards: [{ groups: [{ items_page: { items: [{ id: '42', name: 'RL | Benchmarking' }] } }] }],
    })

    const resultado = await elementosDeDelivery('research-land')

    expect(resultado.elementos).toEqual([{ id: '42', nombre: 'RL | Benchmarking' }])
    expect(resultado.truncado).toBe(false)
    expect(cuerpoDe(espia).variables.udn).toEqual([156])
  })

  it('marca truncado como cierto si devuelve exactamente 100 elementos', async () => {
    const items100 = Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      name: `Item ${i}`,
    }))
    const espia = conRed({
      boards: [{ groups: [{ items_page: { items: items100 } }] }],
    })

    const resultado = await elementosDeDelivery('mexa-creativa')

    expect(resultado.elementos).toHaveLength(100)
    expect(resultado.truncado).toBe(true)
  })

  it('una sala que no está en el mapa devuelve lista vacía sin llamar a nadie', async () => {
    const espia = conRed({ boards: [] })
    const resultado = await elementosDeDelivery('sala-inventada')
    expect(resultado).toEqual({ elementos: [], truncado: false })
    expect(espia).not.toHaveBeenCalled()
  })

  it('sin grupo configurado devuelve lista vacía sin llamar a nadie', async () => {
    const espia = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { boards: [] } })))
    vi.stubEnv('MONDAY_TOKEN', 'ficticio')
    // No configurar MONDAY_GRUPO — debe quedar sin definir
    vi.stubGlobal('fetch', espia)

    const resultado = await elementosDeDelivery('mexa-creativa')
    expect(resultado).toEqual({ elementos: [], truncado: false })
    expect(espia).not.toHaveBeenCalled()
  })
})

describe('leerAcuerdosDeMonday', () => {
  it('pide SOLO los ids conocidos con items(ids:…) — nunca boards/groups, que sería el tablero entero', async () => {
    const espia = conRed({
      items: [
        {
          id: '9',
          updated_at: '2026-07-29T11:00:00Z',
          column_values: [
            { id: COLUMNA_ELEMENTO.fase, text: '✅ Done', value: null },
            { id: COLUMNA_ELEMENTO.deadline, text: '2026-08-12', value: '{"date":"2026-08-12"}' },
          ],
        },
      ],
    })

    const resultado = await leerAcuerdosDeMonday([{ mondayId: '9', tipo: 'elemento' }])

    const cuerpo = cuerpoDe(espia)
    expect(cuerpo.query).toContain('items(ids: $ids)')
    expect(cuerpo.query).not.toContain('boards')
    expect(cuerpo.variables.ids).toEqual(['9'])
    expect(resultado.get('9')).toEqual({
      estatus: 'cumplido',
      fechaCompromiso: '2026-08-12',
      actualizadoEn: new Date('2026-07-29T11:00:00Z'),
      existe: true,
    })
  })

  it('no pide el nombre del elemento: el texto del acuerdo nunca vuelve de Monday', async () => {
    const espia = conRed({ items: [] })

    await leerAcuerdosDeMonday([{ mondayId: '9', tipo: 'elemento' }])

    // La query solo declara id / updated_at / column_values(fase, deadline).
    // Si algún día alguien le agrega "name" aquí, este test tiene que caer:
    // es exactamente el campo que la regla central prohíbe leer de vuelta.
    expect(cuerpoDe(espia).query).not.toMatch(/\bname\b/)
  })

  it('un id que Monday no devuelve queda "existe: false", sin inventar estatus ni fecha', async () => {
    conRed({ items: [] }) // Monday respondió, pero sin el id pedido: borrado allá.

    const resultado = await leerAcuerdosDeMonday([{ mondayId: '404', tipo: 'elemento' }])

    expect(resultado.get('404')).toEqual({
      estatus: 'abierto',
      fechaCompromiso: null,
      actualizadoEn: new Date(0),
      existe: false,
    })
  })

  it('con ids de los dos tipos, hace DOS consultas —una por tipo— con las columnas de cada uno', async () => {
    const espia = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { items: [{ id: '9', updated_at: '2026-07-29T11:00:00Z', column_values: [] }] } }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { items: [{ id: '77', updated_at: '2026-07-29T12:00:00Z', column_values: [] }] } }),
        ),
      )
    vi.stubEnv('MONDAY_TOKEN', 'ficticio')
    vi.stubGlobal('fetch', espia)

    const resultado = await leerAcuerdosDeMonday([
      { mondayId: '9', tipo: 'elemento' },
      { mondayId: '77', tipo: 'subelemento' },
    ])

    expect(espia).toHaveBeenCalledTimes(2)
    const primero = cuerpoDe(espia, 0)
    const segundo = cuerpoDe(espia, 1)
    expect(primero.variables.ids).toEqual(['9'])
    expect(primero.query).toContain(COLUMNA_ELEMENTO.fase)
    expect(segundo.variables.ids).toEqual(['77'])
    expect(segundo.query).toContain(COLUMNA_SUBELEMENTO.fase)
    expect(resultado.get('9')?.existe).toBe(true)
    expect(resultado.get('77')?.existe).toBe(true)
  })

  it('sin refs, no llama a nadie', async () => {
    const espia = vi.fn()
    vi.stubGlobal('fetch', espia)

    const resultado = await leerAcuerdosDeMonday([])

    expect(resultado.size).toBe(0)
    expect(espia).not.toHaveBeenCalled()
  })

  it('sin MONDAY_TOKEN, no llama a nadie', async () => {
    const espia = vi.fn()
    vi.stubGlobal('fetch', espia)
    // Sin vi.stubEnv('MONDAY_TOKEN', …): mondayConectado() es falso.

    const resultado = await leerAcuerdosDeMonday([{ mondayId: '9', tipo: 'elemento' }])

    expect(resultado.size).toBe(0)
    expect(espia).not.toHaveBeenCalled()
  })
})
