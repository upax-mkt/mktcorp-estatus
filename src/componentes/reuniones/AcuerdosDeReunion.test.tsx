import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AcuerdosDeReunion } from './AcuerdosDeReunion'
import type { AcuerdoDeReunion } from '@/dominio/reunion'

/**
 * LOS ACUERDOS DE UNA REUNIÓN, DESPLEGABLES (ronda 10, tarea 10).
 *
 * Franco, sobre el módulo de reuniones de una sala: "la minuta con un link a
 * ver los acuerdos de esa reu, se puede desplegar ahí mismo". Cada reunión
 * agenda a este componente exactamente `Reunion.acuerdos` (`AcuerdoDeReunion[]`,
 * dominio/reunion.ts) — ya cosido por reunión desde `estadoDeSalaDB`
 * (src/db/consultas.ts) — así que aquí no hay que agrupar nada, solo pintar.
 *
 * TRES REGLAS QUE FIJAN ESTOS TESTS:
 * 1. Cerrados incluidos: un `cumplido` no se esconde, es parte de lo que la
 *    UDN quiere ver de esa junta.
 * 2. "0 acuerdos" es ruido: una reunión sin acuerdos no ofrece desplegable.
 * 3. El resumen cuenta sin abrir, con singular cuidado ("1 acuerdo", no
 *    "1 acuerdos").
 *
 * El estatus que se pinta es el que YA TRAE el prop — este componente no
 * recalcula nada (ver la cabecera de AcuerdosDeReunion.tsx): por eso `vencido`
 * aquí abajo no tiene una fecha especial que lo "active", solo se declara así.
 */

const abierto: AcuerdoDeReunion = {
  id: 'a1',
  que: 'Mandar la propuesta de paid media',
  responsable: 'Fernando',
  estatus: 'abierto',
  fechaCompromiso: '2026-08-20',
}

const cumplido: AcuerdoDeReunion = {
  id: 'a2',
  que: 'Cerrar el brief de agosto',
  responsable: 'Norma',
  estatus: 'cumplido',
  fechaCompromiso: '2026-07-31',
}

const vencido: AcuerdoDeReunion = {
  id: 'a3',
  que: 'Entregar el reporte de julio',
  responsable: 'Iris',
  estatus: 'vencido',
  fechaCompromiso: '2026-07-15',
}

describe('AcuerdosDeReunion', () => {
  it('muestra los que nacieron ahí, cerrados incluidos, con su estado de hoy', () => {
    render(<AcuerdosDeReunion acuerdos={[abierto, cumplido]} />)
    expect(screen.getByText(/cumplido/i)).toBeInTheDocument()
    expect(screen.getByText(/abierto/i)).toBeInTheDocument()
  })

  it('una reunión sin acuerdos no muestra el desplegable: "0 acuerdos" es ruido', () => {
    const { container } = render(<AcuerdosDeReunion acuerdos={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('el resumen dice cuántos son sin abrirlo', () => {
    render(<AcuerdosDeReunion acuerdos={[abierto, cumplido, vencido]} />)
    expect(screen.getByText(/3 acuerdos/)).toBeInTheDocument()
  })

  it('cuida el singular: "1 acuerdo", no "1 acuerdos"', () => {
    render(<AcuerdosDeReunion acuerdos={[abierto]} />)
    expect(screen.getByText('1 acuerdo')).toBeInTheDocument()
    expect(screen.queryByText('1 acuerdos')).not.toBeInTheDocument()
  })

  it('un vencido se muestra vencido, no abierto — es el estatus de hoy, no el de cuando nació', () => {
    render(<AcuerdosDeReunion acuerdos={[vencido]} />)
    expect(screen.getByText(/vencido/i)).toBeInTheDocument()
  })

  it('cada acuerdo muestra su responsable', () => {
    render(<AcuerdosDeReunion acuerdos={[abierto]} />)
    expect(screen.getByText('Fernando')).toBeInTheDocument()
  })

  it('sin fecha compromiso dice "por definir" — mismo vocabulario que la lista de acuerdos de la sala', () => {
    const sinFecha: AcuerdoDeReunion = { ...abierto, id: 'a4', fechaCompromiso: null }
    render(<AcuerdosDeReunion acuerdos={[sinFecha]} />)
    expect(screen.getByText('por definir')).toBeInTheDocument()
  })

  it('con fecha compromiso, la pinta breve ("20 ago"), no el ISO crudo', () => {
    render(<AcuerdosDeReunion acuerdos={[abierto]} />)
    expect(screen.getByText('20 ago')).toBeInTheDocument()
  })

  it('usa <details>/<summary> nativos: el teclado y el anuncio a lectores de pantalla los da el navegador', () => {
    render(<AcuerdosDeReunion acuerdos={[abierto]} />)
    const resumen = screen.getByText('1 acuerdo')
    expect(resumen.tagName.toLowerCase()).toBe('summary')
    expect(resumen.closest('details')).not.toBeNull()
  })
})
