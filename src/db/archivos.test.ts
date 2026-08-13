import { describe, it, expect, beforeEach } from 'vitest'
import {
  listarArchivos, obtenerArchivo, registrarArchivo, editarArchivo, eliminarArchivo,
  reubicarMateriales,
} from './archivos'
import { reiniciarStoreMemoria } from './store-memoria'

/**
 * Los archivos colgados en una sala. Corre contra el store en memoria: las
 * dos ramas comparten el orden, la validación y el contrato de borrado, que
 * es lo que se prueba aquí. El binario no entra: vive en Blob.
 */
beforeEach(() => reiniciarStoreMemoria())

const BASE = {
  salaSlug: 'mexa-creativa',
  categoria: 'presentacion' as const,
  ruta: 'salas/mexa-creativa/presentacion/uuid-deck.pdf',
  nombreOriginal: 'deck.pdf',
}

describe('registrar', () => {
  it('una sala que no existe se rechaza', async () => {
    await expect(
      registrarArchivo({ ...BASE, salaSlug: 'inventada', titulo: 'x', fecha: null }),
    ).rejects.toThrow(/desconocida/i)
  })

  it('sin título se rechaza: la lista sería una columna de nombres de fichero', async () => {
    await expect(registrarArchivo({ ...BASE, titulo: '   ', fecha: null })).rejects.toThrow(/título/i)
  })

  it('el título se guarda sin espacios de sobra', async () => {
    const { id } = await registrarArchivo({ ...BASE, titulo: '  Estatus de marzo  ', fecha: null })
    expect((await obtenerArchivo(id))!.titulo).toBe('Estatus de marzo')
  })

  it('guarda peso y tipo para poder escribirlos al lado', async () => {
    const { id } = await registrarArchivo({
      ...BASE,
      titulo: 'Deck',
      fecha: null,
      tipoContenido: 'application/pdf',
      tamanoBytes: 2_400_000,
    })
    const a = (await obtenerArchivo(id))!
    expect(a.tipoContenido).toBe('application/pdf')
    expect(a.tamanoBytes).toBe(2_400_000)
  })
})

describe('listar', () => {
  it('ordena por la fecha del CONTENIDO, no por la de subida', async () => {
    // Subidas hoy, las tres. Si mandara la fecha de subida, subir el
    // histórico de un año de golpe lo dejaría todo apilado en el mismo día.
    await registrarArchivo({ ...BASE, titulo: 'Enero', fecha: new Date('2026-01-20') })
    await registrarArchivo({ ...BASE, titulo: 'Marzo', fecha: new Date('2026-03-18') })
    await registrarArchivo({ ...BASE, titulo: 'Febrero', fecha: new Date('2026-02-17') })

    const lista = await listarArchivos('mexa-creativa', 'presentacion')
    expect(lista.map((a) => a.titulo)).toEqual(['Marzo', 'Febrero', 'Enero'])
  })

  it('uno sin fecha propia se ordena por cuándo se subió', async () => {
    await registrarArchivo({ ...BASE, titulo: 'Viejo', fecha: new Date('2020-01-01') })
    await registrarArchivo({ ...BASE, titulo: 'Sin fecha', fecha: null })

    const lista = await listarArchivos('mexa-creativa', 'presentacion')
    expect(lista[0].titulo).toBe('Sin fecha')
  })

  it('cada categoría lista lo suyo', async () => {
    await registrarArchivo({ ...BASE, titulo: 'Un deck', fecha: null })
    await registrarArchivo({ ...BASE, categoria: 'interes', titulo: 'Un excel', fecha: null })

    expect((await listarArchivos('mexa-creativa', 'presentacion')).map((a) => a.titulo)).toEqual(['Un deck'])
    expect((await listarArchivos('mexa-creativa', 'interes')).map((a) => a.titulo)).toEqual(['Un excel'])
    expect(await listarArchivos('mexa-creativa')).toHaveLength(2)
  })

  it('no se cuelan los de otra sala', async () => {
    await registrarArchivo({ ...BASE, titulo: 'De Mexa', fecha: null })
    await registrarArchivo({ ...BASE, salaSlug: 'neracode', titulo: 'De NeraCode', fecha: null })

    expect((await listarArchivos('mexa-creativa')).map((a) => a.titulo)).toEqual(['De Mexa'])
  })
})

