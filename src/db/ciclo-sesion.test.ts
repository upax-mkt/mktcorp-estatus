import { describe, it, expect, beforeEach } from 'vitest'
import {
  crearSesionConEstructura, obtenerSesion, marcarPresentada, guardarSeccion,
  entradasCrudasDeSesion, guardarDecisiones, editarSesion,
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

describe('agendar', () => {
  it('nace como fecha en el calendario, no como trabajo en curso', async () => {
    const { id } = await crearSesionConEstructura({
      salaSlug: 'zeus',
      tipo: 'mensual',
      alcance: 'todos',
      fecha: new Date('2026-08-19T16:00:00Z'),
      titulo: 'Estatus de agosto',
      participantes: ['Ceci', 'Franco'],
      lugar: 'Teams',
      estado: 'agendada',
    })

    const sesion = (await obtenerSesion(id))!
    expect(sesion.estado).toBe('agendada')
    expect(sesion.titulo).toBe('Estatus de agosto')
    expect(sesion.participantes).toEqual(['Ceci', 'Franco'])
    expect(sesion.lugar).toBe('Teams')
    expect(sesion.fecha).toBe('2026-08-19T16:00:00.000Z')
  })

  it('deja de ser una fecha en cuanto alguien escribe algo dentro', async () => {
    // No hay botón de "empezar a preparar": se abre la sesión y se escribe.
    // Si el paso dependiera de acordarse, el hub diría "agendada" con medio
    // estatus ya redactado.
    const { id } = await crearSesionConEstructura({
      salaSlug: 'zeus', tipo: 'mensual', alcance: 'todos', estado: 'agendada',
    })
    const sesion = (await obtenerSesion(id))!
    await guardarSeccion(id, sesion.items[0].id, { layout: 'portada', titulo: 'Agosto' })

    expect((await obtenerSesion(id))!.estado).toBe('borrador')
  })

  it('sin título propio se pone uno legible, no una cadena vacía', async () => {
    const { id } = await crearSesionConEstructura({
      salaSlug: 'zeus', tipo: 'mensual', alcance: 'todos',
      fecha: new Date('2026-08-19T16:00:00Z'),
    })
    expect((await obtenerSesion(id))!.titulo).toMatch(/agosto/i)
  })
})

describe('editar los datos de la reunión', () => {
  async function agendada() {
    const { id } = await crearSesionConEstructura({
      salaSlug: 'zeus', tipo: 'mensual', alcance: 'todos',
      fecha: new Date('2026-08-19T16:00:00Z'), titulo: 'Estatus de agosto', estado: 'agendada',
    })
    return id
  }

  it('mueve la fecha sin tocar lo demás', async () => {
    const id = await agendada()
    await editarSesion(id, { fecha: new Date('2026-08-26T16:00:00Z') })
    const s = (await obtenerSesion(id))!
    expect(s.fecha).toBe('2026-08-26T16:00:00.000Z')
    expect(s.titulo).toBe('Estatus de agosto')
  })

  it('limpia la lista de participantes: sin vacíos ni repetidos', async () => {
    // "Ceci, , Pablo, Ceci," es lo normal al escribir a mano, no la excepción.
    const id = await agendada()
    await editarSesion(id, { participantes: ['Ceci', '  ', ' Pablo ', 'Ceci', ''] })
    expect((await obtenerSesion(id))!.participantes).toEqual(['Ceci', 'Pablo'])
  })

  it('vaciar el título se rechaza en vez de dejar la sesión sin nombre', async () => {
    const id = await agendada()
    await expect(editarSesion(id, { titulo: '   ' })).rejects.toThrow(/título/i)
    expect((await obtenerSesion(id))!.titulo).toBe('Estatus de agosto')
  })

  it('un lugar en blanco se guarda como "sin lugar", no como cadena vacía', async () => {
    const id = await agendada()
    await editarSesion(id, { lugar: '   ' })
    expect((await obtenerSesion(id))!.lugar).toBeNull()
  })

  it('una sesión que no existe se dice, no se ignora', async () => {
    await expect(editarSesion('no-existe', { lugar: 'Teams' })).rejects.toThrow(/no encontrada/i)
  })
})
