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
      titulo: '',
      plantilla: '',
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

/**
 * TÍTULO OPCIONAL (auditoría UX/UI, ronda 11 — "el título de una reunión no
 * dice de qué es"): antes este formulario ni siquiera ofrecía el campo, así
 * que TODA reunión creada desde este atajo nacía con el título derivado de
 * `tituloPorDefecto` (src/db/documentos.ts) — que describe la CADENCIA, no el
 * CONTENIDO. Caso real: Research Land tiene dos quincenales en la MISMA
 * sala, Comercial y Digital, indistinguibles en cualquier lista con solo la
 * cadencia como título.
 *
 * SIGUE SIENDO OPCIONAL, A PROPÓSITO: este atajo pide lo MÍNIMO (Franco:
 * "agendar rápidamente"), y obligar el título aquí metería fricción justo
 * donde el diseño la evita a propósito (ver el comentario del componente).
 * Mismo nombre de campo ("Título") que `FormularioSesion.tsx`
 * (`DatosFormulario.titulo`) — un solo vocabulario entre los dos formularios,
 * aunque resuelvan obligatorio/opcional distinto.
 */
describe('AgendarRapido — título opcional (auditoría UX/UI, ronda 11)', () => {
  it('ofrece un campo de Título que no bloquea "Agendar" si se deja vacío', async () => {
    const usuario = userEvent.setup()
    const agendar = vi.fn().mockResolvedValue({})
    render(<AgendarRapido salas={salas} agendar={agendar} />)

    await usuario.click(screen.getByRole('button', { name: /agendar/i }))
    expect(screen.getByLabelText(/título/i)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/día/i), { target: { value: '2026-08-19' } })
    await usuario.click(screen.getByRole('button', { name: /^agendar$/i }))

    expect(agendar).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ titulo: '' }))
  })

  it('un título escrito a mano viaja tal cual a agendar() — nada lo recorta ni lo sustituye en el cliente', async () => {
    const usuario = userEvent.setup()
    const agendar = vi.fn().mockResolvedValue({})
    render(<AgendarRapido salas={salas} agendar={agendar} />)

    await usuario.click(screen.getByRole('button', { name: /agendar/i }))
    fireEvent.change(screen.getByLabelText(/día/i), { target: { value: '2026-08-19' } })
    fireEvent.change(screen.getByLabelText(/título/i), { target: { value: 'Estatus Comercial Quincenal' } })
    await usuario.click(screen.getByRole('button', { name: /^agendar$/i }))

    expect(agendar).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ titulo: 'Estatus Comercial Quincenal' }),
    )
  })
})

/**
 * "¿QUÉ JUNTA ES?" (cierre de deuda técnica): agendar desde el Home era el
 * único de los tres sitios que crean una reunión sin preguntar la clase —
 * `NuevaSesionSala` y `FormularioSesion` ya la piden con
 * `SelectorClaseDeJunta`. Este describe fija que AHORA sí la pregunta, con el
 * MISMO componente compartido (no un tercer `<select>` a mano), y que arranca
 * SIN elegir — nunca en la primera clase del catálogo — porque este
 * formulario SOLO CREA, no edita.
 */
describe('AgendarRapido — "¿Qué junta es?" (cierre de deuda técnica)', () => {
  it('ofrece el selector de clase de junta, con su mismo rótulo', async () => {
    const usuario = userEvent.setup()
    render(<AgendarRapido salas={salas} agendar={vi.fn()} />)

    await usuario.click(screen.getByRole('button', { name: /agendar/i }))

    expect(screen.getByLabelText('¿Qué junta es?')).toBeInTheDocument()
  })

  it('arranca en "Sin clasificar", no en la primera clase del catálogo', async () => {
    const usuario = userEvent.setup()
    render(<AgendarRapido salas={salas} agendar={vi.fn()} />)

    await usuario.click(screen.getByRole('button', { name: /agendar/i }))

    const selector = screen.getByLabelText('¿Qué junta es?') as HTMLSelectElement
    expect(selector.value).toBe('')
    expect(within(selector).getByRole('option', { name: 'Sin clasificar' })).toBeInTheDocument()
  })

  it('si nadie elige clase, agendar() recibe plantilla: \'\' — no la primera del catálogo', async () => {
    const usuario = userEvent.setup()
    const agendar = vi.fn().mockResolvedValue({})
    render(<AgendarRapido salas={salas} agendar={agendar} />)

    await usuario.click(screen.getByRole('button', { name: /agendar/i }))
    fireEvent.change(screen.getByLabelText(/día/i), { target: { value: '2026-08-19' } })
    await usuario.click(screen.getByRole('button', { name: /^agendar$/i }))

    expect(agendar).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ plantilla: '' }))
  })

  it('si se elige una clase, agendar() recibe ese id — y "En blanco" no aparece como clase real', async () => {
    const usuario = userEvent.setup()
    const agendar = vi.fn().mockResolvedValue({})
    render(<AgendarRapido salas={salas} agendar={agendar} />)

    await usuario.click(screen.getByRole('button', { name: /agendar/i }))
    fireEvent.change(screen.getByLabelText(/día/i), { target: { value: '2026-08-19' } })
    // "Otra (deck en blanco)" está en su propio grupo — no se lee como una
    // clase de junta más entre las cinco reales. Comprobado ANTES de enviar:
    // un envío exitoso cierra el diálogo y se lleva sus opciones con él.
    expect(screen.getByRole('option', { name: 'Otra (deck en blanco)' })).toBeInTheDocument()
    await usuario.selectOptions(screen.getByLabelText('¿Qué junta es?'), 'sync-comercial')
    await usuario.click(screen.getByRole('button', { name: /^agendar$/i }))

    expect(agendar).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ plantilla: 'sync-comercial' }))
  })

  /**
   * H1 (revisión de esta ronda): `cerrar()` hacía `setAbierto(false)` y
   * `setError(null)` pero NUNCA reseteaba `datos` — y el diálogo no se
   * desmonta (`abierto && (...)` solo controla qué hay DENTRO de un mismo
   * `<dialog>`, no si React lo vuelve a montar). Cerrar con "Comité o
   * dirección" elegido y reabrir dejaba el desplegable en "comite" — la
   * SIGUIENTE junta, la que nadie ha empezado a agendar todavía, nacía ya
   * clasificada sin que nadie lo hubiera decidido PARA ELLA. Es el defecto
   * exacto que esta tarea vino a cerrar (ver el comentario de archivo,
   * "¿QUÉ JUNTA ES?"), reentrando por la segunda pulsación del mismo botón.
   */
  it('H1 — cerrar y reabrir el diálogo NO recuerda la clase de la junta anterior', async () => {
    const usuario = userEvent.setup()
    render(<AgendarRapido salas={salas} agendar={vi.fn()} />)

    await usuario.click(screen.getByRole('button', { name: /agendar/i }))
    await usuario.selectOptions(screen.getByLabelText('¿Qué junta es?'), 'comite')
    expect((screen.getByLabelText('¿Qué junta es?') as HTMLSelectElement).value).toBe('comite')

    // Cancelar cierra el mismo `<dialog>` que "✕" y que el clic fuera —
    // las tres rutas pasan por `cerrar()`.
    await usuario.click(screen.getByRole('button', { name: /cancelar/i }))
    await usuario.click(screen.getByRole('button', { name: /agendar/i }))

    expect((screen.getByLabelText('¿Qué junta es?') as HTMLSelectElement).value).toBe('')
    expect(within(screen.getByLabelText('¿Qué junta es?')).getByRole('option', { name: 'Sin clasificar' })).toBeInTheDocument()
  })
})
