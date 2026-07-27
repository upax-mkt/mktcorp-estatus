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
    { titulo: 'Principales hallazgos', puntos: [{ texto: 'No es un deterioro generalizado' }] },
    { titulo: 'Acciones prioritarias', puntos: [{ texto: 'Reforzar contenido' }] },
  ],
  razon: '4 cifras con delta + 2 bloques de análisis',
}

/** Un gráfico con datos de verdad: periodos en el eje y una serie por línea. */
const GRAFICO = {
  tipo: 'barras-comparadas',
  titulo: 'Tráfico website',
  periodos: ['Mayo', 'Junio'],
  series: [{ etiqueta: 'Sesiones', valores: [3591, 2914] }],
  serie: 'trafico_mensual',
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
    const conGrafico = { ...VALIDA, graficos: [GRAFICO] }
    expect(parsearDecision(conGrafico).graficos?.[0].tipo).toBe('barras-comparadas')
  })

  it('rechaza un tipo de gráfico inventado', () => {
    expect(() => parsearDecision({ ...VALIDA, graficos: [{ ...GRAFICO, tipo: 'burbujas-3d' }] })).toThrow()
  })

  it('un gráfico sin datos no es un gráfico: exige periodos y series', () => {
    // Antes `grafico` era solo `{ tipo, serie }` — un nombre de serie suelto que
    // no llevaba a ningún número, así que no había forma de dibujar nada.
    expect(() => parsearDecision({ ...VALIDA, graficos: [{ tipo: 'barras' }] })).toThrow()
  })
})

