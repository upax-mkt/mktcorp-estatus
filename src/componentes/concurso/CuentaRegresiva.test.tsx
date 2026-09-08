import { describe, expect, it, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { render, screen, act } from '@testing-library/react'
import { CuentaRegresiva } from './CuentaRegresiva'

/**
 * ⚠️ EL CONTADOR ROMPÍA LA HIDRATACIÓN (7-sep-2026).
 *
 * `/concurso` tiraba un **React error #418** —«text content did not match»— en
 * cada carga con contador. Se vio en la consola de un print de producción, no
 * en un test: la suite renderiza el componente UNA vez, y este defecto solo
 * existe entre DOS renders, el del servidor y el de la hidratación.
 *
 * La causa: el primer valor salía de `Date.now()`, que se evalúa en el servidor
 * al pintar el HTML y otra vez en el navegador al hidratar. Entre esos dos
 * instantes pasa al menos un segundo de red, así que el número de segundos que
 * traía el HTML nunca era el que el cliente calculaba, y React tiraba el árbol
 * y lo volvía a pintar.
 *
 * El arreglo es pasarle el instante DEL SERVIDOR (`desde`) y usarlo en el
 * primer render de los dos lados: mismo dato de entrada, mismo HTML. El reloj
 * real entra después, en el efecto, que no corre durante la hidratación.
 *
 * Esto se comprueba moviendo el reloj entre dos renders de servidor: si el
 * HTML cambia, el componente sigue leyendo `Date.now()` donde no debe.
 */
const OBJETIVO = '2026-09-09T16:00:00.000Z' // mié 9, 10:00 CDMX
const DESDE = '2026-09-07T16:00:00.000Z' // lun 7, 10:00 CDMX — 48 h antes

afterEach(() => {
  vi.useRealTimers()
})

describe('CuentaRegresiva', () => {
  it('pinta el mismo HTML aunque el reloj del proceso avance: el primer render no lee Date.now()', () => {
    vi.useFakeTimers()

    vi.setSystemTime(new Date(DESDE))
    const enElServidor = renderToStaticMarkup(
      <CuentaRegresiva objetivo={OBJETIVO} etiqueta="La galería se revela en" desde={DESDE} />,
    )

    // Tres segundos después —lo que tarda el HTML en llegar y el navegador en
    // hidratar— el cliente pinta su primer render con el mismo `desde`.
    vi.setSystemTime(new Date(Date.now() + 3_000))
    const alHidratar = renderToStaticMarkup(
      <CuentaRegresiva objetivo={OBJETIVO} etiqueta="La galería se revela en" desde={DESDE} />,
    )

    expect(alHidratar).toBe(enElServidor)
  })

  it('cuenta desde el instante del servidor, no desde cero', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(DESDE))

    render(<CuentaRegresiva objetivo={OBJETIVO} etiqueta="La galería se revela en" desde={DESDE} />)

    expect(screen.getByLabelText('La galería se revela en')).toBeInTheDocument()
    expect(screen.getByText('días').previousSibling).toHaveTextContent('02')
    expect(screen.getByText('horas').previousSibling).toHaveTextContent('00')
  })

  it('sigue corriendo con el reloj real una vez montado', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(DESDE))

    render(<CuentaRegresiva objetivo={OBJETIVO} etiqueta="Tu pase cierra en" desde={DESDE} />)
    act(() => { vi.advanceTimersByTime(61_000) })

    // Un minuto menos: 47 h 59 min.
    expect(screen.getByText('horas').previousSibling).toHaveTextContent('23')
    expect(screen.getByText('minutos').previousSibling).toHaveTextContent('58')
  })

  it('avisa que llegó la hora cuando el objetivo ya pasó', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(OBJETIVO))

    render(<CuentaRegresiva objetivo={OBJETIVO} etiqueta="Tu pase cierra en" desde={OBJETIVO} />)

    expect(screen.getByText('Es momento.')).toBeInTheDocument()
  })
})
