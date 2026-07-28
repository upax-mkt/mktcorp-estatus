import { describe, it, expect } from 'vitest'
import { layoutsImplementados } from './catalogo'
import { construirPrompt } from './prompt'
import { obtenerTema } from '@/temas'

describe('construirPrompt', () => {
  const inv = { titulo: 'Performance', piezas: [{ tipo: 'cifra' as const, valor: '9.2', rotulo: 'Posición' }] }

  it('ofrece exactamente los layouts que el documento sabe dibujar', () => {
    const { system } = construirPrompt(inv, obtenerTema('neracode'))
    for (const layout of layoutsImplementados()) {
      expect(system, `el prompt no ofrece "${layout}"`).toContain(`"${layout}"`)
    }
  })

  it('prohíbe explícitamente el estilo', () => {
    const { system } = construirPrompt(inv, obtenerTema('neracode'))
    expect(system.toLowerCase()).toMatch(/no.*color|nunca.*css|sin estilo/)
  })

  it('prohíbe explícitamente sintaxis Markdown', () => {
    const { system } = construirPrompt(inv, obtenerTema('neracode'))
    expect(system).toContain('Markdown')
    expect(system).toMatch(/\*\*negrita\*\*/)
    expect(system).toMatch(/backticks/)
  })

  it('incluye la nota del autor cuando existe', () => {
    const { user } = construirPrompt({ ...inv, nota: 'esto va destacado' }, obtenerTema('neracode'))
    expect(user).toContain('esto va destacado')
  })
})
