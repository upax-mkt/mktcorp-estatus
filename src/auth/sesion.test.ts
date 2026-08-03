import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  claveDeEquipoCorrecta, claveDeEquipoSigueSirviendo, hayAuth, hayClaveDeEquipo, secretoConfigurado,
} from './sesion'
import { hayAlgunAdminActivo } from '@/db/directorio'

/**
 * Solo lo que no toca cookies: la lectura del entorno, la comparación de la
 * clave, y la decisión del portillo de emergencia (que tampoco toca cookies —
 * solo lee `hayAlgunAdminActivo()`). Abrir y cerrar sesión necesita un
 * request de Next vivo y se verifica end-to-end contra el servidor, no aquí.
 */

vi.mock('@/db/directorio', () => ({
  hayAlgunAdminActivo: vi.fn(),
}))

const hayAlgunAdminActivoMock = vi.mocked(hayAlgunAdminActivo)

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
 * EL PORTILLO DE EMERGENCIA (ronda 9, tarea 2 — corrección post-revisión;
 * ronda 9, tarea 3 — segunda corrección: la condición pasó de "¿hay alguna
 * fila?" a "¿queda algún admin activo?").
 *
 * Es la pieza de más riesgo de toda la ronda: si esta condición se invierte
 * por accidente, o el directorio se queda sin ningún admin activo en
 * producción (vacío, o con gente pero sin nadie que administre), nadie
 * —tampoco Franco— puede entrar. Se prueba aparte de `entrarConClave`
 * (src/app/entrar/page.tsx) precisamente porque esa función no se puede
 * probar aquí (necesita cookies/request de Next); esta sí, porque solo lee
 * `hayAlgunAdminActivo()`.
 *
 * Este archivo mockea `hayAlgunAdminActivo` entero (no prueba la consulta
 * real contra una fila) — esa parte, con un doble de `db()`, vive en
 * `src/db/directorio.test.ts`. Aquí lo que importa es que
 * `claveDeEquipoSigueSirviendo` invierte bien el booleano que le llega.
 */
describe('claveDeEquipoSigueSirviendo — el portillo de emergencia', () => {
  it('sigue sirviendo mientras NO hay ningún admin activo (directorio vacío, o con gente pero sin admin)', async () => {
    hayAlgunAdminActivoMock.mockResolvedValue(false)
    expect(await claveDeEquipoSigueSirviendo()).toBe(true)
  })

  it('deja de servir en cuanto hay al menos un admin activo', async () => {
    hayAlgunAdminActivoMock.mockResolvedValue(true)
    expect(await claveDeEquipoSigueSirviendo()).toBe(false)
  })
})
