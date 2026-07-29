import { describe, it, expect } from 'vitest'
import { correoAHtml } from './correo-html'
import { ensamblarCorreo } from './generar'

/**
 * Franco: "el resultado debería venir con algo de formato para copiar y pegar
 * en mail, sobre todo las tablas, poner algo en bold".
 *
 * Lo que se prueba aquí es lo que se rompía al pegar: que la tabla llegue como
 * tabla de verdad y que los encabezados de bloque lleguen en negrita. Y, sobre
 * todo, que nada del texto del modelo pueda salir como marcado.
 */

const ACUERDOS = [
  { que: 'Cerrar cuentas objetivo', responsable: 'Ileana Cruz', prioridad: 'alta', fechaCompromiso: '2026-08-01' },
  { que: 'Revisar el brief', responsable: 'por asignar', prioridad: 'media', fechaCompromiso: null },
]

/** El correo real, armado con el molde de siempre. */
const CORREO = ensamblarCorreo(
  'marketing-united',
  ['Revisar el avance del trimestre.', '* Se aprobó el plan.\n* Se movió la fecha de arranque.', 'Cerrar el brief.'],
  ACUERDOS,
)

describe('el correo de la minuta en HTML', () => {
  const html = correoAHtml(CORREO, 'https://ejemplo.app')

  it('convierte la tabla de acuerdos en una tabla de verdad', () => {
    expect(html).toContain('<table')
    expect(html).toContain('<th')
    // Tres columnas: Acción, Owner, Fecha.
    expect(html.match(/<th /g)).toHaveLength(3)
    // Dos acuerdos, tres celdas cada uno.
    expect(html.match(/<td /g)).toHaveLength(6)
    expect(html).toContain('Ileana Cruz')
    expect(html).toContain('por definir')
    // Y ya no queda ninguna barra suelta haciendo de columna.
    expect(html).not.toContain(' | ')
  })

  it('no deja que se partan las columnas cortas', () => {
    // Owner y Fecha son cortas: si se les deja partir, el reparto automático
    // de anchos les quita sitio para dárselo a Acción y sale "Fernand / o".
    // La de Acción sí tiene que poder ajustarse, que es la que lleva el texto.
    const filas = [...html.matchAll(/<td style="([^"]*)"[^>]*>([^<]*)</g)].map((m) => ({
      nowrap: m[1].includes('nowrap'), texto: m[2],
    }))
    expect(filas.find((f) => f.texto === 'Ileana Cruz')?.nowrap).toBe(true)
    expect(filas.find((f) => f.texto === 'por definir')?.nowrap).toBe(true)
    expect(filas.find((f) => f.texto === 'Cerrar cuentas objetivo')?.nowrap).toBe(false)
  })

  it('pone en negrita los encabezados de bloque', () => {
    expect(html).toContain('<strong>Objetivo de la reunión</strong>')
    expect(html).toContain('<strong>Temas generales y acuerdos</strong>')
    expect(html).toContain('<strong>Acuerdos y accionables</strong>')
    expect(html).toContain('<strong>Próximos pasos</strong>')
  })

  it('no pone en negrita el saludo ni la despedida', () => {
    expect(html).not.toContain('<strong>Hola, equipo:</strong>')
    expect(html).not.toContain('<strong>¡Saludos!</strong>')
  })

  it('convierte las viñetas en una lista', () => {
    expect(html).toContain('<ul')
    expect(html.match(/<li /g)).toHaveLength(2)
    expect(html).toContain('Se aprobó el plan.')
    // La viñeta la pone la lista: el asterisco no debe seguir en el texto.
    expect(html).not.toContain('* Se aprobó')
  })

  it('deja el enlace del pie absoluto y pinchable', () => {
    expect(html).toContain('<a href="https://ejemplo.app/cliente/marketing-united"')
  })

  it('sin origen, el enlace se queda como texto en vez de apuntar a ningún sitio', () => {
    expect(correoAHtml(CORREO)).not.toContain('<a href')
  })

  it('lleva sus estilos en línea, que son los que sobreviven a Gmail', () => {
    expect(html).toContain('font-family:Arial')
    expect(html).not.toContain('<style')
    expect(html).not.toContain('class=')
  })
})

describe('el texto del modelo nunca sale como marcado', () => {
  it('escapa los caracteres de HTML vengan de donde vengan', () => {
    const correo = ensamblarCorreo(
      'marketing-united',
      ['Se revisó el caso <script>alert(1)</script> & el otro.'],
      [{ que: '<b>Ojo</b>', responsable: 'A & B', prioridad: 'alta', fechaCompromiso: null }],
      {
        saludo: 'Hola:',
        entradilla: '',
        bloques: [{ titulo: 'Tema', guia: 'x' }, { titulo: 'Acuerdos', guia: '', conTabla: true }],
        cierre: '',
        conEnlace: false,
      },
    )
    const html = correoAHtml(correo)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&lt;b&gt;Ojo&lt;/b&gt;')
    expect(html).toContain('A &amp; B')
  })
})

describe('lo que no se reconoce falla hacia el lado seguro', () => {
  it('un texto sin estructura sale como párrafos, no se pierde', () => {
    const html = correoAHtml('Una línea suelta.\n\nOtra línea suelta.')
    expect(html).toContain('<p style="margin:0 0 12px">Una línea suelta.</p>')
    expect(html).toContain('<p style="margin:0 0 12px">Otra línea suelta.</p>')
    expect(html).not.toContain('<strong>')
  })

  it('una fila con menos celdas que la cabecera no corre la tabla', () => {
    const html = correoAHtml('Acción | Owner | Fecha\nHacer algo | Ana')
    expect(html.match(/<td /g)).toHaveLength(3)
  })

  it('un texto vacío no revienta', () => {
    expect(correoAHtml('')).toBe('<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#1a1a1a"></div>')
  })
})
