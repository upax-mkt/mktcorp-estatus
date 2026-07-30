import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TablaAcuerdos } from './TablaAcuerdos'

// `salaColor` en 6 dígitos, no en la forma corta `#000`: el hex de la app
// (src/lib/color.ts) exige RRGGBB completo y revienta con la forma corta —
// mismo bug de arnés que ya corrigió la tarea 1 en un test prescrito (ver
// .superpowers/sdd/2026-07-29-ronda7-acuerdos-monday-y-salas/progress.md).
// El valor en sí no importa para lo que prueban estos tres casos.
const base = {
  id: 'a1', que: 'Enviar propuesta', responsable: 'Iris Múgica', fechaCompromiso: '2026-08-12',
  estatus: 'abierto' as const, salaSlug: 'mexa-creativa', salaNombre: 'Mexa Creativa',
  salaColor: '#000000', salaActiva: true, destacado: false, mondayUrl: null, bandeja: 'pendiente' as const,
}

describe('TablaAcuerdos', () => {
  it('los de una sala en pausa van a su propio bloque, apagados', () => {
    render(<TablaAcuerdos acuerdos={[base, { ...base, id: 'a2', salaActiva: false, salaNombre: 'Zeus' }]} destacar={vi.fn()} />)
    const congelados = screen.getByRole('region', { name: /congelados/i })
    expect(congelados).toHaveTextContent('Zeus')
    expect(congelados).not.toHaveTextContent('Mexa Creativa')
  })

  it('el que vive en Monday enlaza a su elemento', () => {
    render(<TablaAcuerdos acuerdos={[{ ...base, mondayUrl: 'https://monday.com/x' }]} destacar={vi.fn()} />)
    expect(screen.getByRole('link', { name: /ver en Monday/i })).toHaveAttribute('href', 'https://monday.com/x')
  })

  it('sin un solo acuerdo lo dice, en vez de enseñar una tabla vacía', () => {
    render(<TablaAcuerdos acuerdos={[]} destacar={vi.fn()} />)
    expect(screen.getByText(/todavía no hay acuerdos/i)).toBeInTheDocument()
  })
})

/**
 * Los filtros (Paso 3 del brief) no los ejercita ninguno de los tres tests de
 * arriba — los añado aparte para no dejar sin probar la única pieza de este
 * componente que tiene lógica propia de verdad (partir en congelados/vivos ya
 * lo cubre el primer test).
 */
describe('TablaAcuerdos, filtros', () => {
  const otraSala = { ...base, id: 'a2', que: 'Cerrar creativos', responsable: 'Diego Razo', salaSlug: 'zeus', salaNombre: 'Zeus' }

  it('filtra por sala', async () => {
    const usuario = userEvent.setup()
    render(<TablaAcuerdos acuerdos={[base, otraSala]} destacar={vi.fn()} />)

    await usuario.selectOptions(screen.getByLabelText('Sala'), 'zeus')

    expect(screen.getByText('Cerrar creativos')).toBeInTheDocument()
    expect(screen.queryByText('Enviar propuesta')).not.toBeInTheDocument()
  })

  it('sin coincidencias lo dice distinto de "no hay acuerdos"', async () => {
    const usuario = userEvent.setup()
    render(<TablaAcuerdos acuerdos={[base]} destacar={vi.fn()} />)

    await usuario.selectOptions(screen.getByLabelText('Responsable'), 'Iris Múgica')
    await usuario.selectOptions(screen.getByLabelText('Estatus'), 'vencido')

    expect(screen.getByText(/ningún acuerdo coincide/i)).toBeInTheDocument()
    expect(screen.queryByText(/todavía no hay acuerdos/i)).not.toBeInTheDocument()
  })
})
