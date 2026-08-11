import { describe, expect, it } from 'vitest'
import {
  DISCIPLINAS,
  agruparPorDisciplina,
  nombreDeDisciplina,
  resumirBenchmark,
  type Benchmark,
} from './benchmark'
import { benchmarkIncrustado } from '@/datos/benchmark'
import { DISCIPLINAS as DISCIPLINAS_DB } from '@/db/evidencia'

/**
 * EL REPARTO POR DISCIPLINA es la estructura de la pantalla entera: si una
 * etiqueta no encuentra su bloque, ese dato desaparece de la página sin
 * error y sin hueco. Estas pruebas cubren justo eso.
 */

function base(): Benchmark {
  const cinco = (n: string) => ({
    nombre: n,
    fortaleza: 'x',
    amenaza: 'media' as const,
    nosGanaEn: 'x',
    dondeSeLeGana: 'x',
  })
  return {
    salaSlug: 'sala',
    competidores: [cinco('A'), cinco('B'), cinco('C'), cinco('D'), cinco('E')],
    matriz: [],
    lectura: '',
    actualizado: '2026-06-30',
  }
}

describe('agruparPorDisciplina', () => {
  it('devuelve las seis, en el orden de DISCIPLINAS', () => {
    const bloques = agruparPorDisciplina(base())
    expect(bloques.map((b) => b.id)).toEqual(DISCIPLINAS.map((d) => d.id))
  })

  it('manda cada gráfico y cada fila a su bloque, y solo a ese', () => {
    const b = base()
    b.graficos = [
      { bloque: 'web', grafico: { tipo: 'barras', titulo: 'SEO', periodos: ['a'], series: [] } },
      { bloque: 'rrss', grafico: { tipo: 'barras', titulo: 'RRSS', periodos: ['a'], series: [] } },
    ]
    b.comparativa = {
      titulo: 't',
      filas: [
        { criterio: 'Visitas', udn: '1', valores: ['', '', '', '', ''], bloque: 'web' },
        { criterio: 'WhatsApp', udn: 'No', valores: ['', '', '', '', ''], bloque: 'comercial' },
      ],
    }
    const bloques = agruparPorDisciplina(b)
    const porId = Object.fromEntries(bloques.map((x) => [x.id, x]))
    expect(porId.web.graficos.map((g) => g.grafico.titulo)).toEqual(['SEO'])
    expect(porId.web.filas.map((f) => f.criterio)).toEqual(['Visitas'])
    expect(porId.comercial.filas.map((f) => f.criterio)).toEqual(['WhatsApp'])
    expect(porId.paid.graficos).toEqual([])
    expect(porId.paid.filas).toEqual([])
  })

  /**
   * Lo que hace cada competidor en una disciplina sigue siendo un hecho SOBRE
   * el competidor —vive en su ficha—; lo que cambia es dónde se pinta. Este
   * es el reparto que lo hace posible.
   */
  it('saca de cada competidor el campo que responde a esa disciplina', () => {
    const b = base()
    b.competidores[0].paid = 'Pauta poco'
    b.competidores[0].inbound = 'No publica'
    b.competidores[0].institucional = 'Sin certificaciones'
    b.competidores[0].medicion = 'Data propia'
    const porId = Object.fromEntries(agruparPorDisciplina(b).map((x) => [x.id, x]))
    expect(porId.paid.porCompetidor).toEqual([{ nombre: 'A', amenaza: 'media', que: 'Pauta poco' }])
    expect(porId.rrss.porCompetidor[0].que).toBe('No publica')
    expect(porId.pr.porCompetidor[0].que).toBe('Sin certificaciones')
    expect(porId.portafolio.porCompetidor[0].que).toBe('Data propia')
  })

  it('omite al competidor que no tiene nada escrito en esa disciplina', () => {
    const b = base()
    b.competidores[0].paid = 'Pauta'
    b.competidores[3].paid = 'También pauta'
    const paid = agruparPorDisciplina(b).find((x) => x.id === 'paid')!
    expect(paid.porCompetidor.map((x) => x.nombre)).toEqual(['A', 'D'])
  })

  it('marca sin datos el bloque que no tiene gráfico, ni fila, ni competidor', () => {
    const bloques = agruparPorDisciplina(base())
    expect(bloques.every((x) => x.tieneDatos)).toBe(false)
    expect(bloques.find((x) => x.id === 'paid')!.tieneDatos).toBe(false)
  })

  it('trae el veredicto y la marca de ventana del análisis', () => {
    const b = base()
    b.disciplinas = [{ id: 'paid', veredicto: 'Nadie usa landing', ventana: true }]
    const porId = Object.fromEntries(agruparPorDisciplina(b).map((x) => [x.id, x]))
    expect(porId.paid.veredicto).toBe('Nadie usa landing')
    expect(porId.paid.ventana).toBe(true)
    expect(porId.web.veredicto).toBeNull()
    expect(porId.web.ventana).toBe(false)
  })
})

/**
 * UNA SOLA LISTA DE DISCIPLINAS. La capa de datos clasifica la evidencia que
 * se sube con el mismo `bloque` que la página dibuja: si se declararan dos
 * listas y una se quedara atrás, una pieza subida iría a parar a un bloque
 * inexistente — invisible, sin error y sin forma de darse cuenta.
 */
it('la lista de disciplinas de la capa de datos es la misma del dominio', () => {
  expect(DISCIPLINAS_DB).toBe(DISCIPLINAS)
})

it('nombreDeDisciplina cae al propio id si no lo conoce', () => {
  expect(nombreDeDisciplina('paid')).toBe('Paid media')
  expect(nombreDeDisciplina('inventado')).toBe('inventado')
})

/**
 * EL BENCHMARK REAL DE PROMO ESPACIO, contra su propia estructura. No
 * comprueba cifras —esas salen del análisis y cambian cuando llegue el
 * siguiente— sino que nada se quede fuera de la página por una etiqueta que
 * falta o está mal escrita.
 */
describe('el benchmark cargado de Promo Espacio', () => {
  const pe = benchmarkIncrustado('promo-espacio')!

  it('etiqueta TODOS sus gráficos y TODAS sus filas con una disciplina real', () => {
    const ids = DISCIPLINAS.map((d) => d.id) as string[]
    for (const g of pe.graficos ?? []) {
      expect(ids, `gráfico «${g.grafico.titulo}» sin disciplina válida`).toContain(g.bloque)
    }
    for (const f of pe.comparativa?.filas ?? []) {
      expect(ids, `fila «${f.criterio}» sin disciplina válida`).toContain(f.bloque)
    }
  })

  it('no deja ningún gráfico ni fila huérfanos al repartir', () => {
    const bloques = agruparPorDisciplina(pe)
    const graficos = bloques.reduce((n, b) => n + b.graficos.length, 0)
    const filas = bloques.reduce((n, b) => n + b.filas.length, 0)
    expect(graficos).toBe(pe.graficos?.length ?? 0)
    expect(filas).toBe(pe.comparativa?.filas.length ?? 0)
  })

  /**
   * El indicador de cabecera decía "3 · variables donde es la única líder" y
   * la matriz lo desmentía: en indoor y en flexibilidad comercial IMJ Media
   * también lidera. Esta prueba impide que vuelvan a separarse.
   */
  it('el recuento de la cabecera concuerda con la matriz', () => {
    const resumen = resumirBenchmark(pe)
    expect(resumen.unicaLider).toEqual(['Cercanía a punto de consumo'])
    expect(pe.indicadores?.[0].valor).toBe(`${resumen.lider} de ${resumen.total}`)
  })
})
