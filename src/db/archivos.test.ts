import { describe, it, expect, beforeEach } from 'vitest'
import {
  listarArchivos, obtenerArchivo, registrarArchivo, editarArchivo, eliminarArchivo,
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
