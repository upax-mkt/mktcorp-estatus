import { describe, it, expect } from 'vitest'
import { insertarAcuerdoEnMinuta } from './insertar-acuerdo'
import { ENCABEZADO_TABLA, TABLA_VACIA, ensamblarCorreo, formatearFechaTabla } from './ensamblar'

const NUEVO = { que: 'Mandar el anexo de precios', responsable: 'Iris Múgica', fechaCompromiso: '2026-09-01' }
/**
 * La fila se arma con `formatearFechaTabla`, la MISMA que escribe las demás
 * (lleva año: "1 sept 2026"). Se calcula aquí en vez de escribirla a mano
 * para que este archivo no fije un formato de fecha propio que pueda
 * separarse del que de verdad se pinta.
 */
const FILA_NUEVA = `Mandar el anexo de precios | Iris Múgica | ${formatearFechaTabla(NUEVO.fechaCompromiso)}`
const FILA_VIEJA = `Revisar la propuesta | David Porchini | ${formatearFechaTabla('2026-08-28')}`

/**
 * Franco: *"una vez creada la reunión y marcada completada se me olvida meter
 * un acuerdo, debo poder hacerlo y que también se refleje en la minuta ya
 * publicada"*, e integrado en la tabla, sin distinción.
 *
 * La minuta guardada es TEXTO PLANO: la tabla de acuerdos son líneas
 * `Acción | Owner | Fecha` dentro de él (ver `ensamblarCorreo`). Así que
 * insertar una fila es una operación de texto, y esta es su única
 * implementación — pura, para poder probarla contra minutas reales sin base
 * ni navegador.
 *
 * ⚠️ DEVUELVE `null` CUANDO NO ENCUENTRA DÓNDE, y no adivina. Una minuta
 * cargada a mano o corregida hasta perder la tabla no tiene un sitio evidente
 * donde meter la fila; escribirla "donde sea" deja un correo peor que el que
 * había, y quien lo lea no sabrá que un programa lo tocó. El llamador avisa.
 */
describe('insertarAcuerdoEnMinuta', () => {
  it('mete la fila al final de la tabla, respetando el formato de las que ya están', () => {
    const texto = [
      'Hola equipo,',
      '',
      'Acuerdos',
      ENCABEZADO_TABLA,
      FILA_VIEJA,
      'Cerrar el brief | César Mejía | 1 sept 2026',
      '',
      'Saludos,',
    ].join('\n')

    const salida = insertarAcuerdoEnMinuta(texto, NUEVO)!

    const lineas = salida.split('\n')
    expect(lineas[6]).toBe(FILA_NUEVA)
    // Y no toca nada más: ni el saludo, ni las filas que ya estaban.
    expect(lineas[4]).toBe(FILA_VIEJA)
    expect(lineas.at(-1)).toBe('Saludos,')
  })

  it('una minuta sin acuerdos estrena tabla: el texto de vacío deja de mentir', () => {
    const texto = ['Acuerdos', TABLA_VACIA, '', 'Saludos,'].join('\n')

    const salida = insertarAcuerdoEnMinuta(texto, NUEVO)!

    expect(salida).not.toContain(TABLA_VACIA)
    expect(salida).toContain(ENCABEZADO_TABLA)
    expect(salida).toContain(FILA_NUEVA)
  })

  it('sin fecha compromiso, la celda dice lo mismo que dicen las demás sin fecha', () => {
    const texto = [ENCABEZADO_TABLA, 'Algo | Alguien | 28 ago 2026'].join('\n')

    const salida = insertarAcuerdoEnMinuta(texto, { ...NUEVO, fechaCompromiso: null })!

    expect(salida.split('\n').at(-1)).toBe('Mandar el anexo de precios | Iris Múgica | por definir')
  })

  it('sin tabla ninguna, devuelve null en vez de escribir donde no toca', () => {
    expect(insertarAcuerdoEnMinuta('Hola equipo,\n\nGracias por la sesión.\n\nSaludos,', NUEVO)).toBeNull()
  })

  it('con la tabla al final del texto, la fila cae después de la última y no se pierde', () => {
    const texto = [ENCABEZADO_TABLA, 'Algo | Alguien | 28 ago 2026'].join('\n')

    const salida = insertarAcuerdoEnMinuta(texto, NUEVO)!

    expect(salida.split('\n')).toHaveLength(3)
  })

  /**
   * El caso que de verdad importa: una minuta REAL, salida de `ensamblarCorreo`
   * —no una fixture escrita a mano que se parezca—. Si el formato de la tabla
   * cambia allá, este test cae aquí.
   */
  it('funciona sobre una minuta ensamblada de verdad, no sobre una imitación', () => {
    const texto = ensamblarCorreo(
      'mexa-creativa',
      ['Repasamos el trimestre.', 'Todo en orden.', 'Cierre.'],
      [{ que: 'Revisar la propuesta', responsable: 'David Porchini', fechaCompromiso: '2026-08-28', prioridad: 'media' }],
    )

    const salida = insertarAcuerdoEnMinuta(texto, NUEVO)!

    expect(salida).toContain(FILA_VIEJA)
    expect(salida).toContain(FILA_NUEVA)
    // La fila nueva va PEGADA a la anterior, dentro de la misma tabla — no
    // suelta al final del correo, detrás de la despedida.
    const lineas = salida.split('\n')
    expect(lineas.indexOf(FILA_NUEVA)).toBe(lineas.indexOf(FILA_VIEJA) + 1)
  })
})
