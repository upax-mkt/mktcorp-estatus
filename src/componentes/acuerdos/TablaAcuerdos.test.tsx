import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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
  mondayDesvinculado: false,
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

  // Punto menor de la revisión final de la ronda 7: dentro de "Congelados"
  // las filas salían con el badge "Abierto" liso, y el bloque agrupaba TODO
  // lo de una sala en pausa —también lo ya cumplido, para lo que "congelado"
  // no significa nada.
  it('un abierto de una sala en pausa sale con el badge "Congelado", no "Abierto"', () => {
    render(
      <TablaAcuerdos
        acuerdos={[{ ...base, id: 'a2', salaSlug: 'zeus', salaNombre: 'Zeus', salaActiva: false }]}
        destacar={vi.fn()}
      />,
    )
    const congelados = screen.getByRole('region', { name: /congelados/i })
    // Texto EXACTO, no substring: el propio título de la sección ya dice
    // "Congelados" y lo contendría igual si se comparara con un simple
    // `toHaveTextContent`.
    expect(within(congelados).getByText('Congelado', { exact: true })).toBeInTheDocument()
    expect(within(congelados).queryByText('Abierto', { exact: true })).not.toBeInTheDocument()
  })

  it('un cumplido de una sala en pausa sigue diciendo "Cumplido": no tenía plazo que congelar', () => {
    render(
      <TablaAcuerdos
        acuerdos={[
          { ...base, id: 'a2', salaSlug: 'zeus', salaNombre: 'Zeus', salaActiva: false, estatus: 'cumplido' },
        ]}
        destacar={vi.fn()}
      />,
    )
    const congelados = screen.getByRole('region', { name: /congelados/i })
    expect(within(congelados).getByText('Cumplido', { exact: true })).toBeInTheDocument()
    expect(within(congelados).queryByText('Congelado', { exact: true })).not.toBeInTheDocument()
  })

  // Revisión final de la ronda 7, punto 6: el acuerdo se sincronizó alguna
  // vez y el elemento ya no existe en Monday.
  it('un acuerdo desvinculado de Monday muestra el aviso', () => {
    render(<TablaAcuerdos acuerdos={[{ ...base, mondayDesvinculado: true }]} destacar={vi.fn()} />)
    expect(screen.getByText(/se dejó de sincronizar con Monday/i)).toBeInTheDocument()
  })

  it('un acuerdo que nunca se sincronizó no muestra ni el enlace ni el aviso', () => {
    render(<TablaAcuerdos acuerdos={[base]} destacar={vi.fn()} />)
    expect(screen.queryByRole('link', { name: /ver en Monday/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/se dejó de sincronizar/i)).not.toBeInTheDocument()
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
