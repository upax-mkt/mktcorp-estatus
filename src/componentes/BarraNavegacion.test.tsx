import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { BarraNavegacion, type BarraNavegacionProps } from './BarraNavegacion'

/**
 * LOS CLIENTES DEL DESPLEGABLE llegan por prop (los carga cada pantalla con
 * `clientesParaBarra()`), así que aquí se pasan a mano: esta suite fija la
 * ESTRUCTURA del menú, no qué clientes existen hoy.
 */
const CLIENTES = [
  { slug: 'mexa-creativa', nombre: 'Mexa Creativa', color: '#E4002B' },
  { slug: 'neracode', nombre: 'NeraCode', color: '#0A2540' },
]

function pintar(props: Omit<BarraNavegacionProps, 'clientes'>) {
  return render(<BarraNavegacion {...props} clientes={CLIENTES} />)
}

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

/**
 * `Clientes` DEJÓ DE SER UN ENLACE. Desde que despliega la lista de clientes
 * es un `summary` —un control que abre y cierra—, y la pantalla de
 * configuración pasó a ser el primer enlace de dentro. Estos ayudantes evitan
 * que cada aserción tenga que saberlo.
 */
const pestanaClientes = () => screen.getByText('Clientes', { selector: 'summary' })
/** Las cinco pestañas que siguen siendo un enlace directo. */
const PESTANAS_ENLACE = ['Reuniones', 'Presentaciones', 'Acuerdos', 'Concurso', 'Personas']

