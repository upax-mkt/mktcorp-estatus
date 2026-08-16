import { describe, it, expect } from 'vitest'
import { PLANTILLAS, obtenerPlantilla } from './plantillas'

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
   * compartido (`SelectorClaseDeJunta`) da por hecho: "En blanco" es la
   * ÚNICA entrada con `esClaseDeJunta: false`, todas las demás lo tienen en
   * `true`, y `obtenerPlantilla('en-blanco').esClaseDeJunta` sigue siendo
   * `false` — nadie la reclasifica por accidente.
   */
  it('"en-blanco" es la única entrada que NO es una clase de junta', () => {
    const noClases = PLANTILLAS.filter((p) => !p.esClaseDeJunta)
    expect(noClases.map((p) => p.id)).toEqual(['en-blanco'])
  })

  it('toda clase de junta real declara esClaseDeJunta: true', () => {
    const clases = PLANTILLAS.filter((p) => p.id !== 'en-blanco')
    for (const p of clases) {
      expect(p.esClaseDeJunta, `"${p.id}" debería ser una clase de junta`).toBe(true)
    }
  })

  it('obtenerPlantilla("en-blanco") sigue trayendo esClaseDeJunta: false', () => {
    expect(obtenerPlantilla('en-blanco').esClaseDeJunta).toBe(false)
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
    // items completos de las cinco plantillas.
    for (const p of PLANTILLAS) {
      for (const item of p.items) {
        expect(item.layout, `${p.id} → ${item.tipo}`).toBeDefined()
      }
    }
  })
})
