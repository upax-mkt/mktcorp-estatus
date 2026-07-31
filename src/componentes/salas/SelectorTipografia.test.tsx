import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SelectorTipografia } from './SelectorTipografia'
import { CATALOGO_DE_FUENTES } from '@/temas/fuentes'

describe('SelectorTipografia', () => {
  it('ofrece el catálogo entero', () => {
    render(<SelectorTipografia nombre="familiaDisplay" valor="outfit" alCambiar={vi.fn()} />)
    expect(screen.getAllByRole('radio').length).toBe(CATALOGO_DE_FUENTES.length)
  })

  it('cada opción se pinta CON su propia fuente: una lista de nombres no dice cómo se ve', () => {
    const { container } = render(<SelectorTipografia nombre="familiaDisplay" valor="outfit" alCambiar={vi.fn()} />)
    const muestras = container.querySelectorAll('[data-muestra]')
    expect(muestras.length).toBe(CATALOGO_DE_FUENTES.length)
    muestras.forEach((m) => {
      expect((m as HTMLElement).style.fontFamily).toMatch(/var\(--f-/)
    })
  })

  it('el valor actual aparece marcado, y solo él', () => {
    render(<SelectorTipografia nombre="familiaDisplay" valor="anton" alCambiar={vi.fn()} />)
    const marcados = screen.getAllByRole('radio').filter((r) => (r as HTMLInputElement).checked)
    expect(marcados).toHaveLength(1)
    expect((marcados[0] as HTMLInputElement).value).toBe('anton')
  })

  it('elegir una opción llama a alCambiar con SU clave, no con la anterior', () => {
    const alCambiar = vi.fn()
    const { container } = render(<SelectorTipografia nombre="familiaDisplay" valor="outfit" alCambiar={alCambiar} />)
    const radioOswald = container.querySelector('input[value="oswald"]') as HTMLInputElement
    fireEvent.click(radioOswald)
    expect(alCambiar).toHaveBeenCalledExactlyOnceWith('oswald')
  })

  it('ofrece el catálogo entero también para familiaTexto: el filtro no depende de "nombre"', () => {
    render(<SelectorTipografia nombre="familiaTexto" valor="outfit" alCambiar={vi.fn()} />)
    expect(screen.getAllByRole('radio').length).toBe(CATALOGO_DE_FUENTES.length)
  })

  it('la muestra es un título corto para familiaDisplay y un párrafo para familiaTexto', () => {
    const { container: display } = render(
      <SelectorTipografia nombre="familiaDisplay" valor="outfit" alCambiar={vi.fn()} />,
    )
    const { container: texto } = render(
      <SelectorTipografia nombre="familiaTexto" valor="outfit" alCambiar={vi.fn()} />,
    )
    const muestraDisplay = display.querySelector('[data-muestra]')!.textContent ?? ''
    const muestraTexto = texto.querySelector('[data-muestra]')!.textContent ?? ''
    expect(muestraDisplay).not.toBe(muestraTexto)
    // El párrafo es la muestra más larga: es lo que distingue "un título" de
    // "un párrafo de texto corrido" (brief de la tarea 7), no solo el tamaño de letra.
    expect(muestraTexto.length).toBeGreaterThan(muestraDisplay.length)
  })

  it('un valor que no está en el catálogo (alias heredado, dato viejo) no marca ningún radio y no revienta', () => {
    render(<SelectorTipografia nombre="familiaDisplay" valor="specialGothic" alCambiar={vi.fn()} />)
    const marcados = screen.getAllByRole('radio').filter((r) => (r as HTMLInputElement).checked)
    expect(marcados).toHaveLength(0)
    expect(screen.getByText(/ya no está en este catálogo/i)).toBeInTheDocument()
  })

  it('con un valor del catálogo no aparece ningún aviso de familia desconocida', () => {
    render(<SelectorTipografia nombre="familiaDisplay" valor="outfit" alCambiar={vi.fn()} />)
    expect(screen.queryByText(/ya no está en este catálogo/i)).not.toBeInTheDocument()
  })
})
