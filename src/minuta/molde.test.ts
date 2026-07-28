import { describe, it, expect } from 'vitest'
import { MOLDE_POR_DEFECTO, moldeODefecto, loQueFaltaAlMolde, type MoldeMinuta } from './molde'
import { ensamblarCorreo } from './generar'
import { construirPromptMinuta } from './prompt'

/**
 * El molde de la minuta, ahora editable.
 * Franco: "el módulo minutas debería tener un editor del template del tipo de
 * minuta". Lo que se prueba aquí es que hacerlo editable NO cambió lo que
 * recibe quien no lo edita.
 */

const ACUERDOS = [
  { que: 'Cerrar cuentas objetivo', responsable: 'Ileana Cruz', prioridad: 'alta', fechaCompromiso: '2026-08-01' },
  { que: 'Revisar el brief', responsable: 'por asignar', prioridad: 'media', fechaCompromiso: null },
]

describe('el molde de siempre', () => {
  it('trae saludo, entradilla, los cuatro bloques, la tabla y el cierre', () => {
    const correo = ensamblarCorreo(
      'neracode',
      ['El objetivo.', 'Los temas.', 'Lo que sigue.'],
      ACUERDOS,
    )
    expect(correo.startsWith('Hola, equipo:')).toBe(true)
    expect(correo).toContain('Objetivo de la reunión')
    expect(correo).toContain('Temas generales y acuerdos')
    expect(correo).toContain('Acuerdos y accionables')
    expect(correo).toContain('Acción | Owner | Fecha')
    expect(correo).toContain('Próximos pasos')
    expect(correo).toContain('/cliente/neracode')
    expect(correo).toContain('con gusto lo revisamos')
  })

  it('sin fecha, la tabla dice "por definir" y no inventa una', () => {
    const correo = ensamblarCorreo('neracode', ['a', 'b', 'd'], ACUERDOS)
    expect(correo).toContain('por definir')
  })
})

describe('un molde propio', () => {
  const COMITE: MoldeMinuta = {
    saludo: 'Estimados,',
    entradilla: '',
    bloques: [
      { titulo: 'Qué se decidió', guia: 'La decisión, en una frase.' },
      { titulo: 'Compromisos', guia: '', conTabla: true },
    ],
    cierre: '',
    conEnlace: false,
  }

  it('manda: sus bloques, su orden y su saludo', () => {
    const correo = ensamblarCorreo('zeus', ['Se aprobó el presupuesto.'], ACUERDOS, COMITE)
    expect(correo.startsWith('Estimados,')).toBe(true)
    expect(correo).toContain('Qué se decidió')
    expect(correo).toContain('Se aprobó el presupuesto.')
    expect(correo).toContain('Compromisos')
    expect(correo).not.toContain('Objetivo de la reunión')
    expect(correo).not.toContain('Próximos pasos')
  })

  it('sin enlace, no cuela el enlace', () => {
    const correo = ensamblarCorreo('zeus', ['x'], ACUERDOS, COMITE)
    expect(correo).not.toContain('/cliente/')
  })

  it('la tabla va donde el molde la puso, no al final por costumbre', () => {
    const correo = ensamblarCorreo('zeus', ['x'], ACUERDOS, COMITE)
    expect(correo.indexOf('Acción | Owner')).toBeGreaterThan(correo.indexOf('Compromisos'))
  })

  it('una reunión sin sala enlaza a su documento, no a la raíz', () => {
    const correo = ensamblarCorreo(null, ['x', 'y', 'z'], ACUERDOS, MOLDE_POR_DEFECTO, 'abc-123')
    expect(correo).toContain('/reunion/abc-123')
  })
})

describe('lo que se comprueba AL GUARDAR el molde, no al usarlo', () => {
  // Descubrir que el molde no sirve cuando ya se pegó la transcripción de una
  // reunión de una hora es descubrirlo tarde.
  it('sin bloque marcado para la tabla, lo dice', () => {
    const sinTabla: MoldeMinuta = {
      saludo: 'Hola,', entradilla: '', cierre: '', conEnlace: true,
      bloques: [{ titulo: 'Todo', guia: '' }],
    }
    expect(loQueFaltaAlMolde(sinTabla)).toContain('marcar en qué bloque va la tabla de acuerdos')
  })

  it('con la tabla en dos bloques, también', () => {
    const dosTablas: MoldeMinuta = {
      saludo: 'Hola,', entradilla: '', cierre: '', conEnlace: true,
      bloques: [{ titulo: 'A', guia: '', conTabla: true }, { titulo: 'B', guia: '', conTabla: true }],
    }
    expect(loQueFaltaAlMolde(dosTablas)).toContain('dejar la tabla de acuerdos en un solo bloque')
  })

  it('el molde de siempre no le falta nada', () => {
    expect(loQueFaltaAlMolde(MOLDE_POR_DEFECTO)).toEqual([])
  })
})

