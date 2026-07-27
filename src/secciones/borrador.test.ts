import { describe, it, expect } from 'vitest'
import { aDecision, loQueFalta, soloCamposDelTipo, borradorTieneContenido, RAZON_MANUAL } from './borrador'
import type { BorradorSeccion } from './borrador'
import { CATALOGO } from './catalogo'

/**
 * El camino sin IA: una sección compuesta a mano tiene que llegar al documento
 * entera, sin pasar por ningún modelo y sin relajar una sola de las defensas
 * que protegen a la salida de la IA.
 */
describe('de borrador a sección presentable', () => {
  it('una sección manual no llama a nadie y sale lista', () => {
    const resultado = aDecision({
      layout: 'kpis-fila-dos-columnas',
      titulo: 'Performance del sitio',
      kpis: [{ valor: '79.8k', rotulo: 'Impresiones', delta: '-10%' }],
    })
    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.decision.kpis).toHaveLength(1)
      // La `razon` existe porque el contrato la exige, pero aquí no hay
      // decisión de IA que auditar: la tomó una persona.
      expect(resultado.decision.razon).toBe(RAZON_MANUAL)
    }
  })

  it('dice QUÉ falta, en lugar de rechazar sin más', () => {
    const sinTitulo = aDecision({ layout: 'kpis-fila-dos-columnas', kpis: [{ valor: '1', rotulo: 'x' }] })
    expect(sinTitulo).toEqual({ ok: false, motivo: 'Falta el título.' })

    const sinCifras = aDecision({ layout: 'kpis-fila-dos-columnas', titulo: 'Algo' })
    expect(sinCifras.ok).toBe(false)
    if (!sinCifras.ok) expect(sinCifras.motivo).toContain('al menos una cifra')
  })

  it('el editor manual NO relaja el contrato: sigue sin poder colar estilo', () => {
    // Es la misma superficie de entrada que la IA. Que escriba una persona no
    // es razón para dejar pasar markup a un documento que se publica.
    const conHtml = aDecision({
      layout: 'kpis-fila-dos-columnas',
      titulo: '<b>Performance</b>',
      kpis: [{ valor: '1', rotulo: 'x' }],
    })
    expect(conHtml.ok).toBe(false)
  })

  it('un enlace javascript: en una viñeta no llega al documento', () => {
    const resultado = aDecision({
      layout: 'texto-multicolumna',
      titulo: 'Frentes',
      columnas: [{ titulo: 'Uno', puntos: [{ texto: 'Ver', enlace: 'javascript:alert(1)' }] }],
    })
    expect(resultado.ok).toBe(false)
  })
})

describe('cambiar de tipo de sección', () => {
  const conTabla: BorradorSeccion = {
    layout: 'pendientes-semaforo',
    titulo: 'Pendientes',
    tablas: [{ columnas: ['a', 'b'], filas: [{ celdas: ['1', '2'] }] }],
  }

  it('lo que el tipo nuevo no admite no viaja al documento', () => {
    // Alguien llena una tabla, cambia a Portada y la tabla se queda escondida
    // en el estado del formulario. Sin esta limpieza aparecería en la portada.
    const comoPortada = soloCamposDelTipo({ ...conTabla, layout: 'portada' })
    expect(comoPortada.tablas).toBeUndefined()
    expect(comoPortada.titulo).toBe('Pendientes')
  })

  it('pero el borrador guardado NO se poda: cambiar de ida y vuelta no borra el trabajo', () => {
    // La poda ocurre al maquetar, no al guardar. `conTabla` sigue intacto.
    expect(conTabla.tablas).toHaveLength(1)
  })

  it('un arreglo vacío no cuenta como contenido', () => {
    expect(soloCamposDelTipo({ layout: 'texto-multicolumna', titulo: 'x', columnas: [] }).columnas).toBeUndefined()
  })
})

describe('cuándo una sección cuenta como empezada', () => {
  it('elegir el tipo no es haberla llenado', () => {
    expect(borradorTieneContenido({ layout: 'portada' })).toBe(false)
  })

  it('con un título ya cuenta', () => {
    expect(borradorTieneContenido({ layout: 'portada', titulo: 'Estatus mensual' })).toBe(true)
  })
})

describe('el catálogo cubre todos los tipos', () => {
  it('cada tipo declara para qué sirve y qué campos admite', () => {
    for (const tipo of CATALOGO) {
      expect(tipo.nombre.length, `${tipo.layout} sin nombre`).toBeGreaterThan(0)
      expect(tipo.paraQue.length, `${tipo.layout} sin "para qué"`).toBeGreaterThan(10)
      expect(tipo.campos.length, `${tipo.layout} sin campos`).toBeGreaterThan(0)
    }
  })

  it('el campo que un tipo exige es uno de los que admite', () => {
    for (const tipo of CATALOGO) {
      if (tipo.exige) {
        expect(tipo.campos, `${tipo.layout} exige un campo que no admite`).toContain(tipo.exige)
      }
    }
  })

  it('cada tipo se puede completar con lo que su formulario ofrece', () => {
    // Si un tipo exigiera algo que su formulario no pide, sería imposible
    // terminar esa sección a mano — y el editor dejaría de bastarse solo.
    for (const tipo of CATALOGO) {
      const faltas = loQueFalta({ layout: tipo.layout, titulo: 'x' })
      for (const falta of faltas) {
        expect(falta).not.toBe('el título')
      }
    }
  })
})

describe('el gráfico combo exige forma por serie', () => {
  it('una serie sin forma en un combo se dibuja como barra — por eso el editor la pide', () => {
    // Documenta el porqué de la regla del editor: en `combo-barras-lineas` el
    // tipo no decide nada, así que una serie sin `forma` cae en barra aunque
    // se hubiera puesto en el eje derecho esperando una línea.
    const resultado = aDecision({
      layout: 'grafico-y-tabla',
      titulo: 'Performance',
      graficos: [{
        tipo: 'combo-barras-lineas',
        periodos: ['Ene', 'Feb'],
        series: [{ etiqueta: 'CTR', valores: [0.9, 1.1], eje: 'derecho' }],
      }],
    })
    expect(resultado.ok).toBe(true)
    if (resultado.ok) expect(resultado.decision.graficos?.[0].series[0].forma).toBeUndefined()
  })
})
