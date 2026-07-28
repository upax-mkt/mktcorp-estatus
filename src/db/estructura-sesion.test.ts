import { describe, it, expect, beforeEach } from 'vitest'
import {
  crearSesionConEstructura, obtenerSesion, anadirSeccion, eliminarSeccion,
  moverItem, reordenarItems, guardarSeccion, ESTRUCTURA_POR_DEFECTO,
} from './sesiones'
import { reiniciarStoreMemoria } from './store-memoria'

/**
 * La estructura de una sesión es un ÁRBOL de dos niveles: ocho secciones base
 * —los bloques fijos de la reunión— y dentro las subsecciones, que es lo que
 * cambia de un mes a otro.
 *
 * Corre contra el store en memoria (sin DATABASE_URL): las dos ramas de
 * `sesiones.ts` comparten la lógica de árbol, que es lo que se prueba aquí.
 */
beforeEach(() => reiniciarStoreMemoria())

async function sesionNueva() {
  const { id } = await crearSesionConEstructura({ salaSlug: 'neracode', tipo: 'mensual', alcance: 'todos' })
  return id
}

describe('las ocho secciones base', () => {
  it('una sesión nueva arranca con ellas, en su orden', async () => {
    const sesion = (await obtenerSesion(await sesionNueva()))!
    expect(sesion.items.map((i) => i.titulo)).toEqual([
      'Portada', 'Agenda', 'Acuerdos y Pendientes', 'Portafolio & Ecosistema',
      'Performance & Conversión', 'Campañas 360', 'RevOps', 'Outbound & Pipeline',
    ])
    expect(sesion.items.every((i) => i.esBase)).toBe(true)
    expect(ESTRUCTURA_POR_DEFECTO).toHaveLength(8)
  })

  it('no se pueden borrar: son la estructura de la reunión', async () => {
    const id = await sesionNueva()
    const sesion = (await obtenerSesion(id))!
    const revops = sesion.items.find((i) => i.tipo === 'revops')!
    await expect(eliminarSeccion(id, revops.id)).rejects.toThrow(/sección base/i)
    expect((await obtenerSesion(id))!.items).toHaveLength(8)
  })
})

describe('subsecciones', () => {
  it('entran dentro de su bloque, justo antes del siguiente', async () => {
    const id = await sesionNueva()
    const antes = (await obtenerSesion(id))!
    const performance = antes.items.find((i) => i.tipo === 'performance-conversion')!

    await anadirSeccion(id, 'grafico-y-tabla', 'Sitio web', performance.tipo)

    const sesion = (await obtenerSesion(id))!
    const posiciones = sesion.items.map((i) => i.titulo)
    // Justo después de su bloque, no al final de la sesión.
    expect(posiciones.indexOf('Sitio web')).toBe(posiciones.indexOf('Performance & Conversión') + 1)
    expect(sesion.items.find((i) => i.titulo === 'Sitio web')!.padre).toBe('performance-conversion')
  })

  it('varias en el mismo bloque se apilan en el orden en que se añaden', async () => {
    const id = await sesionNueva()
    const padre = 'performance-conversion'
    await anadirSeccion(id, 'grafico-y-tabla', 'Sitio web', padre)
    await anadirSeccion(id, 'kpis-fila-dos-columnas', 'Paid media', padre)

    const sesion = (await obtenerSesion(id))!
    const hijas = sesion.items.filter((i) => i.padre === padre).map((i) => i.titulo)
    expect(hijas).toEqual(['Sitio web', 'Paid media'])
  })

  it('una sección añadida sin padre es un bloque nuevo', async () => {
    const id = await sesionNueva()
    await anadirSeccion(id, 'divisor-seccion', 'Un bloque más')
    const sesion = (await obtenerSesion(id))!
    const nueva = sesion.items.find((i) => i.titulo === 'Un bloque más')!
    expect(nueva.padre).toBeUndefined()
    expect(nueva.esBase).toBe(false) // se puede borrar: no es una de las ocho
  })

  it('borrar un bloque añadido se lleva sus subsecciones', async () => {
    const id = await sesionNueva()
    await anadirSeccion(id, 'divisor-seccion', 'Temporal')
    const conBloque = (await obtenerSesion(id))!
    const bloque = conBloque.items.find((i) => i.titulo === 'Temporal')!
    await anadirSeccion(id, 'kpis-fila-dos-columnas', 'Dentro', bloque.tipo)
    expect((await obtenerSesion(id))!.items).toHaveLength(10)

    await eliminarSeccion(id, bloque.id)

    const sesion = (await obtenerSesion(id))!
    expect(sesion.items).toHaveLength(8)
    // Ninguna huérfana: sin esto la subsección seguiría en la base sin salir
    // en el editor, y reaparecería en el documento.
    expect(sesion.items.some((i) => i.titulo === 'Dentro')).toBe(false)
  })
})

