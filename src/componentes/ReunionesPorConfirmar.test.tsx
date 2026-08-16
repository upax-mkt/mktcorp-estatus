import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReunionesPorConfirmar } from './ReunionesPorConfirmar'
import type { SesionPorConfirmar } from '@/dominio/salas'

/**
 * REUNIONES POR CONFIRMAR (punto 2/3): el botón de marcar presentada, antes
 * enterrado en el editor, más el "no se dio" nuevo — las dos caras de la
 * misma pregunta, en un solo control por fila (`FilaPorConfirmar`) para que
 * confirmar una no deje la otra abierta a medias en la misma fila.
 */

const SESION = (parcial: Partial<SesionPorConfirmar> = {}): SesionPorConfirmar => ({
  id: 's1',
  titulo: 'Estatus de julio',
  fecha: '2026-07-20T16:00:00.000Z',
  salaSlug: 'neracode',
  salaNombre: 'NeraCode',
  salaColor: '#101010',
  noDadaEn: null,
  ...parcial,
})

function acciones() {
  return {
    marcarPresentadaAction: vi.fn().mockResolvedValue(undefined),
    marcarNoDadaAction: vi.fn().mockResolvedValue(undefined),
    desmarcarNoDadaAction: vi.fn().mockResolvedValue(undefined),
  }
}

