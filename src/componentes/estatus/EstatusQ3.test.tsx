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
    // Lo que se hizo con el equipo va antes de lo que viene: Q4 arranca en Inner Circle (equipo, 2-oct).
    expect(ids.indexOf('equipo')).toBe(ids.indexOf('relacion') - 1)
    expect(ids.slice(ids.indexOf('relacion'))).toEqual(['relacion', 'inner-circle', 'upax-one', 'rl-ia', 'agenda-q4', 'cierre'])
  })

  it('las empresas van en orden alfabético y la demanda abre en MQL, en el orden del funnel', () => {
    render(<EstatusQ3 />)
    const demanda = seccion('funnel-empresas')
    const filas = demanda.getAllByRole('row').slice(1).map(f => f.getAttribute('data-udn'))
    expect(filas).toEqual(['House of Films', 'Marketing United', 'Mexa Creativa', 'NeraCode', 'Promo Espacio', 'Research Land', 'UiX'])
    expect(demanda.getAllByRole('button', { pressed: true })[0]).toHaveTextContent('MQL')
    const web = seccion('web').getAllByRole('button').filter(b => b.hasAttribute('aria-pressed')).map(b => b.textContent)
    expect(web).toEqual(['Visitas', 'MQL', 'SQL', 'Pipeline', 'Facturado + por facturar'])
  })

  it('Inner Circle enseña la carta sola, y UPAX ONE el mapa del evento con la ponencia y el concierto en cajas separadas', () => {
    render(<EstatusQ3 />)
    const carta = seccion('relacion').getAllByRole('img', { name: /Invitación a UPAX Inner Circle/ })[0]
    expect(carta).toHaveAttribute('src', '/estatus-q3/inner-circle-carta.webp')
    const one = seccion('upax-one')
    expect(one.getByRole('img', { name: /mapa de UPAX ONE/ })).toHaveAttribute('src', '/estatus-q3/upax-one-mapa.webp')
    // Dos cajas, no una: la ponencia magistral por un lado y el concierto por otro.
    const ponencia = one.getByText('Ricardo Salinas').closest('div')
    const concierto = one.getByText('Concierto').closest('div')
    expect(ponencia).not.toBe(concierto)
    expect(ponencia).toHaveTextContent('Ponencia magistral')
    expect(concierto).not.toHaveTextContent(/Salinas|ponencia/i)
    expect(one.getAllByRole('img')).toHaveLength(3)
  })

  it('nadie que no presenta aparece como dueño de una lámina', () => {
    const { container } = render(<EstatusQ3 />)
    expect(container.textContent).not.toMatch(/Ileana/)
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
    expect(seccion('venta').getByText('$10.49 M')).toBeInTheDocument()
    expect(seccion('funnel').getByText('114')).toBeInTheDocument()
    expect(seccion('funnel').getByText('106')).toBeInTheDocument()
    // Cada paso lleva su tasa real y la ideal (equipo, 2-oct).
    expect(seccion('funnel').getByText('31.6%')).toBeInTheDocument()
    expect(seccion('funnel').getByText('93.0%')).toBeInTheDocument()
    expect(seccion('funnel').getByText('15.1%')).toBeInTheDocument()
    expect(seccion('funnel').getByText(/ideal 30%/)).toBeInTheDocument()
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
    // Research Land se lee aparte; las otras seis, en su propia escala.
    expect(seccion('pr').getAllByRole('row')).toHaveLength(7)
    expect(seccion('pr').getByText('212')).toBeInTheDocument()
    expect(screen.getByText(INSIGHTS_WEB[0])).toBeInTheDocument()
    // La tabla de David del 2-oct ya no deja celdas sin estado: la leyenda solo enseña los estados que existen.
    expect(seccion('materiales').queryByText(/Sin estado/)).not.toBeInTheDocument()
    expect(seccion('materiales').getByText('21')).toBeInTheDocument()
    expect(seccion('kaitai').getByText('64')).toBeInTheDocument()
    expect(seccion('kaitai').getByRole('img', { name: 'Banorte' })).toBeInTheDocument()
  })

  it('incluye los 23 temas del roadmap y conserva cifras visibles sin animación', () => {
    render(<EstatusQ3 />)
    expect(seccion('agenda-q4').getByText('Derecho a la información')).toBeInTheDocument()
    expect(seccion('agenda-q4').getByText('Tema por definir')).toBeInTheDocument()
    expect(screen.getAllByText('361').length).toBeGreaterThan(0)
    expect(screen.getAllByText('231').length).toBeGreaterThan(0)
    expect(screen.queryByText(/negocios nuevos/)).not.toBeInTheDocument()
  })

  it('la cumbre muestra el pipeline a escala y no lo suma a lo facturado', () => {
    render(<EstatusQ3 />)
    const cumbre = seccion('pipeline')
    expect(cumbre.getAllByText('$57.69 M').length).toBeGreaterThan(0)
    // El reenfoque del equipo: las tres empresas donde toca generar más demanda van marcadas.
    expect(cumbre.getAllByRole('row').filter(f => f.hasAttribute('data-alerta')).map(f => f.getAttribute('data-udn'))).toEqual(['House of Films', 'Mexa Creativa', 'UiX'])
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
