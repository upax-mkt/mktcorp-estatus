import { describe, it, expect } from 'vitest'
import { personaMasParecida } from './personas'

describe('personaMasParecida', () => {
  const PERSONAS = [
    { nombre: 'Iris Múgica', correo: 'iris.mugica@jansan.mx' },
    { nombre: 'César Mejía Medina', correo: 'julio.mejiam@upax.com.mx' },
    { nombre: 'Ana García López', correo: 'ana.gl@upax.com.mx' },
    { nombre: 'Ana García Ruiz', correo: 'ana.gr@upax.com.mx' },
  ]

  it('nombre completo igual, sin acentos ni mayúsculas, es la persona', () => {
    expect(personaMasParecida('cesar mejia medina', PERSONAS)?.nombre).toBe('César Mejía Medina')
  })

  it('sin segundo nombre o apellido materno, cae a primer nombre + apellido', () => {
    // La transcripción trae "César Medina" — sin el "Mejía" de en medio.
    expect(personaMasParecida('César Medina', PERSONAS)?.nombre).toBe('César Mejía Medina')
  })

  it('sin ninguna coincidencia razonable, no sugiere a nadie', () => {
    expect(personaMasParecida('Fernando Ruiz', PERSONAS)).toBeNull()
  })

  it('nombre vacío, no sugiere a nadie', () => {
    expect(personaMasParecida('', PERSONAS)).toBeNull()
    expect(personaMasParecida('   ', PERSONAS)).toBeNull()
  })

  it('coincidencia ambigua (dos personas con el mismo primer nombre + apellido), no sugiere a nadie', () => {
    // "Ana García" solo, sin segundo apellido, calza con las dos por igual —
    // no es evidente cuál, así que no se sugiere ninguna.
    expect(personaMasParecida('Ana García', PERSONAS)).toBeNull()
  })

  it('con el segundo apellido si lo trae la transcripción, deja de ser ambiguo', () => {
    expect(personaMasParecida('Ana García Ruiz', PERSONAS)?.correo).toBe('ana.gr@upax.com.mx')
  })
})
