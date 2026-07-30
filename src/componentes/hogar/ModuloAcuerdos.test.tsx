import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModuloAcuerdos } from './ModuloAcuerdos'
import type { AcuerdoConSala } from '@/db/consultas'

/**
 * LOS TRES VACÍOS (tarea 12) son lo que se prueba aquí, y no por gusto.
 *
 * Antes había un solo módulo con DOS vacíos posibles y ya se equivocó una vez
 * (ver el historial de este archivo: una app recién estrenada saludaba con
 * "todo lo abierto tiene dueño y día"). Ahora son DOS bloques —Destacados y
 * Vencidos— y por tanto TRES situaciones distintas: no hay ni un acuerdo, los
 * hay pero ninguno destacado, y los hay pero ninguno vencido. Decir el texto
 * equivocado sobre cualquiera de los tres es el mismo bug otra vez.
 */

const nada = vi.fn(async () => {})

const BASE: AcuerdoConSala = {
  id: 'a1',
  que: 'Cerrar la lista de cuentas objetivo',
  responsable: 'por asignar',
  estatus: 'abierto',
  fechaCompromiso: null,
  salaSlug: 'zeus',
  salaNombre: 'Zeus',
  salaColor: '#614ACA',
  salaActiva: true,
  destacado: false,
  mondayUrl: null,
  mondayTipo: null,
  bandeja: 'no_aplica',
  mondayDesvinculado: false,
}

describe('ModuloAcuerdos, los tres vacíos', () => {
  it('sin NINGÚN acuerdo, lo dice y no enseña los bloques', () => {
    render(
      <ModuloAcuerdos
        destacados={[]}
        vencidos={[]}
        total={0}
        destacarAction={nada}
        cambiarEstatusAction={nada}
        ponerFechaAction={nada}
      />,
    )
    expect(screen.getByText(/todavía no hay acuerdos/i)).toBeInTheDocument()
    expect(screen.queryByText(/nada destacado/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/todo lo abierto está en fecha/i)).not.toBeInTheDocument()
  })

  it('con acuerdos pero ninguno destacado, lo dice en su bloque y enlaza al espacio de acuerdos', () => {
    render(
      <ModuloAcuerdos
        destacados={[]}
        vencidos={[{ ...BASE, id: 'a2', estatus: 'vencido' }]}
        total={3}
        destacarAction={nada}
        cambiarEstatusAction={nada}
        ponerFechaAction={nada}
      />,
    )
    expect(screen.getByText(/nada destacado todavía/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /espacio de acuerdos/i })).toHaveAttribute('href', '/acuerdos')
  })

  it('con acuerdos destacados pero ninguno vencido, lo dice en su bloque', () => {
    render(
      <ModuloAcuerdos
        destacados={[BASE]}
        vencidos={[]}
        total={5}
        destacarAction={nada}
        cambiarEstatusAction={nada}
        ponerFechaAction={nada}
      />,
    )
    expect(screen.getByText(/todo lo abierto está en fecha/i)).toBeInTheDocument()
    expect(screen.queryByText(/nada destacado/i)).not.toBeInTheDocument()
  })

  it('los dos bloques pueden estar vacíos SIN que el total sea cero: no confunde una cosa con la otra', () => {
    // Ej. real: todos los acuerdos que existen son de una sala en freeze, así
    // que ninguno cuenta como vencido, y ninguno está destacado.
    render(
      <ModuloAcuerdos
        destacados={[]}
        vencidos={[]}
        total={4}
        destacarAction={nada}
        cambiarEstatusAction={nada}
        ponerFechaAction={nada}
      />,
    )
    expect(screen.queryByText(/todavía no hay acuerdos/i)).not.toBeInTheDocument()
    expect(screen.getByText(/nada destacado todavía/i)).toBeInTheDocument()
    expect(screen.getByText(/todo lo abierto está en fecha/i)).toBeInTheDocument()
  })
})

describe('ModuloAcuerdos, con contenido', () => {
  it('lista destacados y vencidos en sus propios bloques, cada uno con su estrella', () => {
    render(
      <ModuloAcuerdos
        destacados={[BASE]}
        vencidos={[{ ...BASE, id: 'a2', que: 'Enviar propuesta de paid media', estatus: 'vencido' }]}
        total={2}
        destacarAction={nada}
        cambiarEstatusAction={nada}
        ponerFechaAction={nada}
      />,
    )
    expect(screen.getByText('Cerrar la lista de cuentas objetivo')).toBeInTheDocument()
    expect(screen.getByText('Enviar propuesta de paid media')).toBeInTheDocument()
    expect(screen.getByText('1 vencido')).toBeInTheDocument()
    // Sin dueño se dice así, no con la etiqueta interna "por asignar".
    expect(screen.getAllByText('sin dueño')).toHaveLength(2)
    // Una estrella por fila.
    expect(screen.getAllByRole('button', { name: /destacar en el home|quitar de destacados/i })).toHaveLength(2)
  })

  it('un destacado ya cumplido no ofrece el botón "Cumplido": no hay nada que marcar de nuevo', () => {
    render(
      <ModuloAcuerdos
        destacados={[{ ...BASE, estatus: 'cumplido' }]}
        vencidos={[]}
        total={1}
        destacarAction={nada}
        cambiarEstatusAction={nada}
        ponerFechaAction={nada}
      />,
    )
    expect(screen.queryByRole('button', { name: /cumplido/i })).not.toBeInTheDocument()
  })
})
