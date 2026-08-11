import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SeccionDocumento } from './SeccionDocumento'
import type { DecisionSlide } from '@/decision/esquema'

/**
 * LA AGENDA ESCRITA MANDA SOBRE LA GENERADA.
 *
 * EL BUG QUE CIERRA — Franco: *"en el editor modifiqué la agenda, por ejemplo
 * borré una parte de los acuerdos, y eso no se ve reflejado en el preview"*.
 *
 * El índice se generaba SIEMPRE con las secciones reales del documento e
 * ignoraba por completo el campo "Puntos" de la agenda. El editor ofrecía ese
 * campo, se escribía, se guardaba, el indicador decía "Guardado"… y el
 * documento seguía enseñando otra cosa. Un campo que se puede llenar y no
 * hace nada es peor que no tenerlo.
 *
 * Lo que NO se pierde con el arreglo: la agenda generada sola cuando nadie
 * escribe nada (que es lo que evita teclearla), y la navegación —cada línea
 * escrita sigue siendo un enlace cuando coincide con una sección.
 */

const indiceGeneral = [
  { titulo: 'Pendientes', ancla: 'seccion-2' },
  { titulo: 'Portafolio & ecosistema', ancla: 'seccion-3' },
  { titulo: 'Performance & conversión', ancla: 'seccion-4' },
]

const agenda = (cuerpo?: string[]): DecisionSlide => ({
  layout: 'agenda',
  titulo: 'Agenda',
  razon: '',
  ...(cuerpo ? { cuerpo } : {}),
})

describe('el índice del documento', () => {
  it('sin agenda escrita, se genera con las secciones reales', () => {
    render(<SeccionDocumento decision={agenda()} indice={0} indice_general={indiceGeneral} />)

    expect(screen.getByText('Pendientes')).toBeInTheDocument()
    expect(screen.getByText('Portafolio & ecosistema')).toBeInTheDocument()
    expect(screen.getByText('Performance & conversión')).toBeInTheDocument()
  })

  it('CON agenda escrita, enseña lo escrito y NO lo generado', () => {
    render(
      <SeccionDocumento
        decision={agenda(['Acuerdos del mes pasado', 'Outbound & pipeline'])}
        indice={0}
        indice_general={indiceGeneral}
      />,
    )

    expect(screen.getByText('Acuerdos del mes pasado')).toBeInTheDocument()
    expect(screen.getByText('Outbound & pipeline')).toBeInTheDocument()
    // Y lo generado ya no aparece: era exactamente el síntoma.
    expect(screen.queryByText('Pendientes')).toBeNull()
    expect(screen.queryByText('Portafolio & ecosistema')).toBeNull()
  })

  /** Quitar una línea en el editor tiene que quitarla del documento. */
  it('borrar una línea de la agenda la borra del documento', () => {
    const { rerender } = render(
      <SeccionDocumento
        decision={agenda(['Pendientes', 'Portafolio & ecosistema'])}
        indice={0}
        indice_general={indiceGeneral}
      />,
    )
    expect(screen.getByText('Portafolio & ecosistema')).toBeInTheDocument()

    rerender(
      <SeccionDocumento
        decision={agenda(['Pendientes'])}
        indice={0}
        indice_general={indiceGeneral}
      />,
    )
    expect(screen.queryByText('Portafolio & ecosistema')).toBeNull()
    expect(screen.getByText('Pendientes')).toBeInTheDocument()
  })

  /** Lo escrito sigue navegando cuando coincide con una sección real. */
  it('una línea escrita que coincide con una sección sigue siendo enlace', () => {
    render(
      <SeccionDocumento
        decision={agenda(['Pendientes', 'Un punto que no es una sección'])}
        indice={0}
        indice_general={indiceGeneral}
      />,
    )

    expect(screen.getByRole('link', { name: 'Pendientes' })).toHaveAttribute('href', '#seccion-2')
    // Y la que no coincide se escribe igual, sin enlace muerto.
    expect(screen.getByText('Un punto que no es una sección')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Un punto que no es una sección' })).toBeNull()
  })

  it('líneas en blanco no cuentan como agenda escrita', () => {
    render(
      <SeccionDocumento decision={agenda(['', '   '])} indice={0} indice_general={indiceGeneral} />,
    )
    // Con la agenda vacía se cae a la generada, no a una lista en blanco.
    expect(screen.getByText('Pendientes')).toBeInTheDocument()
  })
})
