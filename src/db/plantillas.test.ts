import { describe, it, expect, beforeEach } from 'vitest'
import { crearSesionConEstructura, obtenerSesion, eliminarSeccion } from './sesiones'
import { reiniciarStoreMemoria } from './store-memoria'
import { PLANTILLAS, obtenerPlantilla, tiposFijosDe } from '@/secciones/plantillas'

/**
 * Que la herramienta sirva para CUALQUIER reunión.
 *
 * Hasta la ronda 2 daba por hecho que toda sesión era el estatus mensual de
 * una UDN: colgaba de una de las diez salas y arrancaba con ocho secciones
 * escritas en el código como si fueran una ley del dominio.
 */
beforeEach(() => reiniciarStoreMemoria())

describe('plantillas', () => {
  it('cada una tiene id único y al menos una sección', () => {
    const ids = PLANTILLAS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const p of PLANTILLAS) expect(p.items.length).toBeGreaterThan(0)
  })

  it('dentro de una plantilla no se repite un tipo de sección', () => {
    // Dos secciones con el mismo `tipo` se pisan: la identidad de una sección
    // es su tipo, y es como se reasocia su contenido al reordenar.
    for (const p of PLANTILLAS) {
      const tipos = p.items.map((i) => i.tipo)
      expect(new Set(tipos).size, `"${p.id}" repite un tipo`).toBe(tipos.length)
    }
  })

  it('una plantilla desconocida cae en la de estatus, no revienta', () => {
    expect(obtenerPlantilla('no-existe').id).toBe('estatus-udn')
    expect(obtenerPlantilla(null).id).toBe('estatus-udn')
  })

  it('solo el estatus de UDN tiene secciones intocables', () => {
    // Los ocho bloques son el acuerdo con la unidad: borrar "RevOps" de un
    // estatus no es personalizar, es incumplir. En una reunión libre no hay
    // nada sagrado.
    expect(tiposFijosDe('estatus-udn').size).toBe(8)
    expect(tiposFijosDe('comite').size).toBe(0)
    expect(tiposFijosDe('en-blanco').size).toBe(0)
  })
})

describe('crear una reunión con plantilla', () => {
  it('nace con las secciones de SU plantilla, no con las ocho del estatus', async () => {
    const { id } = await crearSesionConEstructura({
      salaSlug: null, plantilla: 'comite', tipo: 'mensual', alcance: 'todos',
    })
    const sesion = (await obtenerSesion(id))!
    expect(sesion.items.map((i) => i.titulo)).toEqual([
      'Portada', 'La situación', 'Las opciones', 'Lo que se pide', 'Cierre',
    ])
  })

  it('la de "en blanco" arranca con una sola sección', async () => {
    const { id } = await crearSesionConEstructura({
      salaSlug: null, plantilla: 'en-blanco', tipo: 'mensual', alcance: 'todos',
    })
    expect((await obtenerSesion(id))!.items).toHaveLength(1)
  })

  it('sin plantilla sigue naciendo como estatus de UDN: el flujo viejo no cambia', async () => {
    const { id } = await crearSesionConEstructura({
      salaSlug: 'zeus', tipo: 'mensual', alcance: 'todos',
    })
    const sesion = (await obtenerSesion(id))!
    expect(sesion.items).toHaveLength(8)
    expect(sesion.plantilla).toBe('estatus-udn')
  })
})

describe('reuniones que no son de ninguna sala', () => {
  it('se crean sin sala y se visten con la identidad del grupo', async () => {
    const { id } = await crearSesionConEstructura({
      salaSlug: null, plantilla: 'arranque', tipo: 'mensual', alcance: 'campaña de fin de año',
    })
    const sesion = (await obtenerSesion(id))!
    expect(sesion.salaSlug).toBeNull()
    // No se queda sin nombre ni sin color: los toma de quien la convoca.
    expect(sesion.salaNombre).toBe('Marketing Corp')
    expect(sesion.salaColor).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  it('una sala inventada sigue reventando: null es "ninguna", no "cualquiera"', async () => {
    await expect(
      crearSesionConEstructura({ salaSlug: 'inventada', tipo: 'mensual', alcance: 'todos' }),
    ).rejects.toThrow(/desconocida/i)
  })
})

describe('qué se puede borrar', () => {
  it('en un estatus de UDN, sus ocho bloques no se borran', async () => {
    const { id } = await crearSesionConEstructura({
      salaSlug: 'zeus', plantilla: 'estatus-udn', tipo: 'mensual', alcance: 'todos',
    })
    const sesion = (await obtenerSesion(id))!
    const revops = sesion.items.find((i) => i.tipo === 'revops')!
    expect(revops.esBase).toBe(true)
    await expect(eliminarSeccion(id, revops.id)).rejects.toThrow()
  })

  it('en una reunión libre, cualquier sección se puede quitar', async () => {
    const { id } = await crearSesionConEstructura({
      salaSlug: null, plantilla: 'comite', tipo: 'mensual', alcance: 'todos',
    })
    const sesion = (await obtenerSesion(id))!
    const opciones = sesion.items.find((i) => i.tipo === 'opciones')!
    expect(opciones.esBase).toBe(false)

    await eliminarSeccion(id, opciones.id)
    const despues = (await obtenerSesion(id))!
    expect(despues.items.map((i) => i.tipo)).not.toContain('opciones')
  })
})
