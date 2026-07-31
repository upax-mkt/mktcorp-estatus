import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as esquema from '@/db/esquema'

/**
 * `crearSalaAction`/`editarSalaAction` contra un doble de `db()` en memoria —
 * mismo patrón que `src/app/acuerdos/acciones.test.ts`: `eq` de drizzle-orm
 * se sustituye por una versión mínima que devuelve un objeto plano
 * inspeccionable, y el resto del módulo se conserva real, así que
 * `esquema.salas.slug` que ve el doble de abajo es la MISMA referencia de
 * columna que usa `acciones.ts`. Nunca toca Neon — `DATABASE_URL` no está
 * seteada en este proceso de todas formas.
 *
 * Nace de tres archivos de scratch de la revisión de la tarea 6 (verificación
 * EJECUTADA contra el código real, no solo leída) que probaban justo esto:
 * el slug vacío se rechaza por los dos caminos por los que puede llegar, el
 * slug repetido se rechaza contra las DIEZ filas (no solo las nueve "reales"
 * — `grupo-upax` incluida), y `editarSalaAction` no puede cambiar el
 * identificador de una fila pase lo que mande el llamador.
 */

vi.mock('drizzle-orm', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('drizzle-orm')>()
  return { ...real, eq: (columna: unknown, valor: unknown) => ({ tipo: 'eq' as const, columna, valor }) }
})

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/auth/sesion', () => ({
  exigirEquipo: vi.fn().mockResolvedValue({ rol: 'equipo', sub: 'equipo-mkt-corp' }),
}))

interface FilaFalsa { slug: string; nombre: string; primario: string }
const filas = new Map<string, FilaFalsa>()

const insertMock = vi.fn()
const setCapturado: { ultimo: Record<string, unknown> | null } = { ultimo: null }
/** Si es `true`, el próximo `.update(...).set(...)` lanza — para probar el try/catch. */
let updateDebeLanzar = false

function claveDeColumna(columna: unknown): string {
  const entrada = Object.entries(esquema.salas).find(([, v]) => v === columna)
  if (!entrada) throw new Error('columna no reconocida')
  return entrada[0]
}

const dbMock = {
  select: (_proy?: Record<string, unknown>) => ({
    from: () => ({
      where: (cond: { tipo: 'eq'; columna: unknown; valor: unknown }) => {
        const clave = claveDeColumna(cond.columna)
        const encontrada = [...filas.values()].find((f) => (f as unknown as Record<string, unknown>)[clave] === cond.valor)
        return Promise.resolve(encontrada ? [{ slug: encontrada.slug }] : [])
      },
    }),
  }),
  insert: () => ({
    values: (v: Record<string, unknown>) => {
      insertMock(v)
      filas.set(v.slug as string, v as unknown as FilaFalsa)
      return Promise.resolve(undefined)
    },
  }),
  update: () => ({
    set: (parche: Record<string, unknown>) => ({
      where: (cond: { tipo: 'eq'; columna: unknown; valor: unknown }) => {
        if (updateDebeLanzar) throw new Error('la conexión se cayó a mitad del UPDATE')
        setCapturado.ultimo = parche
        const clave = claveDeColumna(cond.columna)
        const encontrada = [...filas.values()].find((f) => (f as unknown as Record<string, unknown>)[clave] === cond.valor)
        // Aplica el parche SOLO a los campos que trae — igual que un UPDATE
        // real: si 'slug' no está en el parche, el slug de la fila NUNCA cambia.
        if (encontrada) Object.assign(encontrada, parche)
        return {
          returning: (_p?: Record<string, unknown>) => Promise.resolve(encontrada ? [{ slug: encontrada.slug }] : []),
        }
      },
    }),
  }),
}

vi.mock('@/db/cliente', () => ({
  hayDB: () => true,
  db: () => dbMock,
}))

const { crearSalaAction, editarSalaAction } = await import('./acciones')

beforeEach(() => {
  filas.clear()
  filas.set('zeus', { slug: 'zeus', nombre: 'Zeus', primario: '#614aca' })
  filas.set('grupo-upax', { slug: 'grupo-upax', nombre: 'Grupo UPAX', primario: '#e34714' })
  insertMock.mockClear()
  setCapturado.ultimo = null
  updateDebeLanzar = false
})

