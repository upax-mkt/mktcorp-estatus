import { describe, it, expect, beforeEach } from 'vitest'
import {
  crearReunionConDocumento, documentoDeReunion, anadirSeccion, eliminarSeccion,
  moverItem, reordenarItems, guardarSeccion,
} from './documentos'
import { reiniciarStoreMemoria } from './store-memoria'
import { obtenerPlantilla } from '@/secciones/plantillas'

/**
 * La estructura de un documento es un ÁRBOL de dos niveles: ocho secciones
 * base —los bloques fijos de la reunión— y dentro las subsecciones, que es lo
 * que cambia de un mes a otro.
 *
 * Corre contra el store en memoria (sin DATABASE_URL): las dos ramas de
 * `documentos.ts` comparten la lógica de árbol, que es lo que se prueba aquí.
 *
 * Mudado de `sesiones.ts` (ronda 10, tarea 5b): mismos escenarios, adaptados
 * a que `crearReunionConDocumento` devuelve `{ reunionId, documentoId }` en
 * vez de un solo `id`, y a que las operaciones de item ahora piden
 * `documentoId`, no `sesionId`. `ESTRUCTURA_POR_DEFECTO` no se mudó a
 * `documentos.ts` (no estaba en su lista de exports): se lee directo de
 * `obtenerPlantilla`, la fuente de la que ya salía.
 */
beforeEach(() => reiniciarStoreMemoria())

