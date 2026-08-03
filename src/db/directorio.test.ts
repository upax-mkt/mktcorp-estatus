import { describe, it, expect, vi } from 'vitest'
import * as esquema from './esquema'

/**
 * `normalizarCorreo`/`esRolValido` son puras — se prueban directo, sin doble.
 *
 * `hayAlgunAdminActivo` SÍ toca `db()` — es el dato del que depende el
 * portillo de emergencia (`claveDeEquipoSigueSirviendo()`, src/auth/sesion.ts;
 * revisión del coordinador a la ronda 9, tarea 3), así que se prueba contra
 * un doble en memoria, mismo patrón que `src/app/personas/acciones.test.ts`:
 * `eq`/`and` de drizzle-orm se sustituyen por objetos planos inspeccionables,
 * y `esquema.personas.rol`/`.activa` que ve el doble de abajo son las MISMAS
 * referencias de columna que usa `directorio.ts`.
 */

vi.mock('drizzle-orm', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('drizzle-orm')>()
  return {
    ...real,
    eq: (columna: unknown, valor: unknown) => ({ tipo: 'eq' as const, columna, valor }),
    and: (...condiciones: unknown[]) => ({ tipo: 'and' as const, condiciones }),
  }
})

interface FilaFalsa {
  correo: string
  nombre: string
  rol: string
  activa: boolean
}

type Cond = { tipo: 'eq'; columna: unknown; valor: unknown } | { tipo: 'and'; condiciones: Cond[] }

const filasDePrueba: FilaFalsa[] = []

function claveDeColumna(columna: unknown): string {
  const entrada = Object.entries(esquema.personas).find(([, v]) => v === columna)
  if (!entrada) throw new Error('columna no reconocida')
  return entrada[0]
}

function coincide(cond: Cond, fila: FilaFalsa): boolean {
  if (cond.tipo === 'eq') {
    return (fila as unknown as Record<string, unknown>)[claveDeColumna(cond.columna)] === cond.valor
  }
  return cond.condiciones.every((c) => coincide(c, fila))
}

vi.mock('./cliente', () => ({
  hayDB: () => true,
  db: () => ({
    select: (_proy?: Record<string, unknown>) => ({
      from: () => ({
        where: (cond: Cond) => ({
          limit: (_n: number) => Promise.resolve(filasDePrueba.filter((f) => coincide(cond, f)).slice(0, 1)),
        }),
      }),
    }),
  }),
}))

const { normalizarCorreo, esRolValido, hayAlgunAdminActivo } = await import('./directorio')

describe('normalizarCorreo', () => {
  it('a minúsculas y sin espacios: el correo es la clave primaria', () => {
    expect(normalizarCorreo('  Franco.Cruzat@UPAX.com.mx ')).toBe('franco.cruzat@upax.com.mx')
  })

  it('una cadena sin arroba no es un correo', () => {
    expect(normalizarCorreo('franco')).toBeNull()
    expect(normalizarCorreo('')).toBeNull()
    expect(normalizarCorreo('   ')).toBeNull()
  })
})

describe('esRolValido', () => {
  it('acepta los tres y nada más', () => {
    expect(esRolValido('admin')).toBe(true)
    expect(esRolValido('editor')).toBe(true)
    expect(esRolValido('viewer')).toBe(true)
    expect(esRolValido('Admin')).toBe(false)
    expect(esRolValido('superadmin')).toBe(false)
    expect(esRolValido('')).toBe(false)
  })
})

// El dato del que depende el portillo de emergencia — ver la cabecera de
// este archivo y la de `hayAlgunAdminActivo` en `directorio.ts`.
describe('hayAlgunAdminActivo', () => {
  it('directorio vacío: false', () => {
    filasDePrueba.length = 0
    return expect(hayAlgunAdminActivo()).resolves.toBe(false)
  })

  it('hay gente, pero ningún admin activo (un editor y un admin YA desactivado): false — el caso que motivó este cambio', () => {
    filasDePrueba.length = 0
    filasDePrueba.push({ correo: 'a@upax.com.mx', nombre: 'A', rol: 'editor', activa: true })
    filasDePrueba.push({ correo: 'b@upax.com.mx', nombre: 'B', rol: 'admin', activa: false })
    return expect(hayAlgunAdminActivo()).resolves.toBe(false)
  })

  it('al menos un admin activo: true', () => {
    filasDePrueba.length = 0
    filasDePrueba.push({ correo: 'a@upax.com.mx', nombre: 'A', rol: 'editor', activa: true })
    filasDePrueba.push({ correo: 'b@upax.com.mx', nombre: 'B', rol: 'admin', activa: true })
    return expect(hayAlgunAdminActivo()).resolves.toBe(true)
  })
})
