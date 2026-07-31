import { describe, it, expect } from 'vitest'
import { CATALOGO_DE_FUENTES, clasesDeFuentes, familiaCss, esFamiliaConocida } from './fuentes'

describe('CATALOGO_DE_FUENTES', () => {
  it('trae veinte familias', () => {
    expect(CATALOGO_DE_FUENTES).toHaveLength(20)
  })

  it('cada clave es única', () => {
    const claves = CATALOGO_DE_FUENTES.map((f) => f.clave)
    expect(new Set(claves).size).toBe(claves.length)
  })

  it('cada entrada trae nombre para enseñar y un registro válido', () => {
    for (const f of CATALOGO_DE_FUENTES) {
      expect(f.nombre, f.clave).toMatch(/\S/)
      expect(['display', 'texto', 'ambos']).toContain(f.registro)
    }
  })

  it('no incluye los alias heredados de la Fase 1 — no son fuentes reales', () => {
    const claves = CATALOGO_DE_FUENTES.map((f) => f.clave)
    expect(claves).not.toContain('specialGothic')
    expect(claves).not.toContain('satoshi')
  })
})

describe('clasesDeFuentes', () => {
  it('devuelve solo las que se le piden, no las veinte', () => {
    const clases = clasesDeFuentes(['outfit', 'archivoExpanded'])
    expect(clases.split(' ').filter(Boolean)).toHaveLength(2)
  })

  it('una clave desconocida no revienta ni cuela una clase vacía', () => {
    expect(clasesDeFuentes(['inventada']).trim()).toBe('')
  })

  it('no repite la misma clase cuando la clave se repite (título y texto comparten familia)', () => {
    const clases = clasesDeFuentes(['outfit', 'outfit'])
    expect(clases.split(' ').filter(Boolean)).toHaveLength(1)
  })

  it('una lista vacía da una cadena vacía, sin romper', () => {
    expect(clasesDeFuentes([])).toBe('')
  })

  it('resuelve los alias heredados a la clase de su familia real — mexa-creativa y uix siguen cargando su fuente', () => {
    // 'specialGothic' no tiene clase propia (no es una fuente real, ver
    // CATALOGO_DE_FUENTES) pero SÍ debe cargar la de 'archivoExpanded', a la
    // que apunta: si esto no resolviera, el título de Mexa Creativa se
    // quedaría sin su variable CSS y caería al font-family heredado.
    expect(clasesDeFuentes(['specialGothic'])).toBe(clasesDeFuentes(['archivoExpanded']))
    expect(clasesDeFuentes(['satoshi'])).toBe(clasesDeFuentes(['hankenGrotesk']))
  })
})

describe('familiaCss', () => {
  it('devuelve la variable CSS de una clave del catálogo', () => {
    expect(familiaCss('anton')).toBe('var(--f-anton)')
  })

  it('una clave desconocida cae a Outfit, no rompe', () => {
    expect(familiaCss('esto-no-existe')).toBe('var(--f-outfit)')
  })

  it('resuelve los dos alias heredados igual que antes de esta tarea', () => {
    expect(familiaCss('specialGothic')).toBe('var(--f-archivo)')
    expect(familiaCss('satoshi')).toBe('var(--f-hanken)')
  })
})

describe('esFamiliaConocida', () => {
  it('las veinte del catálogo se reconocen', () => {
    for (const f of CATALOGO_DE_FUENTES) {
      expect(esFamiliaConocida(f.clave), f.clave).toBe(true)
    }
  })

  it('los dos alias heredados se reconocen aunque no estén en el catálogo elegible', () => {
    expect(esFamiliaConocida('specialGothic')).toBe(true)
    expect(esFamiliaConocida('satoshi')).toBe(true)
  })

  it('una clave inventada no se reconoce', () => {
    expect(esFamiliaConocida('esto-no-existe')).toBe(false)
  })
})
