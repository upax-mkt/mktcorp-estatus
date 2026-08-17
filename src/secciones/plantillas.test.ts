import { describe, it, expect } from 'vitest'
import { PLANTILLAS, obtenerPlantilla } from './plantillas'
import { aDecision } from './borrador'

/**
 * EL CATÁLOGO DE PLANTILLAS, Y SU ORDEN.
 *
 * `PLANTILLAS` no es solo una lista de clases de junta: es también el orden
 * en el que el desplegable las ofrece, y ahí sí importa qué va primero. Estos
 * tests fijan dos cosas de la ronda 14.2:
 *
 * - Que el Sync Comercial —la junta semanal que el equipo ya está llevando en
 *   las salas— exista en el catálogo.
 * - Que "En blanco" deje la segunda posición, donde se elige por descuido, y
 *   pase al final: no es una clase de junta, es la salida de emergencia.
 */

describe('el catálogo de plantillas', () => {
  it('el catálogo ofrece Sync Comercial, la junta semanal que el equipo lleva en las salas', () => {
    const sync = PLANTILLAS.find((p) => p.id === 'sync-comercial')
    expect(sync).toBeDefined()
    expect(sync!.seccionesFijas).toBe(false)
  })

  it('"En blanco" va al final: es la salida de emergencia, no una clase de junta', () => {
    expect(PLANTILLAS[PLANTILLAS.length - 1].id).toBe('en-blanco')
  })

  /**
   * TAREA 2 (ronda 14.2): "no es una clase de junta" tiene que estar
   * MODELADO en el catálogo, no adivinado comparando ids a mano en cada
   * `<select>` que lo consume. Estos tests fijan lo que el componente
   * compartido (`SelectorClaseDeJunta`) da por hecho: "En blanco" y
   * "Plantilla completa" (ronda 15, tarea 3 — una GALERÍA de plantilla, no
   * una clase de reunión) son las ÚNICAS entradas con `esClaseDeJunta:
   * false`, todas las demás lo tienen en `true`, y sus
   * `obtenerPlantilla(id).esClaseDeJunta` siguen siendo `false` — nadie las
   * reclasifica por accidente.
   */
  it('"en-blanco" y "plantilla-completa" son las únicas entradas que NO son clase de junta', () => {
    const noClases = PLANTILLAS.filter((p) => !p.esClaseDeJunta)
    // Orden del catálogo: "plantilla-completa" vive justo antes de
    // "en-blanco", que se queda como la última entrada de todo `PLANTILLAS`
    // (ver el test "va al final", arriba).
    expect(noClases.map((p) => p.id)).toEqual(['plantilla-completa', 'en-blanco'])
  })

  it('toda clase de junta real declara esClaseDeJunta: true', () => {
    const noClases = new Set(['en-blanco', 'plantilla-completa'])
    const clases = PLANTILLAS.filter((p) => !noClases.has(p.id))
    for (const p of clases) {
      expect(p.esClaseDeJunta, `"${p.id}" debería ser una clase de junta`).toBe(true)
    }
  })

  it('obtenerPlantilla("en-blanco") y obtenerPlantilla("plantilla-completa") siguen trayendo esClaseDeJunta: false', () => {
    expect(obtenerPlantilla('en-blanco').esClaseDeJunta).toBe(false)
    expect(obtenerPlantilla('plantilla-completa').esClaseDeJunta).toBe(false)
  })

  it('toda plantilla nace al menos con su portada', () => {
    for (const p of PLANTILLAS) {
      expect(p.items[0].layout).toBe('portada')
    }
  })

  it('toda sección de toda plantilla declara su layout, no solo la primera', () => {
    // `crearDocumentoConPlantilla` (src/db/documentos.ts) siembra el
    // documento con `layout: d.layout` tal cual, sin red: un `layout`
    // ausente nace en el editor como "falta un tipo de sección válido"
    // desde el minuto uno, no como una sección lista para llenar. El test de
    // arriba solo miraba `items[0]` (la portada) y por eso no cazó que al
    // segundo item de `sync-comercial` le faltaba el suyo — este mira los
    // items completos de las seis plantillas.
    for (const p of PLANTILLAS) {
      for (const item of p.items) {
        expect(item.layout, `${p.id} → ${item.tipo}`).toBeDefined()
      }
    }
  })
})

