import { describe, it, expect, vi } from 'vitest'
import * as esquema from './esquema'

/**
 * `normalizarCorreo`/`esRolValido` son puras — se prueban directo, sin doble.
 *
 * `hayAlgunAdminActivo` SÍ toca `db()` — es el dato del que depende el
 * portillo de emergencia (`claveDeEquipoSigueSirviendo()`, src/auth/sesion.ts;
 * revisión del coordinador a la ronda 9, tarea 3; segundo fallo del mismo
 * tipo en la revisión final de la rama, punto 2), así que se prueba contra
 * un doble en memoria, mismo patrón que `src/app/personas/acciones.test.ts`:
 * `eq`/`and`/`isNotNull` de drizzle-orm se sustituyen por objetos planos
 * inspeccionables, y `esquema.personas.rol`/`.activa`/`.ultimoAcceso` que ve
 * el doble de abajo son las MISMAS referencias de columna que usa
 * `directorio.ts`.
 */

vi.mock('drizzle-orm', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('drizzle-orm')>()
  return {
    ...real,
    eq: (columna: unknown, valor: unknown) => ({ tipo: 'eq' as const, columna, valor }),
    and: (...condiciones: unknown[]) => ({ tipo: 'and' as const, condiciones }),
    isNotNull: (columna: unknown) => ({ tipo: 'isNotNull' as const, columna }),
  }
})

interface FilaFalsa {
  correo: string
  nombre: string
  rol: string
  activa: boolean
  /** `null` = esta fila existe pero nadie ha entrado con ella todavía. */
  ultimoAcceso: Date | null
}

type Cond =
  | { tipo: 'eq'; columna: unknown; valor: unknown }
  | { tipo: 'and'; condiciones: Cond[] }
  | { tipo: 'isNotNull'; columna: unknown }

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
  if (cond.tipo === 'isNotNull') {
    return (fila as unknown as Record<string, unknown>)[claveDeColumna(cond.columna)] != null
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

  it('hay gente, pero ningún admin activo (un editor y un admin YA desactivado): false — el caso que motivó el fix original', () => {
    filasDePrueba.length = 0
    filasDePrueba.push({ correo: 'a@upax.com.mx', nombre: 'A', rol: 'editor', activa: true, ultimoAcceso: new Date('2026-01-01') })
    filasDePrueba.push({ correo: 'b@upax.com.mx', nombre: 'B', rol: 'admin', activa: false, ultimoAcceso: new Date('2026-01-01') })
    return expect(hayAlgunAdminActivo()).resolves.toBe(false)
  })

  /**
   * Revisión final de la rama, punto 2 — las DOS ramas de `ultimoAcceso`, que
   * son la diferencia entre "existe un admin" (esta fila) y "hay un admin
   * que ha logrado entrar" (la de abajo). Una fila admin+activa con
   * `ultimoAcceso: null` es EXACTAMENTE el caso que dejaba a alguien sin
   * ninguna puerta: su correo en la tabla no coincide con el que devuelve
   * Slack —un alias, una letra— así que nunca ha entrado de verdad, y antes
   * de este fix esa fila ya bastaba para que el portillo se diera por
   * satisfecho y se cerrara solo, sin que nadie hubiera entrado nunca.
   */
  it('rama 1 — un admin activo EN LA TABLA que todavía no ha entrado nunca (ultimoAcceso null): false, el portillo sigue sirviendo', () => {
    filasDePrueba.length = 0
    filasDePrueba.push({ correo: 'nueva@upax.com.mx', nombre: 'Nueva', rol: 'admin', activa: true, ultimoAcceso: null })
    return expect(hayAlgunAdminActivo()).resolves.toBe(false)
  })

  /** Rama 2 — el mismo admin, pero YA entró una vez de verdad: true, el portillo se cierra. */
  it('rama 2 — al menos un admin activo que YA entró alguna vez (ultimoAcceso no nulo): true', () => {
    filasDePrueba.length = 0
    filasDePrueba.push({ correo: 'a@upax.com.mx', nombre: 'A', rol: 'editor', activa: true, ultimoAcceso: new Date('2026-01-01') })
    filasDePrueba.push({ correo: 'b@upax.com.mx', nombre: 'B', rol: 'admin', activa: true, ultimoAcceso: new Date('2026-01-01') })
    return expect(hayAlgunAdminActivo()).resolves.toBe(true)
  })
})