describe('moldeODefecto', () => {
  it('lo guardado, si es válido', () => {
    const propio: MoldeMinuta = {
      saludo: 'Hey,', entradilla: '', cierre: '', conEnlace: false,
      bloques: [{ titulo: 'X', guia: '', conTabla: true }],
    }
    expect(moldeODefecto(propio).saludo).toBe('Hey,')
  })

  it('el de siempre, si lo guardado es basura', () => {
    // Un molde corrupto no puede dejar sin minuta a nadie: se cae al de
    // siempre, que es el que ya funcionaba.
    expect(moldeODefecto({ hola: 1 })).toEqual(MOLDE_POR_DEFECTO)
    expect(moldeODefecto(null)).toEqual(MOLDE_POR_DEFECTO)
  })
})

describe('el bloque de la tabla no se redacta', () => {
  /**
   * Salió probando el motor en producción. Al bloque marcado con `conTabla` se
   * le pedía texto con la nota "la tabla la pone el sistema, no la escribas", y
   * el modelo obedecía a medias: no escribía la tabla, pero sí un párrafo
   * resumiendo los mismos compromisos que la tabla lista debajo. El correo
   * decía dos veces lo mismo, una en prosa y otra en filas.
   */
  it('al modelo solo se le piden los bloques que sí redacta', () => {
    const { user } = construirPromptMinuta(
      { salaNombre: 'NeraCode', tipo: 'mensual', alcance: 'todos', fecha: '2026-07-28T12:00:00.000Z' },
      'transcripción',
    )
    // El molde de siempre tiene 4 bloques y uno es el de la tabla.
    expect(user).toContain('Los 3 bloques que tienes que redactar')
    expect(user).not.toContain('«Acuerdos y accionables»')
  })

  it('el texto se reparte SALTÁNDOSE el bloque de la tabla', () => {
    // Si el índice avanzara con todos los bloques, el de la tabla se comería
    // el texto del siguiente y el correo saldría corrido una posición:
    // "Próximos pasos" llevaría el texto de los temas.
    const correo = ensamblarCorreo(
      'neracode',
      ['EL-OBJETIVO', 'LOS-TEMAS', 'LO-QUE-SIGUE'],
      ACUERDOS,
    )
    const pos = (t: string) => correo.indexOf(t)
    expect(pos('EL-OBJETIVO')).toBeGreaterThan(pos('Objetivo de la reunión'))
    expect(pos('LOS-TEMAS')).toBeGreaterThan(pos('Temas generales y acuerdos'))
    expect(pos('LO-QUE-SIGUE')).toBeGreaterThan(pos('Próximos pasos'))
    // Y entre la tabla y "Próximos pasos" no se cuela ningún texto del modelo.
    expect(correo.slice(pos('Acuerdos y accionables'), pos('Próximos pasos'))).not.toContain('LO-QUE-SIGUE')
  })

  it('con dos bloques redactables y la tabla en medio, el orden se respeta', () => {
    const molde: MoldeMinuta = {
      saludo: 'Hola,', entradilla: '', cierre: '', conEnlace: false,
      bloques: [
        { titulo: 'Antes', guia: '' },
        { titulo: 'Compromisos', guia: '', conTabla: true },
        { titulo: 'Después', guia: '' },
      ],
    }
    const correo = ensamblarCorreo('zeus', ['UNO', 'DOS'], ACUERDOS, molde)
    expect(correo.indexOf('UNO')).toBeGreaterThan(correo.indexOf('Antes'))
    expect(correo.indexOf('DOS')).toBeGreaterThan(correo.indexOf('Después'))
    expect(correo.indexOf('Acción | Owner')).toBeLessThan(correo.indexOf('Después'))
  })
})
