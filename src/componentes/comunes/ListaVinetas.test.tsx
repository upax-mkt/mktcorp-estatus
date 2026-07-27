import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ListaVinetas } from './ListaVinetas'

describe('ListaVinetas', () => {
  it('pinta la jerarquía como listas dentro de listas, no aplanada', () => {
    const { container } = render(
      <ListaVinetas
        prefijo="p"
        vinetas={[
          { texto: 'Estudios de mercado', hijos: [{ texto: 'Retail' }, { texto: 'Banca' }] },
          { texto: 'Auditoría de marca' },
        ]}
      />,
    )
    // Tres viñetas en total, pero dos de ellas colgando de la primera.
    expect(container.querySelectorAll('li')).toHaveLength(4)
    const anidada = container.querySelector('li ul')
    expect(anidada).not.toBeNull()
    expect(anidada?.querySelectorAll('li')).toHaveLength(2)
  })

  it('corta a los tres niveles: más hondo no se lee', () => {
    render(
      <ListaVinetas
        prefijo="p"
        vinetas={[{
          texto: 'n1',
          hijos: [{ texto: 'n2', hijos: [{ texto: 'n3', hijos: [{ texto: 'n4' }] }] }],
        }]}
      />,
    )
    expect(screen.getByText('n3')).toBeTruthy()
    expect(screen.queryByText('n4')).toBeNull()
  })

  it('una viñeta con enlace sale como enlace, y se abre fuera sin arrastrar la sesión', () => {
    render(<ListaVinetas prefijo="p" vinetas={[{ texto: 'Ver la cuenta', enlace: 'https://ejemplo.mx/x' }]} />)
    const enlace = screen.getByRole('link', { name: 'Ver la cuenta' })
    expect(enlace.getAttribute('href')).toBe('https://ejemplo.mx/x')
    expect(enlace.getAttribute('rel')).toContain('noopener')
  })

  it('sin enlace no hay ancla: una viñeta normal es solo texto', () => {
    render(<ListaVinetas prefijo="p" vinetas={[{ texto: 'Solo texto' }]} />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Solo texto')).toBeTruthy()
  })
})