describe('editar', () => {
  it('cambia el título y la fecha', async () => {
    const { id } = await registrarArchivo({ ...BASE, titulo: 'Sin nombre', fecha: null })
    await editarArchivo(id, { titulo: 'Estatus de abril', fecha: new Date('2026-04-28') })

    const a = (await obtenerArchivo(id))!
    expect(a.titulo).toBe('Estatus de abril')
    expect(a.fecha).toBe('2026-04-28')
  })

  it('vaciar el título se rechaza en vez de dejar una fila anónima', async () => {
    const { id } = await registrarArchivo({ ...BASE, titulo: 'Tiene nombre', fecha: null })
    await expect(editarArchivo(id, { titulo: '  ' })).rejects.toThrow(/título/i)
    expect((await obtenerArchivo(id))!.titulo).toBe('Tiene nombre')
  })

  it('quitar la fecha es un cambio válido, distinto de no tocarla', async () => {
    const { id } = await registrarArchivo({ ...BASE, titulo: 'Deck', fecha: new Date('2026-04-28') })
    await editarArchivo(id, { fecha: null })
    expect((await obtenerArchivo(id))!.fecha).toBeNull()
  })
})

describe('eliminar', () => {
  it('devuelve la ruta para que quien llama borre también el binario', async () => {
    const { id } = await registrarArchivo({ ...BASE, titulo: 'Deck', fecha: null })
    const quitado = await eliminarArchivo(id)

    expect(quitado).toEqual({ ruta: BASE.ruta })
    expect(await obtenerArchivo(id)).toBeNull()
    expect(await listarArchivos('mexa-creativa')).toEqual([])
  })

  it('borrar algo que no existe devuelve null, no revienta', async () => {
    expect(await eliminarArchivo('no-existe')).toBeNull()
  })
})

/**
 * SUBCATEGORÍAS Y ORDEN A MANO (Franco: *"debo poder crear subcategorías
 * dentro del módulo… y reubicar su orden drag and drop"*).
 *
 * Lo que fija esta suite es la regla de ordenación, que es donde está la
 * decisión: **lo que alguien arrastró manda sobre la fecha**. Sin eso, subir
 * un material nuevo se colaría en medio de una lista ya ordenada a mano solo
 * por ser el más reciente.
 */
describe('el orden de los materiales', () => {
  const base = {
    salaSlug: 'neracode', categoria: 'comercial' as const, fecha: null,
    nombreOriginal: 'x.pdf', tipoContenido: 'application/pdf', tamanoBytes: 10,
  }

  it('sin nadie que los haya movido, mandan las fechas: lo más reciente primero', async () => {
    await registrarArchivo({ ...base, titulo: 'viejo', ruta: 'a', fecha: new Date('2026-01-01') })
    await registrarArchivo({ ...base, titulo: 'nuevo', ruta: 'b', fecha: new Date('2026-06-01') })

    const lista = await listarArchivos('neracode', 'comercial')
    expect(lista.map((m) => m.titulo)).toEqual(['nuevo', 'viejo'])
  })

  it('en cuanto se arrastran, manda el orden puesto a mano', async () => {
    const a = await registrarArchivo({ ...base, titulo: 'viejo', ruta: 'a', fecha: new Date('2026-01-01') })
    const b = await registrarArchivo({ ...base, titulo: 'nuevo', ruta: 'b', fecha: new Date('2026-06-01') })

    await reubicarMateriales('neracode', [
      { id: a.id, grupo: 'Credenciales' },
      { id: b.id, grupo: 'Credenciales' },
    ])

    const lista = await listarArchivos('neracode', 'comercial')
    expect(lista.map((m) => m.titulo)).toEqual(['viejo', 'nuevo'])
    expect(lista.map((m) => m.grupo)).toEqual(['Credenciales', 'Credenciales'])
  })

  /**
   * Y un material NUEVO no se cuela en medio de lo ya ordenado: va detrás,
   * aunque su fecha sea la más reciente de todas.
   */
  it('lo que nunca se tocó va detrás de lo que sí, por reciente que sea', async () => {
    const a = await registrarArchivo({ ...base, titulo: 'colocado', ruta: 'a', fecha: new Date('2026-01-01') })
    await reubicarMateriales('neracode', [{ id: a.id, grupo: null }])
    await registrarArchivo({ ...base, titulo: 'recién subido', ruta: 'b', fecha: new Date('2026-12-01') })

    const lista = await listarArchivos('neracode', 'comercial')
    expect(lista.map((m) => m.titulo)).toEqual(['colocado', 'recién subido'])
  })

  it('un material nace sin grupo: nadie tiene que nombrar una categoría para subir algo', async () => {
    const a = await registrarArchivo({ ...base, titulo: 'suelto', ruta: 'a' })
    const lista = await listarArchivos('neracode', 'comercial')
    expect(lista.find((m) => m.id === a.id)?.grupo).toBeNull()
  })
})

