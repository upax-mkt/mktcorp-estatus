import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NuevaSesionSala } from './NuevaSesionSala'

/**
 * EL TERCERO DE TRES FORMULARIOS QUE MANDABAN EL TÍTULO VACÍO (deuda menor,
 * cierre de ronda). `AgendarRapido` (Home) y `deck/nueva` ya pedían el título
 * — este atajo, "Preparar una presentación nueva" dentro de la sala, seguía
 * pidiendo solo plantilla y día, así que `crearSesionAction` (`page.tsx`) lo
 * mandaba `titulo: ''` FIJO a `crearReunionConDocumento`, sin mirar si el
 * usuario había escrito algo — porque no había dónde escribirlo.
 *
 * Caso real que lo disparó: Research Land tiene dos quincenales en la MISMA
 * sala —Comercial y Digital— indistinguibles en cualquier lista si las dos
 * caen al mismo `tituloPorDefecto` (que describe la CADENCIA, no el
 * contenido).
 *
 * MISMO VOCABULARIO que los otros dos formularios ya arreglados: campo
 * "Título", opcional, placeholder "Si lo dejas vacío, se pone uno solo". Este
 * archivo prueba solo el borde de la interfaz —que el campo exista, sea
 * opcional y viaje sin tocar hasta `crearAction`—; que la Server Action lo
 * reenvíe (en vez de seguir mandando `''` fijo) lo prueba
 * `page.test.ts` (`crearSesionAction reenvía el título...`).
 */

describe('NuevaSesionSala — título opcional (deuda menor: el tercero de tres formularios)', () => {
  it('ofrece un campo de Título que no bloquea "Crear y abrir el editor" si se deja vacío', async () => {
    const usuario = userEvent.setup()
    const crearAction = vi.fn().mockResolvedValue({})
    render(<NuevaSesionSala nombreSala="Research Land" crearAction={crearAction} />)

    await usuario.click(screen.getByRole('button', { name: /preparar una presentación nueva/i }))
    expect(screen.getByLabelText(/título/i)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/cuándo/i), { target: { value: '2026-08-19' } })
    await usuario.click(screen.getByRole('button', { name: /crear y abrir el editor/i }))

    expect(crearAction).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ dia: '2026-08-19', titulo: '' }),
    )
  })

  it('un título escrito a mano viaja tal cual a crearAction — nada lo recorta ni lo sustituye en el cliente', async () => {
    const usuario = userEvent.setup()
    const crearAction = vi.fn().mockResolvedValue({})
    render(<NuevaSesionSala nombreSala="Research Land" crearAction={crearAction} />)

    await usuario.click(screen.getByRole('button', { name: /preparar una presentación nueva/i }))
    fireEvent.change(screen.getByLabelText(/cuándo/i), { target: { value: '2026-08-19' } })
    fireEvent.change(screen.getByLabelText(/título/i), { target: { value: 'Research Land — Digital' } })
    await usuario.click(screen.getByRole('button', { name: /crear y abrir el editor/i }))

    expect(crearAction).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ titulo: 'Research Land — Digital' }),
    )
  })
})
