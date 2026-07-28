import { describe, it, expect } from 'vitest'
import { maquetarBorrador } from '@/motor/maquetar'
import { estadoDeSeccion, type BorradorSeccion } from './borrador'

/**
 * LO QUE EL EDITOR DEJA ARMAR Y EL ESQUEMA RECHAZA.
 *
 * Franco: "detecté problemas cuando se configuran algunos elementos y
 * componentes tiran error en la maquetación".
 *
 * Aquí está el porqué. El esquema pone topes —4 cifras, 4 columnas, 2
 * gráficos, 3 tablas, 6 columnas por tabla— y el editor no ponía ninguno: los
 * botones de "añadir" seguían añadiendo. Se descubre al maquetar, después de
 * escribirlo todo, y el aviso que salía era el de Zod en inglés.
 *
 * Los topes viven en `LIMITES` (src/decision/esquema.ts) y los leen los dos
 * lados. Estos tests fijan el contrato: pasarse degrada, y el motivo dice el
 * número.
 */

const BASE = { layout: 'kpis-fila-dos-columnas' as const, titulo: 'Un título' }

function cifras(n: number) {
  return Array.from({ length: n }, (_, i) => ({ valor: `${i + 1}k`, rotulo: `Cifra ${i + 1}` }))
}

function columnas(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    titulo: `Columna ${i + 1}`,
    puntos: [{ texto: 'Una línea' }],
  }))
}

describe('pasarse de los topes del esquema', () => {
  it('una quinta cifra tumba la sección entera', () => {
    const r = maquetarBorrador({ ...BASE, kpis: cifras(5) }, 'Sección')
    expect(r.degradado).toBe(true)
  })

  it('cuatro cifras, que es el tope, pasan', () => {
    const r = maquetarBorrador({ ...BASE, kpis: cifras(4) }, 'Sección')
    expect(r.degradado, r.motivo).toBe(false)
  })

  it('una quinta columna tumba la sección', () => {
    const r = maquetarBorrador(
      { layout: 'texto-multicolumna', titulo: 'T', columnas: columnas(5) } as BorradorSeccion,
      'Sección',
    )
    expect(r.degradado).toBe(true)
  })

  it('una séptima columna de tabla tumba la sección', () => {
    const r = maquetarBorrador(
      {
        layout: 'pendientes-semaforo',
        titulo: 'T',
        tablas: [{
          columnas: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
          filas: [{ celdas: ['1', '2', '3', '4', '5', '6', '7'] }],
        }],
      } as BorradorSeccion,
      'Sección',
    )
    expect(r.degradado).toBe(true)
  })
})

describe('campos obligatorios que el editor deja vacíos', () => {
  it('una columna SIN puntos tumba la sección', () => {
    // El editor deja añadir una columna y dejarla sin líneas. El esquema
    // exige al menos una.
    const r = maquetarBorrador(
      { layout: 'texto-multicolumna', titulo: 'T', columnas: [{ titulo: 'Hallazgos', puntos: [] }] } as BorradorSeccion,
      'Sección',
    )
    expect(r.degradado).toBe(true)
  })

  it('una cifra sin valor tumba la sección', () => {
    const r = maquetarBorrador({ ...BASE, kpis: [{ valor: '', rotulo: 'Impresiones' }] }, 'Sección')
    expect(r.degradado).toBe(true)
  })

  it('un gráfico sin periodos tumba la sección', () => {
    // Pasa al vaciar la fila de encabezados de la rejilla: `construirGrafico`
    // filtra las vacías y `periodos` se queda en [].
    const r = maquetarBorrador(
      {
        layout: 'grafico-y-tabla',
        titulo: 'T',
        graficos: [{ tipo: 'barras', periodos: [], series: [{ etiqueta: 'S', valores: [] }] }],
      } as BorradorSeccion,
      'Sección',
    )
    expect(r.degradado).toBe(true)
  })
})

describe('el motivo que se le enseña a quien escribió la sección', () => {
  it('está en español y dice qué campo y qué tope', () => {
    const r = maquetarBorrador({ ...BASE, kpis: cifras(5) }, 'Sección')
    expect(r.motivo).toMatch(/cifras|Cifras/)
    expect(r.motivo).toMatch(/4/)
    // Nada de "Too big: expected array to have <=4 items".
    expect(r.motivo).not.toMatch(/Too big|expected|array/i)
  })

  it('una columna sin puntos se explica, no se numera', () => {
    const r = maquetarBorrador(
      { layout: 'texto-multicolumna', titulo: 'T', columnas: [{ titulo: 'Hallazgos', puntos: [] }] } as BorradorSeccion,
      'Sección',
    )
    expect(r.motivo).not.toMatch(/Too small|expected|array/i)
    expect(r.motivo).toMatch(/línea|linea|punto/i)
  })
})

