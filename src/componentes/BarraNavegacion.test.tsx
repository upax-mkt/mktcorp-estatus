import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { BarraNavegacion } from './BarraNavegacion'

/**
 * LA BARRA, siempre disponible (ronda 11, tarea 2).
 *
 * Extraída del Home (`src/app/page.tsx`), que hasta esta ronda era la ÚNICA
 * pantalla con el menú completo — `/reuniones` tenía una versión divergida
 * (solo "Presentaciones", sin Reuniones/Acuerdos/Clientes/Personas/Salir) y
 * el resto de pantallas, ninguna. Esta suite fija el contrato que las siete
 * pantallas que la montan (`page.tsx`, `deck/page.tsx`, `deck/nueva/page.tsx`,
 * `deck/[id]/page.tsx`, `acuerdos/page.tsx`, `salas/page.tsx`,
 * `personas/page.tsx`) pueden dar por hecho.
 *
 * Lo que más vale de esta suite (brief, "Tu trabajo", punto 1): que la
 * pestaña ACTUAL se marque con `aria-current="page"` y que `admin` siga
 * filtrando Clientes/Personas — las dos cosas que ya rompía la barra
 * divergida de `/reuniones` sin que nadie lo hubiera notado.
 */

const HOY = new Date('2026-08-06T18:00:00.000Z') // "jueves, 6 de agosto" en CDMX

function salirAction() {
  return Promise.resolve()
}

describe('BarraNavegacion — el orden del ciclo, sin excepción', () => {
  it('pinta las cinco pestañas del ciclo, en orden, cuando admin=true', () => {
    render(<BarraNavegacion hoy={HOY} admin salirAction={salirAction} />)

    const nav = screen.getByRole('navigation')
    const enlaces = within(nav).getAllByRole('link')
    expect(enlaces.map((a) => a.textContent)).toEqual([
      'Reuniones', 'Presentaciones', 'Acuerdos', 'Clientes', 'Personas',
    ])
  })

  it('sin admin, Clientes y Personas no se pintan — el resto del orden no se mueve', () => {
    render(<BarraNavegacion hoy={HOY} admin={false} salirAction={salirAction} />)

    const nav = screen.getByRole('navigation')
    const enlaces = within(nav).getAllByRole('link')
    expect(enlaces.map((a) => a.textContent)).toEqual(['Reuniones', 'Presentaciones', 'Acuerdos'])
    expect(screen.queryByRole('link', { name: 'Clientes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Personas' })).not.toBeInTheDocument()
  })

  it('cada pestaña apunta a su ruta real — Presentaciones a /deck y Clientes a /salas, no a su nombre visible', () => {
    render(<BarraNavegacion hoy={HOY} admin salirAction={salirAction} />)

    expect(screen.getByRole('link', { name: 'Reuniones' })).toHaveAttribute('href', '/reuniones')
    expect(screen.getByRole('link', { name: 'Presentaciones' })).toHaveAttribute('href', '/deck')
    expect(screen.getByRole('link', { name: 'Acuerdos' })).toHaveAttribute('href', '/acuerdos')
    expect(screen.getByRole('link', { name: 'Clientes' })).toHaveAttribute('href', '/salas')
    expect(screen.getByRole('link', { name: 'Personas' })).toHaveAttribute('href', '/personas')
  })

  it('el logo enlaza al Home', () => {
    render(<BarraNavegacion hoy={HOY} admin salirAction={salirAction} />)
    expect(screen.getByRole('link', { name: 'Marketing Corp' })).toHaveAttribute('href', '/')
  })
})

