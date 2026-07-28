import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { SeccionDocumento } from './SeccionDocumento'
import type { DecisionSlide } from '@/decision/esquema'

/**
 * Cada test corresponde a una página del deck de referencia (Mexa Creativa,
 * junio 2026) que antes no se podía dibujar.
 * Ver docs/superpowers/specs/2026-07-27-brecha-vs-deck-real.md.
 */

function seccion(parcial: Partial<DecisionSlide>) {
  const decision = {
    layout: 'kpis-fila-dos-columnas',
    titulo: 'Sección',
    razon: 'r',
    ...parcial,
  } as DecisionSlide
  return render(<SeccionDocumento decision={decision} indice={0} />)
}

describe('pendientes con semáforo (pág. 4)', () => {
  const TABLA = {
    columnas: ['Responsable', 'Tarea', 'Estatus'],
    agruparPrimeraColumna: true,
    filas: [
      { celdas: ['Ileana', 'Cerrar el brief', 'Listo'], estado: 'listo' as const },
      { celdas: ['Ileana', 'Enviar el calendario', 'En proceso'], estado: 'en-proceso' as const },
      { celdas: ['César', 'Conectar el dashboard', 'No realizado'], estado: 'no-realizado' as const },
    ],
  }

  it('el responsable con dos tareas aparece UNA vez, no dos', () => {
    const { container } = seccion({ layout: 'pendientes-semaforo', tablas: [TABLA] })
    expect(screen.getAllByText('Ileana')).toHaveLength(1)
    const celdaAgrupada = container.querySelector('tbody th')
    expect(celdaAgrupada?.getAttribute('rowspan')).toBe('2')
  })

  it('cada fila lleva su color de semáforo', () => {
    const { container } = seccion({ layout: 'pendientes-semaforo', tablas: [TABLA] })
    const estados = Array.from(container.querySelectorAll('tbody [data-estado]')).map((e) =>
      e.getAttribute('data-estado'),
    )
    expect(estados).toEqual(['listo', 'en-proceso', 'no-realizado'])
  })

  it('el color nunca es la única señal: el estado va escrito en la celda y en la leyenda', () => {
    seccion({ layout: 'pendientes-semaforo', tablas: [TABLA] })
    // "En proceso" aparece dos veces: en su fila y en la leyenda.
    expect(screen.getAllByText('En proceso').length).toBeGreaterThanOrEqual(2)
  })
})

describe('tablas de datos (págs. 8 y 10)', () => {
  it('pinta encabezados y celdas tal cual, sin reformatear los números', () => {
    seccion({
      tablas: [{
        titulo: 'Sitio web',
        columnas: ['', 'Mayo', 'Junio'],
        filas: [{ celdas: ['Sesiones', '3,591', '2,914'] }],
      }],
    })
    expect(screen.getByText('Sitio web')).toBeInTheDocument()
    expect(screen.getByText('3,591')).toBeInTheDocument()
  })

  it('varias tablas en la misma sección conviven', () => {
    const { container } = seccion({
      layout: 'grafico-y-tabla',
      tablas: [
        { columnas: ['a', 'b'], filas: [{ celdas: ['1', '2'] }] },
        { columnas: ['c', 'd'], filas: [{ celdas: ['3', '4'] }] },
      ],
    })
    expect(container.querySelectorAll('table')).toHaveLength(2)
  })

  it('la fila de total se marca como tal', () => {
    const { container } = seccion({
      tablas: [{
        columnas: ['Etapa', 'MQLs'],
        filas: [
          { celdas: ['Contactados', '40'] },
          { celdas: ['Total', '58'], destacada: true },
        ],
      }],
    })
    const filas = container.querySelectorAll('tbody tr')
    expect(filas[0].getAttribute('data-destacada')).toBeNull()
    expect(filas[1].getAttribute('data-destacada')).toBe('true')
  })
})

describe('gráficos (págs. 8 y 10)', () => {
  it('dos gráficos en una sección se dibujan los dos', () => {
    const { container } = seccion({
      layout: 'grafico-y-tabla',
      graficos: [
        { tipo: 'barras', periodos: ['a', 'b'], series: [{ etiqueta: 's', valores: [1, 2] }] },
        {
          tipo: 'barras-horizontales-agrupadas',
          periodos: ['Organic', 'Paid'],
          series: [{ etiqueta: '2026', valores: [3, 4] }],
        },
      ],
    })
    // `figure svg` y no `svg` a secas: desde que cada sección lleva el icono
    // de su tipo en el carril, contar todos los SVG cuenta también ese.
    expect(container.querySelectorAll('figure svg')).toHaveLength(2)
  })
})

