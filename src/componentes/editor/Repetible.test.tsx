import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Repetible } from './Repetible'

/**
 * EL BUG QUE ESTOS TESTS CIERRAN — pérdida de contenido al quitar o mover.
 *
 * `Repetible` keyaba por POSICIÓN (`key={'item-' + i}`). Varios de sus hijos
 * —`AreaTexto`, sobre todo— siembran su estado UNA SOLA VEZ a propósito, para
 * no reformatear el texto en cada tecla ni hacer saltar el cursor. Las dos
 * decisiones son razonables por separado y juntas rompen: al quitar el
 * elemento 1, el 2 pasa a ocupar su posición, React reutiliza el subárbol
 * —misma key— y el textarea sigue enseñando el texto del elemento BORRADO.
 *
 * A partir de ahí el formulario y el borrador dicen cosas distintas, que es
 * lo que Franco vio ("el preview no me muestra realmente lo que veo en el
 * editor"), y la siguiente tecla escribe el texto viejo encima del elemento
 * que sobrevivió. En el estatus de NeraCode se llevó por delante una tabla
 * entera de siete filas y el título de la otra.
 */

/** Un hijo que siembra su estado una sola vez: el patrón de `AreaTexto`. */
function HijoSembrado({ inicial, alEscribir }: { inicial: string; alEscribir: (t: string) => void }) {
  const [texto, setTexto] = useState(inicial)
  return (
    <textarea
      aria-label={`campo ${inicial}`}
      value={texto}
      onChange={(e) => { setTexto(e.target.value); alEscribir(e.target.value) }}
    />
  )
}

function Anfitrion({ inicial, alCambiar }: { inicial: string[]; alCambiar?: (v: string[]) => void }) {
  const [items, setItems] = useState(inicial)
  return (
    <Repetible<string>
      nombre="tabla"
      items={items}
      onChange={(v) => { setItems(v); alCambiar?.(v) }}
      nuevo={() => 'nueva'}
    >
      {(item, _i, cambiar) => (
        // SIN key propia, igual que los consumidores reales: quien tiene que
        // dar identidad estable es `Repetible`, no cada hijo.
        <HijoSembrado inicial={item} alEscribir={(t) => cambiar(t)} />
      )}
    </Repetible>
  )
}

describe('Repetible — la identidad de cada elemento sobrevive a quitar y a mover', () => {
  it('al quitar el primero, el que queda enseña SU contenido y no el del borrado', async () => {
    const usuario = userEvent.setup()
    render(<Anfitrion inicial={['Neracode', 'Marketing Corp']} />)

    expect(screen.getByLabelText('campo Neracode')).toBeInTheDocument()
    expect(screen.getByLabelText('campo Marketing Corp')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Quitar tabla 1' }))

    // El que sobrevive es "Marketing Corp". Con key por posición, el textarea
    // seguía enseñando "Neracode" — el contenido del que se acaba de borrar.
    const campos = screen.getAllByRole('textbox')
    expect(campos).toHaveLength(1)
    expect(campos[0]).toHaveValue('Marketing Corp')
  })

  it('al mover uno hacia abajo, cada campo se va con su contenido', async () => {
    const usuario = userEvent.setup()
    render(<Anfitrion inicial={['A', 'B', 'C']} />)

    await usuario.click(screen.getByRole('button', { name: 'Bajar tabla 1' }))

    const campos = screen.getAllByRole('textbox') as HTMLTextAreaElement[]
    expect(campos.map((c) => c.value)).toEqual(['B', 'A', 'C'])
  })

  /**
   * La consecuencia de verdad: no es solo que se vea mal. Escribir después de
   * quitar guardaba el texto arrastrado del elemento borrado.
   */
  it('escribir después de quitar NO arrastra el texto del elemento borrado', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()
    render(<Anfitrion inicial={['Neracode', 'Marketing Corp']} alCambiar={alCambiar} />)

    await usuario.click(screen.getByRole('button', { name: 'Quitar tabla 1' }))
    await usuario.type(screen.getByRole('textbox'), '!')

    expect(alCambiar).toHaveBeenLastCalledWith(['Marketing Corp!'])
  })

  it('añadir sigue funcionando y el nuevo nace vacío, sin heredar nada', async () => {
    const usuario = userEvent.setup()
    render(<Anfitrion inicial={['A']} />)

    await usuario.click(screen.getByRole('button', { name: '+ Añadir tabla' }))

    const campos = screen.getAllByRole('textbox') as HTMLTextAreaElement[]
    expect(campos.map((c) => c.value)).toEqual(['A', 'nueva'])
  })
})
