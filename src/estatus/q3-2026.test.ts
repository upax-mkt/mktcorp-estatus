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
  it('las siete empresas suman lo que dictó el equipo el 2-oct, y el total de Orbit incluye a las otras unidades', () => {
    expect(Q3.totalEtapa('Contactos')).toBe(29_337)
    expect(Q3.totalEtapa('MQL')).toBe(351)
    expect(Q3.totalEtapa('SQL')).toBe(98)
    expect(Q3.totalEtapa('Propuestas')).toBe(103)
    expect(Q3.totalEtapa('Ganados')).toBe(16)
    // Lo que Orbit suma de más son las unidades que la tabla no desglosa.
    expect(Q3.DEMANDA_Q3.MQL - Q3.totalEtapa('MQL')).toBe(10)
    expect(Q3.DEMANDA_Q3.SQL - Q3.totalEtapa('SQL')).toBe(16)
    expect(Q3.DEMANDA_Q3.Propuestas - Q3.totalEtapa('Propuestas')).toBe(3)
    expect(Q3.DEMANDA_Q3.Ganados).toBe(Q3.totalEtapa('Ganados'))
  })

  it('las tres tasas reales salen de los totales y se comparan con la ideal: 31.6%, 93.0% y 15.1%', () => {
    const [mqlSql, sqlProp, propGan] = Q3.CONVERSION_Q3
    expect(mqlSql.real).toBeCloseTo(0.3158, 4)
    expect(sqlProp.real).toBeCloseTo(0.9298, 4)
    expect(propGan.real).toBeCloseTo(0.1509, 4)
    expect(Q3.CONVERSION_Q3.map((c) => c.ideal)).toEqual([0.3, 0.8, 0.2])
    // Ninguna conversión mostrada pasa de 100%.
    for (const c of Q3.CONVERSION_Q3) expect(c.real).toBeLessThanOrEqual(1)
  })

  it('el desglose de facturación suma lo facturado y permite calcular su concentración', () => {
    const porUdn = Q3.FACTURADO_POR_UDN.reduce((n, f) => n + f.monto, 0)
    expect(Math.abs(porUdn - Q3.FACTURADO_Q3)).toBeLessThan(5_000)
    const mexaYMu = Q3.FACTURADO_POR_UDN.filter((f) => ['Mexa Creativa', 'Marketing United'].includes(f.udn)).reduce((n, f) => n + f.monto, 0)
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

  it('la venta generada no cuenta dos veces lo que está en los dos cortes: $10.49 M en 24 negocios', () => {
    // Ocho de los 16 ganados siguen por facturar; de los otros ocho, seis se facturaron dentro de Q3.
    expect(Q3.ganadoPorFacturar()).toHaveLength(8)
    expect(Q3.montoPorFacturar()).toBeCloseTo(4_489_654.4, 1)
    const enAmbos = Q3.GANADAS.filter((g) => g.etapa === 'Facturado' && g.empresa !== 'Häfele México').reduce((n, g) => n + g.valor, 0) + 279_978
    expect(enAmbos).toBeCloseTo(Q3.TRASLAPE_VENTA.monto, 1)
    expect(Q3.ventaGenerada() / 1e6).toBeCloseTo(10.49, 2)
    expect(Q3.negociosVenta()).toBe(24)
  })

  it('el pipeline por etapa y por UDN cuadra con el encabezado de Orbit (salvo redondeo)', () => {
    expect(Q3.PIPELINE).toEqual({ total: 71_550_000, negocios: 132, ticketPromedio: 542_050 })
    expect(Q3.negociosAbiertos()).toBe(Q3.PIPELINE.negocios)
    // Las siete empresas más la unidad que no se desglosa dan el total de Orbit.
    expect(Q3.PIPELINE_UDN.reduce((n, f) => n + f.negocios, 0) + Q3.PIPELINE_OTRAS.negocios).toBe(Q3.PIPELINE.negocios)
    const porEtapa = Q3.PIPELINE_ETAPAS.reduce((n, e) => n + e.monto, 0)
    const porUdn = Q3.PIPELINE_UDN.reduce((n, f) => n + f.monto, 0) + Q3.PIPELINE_OTRAS.monto
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
    expect(Q3.suma(Q3.PAID, (f) => f.mql)).toBe(228)
    expect(Q3.suma(Q3.PAID, (f) => f.sql)).toBe(35)
    // Las siete empresas suman $28.37 M; el total del canal en Orbit ($29.53 M) incluye a otra unidad.
    expect(Q3.suma(Q3.PAID, (f) => f.pipeline) / 1e6).toBeCloseTo(28.365, 3)
    expect((Q3.PAID_PIPELINE_TOTAL - Q3.suma(Q3.PAID, (f) => f.pipeline)) / 1e6).toBeCloseTo(1.165, 3)
    expect(Q3.suma(Q3.PAID, (f) => f.facturado) / 1e6).toBeCloseTo(5.57, 2)
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

describe('las lecturas que concluye cada lámina', () => {
  it('lo ganado por empresa: Marketing United se lleva $3.21 M en 10 negocios', () => {
    const [primera] = Q3.ganadoPorUdn()
    expect(primera.udn).toBe('Marketing United')
    expect(primera.negocios).toBe(10)
    expect(primera.monto).toBeCloseTo(3_209_885.44, 2)
  })

  it('81% del pipeline abierto ya está en Evaluando; las tres empresas por sembrar suman 16%; 92% de las notas fueron de Research Land', () => {
    expect(Q3.parteEvaluando()).toBeCloseTo(0.806, 3)
    expect(Q3.pipelinePorSembrar() / Q3.PIPELINE.total).toBeCloseTo(0.157, 3)
    expect(Q3.parteNotasRL()).toBeCloseTo(0.918, 3)
    expect(Q3.notasSinRL()).toHaveLength(6)
    expect(Q3.notasRL() + Q3.notasSinRL().reduce((n, f) => n + f.notas, 0)).toBe(Q3.notasEnMedios())
  })

  it('paid: $1,221 por MQL en promedio (la misma inversión entre más MQL); web: 785 visitas por MQL reportado', () => {
    expect(Q3.costoPromedioMqlPaid()).toBeCloseTo(1220.8, 1)
    // Promo Espacio sigue con el menor costo por MQL.
    const costos = Q3.PAID.map((p) => ({ udn: p.udn, costo: Q3.costoMql(p) })).filter((c) => c.costo !== null).sort((a, b) => (a.costo ?? 0) - (b.costo ?? 0))
    expect(costos[0].udn).toBe('Promo Espacio')
    expect(Q3.visitasPorMql()).toBeCloseTo(784.7, 1)
    expect(Q3.sitiosPrimeraPagina()).toBe(4)
  })

  it('materiales listos por empresa suman los 16 hechos; Research Land tiene 6 de 7', () => {
    const porUdn = Q3.materialesListosPorUdn()
    expect(porUdn.reduce((n, f) => n + f.listos, 0)).toBe(16)
    expect(porUdn.find((f) => f.udn === 'Research Land')).toEqual({ udn: 'Research Land', listos: 6, total: 7 })
    expect(Q3.accionesRoadmap()).toBe(23)
  })
})