describe('ReunionesPorConfirmar — lista vacía', () => {
  it('sin sesiones, no pinta nada', () => {
    const { container } = render(<ReunionesPorConfirmar sesiones={[]} {...acciones()} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('ReunionesPorConfirmar — una fila pendiente', () => {
  it('enseña el título, la fecha y la sala', () => {
    render(<ReunionesPorConfirmar sesiones={[SESION()]} {...acciones()} />)
    expect(screen.getByText('Estatus de julio')).toBeInTheDocument()
    expect(screen.getByText('NeraCode')).toBeInTheDocument()
  })

  it('sin salaNombre (dentro de la propia sala), no pinta la etiqueta de sala', () => {
    render(<ReunionesPorConfirmar sesiones={[SESION({ salaNombre: undefined })]} {...acciones()} />)
    expect(screen.queryByText('NeraCode')).toBeNull()
  })

  /**
   * CUMPLIMIENTO (revisión C1, ronda 14.4 tarea 1): "Por confirmar" era 1 de
   * las 4 tarjetas de 14 sin clase de junta pintada. `plantilla` es OPCIONAL
   * en `SesionPorConfirmar` (`dominio/salas.ts`) porque el Home y la sala
   * también arman este tipo sin mandarla — `SESION()` (fixture de arriba) no
   * la fija, así que por defecto es `undefined`, el caso "esta pantalla no
   * manda el dato": sin pintar nada, ver el segundo test de este bloque.
   */
  it('con plantilla definida, pinta también la clase de junta — y una junta sin clase dice "Sin clasificar", nunca la primera del catálogo', () => {
    render(
      <ReunionesPorConfirmar
        sesiones={[SESION({ id: 's1', titulo: 'Uno', plantilla: 'sync-comercial' }), SESION({ id: 's2', titulo: 'Dos', plantilla: null })]}
        {...acciones()}
      />,
    )
    expect(screen.getByText(/sync comercial/i)).toBeInTheDocument()
    expect(screen.getByText(/sin clasificar/i)).toBeInTheDocument()
    expect(screen.queryByText(/estatus de udn/i)).toBeNull()
  })

  it('sin plantilla en absoluto (Home/sala, que no mandan este dato — SESION() por defecto), no pinta ninguna clase', () => {
    render(<ReunionesPorConfirmar sesiones={[SESION()]} {...acciones()} />)
    expect(screen.queryByText(/sin clasificar/i)).toBeNull()
    expect(screen.queryByText(/estatus de udn/i)).toBeNull()
  })

  it('empieza neutral: las dos preguntas a la vista, sin marca de "no se dio"', () => {
    render(<ReunionesPorConfirmar sesiones={[SESION()]} {...acciones()} />)
    expect(screen.getByRole('button', { name: 'Ya se dio' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'No se dio' })).toBeInTheDocument()
    expect(screen.queryByText('no se dio')).toBeNull()
  })

  it('"Ya se dio" pide confirmación antes de llamar a la acción', async () => {
    const usuario = userEvent.setup()
    const { marcarPresentadaAction, ...resto } = acciones()
    render(<ReunionesPorConfirmar sesiones={[SESION()]} marcarPresentadaAction={marcarPresentadaAction} {...resto} />)

    await usuario.click(screen.getByRole('button', { name: 'Ya se dio' }))
    expect(marcarPresentadaAction).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(marcarPresentadaAction).toHaveBeenCalledWith('s1')
  })

  it('"Ya se dio" → Cancelar vuelve al estado neutral sin llamar nada', async () => {
    const usuario = userEvent.setup()
    const { marcarPresentadaAction, ...resto } = acciones()
    render(<ReunionesPorConfirmar sesiones={[SESION()]} marcarPresentadaAction={marcarPresentadaAction} {...resto} />)

    await usuario.click(screen.getByRole('button', { name: 'Ya se dio' }))
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(marcarPresentadaAction).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Ya se dio' })).toBeInTheDocument()
  })

  it('"No se dio" pide confirmación y avisa que se puede deshacer', async () => {
    const usuario = userEvent.setup()
    const { marcarNoDadaAction, ...resto } = acciones()
    render(<ReunionesPorConfirmar sesiones={[SESION()]} marcarNoDadaAction={marcarNoDadaAction} {...resto} />)

    await usuario.click(screen.getByRole('button', { name: 'No se dio' }))
    expect(screen.getByText('Se puede deshacer después.')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(marcarNoDadaAction).toHaveBeenCalledWith('s1')
  })

  it('confirmar "Ya se dio" no deja abierta a la vez la confirmación de "No se dio"', async () => {
    // La razón de tener UN solo `modo` por fila: antes de este diseño, cada
    // botón tenía su propio estado de confirmación y los dos podían quedar
    // abiertos en la misma fila con dos "Confirmar" diciendo cosas opuestas.
    const usuario = userEvent.setup()
    render(<ReunionesPorConfirmar sesiones={[SESION()]} {...acciones()} />)

    await usuario.click(screen.getByRole('button', { name: 'Ya se dio' }))
    expect(screen.queryByRole('button', { name: 'No se dio' })).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Confirmar' })).toHaveLength(1)
  })

  it('si la acción falla, el error llega a la pantalla', async () => {
    const usuario = userEvent.setup()
    const marcarPresentadaAction = vi.fn().mockRejectedValue(new Error('No se pudo marcar.'))
    render(
      <ReunionesPorConfirmar
        sesiones={[SESION()]}
        marcarPresentadaAction={marcarPresentadaAction}
        marcarNoDadaAction={vi.fn()}
        desmarcarNoDadaAction={vi.fn()}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: 'Ya se dio' }))
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo marcar.')
  })
})

describe('ReunionesPorConfirmar — ya marcada "no se dio"', () => {
  it('enseña la marca y "Deshacer", no las dos preguntas de siempre', () => {
    render(<ReunionesPorConfirmar sesiones={[SESION({ noDadaEn: '2026-07-25T10:00:00.000Z' })]} {...acciones()} />)
    expect(screen.getByText('no se dio')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Deshacer' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ya se dio' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'No se dio' })).toBeNull()
  })

  it('"Deshacer" no pide confirmación: llama a la acción de un clic', async () => {
    const usuario = userEvent.setup()
    const { desmarcarNoDadaAction, ...resto } = acciones()
    render(
      <ReunionesPorConfirmar
        sesiones={[SESION({ noDadaEn: '2026-07-25T10:00:00.000Z' })]}
        desmarcarNoDadaAction={desmarcarNoDadaAction}
        {...resto}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: 'Deshacer' }))
    expect(desmarcarNoDadaAction).toHaveBeenCalledWith('s1')
  })
})

describe('ReunionesPorConfirmar — varias filas', () => {
  it('cada fila llama a la acción con SU PROPIO id, no el de otra', async () => {
    const usuario = userEvent.setup()
    const { marcarPresentadaAction, ...resto } = acciones()
    render(
      <ReunionesPorConfirmar
        sesiones={[SESION({ id: 's1', titulo: 'Julio' }), SESION({ id: 's2', titulo: 'Agosto' })]}
        marcarPresentadaAction={marcarPresentadaAction}
        {...resto}
      />,
    )

    const [, botonAgosto] = screen.getAllByRole('button', { name: 'Ya se dio' })
    await usuario.click(botonAgosto)
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(marcarPresentadaAction).toHaveBeenCalledWith('s2')
    expect(marcarPresentadaAction).not.toHaveBeenCalledWith('s1')
  })
})
