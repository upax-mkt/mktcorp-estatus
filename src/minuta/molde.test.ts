import { describe, it, expect } from 'vitest'
import { MOLDE_POR_DEFECTO, moldeODefecto, loQueFaltaAlMolde, type MoldeMinuta } from './molde'
import { ensamblarCorreo } from './generar'

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
  it('produce el MISMO correo que antes de que fuera editable', () => {
    // Es el contrato con quien ya usaba la herramienta: hacer algo
    // configurable no puede cambiarle el resultado a quien no lo configura.
    const correo = ensamblarCorreo(
      'neracode',
      ['El objetivo.', 'Los temas.', '', 'Lo que sigue.'],
      ACUERDOS,
    )
    expect(correo.startsWith('Hola equipo,')).toBe(true)
    expect(correo).toContain('Objetivo de la reunión')
    expect(correo).toContain('Temas generales y acuerdos')
    expect(correo).toContain('Acuerdos y accionables')
    expect(correo).toContain('Acción | Squad | Owner | Prioridad | Fecha compromiso')
    expect(correo).toContain('Próximos pasos')
    expect(correo).toContain('Sesión: /sala/neracode')
  })

  it('sin fecha, la tabla dice "por definir" y no inventa una', () => {
    const correo = ensamblarCorreo('neracode', ['a', 'b', '', 'd'], ACUERDOS)
    expect(correo).toContain('por definir')
  })
})

describe('un molde propio', () => {
  const COMITE: MoldeMinuta = {
    saludo: 'Estimados,',
    bloques: [
      { titulo: 'Qué se decidió', guia: 'La decisión, en una frase.' },
      { titulo: 'Compromisos', guia: '', conTabla: true },
    ],
    conEnlace: false,
  }

  it('manda: sus bloques, su orden y su saludo', () => {
    const correo = ensamblarCorreo('zeus', ['Se aprobó el presupuesto.', ''], ACUERDOS, COMITE)
    expect(correo.startsWith('Estimados,')).toBe(true)
    expect(correo).toContain('Qué se decidió')
    expect(correo).toContain('Se aprobó el presupuesto.')
    expect(correo).toContain('Compromisos')
    expect(correo).not.toContain('Objetivo de la reunión')
    expect(correo).not.toContain('Próximos pasos')
  })

  it('sin enlace, no cuela el enlace', () => {
    const correo = ensamblarCorreo('zeus', ['x', ''], ACUERDOS, COMITE)
    expect(correo).not.toContain('Sesión:')
  })

  it('la tabla va donde el molde la puso, no al final por costumbre', () => {
    const correo = ensamblarCorreo('zeus', ['x', ''], ACUERDOS, COMITE)
    expect(correo.indexOf('Acción | Squad')).toBeGreaterThan(correo.indexOf('Compromisos'))
  })

  it('una reunión sin sala enlaza a su documento, no a la raíz', () => {
    const correo = ensamblarCorreo(null, ['x', 'y', '', 'z'], ACUERDOS, MOLDE_POR_DEFECTO, 'abc-123')
    expect(correo).toContain('/sesion/abc-123')
  })
})

describe('lo que se comprueba AL GUARDAR el molde, no al usarlo', () => {
  // Descubrir que el molde no sirve cuando ya se pegó la transcripción de una
  // reunión de una hora es descubrirlo tarde.
  it('sin bloque marcado para la tabla, lo dice', () => {
    const sinTabla: MoldeMinuta = { saludo: 'Hola,', bloques: [{ titulo: 'Todo', guia: '' }], conEnlace: true }
    expect(loQueFaltaAlMolde(sinTabla)).toContain('marcar en qué bloque va la tabla de acuerdos')
  })

  it('con la tabla en dos bloques, también', () => {
    const dosTablas: MoldeMinuta = {
      saludo: 'Hola,',
      bloques: [{ titulo: 'A', guia: '', conTabla: true }, { titulo: 'B', guia: '', conTabla: true }],
      conEnlace: true,
    }
    expect(loQueFaltaAlMolde(dosTablas)).toContain('dejar la tabla de acuerdos en un solo bloque')
  })

  it('el molde de siempre no le falta nada', () => {
    expect(loQueFaltaAlMolde(MOLDE_POR_DEFECTO)).toEqual([])
  })
})

describe('moldeODefecto', () => {
  it('lo guardado, si es válido', () => {
    const propio: MoldeMinuta = { saludo: 'Hey,', bloques: [{ titulo: 'X', guia: '', conTabla: true }], conEnlace: false }
    expect(moldeODefecto(propio).saludo).toBe('Hey,')
  })

  it('el de siempre, si lo guardado es basura', () => {
    // Un molde corrupto no puede dejar sin minuta a nadie: se cae al de
    // siempre, que es el que ya funcionaba.
    expect(moldeODefecto({ hola: 1 })).toEqual(MOLDE_POR_DEFECTO)
    expect(moldeODefecto(null)).toEqual(MOLDE_POR_DEFECTO)
  })
})
