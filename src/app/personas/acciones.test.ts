import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as esquema from '@/db/esquema'
import { exigirAdmin } from '@/auth/roles'

/**
 * `altaPersonaAction`/`cambiarRolAction`/`activarPersonaAction` contra un
 * doble de `db()` en memoria — mismo patrón que `src/app/salas/acciones.test.ts`
 * y `src/app/acuerdos/acciones.test.ts`. Nunca toca Neon — `DATABASE_URL` no
 * está seteada en este proceso, y de todas formas es justo la regla de la
 * tarea: "no toques la base de datos... tus tests van contra dobles".
 *
 * REVISIÓN DEL COORDINADOR — dos cambios de fondo sobre la primera versión:
 *
 * 1. La guarda 2 de `cambiarRolAction`/`activarPersonaAction` ya no es una
 *    lectura (`listarPersonas()`) seguida de una escritura aparte: vive
 *    DENTRO del `WHERE` del propio `UPDATE` (`existeOtroAdminActivo`, en
 *    `acciones.ts`), con una subconsulta `EXISTS`. Este doble de `db()` por
 *    eso YA NO evalúa condiciones con un simple "busca la fila por
 *    `correo`": interpreta un árbol de condiciones (`eq`/`ne`/`and`/`exists`)
 *    con la misma función, `evalua()`, tanto para `SELECT` (subconsultas,
 *    `buscarPersona`) como para `UPDATE...WHERE`. `eq`/`ne`/`and` de
 *    drizzle-orm se sustituyen por objetos planos inspeccionables (mismo
 *    truco que ya usan `salas/acciones.test.ts` y `acuerdos/acciones.test.ts`
 *    con `eq`/`and`); `exists` igual, leyendo el `.cond` de la subconsulta
 *    que le pasa `db().select()...where(...)` sin await.
 *
 *    La prueba de que la guarda 2 quedó ATÓMICA no es un mock que lo declare:
 *    es la describe "la guarda 2 es atómica" de cada acción, que llama la
 *    acción DOS VECES seguidas sobre los DOS ÚLTIMOS admins —el escenario
 *    exacto que describió el coordinador— y confirma que solo UNA de las dos
 *    gana. Mismo nivel de prueba que `subirAcuerdoAction — dos pestañas sobre
 *    el mismo acuerdo` en acuerdos/acciones.test.ts: dos llamadas
 *    SECUENCIALES (este proceso es de un solo hilo; no hay forma de simular
 *    una carrera real de dos peticiones superpuestas) que demuestran que la
 *    condición se reevalúa fresca en cada `UPDATE`, no contra una lectura
 *    vieja — que es justo la ventana que abría la versión anterior.
 *
 * 2. Nuevo: tests de que las tres acciones exigen `exigirAdmin()` ANTES de
 *    tocar la base (si rechaza, nada se escribe) y uno de la rama sin base de
 *    datos — ninguno de los dos existía en la primera entrega.
 */

vi.mock('drizzle-orm', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('drizzle-orm')>()
  return {
    ...real,
    eq: (columna: unknown, valor: unknown) => ({ tipo: 'eq' as const, columna, valor }),
    ne: (columna: unknown, valor: unknown) => ({ tipo: 'ne' as const, columna, valor }),
    and: (...condiciones: unknown[]) => ({ tipo: 'and' as const, condiciones }),
    exists: (subconsulta: { cond: unknown }) => ({ tipo: 'exists' as const, cond: subconsulta.cond }),
  }
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
  squad?: string | null
}

const SQUAD = 'Squad Paid y RRSS' as const

type Nodo =
  | { tipo: 'eq'; columna: unknown; valor: unknown }
  | { tipo: 'ne'; columna: unknown; valor: unknown }
  | { tipo: 'and'; condiciones: Nodo[] }
  | { tipo: 'exists'; cond: Nodo }

const filas = new Map<string, FilaFalsa>()
const insertMock = vi.fn()
const setCapturado: { ultimo: Record<string, unknown> | null } = { ultimo: null }
const hayDBMock = vi.fn().mockReturnValue(true)

