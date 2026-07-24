import { describe, it, expect } from 'vitest'
import { validarDecision, aLayoutSeguro } from './validar'
import { esLayoutImplementado } from './catalogo'
import type { Inventario } from './inventario'
import type { DecisionSlide } from '@/decision/esquema'

const invConDosCifras: Inventario = { titulo: 'x', piezas: [
  { tipo: 'cifra' as const, valor: '9.2', rotulo: 'Posición' },
  { tipo: 'cifra' as const, valor: '29k', rotulo: 'Impresiones' },
] }

describe('validarDecision', () => {
  it('acepta una decisión de KPIs que conserva las cifras', () => {
    const d = { layout: 'kpis-fila-dos-columnas' as const, titulo: 'x',
      kpis: [{ valor: '9.2', rotulo: 'Posición' }, { valor: '29k', rotulo: 'Impresiones' }], razon: 'r' }
    expect(validarDecision(d, invConDosCifras).ok).toBe(true)
  })

  it('rechaza un layout aún no implementado', () => {
    const d = { layout: 'matriz-estados' as const, titulo: 'x', razon: 'r' }
    const v = validarDecision(d, invConDosCifras)
    expect(v.ok).toBe(false)
  })

  it('rechaza una decisión de KPIs que perdió cifras del inventario', () => {
    const d = { layout: 'kpis-fila-dos-columnas' as const, titulo: 'x',
      kpis: [{ valor: '9.2', rotulo: 'Posición' }], razon: 'r' }  // faltó una
    expect(validarDecision(d, invConDosCifras).ok).toBe(false)
  })

  it('rechaza un layout de KPIs sin ningún KPI', () => {
    const d = { layout: 'kpis-fila-dos-columnas' as const, titulo: 'x', kpis: [], razon: 'r' }
    expect(validarDecision(d, invConDosCifras).ok).toBe(false)
  })

  it('rechaza una sección declarada vacía (columnas: [])', () => {
    const d = { layout: 'texto-multicolumna' as const, titulo: 'x', columnas: [], razon: 'r' }
    expect(validarDecision(d, { titulo: 'x', piezas: [] }).ok).toBe(false)
  })

  it('rechaza cuerpo declarado vacío', () => {
    const d = { layout: 'portada' as const, titulo: 'x', cuerpo: [], razon: 'r' }
    expect(validarDecision(d, { titulo: 'x', piezas: [] }).ok).toBe(false)
  })

  it('acepta un layout no-KPI aunque el inventario tenga cifras (el check de cifras es solo para KPIs)', () => {
    const d = { layout: 'portada' as const, titulo: 'x', razon: 'r' }
    expect(validarDecision(d, invConDosCifras).ok).toBe(true)
  })

  it('el motivo de rechazo es un string no vacío', () => {
    const d = { layout: 'matriz-estados' as const, titulo: 'x', razon: 'r' }
    const v = validarDecision(d, invConDosCifras)
    if (!v.ok) expect(v.motivo.length).toBeGreaterThan(0)
  })

  it('acepta la cifra aunque la IA recorte o reescriba el rótulo — lo sagrado es el valor', () => {
    const d = { layout: 'kpis-fila-dos-columnas' as const, titulo: 'x',
      kpis: [
        { valor: '9.2', rotulo: 'Posición media' },      // el inventario decía "Posición"
        { valor: '29K', rotulo: 'Impresiones totales' }, // rótulo reescrito y valor en mayúscula
      ], razon: 'r' }
    expect(validarDecision(d, invConDosCifras).ok).toBe(true)
  })

  it('sigue rechazando cuando falta el VALOR de una cifra, no solo el rótulo', () => {
    const d = { layout: 'kpis-fila-dos-columnas' as const, titulo: 'x',
      kpis: [{ valor: '9.2', rotulo: 'Posición' }], razon: 'r' }  // falta el 29k
    expect(validarDecision(d, invConDosCifras).ok).toBe(false)
  })
})

describe('aLayoutSeguro', () => {
  const original: DecisionSlide = {
    layout: 'kpis-fila-dos-columnas',
    titulo: 'Reporte semanal',
    subtitulo: 'sub',
    kpis: [{ valor: '9.2', rotulo: 'Posición' }],
    razon: 'razón original',
  }

  it('conserva el título y el contenido de la decisión original', () => {
    const seguro = aLayoutSeguro(original, 'perdió una cifra del inventario')
    expect(seguro.titulo).toBe(original.titulo)
    expect(seguro.subtitulo).toBe(original.subtitulo)
    expect(seguro.kpis).toEqual(original.kpis)
  })

  it('conserva el layout original (el despachador cae al layout seguro solo cuando no está implementado)', () => {
    const seguro = aLayoutSeguro(original, 'motivo')
    expect(seguro.layout).toBe(original.layout)
  })

  it('dado un layout ya no-implementado, el resultado sigue sin estar implementado (Slide.tsx cae a LayoutSeguro sin más)', () => {
    const noImplementado: DecisionSlide = { layout: 'matriz-estados', titulo: 'x', razon: 'r' }
    const seguro = aLayoutSeguro(noImplementado, 'layout no implementado')
    expect(esLayoutImplementado(seguro.layout)).toBe(false)
  })

  it('dosifica el motivo de la degradación dentro de un campo de texto existente (razon)', () => {
    const seguro = aLayoutSeguro(original, 'perdió una cifra del inventario')
    expect(seguro.razon).toContain('perdió una cifra del inventario')
  })
})
