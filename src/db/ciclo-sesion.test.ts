import { describe, it, expect, beforeEach } from 'vitest'
import {
  crearSesionConEstructura, obtenerSesion, marcarPresentada, guardarSeccion,
  entradasCrudasDeSesion, guardarDecisiones,
} from './sesiones'
import { reiniciarStoreMemoria } from './store-memoria'

/**
 * El ciclo de una sesión: `borrador → lista → presentada → minutada`.
 *
 * El eslabón que faltaba era `presentada`: nada lo ponía, así que una sesión
 * maquetada se quedaba en `lista` para siempre y NUNCA aparecía en la sala de
 * su UDN —la sala lista como presentaciones las que ya sucedieron— ni podía
 * tener minuta.
 */
beforeEach(() => reiniciarStoreMemoria())

async function sesionMaquetada() {
  const { id } = await crearSesionConEstructura({
    salaSlug: 'neracode',
    tipo: 'mensual',
    alcance: 'todos',
  })
  const sesion = (await obtenerSesion(id))!
  await guardarSeccion(id, sesion.items[0].id, { layout: 'portada', titulo: 'Estatus de junio' })

  const conContenido = (await obtenerSesion(id))!
  const entradas = entradasCrudasDeSesion(conContenido)
  await guardarDecisiones(
    id,
    entradas.map(() => ({
      decision: {
        layout: 'portada' as const,
        titulo: 'Estatus de junio',
        razon: 'prueba',
      },
      degradado: false,
    })),
  )
  return id
}

describe('marcar una sesión como presentada', () => {
  it('una sesión en borrador no se ha presentado: se rechaza', async () => {
    const { id } = await crearSesionConEstructura({
      salaSlug: 'neracode',
      tipo: 'mensual',
      alcance: 'todos',
    })
    expect((await obtenerSesion(id))!.estado).toBe('borrador')
    await expect(marcarPresentada(id)).rejects.toThrow(/borrador/i)
  })

  it('una sesión maquetada pasa a presentada', async () => {
    const id = await sesionMaquetada()
    expect((await obtenerSesion(id))!.estado).toBe('lista')

    await marcarPresentada(id)
    expect((await obtenerSesion(id))!.estado).toBe('presentada')
  })

  it('no retrocede: una minutada sigue minutada', async () => {
    const id = await sesionMaquetada()
    await marcarPresentada(id)
    // Simula el final del ciclo sin pasar por la minuta entera.
    const { actualizarEstadoSesionMemoria } = await import('./store-memoria')
    actualizarEstadoSesionMemoria(id, 'minutada')

    await marcarPresentada(id)
    expect((await obtenerSesion(id))!.estado).toBe('minutada')
  })

  it('pulsar dos veces no rompe nada', async () => {
    const id = await sesionMaquetada()
    await marcarPresentada(id)
    await marcarPresentada(id)
    expect((await obtenerSesion(id))!.estado).toBe('presentada')
  })

  it('una sesión que no existe se dice, no se ignora en silencio', async () => {
    await expect(marcarPresentada('no-existe')).rejects.toThrow(/no encontrada/i)
  })
})
