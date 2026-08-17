import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Calendario, nombreCortoDeSala, type SesionEnCalendario } from './Calendario'

/**
 * DEFECTO REPORTADO POR FRANCO (17-ago, ronda de móvil): a 390px el chip de
 * cada sesión (`.marca`) mide ~28-34px de ancho, y el nombre de sala se
 * cortaba a dos o tres letras ("Res…", "Ne…") — la única información que ese
 * chip existe para dar. Medido con Playwright contra /reuniones real, no a
 * ojo: ver el comentario de `nombreCortoDeSala` en `Calendario.tsx` para las
 * cifras exactas.
 *
 * El arreglo pinta DOS textos por chip —`.marcaSalaLarga` (nombre completo) y
 * `.marcaSalaCorta` (nombre corto oficial)— y una media query en
 * `agenda.module.css` decide cuál se ve según el ancho del VIEWPORT, no del
 * componente. jsdom no evalúa `@media`, así que esta suite no puede probar
 * "a 390px se ve el corto" — eso quedó verificado con capturas reales
 * (390px y 1440px) fuera de esta suite. Lo que SÍ prueba aquí, sin
 * necesidad de un navegador real: que ambos textos existen en el DOM con el
 * contenido correcto (uno de los dos SIEMPRE es el que se ve, sea cual sea
 * el ancho), y la función pura `nombreCortoDeSala` que decide el corto.
 *
 * Selectores por `[class*=…]`, no `.marcaSalaLarga` a secas: bajo Vitest+Vite
 * las clases de un CSS Module salen escopadas (`_marcaSalaLarga_4f3dde`), no
 * con el nombre literal — comprobado con un dump real del DOM antes de
 * escribir esta suite, no asumido.
 */

const HOY = '2026-08-17T18:00:00.000Z'

function sesion(datos: Partial<SesionEnCalendario> & { id: string; fecha: string }): SesionEnCalendario {
  return {
    titulo: 'Estatus',
    salaSlug: 'research-land',
    salaNombre: 'Research Land',
    salaColor: '#6b21a8',
    estado: 'agendada',
    ...datos,
  }
}

describe('nombreCortoDeSala — la sigla oficial de cada UDN, no una inventada', () => {
  it.each([
    ['Research Land', 'RL'],
    ['Promo Espacio', 'PE'],
    ['Marketing United', 'MU'],
    ['Mexa Creativa', 'MC'],
    ['House of Films', 'HoF'],
    ['UiX', 'UiX'],
    ['NeraCode', 'NC'],
    ['Zeus', 'Zeus'],
  ])('%s → %s', (nombre, corto) => {
    expect(nombreCortoDeSala(nombre)).toBe(corto)
  })

  it('no distingue mayúsculas ni espacios de sobra — salaNombre es texto libre editado desde /salas', () => {
    expect(nombreCortoDeSala('  research land  ')).toBe('RL')
    expect(nombreCortoDeSala('HOUSE OF FILMS')).toBe('HoF')
  })

  it('una sala que NO es de las 8 UDN (p. ej. "Ceci") se queda con su propio nombre — no inventa una sigla', () => {
    expect(nombreCortoDeSala('Ceci')).toBe('Ceci')
  })

  it('una sala nueva creada desde /salas, con un nombre que Franco nunca abrevió, tampoco inventa nada', () => {
    expect(nombreCortoDeSala('Sala de Juntas 3')).toBe('Sala de Juntas 3')
  })
})

describe('Calendario — el chip pinta el nombre completo Y el corto, para que la media query de agenda.module.css elija', () => {
  it('cada sesión trae su nombre completo en .marcaSalaLarga y su nombre corto en .marcaSalaCorta', () => {
    const { container } = render(
      <Calendario
        hoy={HOY}
        sesiones={[
          sesion({ id: 's1', fecha: '2026-08-11T16:00:00.000Z', salaNombre: 'Marketing United', salaSlug: 'marketing-united' }),
        ]}
      />,
    )

    const largo = container.querySelector('[class*="marcaSalaLarga"]')
    const corto = container.querySelector('[class*="marcaSalaCorta"]')
    expect(largo?.textContent).toBe('Marketing United')
    expect(corto?.textContent).toBe('MU')
  })

  it('una sala sin sigla oficial (p. ej. "Ceci") pinta el mismo texto en ambos — no hay corto que inventar', () => {
    const { container } = render(
      <Calendario
        hoy={HOY}
        sesiones={[sesion({ id: 's1', fecha: '2026-08-11T16:00:00.000Z', salaNombre: 'Ceci', salaSlug: 'ceci' })]}
      />,
    )

    const largo = container.querySelector('[class*="marcaSalaLarga"]')
    const corto = container.querySelector('[class*="marcaSalaCorta"]')
    expect(largo?.textContent).toBe('Ceci')
    expect(corto?.textContent).toBe('Ceci')
  })

  it('el title del chip sigue enseñando el nombre COMPLETO de la sala, sin abreviar — es lo que lee un lector de pantalla o el tooltip', () => {
    const { container } = render(
      <Calendario
        hoy={HOY}
        sesiones={[
          sesion({
            id: 's1',
            fecha: '2026-08-11T16:00:00.000Z',
            salaNombre: 'House of Films',
            salaSlug: 'house-of-films',
            titulo: 'Estatus Mensual Julio',
          }),
        ]}
      />,
    )

    const chip = container.querySelector('a[href^="/deck/"]')
    expect(chip?.getAttribute('title')).toContain('House of Films')
    expect(chip?.getAttribute('title')).not.toContain('HoF ·')
  })
})
