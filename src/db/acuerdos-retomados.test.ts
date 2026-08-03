import { describe, it, expect, beforeEach } from 'vitest'
import {
  crearSesionConEstructura, obtenerSesion, anadirAcuerdoRetomado, itemDeAcuerdosPendientes,
  entradasCrudasDeSesion,
} from './sesiones'
import { reiniciarStoreMemoria } from './store-memoria'

/**
 * Retomar un acuerdo en una sesión (ronda 9, tarea 6 — revisión). Corre
 * contra el store en memoria (sin DATABASE_URL), como el resto de
 * sesiones.ts: aquí se prueba la REFERENCIA (el id se guarda, se acumula, es
 * idempotente, cuenta como contenido real) — la RESOLUCIÓN contra la tabla
 * `acuerdos` (que un id se convierta en `Acuerdo` con su estatus de ahora)
 * es camino de Postgres y no tiene doble en memoria: sin DB, `acuerdosRetomados`
 * se queda en `[]` siempre, a propósito (ver `resolverAcuerdosRetomados`).
 */
beforeEach(() => reiniciarStoreMemoria())

async function sesionEstatus() {
  const { id } = await crearSesionConEstructura({ salaSlug: 'neracode', tipo: 'mensual', alcance: 'todos' })
  return id
}

describe('itemDeAcuerdosPendientes', () => {
  it('encuentra la sección fija de un estatus de UDN por su tipo', async () => {
    const sesion = (await obtenerSesion(await sesionEstatus()))!
    const item = itemDeAcuerdosPendientes(sesion)
    expect(item?.tipo).toBe('acuerdos-pendientes')
    expect(item?.titulo).toBe('Acuerdos y Pendientes')
  })

  it('sin esa sección fija ni ninguna pendientes-semaforo, no hay dónde aterrizar', async () => {
    const { id } = await crearSesionConEstructura({
      salaSlug: 'neracode', tipo: 'mensual', alcance: 'todos', plantilla: 'en-blanco',
    })
    const sesion = (await obtenerSesion(id))!
    expect(itemDeAcuerdosPendientes(sesion)).toBeUndefined()
  })
})

describe('anadirAcuerdoRetomado', () => {
  it('referencia el id en la sección de Acuerdos y Pendientes: guarda el id, no el texto', async () => {
    const id = await sesionEstatus()
    await anadirAcuerdoRetomado(id, 'acuerdo-1')

    const sesion = (await obtenerSesion(id))!
    const item = itemDeAcuerdosPendientes(sesion)!
    expect(item.contenido.acuerdoIdsRetomados).toEqual(['acuerdo-1'])
  })

  it('es idempotente: retomar el mismo acuerdo dos veces no lo duplica en la lista', async () => {
    const id = await sesionEstatus()
    await anadirAcuerdoRetomado(id, 'acuerdo-1')
    await anadirAcuerdoRetomado(id, 'acuerdo-1')

    const sesion = (await obtenerSesion(id))!
    expect(itemDeAcuerdosPendientes(sesion)!.contenido.acuerdoIdsRetomados).toEqual(['acuerdo-1'])
  })

  it('dos acuerdos distintos se acumulan, en el orden en que se retomaron', async () => {
    const id = await sesionEstatus()
    await anadirAcuerdoRetomado(id, 'acuerdo-1')
    await anadirAcuerdoRetomado(id, 'acuerdo-2')

    const sesion = (await obtenerSesion(id))!
    expect(itemDeAcuerdosPendientes(sesion)!.contenido.acuerdoIdsRetomados).toEqual(['acuerdo-1', 'acuerdo-2'])
  })

  it('sin una sección de Acuerdos y Pendientes en la sesión, avisa en vez de fallar en silencio', async () => {
    const { id } = await crearSesionConEstructura({
      salaSlug: 'neracode', tipo: 'mensual', alcance: 'todos', plantilla: 'en-blanco',
    })
    await expect(anadirAcuerdoRetomado(id, 'acuerdo-1')).rejects.toThrow(/Acuerdos y Pendientes/)
  })

  it('una sesión inexistente revienta con un mensaje claro', async () => {
    await expect(anadirAcuerdoRetomado('no-existe', 'acuerdo-1')).rejects.toThrow('Sesión no encontrada')
  })
})

describe('un acuerdo retomado cuenta como contenido real (esLlenado)', () => {
  it('la sección nace vacía y pasa a "llenada" con SOLO un acuerdo retomado — nada tecleado', async () => {
    const id = await sesionEstatus()
    const antes = itemDeAcuerdosPendientes((await obtenerSesion(id))!)!
    expect(antes.llenado).toBe(false)

    await anadirAcuerdoRetomado(id, 'acuerdo-1')

    const despues = itemDeAcuerdosPendientes((await obtenerSesion(id))!)!
    expect(despues.llenado).toBe(true)
  })

  it('por eso entra a "Maquetar": antes, una sección solo con acuerdos retomados se excluía por "vacía"', async () => {
    const id = await sesionEstatus()
    await anadirAcuerdoRetomado(id, 'acuerdo-1')

    const sesion = (await obtenerSesion(id))!
    const entradas = entradasCrudasDeSesion(sesion)
    expect(entradas.some((e) => e.titulo === 'Acuerdos y Pendientes')).toBe(true)
  })
})