/**
 * NOTAS DE PRENSA (ronda 13). Lo que la distingue de cualquier otro material
 * es que puede llevar las DOS cosas: el enlace a la nota (su destino) y una
 * portada subida (ilustración). Para el resto de categorías eso sigue siendo
 * un error — dos destinos y nadie que elija entre ellos.
 */
describe('notas de prensa', () => {
  const NOTA = {
    salaSlug: 'mexa-creativa',
    categoria: 'prensa' as const,
    titulo: 'UPAX lleva la medición al punto de venta',
    enlace: 'https://www.eleconomista.com.mx/nota',
    medio: 'El Economista',
    fecha: new Date('2026-08-12T10:00:00Z'),
  }

  it('una nota puede tener enlace Y portada a la vez: el destino sigue siendo uno', async () => {
    const { id } = await registrarArchivo({
      ...NOTA,
      ruta: 'salas/mexa-creativa/prensa/uuid-portada.jpg',
      nombreOriginal: 'portada.jpg',
    })
    const guardada = await obtenerArchivo(id)
    expect(guardada?.enlace).toBe(NOTA.enlace)
    expect(guardada?.ruta).toContain('uuid-portada.jpg')
    expect(guardada?.medio).toBe('El Economista')
  })

  it('y puede no tener portada: es ilustración, no requisito', async () => {
    const { id } = await registrarArchivo(NOTA)
    const guardada = await obtenerArchivo(id)
    expect(guardada?.ruta).toBeNull()
    expect(guardada?.enlace).toBe(NOTA.enlace)
  })

  it('sin enlace se rechaza aunque traiga portada: una nota que no lleva a la nota no es nada', async () => {
    await expect(
      registrarArchivo({
        ...NOTA,
        enlace: null,
        ruta: 'salas/mexa-creativa/prensa/uuid-portada.jpg',
        nombreOriginal: 'portada.jpg',
      }),
    ).rejects.toThrow(/enlace/i)
  })

  it('la excepción es SOLO de prensa: un material comercial con las dos cosas se sigue rechazando', async () => {
    await expect(
      registrarArchivo({
        salaSlug: 'mexa-creativa',
        categoria: 'comercial',
        titulo: 'Credenciales',
        fecha: null,
        enlace: 'https://ejemplo.mx/credenciales',
        ruta: 'salas/mexa-creativa/comercial/uuid-deck.pdf',
        nombreOriginal: 'deck.pdf',
      }),
    ).rejects.toThrow(/no las dos cosas/i)
  })

  it('el medio se corrige después, como el título', async () => {
    const { id } = await registrarArchivo({ ...NOTA, medio: 'eleconomista.com.mx' })
    await editarArchivo(id, { medio: 'El Economista' })
    expect((await obtenerArchivo(id))?.medio).toBe('El Economista')
  })

  it('las notas se listan de la más reciente a la más vieja', async () => {
    await registrarArchivo({ ...NOTA, titulo: 'Vieja', fecha: new Date('2026-05-01T10:00:00Z') })
    await registrarArchivo({ ...NOTA, titulo: 'Nueva', fecha: new Date('2026-08-01T10:00:00Z') })
    await registrarArchivo({ ...NOTA, titulo: 'Media', fecha: new Date('2026-06-01T10:00:00Z') })

    const notas = await listarArchivos('mexa-creativa', 'prensa')

    expect(notas.map((n) => n.titulo)).toEqual(['Nueva', 'Media', 'Vieja'])
  })
})
