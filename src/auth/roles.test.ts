import { describe, it, expect } from 'vitest'
import { puedeAdministrar, puedeEditarContenido, puedeLeer } from './roles'
import type { Sesion } from './firma'

// `rolApp` se deja como `string` a propósito (no como el literal de `Sesion`):
// así se puede probar un rol inventado ('superadmin', 'Editor' con mayúscula)
// sin que TypeScript lo impida antes de tiempo — lo que hay que comprobar es
// que la función lo rechace EN TIEMPO DE EJECUCIÓN, que es lo único que
// importa para algo que viene de una cookie. El `as Sesion` final es el mismo
// gesto que hace `verificar()` con el JSON que decodifica: confía en la
// forma para poder ejercitar contenidos que esa forma normalmente no deja
// escribir.
const equipo = (rolApp?: string) => ({ rol: 'equipo' as const, rolApp, exp: 9e12 }) as Sesion
const sala: Sesion = { rol: 'sala' as const, sala: 'neracode', exp: 9e12 }

describe('los tres permisos', () => {
  it('admin puede todo', () => {
    const s = equipo('admin')
    expect(puedeAdministrar(s)).toBe(true)
    expect(puedeEditarContenido(s)).toBe(true)
    expect(puedeLeer(s)).toBe(true)
  })

  it('editor edita pero no administra', () => {
    const s = equipo('editor')
    expect(puedeAdministrar(s)).toBe(false)
    expect(puedeEditarContenido(s)).toBe(true)
  })

  it('viewer solo lee', () => {
    const s = equipo('viewer')
    expect(puedeAdministrar(s)).toBe(false)
    expect(puedeEditarContenido(s)).toBe(false)
    expect(puedeLeer(s)).toBe(true)
  })

  it('una sesión de equipo SIN rol no puede nada: falla cerrado', () => {
    const s = equipo(undefined)
    expect(puedeAdministrar(s)).toBe(false)
    expect(puedeEditarContenido(s)).toBe(false)
  })

  it('un rol inventado no cuela', () => {
    expect(puedeAdministrar(equipo('superadmin'))).toBe(false)
    expect(puedeEditarContenido(equipo('Editor'))).toBe(false)
  })

  it('el director de UDN no gana nada de esto', () => {
    expect(puedeAdministrar(sala)).toBe(false)
    expect(puedeEditarContenido(sala)).toBe(false)
  })

  it('sin sesión, nada', () => {
    expect(puedeAdministrar(null)).toBe(false)
    expect(puedeEditarContenido(null)).toBe(false)
    expect(puedeLeer(null)).toBe(false)
  })
})