/**
 * "PLANTILLA COMPLETA" (ronda 15, tareas 2 y 3): las 18 secciones del
 * estatus de Mexa Creativa, junio 2026, con el mismo orden y los mismos
 * layouts — pero TODO su contenido en lorem ipsum. Ver el comentario de
 * `PLANTILLA_COMPLETA_ITEMS`, más arriba en `plantillas.ts`, para el
 * porqué de la composición.
 */
describe('"plantilla completa": 18 secciones, mismo orden, contenido en lorem ipsum', () => {
  const plantilla = obtenerPlantilla('plantilla-completa')

  it('vive en el catálogo, fuera del grupo de clases de junta', () => {
    expect(plantilla.id).toBe('plantilla-completa')
    expect(plantilla.esClaseDeJunta).toBe(false)
    expect(plantilla.seccionesFijas).toBe(false)
  })

  it('trae exactamente 18 secciones, con los mismos 12 layouts del deck de Mexa, en el mismo orden', () => {
    // Layouts, en orden, tal como los lee el enunciado de la tarea (y tal
    // como los produce `scripts/montar-mexa-junio-2026.ts` para el documento
    // real 8c9c6082-7aa3-4fc6-a5ca-ba22d144e078, sala `mexa-creativa`).
    expect(plantilla.items.map((i) => i.layout)).toEqual([
      'portada',
      'agenda',
      'kpis-fila-dos-columnas',
      'divisor-seccion',
      'pendientes-semaforo',
      'divisor-seccion',
      'texto-multicolumna',
      'divisor-seccion',
      'comparativa-periodos',
      'kpis-fila-dos-columnas',
      'grafico-y-tabla',
      'divisor-seccion',
      'meta-real-porcentaje',
      'matriz-estados',
      'tarjetas-numeradas',
      'grafico-y-tabla',
      'texto-multicolumna',
      'cierre',
    ])
  })

  it('cada item trae su propio `contenido` — nace lleno, no solo con el layout', () => {
    for (const item of plantilla.items) {
      expect(item.contenido, `"${item.tipo}" debería traer contenido inicial`).toBeDefined()
      // Mismo layout en los dos lados: `item.layout` (lo que exige el test de
      // arriba) y `item.contenido!.layout` (lo que de verdad se siembra en
      // `contenido.seccion`, ver `crearDocumentoConPlantilla`) no pueden
      // divergir sin que el documento nazca con una sección que dice ser una
      // cosa y se comporta como otra.
      expect(item.contenido!.layout).toBe(item.layout)
    }
  })

  it('cada sección pasa el mismo validador que corre al maquetar (aDecision)', () => {
    // El mismo chequeo que hace `montar-mexa-junio-2026.ts` antes de escribir
    // nada: si una sección no valida aquí, tampoco lo haría al maquetar el
    // documento real, y es mejor enterarse en el catálogo que en producción.
    for (const item of plantilla.items) {
      const resultado = aDecision(item.contenido!, item.titulo)
      expect(resultado.ok, `"${item.tipo}": ${resultado.ok ? '' : resultado.motivo}`).toBe(true)
    }
  })

  it('ni una cifra ni una frase real del deck de Mexa viaja a la plantilla', () => {
    // Guardia contra el riesgo entero de esta tarea: que un dato de Mexa
    // Creativa (un cliente real) se cuele en una plantilla que cualquier
    // otra sala puede elegir y presentar como propia. Cadenas literales
    // tomadas del estatus real (`scripts/montar-mexa-junio-2026.ts`): cifras,
    // nombres de personas y de cuentas, y fechas de esa sesión en particular.
    const prohibidas = [
      '2,519', '3,591', '1,000', '807', 'Momcozy', 'Viva Aerobus', 'Xiaomi',
      'Johnny Walker', 'Grupo IUSA', 'Barcel', 'Chanel', 'Hershey', 'Chirey',
      'Valentina Ochoa', 'Ileana Cruz', 'Fernando Borges', 'César Mejía',
      'Jose Luis', 'Mexa', 'Junio 2026', '12 de mayo', '29 de mayo',
      '39.4 MDP', '37.2', 'CreatorPlace', 'LizBetSoft', 'Carpentier BET',
      'Mutuus', 'presta-prenda', 'Grupo UPAX', 'Research Land', 'Promo Espacio',
      'Marketing United', 'House of Films', 'NeraCode',
    ]
    const bruto = JSON.stringify(plantilla.items)
    for (const dato of prohibidas) {
      expect(bruto.includes(dato), `"${dato}" (dato real de Mexa) apareció en la plantilla`).toBe(false)
    }
  })
})
