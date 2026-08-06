import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AgendarRapido, type SalaParaAgendar } from './AgendarRapido'

/**
 * Agendar desde el Home (ronda 10, tarea 14): el botón junto al calendario
 * pide lo MÍNIMO —sala, día, hora y tipo— sin salir del Home. Franco, literal:
 * "el calendario (no lo desaparezcas del home), más sí debe haber un botón en
 * el home para agendar rápidamente una sesión". Hoy, para agendar hay que
 * irse a otra pantalla — este componente es el atajo.
 */

const salas: SalaParaAgendar[] = [
  { slug: 'mexa-creativa', nombre: 'Mexa Creativa', activa: true },
  { slug: 'research-land', nombre: 'Research Land', activa: true },
]

// zeus está pausada EN LA BASE REAL (no es un caso hipotético): una sala en
// freeze no admite reuniones nuevas —lo exige `crearReunion` en el
// servidor, ver `agendarRapidoAction` en app/page.tsx— y ofrecerla en el
// selector sería prometer algo que el servidor va a rechazar.
const zeusPausada: SalaParaAgendar = { slug: 'zeus', nombre: 'Zeus', activa: false }

describe('AgendarRapido', () => {
  it('pide lo mínimo para agendar: sala, día, hora y tipo', () => {
    render(<AgendarRapido salas={salas} agendar={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /agendar/i }))
    for (const campo of [/sala/i, /día/i, /hora/i, /tipo/i]) {
      expect(screen.getByLabelText(campo)).toBeInTheDocument()
    }
  })

  it('una sala en pausa no se ofrece', () => {
    render(<AgendarRapido salas={[...salas, zeusPausada]} agendar={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /agendar/i }))
    expect(screen.queryByRole('option', { name: /zeus/i })).toBeNull()
  })

  it('al enviar, llama a agendar con la sala, día, hora y tipo elegidos', async () => {
    const agendar = vi.fn().mockResolvedValue({})
    const usuario = userEvent.setup()
    render(<AgendarRapido salas={salas} agendar={agendar} />)

    await usuario.click(screen.getByRole('button', { name: /agendar/i }))
    await usuario.selectOptions(screen.getByLabelText(/sala/i), 'research-land')
    fireEvent.change(screen.getByLabelText(/día/i), { target: { value: '2026-08-19' } })
    await usuario.selectOptions(screen.getByLabelText(/tipo/i), 'quincenal')
    // Ancla exacta ("Agendar" solo): el disparador dice "+ Agendar reunión" y
    // también matchea /agendar/i, pero a esta altura el diálogo ya está
    // abierto y los dos botones conviven en el documento.
    await usuario.click(screen.getByRole('button', { name: /^agendar$/i }))

    expect(agendar).toHaveBeenCalledExactlyOnceWith({
      salaSlug: 'research-land',
      dia: '2026-08-19',
      hora: '10:00',
      tipo: 'quincenal',
    })
  })

  it('ofrece las tres frecuencias con mayúscula inicial, no el valor crudo del enum', async () => {
    const usuario = userEvent.setup()
    render(<AgendarRapido salas={salas} agendar={vi.fn()} />)
    await usuario.click(screen.getByRole('button', { name: /agendar/i }))
    const opciones = within(screen.getByLabelText(/tipo/i))
      .getAllByRole('option')
      .map((o) => o.textContent)
    expect(opciones).toEqual(['Semanal', 'Quincenal', 'Mensual'])
  })

  // CON TODAS LAS SALAS EN PAUSA (revisión final de la ronda 10): antes
  // `salasActivas` quedaba vacío en silencio — el <select> sin opciones y
  // "Agendar" deshabilitado para siempre, sin decir por qué. Ahora se explica
  // en vez de ofrecer un formulario muerto.
  it('con todas las salas en pausa, no ofrece un formulario muerto: explica por qué', async () => {
    const usuario = userEvent.setup()
    render(<AgendarRapido salas={[zeusPausada]} agendar={vi.fn()} />)
    await usuario.click(screen.getByRole('button', { name: /agendar/i }))

    expect(screen.getByText(/no hay ninguna sala activa/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/sala/i)).toBeNull()
    expect(screen.queryByRole('button', { name: /^agendar$/i })).toBeNull()
  })

  it('si el servidor rechaza la reunión, muestra el error sin cerrar el formulario', async () => {
    // Caso vivo: una sala se pausa entre que se pintó la página y que se
    // envía el formulario — el filtro de la interfaz no alcanza a cubrirlo,
    // pero `crearReunion` sí lo rechaza en el servidor (ver el comentario de
    // `agendarRapidoAction`, app/page.tsx).
    const agendar = vi.fn().mockResolvedValue({
      error: 'Zeus está pausada: reactívala antes de crear una reunión nueva.',
    })
    const usuario = userEvent.setup()
    render(<AgendarRapido salas={salas} agendar={agendar} />)

    await usuario.click(screen.getByRole('button', { name: /agendar/i }))
    fireEvent.change(screen.getByLabelText(/día/i), { target: { value: '2026-08-19' } })
    await usuario.click(screen.getByRole('button', { name: /^agendar$/i }))

    expect(await screen.findByText(/está pausada/i)).toBeInTheDocument()
    // Sigue abierto: el formulario no se cierra sobre un error del servidor.
    expect(screen.getByLabelText(/día/i)).toBeInTheDocument()
  })
})
