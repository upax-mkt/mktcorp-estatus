import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModuloAcuerdos } from './ModuloAcuerdos'
import type { AcuerdoEnRiesgo } from '@/db/consultas'

/**
 * EL VACÍO es lo que se prueba aquí, y no por gusto.
 *
 * La lista vacía tiene DOS causas que significan lo contrario: o no hay
 * acuerdos de ninguna clase —nadie ha registrado nada— o los hay y ninguno
 * está en riesgo. Durante un tiempo el módulo dijo lo segundo en los dos
 * casos, así que una app recién estrenada, con la base en cero, saludaba con
 * "todo lo abierto tiene dueño y día". Es cantar victoria sobre un conjunto
 * vacío: quien lo lee entiende que el trabajo está al corriente.
 */

const nada = vi.fn(async () => {})

const EN_RIESGO: AcuerdoEnRiesgo = {
  id: 'a1',
  que: 'Cerrar la lista de cuentas objetivo',
  responsable: 'por asignar',
  estatus: 'abierto',
  fechaCompromiso: null,
  salaSlug: 'zeus',
  salaNombre: 'Zeus',
  salaColor: '#614ACA',
}

describe('ModuloAcuerdos, con la lista vacía', () => {
  it('sin NINGÚN acuerdo no dice que todo está al día', () => {
    render(
      <ModuloAcuerdos
        acuerdos={[]}
        abiertos={0}
        cambiarEstatusAction={nada}
        ponerFechaAction={nada}
      />,
    )
    expect(screen.getByText(/todavía no hay acuerdos/i)).toBeInTheDocument()
    expect(screen.queryByText(/tiene dueño y día/i)).not.toBeInTheDocument()
  })

  it('con acuerdos abiertos pero ninguno en riesgo, sí lo dice', () => {
    render(
      <ModuloAcuerdos
        acuerdos={[]}
        abiertos={7}
        cambiarEstatusAction={nada}
        ponerFechaAction={nada}
      />,
    )
    expect(screen.getByText(/tiene dueño y día/i)).toBeInTheDocument()
    expect(screen.queryByText(/todavía no hay acuerdos/i)).not.toBeInTheDocument()
  })
})

describe('ModuloAcuerdos, con acuerdos en riesgo', () => {
  it('los lista y anuncia cuántos son', () => {
    render(
      <ModuloAcuerdos
        acuerdos={[EN_RIESGO]}
        abiertos={3}
        cambiarEstatusAction={nada}
        ponerFechaAction={nada}
      />,
    )
    expect(screen.getByText('Cerrar la lista de cuentas objetivo')).toBeInTheDocument()
    expect(screen.getByText('1 en riesgo')).toBeInTheDocument()
    // Sin dueño se dice así, no con la etiqueta interna "por asignar".
    expect(screen.getByText('sin dueño')).toBeInTheDocument()
    expect(screen.getByText('sin fecha')).toBeInTheDocument()
  })
})
