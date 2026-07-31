import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CalendarioPublico } from './CalendarioPublico'

const AGOSTO = [
  { salaSlug: 'research-land', salaNombre: 'Research Land', salaColor: '#E4002B', fecha: '2026-08-03', hora: '10:00' },
  { salaSlug: 'mexa-creativa', salaNombre: 'Mexa Creativa', salaColor: '#FF0080', fecha: '2026-08-06', hora: '12:00' },
]

describe('CalendarioPublico', () => {
  it('enseña la sala, el día y la hora de cada reunión', () => {
    render(<CalendarioPublico anio={2026} mes={8} reuniones={AGOSTO} />)
    expect(screen.getByText('Research Land')).toBeInTheDocument()
    expect(screen.getByText('10:00')).toBeInTheDocument()
  })

  it('un mes sin reuniones lo dice, en vez de enseñar una rejilla muda', () => {
    render(<CalendarioPublico anio={2026} mes={9} reuniones={[]} />)
    expect(screen.getByText(/no hay reuniones agendadas/i)).toBeInTheDocument()
  })

  it('no filtra ni enlaza a ninguna parte de la app: es una hoja, no una puerta', () => {
    const { container } = render(<CalendarioPublico anio={2026} mes={8} reuniones={AGOSTO} />)
    const enlaces = Array.from(container.querySelectorAll('a'))
    const internos = enlaces.filter((a) => {
      const href = a.getAttribute('href') ?? ''
      return href.startsWith('/') && !href.startsWith('/agenda/')
    })
    expect(internos).toEqual([])
  })
})
