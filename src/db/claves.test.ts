import { describe, it, expect } from 'vitest'
import { generarClave } from './claves'

/**
 * Las claves de sala.
 *
 * Lo que se puede probar sin base de datos es la GENERACIÓN, que es donde
 * vive la decisión de diseño: la clave la teclea alguien en un móvil después
 * de recibirla por Slack, así que tiene que poder dictarse.
 */
describe('generarClave', () => {
  it('tiene la forma palabra-palabra-número', () => {
    expect(generarClave()).toMatch(/^[a-z]+-[a-z]+-\d{4}$/)
  })

  it('no lleva acentos, eñes ni mayúsculas', () => {
    // Va a viajar por WhatsApp y a escribirse en un móvil: una "ñ" o una
    // tilde en una clave es una llamada de vuelta preguntando cómo se escribe.
    for (let i = 0; i < 200; i++) {
      expect(generarClave()).toMatch(/^[a-z0-9-]+$/)
    }
  })

  it('no se repite en tandas grandes', () => {
    const muestras = new Set(Array.from({ length: 500 }, generarClave))
    // Con 24 palabras y 9000 números el espacio es de ~5 millones; 500
    // muestras con más de un choque señalarían un generador sesgado.
    expect(muestras.size).toBeGreaterThan(495)
  })
})
