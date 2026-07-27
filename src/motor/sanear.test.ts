import { describe, it, expect } from 'vitest'
import { sanearDecision, completarKpisFaltantes } from './sanear'
import type { DecisionSlide } from '@/decision/esquema'
import type { Inventario } from './inventario'

function inventarioCon(cifras: Array<[string, string, string?]>): Inventario {
  return {
    titulo: 'Performance del sitio web',
    piezas: cifras.map(([valor, rotulo, delta]) => ({
      tipo: 'cifra' as const,
      valor,
      rotulo,
      ...(delta ? { delta } : {}),
    })),
  }
}

const CUATRO_CIFRAS = inventarioCon([
  ['29k', 'Impresiones', '-16%'],
  ['9.2', 'Posicion media', '+0.3'],
  ['412', 'Clics', '-8%'],
  ['12%', 'Leads calificados', '+12%'],
])

describe('completarKpisFaltantes', () => {
  it('repone las cifras que la IA dejó fuera, con su rótulo y su delta', () => {
    // El caso real visto en producción: de 4 cifras solo llegó una.
    const parcial: DecisionSlide = {
      layout: 'kpis-fila-dos-columnas',
      titulo: 'El tráfico cae, pero la calidad del lead mejora',
      kpis: [{ valor: '29k', rotulo: 'Impresiones', delta: '-16%' }],
      razon: 'destaca la caída de impresiones',
    }
    const completa = completarKpisFaltantes(parcial, CUATRO_CIFRAS)
    expect(completa.kpis).toEqual([
      { valor: '29k', rotulo: 'Impresiones', delta: '-16%' },
      { valor: '9.2', rotulo: 'Posicion media', delta: '+0.3' },
      { valor: '412', rotulo: 'Clics', delta: '-8%' },
      { valor: '12%', rotulo: 'Leads calificados', delta: '+12%' },
    ])
  })

  it('conserva el reparto de la IA cuando ya está completo', () => {
    const completa: DecisionSlide = {
      layout: 'kpis-fila-dos-columnas',
      titulo: 'Todo cubierto',
      kpis: [
        { valor: '29k', rotulo: 'Impresiones' },
        { valor: '9.2', rotulo: 'Posicion media' },
        { valor: '412', rotulo: 'Clics' },
        { valor: '12%', rotulo: 'Leads calificados' },
      ],
      razon: 'las cuatro',
    }
    expect(completarKpisFaltantes(completa, CUATRO_CIFRAS)).toEqual(completa)
  })

  it('no toca layouts que no son de KPIs', () => {
    const portada: DecisionSlide = { layout: 'portada', titulo: 'Estatus', razon: 'portada' }
    expect(completarKpisFaltantes(portada, CUATRO_CIFRAS)).toEqual(portada)
  })

  it('no pasa de cuatro KPIs aunque el inventario traiga más', () => {
    const cinco = inventarioCon([
      ['29k', 'Impresiones'], ['9.2', 'Posicion'], ['412', 'Clics'],
      ['12%', 'Leads'], ['3.1', 'Conversion'],
    ])
    const parcial: DecisionSlide = {
      layout: 'kpis-fila-dos-columnas', titulo: 'x',
      kpis: [{ valor: '29k', rotulo: 'Impresiones' }], razon: 'y',
    }
    expect(completarKpisFaltantes(parcial, cinco).kpis).toHaveLength(4)
  })

  it('no repone una cifra que la IA ya mencionó en el texto del slide', () => {
    // Si el dato está en una viñeta, no se perdió: duplicarlo como KPI sería ruido.
    const conTexto: DecisionSlide = {
      layout: 'kpis-fila-dos-columnas',
      titulo: 'x',
      kpis: [{ valor: '29k', rotulo: 'Impresiones' }],
      columnas: [{ titulo: 'Hallazgos', puntos: ['La posicion media subio a 9.2 este mes'] }],
      razon: 'y',
    }
    const valores = completarKpisFaltantes(conTexto, CUATRO_CIFRAS).kpis?.map((k) => k.valor)
    expect(valores).not.toContain('9.2')
    expect(valores).toContain('412')
  })

  it('arranca los KPIs si la IA no puso ninguno', () => {
    const sinKpis: DecisionSlide = {
      layout: 'kpis-fila-dos-columnas', titulo: 'x', razon: 'y',
    }
    expect(completarKpisFaltantes(sinKpis, CUATRO_CIFRAS).kpis).toHaveLength(4)
  })

  it('no inventa nada cuando el inventario no trae cifras', () => {
    const sinCifras: Inventario = { titulo: 'x', piezas: [{ tipo: 'parrafo', texto: 'solo texto' }] }
    const d: DecisionSlide = { layout: 'kpis-fila-dos-columnas', titulo: 'x', razon: 'y' }
    expect(completarKpisFaltantes(d, sinCifras)).toEqual(d)
  })
})