function claveDeColumna(columna: unknown): string {
  const entrada = Object.entries(esquema.personas).find(([, v]) => v === columna)
  if (!entrada) throw new Error('columna no reconocida')
  return entrada[0]
}

/** Evalúa un árbol de condiciones contra UNA fila. `exists` mira TODO el directorio, no `fila`. */
function evalua(nodo: Nodo, fila: FilaFalsa): boolean {
  switch (nodo.tipo) {
    case 'eq':
      return (fila as unknown as Record<string, unknown>)[claveDeColumna(nodo.columna)] === nodo.valor
    case 'ne':
      return (fila as unknown as Record<string, unknown>)[claveDeColumna(nodo.columna)] !== nodo.valor
    case 'and':
      return nodo.condiciones.every((c) => evalua(c, fila))
    case 'exists':
      return [...filas.values()].some((otra) => evalua(nodo.cond, otra))
  }
}

const dbMock = {
  select: (_proy?: Record<string, unknown>) => ({
    from: () => {
      const comoLista = () => [...filas.values()]
      return {
        // listarPersonas() (la usa hayAdminActivoOSeraAdmin, solo en el alta)
        // awaitea `.from()` directo, sin `.where()`.
        then: (resolve: (v: FilaFalsa[]) => void) => resolve(comoLista()),
        // buscarPersona() SÍ encadena `.where()` y lo awaitea; `existeOtroAdminActivo`
        // (acciones.ts) usa exactamente la misma forma pero SIN await, como
        // subconsulta de `exists()` — las dos conviven en este mismo objeto:
        // es awaitable (tiene `.then`) y trae `.cond` para que el `exists`
        // mockeado, arriba, pueda leer la condición.
        where: (cond: Nodo) => {
          const coincidentes = comoLista().filter((f) => evalua(cond, f))
          return {
            then: (resolve: (v: FilaFalsa[]) => void) => resolve(coincidentes),
            cond,
          }
        },
      }
    },
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
      where: (cond: Nodo) => {
        setCapturado.ultimo = parche
        // A diferencia de la primera versión (buscaba UNA fila por `correo`),
        // ahora se FILTRA por la condición completa — así el propio doble
        // aplica la guarda atómica: si `cond` incluye `existeOtroAdminActivo`
        // y no se cumple, `coincidentes` sale vacío y nada se toca, exactamente
        // como el `WHERE` real en Postgres.
        const coincidentes = [...filas.values()].filter((f) => evalua(cond, f))
        coincidentes.forEach((f) => Object.assign(f, parche))
        return {
          returning: (_p?: Record<string, unknown>) =>
            Promise.resolve(coincidentes.map((f) => ({ correo: f.correo }))),
        }
      },
    }),
  }),
}

vi.mock('@/db/cliente', () => ({
  hayDB: () => hayDBMock(),
  db: () => dbMock,
}))

const { altaPersonaAction, cambiarRolAction, activarPersonaAction } = await import('./acciones')

