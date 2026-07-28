import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditorSeccion } from './EditorSeccion'
import { obtenerTema } from '@/temas'

/**
 * Lo que se puede DESHACER en el editor.
 *
 * El deshacer se arma comparando el borrador antes y después de cada cambio,
 * no pidiéndole a cada botón de borrar que avise: quitar una fila, un gráfico,
 * una columna o un bloque son botones en componentes distintos, y hacer que
 * todos se acuerden es garantizar que el siguiente no lo haga.
 */

const TEMA = obtenerTema('zeus')

function editor(borrador: Parameters<typeof EditorSeccion>[0]['borrador']) {
  return render(
    <EditorSeccion borrador={borrador} tema={TEMA} guardarAction={vi.fn(async () => {})} />,
  )
}

describe('deshacer lo que se quitó', () => {
  it('quitar una fila de una tabla ofrece deshacerlo', async () => {
    const usuario = userEvent.setup()
    editor({
      layout: 'grafico-y-tabla',
      titulo: 'Tráfico',
      tablas: [
        {
          columnas: ['Canal', 'Mayo'],
          filas: [{ celdas: ['Orgánico', '120'] }, { celdas: ['Paid', '80'] }],
        },
      ],
    })

    expect(screen.queryByRole('button', { name: 'Deshacer' })).toBeNull()

    const quitarFila = screen.getByRole('button', { name: 'Quitar la fila 2' })
    await usuario.click(quitarFila)

    expect(screen.getByRole('button', { name: 'Deshacer' })).toBeInTheDocument()
    expect(screen.getByText(/Se quitó/)).toBeInTheDocument()
  })

  it('deshacer devuelve la fila', async () => {
    const usuario = userEvent.setup()
    const { container } = editor({
      layout: 'grafico-y-tabla',
      titulo: 'Tráfico',
      tablas: [
        {
          columnas: ['Canal', 'Mayo'],
          filas: [{ celdas: ['Orgánico', '120'] }, { celdas: ['Paid', '80'] }],
        },
      ],
    })

    const celdas = () => container.querySelectorAll('input[aria-label^="fila"]').length
    const antes = celdas()
    expect(antes).toBeGreaterThan(0)

    await usuario.click(screen.getByRole('button', { name: 'Quitar la fila 2' }))
    expect(celdas()).toBeLessThan(antes)

    await usuario.click(screen.getByRole('button', { name: 'Deshacer' }))
    expect(celdas()).toBe(antes)
  })

  it('escribir no ofrece deshacer: solo lo destructivo', async () => {
    const usuario = userEvent.setup()
    editor({ layout: 'portada', titulo: '' })

    await usuario.type(screen.getByLabelText('Título de la sección'), 'Estatus de agosto')
    expect(screen.queryByRole('button', { name: 'Deshacer' })).toBeNull()
  })
})
