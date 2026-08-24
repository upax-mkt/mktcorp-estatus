import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModuloMinutas } from './ModuloMinutas'
import { MOLDE_POR_DEFECTO } from '@/minuta/molde'

/**
 * `next/navigation` se dobla porque `LevantarMinuta` —que este módulo monta
 * en su pie— llama a `useRouter()`, y fuera de una app de Next no hay router
 * montado. Mismo criterio y mismo doble que usa `MinutaCliente.test.tsx`.
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

/**
 * LAS REUNIONES QUE ESPERAN MINUTA TIENEN QUE PODER ABRIRSE (24-ago-2026).
 *
 * Franco: *"en el módulo minutas me aparecen las reuniones sin minutas pero no
 * puedo hacer clic en la reunión en cuestión para gestionarla"*.
 *
 * Y era exacto: de esas reuniones solo existía la CIFRA de una píldora ("3
 * reuniones sin minuta"), un dato sin puerta. Para llegar a una había que
 * abrir el diálogo de "Generar una minuta" y buscarla en un desplegable,
 * sabiendo de antemano cuál se busca.
 */
const PENDIENTES = [
  { id: 'r-1', titulo: 'Estatus Mensual Julio', fecha: '2026-08-13T10:00:00Z', salaNombre: 'Marketing United', salaColor: '#000000' },
  { id: 'r-2', titulo: 'Comité de dirección', fecha: '2026-08-10T10:00:00Z' },
]

function montar(pendientes = PENDIENTES, minutas: never[] = []) {
  return render(
    <ModuloMinutas
      minutas={minutas}
      pendientes={pendientes}
      salas={[{ slug: 'marketing-united', nombre: 'Marketing United' }]}
      molde={MOLDE_POR_DEFECTO}
      guardarMoldeAction={vi.fn()}
      personas={[]}
    />,
  )
}

describe('ModuloMinutas — las que esperan su minuta', () => {
  it('cada reunión sin minuta es un enlace a SU minuta, no solo una cifra', () => {
    montar()

    expect(screen.getByRole('link', { name: /Estatus Mensual Julio/ }))
      .toHaveAttribute('href', '/deck/r-1/minuta')
    expect(screen.getByRole('link', { name: /Comité de dirección/ }))
      .toHaveAttribute('href', '/deck/r-2/minuta')
  })

  it('la píldora sigue diciendo cuántas son: la cifra no se pierde al ganar la lista', () => {
    montar()
    expect(screen.getByText(/2 reuniones sin minuta/i)).toBeInTheDocument()
  })

  /**
   * Una reunión que no es de ninguna sala (un comité, una interna de Mkt Corp)
   * no deja su columna en blanco: dice de quién es.
   */
  it('una reunión sin sala se atribuye a Mkt Corp en vez de dejar el hueco', () => {
    montar()
    const fila = screen.getByRole('link', { name: /Comité de dirección/ })
    expect(fila.textContent).toContain('Mkt Corp')
  })

  it('sin pendientes no aparece el bloque, y el módulo no promete trabajo que no hay', () => {
    montar([])
    expect(screen.queryByText(/esperan su minuta/i)).toBeNull()
    expect(screen.queryByText(/reuniones sin minuta/i)).toBeNull()
  })
})
