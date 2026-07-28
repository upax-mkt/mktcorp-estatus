import { describe, it, expect } from 'vitest'
import { puedeEditarAcuerdos, puedeEditar } from './politica'
import type { Sesion } from './firma'

/**
 * La única excepción a "solo Marketing Corp escribe".
 *
 * Un acuerdo es un compromiso de la UDN. Que su dueño no pueda marcarlo como
 * cumplido obliga a pedirlo por Slack para que alguien lo teclee — el trámite
 * que esta app viene a quitar. Pero la excepción es ESA y nada más: no
 * alcanza a preparar sesiones, subir archivos ni minutar.
 */
const EQUIPO: Sesion = { rol: 'equipo', sub: 'franco@upax.com.mx', exp: Date.now() + 1000 }
const DIR_NERACODE: Sesion = { rol: 'sala', sala: 'neracode', exp: Date.now() + 1000 }

describe('puedeEditarAcuerdos', () => {
  it('el equipo mueve los de cualquier sala', () => {
    expect(puedeEditarAcuerdos(EQUIPO, 'neracode')).toBe(true)
    expect(puedeEditarAcuerdos(EQUIPO, 'zeus')).toBe(true)
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

  it('la excepción NO amplía lo demás: el director sigue sin poder escribir', () => {
    // `puedeEditar` es lo que guarda preparar sesiones, subir archivos y
    // minutar. Si esto se volviera true, la excepción de los acuerdos se
    // habría convertido en acceso de escritura general.
    expect(puedeEditar(DIR_NERACODE)).toBe(false)
    expect(puedeEditar(EQUIPO)).toBe(true)
  })
})
