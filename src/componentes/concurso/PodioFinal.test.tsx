import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PodioFinal } from './PodioFinal'
import type { ResultadoConcurso } from '@/db/concurso'

function resultado(titulo: string, votos: number, puntaje: number, nombres: string[] = ['Alguien']): ResultadoConcurso {
  return {
    propuesta: {
      id: titulo,
      titulo,
      descripcion: `Concepto de ${titulo}`,
      oculta: false,
      imagenes: [],
      integrantes: nombres.map((nombre) => ({ nombre, correo: `${nombre}@upax.com.mx`, squad: 'RevOps & Analytics' })),
      creadaEn: new Date(),
      actualizadaEn: new Date(),
    },
    votos,
    puntaje,
  }
}

const FINAL = [
  resultado('Disrupción creativa', 6, 35.3, ['Adrián González', 'Sergio Franco']),
  resultado('ON FIRE MKT CORP', 5, 29.4),
  resultado('Esencia Urbana', 3, 17.6),
  resultado('Despeguemos', 2, 11.8),
  resultado('Más que una prenda', 1, 5.9),
]

describe('PodioFinal', () => {
  it('enseña tres lugares y deja fuera al 4º y al 5º', () => {
    render(<PodioFinal resultados={FINAL} votosTotales={17} />)
    expect(screen.getByText('Disrupción creativa')).toBeInTheDocument()
    expect(screen.getByText('ON FIRE MKT CORP')).toBeInTheDocument()
    expect(screen.getByText('Esencia Urbana')).toBeInTheDocument()
    expect(screen.queryByText('Despeguemos')).not.toBeInTheDocument()
    expect(screen.queryByText('Más que una prenda')).not.toBeInTheDocument()
  })

  it('el orden del documento es 1 - 2 - 3, y el visual lo recoloca el CSS', () => {
    render(<PodioFinal resultados={FINAL} votosTotales={17} />)
    const titulos = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(titulos).toEqual([
      'Lugar 1: Disrupción creativa',
      'Lugar 2: ON FIRE MKT CORP',
      'Lugar 3: Esencia Urbana',
    ])
  })

  it('cierra con la despedida que pidió Franco', () => {
    render(<PodioFinal resultados={FINAL} votosTotales={17} />)
    expect(screen.getByText('Nos vemos en el próximo concurso')).toBeInTheDocument()
  })

  it('el concepto es solo del primero: en el 2º y el 3º sobra', () => {
    render(<PodioFinal resultados={FINAL} votosTotales={17} />)
    expect(screen.getByText('Concepto de Disrupción creativa')).toBeInTheDocument()
    expect(screen.queryByText('Concepto de ON FIRE MKT CORP')).not.toBeInTheDocument()
  })

  it('deja fuera a quien no recibió ningún voto', () => {
    render(<PodioFinal resultados={[resultado('Gana', 2, 100), resultado('En cero', 0, 0)]} votosTotales={2} />)
    expect(screen.getByText('Gana')).toBeInTheDocument()
    expect(screen.queryByText('En cero')).not.toBeInTheDocument()
  })

  it('sin nadie con votos no pinta nada, en vez de un podio vacío', () => {
    const { container } = render(<PodioFinal resultados={[resultado('En cero', 0, 0)]} votosTotales={0} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('resume el total con los pases usados y cuántas compitieron', () => {
    render(<PodioFinal resultados={FINAL} votosTotales={17} />)
    expect(screen.getByText(/17 pases usados · 5 propuestas en competencia/)).toBeInTheDocument()
  })
})
