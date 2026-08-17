import { describe, it, expect, beforeEach } from 'vitest'
import { crearReunionConDocumento, documentoDeReunion, eliminarSeccion } from './documentos'
import { reiniciarStoreMemoria } from './store-memoria'
import { PLANTILLAS, obtenerPlantilla, tiposFijosDe } from '@/secciones/plantillas'

/**
 * Que la herramienta sirva para CUALQUIER reunión.
 *
 * Hasta la ronda 2 daba por hecho que toda sesión era el estatus mensual de
 * una UDN: colgaba de una de las diez salas y arrancaba con ocho secciones
 * escritas en el código como si fueran una ley del dominio.
 *
 * Mudado de `sesiones.ts` (ronda 10, tarea 5b). El describe original
 * "reuniones que no son de ninguna sala" perdió su primer test: `crearSesion`
 * admitía `salaSlug: null` (una reunión de comité, vestida con la identidad
 * de Marketing Corp); `crearReunion`/`crearReunionConDocumento`
 * (`src/db/reuniones.ts`, Tarea 4) exigen `salaSlug: string` — decisión ya
 * tomada y revisada en la Tarea 4 ("una reunión sin sala... queda fuera de
 * este modelo por ahora", comentario de `DatosDeReunion`), no algo que esta
 * tarea decida ni deba deshacer. El segundo test del describe ("sala
 * inventada") no dependía de esa rama — prueba lo contrario, que un slug que
 * no existe se sigue rechazando — así que sí se muda, tal cual. Las demás
 * pruebas de este archivo usaban `salaSlug: null` como comodín ("cualquier
 * sala vale, no es el punto de este test"): se cambiaron a una sala real
 * (`neracode`) sin tocar lo que de verdad prueban.
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
    const { reunionId } = await crearReunionConDocumento({
      salaSlug: 'neracode', plantilla: 'comite', tipo: 'mensual', titulo: '', fecha: new Date(),
    })
    const documento = (await documentoDeReunion(reunionId))!
    expect(documento.items.map((i) => i.titulo)).toEqual([
      'Portada', 'La situación', 'Las opciones', 'Lo que se pide', 'Cierre',
    ])
  })

  it('la de "en blanco" arranca con una sola sección', async () => {
    const { reunionId } = await crearReunionConDocumento({
      salaSlug: 'neracode', plantilla: 'en-blanco', tipo: 'mensual', titulo: '', fecha: new Date(),
    })
    expect((await documentoDeReunion(reunionId))!.items).toHaveLength(1)
  })

  /**
   * ⚠️ ESTE TEST AFIRMABA EL DEFECTO COMO SI FUERA LA REGLA.
   *
   * Se llamaba "sin plantilla sigue naciendo como estatus de UDN: el flujo
   * viejo no cambia" y exigía ocho secciones y `plantilla: 'estatus-udn'` para
   * una junta que nadie clasificó. Eso es justo lo que se arregló el 17-ago:
   * la reunión decía `null` y su documento decía "estatus de UDN", dos campos
   * respondiendo distinto a la misma pregunta. Y los ocho bloques no son un
   * relleno neutro: son lo que Marketing Corp le prometió a cada unidad de
   * negocio.
   *
   * Un test que fija el comportamiento equivocado no protege, ancla.
   */
  it('sin clase, el documento tampoco la inventa: nace mínimo y sin plantilla', async () => {
    const { reunionId } = await crearReunionConDocumento({
      salaSlug: 'zeus', tipo: 'mensual', titulo: '', fecha: new Date(),
    })
    const documento = (await documentoDeReunion(reunionId))!
    expect(documento.items).toHaveLength(1)
    expect(documento.plantilla).toBeNull()
  })
})

describe('sembrar contenido inicial de plantilla (ronda 15, tarea 1)', () => {
  /**
   * REGRESIÓN: las plantillas de antes de esta ronda no declaran `contenido`
   * en ninguno de sus items, y su comportamiento al sembrar NO PUEDE cambiar
   * — es la condición explícita de la tarea. Sin `contenido`, el sembrador
   * tiene que seguir cayendo a `{ layout: d.layout }` a secas, byte a byte,
   * igual que antes de que este campo existiera: ni título, ni subtítulo, ni
   * nada más, y el item nace `llenado: false`.
   */
  it('sin `contenido` en la plantilla, un item sigue naciendo solo con su layout — igual que siempre', async () => {
    for (const idPlantilla of ['estatus-udn', 'sync-comercial', 'seguimiento', 'comite', 'arranque', 'en-blanco']) {
      reiniciarStoreMemoria()
      const { reunionId } = await crearReunionConDocumento({
        salaSlug: 'neracode', plantilla: idPlantilla, tipo: 'mensual', titulo: '', fecha: new Date(),
      })
      const documento = (await documentoDeReunion(reunionId))!
      for (const item of documento.items) {
        expect(item.contenido, `"${idPlantilla}" → "${item.tipo}"`).toEqual({
          seccion: { layout: item.contenido.seccion?.layout },
        })
        expect(item.llenado, `"${idPlantilla}" → "${item.tipo}" no debería nacer llenado`).toBe(false)
      }
    }
  })

  it('con `contenido` en la plantilla ("Plantilla completa"), las 18 secciones nacen YA llenas', async () => {
    const { reunionId } = await crearReunionConDocumento({
      salaSlug: 'neracode', plantilla: 'plantilla-completa', tipo: 'mensual', titulo: '', fecha: new Date(),
    })
    const documento = (await documentoDeReunion(reunionId))!
    expect(documento.items).toHaveLength(18)
    for (const item of documento.items) {
      expect(item.llenado, `"${item.titulo}" debería nacer llena`).toBe(true)
    }
    // El contenido sembrado es el de la plantilla, no una copia: el título
    // real de la primera lámina (la portada) tiene que llegar tal cual, no
    // quedarse en el nombre de respaldo ("Portada").
    expect(documento.items[0].contenido.seccion?.titulo).toBe('Lorem ipsum dolor sit amet')
  })
})

describe('una sala que no existe', () => {
  it('sigue reventando al crear la reunión', async () => {
    await expect(
      crearReunionConDocumento({ salaSlug: 'inventada', tipo: 'mensual', titulo: '', fecha: new Date() }),
    ).rejects.toThrow(/desconocida/i)
  })
})

describe('qué se puede borrar', () => {
  it('en un estatus de UDN, sus ocho bloques no se borran', async () => {
    const { reunionId, documentoId } = await crearReunionConDocumento({
      salaSlug: 'zeus', plantilla: 'estatus-udn', tipo: 'mensual', titulo: '', fecha: new Date(),
    })
    const documento = (await documentoDeReunion(reunionId))!
    const revops = documento.items.find((i) => i.tipo === 'revops')!
    expect(revops.esBase).toBe(true)
    await expect(eliminarSeccion(documentoId, revops.id)).rejects.toThrow()
  })

  it('en una reunión libre, cualquier sección se puede quitar', async () => {
    const { reunionId, documentoId } = await crearReunionConDocumento({
      salaSlug: 'neracode', plantilla: 'comite', tipo: 'mensual', titulo: '', fecha: new Date(),
    })
    const documento = (await documentoDeReunion(reunionId))!
    const opciones = documento.items.find((i) => i.tipo === 'opciones')!
    expect(opciones.esBase).toBe(false)

    await eliminarSeccion(documentoId, opciones.id)
    const despues = (await documentoDeReunion(reunionId))!
    expect(despues.items.map((i) => i.tipo)).not.toContain('opciones')
  })
})
