import { describe, it, expect } from 'vitest'
import { construirPrompt } from './prompt'
import { obtenerTema } from '@/temas'

describe('construirPrompt', () => {
  const inv = { titulo: 'Performance', piezas: [{ tipo: 'cifra' as const, valor: '9.2', rotulo: 'Posición' }] }

  it('solo ofrece layouts implementados, nunca los del catálogo sin componente', () => {
    const { system } = construirPrompt(inv, obtenerTema('neracode'))
    expect(system).toContain('kpis-fila-dos-columnas')
    expect(system).not.toContain('matriz-estados')  // declarado pero sin componente
  })

  it('prohíbe explícitamente el estilo', () => {
    const { system } = construirPrompt(inv, obtenerTema('neracode'))
    expect(system.toLowerCase()).toMatch(/no.*color|nunca.*css|sin estilo/)
  })

  it('incluye la nota del autor cuando existe', () => {
    const { user } = construirPrompt({ ...inv, nota: 'esto va destacado' }, obtenerTema('neracode'))
    expect(user).toContain('esto va destacado')
  })
})
