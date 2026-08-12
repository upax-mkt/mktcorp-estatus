import { describe, it, expect } from 'vitest'
import { puedeEditarContenido, puedeVerSala } from './politica'
import type { Sesion } from './firma'

/**
 * EL ENLACE DE UNA SALA SE MIRA, NO SE TOCA.
 *
 * Hasta el 12-ago existía una excepción a "solo Marketing Corp escribe":
 * `puedeEditarAcuerdos` dejaba al director de una UDN mover el estatus y la
 * fecha de los compromisos de SU sala. La razón era buena —que el dueño de un
 * acuerdo pueda marcarlo cumplido sin pedirlo por Slack— y aun así se cerró,
 * porque el enlace de una sala se COMPARTE:
 *
 *   Franco: *"cuando comparto esta URL… si no estás logueado solo puede ver la
 *   vista de solo lectura; por ende no tiene que verse el botón añadir
 *   acuerdo, ni poder modificar fechas o estatus"*.
 *
 * Esta suite fija lo que queda en pie: que un acceso de sala NO escribe nada,
 * en ninguna parte. Sustituye a la que probaba la excepción — se conserva el
 * archivo, y no se borra, porque lo que aquí importa es que la regla vieja no
 * vuelva sin que nadie se entere.
 */
const EQUIPO: Sesion = { rol: 'equipo', sub: 'franco@upax.com.mx', rolApp: 'admin', exp: Date.now() + 1000 }
const EDITOR: Sesion = { rol: 'equipo', sub: 'editora@upax.com.mx', rolApp: 'editor', exp: Date.now() + 1000 }
const VIEWER: Sesion = { rol: 'equipo', sub: 'viewer@upax.com.mx', rolApp: 'viewer', exp: Date.now() + 1000 }
const DIR_NERACODE: Sesion = { rol: 'sala', sala: 'neracode', exp: Date.now() + 1000 }

describe('un acceso de sala no escribe nada', () => {
  /**
   * VER DEJÓ DE SER LO QUE SE RESTRINGE (12-ago): la sala de un cliente se
   * lee sin sesión, porque su URL se comparte. Lo que se restringe es
   * escribir, y eso es lo que comprueba el resto de esta suite.
   */
  it('la sala se ve, con acceso de sala o sin ninguno', () => {
    expect(puedeVerSala(DIR_NERACODE, 'neracode')).toBe(true)
    expect(puedeVerSala(DIR_NERACODE, 'zeus')).toBe(true)
    expect(puedeVerSala(null, 'neracode')).toBe(true)
  })

  /**
   * EL CAMBIO DEL 12-AGO, en una línea: antes esto era `true` para los
   * acuerdos de su propia sala a través de `puedeEditarAcuerdos`. Ya no hay
   * ninguna vía por la que un acceso de sala escriba.
   */
  it('no edita contenido, y ya no queda ninguna excepción que lo permita', () => {
    expect(puedeEditarContenido(DIR_NERACODE)).toBe(false)
  })

  it('sin sesión tampoco, evidentemente', () => {
    expect(puedeEditarContenido(null)).toBe(false)
  })
})

describe('dentro de Marketing Corp, quién escribe', () => {
  it('admin y editor sí', () => {
    expect(puedeEditarContenido(EQUIPO)).toBe(true)
    expect(puedeEditarContenido(EDITOR)).toBe(true)
  })

  /** Un viewer de Mkt Corp lee todo y no toca nada — igual que el director. */
  it('un viewer no', () => {
    expect(puedeEditarContenido(VIEWER)).toBe(false)
  })
})
