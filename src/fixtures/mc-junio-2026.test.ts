import { describe, it, expect } from 'vitest'
import { MC_JUNIO_2026 } from './mc-junio-2026'
import { esDecisionValida, parsearDecision } from '@/decision/esquema'
import { esLayoutImplementado } from '@/motor/catalogo'

/**
 * El criterio de aceptación de la Fase 2: el estatus real de Mexa Creativa
 * (junio 2026), entero, dibujado por la app.
 *
 * Estos tests no comprueban que se vea bonito —eso se mira— sino que NO FALTE
 * NADA: que cada pieza del deck original tenga su sitio en el contrato y que
 * ninguna se haya quedado fuera al transcribirla.
 */
describe('el estatus de Mexa Creativa cabe entero en la app', () => {
  it('todas las secciones pasan el contrato', () => {
    for (const [i, decision] of MC_JUNIO_2026.entries()) {
      expect(esDecisionValida(decision), `sección ${i + 1} (${decision.layout}) no valida`).toBe(true)
      expect(() => parsearDecision(decision)).not.toThrow()
    }
  })

  it('todos sus layouts se dibujan de verdad', () => {
    for (const decision of MC_JUNIO_2026) {
      expect(esLayoutImplementado(decision.layout), `"${decision.layout}" no tiene dibujo`).toBe(true)
    }
  })

  it('usa los seis layouts que antes eran nombres muertos', () => {
    // Si esta prueba deja de pasar es que se perdió una página por el camino.
    const usados = new Set(MC_JUNIO_2026.map((d) => d.layout))
    for (const layout of ['pendientes-semaforo', 'tarjetas-numeradas', 'grafico-y-tabla', 'meta-real-porcentaje', 'matriz-estados', 'texto-multicolumna']) {
      // matriz-estados viaja dentro de la sección de focos, no como layout suelto.
      if (layout === 'matriz-estados') continue
      expect(usados, `falta una sección con layout "${layout}"`).toContain(layout)
    }
  })

  it('no pierde ninguna de las piezas que el deck real trae', () => {
    const todas = MC_JUNIO_2026
    const tablas = todas.flatMap((d) => d.tablas ?? [])
    const graficos = todas.flatMap((d) => d.graficos ?? [])

    // Tres tablas de datos + la de pendientes.
    expect(tablas.length).toBeGreaterThanOrEqual(4)
    // Combo con meta, barras horizontales agrupadas y líneas de doble eje.
    expect(graficos.length).toBeGreaterThanOrEqual(3)
    expect(todas.some((d) => d.matriz)).toBe(true)
    expect(todas.some((d) => d.metaReal)).toBe(true)
    expect(todas.some((d) => d.bloques && d.bloques.length === 5)).toBe(true)
    expect(todas.filter((d) => d.notaPie).length).toBeGreaterThanOrEqual(3)
  })

  it('el pipeline conserva sus seis cifras con su desglose', () => {
    const pipeline = MC_JUNIO_2026.find((d) => d.cifrasDesglosadas)
    expect(pipeline?.cifrasDesglosadas).toHaveLength(6)
    const generado = pipeline?.cifrasDesglosadas?.find((c) => c.rotulo.includes('generado'))
    expect(generado?.valor).toBe('$39.4 MDP')
    expect(generado?.partes?.map((p) => p.valor)).toEqual(['$36.1 MDP', '$3.4 MDP'])
  })

  it('los pendientes sin estatus en el original se quedan SIN estado, no con uno inventado', () => {
    const pendientes = MC_JUNIO_2026.find((d) => d.layout === 'pendientes-semaforo')
    const filas = pendientes?.tablas?.[0].filas ?? []
    expect(filas.filter((f) => f.estado === 'listo')).toHaveLength(2)
    expect(filas.filter((f) => f.estado === undefined).length).toBeGreaterThan(0)
  })

  it('la jerarquía de las herramientas comerciales llega a los dos niveles', () => {
    const herramientas = MC_JUNIO_2026.find((d) => d.titulo === 'Herramientas comerciales')
    const conHijos = herramientas?.columnas?.[0].puntos.filter((p) => p.hijos) ?? []
    expect(conHijos).toHaveLength(2)
    expect(conHijos[0].hijos).toHaveLength(4)
  })
})
