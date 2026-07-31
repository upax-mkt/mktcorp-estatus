import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as esquema from '@/db/esquema'
import { exigirAdmin } from '@/auth/roles'

/**
 * `altaPersonaAction`/`cambiarRolAction`/`activarPersonaAction` contra un
 * doble de `db()` en memoria — mismo patrón que `src/app/salas/acciones.test.ts`
 * y `src/app/acuerdos/acciones.test.ts`: `eq` de drizzle-orm se sustituye por
 * una versión mínima que devuelve un objeto plano inspeccionable, y el resto
 * del módulo se conserva real, así que `esquema.personas.correo` que ve el
 * doble de abajo es la MISMA referencia de columna que usa
 * `src/db/directorio.ts`. Nunca toca Neon — `DATABASE_URL` no está seteada en
 * este proceso, y de todas formas es justo la regla de la tarea: "no toques
 * la base de datos... tus tests van contra dobles".
 *
 * El foco de este archivo son LAS DOS GUARDAS de la tarea 3 (ver la cabecera
 * de `acciones.ts`) — correo/rol inválidos y "persona no encontrada" ya los
 * prueba `src/db/directorio.test.ts`/el propio código de esa capa; aquí solo
 * se repite lo mínimo para confirmar que esta capa los propaga como
 * `{error}` en vez de dejar la promesa rechazada.
 */

vi.mock('drizzle-orm', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('drizzle-orm')>()
  return { ...real, eq: (columna: unknown, valor: unknown) => ({ tipo: 'eq' as const, columna, valor }) }
})

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

// Por defecto, una sesión de admin identificada como franco@upax.com.mx — el
// `sub` que necesita la mayoría de los tests de la guarda 1 ("a ti mismo").
// Los tests que necesitan otra identidad —o la del portillo de emergencia
// (`src/auth/sesion.ts`), que sirve aquí para AISLAR la guarda 2 de la 1
// porque 'equipo-mkt-corp' nunca puede coincidir con un correo real— la
// reemplazan con `exigirAdminMock.mockResolvedValueOnce(...)`, que se
// autoconsume y no necesita resetearse en `beforeEach` (mismo criterio que
// `exigirEditorMock.mockRejectedValueOnce` en acuerdos/acciones.test.ts).
vi.mock('@/auth/roles', () => ({
  exigirAdmin: vi.fn().mockResolvedValue({ rol: 'equipo', rolApp: 'admin', sub: 'franco@upax.com.mx', exp: 9e12 }),
}))

const exigirAdminMock = vi.mocked(exigirAdmin)

/** Sesión de admin con OTRO `sub` — para las llamadas que la necesitan. */
function sesionAdmin(sub: string) {
  return { rol: 'equipo' as const, rolApp: 'admin' as const, sub, exp: 9e12 }
}

interface FilaFalsa {
  correo: string
  nombre: string
  rol: string
  activa: boolean
}
const filas = new Map<string, FilaFalsa>()
const insertMock = vi.fn()
const setCapturado: { ultimo: Record<string, unknown> | null } = { ultimo: null }

function claveDeColumna(columna: unknown): string {
  const entrada = Object.entries(esquema.personas).find(([, v]) => v === columna)
  if (!entrada) throw new Error('columna no reconocida')
  return entrada[0]
}

const dbMock = {
  select: (_proy?: Record<string, unknown>) => ({
    // listarPersonas() nunca encadena `.where()` (trae el directorio
    // completo) — a diferencia del doble de salas/acuerdos, `.from()` aquí
    // ya es directamente lo awaiteable.
    from: () => Promise.resolve([...filas.values()]),
  }),
  insert: () => ({
    values: (v: Record<string, unknown>) => {
      insertMock(v)
      const correo = v.correo as string
      // Simula la restricción real: `correo` es la clave primaria de
      // `personas` (src/db/esquema.ts) — un alta repetida la rechaza la
      // propia base, no una validación de esta capa.
      if (filas.has(correo)) throw new Error(`llave duplicada: la persona "${correo}" ya existe`)
      filas.set(correo, { activa: true, ...v } as unknown as FilaFalsa)
      return Promise.resolve(undefined)
    },
  }),
  update: () => ({
    set: (parche: Record<string, unknown>) => ({
      where: (cond: { tipo: 'eq'; columna: unknown; valor: unknown }) => {
        setCapturado.ultimo = parche
        const clave = claveDeColumna(cond.columna)
        const encontrada = [...filas.values()].find(
          (f) => (f as unknown as Record<string, unknown>)[clave] === cond.valor,
        )
        if (encontrada) Object.assign(encontrada, parche)
        return {
          returning: (_p?: Record<string, unknown>) =>
            Promise.resolve(encontrada ? [{ correo: encontrada.correo }] : []),
        }
      },
    }),
  }),
}

