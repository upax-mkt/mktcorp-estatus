import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Deck } from './Deck'
import { NC_JUNIO_2026 } from '@/fixtures/nc-junio-2026'

describe('Deck', () => {
  it('renderiza todos los slides del fixture', () => {
    render(<Deck decisiones={NC_JUNIO_2026} slugSala="neracode" />)
    expect(screen.getAllByRole('region')).toHaveLength(NC_JUNIO_2026.length)
  })

  it('viste el deck con el tema de la sala', () => {
    render(<Deck decisiones={NC_JUNIO_2026} slugSala="neracode" />)
    const contenedores = screen.getAllByTestId('tema')
    expect(contenedores[0].dataset.sala).toBe('neracode')
    expect(contenedores[0].style.getPropertyValue('--primario')).toBe('#3E31CC')
  })

  it('cambia de identidad al cambiar de sala, sin tocar los slides', () => {
    render(<Deck decisiones={NC_JUNIO_2026} slugSala="zeus" />)
    expect(screen.getAllByTestId('tema')[0].style.getPropertyValue('--primario')).toBe('#FF004F')
    expect(screen.getByText('Estatus mensual')).toBeInTheDocument()
  })

  it('valida cada decisión contra el contrato antes de pintarla', () => {
    const invalida = [{ layout: 'portada', titulo: 'x' }] as never
    expect(() => render(<Deck decisiones={invalida} slugSala="neracode" />)).toThrow()
  })
})
