import { describe, it, expect } from 'vitest'
import * as Q3 from './q3-2026'

/**
 * LAS CIFRAS DEL ESTATUS Q3 CUADRAN CONSIGO MISMAS.
 *
 * El borrador del equipo traía totales y porcentajes que no salían de sus
 * propias tablas. Estas pruebas fijan lo que sí cuadra: si alguien corrige una
 * celda y rompe su total, o reaparece un nombre mal escrito, falla aquí y no
 * delante de Ceci.
 */
describe('funnel de generación de demanda (tabla de César)', () => {
  it('cada etapa suma lo que dice el total del borrador', () => {
    expect(Q3.totalEtapa('Contactos')).toBe(29_337)
    expect(Q3.totalEtapa('MQL')).toBe(342)
    expect(Q3.totalEtapa('SQL')).toBe(95)
    expect(Q3.totalEtapa('Propuestas')).toBe(103)
    expect(Q3.totalEtapa('Ganados')).toBe(16)
  })

  it('las conversiones salen de la tabla, no del texto (1.76% era un error: da 1.17%)', () => {
    expect(Q3.tasa('Contactos', 'MQL')).toBeCloseTo(0.0117, 4)
    expect(Q3.tasa('MQL', 'SQL')).toBeCloseTo(0.2778, 4)
    expect(Q3.tasa('Propuestas', 'Ganados')).toBeCloseTo(0.1553, 4)
    // Ninguna conversión mostrada pasa de 100%.
    for (const c of Q3.CONVERSIONES) expect(Q3.tasa(c.de, c.a)).toBeLessThanOrEqual(1)
  })

  it('el cumplimiento de facturación se calcula contra su base: la meta externa de Q3 sin Zeus', () => {
    expect(Q3.META_FACTURADO_Q3).toBe(63_780_940)
    expect(Q3.cumplimientoFacturacion()).toBeCloseTo(0.0931, 4)
    const mexaYMu = Q3.FACTURADO_POR_UDN.reduce((n, f) => n + f.monto, 0)
    expect(mexaYMu / Q3.FACTURADO_Q3).toBeCloseTo(0.93, 2)
  })
})

describe('lo ganado y lo abierto (Orbit)', () => {
  it('las 16 propuestas ganadas son las del funnel, por empresa y por UDN', () => {
    expect(Q3.GANADAS).toHaveLength(Q3.totalEtapa('Ganados'))
    for (const udn of Q3.UDNS_FUNNEL) {
      expect(Q3.GANADAS.filter((g) => g.udn === udn)).toHaveLength(Q3.FUNNEL[udn].Ganados)
    }
    expect(Q3.totalGanado()).toBeCloseTo(5_493_955.44, 2)
    expect(Q3.empresasGanadas()).toBe(12)
  })

  it('el pipeline por etapa y por UDN cuadra con el encabezado de Orbit (salvo redondeo)', () => {
    expect(Q3.negociosAbiertos()).toBe(Q3.PIPELINE.negocios)
    expect(Q3.PIPELINE_UDN.reduce((n, f) => n + f.negocios, 0)).toBe(Q3.PIPELINE.negocios)
    const porEtapa = Q3.PIPELINE_ETAPAS.reduce((n, e) => n + e.monto, 0)
    const porUdn = Q3.PIPELINE_UDN.reduce((n, f) => n + f.monto, 0)
    expect(Math.abs(porEtapa - Q3.PIPELINE.total)).toBeLessThan(50_000)
    expect(Math.abs(porUdn - Q3.PIPELINE.total)).toBeLessThan(50_000)
  })
})

describe('PR, Kaitai y materiales', () => {
  it('las notas por UDN suman las 231 del encabezado', () => {
    expect(Q3.notasEnMedios()).toBe(231)
  })

  it('Kaitai: 28 personas en 25 marcas destacadas, más 37 de otras empresas, son 65', () => {
    const personas = Q3.KAITAI_SECTORES.map(Q3.personasDe)
    expect(personas).toEqual([12, 7, 6, 3])
    expect(Q3.marcasDestacadas()).toBe(25)
    expect(Q3.ejecutivosConfirmados()).toBe(65)
  })

  it('la matriz de materiales es de 7 × 7 y cada estado cuenta lo que pinta el borrador', () => {
    expect(Q3.MATERIALES).toHaveLength(7)
    for (const f of Q3.MATERIALES) expect(f.estados).toHaveLength(Q3.COLUMNAS_MATERIALES.length)
    expect(Q3.cuentaMateriales('hecho')).toBe(16)
    expect(Q3.cuentaMateriales('modificacion')).toBe(9)
    expect(Q3.cuentaMateriales('aprobacion')).toBe(12)
    expect(Q3.cuentaMateriales('elaborar')).toBe(10)
  })
})

describe('presencia digital (cifras de cada dueño)', () => {
  it('las tablas suman lo que dicen sus insights', () => {
    expect(Q3.suma(Q3.PAID, (f) => f.mql)).toBe(214)
    expect(Q3.suma(Q3.PAID, (f) => f.sql)).toBe(121)
    expect(Q3.suma(Q3.PAID, (f) => f.pipeline) / 1e6).toBeCloseTo(26.31, 2)
    expect(Q3.suma(Q3.PAID, (f) => f.facturado) / 1e6).toBeCloseTo(6.14, 2)
    expect(Q3.suma(Q3.WEB, (f) => f.visitas)).toBe(42_375)
    expect(Q3.suma(Q3.WEB, (f) => f.mql)).toBe(54)
    expect(Q3.suma(Q3.WEB, (f) => f.sql)).toBe(25)
    expect(Q3.suma(Q3.WEB, (f) => f.pipeline) / 1e6).toBeCloseTo(24.21, 2)
  })
})

describe('nombres', () => {
  it('ningún texto escribe mal una empresa del grupo ni nombra a Zeus', () => {
    const todo = JSON.stringify(Q3)
    expect(todo).not.toMatch(/Neracode|ResearchLand|House Of Films|Mexa creativa|Zeus/)
  })
})
