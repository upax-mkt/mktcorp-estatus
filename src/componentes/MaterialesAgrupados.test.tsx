import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MaterialesAgrupados, soloDeSuTipo } from './MaterialesAgrupados'
import type { ArchivoSala } from '@/db/archivos'

/**
 * ORGANIZAR ES UN MODO, Y ESO ES LO QUE SE PRUEBA AQUÍ.
 *
 * La primera versión de este módulo dejó el aparato de edición encendido
 * siempre —asa, número, un desplegable a todo ancho bajo cada pieza y
 * «Renombrar ✕» permanentes— y Franco lo cazó al verlo:
 *
 *   *"la edición y drag & drop está abierto en la vista de la sala; debería
 *   ser una función de edición del módulo y una vez hecho poder verlo en vista
 *   normal como viewer"*.
 *
 * El coste era medible: seis materiales de House of Films medían dos mil
 * píxeles de alto en una pantalla que también ve el director de la UDN. Estos
 * tests fijan la separación en los dos sentidos — que leer no traiga controles
 * y que organizar sí los traiga— porque el fallo se ve idéntico a "así estaba
 * pensado" y no revienta nada.
 */

const nada = vi.fn(async () => {})

function material(id: string, titulo: string, grupo: string | null, orden: number): ArchivoSala {
  return {
    id,
    titulo,
    grupo,
    orden,
    categoria: 'comercial',
    salaSlug: 'house-of-films',
    ruta: `sala/${id}.pdf`,
    enlace: null,
    nombreOriginal: `${id}.pdf`,
    tipoContenido: 'application/pdf',
    tamanoBytes: 1000,
    fecha: null,
    subidoPor: null,
    subidoEn: '2026-08-01T10:00:00.000Z',
    reunionId: null,
  }
}

const MATERIALES = [
  material('m1', 'Caso Cheil', 'Videos', 0),
  material('m2', 'Reel con IA', 'Videos', 1),
  material('m3', 'Credenciales 2026', 'Credenciales', 2),
]

function pintar(equipo: boolean, reubicar = nada) {
  return render(
    <MaterialesAgrupados
      titulo="Materiales Comerciales"
      materiales={MATERIALES}
      equipo={equipo}
      vacio="Nada por aquí."
      editarAction={nada}
      eliminarAction={nada}
      reubicarAction={reubicar}
    />,
  )
}

