import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CampoVideo, TOPE_VIDEO_MB, TIPOS_VIDEO } from './CampoVideo'

describe('CampoVideo', () => {
  it('avisa del tope ANTES de que alguien espere una subida larga', () => {
    render(<CampoVideo valor={null} alCambiar={vi.fn()} />)
    expect(screen.getByText(new RegExp(`${TOPE_VIDEO_MB}\\s*MB`))).toBeInTheDocument()
  })

  it('solo acepta lo que Chrome reproduce sin plugins', () => {
    expect(TIPOS_VIDEO).toEqual(['video/mp4', 'video/webm'])
  })

  it('con un vídeo puesto lo muestra y deja quitarlo', () => {
    render(<CampoVideo valor={{ url: 'https://x/v.mp4', titulo: 'Caso' }} alCambiar={vi.fn()} />)
    expect(screen.getByText('Caso')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /quitar/i })).toBeInTheDocument()
  })
})
