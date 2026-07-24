import { describe, it, expect } from 'vitest'
import { construirPromptMinuta } from './prompt'

const sesion = {
  salaNombre: 'NeraCode',
  tipo: 'mensual' as const,
  alcance: 'todos',
  fecha: '2026-07-24T12:00:00.000Z',
}

describe('construirPromptMinuta', () => {
  it('prohíbe explícitamente inventar responsables o fechas', () => {
    const { system } = construirPromptMinuta(sesion, 'transcripción de ejemplo')
    expect(system).toMatch(/no inventar/i)
    expect(system).toContain('por asignar')
  })

  it('prohíbe explícitamente Markdown y HTML', () => {
    const { system } = construirPromptMinuta(sesion, 'x')
    expect(system).toContain('Markdown')
    expect(system.toLowerCase()).toContain('html')
  })

  it('incluye la sala y la fecha de la sesión como ancla', () => {
    const { user } = construirPromptMinuta(sesion, 'x')
    expect(user).toContain('NeraCode')
    expect(user).toContain('2026-07-24')
  })

  it('incluye la transcripción completa en el mensaje de usuario', () => {
    const { user } = construirPromptMinuta(sesion, 'Fernando: vamos a cerrar las keywords el viernes.')
    expect(user).toContain('Fernando: vamos a cerrar las keywords el viernes.')
  })
})