describe('lo que un estatus real necesita representar', () => {
  // Cada test de aquí corresponde a una página del deck de referencia
  // (Mexa Creativa, junio 2026) que antes no se podía ni expresar.
  // Ver docs/superpowers/specs/2026-07-27-brecha-vs-deck-real.md.

  it('tabla de pendientes: semáforo por fila y responsable agrupado (pág. 4)', () => {
    const d = parsearDecision({
      ...VALIDA,
      layout: 'pendientes-semaforo',
      tablas: [{
        columnas: ['Responsable', 'Tarea', 'Estatus'],
        agruparPrimeraColumna: true,
        filas: [
          { celdas: ['Ileana', 'Cerrar el brief de campaña', 'Listo'], estado: 'listo' },
          { celdas: ['Ileana', 'Enviar el calendario Q3', 'En proceso'], estado: 'en-proceso' },
        ],
      }],
    })
    expect(d.tablas?.[0].filas[0].estado).toBe('listo')
    expect(d.tablas?.[0].agruparPrimeraColumna).toBe(true)
  })

  it('rechaza un estado de semáforo inventado', () => {
    expect(() => parsearDecision({
      ...VALIDA,
      tablas: [{ columnas: ['a', 'b'], filas: [{ celdas: ['x', 'y'], estado: 'medio-listo' }] }],
    })).toThrow()
  })

  it('viñetas anidadas de tres niveles (pág. 6)', () => {
    const d = parsearDecision({
      ...VALIDA,
      columnas: [{
        titulo: 'Herramientas comerciales',
        etiqueta: 'Actualizado 12-jun',
        puntos: [{
          texto: 'Estudios de mercado',
          hijos: [{ texto: 'Retail', hijos: [{ texto: 'Elektra' }] }],
        }],
      }],
    })
    expect(d.columnas?.[0].puntos[0].hijos?.[0].hijos?.[0].texto).toBe('Elektra')
  })

  it('un enlace de viñeta no puede ser javascript: — acaba en un href', () => {
    const conEnlace = (enlace: string) => ({
      ...VALIDA,
      columnas: [{ titulo: 'Insights', puntos: [{ texto: 'Ver la cuenta', enlace }] }],
    })
    expect(esDecisionValida(conEnlace('https://app.hubspot.com/x'))).toBe(true)
    expect(esDecisionValida(conEnlace('/sala/mexa-creativa'))).toBe(true)
    expect(esDecisionValida(conEnlace('javascript:alert(1)'))).toBe(false)
    expect(esDecisionValida(conEnlace('data:text/html;base64,PHNjcmlwdD4='))).toBe(false)
  })

  it('dos gráficos en una misma sección (pág. 8)', () => {
    const d = parsearDecision({
      ...VALIDA,
      graficos: [
        {
          tipo: 'combo-barras-lineas',
          periodos: ['Abr', 'May', 'Jun'],
          series: [
            { etiqueta: 'Sesiones', valores: [1200, 1366, 968], forma: 'barra' },
            { etiqueta: 'Meta', valores: [1000, 1000, 1000], forma: 'linea-punteada' },
            { etiqueta: 'CTR', valores: [0.9, 1.1, 0.8], eje: 'derecho', sufijo: '%' },
          ],
        },
        {
          tipo: 'barras-horizontales-agrupadas',
          periodos: ['Organic Search', 'Paid Search'],
          series: [
            { etiqueta: '2025', valores: [340, 120] },
            { etiqueta: '2026', valores: [410, 96] },
          ],
        },
      ],
    })
    expect(d.graficos).toHaveLength(2)
    expect(d.graficos?.[0].series[2].eje).toBe('derecho')
  })

  it('nunca más de dos gráficos por sección', () => {
    const uno = { tipo: 'barras', periodos: ['a'], series: [{ etiqueta: 's', valores: [1] }] }
    expect(esDecisionValida({ ...VALIDA, graficos: [uno, uno, uno] })).toBe(false)
  })

  it('meta / real / porcentaje con su desglose (pág. 12)', () => {
    const d = parsearDecision({
      ...VALIDA,
      layout: 'meta-real-porcentaje',
      metaReal: {
        titulo: 'SQLs',
        filas: [
          { rotulo: 'Total', meta: '120', real: '17', porcentaje: '14%' },
          { rotulo: 'Mkt', meta: '60', real: '15', porcentaje: '25%' },
          { rotulo: 'Ventas', meta: '60', real: '2', porcentaje: '3%' },
        ],
      },
      cifrasDesglosadas: [{
        rotulo: 'Pipeline generado YTD',
        valor: '$39.4 MDP',
        destacada: true,
        partes: [{ rotulo: 'Mkt', valor: '$12.1 MDP' }, { rotulo: 'Comercial', valor: '$27.3 MDP' }],
      }],
    })
    expect(d.metaReal?.filas).toHaveLength(3)
    expect(d.cifrasDesglosadas?.[0].partes).toHaveLength(2)
  })

  it('bloques numerados con su oferta gancho (pág. 13)', () => {
    const d = parsearDecision({
      ...VALIDA,
      layout: 'tarjetas-numeradas',
      bloques: [{
        titulo: 'Reactivación de cuentas dormidas',
        etiqueta: 'Prioridad alta',
        parrafo: 'Cuentas sin movimiento desde el primer trimestre.',
        puntos: [{ texto: 'Empezar por las 12 con propuesta enviada' }],
        pie: { rotulo: 'Oferta gancho', texto: 'Diagnóstico de marca sin costo' },
      }],
    })
    expect(d.bloques?.[0].pie?.rotulo).toBe('Oferta gancho')
  })

  it('matriz de estados con leyenda (pág. 14)', () => {
    const d = parsearDecision({
      ...VALIDA,
      layout: 'matriz-estados',
      matriz: {
        columnas: ['Jul', 'Ago', 'Sep'],
        filas: [{
          encabezado: 'Retail',
          celdas: [{ texto: 'Explora' }, { texto: 'Prepara', tono: 'medio' }, { texto: 'Vende', tono: 'alto' }],
          nota: 'Ciclo estimado: 90 días',
        }],
        leyenda: ['Explora: primer contacto', 'Vende: propuesta en mesa'],
      },
    })
    expect(d.matriz?.filas[0].celdas[2].tono).toBe('alto')
  })

  it('nota al pie (pág. 9)', () => {
    const d = parsearDecision({ ...VALIDA, notaPie: 'Datos de Search Console, corte al 30 de junio.' })
    expect(d.notaPie).toContain('Search Console')
  })

  it('el estilo sigue prohibido dentro de las estructuras nuevas', () => {
    // El cierre de markup tiene que valer a cualquier profundidad: una celda de
    // tabla se pinta igual que un título.
    expect(esDecisionValida({
      ...VALIDA,
      tablas: [{ columnas: ['a', 'b'], filas: [{ celdas: ['<b>x</b>', 'y'] }] }],
    })).toBe(false)
    expect(esDecisionValida({
      ...VALIDA,
      bloques: [{ titulo: 'Foco', parrafo: '**muy importante**' }],
    })).toBe(false)
    expect(esDecisionValida({
      ...VALIDA,
      matriz: { columnas: ['a', 'b'], filas: [{ encabezado: 'x', celdas: [{ texto: '### alto' }] }] },
    })).toBe(false)
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
            puntos: [{ texto: '<span style="color:red">Ojo aquí</span>' }],
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
            { texto: 'No es un deterioro generalizado' },
            { texto: 'El staff augmentation creció 12%, con una caída en SQL → Opp' },
          ],
        },
      ],
      cuerpo: ['Este trimestre, ingresos de $4.2 MDP con un delta de -16% vs mayo.'],
      graficos: [GRAFICO],
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
        columnas: [{ titulo: 'Hallazgos', puntos: [{ texto: '### Prioridad alta' }] }],
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
            { texto: 'Modelo de staff augmentation, con transición mayo-junio' },
            { texto: 'El SQL → Opp cayó, pero no es un deterioro generalizado, según el análisis' },
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
  type NodoSchema = {
    description?: string
    properties?: Record<string, NodoSchema>
    items?: NodoSchema
    $defs?: Record<string, NodoSchema>
    $ref?: string
  }
  const json = z.toJSONSchema(EsquemaDecision, { io: 'input' }) as NodoSchema

  /**
   * Recorre el esquema ENTERO y devuelve la ruta de cada campo sin descripción.
   *
   * Antes esto solo miraba el primer nivel y los KPIs, que era donde había
   * salido la basura. Con tablas, matriz, bloques y viñetas recursivas, la
   * mayor parte del contrato pasó a vivir tres o cuatro niveles adentro: un
   * `celdas` sin describir es exactamente el mismo agujero, solo que más hondo.
   */
  function camposSinDescripcion(nodo: NodoSchema, ruta: string, vistos: Set<NodoSchema>): string[] {
    // Vineta se refiere a sí misma ($ref a su propia $def): sin este corte, la
    // recursión no termina.
    if (vistos.has(nodo)) return []
    vistos.add(nodo)

    const faltantes: string[] = []
    for (const [nombre, hijo] of Object.entries(nodo.properties ?? {})) {
      const rutaHija = ruta ? `${ruta}.${nombre}` : nombre
      // Un campo que es solo `$ref` no puede llevar description propia: la
      // descripción del tipo vive en la $def a la que apunta.
      if (!hijo.description && !hijo.$ref) faltantes.push(rutaHija)
      faltantes.push(...camposSinDescripcion(hijo, rutaHija, vistos))
    }
    if (nodo.items) faltantes.push(...camposSinDescripcion(nodo.items, `${ruta}[]`, vistos))
    for (const [nombre, def] of Object.entries(nodo.$defs ?? {})) {
      faltantes.push(...camposSinDescripcion(def, `$defs.${nombre}`, vistos))
    }
    return faltantes
  }

  it('describe TODOS los campos, a cualquier profundidad', () => {
    const faltantes = camposSinDescripcion(json, '', new Set())
    expect(faltantes, `campos sin .describe(): ${faltantes.join(', ')}`).toEqual([])
  })

  it('el recorrido llega de verdad al fondo del esquema', () => {
    // Guardia del guardia: si el walker dejara de bajar (un cambio en cómo Zod
    // serializa, un $ref inesperado), el test de arriba pasaría vacío y no
    // vigilaría nada. Esto comprueba que sí visitó campos anidados.
    const rotos = camposSinDescripcion({ ...json, properties: {
      ...json.properties,
      // un campo de tercer nivel sin descripción, inyectado a mano
      tablas: { items: { properties: { filas: { items: { properties: { xx: {} } } } } } },
    } }, '', new Set())
    expect(rotos).toContain('tablas[].filas[].xx')
  })

  it('le dice al modelo que el delta va en su campo y no en el rótulo', () => {
    const kpi = json.properties?.kpis?.items?.properties
    expect(kpi?.delta?.description).toMatch(/aquí y solo aquí/i)
    expect(kpi?.rotulo?.description).toMatch(/sin la variación/i)
  })
})