vi.mock('@/db/cliente', () => ({
  hayDB: () => true,
  db: () => dbMock,
}))

const { altaPersonaAction, cambiarRolAction, activarPersonaAction } = await import('./acciones')

beforeEach(() => {
  filas.clear()
  insertMock.mockClear()
  setCapturado.ultimo = null
})

describe('cambiarRolAction — guarda 1: nadie se quita a sí mismo el admin', () => {
  beforeEach(() => {
    filas.set('franco@upax.com.mx', { correo: 'franco@upax.com.mx', nombre: 'Franco', rol: 'admin', activa: true })
    filas.set('iris@upax.com.mx', { correo: 'iris@upax.com.mx', nombre: 'Iris', rol: 'admin', activa: true })
  })

  it('franco no puede quitarse su propio admin, aunque haya OTRO admin de sobra', async () => {
    const r = await cambiarRolAction('franco@upax.com.mx', 'editor')
    expect(r.error).toBeTruthy()
    expect(r.error).toMatch(/ti mismo/i)
    expect(filas.get('franco@upax.com.mx')!.rol).toBe('admin')
    expect(setCapturado.ultimo).toBeNull()
  })

  it('franco SÍ puede quitarle el admin a OTRA persona (no es a sí mismo)', async () => {
    const r = await cambiarRolAction('iris@upax.com.mx', 'editor')
    expect(r.error).toBeUndefined()
    expect(filas.get('iris@upax.com.mx')!.rol).toBe('editor')
  })

  it('franco SÍ puede reafirmarse a sí mismo como admin: no es un cambio real', async () => {
    const r = await cambiarRolAction('franco@upax.com.mx', 'admin')
    expect(r.error).toBeUndefined()
    expect(filas.get('franco@upax.com.mx')!.rol).toBe('admin')
  })

  it('el correo se compara normalizado: mayúsculas o espacios no burlan la guarda', async () => {
    const r = await cambiarRolAction('  Franco@UPAX.com.mx  ', 'viewer')
    expect(r.error).toMatch(/ti mismo/i)
    expect(filas.get('franco@upax.com.mx')!.rol).toBe('admin')
  })
})

describe('cambiarRolAction — guarda 2: al menos un admin activo', () => {
  it('rechaza degradar al ÚLTIMO admin activo, aunque quien pide no sea esa misma persona', async () => {
    // La sesión es del portillo de emergencia (`sub` no es un correo real) —
    // así se aísla la guarda 2 de la 1: 'equipo-mkt-corp' nunca coincide con
    // el correo objetivo, así que si esto rechaza, es la guarda 2 la que actuó.
    exigirAdminMock.mockResolvedValueOnce(sesionAdmin('equipo-mkt-corp'))
    filas.set('iris@upax.com.mx', { correo: 'iris@upax.com.mx', nombre: 'Iris', rol: 'admin', activa: true })
    filas.set('nuevo@upax.com.mx', { correo: 'nuevo@upax.com.mx', nombre: 'Nuevo', rol: 'viewer', activa: true })

    const r = await cambiarRolAction('iris@upax.com.mx', 'editor')
    expect(r.error).toBeTruthy()
    expect(r.error).toMatch(/sin ningún administrador/i)
    expect(filas.get('iris@upax.com.mx')!.rol).toBe('admin')
    expect(setCapturado.ultimo).toBeNull()
  })

  it('degradar a un admin cuando SÍ queda otro activo se permite', async () => {
    exigirAdminMock.mockResolvedValueOnce(sesionAdmin('equipo-mkt-corp'))
    filas.set('iris@upax.com.mx', { correo: 'iris@upax.com.mx', nombre: 'Iris', rol: 'admin', activa: true })
    filas.set('franco@upax.com.mx', { correo: 'franco@upax.com.mx', nombre: 'Franco', rol: 'admin', activa: true })

    const r = await cambiarRolAction('iris@upax.com.mx', 'editor')
    expect(r.error).toBeUndefined()
    expect(filas.get('iris@upax.com.mx')!.rol).toBe('editor')
  })

  it('un admin INACTIVO no cuenta como el admin que queda: degradar al único activo se rechaza igual', async () => {
    exigirAdminMock.mockResolvedValueOnce(sesionAdmin('equipo-mkt-corp'))
    filas.set('iris@upax.com.mx', { correo: 'iris@upax.com.mx', nombre: 'Iris', rol: 'admin', activa: true })
    filas.set('viejo@upax.com.mx', { correo: 'viejo@upax.com.mx', nombre: 'Viejo', rol: 'admin', activa: false })

    const r = await cambiarRolAction('iris@upax.com.mx', 'viewer')
    expect(r.error).toMatch(/sin ningún administrador/i)
    expect(filas.get('iris@upax.com.mx')!.rol).toBe('admin')
  })
})

