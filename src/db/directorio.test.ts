import { describe, it, expect } from 'vitest'
import { normalizarCorreo, esRolValido } from './directorio'

describe('normalizarCorreo', () => {
  it('a minúsculas y sin espacios: el correo es la clave primaria', () => {
    expect(normalizarCorreo('  Franco.Cruzat@UPAX.com.mx ')).toBe('franco.cruzat@upax.com.mx')
  })

  it('una cadena sin arroba no es un correo', () => {
    expect(normalizarCorreo('franco')).toBeNull()
    expect(normalizarCorreo('')).toBeNull()
    expect(normalizarCorreo('   ')).toBeNull()
  })
})

describe('esRolValido', () => {
  it('acepta los tres y nada más', () => {
    expect(esRolValido('admin')).toBe(true)
    expect(esRolValido('editor')).toBe(true)
    expect(esRolValido('viewer')).toBe(true)
    expect(esRolValido('Admin')).toBe(false)
    expect(esRolValido('superadmin')).toBe(false)
    expect(esRolValido('')).toBe(false)
  })
})
