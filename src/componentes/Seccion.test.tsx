import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Seccion } from './Seccion'

/**
 * LA SECCIÓN ES LA MISMA EN LAS DOS PANTALLAS — que es todo el punto.
 *
 * Franco: *"el home sigo percibiéndolo sin lógica y desconectado, al menos del
 * UX/UI de las salas"*. La causa comprobable era que la sala y el Home
 * dibujaban una sección con dos gramáticas distintas, cada una en su hoja de
 * estilo. Este componente las unificó, y lo que se prueba aquí es lo que hace
 * que la unificación signifique algo: que la cabecera lleve SIEMPRE sus tres
 * piezas en su sitio, y que el conteo sea un conteo y no una explicación.
 */
describe('Seccion', () => {
  it('el título es un encabezado de verdad, no un div con letra grande', () => {
    render(<Seccion icono="acuerdos" titulo="Acuerdos"><p>contenido</p></Seccion>)
    expect(screen.getByRole('heading', { name: /acuerdos/i })).toBeInTheDocument()
    expect(screen.getByText('contenido')).toBeInTheDocument()
  })

  it('el conteo se pinta cuando lo hay', () => {
    render(<Seccion icono="reuniones" titulo="Reuniones" conteo="2 vencidos · 4 abiertos"><p>x</p></Seccion>)
    expect(screen.getByText('2 vencidos · 4 abiertos')).toBeInTheDocument()
  })

  /**
   * `conteo={n > 0 && n}` es la forma en que lo llaman casi todos: con cero
   * queda `false`, y `false` NO puede acabar como un `<span>` vacío ocupando
   * el sitio de la derecha. Igual con `undefined`. Un cero tampoco se pinta
   * solo por ser cero — quien quiera enseñarlo pasa la cadena "0".
   */
  it.each([
    ['sin conteo', undefined],
    ['con false, que es lo que devuelve `n > 0 && n`', false],
  ])('no deja un hueco a la derecha %s', (_caso, conteo) => {
    const { container } = render(
      <Seccion icono="archivos" titulo="Materiales" conteo={conteo}><p>x</p></Seccion>,
    )
    const encabezado = container.querySelector('h2')!
    expect(encabezado.querySelectorAll('span')).toHaveLength(0)
  })

  /**
   * PLEGABLE = `<details>` NATIVO. Franco pidió que Acuerdos se pudiera
   * colapsar dentro de la sala; se hace con el elemento del navegador y no con
   * un `useState`, así que funciona sin JavaScript y ya viene con su
   * accesibilidad puesta. Abierta por defecto: se colapsa quien quiera, no al
   * revés — lo que se esconde por defecto deja de existir.
   */
  it('plegable usa <details> y arranca abierta', () => {
    const { container } = render(
      <Seccion icono="acuerdos" titulo="Acuerdos" plegable><p>contenido</p></Seccion>,
    )
    const detalles = container.querySelector('details')
    expect(detalles).not.toBeNull()
    expect(detalles!.open).toBe(true)
    expect(screen.getByText('contenido')).toBeInTheDocument()
  })

  it('el ancla se puede poner, para que algo de la misma página apunte aquí', () => {
    const { container } = render(
      <Seccion icono="clientes" titulo="Los clientes" id="clientes"><p>x</p></Seccion>,
    )
    expect(container.querySelector('section')!.id).toBe('clientes')
  })
})