beforeEach(() => {
  filas.clear()
  insertMock.mockClear()
  setCapturado.ultimo = null
  hayDBMock.mockReturnValue(true)
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
    // Guarda 1: pura, sobre la sesión — ni siquiera llega a tocar `db()`.
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

describe('cambiarRolAction — guarda 2: al menos un admin activo (atómica, en el WHERE del UPDATE)', () => {
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
    // El UPDATE SÍ se emitió (es la propia guarda) pero no afectó ninguna
    // fila: lo que importa es que la fila real siga intacta.
    expect(filas.get('iris@upax.com.mx')!.rol).toBe('admin')
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

  it('promover A admin nunca necesita la guarda: no hay riesgo de restar', async () => {
    exigirAdminMock.mockResolvedValueOnce(sesionAdmin('equipo-mkt-corp'))
    filas.set('viewer@upax.com.mx', { correo: 'viewer@upax.com.mx', nombre: 'V', rol: 'viewer', activa: true })
    // Directorio sin NINGÚN admin todavía (caso límite): promover a alguien
    // no debe chocar con la guarda, que solo protege contra RESTAR.
    const r = await cambiarRolAction('viewer@upax.com.mx', 'admin')
    expect(r.error).toBeUndefined()
    expect(filas.get('viewer@upax.com.mx')!.rol).toBe('admin')
  })
})

// LA PRUEBA DE FONDO DE ESTA REVISIÓN: dos peticiones, una tras otra, sobre
// los DOS ÚLTIMOS admins — el escenario exacto que describió el coordinador.
// En la versión anterior (lectura aparte + escritura aparte) las dos habrían
// pasado la comprobación si hubieran llegado casi juntas, porque cada una
// leía "el otro sigue siendo admin" ANTES de que ninguna escribiera. Con la
// guarda dentro del propio UPDATE, la primera que escribe gana y la
// condición de la segunda deja de cumplirse — se reevalúa fresca, no contra
// una lectura vieja.
describe('cambiarRolAction — la guarda 2 es atómica: dos peticiones sobre los dos últimos admins', () => {
  it('la segunda pierde: nunca las dos degradaciones se quedan a la vez', async () => {
    filas.set('a@upax.com.mx', { correo: 'a@upax.com.mx', nombre: 'A', rol: 'admin', activa: true })
    filas.set('b@upax.com.mx', { correo: 'b@upax.com.mx', nombre: 'B', rol: 'admin', activa: true })

    exigirAdminMock.mockResolvedValueOnce(sesionAdmin('equipo-mkt-corp'))
    const r1 = await cambiarRolAction('a@upax.com.mx', 'editor')
    exigirAdminMock.mockResolvedValueOnce(sesionAdmin('equipo-mkt-corp'))
    const r2 = await cambiarRolAction('b@upax.com.mx', 'editor')

    expect(r1.error).toBeUndefined()
    expect(r2.error).toMatch(/sin ningún administrador/i)
    expect(filas.get('a@upax.com.mx')!.rol).toBe('editor')
    expect(filas.get('b@upax.com.mx')!.rol).toBe('admin') // el que sobrevive
  })

  it('en el orden inverso, gana la otra — no depende de cuál se pida primero', async () => {
    filas.set('a@upax.com.mx', { correo: 'a@upax.com.mx', nombre: 'A', rol: 'admin', activa: true })
    filas.set('b@upax.com.mx', { correo: 'b@upax.com.mx', nombre: 'B', rol: 'admin', activa: true })

    exigirAdminMock.mockResolvedValueOnce(sesionAdmin('equipo-mkt-corp'))
    const r1 = await cambiarRolAction('b@upax.com.mx', 'editor')
    exigirAdminMock.mockResolvedValueOnce(sesionAdmin('equipo-mkt-corp'))
    const r2 = await cambiarRolAction('a@upax.com.mx', 'editor')

    expect(r1.error).toBeUndefined()
    expect(r2.error).toMatch(/sin ningún administrador/i)
    expect(filas.get('b@upax.com.mx')!.rol).toBe('editor')
    expect(filas.get('a@upax.com.mx')!.rol).toBe('admin')
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

describe('activarPersonaAction — guarda 2: al menos un admin activo (atómica)', () => {
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

  it('activar (reactivar a alguien más) nunca necesita la guarda: no hay riesgo de restar', async () => {
    exigirAdminMock.mockResolvedValueOnce(sesionAdmin('equipo-mkt-corp'))
    filas.set('iris@upax.com.mx', { correo: 'iris@upax.com.mx', nombre: 'Iris', rol: 'admin', activa: false })
    const r = await activarPersonaAction('iris@upax.com.mx', true)
    expect(r.error).toBeUndefined()
    expect(filas.get('iris@upax.com.mx')!.activa).toBe(true)
  })
})

// Mismo escenario de fondo que cambiarRolAction, ahora con activar/desactivar.
describe('activarPersonaAction — la guarda 2 es atómica: dos peticiones sobre los dos últimos admins', () => {
  it('la segunda pierde: nunca las dos desactivaciones se quedan a la vez', async () => {
    filas.set('a@upax.com.mx', { correo: 'a@upax.com.mx', nombre: 'A', rol: 'admin', activa: true })
    filas.set('b@upax.com.mx', { correo: 'b@upax.com.mx', nombre: 'B', rol: 'admin', activa: true })

    exigirAdminMock.mockResolvedValueOnce(sesionAdmin('equipo-mkt-corp'))
    const r1 = await activarPersonaAction('a@upax.com.mx', false)
    exigirAdminMock.mockResolvedValueOnce(sesionAdmin('equipo-mkt-corp'))
    const r2 = await activarPersonaAction('b@upax.com.mx', false)

    expect(r1.error).toBeUndefined()
    expect(r2.error).toMatch(/sin ningún administrador/i)
    expect(filas.get('a@upax.com.mx')!.activa).toBe(false)
    expect(filas.get('b@upax.com.mx')!.activa).toBe(true) // el que sobrevive
  })
})

// La guarda 2 no es solo de cambiarRol/activar: también protege el ALTA,
// porque hay un camino real para llegar a "directorio no vacío, cero admins"
// por la puerta de ENTRADA — ver la cabecera de acciones.ts. A diferencia de
// las dos de arriba, esta SÍ se queda con una lectura aparte (no atómica) a
// propósito: un INSERT nunca resta, así que no hay ventana insegura — ver
// también la cabecera de acciones.ts.
describe('altaPersonaAction — guarda 2 desde el arranque: el directorio vacío no puede quedarse sin admin', () => {
  it('dar de alta a la primera persona como viewer se rechaza: el directorio quedaría sin ningún admin', async () => {
    exigirAdminMock.mockResolvedValueOnce(sesionAdmin('equipo-mkt-corp')) // el portillo de emergencia
    const r = await altaPersonaAction({ correo: 'nueva@upax.com.mx', nombre: 'Nueva', rol: 'viewer', squad: SQUAD })
    expect(r.error).toBeTruthy()
    expect(r.error).toMatch(/sin ningún administrador/i)
    expect(insertMock).not.toHaveBeenCalled()
    expect(filas.size).toBe(0)
  })

  it('dar de alta a la primera persona como admin sí funciona: es justo lo que rompe el portillo, a propósito', async () => {
    exigirAdminMock.mockResolvedValueOnce(sesionAdmin('equipo-mkt-corp'))
    const r = await altaPersonaAction({ correo: 'franco@upax.com.mx', nombre: 'Franco', rol: 'admin', squad: SQUAD })
    expect(r.error).toBeUndefined()
    expect(filas.has('franco@upax.com.mx')).toBe(true)
  })

  it('con un admin activo ya en el directorio, dar de alta a alguien como viewer no necesita ser admin', async () => {
    filas.set('franco@upax.com.mx', { correo: 'franco@upax.com.mx', nombre: 'Franco', rol: 'admin', activa: true })
    const r = await altaPersonaAction({ correo: 'nueva@upax.com.mx', nombre: 'Nueva', rol: 'viewer', squad: SQUAD })
    expect(r.error).toBeUndefined()
    expect(filas.get('nueva@upax.com.mx')!.rol).toBe('viewer')
  })
})

describe('propagación de errores de la capa de abajo (src/db/directorio.ts)', () => {
  it('altaPersonaAction: un correo repetido lo rechaza la propia base, como {error}, no como promesa rota', async () => {
    filas.set('franco@upax.com.mx', { correo: 'franco@upax.com.mx', nombre: 'Franco', rol: 'admin', activa: true })
    await expect(
      altaPersonaAction({ correo: 'franco@upax.com.mx', nombre: 'Otro Franco', rol: 'viewer', squad: SQUAD }),
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

  it('cambiarRolAction: un rol inválido lo rechaza esta capa (no revienta), sin escribir nada', async () => {
    // Objetivo distinto de quien pide (franco@upax.com.mx, la sesión por
    // defecto): con el correo propio, la guarda 1 dispara primero y no deja
    // ver esta comprobación — aquí interesa aislar la validación de rol.
    filas.set('iris@upax.com.mx', { correo: 'iris@upax.com.mx', nombre: 'Iris', rol: 'admin', activa: true })
    const r = await cambiarRolAction('iris@upax.com.mx', 'superadmin' as unknown as 'admin')
    expect(r.error).toContain('superadmin')
    expect(filas.get('iris@upax.com.mx')!.rol).toBe('admin')
  })
})

// SEGUNDO PEDIDO DEL COORDINADOR: ninguno de los 19 tests originales
// verificaba que se llamara a `exigirAdmin`, ni ejercitaba su rechazo. Hoy es
// la primera línea de las tres — pero sin un test que se caiga si alguien lo
// debilita en un refactor, un cambio así pasaría en verde.
describe('las tres acciones exigen admin ANTES de tocar la base', () => {
  it('altaPersonaAction: si exigirAdmin rechaza, no se llega a insertar', async () => {
    exigirAdminMock.mockRejectedValueOnce(
      new Error('Esta acción es solo para administradores de Marketing Corporativo.'),
    )
    await expect(
      altaPersonaAction({ correo: 'x@upax.com.mx', nombre: 'X', rol: 'admin', squad: SQUAD }),
    ).rejects.toThrow('solo para administradores')
    expect(insertMock).not.toHaveBeenCalled()
    expect(filas.size).toBe(0)
  })

  it('cambiarRolAction: si exigirAdmin rechaza, la fila no se toca', async () => {
    filas.set('franco@upax.com.mx', { correo: 'franco@upax.com.mx', nombre: 'Franco', rol: 'admin', activa: true })
    exigirAdminMock.mockRejectedValueOnce(
      new Error('Esta acción es solo para administradores de Marketing Corporativo.'),
    )
    await expect(cambiarRolAction('franco@upax.com.mx', 'editor')).rejects.toThrow('solo para administradores')
    expect(filas.get('franco@upax.com.mx')!.rol).toBe('admin')
    expect(setCapturado.ultimo).toBeNull()
  })

  it('activarPersonaAction: si exigirAdmin rechaza, la fila no se toca', async () => {
    filas.set('franco@upax.com.mx', { correo: 'franco@upax.com.mx', nombre: 'Franco', rol: 'admin', activa: true })
    exigirAdminMock.mockRejectedValueOnce(
      new Error('Esta acción es solo para administradores de Marketing Corporativo.'),
    )
    await expect(activarPersonaAction('franco@upax.com.mx', false)).rejects.toThrow('solo para administradores')
    expect(filas.get('franco@upax.com.mx')!.activa).toBe(true)
    expect(setCapturado.ultimo).toBeNull()
  })
})

// MENOR BARATO #1 DEL COORDINADOR: la rama sin base de datos.
describe('sin base de datos', () => {
  it('cambiarRolAction rechaza con el motivo real, no con el de la guarda 2', async () => {
    hayDBMock.mockReturnValueOnce(false)
    const r = await cambiarRolAction('quien-sea@upax.com.mx', 'editor')
    expect(r.error).toBe('Sin base de datos no se puede cambiar el rol.')
  })

  it('activarPersonaAction rechaza con el motivo real', async () => {
    hayDBMock.mockReturnValueOnce(false)
    const r = await activarPersonaAction('quien-sea@upax.com.mx', false)
    expect(r.error).toBe('Sin base de datos no se puede activar/desactivar personas.')
  })

  it('altaPersonaAction rechaza con el motivo real', async () => {
    hayDBMock.mockReturnValueOnce(false)
    const r = await altaPersonaAction({ correo: 'quien-sea@upax.com.mx', nombre: 'Quien Sea', rol: 'viewer', squad: SQUAD })
    expect(r.error).toBe('Sin base de datos no se pueden dar de alta personas.')
  })
})