describe('BarraNavegacion — el orden del ciclo, sin excepción', () => {
  it('pinta las cinco pestañas del ciclo, en orden, cuando admin=true', () => {
    pintar({ hoy: HOY, admin: true, salirAction: salirAction })

    const nav = screen.getByRole('navigation')
    // Solo los de primer nivel: los del desplegable de Clientes cuelgan de él.
    const enlaces = within(nav)
      .getAllByRole('link')
      .filter((a) => !a.closest('details'))
    expect(enlaces.map((a) => a.textContent)).toEqual([
      'Reuniones', 'Presentaciones', 'Acuerdos', 'Concurso', 'Personas',
    ])
    expect(pestanaClientes()).toBeInTheDocument()
  })

  it('sin admin, Clientes y Personas no se pintan — el resto del orden no se mueve', () => {
    pintar({ hoy: HOY, admin: false, salirAction: salirAction })

    const nav = screen.getByRole('navigation')
    const enlaces = within(nav).getAllByRole('link')
    expect(enlaces.map((a) => a.textContent)).toEqual(['Reuniones', 'Presentaciones', 'Acuerdos', 'Concurso'])
    expect(screen.queryByText('Clientes', { selector: 'summary' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Personas' })).not.toBeInTheDocument()
    // Y sin la pestaña tampoco se filtra ni un cliente: el desplegable
    // hereda la visibilidad de la pestaña de la que cuelga.
    expect(screen.queryByRole('link', { name: /Mexa Creativa/ })).not.toBeInTheDocument()
  })

  it('cada pestaña apunta a su ruta real — Presentaciones a /deck, no a su nombre visible', () => {
    pintar({ hoy: HOY, admin: true, salirAction: salirAction })

    expect(screen.getByRole('link', { name: 'Reuniones' })).toHaveAttribute('href', '/reuniones')
    expect(screen.getByRole('link', { name: 'Presentaciones' })).toHaveAttribute('href', '/deck')
    expect(screen.getByRole('link', { name: 'Acuerdos' })).toHaveAttribute('href', '/acuerdos')
    expect(screen.getByRole('link', { name: 'Concurso' })).toHaveAttribute('href', '/concurso')
    expect(screen.getByRole('link', { name: 'Personas' })).toHaveAttribute('href', '/personas')
  })

  it('el logo enlaza al Home', () => {
    pintar({ hoy: HOY, admin: true, salirAction: salirAction })
    expect(screen.getByRole('link', { name: 'Marketing Corp' })).toHaveAttribute('href', '/')
  })
})

/**
 * EL DESPLEGABLE DE CLIENTES (Franco: *"en el menú, los clientes deberían
 * desplegarse para ingresar a uno directamente"*).
 *
 * Lo que estas pruebas protegen es que la pantalla de configuración NO se
 * pierda al convertir la pestaña en desplegable: era su único destino y sigue
 * teniendo que estar a un clic.
 */
describe('BarraNavegacion — Clientes despliega la lista', () => {
  it('lleva a la sala de cada cliente, directo', () => {
    pintar({ hoy: HOY, admin: true, salirAction: salirAction })

    expect(screen.getByRole('link', { name: /Mexa Creativa/ })).toHaveAttribute(
      'href', '/cliente/mexa-creativa',
    )
    expect(screen.getByRole('link', { name: /NeraCode/ })).toHaveAttribute(
      'href', '/cliente/neracode',
    )
  })

  it('conserva la puerta a la configuración, que era el destino de la pestaña', () => {
    pintar({ hoy: HOY, admin: true, salirAction: salirAction })
    expect(screen.getByRole('link', { name: /Configurar clientes/ })).toHaveAttribute(
      'href', '/salas',
    )
  })

  /** Abre con teclado y con dedo sin una línea de JS: por eso es `details`. */
  it('es un details/summary nativo, no un menú que exija JavaScript', () => {
    const { container } = pintar({ hoy: HOY, admin: true, salirAction: salirAction })
    const detalle = container.querySelector('details')
    expect(detalle).not.toBeNull()
    expect(detalle).toContainElement(pestanaClientes())
    expect(detalle).toContainElement(screen.getByRole('link', { name: /Mexa Creativa/ }))
  })
})

describe('BarraNavegacion — aria-current marca la pestaña actual, no solo el color', () => {
  it('seccionActiva="deck" marca SOLO Presentaciones', () => {
    pintar({ hoy: HOY, admin: true, seccionActiva: 'deck', salirAction: salirAction })

    expect(screen.getByRole('link', { name: 'Presentaciones' })).toHaveAttribute('aria-current', 'page')
    for (const nombre of ['Reuniones', 'Acuerdos', 'Concurso', 'Personas']) {
      expect(screen.getByRole('link', { name: nombre })).not.toHaveAttribute('aria-current')
    }
    expect(pestanaClientes()).not.toHaveAttribute('aria-current')
  })

  it('seccionActiva="reuniones" marca SOLO Reuniones', () => {
    pintar({ hoy: HOY, admin: true, seccionActiva: 'reuniones', salirAction: salirAction })
    expect(screen.getByRole('link', { name: 'Reuniones' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Presentaciones' })).not.toHaveAttribute('aria-current')
  })

  it('Concurso es visible para todo el equipo y marca su ruta', () => {
    pintar({ hoy: HOY, admin: false, seccionActiva: 'concurso', salirAction: salirAction })
    expect(screen.getByRole('link', { name: 'Concurso' })).toHaveAttribute('href', '/concurso')
    expect(screen.getByRole('link', { name: 'Concurso' })).toHaveAttribute('aria-current', 'page')
  })

  it('seccionActiva="salas" (Clientes) marca esa pestaña, no la de Presentaciones', () => {
    pintar({ hoy: HOY, admin: true, seccionActiva: 'salas', salirAction: salirAction })
    // La marca de pestaña actual vive en el `summary`, que es el control
    // visible: el enlace de dentro solo existe con el desplegable abierto.
    expect(pestanaClientes()).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Presentaciones' })).not.toHaveAttribute('aria-current')
  })

  it('sin seccionActiva (el Home), ninguna pestaña se marca — el Home no es ninguna de las cinco', () => {
    pintar({ hoy: HOY, admin: true, salirAction: salirAction })
    for (const nombre of PESTANAS_ENLACE) {
      expect(screen.getByRole('link', { name: nombre })).not.toHaveAttribute('aria-current')
    }
    expect(pestanaClientes()).not.toHaveAttribute('aria-current')
  })
})

describe('BarraNavegacion — la fecha y Salir', () => {
  it('pinta la fecha de hoy con fechaLarga (lib/fecha, anclada a CDMX)', () => {
    pintar({ hoy: HOY, admin: true, salirAction: salirAction })
    expect(screen.getByText('jueves, 6 de agosto')).toBeInTheDocument()
  })

  it('Salir es un <form> con Server Action, no un enlace', () => {
    const { container } = pintar({ hoy: HOY, admin: true, salirAction: salirAction })

    const boton = screen.getByRole('button', { name: 'Salir' })
    expect(boton).toHaveAttribute('type', 'submit')
    const formulario = container.querySelector('form')
    expect(formulario).not.toBeNull()
    expect(formulario).toContainElement(boton)
    expect(screen.queryByRole('link', { name: 'Salir' })).not.toBeInTheDocument()
  })

  it('el formulario de Salir usa la Server Action recibida por props', () => {
    const miAccion = vi.fn().mockResolvedValue(undefined)
    const { container } = pintar({ hoy: HOY, admin: true, salirAction: miAccion })
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
    pintar({ hoy: HOY, admin: true, salirAction: salirAction })
    const nav = screen.getByRole('navigation')
    expect(nav.tagName).toBe('NAV')
    expect(nav.getAttribute('aria-label')).toBeTruthy()
  })

  it('el orden del DOM es el orden visual: Reuniones antes que Presentaciones antes que Acuerdos antes que Clientes antes que Personas — así el tabulado sigue ese mismo orden', () => {
    pintar({ hoy: HOY, admin: true, salirAction: salirAction })
    const nav = screen.getByRole('navigation')
    // Se compara el orden de los CONTROLES de primer nivel —cuatro enlaces y
    // el `summary` de Clientes—, que es el orden en que los recorre el
    // tabulador. Los enlaces del desplegable no cuentan: cuelgan de él.
    const controles = [...nav.querySelectorAll('a, summary')].filter(
      (e) => e.tagName === 'SUMMARY' || !e.closest('details'),
    )
    const nombres = controles.map((e) => e.textContent)
    expect(nombres.indexOf('Reuniones')).toBeLessThan(nombres.indexOf('Presentaciones'))
    expect(nombres.indexOf('Presentaciones')).toBeLessThan(nombres.indexOf('Acuerdos'))
    expect(nombres.indexOf('Acuerdos')).toBeLessThan(nombres.indexOf('Clientes'))
    expect(nombres.indexOf('Acuerdos')).toBeLessThan(nombres.indexOf('Concurso'))
    expect(nombres.indexOf('Concurso')).toBeLessThan(nombres.indexOf('Clientes'))
    expect(nombres.indexOf('Clientes')).toBeLessThan(nombres.indexOf('Personas'))
  })
})
