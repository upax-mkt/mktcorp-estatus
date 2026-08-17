import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SelectorClaseDeJunta } from './SelectorClaseDeJunta'
import { PLANTILLAS, obtenerPlantilla } from '@/secciones/plantillas'

/**
 * EL DESPLEGABLE COMPARTIDO (ronda 14.2, tarea 1 y 3): antes esto vivía
 * copiado en `NuevaSesionSala` y `FormularioSesion`, y divergió — solo el
 * primero traía `<optgroup>` para las clases, la línea de ayuda con el
 * `paraQue` elegido y el `aria-label`. Esta suite prueba las tres cosas de
 * un solo lugar, para los dos consumidores por igual (no hay nada que
 * probar "por consumidor": la diferencia entre ellos es solo estilo, que
 * este componente ni siquiera decide — ver `className`/`etiquetaClassName`/
 * `selectClassName`/`pistaClassName`).
 */
describe('SelectorClaseDeJunta', () => {
  it('pregunta "¿Qué junta es?" con aria-label, sea o no el texto visible', () => {
    render(<SelectorClaseDeJunta value="estatus-udn" onChange={vi.fn()} />)
    expect(screen.getByLabelText(/qué junta es/i)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '¿Qué junta es?' })).toBeInTheDocument()
  })

  it('agrupa las clases reales bajo "Clases de junta", en el orden del catálogo', () => {
    render(<SelectorClaseDeJunta value="estatus-udn" onChange={vi.fn()} />)
    const grupo = screen.getByRole('group', { name: 'Clases de junta' })
    const opciones = within(grupo)
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value)

    // Las clases del catálogo (esClaseDeJunta: true), y solo ellas, en su orden.
    const clasesEsperadas = PLANTILLAS.filter((p) => p.esClaseDeJunta).map((p) => p.id)
    expect(opciones).toEqual(clasesEsperadas)
    expect(opciones).not.toContain('en-blanco')
  })

  it('"en-blanco" y "plantilla-completa" viven en su propio grupo "Otras plantillas", no entre las clases', () => {
    render(<SelectorClaseDeJunta value="estatus-udn" onChange={vi.fn()} />)
    const grupo = screen.getByRole('group', { name: 'Otras plantillas' })
    const opciones = within(grupo)
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value)
    // El orden es el del catálogo (`PLANTILLAS`): "plantilla-completa" antes
    // que "en-blanco", que sigue siendo la última entrada de todo el catálogo.
    expect(opciones).toEqual(['plantilla-completa', 'en-blanco'])
  })

  it('las dos opciones de "Otras plantillas" se distinguen por su propio nombre, no por un texto fijo repetido', () => {
    // Regresión del bug real que motivó renombrar el grupo: antes CADA opción
    // de `OTRAS` se pintaba con el texto fijo "Otra (deck en blanco)" sin
    // mirar `p.nombre` — con una sola entrada nadie lo notaba, pero una
    // segunda habría aparecido con el MISMO texto que la primera.
    render(<SelectorClaseDeJunta value="estatus-udn" onChange={vi.fn()} />)
    const grupo = screen.getByRole('group', { name: 'Otras plantillas' })
    const nombres = within(grupo)
      .getAllByRole('option')
      .map((o) => o.textContent)
    expect(nombres).toEqual(['Plantilla completa', 'En blanco'])
    expect(new Set(nombres).size).toBe(nombres.length)
  })

  it('ofrece el Sync Comercial entre las clases', () => {
    render(<SelectorClaseDeJunta value="estatus-udn" onChange={vi.fn()} />)
    expect(screen.getByRole('option', { name: /sync comercial/i })).toBeInTheDocument()
  })

  it('enseña el paraQue de la clase elegida, leído del catálogo — no una frase fija', () => {
    render(<SelectorClaseDeJunta value="comite" onChange={vi.fn()} />)
    expect(screen.getByText(obtenerPlantilla('comite').paraQue)).toBeInTheDocument()
  })

  it('cambiar de clase cambia la línea de ayuda, y la anterior desaparece', async () => {
    const usuario = userEvent.setup()
    function Wrapper() {
      const [value, setValue] = useState('estatus-udn')
      return <SelectorClaseDeJunta value={value} onChange={setValue} />
    }
    render(<Wrapper />)

    expect(screen.getByText(obtenerPlantilla('estatus-udn').paraQue)).toBeInTheDocument()
    await usuario.selectOptions(screen.getByLabelText(/qué junta es/i), 'sync-comercial')
    expect(screen.getByText(obtenerPlantilla('sync-comercial').paraQue)).toBeInTheDocument()
    expect(screen.queryByText(obtenerPlantilla('estatus-udn').paraQue)).toBeNull()
  })

  it('"en-blanco" también enseña su paraQue: la línea de ayuda no distingue clase de salida de emergencia', () => {
    render(<SelectorClaseDeJunta value="en-blanco" onChange={vi.fn()} />)
    expect(screen.getByText(obtenerPlantilla('en-blanco').paraQue)).toBeInTheDocument()
  })

  /**
   * `value=''` es el estado con el que arranca TODA junta que nace (ver el
   * comentario de `value` arriba, en el componente) — y también el de una
   * reunión YA EXISTENTE sin clase, al editarla (`FormularioSesion`, ver
   * `plantillaInicial`). Dos cosas tienen que pasar a la vez: se enseña "Sin
   * clasificar" como elegida, y NO se enseña ninguna línea de ayuda —
   * mostrar el `paraQue` de "Estatus de UDN" (el fallback de
   * `obtenerPlantilla` para un id vacío) sería la misma trampa que cerró la
   * tarea 2 para "en-blanco", solo que sobre `''`.
   */
  it('con value vacío, arranca en "Sin clasificar" y no enseña ninguna línea de ayuda', () => {
    render(<SelectorClaseDeJunta value="" onChange={vi.fn()} />)
    expect((screen.getByLabelText(/qué junta es/i) as HTMLSelectElement).value).toBe('')
    expect(screen.getByRole('option', { name: 'Sin clasificar' })).toBeInTheDocument()
    // Ninguna de las líneas de ayuda del catálogo debería estar en pantalla.
    for (const p of PLANTILLAS) {
      expect(screen.queryByText(p.paraQue)).toBeNull()
    }
  })

  it('"Sin clasificar" no se ofrece cuando ya hay una clase elegida', () => {
    render(<SelectorClaseDeJunta value="estatus-udn" onChange={vi.fn()} />)
    expect(screen.queryByRole('option', { name: 'Sin clasificar' })).toBeNull()
  })

  it('elegir una opción avisa a onChange con el id elegido', async () => {
    const usuario = userEvent.setup()
    const onChange = vi.fn()
    render(<SelectorClaseDeJunta value="estatus-udn" onChange={onChange} />)
    await usuario.selectOptions(screen.getByLabelText(/qué junta es/i), 'arranque')
    expect(onChange).toHaveBeenCalledExactlyOnceWith('arranque')
  })

  it('las clases className/etiquetaClassName/selectClassName/pistaClassName viajan a sus elementos — el estilo es del consumidor', () => {
    const { container } = render(
      <SelectorClaseDeJunta
        value="comite"
        onChange={vi.fn()}
        className="raiz"
        etiquetaClassName="etiqueta"
        selectClassName="select"
        pistaClassName="pista"
      />,
    )
    expect(container.querySelector('label.raiz')).not.toBeNull()
    expect(container.querySelector('span.etiqueta')).not.toBeNull()
    expect(container.querySelector('select.select')).not.toBeNull()
    expect(container.querySelector('p.pista')).not.toBeNull()
  })
})
