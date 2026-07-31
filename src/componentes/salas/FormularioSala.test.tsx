import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormularioSala } from './FormularioSala'

describe('FormularioSala', () => {
  it('propone el slug al escribir el nombre, y se puede corregir', async () => {
    const usuario = userEvent.setup()
    render(<FormularioSala guardar={vi.fn()} slugsUsados={[]} />)
    await usuario.type(screen.getByLabelText(/nombre/i), 'Más Salud')
    expect(screen.getByLabelText(/identificador/i)).toHaveValue('mas-salud')
  })

  it('avisa si el identificador ya está tomado', async () => {
    const usuario = userEvent.setup()
    render(<FormularioSala guardar={vi.fn()} slugsUsados={['mas-salud']} />)
    await usuario.type(screen.getByLabelText(/nombre/i), 'Más Salud')
    expect(screen.getByText(/ya existe una sala/i)).toBeInTheDocument()
  })

  it('al editar, el identificador no se puede cambiar: es la URL de la sala', () => {
    render(<FormularioSala guardar={vi.fn()} slugsUsados={['zeus']} sala={{ slug: 'zeus', nombre: 'Zeus', primario: '#614ACA' }} />)
    expect(screen.getByLabelText(/identificador/i)).toBeDisabled()
  })
})

// TIPOGRAFÍA (tarea 7): el selector entra dos veces —títulos y texto— y lo
// que se elige ahí tiene que llegar de verdad a `guardar()`, no quedarse en
// pantalla. Sin este test, un selector que se ve bien pero no está
// conectado al payload habría pasado los otros tres tests igual.
describe('FormularioSala — tipografía (tarea 7)', () => {
  it('arranca en la familia por defecto al crear, y la elegida viaja a guardar() junto con el resto', async () => {
    const guardar = vi.fn().mockResolvedValue({})
    const usuario = userEvent.setup()
    const { container } = render(<FormularioSala guardar={guardar} slugsUsados={[]} />)

    await usuario.type(screen.getByLabelText(/nombre/i), 'Prueba')
    await usuario.type(screen.getByPlaceholderText('#614ACA'), '#614ACA')

    const radioAnton = container.querySelector('input[name="familiaDisplay"][value="anton"]') as HTMLInputElement
    const radioRaleway = container.querySelector('input[name="familiaTexto"][value="raleway"]') as HTMLInputElement
    expect(radioAnton).toBeTruthy()
    expect(radioRaleway).toBeTruthy()
    await usuario.click(radioAnton)
    await usuario.click(radioRaleway)

    await usuario.click(screen.getByRole('button', { name: /crear sala/i }))

    expect(guardar).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ familiaDisplay: 'anton', familiaTexto: 'raleway' }),
    )
  })

  it('al editar, arranca con la tipografía YA guardada de la sala, no con la por defecto', () => {
    const { container } = render(
      <FormularioSala
        guardar={vi.fn()}
        slugsUsados={['zeus']}
        sala={{ slug: 'zeus', nombre: 'Zeus', primario: '#614ACA', familiaDisplay: 'figtree', familiaTexto: 'figtree' }}
      />,
    )
    const radioFigtreeDisplay = container.querySelector('input[name="familiaDisplay"][value="figtree"]') as HTMLInputElement
    const radioFigtreeTexto = container.querySelector('input[name="familiaTexto"][value="figtree"]') as HTMLInputElement
    expect(radioFigtreeDisplay.checked).toBe(true)
    expect(radioFigtreeTexto.checked).toBe(true)
  })

  it('una sala sin tipografía en el prop (SalaExistente mínimo, como en los tests de arriba) no revienta: cae a la por defecto', () => {
    const { container } = render(
      <FormularioSala guardar={vi.fn()} slugsUsados={['zeus']} sala={{ slug: 'zeus', nombre: 'Zeus', primario: '#614ACA' }} />,
    )
    const radioOutfitDisplay = container.querySelector('input[name="familiaDisplay"][value="outfit"]') as HTMLInputElement
    expect(radioOutfitDisplay.checked).toBe(true)
  })
})

// RECALCULAR PALETA (revisión final de la rama, punto 1): "Guardar cambios"
// ya no deriva nada — este botón aparte es la única vía para que
// secundario/acento/superficies/textos/degradado dejen de estar calculados
// de un color viejo. Sin estos tests, un `guardar` que "silenciosamente"
// volviera a derivar (o un botón que llamara sin confirmar) pasaría el resto
// del archivo sin que nada lo note.
describe('FormularioSala — recalcular paleta (revisión final de la rama, punto 1)', () => {
  it('no aparece al crear: no hay una paleta previa que pueda quedar desincronizada', () => {
    render(<FormularioSala guardar={vi.fn()} slugsUsados={[]} recalcularPaleta={vi.fn()} />)
    expect(screen.queryByText(/recalcular paleta/i)).not.toBeInTheDocument()
  })

  it('al editar, sin la prop recalcularPaleta, tampoco aparece', () => {
    render(
      <FormularioSala guardar={vi.fn()} slugsUsados={['zeus']} sala={{ slug: 'zeus', nombre: 'Zeus', primario: '#614ACA' }} />,
    )
    expect(screen.queryByText(/recalcular paleta/i)).not.toBeInTheDocument()
  })

  it('al editar CON recalcularPaleta, pide confirmar antes de llamarla, y le manda el color actual del formulario', async () => {
    const recalcularPaleta = vi.fn().mockResolvedValue({})
    const usuario = userEvent.setup()
    render(
      <FormularioSala
        guardar={vi.fn()}
        slugsUsados={['zeus']}
        sala={{ slug: 'zeus', nombre: 'Zeus', primario: '#614ACA' }}
        recalcularPaleta={recalcularPaleta}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: /recalcular paleta desde este color/i }))
    // Un clic no basta: hace falta confirmar, mismo patrón que revocar el
    // enlace de agenda o regenerar una clave de sala.
    expect(recalcularPaleta).not.toHaveBeenCalled()
    expect(screen.getByText(/no se puede deshacer/i)).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: /sí, recalcular/i }))
    expect(recalcularPaleta).toHaveBeenCalledExactlyOnceWith('#614ACA')
    expect(await screen.findByText(/paleta recalculada/i)).toBeInTheDocument()
  })

  it('cancelar la confirmación no llama a recalcularPaleta', async () => {
    const recalcularPaleta = vi.fn().mockResolvedValue({})
    const usuario = userEvent.setup()
    render(
      <FormularioSala
        guardar={vi.fn()}
        slugsUsados={['zeus']}
        sala={{ slug: 'zeus', nombre: 'Zeus', primario: '#614ACA' }}
        recalcularPaleta={recalcularPaleta}
      />,
    )
    await usuario.click(screen.getByRole('button', { name: /recalcular paleta desde este color/i }))
    await usuario.click(screen.getByRole('button', { name: /^cancelar$/i }))
    expect(recalcularPaleta).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /recalcular paleta desde este color/i })).toBeInTheDocument()
  })
})
