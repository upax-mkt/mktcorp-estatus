import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { parsearDecision, esDecisionValida, EsquemaDecision } from './esquema'

const VALIDA = {
  layout: 'kpis-fila-dos-columnas',
  titulo: 'Performance del sitio web',
  kpis: [
    { valor: '9.2', delta: '-0.3', rotulo: 'Posición media' },
    { valor: '29k', delta: '-16%', rotulo: 'Impresiones' },
  ],
  columnas: [
    { titulo: 'Principales hallazgos', puntos: ['No es un deterioro generalizado'] },
    { titulo: 'Acciones prioritarias', puntos: ['Reforzar contenido'] },
  ],
  razon: '4 cifras con delta + 2 bloques de análisis',
}

describe('parsearDecision', () => {
  it('acepta una decisión bien formada', () => {
    expect(parsearDecision(VALIDA).titulo).toBe('Performance del sitio web')
  })

  it('rechaza un layout que no está en el catálogo', () => {
    expect(() => parsearDecision({ ...VALIDA, layout: 'lo-que-se-me-ocurrio' })).toThrow()
  })

  it('rechaza una decisión sin razón', () => {
    const sinRazon: Record<string, unknown> = { ...VALIDA }
    delete sinRazon.razon
    expect(() => parsearDecision(sinRazon)).toThrow()
  })

  it('admite la razón vacía: es auditoría interna, no puede costar el slide', () => {
    // El campo sigue siendo obligatorio (arriba), pero una razón en blanco no
    // tumba el parseo — sanearDecision la marca. Visto en producción: dos
    // intentos seguidos perdidos, con sus cifras, por este campo.
    expect(() => parsearDecision({ ...VALIDA, razon: '' })).not.toThrow()
  })

  it('la razón sigue sin poder traer estilo aunque admita vacío', () => {
    expect(() => parsearDecision({ ...VALIDA, razon: '<b>porque sí</b>' })).toThrow()
    expect(() => parsearDecision({ ...VALIDA, razon: '**porque sí**' })).toThrow()
  })

  it('rechaza estilos: la IA no puede mandar color', () => {
    expect(() => parsearDecision({ ...VALIDA, color: '#FF0000' })).toThrow()
  })

  it('rechaza estilos: la IA no puede mandar CSS ni HTML', () => {
    expect(() => parsearDecision({ ...VALIDA, css: 'p{color:red}' })).toThrow()
    expect(() => parsearDecision({ ...VALIDA, html: '<b>x</b>' })).toThrow()
  })

  it('rechaza un KPI sin rótulo', () => {
    expect(() => parsearDecision({ ...VALIDA, kpis: [{ valor: '9.2' }] })).toThrow()
  })

  it('acepta un gráfico con tipo del catálogo', () => {
    const conGrafico = { ...VALIDA, grafico: { tipo: 'barras-comparadas', serie: 'trafico_mensual' } }
    expect(parsearDecision(conGrafico).grafico?.tipo).toBe('barras-comparadas')
  })

  it('rechaza un tipo de gráfico inventado', () => {
    expect(() => parsearDecision({ ...VALIDA, grafico: { tipo: 'burbujas-3d', serie: 'x' } })).toThrow()
  })
})

describe('esDecisionValida', () => {
  it('devuelve true o false sin lanzar', () => {
    expect(esDecisionValida(VALIDA)).toBe(true)
    expect(esDecisionValida({ layout: 'portada' })).toBe(false)
  })
})

describe('TextoPlano — cierre de la rendija de markup/estilo en cadenas', () => {
  it('rechaza markup HTML en titulo', () => {
    expect(() =>
      parsearDecision({ ...VALIDA, titulo: '<div style="color:#FF0000">Resultados</div>' })
    ).toThrow()
  })

  it('rechaza markup HTML en un punto de columnas', () => {
    expect(() =>
      parsearDecision({
        ...VALIDA,
        columnas: [
          {
            titulo: 'Principales hallazgos',
            puntos: ['<span style="color:red">Ojo aquí</span>'],
          },
        ],
      })
    ).toThrow()
  })

  it('rechaza style= en el rótulo de un KPI', () => {
    expect(() =>
      parsearDecision({
        ...VALIDA,
        kpis: [{ valor: '9.2', delta: '-0.3', rotulo: 'Posición media style="color:red"' }],
      })
    ).toThrow()
  })

  it('rechaza CSS inline en cuerpo', () => {
    expect(() =>
      parsearDecision({ ...VALIDA, cuerpo: ['Texto normal', 'background: #FFFFFF; color: red;'] })
    ).toThrow()
  })

  it('rechaza una imagen con esquema javascript:', () => {
    expect(() =>
      parsearDecision({ ...VALIDA, imagen: 'javascript:alert(1)' })
    ).toThrow()
  })

  it('rechaza una imagen con esquema data:', () => {
    expect(() =>
      parsearDecision({ ...VALIDA, imagen: 'data:text/html;base64,PHNjcmlwdD4=' })
    ).toThrow()
  })

  it('rechaza una imagen con esquema file:', () => {
    expect(() => parsearDecision({ ...VALIDA, imagen: 'file:///etc/passwd' })).toThrow()
  })

  it('acepta una imagen como ruta relativa o URL https', () => {
    expect(
      esDecisionValida({ ...VALIDA, imagen: '/assets/grafico-1.png' })
    ).toBe(true)
    expect(
      esDecisionValida({ ...VALIDA, imagen: 'https://cdn.upax.com.mx/grafico-1.png' })
    ).toBe(true)
  })

  it('acepta contenido legítimo del proyecto: números, deltas, moneda, flechas y frases con acentos', () => {
    const decisionLegitima = {
      layout: 'comparativa-periodos',
      titulo: 'Comparativa de resultados: Mayo vs Junio',
      subtitulo: 'Modelo de staff augmentation, SQL → Opp',
      kpis: [
        { valor: '9.2', delta: '-0.3', rotulo: 'Posición media' },
        { valor: '$4.2 MDP', delta: '-16%', rotulo: 'Facturación, mes vs mes' },
      ],
      columnas: [
        {
          titulo: 'Principales hallazgos',
          puntos: [
            'No es un deterioro generalizado',
            'El staff augmentation creció 12%, con una caída en SQL → Opp',
          ],
        },
      ],
      cuerpo: ['Este trimestre, ingresos de $4.2 MDP con un delta de -16% vs mayo.'],
      grafico: { tipo: 'barras-comparadas', serie: 'trafico_mensual' },
      razon: '4 cifras con delta + 2 bloques de análisis, comparando Mayo vs Junio',
    }

    expect(esDecisionValida(decisionLegitima)).toBe(true)
    expect(parsearDecision(decisionLegitima).titulo).toBe('Comparativa de resultados: Mayo vs Junio')
  })
})