describe('BarraNavegacion — aria-current marca la pestaña actual, no solo el color', () => {
  it('seccionActiva="deck" marca SOLO Presentaciones', () => {
    render(<BarraNavegacion hoy={HOY} admin seccionActiva="deck" salirAction={salirAction} />)

    expect(screen.getByRole('link', { name: 'Presentaciones' })).toHaveAttribute('aria-current', 'page')
    for (const nombre of ['Reuniones', 'Acuerdos', 'Clientes', 'Personas']) {
      expect(screen.getByRole('link', { name: nombre })).not.toHaveAttribute('aria-current')
    }
  })

  it('seccionActiva="reuniones" marca SOLO Reuniones', () => {
    render(<BarraNavegacion hoy={HOY} admin seccionActiva="reuniones" salirAction={salirAction} />)
    expect(screen.getByRole('link', { name: 'Reuniones' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Presentaciones' })).not.toHaveAttribute('aria-current')
  })

  it('seccionActiva="salas" (Clientes) marca esa pestaña, no la de Presentaciones', () => {
    render(<BarraNavegacion hoy={HOY} admin seccionActiva="salas" salirAction={salirAction} />)
    expect(screen.getByRole('link', { name: 'Clientes' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Presentaciones' })).not.toHaveAttribute('aria-current')
  })

  it('sin seccionActiva (el Home), ninguna pestaña se marca — el Home no es ninguna de las cinco', () => {
    render(<BarraNavegacion hoy={HOY} admin salirAction={salirAction} />)
    for (const nombre of ['Reuniones', 'Presentaciones', 'Acuerdos', 'Clientes', 'Personas']) {
      expect(screen.getByRole('link', { name: nombre })).not.toHaveAttribute('aria-current')
    }
  })
})

describe('BarraNavegacion — la fecha y Salir', () => {
  it('pinta la fecha de hoy con fechaLarga (lib/fecha, anclada a CDMX)', () => {
    render(<BarraNavegacion hoy={HOY} admin salirAction={salirAction} />)
    expect(screen.getByText('jueves, 6 de agosto')).toBeInTheDocument()
  })

  it('Salir es un <form> con Server Action, no un enlace', () => {
    const { container } = render(<BarraNavegacion hoy={HOY} admin salirAction={salirAction} />)

    const boton = screen.getByRole('button', { name: 'Salir' })
    expect(boton).toHaveAttribute('type', 'submit')
    const formulario = container.querySelector('form')
    expect(formulario).not.toBeNull()
    expect(formulario).toContainElement(boton)
    expect(screen.queryByRole('link', { name: 'Salir' })).not.toBeInTheDocument()
  })

  it('el formulario de Salir usa la Server Action recibida por props', () => {
    const miAccion = vi.fn().mockResolvedValue(undefined)
    const { container } = render(<BarraNavegacion hoy={HOY} admin salirAction={miAccion} />)
    const formulario = container.querySelector('form')
    // React 19 serializa una Server Action como `action` del <form>; lo que
    // importa aquí es que sea EXACTAMENTE la función recibida, no una nueva
    // — mismo criterio que los tests de página que comparan
    // `props.agendarAction` contra el binding importado (reuniones/page.test.tsx).
    expect(formulario?.getAttribute('action')).not.toBe('')
  })
})

describe('BarraNavegacion — accesibilidad estructural', () => {
  it('es un <nav> con etiqueta accesible propia (no un <div> con clase)', () => {
    render(<BarraNavegacion hoy={HOY} admin salirAction={salirAction} />)
    const nav = screen.getByRole('navigation')
    expect(nav.tagName).toBe('NAV')
    expect(nav.getAttribute('aria-label')).toBeTruthy()
  })

  it('el orden del DOM es el orden visual: Reuniones antes que Presentaciones antes que Acuerdos antes que Clientes antes que Personas — así el tabulado sigue ese mismo orden', () => {
    render(<BarraNavegacion hoy={HOY} admin salirAction={salirAction} />)
    const nav = screen.getByRole('navigation')
    const nombres = within(nav).getAllByRole('link').map((a) => a.textContent)
    expect(nombres.indexOf('Reuniones')).toBeLessThan(nombres.indexOf('Presentaciones'))
    expect(nombres.indexOf('Presentaciones')).toBeLessThan(nombres.indexOf('Acuerdos'))
    expect(nombres.indexOf('Acuerdos')).toBeLessThan(nombres.indexOf('Clientes'))
    expect(nombres.indexOf('Clientes')).toBeLessThan(nombres.indexOf('Personas'))
  })
})
