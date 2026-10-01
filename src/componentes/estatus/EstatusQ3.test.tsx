import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { EstatusQ3, LAMINAS_Q3 } from './EstatusQ3'

/**
 * EL ESTATUS Q3, TAL COMO LO VE CECI.
 *
 * Sin `IntersectionObserver`, como un navegador que no anima: cada cifra en su
 * valor final y nada escondido. Una animación perdida se perdona; una cifra
 * en cero delante de la CEO, no.
 *
 * Y la regla de la segunda versión (Franco, 1-oct-2026: «sin insights, no es
 * autoexplicativa»): cada lámina dice su sección y su conclusión en el título.
 */
const observadorOriginal = globalThis.IntersectionObserver

beforeEach(() => {
  Reflect.deleteProperty(globalThis, 'IntersectionObserver')
})

afterEach(() => {
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    value: observadorOriginal,
    writable: true,
    configurable: true,
  })
})

const lamina = (contenedor: HTMLElement, layout: string) =>
  within(contenedor.querySelector<HTMLElement>(`[data-layout="${layout}"]`)!)

describe('EstatusQ3', () => {
  it('cuenta la historia en orden: resumen, eventos, demanda y venta, marca y digital, herramientas, Q4 y equipo', () => {
    const { container } = render(<EstatusQ3 />)
    const pantallas = [...container.querySelectorAll('[data-layout]')].map((p) => p.getAttribute('data-layout'))
    expect(pantallas).toEqual([...LAMINAS_Q3])
  })

  it('cada lámina de contenido lleva su sección numerada y un título que es la conclusión', () => {
    const { container } = render(<EstatusQ3 />)
    for (const id of LAMINAS_Q3.filter((l) => !['portada', 'gracias', 'resumen'].includes(l))) {
      const seccion = container.querySelector(`[data-layout="${id}"] header p`)
      expect(seccion?.textContent, id).toMatch(/^0[1-6] · /)
      expect(container.querySelector(`[data-layout="${id}"] h2`)?.textContent?.length, id).toBeGreaterThan(15)
    }
  })

  it('redes, paid y el sitio van en el cuerpo, cada uno con su conclusión', () => {
    const { container } = render(<EstatusQ3 />)
    expect(lamina(container, 'redes').getByRole('heading', { level: 2, name: 'LinkedIn es donde nos responden' })).toBeInTheDocument()
    expect(lamina(container, 'paid').getByRole('heading', { level: 2, name: /^Paid trajo 214 MQL a \$1,301 en promedio y \$26\.3 M de pipeline$/ })).toBeInTheDocument()
    expect(lamina(container, 'web').getByRole('heading', { level: 2, name: 'Los sitios atraen 42 mil visitas; convertirlas es el reto' })).toBeInTheDocument()
  })

  it('el funnel: la conversión de cada etapa contra su meta, calculada de la tabla', () => {
    const { container } = render(<EstatusQ3 />)
    const funnel = lamina(container, 'funnel')
    expect(funnel.getByText('27.8% de los MQL · meta 30%')).toBeInTheDocument()
    expect(funnel.getByText('16 de 103 propuestas: 15.5% · meta 20%')).toBeInTheDocument()
    expect(funnel.queryByText(/108|1\.76/)).not.toBeInTheDocument()
  })

  it('la facturación va con su base, como pidió Franco', () => {
    const { container } = render(<EstatusQ3 />)
    const f = lamina(container, 'facturacion')
    expect(f.getByRole('heading', { level: 2, name: 'Facturamos $5.9 M de negocios del funnel' })).toBeInTheDocument()
    expect(f.getAllByText(/9\.3%/).length).toBeGreaterThan(0)
    expect(f.getByText(/meta de venta externa del grupo en Q3 \(\$63\.8 M\)/)).toBeInTheDocument()
  })

  it('lo ganado y lo abierto, cada uno con su lectura', () => {
    const { container } = render(<EstatusQ3 />)
    expect(lamina(container, 'ganados').getByRole('heading', { level: 2, name: 'Ganamos 16 negocios nuevos por $5.5 M' })).toBeInTheDocument()
    expect(lamina(container, 'ganados').getByText(/El más grande del trimestre: Virbac, \$1\.3 M, de Marketing United/)).toBeInTheDocument()
    expect(lamina(container, 'pipeline').getByRole('heading', { level: 2, name: 'Quedan $67.8 M por cerrar y 84% ya está en evaluación' })).toBeInTheDocument()
    expect(lamina(container, 'pr').getByRole('heading', { level: 2, name: '231 notas en medios; 9 de cada 10 fueron de Research Land' })).toBeInTheDocument()
  })

  it('Kaitai: 65 ejecutivos confirmados, con logo y cargo', () => {
    const { container } = render(<EstatusQ3 />)
    const kaitai = lamina(container, 'kaitai')
    expect(kaitai.getByRole('heading', { level: 2, name: 'Kaitai ya tiene 65 ejecutivos confirmados' })).toBeInTheDocument()
    expect(kaitai.getByRole('img', { name: 'Banorte' })).toBeInTheDocument()
    expect(kaitai.getByText('Head of UX Design')).toBeInTheDocument()
  })

  it('ningún nombre de empresa del grupo va mal escrito y Zeus no aparece', () => {
    const { container } = render(<EstatusQ3 />)
    const texto = container.textContent ?? ''
    expect(texto).not.toMatch(/Neracode|ResearchLand|House Of Films|Mexa creativa|Zeus|Cheff|Engament/)
  })

  it('las cifras se ven en su valor final sin JavaScript de animación', () => {
    render(<EstatusQ3 />)
    expect(screen.getAllByText('65').length).toBeGreaterThan(0)
    expect(screen.getAllByText('342').length).toBeGreaterThan(0)
    expect(screen.getAllByText('231').length).toBeGreaterThan(0)
  })
})