describe('MaterialesAgrupados — leer y organizar son dos vistas', () => {
  it('al equipo le ofrece organizar, y hasta que no lo pulsa no hay ni un control', async () => {
    pintar(true)

    // Lo que SÍ se ve: los materiales y sus subcategorías.
    expect(screen.getByText('Caso Cheil')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Videos' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Credenciales' })).toBeInTheDocument()

    // Lo que NO: nada de organizar, y tampoco las acciones de cada tarjeta.
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Mover/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /renombrar/i })).not.toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Organizar' })).toBeInTheDocument()
  })

  it('al pulsar Organizar aparecen las asas y los desplegables; al pulsar Listo se van', async () => {
    const usuario = userEvent.setup()
    pintar(true)

    await usuario.click(screen.getByRole('button', { name: 'Organizar' }))

    expect(screen.getByLabelText('Mover la subcategoría Videos')).toBeInTheDocument()
    expect(screen.getByLabelText('Mover la subcategoría Credenciales')).toBeInTheDocument()
    expect(screen.getByLabelText('Mover Caso Cheil')).toBeInTheDocument()
    expect(screen.getAllByRole('combobox')).toHaveLength(3)

    await usuario.click(screen.getByRole('button', { name: 'Listo' }))

    expect(screen.queryByLabelText('Mover la subcategoría Videos')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  /**
   * EL CASO QUE MOTIVÓ TODO: esta pantalla la ve el director de su UDN con el
   * enlace que se comparte. Para él no existe ni la puerta.
   */
  it('a quien no es del equipo no le ofrece siquiera el botón', () => {
    pintar(false)

    expect(screen.getByText('Caso Cheil')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Organizar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  /**
   * MOVER UN MATERIAL DE SUBCATEGORÍA manda la lista COMPLETA, no un "este va
   * allá": es lo que espera `reubicarMateriales`, y es lo que hace que el
   * orden no pueda quedar con huecos ni con dos piezas en la misma posición.
   */
  it('cambiar de subcategoría manda la lista entera, con el resto intacto', async () => {
    const usuario = userEvent.setup()
    const reubicar = vi.fn(async () => {})
    pintar(true, reubicar)

    await usuario.click(screen.getByRole('button', { name: 'Organizar' }))
    await usuario.selectOptions(screen.getByLabelText('Subcategoría de Caso Cheil'), 'Credenciales')

    expect(reubicar).toHaveBeenCalledWith([
      { id: 'm1', grupo: 'Credenciales' },
      { id: 'm2', grupo: 'Videos' },
      { id: 'm3', grupo: 'Credenciales' },
    ])
  })

  it('«Sin agrupar» es una opción de verdad: se puede sacar un material de su subcategoría', async () => {
    const usuario = userEvent.setup()
    const reubicar = vi.fn(async () => {})
    pintar(true, reubicar)

    await usuario.click(screen.getByRole('button', { name: 'Organizar' }))
    await usuario.selectOptions(screen.getByLabelText('Subcategoría de Reel con IA'), '')

    expect(reubicar).toHaveBeenCalledWith([
      { id: 'm1', grupo: 'Videos' },
      { id: 'm2', grupo: null },
      { id: 'm3', grupo: 'Credenciales' },
    ])
  })

  it('renombrar una subcategoría reescribe esa etiqueta en todos sus materiales, y solo en ellos', async () => {
    const usuario = userEvent.setup()
    const reubicar = vi.fn(async () => {})
    pintar(true, reubicar)

    await usuario.click(screen.getByRole('button', { name: 'Organizar' }))
    await usuario.click(screen.getByRole('button', { name: 'Renombrar la subcategoría Videos' }))
    const campo = screen.getByLabelText('Nombre de la subcategoría Videos')
    await usuario.clear(campo)
    await usuario.type(campo, 'Casos de éxito')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(reubicar).toHaveBeenCalledWith([
      { id: 'm1', grupo: 'Casos de éxito' },
      { id: 'm2', grupo: 'Casos de éxito' },
      { id: 'm3', grupo: 'Credenciales' },
    ])
  })

  it('sin materiales dice qué va en el módulo, y no ofrece organizar lo que no hay', () => {
    render(
      <MaterialesAgrupados
        titulo="Materiales Comerciales"
        materiales={[]}
        equipo
        vacio="Credenciales, casos de éxito, un vídeo."
        editarAction={nada}
        eliminarAction={nada}
        reubicarAction={nada}
      />,
    )

    expect(screen.getByText('Credenciales, casos de éxito, un vídeo.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Organizar' })).not.toBeInTheDocument()
  })
})

/**
 * EL FILTRO DE COLISIÓN, que es donde estuvo el fallo de verdad.
 *
 * Franco: *"las categorías no se pueden arrastrar, quedó en HoF videos arriba
 * de credenciales y no está bien"*. Y no se podían — pero no por falta de
 * código: el reordenamiento de grupos estaba escrito y NO SE DISPARABA NUNCA.
 *
 * Los grupos y los materiales viven en `SortableContext` anidados bajo un solo
 * `DndContext`, así que los dos niveles son zonas de destino a la vez. Con
 * `closestCenter` a secas, al arrastrar una subcategoría el `over` que llegaba
 * era el MATERIAL más cercano al cursor —siempre hay uno más cerca que la
 * cabecera del grupo siguiente—, la condición "grupo sobre grupo" fallaba, y
 * la función salía sin hacer nada.
 *
 * El síntoma es indistinguible de no haber implementado el arrastre. De ahí
 * este test: lo que se comprueba es que un grupo solo compite contra grupos.
 */
describe('soloDeSuTipo — un grupo no colisiona con un material', () => {
  // Lo mínimo que `closestCenter` necesita de cada candidato: su id y el
  // rectángulo que ocupa.
  function contenedor(id: string, top: number) {
    return { id, rect: { current: { initial: null, translated: { top, left: 0, right: 100, bottom: top + 40, width: 100, height: 40 } } } }
  }
  const candidatos = [
    contenedor('m:m1', 100),  // el material MÁS CERCANO: el que ganaba antes
    contenedor('m:m2', 140),
    contenedor('g:Videos', 60),
    contenedor('g:Credenciales', 300),
  ]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- la firma de dnd-kit pide un mundo entero (sensores, medidas, contexto) que esta función no mira: solo `active.id` y la lista de candidatos.
  const args = (activo: string): any => ({
    active: { id: activo, rect: { current: { initial: null, translated: { top: 110, left: 0, right: 100, bottom: 150, width: 100, height: 40 } } } },
    collisionRect: { top: 110, left: 0, right: 100, bottom: 150, width: 100, height: 40 },
    droppableRects: new Map(candidatos.map((c) => [c.id, c.rect.current.translated])),
    droppableContainers: candidatos,
    pointerCoordinates: { x: 50, y: 130 },
  })

  it('arrastrando una subcategoría, todos los candidatos son subcategorías', () => {
    const golpes = soloDeSuTipo(args('g:Credenciales'))
    expect(golpes.length).toBeGreaterThan(0)
    for (const g of golpes) expect(String(g.id).startsWith('g:')).toBe(true)
  })

  it('arrastrando un material, todos los candidatos son materiales', () => {
    const golpes = soloDeSuTipo(args('m:m2'))
    expect(golpes.length).toBeGreaterThan(0)
    for (const g of golpes) expect(String(g.id).startsWith('m:')).toBe(true)
  })
})
