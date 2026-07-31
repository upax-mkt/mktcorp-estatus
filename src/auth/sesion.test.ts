import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  claveDeEquipoCorrecta, claveDeEquipoSigueSirviendo, hayAuth, hayClaveDeEquipo, secretoConfigurado,
} from './sesion'
import { hayAlgunaPersona } from '@/db/directorio'

/**
 * Solo lo que no toca cookies: la lectura del entorno, la comparación de la
 * clave, y la decisión del portillo de emergencia (que tampoco toca cookies —
 * solo lee `hayAlgunaPersona()`). Abrir y cerrar sesión necesita un request
 * de Next vivo y se verifica end-to-end contra el servidor, no aquí.
 */

vi.mock('@/db/directorio', () => ({
  hayAlgunaPersona: vi.fn(),
}))

const hayAlgunaPersonaMock = vi.mocked(hayAlgunaPersona)

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

/**
 * EL PORTILLO DE EMERGENCIA (ronda 9, tarea 2 — corrección post-revisión).
 *
 * Es la pieza de más riesgo de toda la ronda sin cobertura hasta ahora: si
 * esta condición se invierte por accidente, o el directorio queda vacío en
 * producción, nadie —tampoco Franco— puede entrar. Se prueba aparte de
 * `entrarConClave` (src/app/entrar/page.tsx) precisamente porque esa función
 * no se puede probar aquí (necesita cookies/request de Next); esta sí,
 * porque solo lee `hayAlgunaPersona()`.
 */
describe('claveDeEquipoSigueSirviendo — el portillo de emergencia', () => {
  it('sigue sirviendo mientras el directorio está vacío', async () => {
    hayAlgunaPersonaMock.mockResolvedValue(false)
    expect(await claveDeEquipoSigueSirviendo()).toBe(true)
  })

  it('deja de servir en cuanto hay una persona, aunque sea una sola', async () => {
    hayAlgunaPersonaMock.mockResolvedValue(true)
    expect(await claveDeEquipoSigueSirviendo()).toBe(false)
  })
})
