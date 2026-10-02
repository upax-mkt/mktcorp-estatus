import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GraficoComparativo } from './GraficoComparativo'

describe('comparativo de canales', () => {
  it('conserva una empresa sin MQL y permite consultar su pipeline con el teclado', async () => {
    const user = userEvent.setup()
    render(<GraficoComparativo titulo="Paid por empresa" metricas={[
      { id: 'mql', nombre: 'MQL', formato: 'entero' },
      { id: 'pipeline', nombre: 'Pipeline', formato: 'millones' },
    ]} filas={[
      { nombre: 'UiX', valores: { mql: null, pipeline: 1190000 } },
      { nombre: 'Mexa Creativa', valores: { mql: 58, pipeline: 0 } },
    ]} />)
    expect(within(screen.getByRole('row', { name: /UiX/ })).getByText('Sin dato')).toBeInTheDocument()
    screen.getByRole('button', { name: 'Pipeline' }).focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: 'Pipeline' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('row', { name: /UiX/ })).toHaveTextContent('$1.19 M')
    expect(screen.getByRole('row', { name: /Mexa Creativa/ })).toHaveTextContent('$0.00 M')
  })

  it('mantiene los ceros distinguibles de las ausencias cuando toda la serie está vacía', () => {
    render(<GraficoComparativo titulo="Sin resultados" metricas={[{ id: 'sql', nombre: 'SQL', formato: 'entero' }]} filas={[
      { nombre: 'Reportado', valores: { sql: 0 } },
      { nombre: 'Pendiente', valores: { sql: null } },
    ]} />)
    expect(screen.getByRole('row', { name: 'Reportado 0' })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: 'Pendiente Sin dato' })).toBeInTheDocument()
  })
})