function decisionCon(kpis: DecisionSlide['kpis']): DecisionSlide {
  return {
    layout: 'kpis-fila-dos-columnas',
    titulo: 'El tráfico cae, pero no por deterioro',
    kpis,
    razon: 'porque sí',
  }
}

describe('sanearDecision', () => {
  it('separa el delta que la IA coló dentro del rótulo', () => {
    // Artefacto visto en producción: el modelo serializó mal el objeto y metió
    // el par delta dentro de la cadena del rótulo.
    const sucia = decisionCon([{ valor: '29k', rotulo: "Impresiones','delta':'-16%" }])
    const limpia = sanearDecision(sucia)
    expect(limpia.kpis).toEqual([{ valor: '29k', rotulo: 'Impresiones', delta: '-16%' }])
  })

  it('reconoce las otras formas en que se cuela el campo', () => {
    const variantes = [
      'Impresiones", "delta": "-16%"',
      'Impresiones, delta: -16%',
      'Impresiones delta=-16%',
    ]
    for (const rotulo of variantes) {
      const limpia = sanearDecision(decisionCon([{ valor: '29k', rotulo }]))
      expect(limpia.kpis?.[0].rotulo).toBe('Impresiones')
      expect(limpia.kpis?.[0].delta).toBe('-16%')
    }
  })

  it('respeta un delta que ya venía bien puesto', () => {
    const buena = decisionCon([{ valor: '29k', rotulo: 'Impresiones', delta: '-16%' }])
    expect(sanearDecision(buena)).toEqual(buena)
  })

  it('no pisa el delta legítimo si además venía basura en el rótulo', () => {
    const mezcla = decisionCon([{ valor: '29k', rotulo: "Impresiones','delta':'-99%", delta: '-16%' }])
    const limpia = sanearDecision(mezcla)
    expect(limpia.kpis?.[0].rotulo).toBe('Impresiones')
    expect(limpia.kpis?.[0].delta).toBe('-16%')
  })

  it('deja en paz un rótulo que solo menciona una variación entre paréntesis', () => {
    // Esto es redacción legítima, no un campo fugado: no se toca.
    const legitima = decisionCon([{ valor: '29k', rotulo: 'Impresiones (vs. mayo)' }])
    expect(sanearDecision(legitima)).toEqual(legitima)
  })

  it('deja en paz un rótulo que usa la palabra delta como texto', () => {
    const legitima = decisionCon([{ valor: '29k', rotulo: 'Delta contra el trimestre' }])
    expect(sanearDecision(legitima)).toEqual(legitima)
  })

  it('limpia comillas y comas colgantes que quedan al final de un rótulo', () => {
    const sucia = decisionCon([{ valor: '29k', rotulo: "Impresiones'," }])
    expect(sanearDecision(sucia).kpis?.[0].rotulo).toBe('Impresiones')
  })

  it('no altera una decisión sin KPIs', () => {
    const sinKpis: DecisionSlide = { layout: 'portada', titulo: 'Estatus', razon: 'portada' }
    expect(sanearDecision(sinKpis)).toEqual(sinKpis)
  })

  it('rellena la razón cuando el modelo la devuelve en blanco', () => {
    // Visto en produccion: razon vacia tumbaba el parseo y con el todo el
    // slide. Ahora se marca y el contenido se conserva.
    const sinRazon: DecisionSlide = { layout: 'portada', titulo: 'Estatus', razon: '' }
    expect(sanearDecision(sinRazon).razon).toBe('El modelo no explicó esta decisión.')

    const soloEspacios: DecisionSlide = { layout: 'portada', titulo: 'Estatus', razon: '   ' }
    expect(sanearDecision(soloEspacios).razon).toBe('El modelo no explicó esta decisión.')
  })

  it('respeta la razón cuando el modelo sí se explicó', () => {
    const conRazon: DecisionSlide = { layout: 'portada', titulo: 'Estatus', razon: 'abre la sesión' }
    expect(sanearDecision(conRazon).razon).toBe('abre la sesión')
  })

  it('descarta un delta fugado que quedaría vacío', () => {
    const sucia = decisionCon([{ valor: '29k', rotulo: "Impresiones','delta':''" }])
    const limpia = sanearDecision(sucia)
    expect(limpia.kpis?.[0].rotulo).toBe('Impresiones')
    expect(limpia.kpis?.[0].delta).toBeUndefined()
  })
})