describe('TextoPlano — cierre de la rendija de Markdown', () => {
  it('rechaza negrita Markdown en un valor de KPI', () => {
    expect(() =>
      parsearDecision({
        ...VALIDA,
        kpis: [{ valor: '**9.2**', delta: '-0.3', rotulo: 'Posición media' }],
      })
    ).toThrow()
  })

  it('rechaza cursiva Markdown con guion bajo emparejado', () => {
    expect(() =>
      parsearDecision({ ...VALIDA, subtitulo: 'Esto es __importante__ para el equipo' })
    ).toThrow()
  })

  it('rechaza un encabezado Markdown en el título', () => {
    expect(() => parsearDecision({ ...VALIDA, titulo: '# Focos' })).toThrow()
  })

  it('rechaza un encabezado Markdown de varios niveles en un punto de columnas', () => {
    expect(() =>
      parsearDecision({
        ...VALIDA,
        columnas: [{ titulo: 'Hallazgos', puntos: ['### Prioridad alta'] }],
      })
    ).toThrow()
  })

  it('rechaza un valor con backticks de código', () => {
    expect(() =>
      parsearDecision({
        ...VALIDA,
        kpis: [{ valor: '`9.2`', delta: '-0.3', rotulo: 'Posición media' }],
      })
    ).toThrow()
  })

  it('rechaza un backtick suelto', () => {
    expect(() => parsearDecision({ ...VALIDA, razon: 'usa el campo `valor` para esto' })).toThrow()
  })

  it('NO produce falso positivo: contenido real del negocio con %, $, →, guiones y acentos pasa', () => {
    const decisionLegitima = {
      layout: 'comparativa-periodos',
      titulo: 'SQL → Opp',
      subtitulo: 'Performance · Sitio web',
      kpis: [
        { valor: '-16%', delta: '-0.3', rotulo: 'Posición media' },
        { valor: '9.2', delta: '▲', rotulo: 'Impresiones' },
        { valor: '$4.2 MDP', delta: '▼', rotulo: 'Facturación' },
      ],
      columnas: [
        {
          titulo: 'Principales hallazgos',
          puntos: [
            'Modelo de staff augmentation, con transición mayo-junio',
            'El SQL → Opp cayó, pero no es un deterioro generalizado, según el análisis',
          ],
        },
      ],
      cuerpo: ['Este trimestre, ingresos de $4.2 MDP con un delta de -16% vs mayo (9.2 puntos).'],
      razon:
        'Se prioriza la comparativa mayo-junio con foco en staff augmentation y la caída en SQL → Opp, sin perder ninguna cifra.',
    }

    expect(esDecisionValida(decisionLegitima)).toBe(true)
    expect(parsearDecision(decisionLegitima).titulo).toBe('SQL → Opp')
  })
})

describe('lo que el modelo llega a leer del esquema', () => {
  // El esquema viaja al modelo como JSON Schema: los comentarios de este
  // archivo no van, solo los .describe(). Sin ellos un campo se presenta como
  // {"type":"string"} y el modelo lo rellena — en producción devolvió
  // delta:"x" y razon:"placeholder". Este test evita que se pierdan.
  const json = z.toJSONSchema(EsquemaDecision, { io: 'input' }) as {
    properties: Record<string, { description?: string; items?: { properties?: Record<string, { description?: string }> } }>
  }

  it('describe todos los campos de primer nivel', () => {
    for (const campo of Object.keys(json.properties)) {
      expect(json.properties[campo].description, `falta .describe() en "${campo}"`).toBeTruthy()
    }
  })

  it('describe los campos de un KPI, que es donde se coló la basura', () => {
    const kpi = json.properties.kpis?.items?.properties
    expect(kpi).toBeDefined()
    for (const campo of ['valor', 'rotulo', 'delta']) {
      expect(kpi?.[campo]?.description, `falta .describe() en kpis.${campo}`).toBeTruthy()
    }
  })

  it('le dice al modelo que el delta va en su campo y no en el rótulo', () => {
    const kpi = json.properties.kpis?.items?.properties
    expect(kpi?.delta?.description).toMatch(/nunca dentro del rótulo/i)
    expect(kpi?.rotulo?.description).toMatch(/sin la variación/i)
  })
})