describe('crearSalaAction — un slug vacío no se guarda', () => {
  it('nombre de puro emoji/símbolos (el slug también sale vacío) se rechaza, sin insertar', async () => {
    const r = await crearSalaAction({
      nombre: '🎉🎉🎉', slug: '🎉🎉🎉', primario: '#614aca', logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toBeTruthy()
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('un slug crudo mandado directo con solo símbolos (bypass del formulario, la Server Action es un endpoint) se rechaza igual', async () => {
    const r = await crearSalaAction({
      nombre: 'Una Sala De Verdad', slug: '###???', primario: '#614aca', logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toBeTruthy()
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('slug vacío explícito se rechaza', async () => {
    const r = await crearSalaAction({
      nombre: 'Otra Sala', slug: '', primario: '#614aca', logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toBeTruthy()
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('nombre vacío se rechaza aunque el slug mandado no lo esté', async () => {
    const r = await crearSalaAction({
      nombre: '   ', slug: 'algo-valido', primario: '#614aca', logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toBeTruthy()
    expect(insertMock).not.toHaveBeenCalled()
  })
})

describe('crearSalaAction — un slug repetido se rechaza diciendo cuál es', () => {
  it('crear "zeus" de nuevo rechaza sin insertar', async () => {
    const r = await crearSalaAction({
      nombre: 'Zeus Falso', slug: 'zeus', primario: '#614aca', logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toContain('zeus')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('rechaza también contra "grupo-upax" — la décima fila, fuera de las nueve "salas de verdad"', async () => {
    const r = await crearSalaAction({
      nombre: 'Grupo Upax', slug: 'grupo-upax', primario: '#614aca', logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toContain('grupo-upax')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('un nombre que normaliza al mismo slug que uno existente, aunque escrito distinto, también choca', async () => {
    const r = await crearSalaAction({
      nombre: 'Zeus', slug: '  ZEUS  ', primario: '#614aca', logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toContain('zeus')
    expect(insertMock).not.toHaveBeenCalled()
  })
})

describe('editarSalaAction — el identificador de una sala existente es inmutable', () => {
  it('mandar un slug distinto en los datos no lo cambia: el UPDATE nunca toca la columna slug', async () => {
    const r = await editarSalaAction('zeus', {
      nombre: 'Zeus Renombrado', slug: 'otro-completamente-distinto', primario: '#00ff00',
      logoUrl: null, logoRelacionDeTinta: null,
    })

    expect(r.error).toBeUndefined()
    // La fila "zeus" original sigue existiendo con ESE slug — nunca se creó
    // "otro-completamente-distinto", ni desapareció "zeus".
    expect(filas.has('zeus')).toBe(true)
    expect(filas.has('otro-completamente-distinto')).toBe(false)
    expect(filas.get('zeus')!.slug).toBe('zeus')
    // El nombre y el color SÍ se actualizaron (la edición real funcionó):
    expect(filas.get('zeus')!.nombre).toBe('Zeus Renombrado')
    // Pero el `.set()` que se mandó a Drizzle nunca incluye 'slug': estructuralmente
    // no hay ningún valor que pueda sobrescribir la clave primaria.
    expect(setCapturado.ultimo).not.toHaveProperty('slug')
  })

  it('editar una sala que no existe da error explícito con su slug, sin crear nada', async () => {
    const r = await editarSalaAction('sala-fantasma', {
      nombre: 'Fantasma', slug: 'lo-que-sea', primario: '#614aca', logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toContain('sala-fantasma')
    expect(filas.has('sala-fantasma')).toBe(false)
  })

  /**
   * Corrección de esta misma revisión: antes el `db().update(...)` no estaba
   * envuelto en try/catch, así que un fallo de escritura se propagaba como
   * promesa RECHAZADA en vez de `{error}`. `FormularioSala` ahora atrapa
   * cualquier rechazo igual (ver su comentario), pero la acción no debe
   * depender de que quien la llama la envuelva bien.
   */
  it('si el UPDATE falla, devuelve {error} en vez de rechazar la promesa', async () => {
    updateDebeLanzar = true
    await expect(
      editarSalaAction('zeus', {
        nombre: 'Zeus', slug: 'zeus', primario: '#614aca', logoUrl: null, logoRelacionDeTinta: null,
      }),
    ).resolves.toEqual({ error: 'la conexión se cayó a mitad del UPDATE' })
  })
})
