import { describe, it, expect, beforeEach } from 'vitest'
import {
  crearReunionConDocumento, documentoDeReunion, anadirAcuerdoRetomado, itemDeAcuerdosPendientes,
  entradasCrudasDeDocumento,
} from './documentos'
import { reiniciarStoreMemoria } from './store-memoria'

/**
 * Retomar un acuerdo en un documento (ronda 9, tarea 6 — revisión; mudado a
 * `documentos.ts` en la ronda 10, tarea 5b). Corre contra el store en memoria
 * (sin DATABASE_URL), como el resto de `documentos.ts`: aquí se prueba la
 * REFERENCIA (el id se guarda, se acumula, es idempotente, cuenta como
 * contenido real) — la RESOLUCIÓN contra la tabla `acuerdos` (que un id se
 * convierta en `Acuerdo` con su estatus de ahora) es camino de Postgres y no
 * tiene doble en memoria: sin DB, `acuerdosRetomados` se queda en `[]`
 * siempre, a propósito (ver `resolverAcuerdosRetomados`).
 */
beforeEach(() => reiniciarStoreMemoria())

async function documentoEstatus() {
  const { reunionId, documentoId } = await crearReunionConDocumento({
    // `plantilla` EXPLÍCITA, y no por omisión: estos tests viven de las ocho
    // secciones del estatus de UDN. Hasta el 17-ago las heredaban sin pedirlas,
    // porque una reunión sin clase caía al estatus por defecto — y eso era el
    // defecto: el documento contradecía a su reunión, que decía "sin clasificar".
    // Ahora sin clase el deck nace mínimo, así que lo que estos tests necesitan
    // hay que pedirlo.
    salaSlug: 'neracode', plantilla: 'estatus-udn', tipo: 'mensual', titulo: '', fecha: new Date(),
  })
  return { reunionId, documentoId }
}

describe('itemDeAcuerdosPendientes', () => {
  it('encuentra la sección fija de un estatus de UDN por su tipo', async () => {
    const { reunionId } = await documentoEstatus()
    const documento = (await documentoDeReunion(reunionId))!
    const item = itemDeAcuerdosPendientes(documento)
    expect(item?.tipo).toBe('acuerdos-pendientes')
    expect(item?.titulo).toBe('Acuerdos y Pendientes')
  })

  it('sin esa sección fija ni ninguna pendientes-semaforo, no hay dónde aterrizar', async () => {
    const { reunionId } = await crearReunionConDocumento({
      salaSlug: 'neracode', tipo: 'mensual', titulo: '', fecha: new Date(), plantilla: 'en-blanco',
    })
    const documento = (await documentoDeReunion(reunionId))!
    expect(itemDeAcuerdosPendientes(documento)).toBeUndefined()
  })
})

describe('anadirAcuerdoRetomado', () => {
  it('referencia el id en la sección de Acuerdos y Pendientes: guarda el id, no el texto', async () => {
    const { reunionId, documentoId } = await documentoEstatus()
    await anadirAcuerdoRetomado(documentoId, 'acuerdo-1')

    const documento = (await documentoDeReunion(reunionId))!
    const item = itemDeAcuerdosPendientes(documento)!
    expect(item.contenido.acuerdoIdsRetomados).toEqual(['acuerdo-1'])
  })

  it('es idempotente: retomar el mismo acuerdo dos veces no lo duplica en la lista', async () => {
    const { reunionId, documentoId } = await documentoEstatus()
    await anadirAcuerdoRetomado(documentoId, 'acuerdo-1')
    await anadirAcuerdoRetomado(documentoId, 'acuerdo-1')

    const documento = (await documentoDeReunion(reunionId))!
    expect(itemDeAcuerdosPendientes(documento)!.contenido.acuerdoIdsRetomados).toEqual(['acuerdo-1'])
  })

  it('dos acuerdos distintos se acumulan, en el orden en que se retomaron', async () => {
    const { reunionId, documentoId } = await documentoEstatus()
    await anadirAcuerdoRetomado(documentoId, 'acuerdo-1')
    await anadirAcuerdoRetomado(documentoId, 'acuerdo-2')

    const documento = (await documentoDeReunion(reunionId))!
    expect(itemDeAcuerdosPendientes(documento)!.contenido.acuerdoIdsRetomados).toEqual(['acuerdo-1', 'acuerdo-2'])
  })

  it('sin una sección de Acuerdos y Pendientes en el documento, avisa en vez de fallar en silencio', async () => {
    const { documentoId } = await crearReunionConDocumento({
      salaSlug: 'neracode', tipo: 'mensual', titulo: '', fecha: new Date(), plantilla: 'en-blanco',
    })
    await expect(anadirAcuerdoRetomado(documentoId, 'acuerdo-1')).rejects.toThrow(/Acuerdos y Pendientes/)
  })

  it('un documento inexistente revienta con un mensaje claro', async () => {
    await expect(anadirAcuerdoRetomado('no-existe', 'acuerdo-1')).rejects.toThrow('Documento no encontrado')
  })
})

describe('un acuerdo retomado cuenta como contenido real (esLlenado)', () => {
  it('la sección nace vacía y pasa a "llenada" con SOLO un acuerdo retomado — nada tecleado', async () => {
    const { reunionId, documentoId } = await documentoEstatus()
    const antes = itemDeAcuerdosPendientes((await documentoDeReunion(reunionId))!)!
    expect(antes.llenado).toBe(false)

    await anadirAcuerdoRetomado(documentoId, 'acuerdo-1')

    const despues = itemDeAcuerdosPendientes((await documentoDeReunion(reunionId))!)!
    expect(despues.llenado).toBe(true)
  })

  it('por eso entra a "Maquetar": antes, una sección solo con acuerdos retomados se excluía por "vacía"', async () => {
    const { reunionId, documentoId } = await documentoEstatus()
    await anadirAcuerdoRetomado(documentoId, 'acuerdo-1')

    const documento = (await documentoDeReunion(reunionId))!
    const entradas = entradasCrudasDeDocumento(documento)
    expect(entradas.some((e) => e.titulo === 'Acuerdos y Pendientes')).toBe(true)
  })
})