describe('activarPersonaAction — guarda 1: nadie se desactiva a sí mismo', () => {
  beforeEach(() => {
    filas.set('franco@upax.com.mx', { correo: 'franco@upax.com.mx', nombre: 'Franco', rol: 'admin', activa: true })
    filas.set('iris@upax.com.mx', { correo: 'iris@upax.com.mx', nombre: 'Iris', rol: 'admin', activa: true })
  })

  it('franco no puede desactivarse a sí mismo, aunque haya OTRO admin de sobra', async () => {
    const r = await activarPersonaAction('franco@upax.com.mx', false)
    expect(r.error).toMatch(/ti mismo/i)
    expect(filas.get('franco@upax.com.mx')!.activa).toBe(true)
    expect(setCapturado.ultimo).toBeNull()
  })

  it('franco SÍ puede desactivar a OTRA persona', async () => {
    const r = await activarPersonaAction('iris@upax.com.mx', false)
    expect(r.error).toBeUndefined()
    expect(filas.get('iris@upax.com.mx')!.activa).toBe(false)
  })

  it('activarse a sí mismo (reactivar) NO está bloqueado: no hay riesgo de quedarte fuera', async () => {
    filas.get('franco@upax.com.mx')!.activa = false
    const r = await activarPersonaAction('franco@upax.com.mx', true)
    expect(r.error).toBeUndefined()
    expect(filas.get('franco@upax.com.mx')!.activa).toBe(true)
  })
})

describe('activarPersonaAction — guarda 2: al menos un admin activo', () => {
  it('rechaza desactivar al último admin activo, aunque no sea quien pide', async () => {
    exigirAdminMock.mockResolvedValueOnce(sesionAdmin('equipo-mkt-corp'))
    filas.set('iris@upax.com.mx', { correo: 'iris@upax.com.mx', nombre: 'Iris', rol: 'admin', activa: true })
    filas.set('otro@upax.com.mx', { correo: 'otro@upax.com.mx', nombre: 'Otro', rol: 'editor', activa: true })

    const r = await activarPersonaAction('iris@upax.com.mx', false)
    expect(r.error).toMatch(/sin ningún administrador/i)
    expect(filas.get('iris@upax.com.mx')!.activa).toBe(true)
  })

  it('desactivar a un admin cuando SÍ queda otro activo se permite', async () => {
    exigirAdminMock.mockResolvedValueOnce(sesionAdmin('equipo-mkt-corp'))
    filas.set('iris@upax.com.mx', { correo: 'iris@upax.com.mx', nombre: 'Iris', rol: 'admin', activa: true })
    filas.set('franco@upax.com.mx', { correo: 'franco@upax.com.mx', nombre: 'Franco', rol: 'admin', activa: true })

    const r = await activarPersonaAction('iris@upax.com.mx', false)
    expect(r.error).toBeUndefined()
    expect(filas.get('iris@upax.com.mx')!.activa).toBe(false)
  })

  it('desactivar a un editor nunca dispara esta guarda: no es admin, no cambia el conteo', async () => {
    exigirAdminMock.mockResolvedValueOnce(sesionAdmin('equipo-mkt-corp'))
    filas.set('franco@upax.com.mx', { correo: 'franco@upax.com.mx', nombre: 'Franco', rol: 'admin', activa: true })
    filas.set('editor@upax.com.mx', { correo: 'editor@upax.com.mx', nombre: 'Editor', rol: 'editor', activa: true })

    const r = await activarPersonaAction('editor@upax.com.mx', false)
    expect(r.error).toBeUndefined()
    expect(filas.get('editor@upax.com.mx')!.activa).toBe(false)
  })
})

