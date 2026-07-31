import { describe, it, expect } from 'vitest'
import {
  UDN_DE_SALA, SALA_DE_UDN, FASE_DE_ESTATUS,
  estatusDeFase, fechaDeColumna, nombreEnMonday, queSinPrefijo, columnasDe, COLUMNA_ELEMENTO, COLUMNA_SUBELEMENTO, INDICE_UDN,
} from './mapeo'
import { slugsDeSalas } from '@/db/temas'

/**
 * El mapeo con el tablero de Monday.
 *
 * Se prueba aparte del cliente porque es lo que hay que revisar cuando
 * alguien añada o renombre una etiqueta en el tablero, y porque un error aquí
 * no se ve: manda el acuerdo a la UDN equivocada, en un tablero que mira el
 * equipo entero.
 */

describe('salas y etiquetas de UdN', () => {
  it('las nueve salas tienen etiqueta', async () => {
    for (const slug of await slugsDeSalas()) {
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

  it('cancelado va a Detenido y VUELVE como cancelado — la simetría que exige la vuelta (tarea 9)', () => {
    // El compromiso se dejó sin efecto, no se cumplió. Mandarlo a Done sería
    // apuntarse un logro que no pasó.
    expect(FASE_DE_ESTATUS.cancelado).toContain('Detenido')

    // Hasta la tarea 9, "Detenido → abierto" era inofensivo: esta función
    // solo alimentaba texto informativo. Desde que `reconciliar` usa su
    // resultado para ESCRIBIR de vuelta en nuestra base (ver
    // refrescarDesdeMonday en src/db/acuerdos.ts), esa asimetría resucitaba
    // como abierto a cualquier acuerdo cancelado en cuanto se sincronizaba:
    // al cancelar aquí escribimos "🚫 Detenido" en Monday con un updated_at
    // necesariamente posterior a nuestro updatedAt local (la escritura a
    // Monday siempre pasa DESPUÉS de guardar aquí), así que el siguiente
    // refresh daba SIEMPRE gana-monday. No hacía falta que nadie más tocara
    // nada en Monday. Ver el ciclo completo en
    // src/db/refrescar-desde-monday-cancelado.test.ts.
    expect(estatusDeFase('🚫 Detenido')).toBe('cancelado')
  })

  it('vencido NO se escribe como tal', () => {
    // `vencido` se DERIVA de que la fecha quedó atrás. Escribirlo congelaría
    // en el tablero algo que cambia solo con el calendario, y mentiría en
    // cuanto alguien moviera la fecha.
    expect(FASE_DE_ESTATUS.vencido).toBe(FASE_DE_ESTATUS.abierto)
  })

  it('las demás fases de trabajo en curso cuentan como abierto, no como cumplido ni cancelado', () => {
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

describe('columnas por destino', () => {
  it('un elemento y un subelemento no comparten ni una sola columna de estado', () => {
    expect(COLUMNA_ELEMENTO.udn).toBe('color_mm0ex2j0')
    expect(COLUMNA_SUBELEMENTO.udn).toBe('color_mm15emh7')
    expect(COLUMNA_ELEMENTO.fase).not.toBe(COLUMNA_SUBELEMENTO.fase)
    expect(COLUMNA_ELEMENTO.deadline).not.toBe(COLUMNA_SUBELEMENTO.deadline)
  })

  it('la columna de personas sí se llama igual en los dos', () => {
    expect(COLUMNA_ELEMENTO.responsable).toBe('person')
    expect(COLUMNA_SUBELEMENTO.responsable).toBe('person')
  })

  it('columnasDe devuelve el juego que toca', () => {
    expect(columnasDe('elemento')).toBe(COLUMNA_ELEMENTO)
    expect(columnasDe('subelemento')).toBe(COLUMNA_SUBELEMENTO)
  })

  it('cada sala tiene el índice de su etiqueta de UdN, que es lo que acepta el filtro', () => {
    expect(INDICE_UDN['mexa-creativa']).toBe(1)
    expect(INDICE_UDN['research-land']).toBe(156)
    expect(INDICE_UDN['marketing-united']).toBe(105)
    expect(Object.keys(INDICE_UDN)).toHaveLength(Object.keys(UDN_DE_SALA).length)
  })
})
