import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SliderImagenes } from './SliderImagenes'

/**
 * SE VOTÓ A CIEGAS PORQUE EL SLIDER NO SE ANUNCIABA (9-sep-2026).
 *
 * Las tres imágenes llegaban al HTML —el `map` estaba bien— pero el contenedor
 * era un `overflow-x` con scroll-snap y ningún control: sin flechas, sin
 * puntos, sin contador, y en macOS sin barra de scroll visible. Quien subió el
 * frente, la espalda y las mangas de su sudadera compitió con el frente.
 *
 * ⚠️ LO QUE ESTOS TESTS FIJAN NO ES QUE SE DESLICE, es que SE VEA QUE HAY MÁS.
 * Un test que contara `<img>` en el DOM habría pasado tranquilamente todo el
 * tiempo que esto estuvo roto, porque las tres estaban ahí.
 */
const VISTAS = [
  { id: 'img-1', ruta: 'a.png', nombreOriginal: 'frente.png', tipoContenido: 'image/png', tamanoBytes: 10, orden: 1 },
  { id: 'img-2', ruta: 'b.png', nombreOriginal: 'espalda.png', tipoContenido: 'image/png', tamanoBytes: 10, orden: 2 },
  { id: 'img-3', ruta: 'c.png', nombreOriginal: 'mangas.png', tipoContenido: 'image/png', tamanoBytes: 10, orden: 3 },
]

describe('SliderImagenes con varias vistas', () => {
  it('anuncia cuántas hay, y no deja que se adivinen', () => {
    render(<SliderImagenes titulo="Esencia Urbana" imagenes={VISTAS} />)
    expect(screen.getByText('1/3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Vista siguiente' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Vista anterior' })).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(3)
  })

  it('avanza a la siguiente vista', async () => {
    render(<SliderImagenes titulo="Esencia Urbana" imagenes={VISTAS} />)
    await userEvent.click(screen.getByRole('button', { name: 'Vista siguiente' }))
    expect(screen.getByAltText('Esencia Urbana, vista 2 de 3')).toBeInTheDocument()
    expect(screen.getByText('2/3')).toBeInTheDocument()
  })

  it('salta a una vista concreta desde los puntos', async () => {
    render(<SliderImagenes titulo="Esencia Urbana" imagenes={VISTAS} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Vista 3 de 3' }))
    expect(screen.getByAltText('Esencia Urbana, vista 3 de 3')).toBeInTheDocument()
  })

  /** Toparse con una flecha muerta en tres imágenes molesta más que dar la vuelta. */
  it('da la vuelta al retroceder desde la primera', async () => {
    render(<SliderImagenes titulo="Esencia Urbana" imagenes={VISTAS} />)
    await userEvent.click(screen.getByRole('button', { name: 'Vista anterior' }))
    expect(screen.getByAltText('Esencia Urbana, vista 3 de 3')).toBeInTheDocument()
  })
})

describe('SliderImagenes con una sola vista', () => {
  /** Un control que no controla nada es ruido: con una imagen no aparece ninguno. */
  it('no pinta flechas, puntos ni contador', () => {
    render(<SliderImagenes titulo="Solo frente" imagenes={[VISTAS[0]]} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(screen.queryByText('1/1')).not.toBeInTheDocument()
    expect(screen.getByAltText('Solo frente, vista 1 de 1')).toBeInTheDocument()
  })
})