describe('meta / real / % y cifras con desglose (pág. 12)', () => {
  it('cada renglón muestra real, meta y porcentaje', () => {
    seccion({
      layout: 'meta-real-porcentaje',
      metaReal: {
        titulo: 'SQLs',
        filas: [{ rotulo: 'Total', meta: '120', real: '17', porcentaje: '14%' }],
      },
    })
    expect(screen.getByText('17')).toBeInTheDocument()
    expect(screen.getByText('de 120')).toBeInTheDocument()
    expect(screen.getByText('14%')).toBeInTheDocument()
  })

  it('la barra de cumplimiento nunca se sale de su carril', () => {
    const { container } = seccion({
      layout: 'meta-real-porcentaje',
      metaReal: {
        titulo: 'SQLs',
        filas: [{ rotulo: 'Mkt', meta: '10', real: '35', porcentaje: '350%' }],
      },
    })
    const relleno = container.querySelector('[style*="width"]')
    expect(relleno?.getAttribute('style')).toContain('100%')
    // El número sigue diciendo la verdad aunque la barra se tope.
    expect(screen.getByText('350%')).toBeInTheDocument()
  })

  it('un porcentaje que no es un número no rompe la fila', () => {
    const { container } = seccion({
      layout: 'meta-real-porcentaje',
      metaReal: { titulo: 'SQLs', filas: [{ rotulo: 'Mkt', meta: '10', real: 'n/d', porcentaje: 'n/d' }] },
    })
    expect(container.querySelector('[style*="width"]')).toBeNull()
    expect(screen.getAllByText('n/d').length).toBeGreaterThan(0)
  })

  it('el total y sus partes se ven juntos', () => {
    const { container } = seccion({
      cifrasDesglosadas: [{
        rotulo: 'Pipeline generado YTD',
        valor: '$39.4 MDP',
        destacada: true,
        partes: [{ rotulo: 'Mkt', valor: '$12.1 MDP' }, { rotulo: 'Comercial', valor: '$27.3 MDP' }],
      }],
    })
    const tarjeta = container.querySelector('[data-destacada="true"]')
    expect(tarjeta).not.toBeNull()
    expect(within(tarjeta as HTMLElement).getByText('$39.4 MDP')).toBeInTheDocument()
    expect(within(tarjeta as HTMLElement).getByText('$27.3 MDP')).toBeInTheDocument()
  })
})

describe('bloques numerados (pág. 13)', () => {
  it('trae título, etiqueta, párrafo, viñetas y la línea de cierre', () => {
    seccion({
      layout: 'tarjetas-numeradas',
      bloques: [{
        titulo: 'Reactivación de cuentas',
        etiqueta: 'Prioridad alta',
        parrafo: 'Cuentas sin movimiento desde el primer trimestre.',
        puntos: [{ texto: 'Empezar por las 12 con propuesta enviada' }],
        pie: { rotulo: 'Oferta gancho', texto: 'Diagnóstico de marca sin costo' },
      }],
    })
    expect(screen.getByText('Reactivación de cuentas')).toBeInTheDocument()
    expect(screen.getByText('Prioridad alta')).toBeInTheDocument()
    expect(screen.getByText('Empezar por las 12 con propuesta enviada')).toBeInTheDocument()
    expect(screen.getByText('Oferta gancho')).toBeInTheDocument()
  })

  it('la numeración la pone el layout: nadie la escribe en el texto', () => {
    seccion({
      layout: 'tarjetas-numeradas',
      bloques: [{ titulo: 'Uno' }, { titulo: 'Dos' }],
    })
    expect(screen.getByText('Uno').textContent).toBe('Uno')
    expect(screen.getByText('Dos').textContent).toBe('Dos')
  })
})

describe('matriz de estados (pág. 14)', () => {
  it('cruza filas con columnas y marca la intensidad de cada celda', () => {
    const { container } = seccion({
      layout: 'matriz-estados',
      matriz: {
        columnas: ['Jul', 'Ago', 'Sep'],
        filas: [{
          encabezado: 'Retail',
          celdas: [{ texto: 'Explora' }, { texto: 'Prepara', tono: 'medio' }, { texto: 'Vende', tono: 'alto' }],
          nota: 'Ciclo estimado: 90 días',
        }],
        leyenda: ['Vende: propuesta en mesa'],
      },
    })
    expect(screen.getByText('Retail')).toBeInTheDocument()
    expect(screen.getByText('Ciclo estimado: 90 días')).toBeInTheDocument()
    expect(screen.getByText('Vende: propuesta en mesa')).toBeInTheDocument()
    const tonos = Array.from(container.querySelectorAll('[data-tono]')).map((c) => c.getAttribute('data-tono'))
    expect(tonos).toEqual(['neutro', 'medio', 'alto'])
  })
})

describe('nota al pie (pág. 9)', () => {
  it('va al final de la sección, después del contenido', () => {
    const { container } = seccion({
      kpis: [{ valor: '29k', rotulo: 'Impresiones' }],
      notaPie: 'Datos de Search Console, corte al 30 de junio.',
    })
    const nota = screen.getByText(/Search Console/)
    const seccionEl = container.querySelector('section')
    expect(seccionEl?.lastElementChild).toBe(nota)
  })
})

describe('viñetas anidadas en columnas (pág. 6)', () => {
  it('conserva la jerarquía y la fecha del encabezado', () => {
    const { container } = seccion({
      layout: 'texto-multicolumna',
      columnas: [{
        titulo: 'Herramientas comerciales',
        etiqueta: 'Actualizado 12-jun',
        puntos: [{ texto: 'Estudios de mercado', hijos: [{ texto: 'Retail' }] }],
      }],
    })
    expect(screen.getByText('Actualizado 12-jun')).toBeInTheDocument()
    expect(container.querySelector('li ul li')?.textContent).toBe('Retail')
  })
})
