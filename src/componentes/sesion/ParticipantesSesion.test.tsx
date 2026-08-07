import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ParticipantesSesion } from './ParticipantesSesion'
import type { Participante } from '@/db/participacion'

/**
 * Franco, sobre el módulo de reuniones y presentaciones de la última en
 * sala: "Registra quién tocó la presentación y quién abrió el modo
 * presentación — no quién habló, cuánto participó ni si estuvo atento.
 * ELIMÍNALO, solo deja una leyenda 'Cargada por: PERSONA'." (ronda 11, tarea
 * 3, paso 2).
 *
 * Se retira la distinción "Preparó/Prepararon · Presentó/Presentaron" (y su
 * aviso de qué NO sabe el dato) por una única leyenda de autoría: "Cargada
 * por: X" — sin conjugar verbo alguno, así que no hace falta singular/plural
 * aparte para juntar varios nombres.
 *
 * `nombres` sale de `prepararon` (quien tocó el CONTENIDO, `ediciones > 0` en
 * `resumirParticipacion`): es lo que de verdad "cargó" la presentación.
 * Presentar (abrir el modo presentación) no es cargar, aunque lo haga la
 * misma persona — mismo criterio que ya aplicaba `resumirParticipacion` para
 * separar "preparó" de "presentó".
 */

const P = (nombre: string, ediciones: number, presento = false): Participante => ({
  correo: `${nombre.toLowerCase()}@x.mx`,
  nombre,
  ediciones,
  presento,
  ultimaEdicion: new Date('2026-07-20'),
})

describe('ParticipantesSesion', () => {
  it('con una persona: "Cargada por: PERSONA"', () => {
    render(<ParticipantesSesion participantes={[P('Iris', 5, true)]} />)
    expect(screen.getByText('Cargada por: Iris')).toBeInTheDocument()
  })

  it('con varias personas, se listan separadas por comas — sin conjugar nada', () => {
    render(<ParticipantesSesion participantes={[P('Iris', 5, true), P('César', 3)]} />)
    expect(screen.getByText('Cargada por: Iris, César')).toBeInTheDocument()
  })

  it('a quien más tocó el contenido se le nombra primero', () => {
    render(<ParticipantesSesion participantes={[P('César', 2), P('Iris', 9)]} />)
    expect(screen.getByText('Cargada por: Iris, César')).toBeInTheDocument()
  })

  it('quien solo abrió el modo presentación sin editar nunca no aparece: presentar no es cargar', () => {
    render(<ParticipantesSesion participantes={[{ ...P('Pablo', 0), presento: true }]} />)
    expect(screen.queryByText(/Cargada por/)).toBeNull()
  })

  it('sin nadie que haya tocado el contenido todavía, no pinta nada', () => {
    const { container } = render(<ParticipantesSesion participantes={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('ya no explica lo que el dato NO sabe: se fue la leyenda larga', () => {
    render(<ParticipantesSesion participantes={[P('Iris', 1)]} />)
    expect(screen.queryByText(/no quién habló/i)).toBeNull()
    expect(screen.queryByText(/cuánto participó/i)).toBeNull()
    expect(screen.queryByText(/estuvo atento/i)).toBeNull()
  })
})
