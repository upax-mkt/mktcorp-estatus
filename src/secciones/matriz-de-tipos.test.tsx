import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { CATALOGO, type CampoSeccion } from './catalogo'
import { aDecision, type BorradorSeccion } from './borrador'
import { maquetarBorrador } from '@/motor/maquetar'
import { SeccionDocumento } from '@/componentes/sesion/SeccionDocumento'

/**
 * LOS TRECE TIPOS DE SECCIÓN, CADA UNO LLENO Y PRESENTADO.
 *
 * Franco, tras usar el editor de verdad: "detecté problemas cuando se
 * configuran algunos elementos y componentes tiran error en la maquetación".
 *
 * Los tests que había probaban piezas sueltas —esta tabla, aquel gráfico— y
 * cada uno con el contenido que le venía bien. Ninguno recorría el catálogo
 * entero llenando TODOS los campos que cada tipo admite, que es exactamente lo
 * que hace alguien armando una sesión. Un campo que el editor deja ofrecer y
 * el esquema rechaza no lo ve nadie hasta que lo llenan.
 *
 * Por eso esto se genera DESDE el catálogo: cuando alguien añada un tipo o le
 * añada un campo a uno existente, este test lo cubre solo. Si se escribieran
 * los trece a mano, el catorceavo nacería sin prueba.
 */

/** Contenido de ejemplo por campo, con la forma que emite el editor. */
const CONTENIDO: Record<CampoSeccion, unknown> = {
  subtitulo: 'Junio de 2026 · corte al día 30',

  cuerpo: ['Pipeline y cierre del mes', 'Cuentas nuevas', 'Pendientes de la sesión pasada'],

  kpis: [
    { valor: '29k', delta: '-16%', rotulo: 'Impresiones' },
    { valor: '1,204', delta: '+8%', rotulo: 'Sesiones' },
    { valor: '0.9%', rotulo: 'Conversión' },
    { valor: '$191 K', delta: '+3%', rotulo: 'Pipeline nuevo' },
  ],

  columnas: [
    {
      titulo: 'Hallazgos',
      etiqueta: 'Actualizado 30-jun',
      puntos: [
        { texto: 'El tráfico cae por el mix de consultas, no por deterioro' },
        {
          texto: 'Tres cuentas concentran el 60% del pipeline',
          hijos: [{ texto: 'Dos de ellas entraron por referencia' }],
        },
      ],
    },
    { titulo: 'Acciones', puntos: [{ texto: 'Reactivar cuentas dormidas en julio' }] },
  ],

  tablas: [
    {
      titulo: 'Estado de MQLs',
      columnas: ['Responsable', 'Tarea', 'Estatus'],
      filas: [
        { celdas: ['Ileana', 'Cerrar cuentas objetivo', 'Listo'], estado: 'listo' },
        { celdas: ['Fernando', 'Plan de medios', ''], estado: 'en-proceso' },
        { celdas: ['Total', '2 tareas', ''], destacada: true },
      ],
      agruparPrimeraColumna: true,
    },
  ],

  graficos: [
    {
      tipo: 'combo-barras-lineas',
      titulo: 'Tráfico website',
      periodos: ['enero', 'febrero', 'marzo'],
      series: [
        { etiqueta: 'Sesiones', valores: [1200, 1380, 1204], forma: 'barra' },
        { etiqueta: 'Meta', valores: [1300, 1300, 1300], forma: 'linea-punteada', eje: 'derecho' },
      ],
      mostrarValores: true,
    },
  ],

  matriz: {
    columnas: ['Julio', 'Agosto', 'Septiembre'],
    filas: [
      {
        encabezado: 'Retail',
        celdas: [{ texto: 'Vende', tono: 'alto' }, { texto: 'Prepara', tono: 'medio' }, { texto: 'Espera', tono: 'bajo' }],
        nota: 'Ciclo estimado de 90 días',
      },
      {
        encabezado: 'Banca',
        celdas: [{ texto: 'Explora' }, { texto: 'Vende', tono: 'alto' }, { texto: 'Vende', tono: 'alto' }],
      },
    ],
    leyenda: ['Vende: hay presupuesto abierto', 'Espera: fuera de temporada'],
  },

  metaReal: {
    titulo: 'SQLs',
    filas: [
      { rotulo: 'Total', meta: '120', real: '17', porcentaje: '14%' },
      { rotulo: 'Mkt', meta: '80', real: '20', porcentaje: '25%' },
      { rotulo: 'Ventas', meta: '40', real: '0', porcentaje: '0%' },
    ],
  },

  cifrasDesglosadas: [
    {
      rotulo: 'Pipeline generado YTD',
      valor: '$39.4 MDP',
      destacada: true,
      partes: [{ rotulo: 'Mkt', valor: '$12.1 MDP' }, { rotulo: 'Comercial', valor: '$27.3 MDP' }],
    },
    { rotulo: 'Negocios perdidos YTD', valor: '$191 K' },
  ],

  bloques: [
    {
      titulo: 'Reactivación de cuentas dormidas',
      etiqueta: 'Prioridad alta',
      parrafo: 'Cuarenta cuentas sin contacto en seis meses concentran pipeline histórico.',
      puntos: [{ texto: 'Secuencia de tres toques' }, { texto: 'Oferta de diagnóstico sin costo' }],
      pie: { rotulo: 'Oferta gancho', texto: 'Diagnóstico de marca en dos semanas' },
    },
    { titulo: 'Vertical político-electoral' },
  ],

  imagen: '/logos/zeus-color.png',

  notaPie: 'Fuente: HubSpot, corte al 30 de junio. Excluye la venta interna al grupo.',
}

/** Un borrador con TODOS los campos que el tipo admite, llenos. */
function borradorLleno(campos: CampoSeccion[], layout: BorradorSeccion['layout']): BorradorSeccion {
  const b: BorradorSeccion = { layout, titulo: 'El pipeline crece, pero lo sostienen tres cuentas' }
  for (const campo of campos) Object.assign(b, { [campo]: CONTENIDO[campo] })
  return b
}

describe.each(CATALOGO)('sección «$nombre» ($layout)', (tipo) => {
  const borrador = borradorLleno(tipo.campos, tipo.layout)

  it('con todos sus campos llenos, maqueta sin degradar', () => {
    const resultado = aDecision(borrador)
    // El motivo va en el mensaje: sin él, un fallo aquí dice "false !== true".
    expect(resultado.ok ? '' : resultado.motivo).toBe('')
  })

  it('el resultado se presenta sin reventar', () => {
    const maquetado = maquetarBorrador(borrador, 'Sección')
    expect(maquetado.degradado, maquetado.motivo).toBe(false)
    expect(() =>
      render(
        <SeccionDocumento
          decision={maquetado.decision}
          indice={0}
          indice_general={[{ titulo: 'Una sección', ancla: 'seccion-1' }]}
        />,
      ),
    ).not.toThrow()
  })

  it('vacío del todo, degrada con un motivo que dice qué falta', () => {
    // Nunca desaparece en silencio: quien la escribió tiene que ver QUÉ le
    // falta en el propio documento.
    const maquetado = maquetarBorrador({ layout: tipo.layout }, '')
    if (tipo.exige) {
      expect(maquetado.degradado).toBe(true)
      expect(maquetado.motivo).toMatch(/Falta/)
    }
  })
})