describe('mover secciones', () => {
  it('una subsección se mueve DENTRO de su bloque, no se escapa al siguiente', async () => {
    const id = await sesionNueva()
    const padre = 'performance-conversion'
    await anadirSeccion(id, 'grafico-y-tabla', 'Sitio web', padre)
    await anadirSeccion(id, 'kpis-fila-dos-columnas', 'Paid media', padre)

    const antes = (await obtenerSesion(id))!
    const paid = antes.items.find((i) => i.titulo === 'Paid media')!
    await moverItem(id, paid.id, 'arriba')

    const sesion = (await obtenerSesion(id))!
    expect(sesion.items.filter((i) => i.padre === padre).map((i) => i.titulo)).toEqual(['Paid media', 'Sitio web'])
    // Sigue colgando del mismo bloque.
    expect(sesion.items.find((i) => i.titulo === 'Paid media')!.padre).toBe(padre)
  })

  it('la primera subsección de un bloque no sube al bloque de arriba', async () => {
    const id = await sesionNueva()
    await anadirSeccion(id, 'grafico-y-tabla', 'Sitio web', 'performance-conversion')
    const antes = (await obtenerSesion(id))!
    const sitio = antes.items.find((i) => i.titulo === 'Sitio web')!

    await moverItem(id, sitio.id, 'arriba')

    const sesion = (await obtenerSesion(id))!
    expect(sesion.items.find((i) => i.titulo === 'Sitio web')!.padre).toBe('performance-conversion')
    expect(sesion.items.map((i) => i.titulo).indexOf('Sitio web')).toBe(
      sesion.items.map((i) => i.titulo).indexOf('Performance & Conversión') + 1,
    )
  })

  it('mover un bloque se lleva sus subsecciones con él', async () => {
    const id = await sesionNueva()
    await anadirSeccion(id, 'grafico-y-tabla', 'Sitio web', 'performance-conversion')
    const antes = (await obtenerSesion(id))!
    const performance = antes.items.find((i) => i.tipo === 'performance-conversion')!

    await moverItem(id, performance.id, 'arriba')

    const titulos = (await obtenerSesion(id))!.items.map((i) => i.titulo)
    // Sube un puesto y su subsección va detrás, pegada.
    expect(titulos.indexOf('Sitio web')).toBe(titulos.indexOf('Performance & Conversión') + 1)
    expect(titulos.indexOf('Performance & Conversión')).toBeLessThan(titulos.indexOf('Portafolio & Ecosistema'))
  })
})

describe('arrastrar bloques', () => {
  it('reordenar los bloques recoloca también sus subsecciones', async () => {
    const id = await sesionNueva()
    await anadirSeccion(id, 'grafico-y-tabla', 'Sitio web', 'performance-conversion')
    const antes = (await obtenerSesion(id))!
    const bases = antes.items.filter((i) => !i.padre)

    // Se manda el último bloque al principio, como haría el arrastre.
    const nuevoOrden = [bases[bases.length - 1].id, ...bases.slice(0, -1).map((b) => b.id)]
    await reordenarItems(id, nuevoOrden)

    const titulos = (await obtenerSesion(id))!.items.map((i) => i.titulo)
    expect(titulos[0]).toBe('Outbound & Pipeline')
    expect(titulos.indexOf('Sitio web')).toBe(titulos.indexOf('Performance & Conversión') + 1)
  })

  it('una lista que no son los bloques exactos se ignora: llega del navegador', async () => {
    const id = await sesionNueva()
    const antes = (await obtenerSesion(id))!
    await reordenarItems(id, ['inventado-1', 'inventado-2'])
    const despues = (await obtenerSesion(id))!
    expect(despues.items.map((i) => i.id)).toEqual(antes.items.map((i) => i.id))
  })
})

describe('el título del bloque manda sobre el nombre de plantilla', () => {
  it('en la lista se lee lo que escribió el equipo', async () => {
    const id = await sesionNueva()
    const antes = (await obtenerSesion(id))!
    const revops = antes.items.find((i) => i.tipo === 'revops')!
    await guardarSeccion(id, revops.id, { layout: 'divisor-seccion', titulo: 'RevOps · higiene de datos' })

    const sesion = (await obtenerSesion(id))!
    expect(sesion.items.find((i) => i.tipo === 'revops')!.titulo).toBe('RevOps · higiene de datos')
  })
})
