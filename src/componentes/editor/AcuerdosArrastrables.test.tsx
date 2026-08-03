import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AcuerdosArrastrables } from './AcuerdosArrastrables'

const A = (id: string, que: string, fecha: string | null, estatus = 'abierto') =>
  ({ id, que, responsable: 'Iris', fechaCompromiso: fecha, estatus })

describe('AcuerdosArrastrables', () => {
  it('los vencidos van primero: son los que hay que retomar', () => {
    render(
      <AcuerdosArrastrables
        acuerdos={[A('1', 'al día', '2026-12-01'), A('2', 'vencido', '2026-01-01', 'vencido')]}
        alArrastrar={vi.fn()}
        hayDestino
      />,
    )
    const filas = screen.getAllByRole('listitem')
    expect(filas[0]).toHaveTextContent('vencido')
  })

  it('sin acuerdos abiertos lo dice, en vez de una columna muda', () => {
    render(<AcuerdosArrastrables acuerdos={[]} alArrastrar={vi.fn()} hayDestino />)
    expect(screen.getByText(/no hay acuerdos abiertos/i)).toBeInTheDocument()
  })

  it('cada acuerdo se puede arrastrar y también añadir con un botón', () => {
    render(<AcuerdosArrastrables acuerdos={[A('1', 'algo', '2026-12-01')]} alArrastrar={vi.fn()} hayDestino />)
    expect(screen.getByRole('listitem')).toHaveAttribute('draggable', 'true')
    expect(screen.getByRole('button', { name: /añadir/i })).toBeInTheDocument()
  })

  /**
   * REVISIÓN FINAL DE LA RAMA, PUNTO 5: las plantillas «en blanco» y
   * «comité» no tienen una sección de Acuerdos y Pendientes donde soltar un
   * acuerdo retomado. Antes de este fix el panel se pintaba igual —arrastre
   * y botón «Añadir» incluidos— sobre una acción que SIEMPRE iba a lanzar.
   */
  describe('sin sección de Acuerdos y Pendientes donde soltar (hayDestino=false)', () => {
    it('no ofrece ni arrastre ni el botón «Añadir»: un vacío que lo explica', () => {
      render(
        <AcuerdosArrastrables
          acuerdos={[A('1', 'algo pendiente en la sala', '2026-12-01')]}
          alArrastrar={vi.fn()}
          hayDestino={false}
        />,
      )
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /añadir/i })).not.toBeInTheDocument()
      expect(screen.getByText(/no tiene una sección de Acuerdos y Pendientes/i)).toBeInTheDocument()
    })

    it('lo dice incluso si además no hay ningún acuerdo abierto: las dos razones no se confunden', () => {
      render(<AcuerdosArrastrables acuerdos={[]} alArrastrar={vi.fn()} hayDestino={false} />)
      expect(screen.getByText(/no tiene una sección de Acuerdos y Pendientes/i)).toBeInTheDocument()
      expect(screen.queryByText(/no hay acuerdos abiertos/i)).not.toBeInTheDocument()
    })
  })

  /**
   * REVISIÓN FINAL DE LA RAMA, PUNTO 5 (segunda mitad): si `alArrastrar`
   * falla por cualquier otro motivo, antes el único rastro era
   * `console.error` — el botón se quedaba tal cual y quien lo pulsó no veía
   * nada. Ahora el mensaje real llega a la pantalla.
   */
  it('si alArrastrar falla, el error llega a la pantalla — no solo a la consola', async () => {
    const alArrastrar = vi.fn().mockRejectedValue(new Error('Esta sesión no tiene una sección de Acuerdos y Pendientes a la que retomar el acuerdo.'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<AcuerdosArrastrables acuerdos={[A('1', 'algo', '2026-12-01')]} alArrastrar={alArrastrar} hayDestino />)

    await userEvent.click(screen.getByRole('button', { name: /añadir/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/no tiene una sección de Acuerdos y Pendientes/i)
    consoleError.mockRestore()
  })
})