// La guarda 2 no es solo de cambiarRol/activar: también protege el ALTA,
// porque hay un camino real para llegar a "directorio no vacío, cero admins"
// por la puerta de ENTRADA — ver la cabecera de acciones.ts.
describe('altaPersonaAction — guarda 2 desde el arranque: el directorio vacío no puede quedarse sin admin', () => {
  it('dar de alta a la primera persona como viewer se rechaza: el directorio quedaría sin ningún admin', async () => {
    exigirAdminMock.mockResolvedValueOnce(sesionAdmin('equipo-mkt-corp')) // el portillo de emergencia
    const r = await altaPersonaAction({ correo: 'nueva@upax.com.mx', nombre: 'Nueva', rol: 'viewer' })
    expect(r.error).toBeTruthy()
    expect(r.error).toMatch(/sin ningún administrador/i)
    expect(insertMock).not.toHaveBeenCalled()
    expect(filas.size).toBe(0)
  })

  it('dar de alta a la primera persona como admin sí funciona: es justo lo que rompe el portillo, a propósito', async () => {
    exigirAdminMock.mockResolvedValueOnce(sesionAdmin('equipo-mkt-corp'))
    const r = await altaPersonaAction({ correo: 'franco@upax.com.mx', nombre: 'Franco', rol: 'admin' })
    expect(r.error).toBeUndefined()
    expect(filas.has('franco@upax.com.mx')).toBe(true)
  })

  it('con un admin activo ya en el directorio, dar de alta a alguien como viewer no necesita ser admin', async () => {
    filas.set('franco@upax.com.mx', { correo: 'franco@upax.com.mx', nombre: 'Franco', rol: 'admin', activa: true })
    const r = await altaPersonaAction({ correo: 'nueva@upax.com.mx', nombre: 'Nueva', rol: 'viewer' })
    expect(r.error).toBeUndefined()
    expect(filas.get('nueva@upax.com.mx')!.rol).toBe('viewer')
  })
})

describe('propagación de errores de la capa de abajo (src/db/directorio.ts)', () => {
  it('altaPersonaAction: un correo repetido lo rechaza la propia base, como {error}, no como promesa rota', async () => {
    filas.set('franco@upax.com.mx', { correo: 'franco@upax.com.mx', nombre: 'Franco', rol: 'admin', activa: true })
    await expect(
      altaPersonaAction({ correo: 'franco@upax.com.mx', nombre: 'Otro Franco', rol: 'viewer' }),
    ).resolves.toEqual({ error: expect.stringContaining('franco@upax.com.mx') })
  })

  it('cambiarRolAction: correo desconocido da error explícito, sin escribir nada', async () => {
    filas.set('franco@upax.com.mx', { correo: 'franco@upax.com.mx', nombre: 'Franco', rol: 'admin', activa: true })
    const r = await cambiarRolAction('fantasma@upax.com.mx', 'editor')
    expect(r.error).toContain('fantasma@upax.com.mx')
  })

  it('activarPersonaAction: correo desconocido da error explícito, sin escribir nada', async () => {
    filas.set('franco@upax.com.mx', { correo: 'franco@upax.com.mx', nombre: 'Franco', rol: 'admin', activa: true })
    const r = await activarPersonaAction('fantasma@upax.com.mx', false)
    expect(r.error).toContain('fantasma@upax.com.mx')
  })
})
