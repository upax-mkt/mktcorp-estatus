import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NuevaSesionSala } from './NuevaSesionSala'

/**
 * EL TERCERO DE TRES FORMULARIOS QUE MANDABAN EL TÍTULO VACÍO (deuda menor,
 * cierre de ronda). `AgendarRapido` (Home) y `deck/nueva` ya pedían el título
 * — este atajo, "Preparar una presentación nueva" dentro de la sala, seguía
 * pidiendo solo plantilla y día, así que `crearSesionAction` (`page.tsx`) lo
 * mandaba `titulo: ''` FIJO a `crearReunion`, sin mirar si el
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
  it('ofrece un campo de Título que no bloquea "Crear reunión" si se deja vacío', async () => {
    const usuario = userEvent.setup()
    const crearAction = vi.fn().mockResolvedValue({})
    render(<NuevaSesionSala nombreSala="Research Land" crearAction={crearAction} />)

    await usuario.click(screen.getByRole('button', { name: /crear reunión/i }))
    expect(screen.getByLabelText(/título/i)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/cuándo/i), { target: { value: '2026-08-19' } })
    await usuario.click(screen.getByRole('button', { name: /^crear reunión$/i }))

    expect(crearAction).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ dia: '2026-08-19', titulo: '' }),
    )
  })

  it('un título escrito a mano viaja tal cual a crearAction — nada lo recorta ni lo sustituye en el cliente', async () => {
    const usuario = userEvent.setup()
    const crearAction = vi.fn().mockResolvedValue({})
    render(<NuevaSesionSala nombreSala="Research Land" crearAction={crearAction} />)

    await usuario.click(screen.getByRole('button', { name: /crear reunión/i }))
    fireEvent.change(screen.getByLabelText(/cuándo/i), { target: { value: '2026-08-19' } })
    fireEvent.change(screen.getByLabelText(/título/i), { target: { value: 'Research Land — Digital' } })
    await usuario.click(screen.getByRole('button', { name: /^crear reunión$/i }))

    expect(crearAction).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ titulo: 'Research Land — Digital' }),
    )
  })
})

/**
 * TASK 2 (ronda 14.2): el formulario pregunta qué junta es, no qué plantilla.
 *
 * Antes de esta ronda el desplegable ya no decía "plantilla" en su rótulo
 * visible ("Qué reunión es"), pero seguía sin decir "junta" y seguía sin
 * enseñar el `paraQue` del catálogo (`src/secciones/plantillas.ts`) — que es
 * justo lo que permite elegir sin adivinar por el nombre. Y "Sync Comercial"
 * (clase nueva, task 1 de esta ronda) tiene que aparecer en la lista: si el
 * catálogo crece y este desplegable no lo refleja, la sala más usada de la
 * app se queda un paso atrás del resto.
 */
describe('NuevaSesionSala — pregunta la clase de junta, no la plantilla (ronda 14.2, task 2)', () => {
  it('pregunta qué junta es, no por una plantilla', async () => {
    const usuario = userEvent.setup()
    render(<NuevaSesionSala nombreSala="House of Films" crearAction={vi.fn().mockResolvedValue({})} />)
    await usuario.click(screen.getByRole('button', { name: /crear reunión/i }))

    expect(screen.getByLabelText(/qué junta es/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/plantilla/i)).toBeNull()
  })

  it('ofrece el Sync Comercial entre las clases', async () => {
    const usuario = userEvent.setup()
    render(<NuevaSesionSala nombreSala="House of Films" crearAction={vi.fn().mockResolvedValue({})} />)
    await usuario.click(screen.getByRole('button', { name: /crear reunión/i }))

    expect(screen.getByRole('option', { name: /sync comercial/i })).toBeInTheDocument()
  })
})
