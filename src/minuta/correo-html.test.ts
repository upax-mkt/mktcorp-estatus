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
    // Sin fijar el estilo exacto: lo que importa es que sean párrafos y que
    // no se inventen negritas. Los estilos concretos los cubre el describe de
    // Outlook, más abajo.
    expect(html).toContain('>Una línea suelta.</p>')
    expect(html).toContain('>Otra línea suelta.</p>')
    expect(html).not.toContain('<strong>')
  })

  it('una fila con menos celdas que la cabecera no corre la tabla', () => {
    const html = correoAHtml('Acción | Owner | Fecha\nHacer algo | Ana')
    expect(html.match(/<td /g)).toHaveLength(3)
  })

  it('un texto vacío no revienta', () => {
    expect(correoAHtml('')).toMatch(/^<div style="[^"]+"><\/div>$/)
  })
})

/**
 * QUE SE VEA BIEN AL PEGARLO EN OUTLOOK (Franco: *"cuando la pego en el mail
 * (outlook) se ve horrible; debe quedar copiar y pegar, pero bonito"*).
 *
 * Outlook de escritorio compone con el motor de Word, y Word **no hereda la
 * tipografía dentro de una tabla**: la fuente iba declarada una sola vez, en
 * el `<div>` de fuera, así que los párrafos la heredaban y las celdas caían a
 * Times New Roman. La tabla de acuerdos —lo único que de verdad se lee de una
 * minuta— llegaba con otra letra que el resto del correo.
 *
 * Estas pruebas fijan lo que NO se puede volver a perder. Son literales a
 * propósito: es la clase de detalle que se borra al refactorizar sin que nada
 * se ponga rojo.
 */
describe('correoAHtml — que Outlook no lo destroce', () => {
  const CON_TABLA = [
    'Acuerdos',
    'Acción | Owner | Fecha',
    'Mandar el reporte | Ana | 3 ago',
  ].join('\n')

  it('CADA celda declara su propia tipografía: Word no la hereda de fuera', () => {
    const html = correoAHtml(CON_TABLA)
    const celdas = html.match(/<t[hd] style="([^"]*)"/g) ?? []
    expect(celdas.length).toBeGreaterThan(0)
    for (const celda of celdas) expect(celda).toContain('font-family:Arial')
  })

  it('los párrafos y los items también la declaran, no solo el contenedor', () => {
    const html = correoAHtml('Hola.\n\nPuntos\n* uno\n* dos')
    for (const etiqueta of ['<p style="', '<li style="', '<ul style="']) {
      const i = html.indexOf(etiqueta)
      expect(i, `falta ${etiqueta}`).toBeGreaterThan(-1)
      expect(html.slice(i, html.indexOf('"', i + etiqueta.length))).toContain('font-family:Arial')
    }
  })

  /** Sin unidad, Word ignora `line-height` y mete su propio interlineado. */
  it('el interlineado va en píxeles, nunca sin unidad', () => {
    const html = correoAHtml(CON_TABLA)
    expect(html).toContain('line-height:22px')
    expect(html).not.toMatch(/line-height:\d+\.\d+[;"]/)
    expect(html).toContain('mso-line-height-rule:exactly')
  })

  /** Word respeta los atributos antes que `border-collapse`. */
  it('la tabla lleva cellspacing/cellpadding/border como atributos', () => {
    const html = correoAHtml(CON_TABLA)
    expect(html).toContain('<table cellspacing="0" cellpadding="0" border="0"')
  })

  it('la lista lleva margen izquierdo, que es lo que Word entiende', () => {
    const html = correoAHtml('Puntos\n* uno\n* dos')
    const ul = html.match(/<ul style="([^"]*)"/)?.[1] ?? ''
    expect(ul).toMatch(/margin:[^;]*24px/)
  })
})

/**
 * EL HTML SE PINTA CON `dangerouslySetInnerHTML` (`CorreoMinuta`, y el visor
 * de la sala), así que lo que sale de aquí es marcado vivo. La cabecera del
 * módulo afirmaba que "no hay camino por el que la transcripción acabe siendo
 * marcado": lo había, y era el `href` del pie.
 */
describe('correoAHtml — nada del texto se convierte en marcado', () => {
  it('escapa las comillas, no solo &<>', () => {
    const html = correoAHtml('Dijo "hola" y \'adiós\'.')
    expect(html).toContain('&quot;hola&quot;')
    expect(html).not.toMatch(/>[^<]*"hola"/)
  })

  it('una URL con comillas no se convierte en enlace: se queda como texto', () => {
    const html = correoAHtml('https://x.mx/a" onmouseover="alert(1)', 'https://app.mx')
    expect(html).not.toContain('onmouseover="alert(1)"')
    expect(html).not.toContain('<a href')
    expect(html).toContain('&quot;')
  })

  it('una URL normal sí es enlace, y con su tipografía', () => {
    const html = correoAHtml('https://mktcorp-estatus.vercel.app/reunion/abc')
    expect(html).toContain('<a href="https://mktcorp-estatus.vercel.app/reunion/abc"')
    expect(html).toMatch(/<a href="[^"]*" style="[^"]*font-family:Arial/)
  })
})
