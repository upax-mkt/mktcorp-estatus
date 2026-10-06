import { describe, it, expect, afterEach } from 'vitest'
import { claveCorrecta, claveConfigurada } from './clave'
import type { PresentacionWeb } from './registro'

const P: PresentacionWeb = {
  id: 'prueba', titulo: 'Prueba', bajada: '', fecha: '2026-10-06',
  lugar: { tipo: 'sala', sala: 'research-land' }, claveEnv: 'CLAVE_PRESENTACION_PRUEBA',
}

afterEach(() => { delete process.env.CLAVE_PRESENTACION_PRUEBA })

describe('clave sencilla de una presentación', () => {
  it('sin la variable de entorno nadie entra, ni con la cadena vacía', async () => {
    expect(claveConfigurada(P)).toBe(false)
    expect(await claveCorrecta(P, '')).toBe(false)
    expect(await claveCorrecta(P, 'lo-que-sea')).toBe(false)
  })

  it('acepta la clave sin importar mayúsculas ni espacios de los bordes', async () => {
    process.env.CLAVE_PRESENTACION_PRUEBA = 'Lupa27'
    expect(claveConfigurada(P)).toBe(true)
    expect(await claveCorrecta(P, 'lupa27')).toBe(true)
    expect(await claveCorrecta(P, '  LUPA27 ')).toBe(true)
  })

  it('rechaza una clave distinta y la vacía', async () => {
    process.env.CLAVE_PRESENTACION_PRUEBA = 'lupa27'
    expect(await claveCorrecta(P, 'lupa28')).toBe(false)
    expect(await claveCorrecta(P, '')).toBe(false)
  })

  it('una presentación sin clave declarada no se abre por clave', async () => {
    const sinClave: PresentacionWeb = { ...P, claveEnv: undefined }
    expect(claveConfigurada(sinClave)).toBe(false)
    expect(await claveCorrecta(sinClave, 'lupa27')).toBe(false)
  })
})
