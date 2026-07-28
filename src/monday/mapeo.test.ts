import { describe, it, expect } from 'vitest'
import {
  UDN_DE_SALA, SALA_DE_UDN, FASE_DE_ESTATUS,
  estatusDeFase, fechaDeColumna, nombreEnMonday, queSinPrefijo,
} from './mapeo'
import { slugsDeSalas } from '@/temas'

/**
 * El mapeo con el tablero de Monday.
 *
 * Se prueba aparte del cliente porque es lo que hay que revisar cuando
 * alguien añada o renombre una etiqueta en el tablero, y porque un error aquí
 * no se ve: manda el acuerdo a la UDN equivocada, en un tablero que mira el
 * equipo entero.
 */

describe('salas y etiquetas de UdN', () => {
  it('las diez salas tienen etiqueta', () => {
    for (const slug of slugsDeSalas()) {
      expect(UDN_DE_SALA[slug], `falta la etiqueta de "${slug}"`).toBeTruthy()
    }
  })

  it('la vuelta es exacta: ninguna etiqueta apunta a dos salas', () => {
    expect(Object.keys(SALA_DE_UDN)).toHaveLength(Object.keys(UDN_DE_SALA).length)
    for (const [slug, etiqueta] of Object.entries(UDN_DE_SALA)) {
      expect(SALA_DE_UDN[etiqueta]).toBe(slug)
    }
  })

  it('una etiqueta que no es una sala nuestra no se traduce', () => {
    // "Más Salud" existe en el tablero y NO es una UDN de UPAX: es una entidad
    // aparte de Grupo Salinas. Un acuerdo suyo no debe caer en ninguna sala.
    expect(SALA_DE_UDN['Más Salud']).toBeUndefined()
    expect(SALA_DE_UDN['Reclutalia']).toBeUndefined()
  })
})

describe('estatus y fase', () => {
  it('cumplido va a Done y vuelve como cumplido', () => {
    expect(FASE_DE_ESTATUS.cumplido).toContain('Done')
    expect(estatusDeFase('✅ Done')).toBe('cumplido')
    expect(estatusDeFase('✅ Materiales listos')).toBe('cumplido')
  })

  it('cancelado no es cumplido: va a Detenido', () => {
    // El compromiso se dejó sin efecto, no se cumplió. Mandarlo a Done sería
    // apuntarse un logro que no pasó.
    expect(FASE_DE_ESTATUS.cancelado).toContain('Detenido')
  })

  it('vencido NO se escribe como tal', () => {
    // `vencido` se DERIVA de que la fecha quedó atrás. Escribirlo congelaría
    // en el tablero algo que cambia solo con el calendario, y mentiría en
    // cuanto alguien moviera la fecha.
    expect(FASE_DE_ESTATUS.vencido).toBe(FASE_DE_ESTATUS.abierto)
  })

  it('lo que está parado sigue contando como abierto, no como cumplido', () => {
    expect(estatusDeFase('🚫 Detenido')).toBe('abierto')
    expect(estatusDeFase('⏳Backlog')).toBe('abierto')
    expect(estatusDeFase('🚧 Sprint')).toBe('abierto')
    expect(estatusDeFase('👀 Review')).toBe('abierto')
    expect(estatusDeFase(null)).toBe('abierto')
  })
})

describe('fechaDeColumna', () => {
  it('lee una fecha normal', () => {
    expect(fechaDeColumna('2026-07-27')).toBe('2026-07-27')
    expect(fechaDeColumna({ date: '2026-08-19' })).toBe('2026-08-19')
  })

  it('una fecha BORRADA llega como objeto sin fecha, y es null', () => {
    // Salió mirando elementos reales del tablero: Monday devuelve
    // `{"changed_at": "…"}` cuando alguien vació la fecha. Leerlo sin
    // comprobar daría "[object Object]" por fecha compromiso.
    expect(fechaDeColumna({ changed_at: '2026-04-13T15:21:27.030Z' })).toBeNull()
  })

  it('sin fecha, null', () => {
    expect(fechaDeColumna(null)).toBeNull()
    expect(fechaDeColumna(undefined)).toBeNull()
    expect(fechaDeColumna('')).toBeNull()
    expect(fechaDeColumna('mañana')).toBeNull()
  })
})

describe('nombre en el tablero', () => {
  it('lleva el prefijo de la unidad, como el resto del tablero', () => {
    expect(nombreEnMonday('neracode', 'Definir el alcance del piloto')).toBe(
      'NC | Definir el alcance del piloto',
    )
    expect(nombreEnMonday('zeus', 'Cerrar cuentas objetivo')).toBe('Zeus | Cerrar cuentas objetivo')
  })

  it('al leer se quita, para que la sala no muestre "NC | …"', () => {
    expect(queSinPrefijo('NC | Definir el alcance')).toBe('Definir el alcance')
    expect(queSinPrefijo('Zeus | Product sheets')).toBe('Product sheets')
  })

  it('no destroza un texto que casualmente lleva una barra', () => {
    // "Revisar el brief | versión 3" no tiene prefijo: la barra viene tarde.
    expect(queSinPrefijo('Revisar el brief | versión 3')).toBe('Revisar el brief | versión 3')
    expect(queSinPrefijo('Sin barra ninguna')).toBe('Sin barra ninguna')
  })

  it('ida y vuelta conserva el texto', () => {
    const que = 'Entregar el plan de medios de agosto'
    expect(queSinPrefijo(nombreEnMonday('mexa-creativa', que))).toBe(que)
  })
})