async function documentoNuevo() {
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

describe('las ocho secciones base', () => {
  it('un documento nuevo arranca con ellas, en su orden', async () => {
    const { reunionId } = await documentoNuevo()
    const documento = (await documentoDeReunion(reunionId))!
    expect(documento.items.map((i) => i.titulo)).toEqual([
      'Portada', 'Agenda', 'Acuerdos y Pendientes', 'Portafolio & Ecosistema',
      'Performance & Conversión', 'Campañas 360', 'RevOps', 'Outbound & Pipeline',
    ])
    expect(documento.items.every((i) => i.esBase)).toBe(true)
    expect(obtenerPlantilla('estatus-udn').items).toHaveLength(8)
  })

  it('no se pueden borrar: son la estructura del documento', async () => {
    const { reunionId, documentoId } = await documentoNuevo()
    const documento = (await documentoDeReunion(reunionId))!
    const revops = documento.items.find((i) => i.tipo === 'revops')!
    await expect(eliminarSeccion(documentoId, revops.id)).rejects.toThrow(/sección base/i)
    expect((await documentoDeReunion(reunionId))!.items).toHaveLength(8)
  })
})

describe('subsecciones', () => {
  it('entran dentro de su bloque, justo antes del siguiente', async () => {
    const { reunionId, documentoId } = await documentoNuevo()
    const antes = (await documentoDeReunion(reunionId))!
    const performance = antes.items.find((i) => i.tipo === 'performance-conversion')!

    await anadirSeccion(documentoId, 'grafico-y-tabla', 'Sitio web', performance.tipo)

    const documento = (await documentoDeReunion(reunionId))!
    const posiciones = documento.items.map((i) => i.titulo)
    // Justo después de su bloque, no al final del documento.
    expect(posiciones.indexOf('Sitio web')).toBe(posiciones.indexOf('Performance & Conversión') + 1)
    expect(documento.items.find((i) => i.titulo === 'Sitio web')!.padre).toBe('performance-conversion')
  })

  it('varias en el mismo bloque se apilan en el orden en que se añaden', async () => {
    const { reunionId, documentoId } = await documentoNuevo()
    const padre = 'performance-conversion'
    await anadirSeccion(documentoId, 'grafico-y-tabla', 'Sitio web', padre)
    await anadirSeccion(documentoId, 'kpis-fila-dos-columnas', 'Paid media', padre)

    const documento = (await documentoDeReunion(reunionId))!
    const hijas = documento.items.filter((i) => i.padre === padre).map((i) => i.titulo)
    expect(hijas).toEqual(['Sitio web', 'Paid media'])
  })

  it('una sección añadida sin padre es un bloque nuevo', async () => {
    const { reunionId, documentoId } = await documentoNuevo()
    await anadirSeccion(documentoId, 'divisor-seccion', 'Un bloque más')
    const documento = (await documentoDeReunion(reunionId))!
    const nueva = documento.items.find((i) => i.titulo === 'Un bloque más')!
    expect(nueva.padre).toBeUndefined()
    expect(nueva.esBase).toBe(false) // se puede borrar: no es una de las ocho
  })

  it('borrar un bloque añadido se lleva sus subsecciones', async () => {
    const { reunionId, documentoId } = await documentoNuevo()
    await anadirSeccion(documentoId, 'divisor-seccion', 'Temporal')
    const conBloque = (await documentoDeReunion(reunionId))!
    const bloque = conBloque.items.find((i) => i.titulo === 'Temporal')!
    await anadirSeccion(documentoId, 'kpis-fila-dos-columnas', 'Dentro', bloque.tipo)
    expect((await documentoDeReunion(reunionId))!.items).toHaveLength(10)

    await eliminarSeccion(documentoId, bloque.id)

    const documento = (await documentoDeReunion(reunionId))!
    expect(documento.items).toHaveLength(8)
    // Ninguna huérfana: sin esto la subsección seguiría en la base sin salir
    // en el editor, y reaparecería en el documento.
    expect(documento.items.some((i) => i.titulo === 'Dentro')).toBe(false)
  })
})

describe('mover secciones', () => {
  it('una subsección se mueve DENTRO de su bloque, no se escapa al siguiente', async () => {
    const { reunionId, documentoId } = await documentoNuevo()
    const padre = 'performance-conversion'
    await anadirSeccion(documentoId, 'grafico-y-tabla', 'Sitio web', padre)
    await anadirSeccion(documentoId, 'kpis-fila-dos-columnas', 'Paid media', padre)

    const antes = (await documentoDeReunion(reunionId))!
    const paid = antes.items.find((i) => i.titulo === 'Paid media')!
    await moverItem(documentoId, paid.id, 'arriba')

    const documento = (await documentoDeReunion(reunionId))!
    expect(documento.items.filter((i) => i.padre === padre).map((i) => i.titulo)).toEqual(['Paid media', 'Sitio web'])
    // Sigue colgando del mismo bloque.
    expect(documento.items.find((i) => i.titulo === 'Paid media')!.padre).toBe(padre)
  })

  it('la primera subsección de un bloque no sube al bloque de arriba', async () => {
    const { reunionId, documentoId } = await documentoNuevo()
    await anadirSeccion(documentoId, 'grafico-y-tabla', 'Sitio web', 'performance-conversion')
    const antes = (await documentoDeReunion(reunionId))!
    const sitio = antes.items.find((i) => i.titulo === 'Sitio web')!

    await moverItem(documentoId, sitio.id, 'arriba')

    const documento = (await documentoDeReunion(reunionId))!
    expect(documento.items.find((i) => i.titulo === 'Sitio web')!.padre).toBe('performance-conversion')
    expect(documento.items.map((i) => i.titulo).indexOf('Sitio web')).toBe(
      documento.items.map((i) => i.titulo).indexOf('Performance & Conversión') + 1,
    )
  })

  it('mover un bloque se lleva sus subsecciones con él', async () => {
    const { reunionId, documentoId } = await documentoNuevo()
    await anadirSeccion(documentoId, 'grafico-y-tabla', 'Sitio web', 'performance-conversion')
    const antes = (await documentoDeReunion(reunionId))!
    const performance = antes.items.find((i) => i.tipo === 'performance-conversion')!

    await moverItem(documentoId, performance.id, 'arriba')

    const titulos = (await documentoDeReunion(reunionId))!.items.map((i) => i.titulo)
    // Sube un puesto y su subsección va detrás, pegada.
    expect(titulos.indexOf('Sitio web')).toBe(titulos.indexOf('Performance & Conversión') + 1)
    expect(titulos.indexOf('Performance & Conversión')).toBeLessThan(titulos.indexOf('Portafolio & Ecosistema'))
  })
})

describe('arrastrar bloques', () => {
  it('reordenar los bloques recoloca también sus subsecciones', async () => {
    const { reunionId, documentoId } = await documentoNuevo()
    await anadirSeccion(documentoId, 'grafico-y-tabla', 'Sitio web', 'performance-conversion')
    const antes = (await documentoDeReunion(reunionId))!
    const bases = antes.items.filter((i) => !i.padre)

    // Se manda el último bloque al principio, como haría el arrastre.
    const nuevoOrden = [bases[bases.length - 1].id, ...bases.slice(0, -1).map((b) => b.id)]
    await reordenarItems(documentoId, nuevoOrden)

    const titulos = (await documentoDeReunion(reunionId))!.items.map((i) => i.titulo)
    expect(titulos[0]).toBe('Outbound & Pipeline')
    expect(titulos.indexOf('Sitio web')).toBe(titulos.indexOf('Performance & Conversión') + 1)
  })

  it('una lista que no son los bloques exactos se ignora: llega del navegador', async () => {
    const { reunionId, documentoId } = await documentoNuevo()
    const antes = (await documentoDeReunion(reunionId))!
    await reordenarItems(documentoId, ['inventado-1', 'inventado-2'])
    const despues = (await documentoDeReunion(reunionId))!
    expect(despues.items.map((i) => i.id)).toEqual(antes.items.map((i) => i.id))
  })
})

describe('el título del bloque manda sobre el nombre de plantilla', () => {
  it('en la lista se lee lo que escribió el equipo', async () => {
    const { reunionId, documentoId } = await documentoNuevo()
    const antes = (await documentoDeReunion(reunionId))!
    const revops = antes.items.find((i) => i.tipo === 'revops')!
    await guardarSeccion(documentoId, revops.id, { layout: 'divisor-seccion', titulo: 'RevOps · higiene de datos' })

    const documento = (await documentoDeReunion(reunionId))!
    expect(documento.items.find((i) => i.tipo === 'revops')!.titulo).toBe('RevOps · higiene de datos')
  })
})
