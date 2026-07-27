import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { claveDeEquipoCorrecta, hayAuth, hayClaveDeEquipo, secretoConfigurado } from './sesion'

/**
 * Solo lo que no toca cookies: la lectura del entorno y la comparación de la
 * clave. Abrir y cerrar sesión necesita un request de Next vivo y se verifica
 * end-to-end contra el servidor, no aquí.
 */

const ENTORNO = { ...process.env }

beforeEach(() => {
  delete process.env.SESSION_SECRET
  delete process.env.CLAVE_EQUIPO
})

afterEach(() => {
  process.env = { ...ENTORNO }
})

describe('configuración del acceso', () => {
  it('sin SESSION_SECRET no hay forma de autenticar a nadie', () => {
    expect(secretoConfigurado()).toBeNull()
    expect(hayAuth()).toBe(false)
  })

  it('un secreto en blanco cuenta como ausente', () => {
    process.env.SESSION_SECRET = '   '
    expect(hayAuth()).toBe(false)
  })

  it('reconoce un secreto configurado', () => {
    process.env.SESSION_SECRET = 'algo-secreto'
    expect(hayAuth()).toBe(true)
  })

  it('reconoce si hay clave de equipo', () => {
    expect(hayClaveDeEquipo()).toBe(false)
    process.env.CLAVE_EQUIPO = 'la-del-equipo'
    expect(hayClaveDeEquipo()).toBe(true)
  })
})

describe('claveDeEquipoCorrecta', () => {
  it('acepta la clave exacta', async () => {
    process.env.CLAVE_EQUIPO = 'la-del-equipo'
    expect(await claveDeEquipoCorrecta('la-del-equipo')).toBe(true)
  })

  it('rechaza cualquier otra', async () => {
    process.env.CLAVE_EQUIPO = 'la-del-equipo'
    for (const intento of ['', 'otra', 'la-del-equip', 'la-del-equipo ', 'LA-DEL-EQUIPO']) {
      expect(await claveDeEquipoCorrecta(intento)).toBe(false)
    }
  })

  it('sin clave configurada no entra nadie, ni con la cadena vacía', async () => {
    expect(await claveDeEquipoCorrecta('')).toBe(false)
    expect(await claveDeEquipoCorrecta('lo que sea')).toBe(false)
  })

  it('una clave configurada en blanco tampoco abre la puerta', async () => {
    process.env.CLAVE_EQUIPO = '   '
    expect(await claveDeEquipoCorrecta('   ')).toBe(false)
  })
})
