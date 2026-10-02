import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EstatusQ3, LAMINAS_Q3 } from './EstatusQ3'
import { INSIGHTS_WEB } from '@/estatus/q3-2026'

const observadorOriginal = globalThis.IntersectionObserver
beforeEach(() => { Reflect.deleteProperty(globalThis, 'IntersectionObserver') })
afterEach(() => { Object.defineProperty(globalThis, 'IntersectionObserver', { value: observadorOriginal, writable: true, configurable: true }) })

function seccion(id: string) {
  const nodo = document.getElementById(id)
  if (!nodo) throw new Error(`Falta la sección ${id}`)
  return within(nodo)
}

describe('presentación Q3', () => {
  it('sigue la agenda del equipo: los eventos van al principio y la venta antes de los canales', () => {
    const { container } = render(<EstatusQ3 />)
    const ids = [...container.querySelectorAll('[data-layout]')].map(s => s.getAttribute('data-layout'))
    expect(ids).toEqual([...LAMINAS_Q3])
    expect(ids.indexOf('eventos')).toBe(2)
    expect(ids.indexOf('eventos')).toBeLessThan(ids.indexOf('funnel'))
    expect(ids.indexOf('funnel')).toBeLessThan(ids.indexOf('venta'))
    expect(ids.indexOf('venta')).toBeLessThan(ids.indexOf('pipeline'))
    expect(ids.indexOf('pipeline')).toBeLessThan(ids.indexOf('pr'))
    expect(ids.indexOf('pr')).toBeLessThan(ids.indexOf('paid'))
    expect(ids.indexOf('web')).toBeLessThan(ids.indexOf('relacion'))
  })

  it('ninguna lámina se llama «agenda»: el modo presentar oculta ese nombre', () => {
    expect(LAMINAS_Q3 as readonly string[]).not.toContain('agenda')
  })

  it('usa el cumplimiento oficial sin importar otra meta y mantiene los cinco cortes del funnel', () => {
    render(<EstatusQ3 />)
    expect(seccion('venta').getByText('9.4%')).toBeInTheDocument()
    expect(seccion('venta').queryByText(/63\.8|9\.3%/)).not.toBeInTheDocument()
    // Facturado y ganado son dos cortes: se ven los dos, cada uno con su cifra.
    expect(seccion('venta').getByText('$5.94 M')).toBeInTheDocument()
    expect(seccion('venta').getByText('$5.49 M')).toBeInTheDocument()
    expect(seccion('funnel').getByText('95')).toBeInTheDocument()
    expect(seccion('funnel').getByText('103')).toBeInTheDocument()
    expect(seccion('funnel').queryByText(/meta 30|meta 20|108\.4/)).not.toBeInTheDocument()
  })

  it('Paid no pierde UiX al cambiar de una métrica incompleta a su pipeline', async () => {
    const user = userEvent.setup()
    render(<EstatusQ3 />)
    const paid = seccion('paid')
    await user.click(paid.getByRole('button', { name: 'MQL' }))
    expect(paid.getByRole('row', { name: /UiX/ })).toHaveTextContent('Sin dato')
    await user.click(paid.getByRole('button', { name: 'Pipeline' }))
    expect(paid.getByRole('row', { name: /UiX/ })).toHaveTextContent('$1.19 M')
  })

  it('muestra todas las UDN en prensa, conserva el texto IA y distingue estados ausentes', () => {
    render(<EstatusQ3 />)
    expect(seccion('pr').getAllByRole('row')).toHaveLength(8)
    expect(screen.getByText(INSIGHTS_WEB[0])).toBeInTheDocument()
    expect(seccion('materiales').getAllByText(/Sin estado/).length).toBeGreaterThan(0)
    expect(seccion('kaitai').getByText('64')).toBeInTheDocument()
    expect(seccion('kaitai').getByRole('img', { name: 'Banorte' })).toBeInTheDocument()
  })

  it('incluye los 23 temas del roadmap y conserva cifras visibles sin animación', () => {
    render(<EstatusQ3 />)
    expect(seccion('agenda-q4').getByText('Derecho a la información')).toBeInTheDocument()
    expect(seccion('agenda-q4').getByText('Tema por definir')).toBeInTheDocument()
    expect(screen.getAllByText('342').length).toBeGreaterThan(0)
    expect(screen.getAllByText('231').length).toBeGreaterThan(0)
    expect(screen.queryByText(/negocios nuevos/)).not.toBeInTheDocument()
  })

  it('la cumbre muestra el pipeline a escala y no lo suma a lo facturado', () => {
    render(<EstatusQ3 />)
    const cumbre = seccion('pipeline')
    expect(cumbre.getAllByText('$57.16 M').length).toBeGreaterThan(0)
    expect(cumbre.getByText(/no se suma al pipeline/)).toBeInTheDocument()
    expect(cumbre.getByRole('img', { name: /Pipeline abierto por etapa, a escala/ })).toBeInTheDocument()
  })

  it('las siete empresas siguen en el cuerpo y cualquiera se puede seguir', async () => {
    const user = userEvent.setup()
    render(<EstatusQ3 />)
    const demanda = seccion('funnel-empresas')
    expect(demanda.getAllByRole('row')).toHaveLength(8)
    await user.click(demanda.getByRole('button', { name: 'NeraCode' }))
    expect(document.documentElement.dataset.udnFoco).toBe('NeraCode')
    await user.click(demanda.getByRole('button', { name: 'NeraCode' }))
    expect(document.documentElement.dataset.udnFoco).toBeUndefined()
  })
})