describe('la frase que sale, entera y bien escrita', () => {
  // No es cosmética: "Falta las líneas de la columnas 1" se lee como un fallo
  // del sistema, no como una instrucción, y enseña a ignorar el aviso
  // siguiente. Se fijan los diez casos que se pueden armar desde el editor.
  const casos: Array<[string, BorradorSeccion, string]> = [
    ['cinco cifras', { ...BASE, kpis: cifras(5) }, 'No caben más de 4 cifras en una sección.'],
    ['cuatro tablas', {
      layout: 'grafico-y-tabla', titulo: 'T',
      tablas: Array.from({ length: 4 }, () => ({ columnas: ['a', 'b'], filas: [{ celdas: ['1', '2'] }] })),
    } as BorradorSeccion, 'No caben más de 3 tablas en una sección.'],
    ['siete columnas de tabla', {
      layout: 'pendientes-semaforo', titulo: 'T',
      tablas: [{ columnas: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], filas: [{ celdas: ['1', '2', '3', '4', '5', '6', '7'] }] }],
    } as BorradorSeccion, 'No caben más de 6 columnas en la tabla 1.'],
    ['columna sin líneas', {
      layout: 'texto-multicolumna', titulo: 'T', columnas: [{ titulo: 'Hallazgos', puntos: [] }],
    } as BorradorSeccion, 'Faltan las líneas de la columna 1.'],
    ['cifra sin valor', { ...BASE, kpis: [{ valor: '', rotulo: 'Impresiones' }] }, 'Falta el valor de la cifra 1.'],
    ['gráfico sin periodos', {
      layout: 'grafico-y-tabla', titulo: 'T',
      graficos: [{ tipo: 'barras', periodos: [], series: [{ etiqueta: 'S', valores: [] }] }],
    } as BorradorSeccion, 'Faltan los periodos del gráfico 1.'],
    ['bloque sin título', {
      layout: 'tarjetas-numeradas', titulo: 'T', bloques: [{ titulo: '' }],
    } as BorradorSeccion, 'Falta el título del bloque 1.'],
    ['matriz de una columna', {
      layout: 'matriz-estados', titulo: 'T',
      matriz: { columnas: ['Julio'], filas: [{ encabezado: 'Retail', celdas: [{ texto: 'Vende' }] }] },
    } as BorradorSeccion, 'La matriz necesita al menos 2 columnas.'],
  ]

  it.each(casos)('%s', (_nombre, borrador, esperado) => {
    expect(maquetarBorrador(borrador, 'Sección').motivo).toBe(esperado)
  })

  it('nunca dice "de el": contrae a "del"', () => {
    for (const [, borrador] of casos) {
      expect(maquetarBorrador(borrador, 'Sección').motivo ?? '').not.toMatch(/\bde el\b/)
    }
  })

  it('el mensaje de un refine se respeta, con el sitio delante', () => {
    // Texto plano y URL segura ya traen su explicación escrita para quien la
    // lee: traducirla otra vez sería reescribirla peor.
    const r = maquetarBorrador({
      layout: 'texto-multicolumna', titulo: 'T',
      columnas: [{ titulo: 'H', puntos: [{ texto: 'x', enlace: 'javascript:alert(1)' }] }],
    } as BorradorSeccion, 'Sección')
    expect(r.motivo).toMatch(/^El enlace de la línea 1 de la columna 1: /)
    expect(r.motivo).toMatch(/javascript:/)
  })
})

describe('lo que el editor promete', () => {
  // "Lista para presentar" es una promesa, y hasta ahora se daba con una
  // comprobación más laxa que la de maquetar: una sección con una columna sin
  // líneas se anunciaba lista y reventaba al final. Ahora la promesa se gana.
  it('no dice «lista» una sección que reventaría al maquetar', () => {
    const conColumnaVacia = {
      layout: 'texto-multicolumna', titulo: 'T', columnas: [{ titulo: 'Hallazgos', puntos: [] }],
    } as BorradorSeccion
    expect(estadoDeSeccion(conColumnaVacia, 'Sección').estado).toBe('con-problema')
    expect(maquetarBorrador(conColumnaVacia, 'Sección').degradado).toBe(true)
  })

  it('el aviso del editor es el MISMO texto que el de la maquetación', () => {
    // Si difieren, quien lo ve dos veces cree que son dos problemas.
    const b = { ...BASE, kpis: cifras(5) }
    const enEditor = estadoDeSeccion(b, 'Sección')
    expect(enEditor.estado).toBe('con-problema')
    if (enEditor.estado !== 'con-problema') return
    expect(enEditor.motivo).toBe(maquetarBorrador(b, 'Sección').motivo)
  })

  it('una sección sin tocar está «por empezar», no en error', () => {
    expect(estadoDeSeccion({ layout: 'kpis-fila-dos-columnas' }, 'RevOps').estado).toBe('por-empezar')
  })

  it('una sección completa y válida está lista', () => {
    expect(estadoDeSeccion({ ...BASE, kpis: cifras(3) }, 'Sección').estado).toBe('lista')
  })
})
