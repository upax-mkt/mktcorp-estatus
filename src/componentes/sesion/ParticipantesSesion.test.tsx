import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ParticipantesSesion } from './ParticipantesSesion'
import type { Participante } from '@/db/participacion'

const P = (nombre: string, ediciones: number, presento = false): Participante => ({
  correo: `${nombre.toLowerCase()}@x.mx`,
  nombre,
  ediciones,
  presento,
  ultimaEdicion: new Date('2026-07-20'),
})

describe('ParticipantesSesion', () => {
  it('pinta quién preparó y quién presentó, separados por un punto', () => {
    render(<ParticipantesSesion participantes={[P('Iris', 5, true), P('César', 3)]} />)
    expect(screen.getByText('Prepararon: Iris, César · Presentó: Iris')).toBeInTheDocument()
  })

  it('con una sola persona usa el singular: "Preparó" y "Presentó"', () => {
    render(<ParticipantesSesion participantes={[P('Iris', 5, true)]} />)
    expect(screen.getByText('Preparó: Iris · Presentó: Iris')).toBeInTheDocument()
  })

  it('con varias personas presentando usa el plural: "Presentaron"', () => {
    render(<ParticipantesSesion participantes={[P('Iris', 1, true), P('César', 1, true)]} />)
    expect(screen.getByText('Prepararon: Iris, César · Presentaron: Iris, César')).toBeInTheDocument()
  })

  it('quien solo presentó sin editar no aparece como que preparó', () => {
    render(<ParticipantesSesion participantes={[{ ...P('Pablo', 0), presento: true }]} />)
    expect(screen.getByText('Presentó: Pablo')).toBeInTheDocument()
    expect(screen.queryByText(/Prepar/)).toBeNull()
  })

  it('quien editó y nadie ha presentado todavía no muestra "Presentó"', () => {
    render(<ParticipantesSesion participantes={[P('Iris', 2)]} />)
    expect(screen.getByText('Preparó: Iris')).toBeInTheDocument()
    expect(screen.queryByText(/Present/)).toBeNull()
  })

  it('sin nadie que haya tocado la sesión, no pinta nada', () => {
    const { container } = render(<ParticipantesSesion participantes={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('siempre dice lo que no sabe, en cuanto pinta algo', () => {
    render(<ParticipantesSesion participantes={[P('Iris', 1)]} />)
    expect(
      screen.getByText(/no quién habló, cuánto participó ni si estuvo atento/i),
    ).toBeInTheDocument()
  })
})
