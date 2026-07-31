import { describe, it, expect } from 'vitest'
import { puedeEditarAcuerdos, puedeEditarContenido } from './politica'
import type { Sesion } from './firma'

/**
 * La única excepción a "solo Marketing Corp escribe".
 *
 * Un acuerdo es un compromiso de la UDN. Que su dueño no pueda marcarlo como
 * cumplido obliga a pedirlo por Slack para que alguien lo teclee — el trámite
 * que esta app viene a quitar. Pero la excepción es ESA y nada más: no
 * alcanza a preparar sesiones, subir archivos ni minutar.
 *
 * Desde la ronda 9 (tarea 2) `puedeEditarAcuerdos` mira además `rolApp` para
 * el lado de equipo: admin y editor entran, viewer no — un `EQUIPO` con
 * `rolApp: 'admin'` sigue siendo el caso representativo (Franco es admin, ver
 * la migración de la tarea 1), con `EDITOR`/`VIEWER` aparte para las dos
 * ramas nuevas que antes no existían.
 */
const EQUIPO: Sesion = { rol: 'equipo', sub: 'franco@upax.com.mx', rolApp: 'admin', exp: Date.now() + 1000 }
const EDITOR: Sesion = { rol: 'equipo', sub: 'editora@upax.com.mx', rolApp: 'editor', exp: Date.now() + 1000 }
const VIEWER: Sesion = { rol: 'equipo', sub: 'viewer@upax.com.mx', rolApp: 'viewer', exp: Date.now() + 1000 }
const DIR_NERACODE: Sesion = { rol: 'sala', sala: 'neracode', exp: Date.now() + 1000 }

describe('puedeEditarAcuerdos', () => {
  it('el equipo (admin) mueve los de cualquier sala', () => {
    expect(puedeEditarAcuerdos(EQUIPO, 'neracode')).toBe(true)
    expect(puedeEditarAcuerdos(EQUIPO, 'zeus')).toBe(true)
  })

  it('un editor también: exigirEdicionDeAcuerdos acepta admin y editor', () => {
    expect(puedeEditarAcuerdos(EDITOR, 'neracode')).toBe(true)
  })

  it('un viewer NO: solo lee, no es la excepción de acuerdos', () => {
    expect(puedeEditarAcuerdos(VIEWER, 'neracode')).toBe(false)
  })

  it('el director mueve los de SU sala', () => {
    expect(puedeEditarAcuerdos(DIR_NERACODE, 'neracode')).toBe(true)
  })

  it('y no los de otra', () => {
    expect(puedeEditarAcuerdos(DIR_NERACODE, 'zeus')).toBe(false)
  })

  it('sin sesión, nada', () => {
    expect(puedeEditarAcuerdos(null, 'neracode')).toBe(false)
  })

  it('un slug que empieza igual no cuela', () => {
    expect(puedeEditarAcuerdos(DIR_NERACODE, 'neracode-falsa')).toBe(false)
  })

  it('la excepción NO amplía lo demás: el director sigue sin poder editar contenido en general', () => {
    // `puedeEditarContenido` es lo que guarda preparar sesiones, subir
    // archivos y minutar (`puedeEditar`, más laxo y sin mirar `rolApp`, se
    // retiró en la corrección post-revisión de la ronda 9 — ver
    // src/auth/roles.ts). Si esto se volviera true para el director, la
    // excepción de los acuerdos se habría convertido en acceso de escritura
    // general.
    expect(puedeEditarContenido(DIR_NERACODE)).toBe(false)
    expect(puedeEditarContenido(EQUIPO)).toBe(true)
  })
})
