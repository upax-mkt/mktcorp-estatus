import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'
import * as esquema from './esquema'

/**
 * EL ESCENARIO COMPLETO (deuda de concurrencia, ronda 11, arreglo #2): "un
 * reintento al publicar minuta puede duplicar los ACUERDOS". `guardarMinuta`
 * llama a `crearAcuerdo` una vez por acuerdo confirmado, EN UN BUCLE. La
 * minuta en sí ya está protegida (`UNIQUE(reunion_id)` + `ON CONFLICT DO
 * UPDATE`, ver el describe "ON CONFLICT" de `minutas.test.ts`) — los
 * acuerdos, antes de esta ronda, no: un doble clic en "Publicar", o un
 * reintento tras un hipo de red, volvía a insertarlos todos otra vez.
 *
 * ARCHIVO APARTE de `minutas.test.ts`: ese archivo mockea `./acuerdos`
 * entero (`crearAcuerdo` es un espía que nunca llega a escribir nada de
 * verdad — es lo correcto para probar la POLÍTICA de `guardarMinuta`, "con
 * sala publica fila, sin sala no"). Aquí hace falta lo contrario: la
 * `crearAcuerdo` REAL, con su dedupe de verdad, corriendo contra un doble de
 * Postgres — así que este archivo NO mockea `./acuerdos` y monta su propio
 * doble de `db()` con tabla de `reuniones`, `minutas` Y `acuerdos`. Mezclar
 * las dos configuraciones en un solo archivo no conviene (mismo criterio que
 * ya separa `participacion.test.ts` de `participacion-resiliencia.test.ts`).
 *
 * El mecanismo en sí —`crearAcuerdo` no duplica un acuerdo de la misma
 * reunión— ya lo prueba `acuerdos.test.ts`. Lo que prueba ESTE archivo es el
 * ESCENARIO tal como lo describe la ronda: "publicar dos veces la misma
 * minuta no duplica los acuerdos".
 */

const dialect = new PgDialect()

interface FilaMinutaToy {
  id: string
  reunionId: string
  transcripcion: string | null
  textoFinal: string | null
  enviadaA: string[] | null
  createdAt: Date
}

interface FilaAcuerdoToy {
  id: string
  salaSlug: string
  que: string
  responsable: string
  fechaCompromiso: string | null
  reunionOrigenId: string | null
}

const REUNION_ID = 'reunion-fija-para-la-minuta'
const SALA_SLUG = 'neracode'

let tablaMinutas: Map<string, FilaMinutaToy>
let filasAcuerdos: FilaAcuerdoToy[]

function coincideAcuerdo(f: FilaAcuerdoToy, candidato: Omit<FilaAcuerdoToy, 'id' | 'salaSlug'>): boolean {
  return (
    f.reunionOrigenId !== null &&
    f.reunionOrigenId === candidato.reunionOrigenId &&
    f.que === candidato.que &&
    f.responsable === candidato.responsable &&
    f.fechaCompromiso === candidato.fechaCompromiso
  )
}

function dobleDB() {
  return {
    select: () => ({
      from: (tabla: unknown) => ({
        where: (condicion?: unknown) => {
          if (tabla === esquema.reuniones) return Promise.resolve([{ salaSlug: SALA_SLUG }])
          if (tabla === esquema.minutas) return Promise.resolve([...tablaMinutas.values()])
          if (tabla === esquema.acuerdos) {
            // El SELECT de respaldo de `crearAcuerdo` cuando el INSERT de
            // arriba no insertó nada (dedupe): mismo doble que acuerdos.test.ts.
            const { params } = dialect.sqlToQuery(condicion as SQL)
            const [reunionOrigenId, que, responsable] = params as (string | null)[]
            const encontrada = filasAcuerdos.find(
              (f) => f.reunionOrigenId === reunionOrigenId && f.que === que && f.responsable === responsable,
            )
            return Promise.resolve(encontrada ? [{ id: encontrada.id }] : [])
          }
          throw new Error(`select inesperado en el doble: ${String(tabla)}`)
        },
      }),
    }),
    insert: (tabla: unknown) => {
      if (tabla === esquema.acuerdos) {
        // EL INSERT LISO DEL CÓDIGO VIEJO DE `crearAcuerdo` (sin condición):
        // se deja funcionando A PROPÓSITO, para que el RED de este archivo
        // demuestre la duplicación de verdad (dos filas) en vez de solo un
        // error por método faltante — mismo criterio que acuerdos.test.ts.
        return { values: (vals: FilaAcuerdoToy) => { filasAcuerdos.push({ ...vals }); return Promise.resolve(undefined) } }
      }
      if (tabla !== esquema.minutas) throw new Error(`insert inesperado en el doble: ${String(tabla)}`)
      return {
        values: (vals: FilaMinutaToy) => ({
          // Mismo patrón que `minutas.test.ts` — ON CONFLICT (reunion_id) DO
          // UPDATE: no es lo que este archivo prueba, pero `guardarMinuta`
          // lo hace SIEMPRE antes de entrar al bucle de acuerdos, así que el
          // doble tiene que sostenerlo para llegar hasta ahí.
          onConflictDoUpdate: ({ set }: { target: unknown; set: Record<string, unknown> }) => {
            const existente = [...tablaMinutas.values()].find((f) => f.reunionId === vals.reunionId)
            if (existente) tablaMinutas.set(existente.id, { ...existente, ...set })
            else tablaMinutas.set(vals.id, { ...vals, createdAt: new Date() })
            return Promise.resolve(undefined)
          },
        }),
      }
    },
    // ---- lo que necesita crearAcuerdo (src/db/acuerdos.ts) — ver el mismo
    // doble, con el mismo comentario, en acuerdos.test.ts ----
    execute: (query: unknown) => {
      const { params } = dialect.sqlToQuery(query as SQL)
      const [id, salaSlug, que, responsable, , , fechaCompromiso, reunionOrigenId] = params as (string | null)[]
      const candidato = { que: que as string, responsable: responsable as string, fechaCompromiso, reunionOrigenId }
      if (filasAcuerdos.some((f) => coincideAcuerdo(f, candidato))) return Promise.resolve({ rows: [] })
      filasAcuerdos.push({ id: id as string, salaSlug: salaSlug as string, ...candidato })
      return Promise.resolve({ rows: [{ id }] })
    },
  }
}

const hayDBMock = vi.fn(() => true)
const dbMock = vi.fn(() => dobleDB())
vi.mock('./cliente', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('./cliente')>()
  return { ...real, hayDB: () => hayDBMock(), db: () => dbMock() }
})

vi.mock('./temas', () => ({
  slugsDeSalas: async () => [SALA_SLUG],
  cargarTemas: async () => ({}),
}))

const { guardarMinuta } = await import('./minutas')

/** Un acuerdo confirmado cualquiera — la forma que produce MinutaCliente al revisar la propuesta de la IA. */
const ACUERDO_CONFIRMADO = {
  que: 'Mandar la propuesta revisada',
  responsable: 'Pablo Levy',
  prioridad: 'alta',
  fechaCompromiso: null as string | null,
}

beforeEach(() => {
  tablaMinutas = new Map()
  filasAcuerdos = []
  hayDBMock.mockClear()
  dbMock.mockClear()
})

describe('guardarMinuta — publicar dos veces la misma minuta no duplica los acuerdos', () => {
  it('con un acuerdo confirmado: dos publicaciones dejan UNA sola fila en acuerdos, no dos', async () => {
    await guardarMinuta(REUNION_ID, 'transcripción', 'texto final', [ACUERDO_CONFIRMADO])
    expect(filasAcuerdos).toHaveLength(1)

    // EL REINTENTO: doble clic, o el mismo retry de red que ya protege la
    // minuta — MISMO reunionId, MISMOS acuerdosConfirmados.
    await guardarMinuta(REUNION_ID, 'transcripción', 'texto final', [ACUERDO_CONFIRMADO])

    expect(filasAcuerdos).toHaveLength(1)
    expect(filasAcuerdos[0].que).toBe('Mandar la propuesta revisada')
    // Y la minuta, que ya tenía su propia protección, sigue siendo una sola fila.
    expect(tablaMinutas.size).toBe(1)
  })

  it('con varios acuerdos confirmados: dos publicaciones dejan tantas filas como acuerdos, no el doble', async () => {
    const acuerdos = [
      ACUERDO_CONFIRMADO,
      { que: 'Agendar seguimiento con RevOps', responsable: 'Iris', prioridad: 'media', fechaCompromiso: '2026-08-20' },
    ]

    await guardarMinuta(REUNION_ID, 'transcripción', 'texto final', acuerdos)
    await guardarMinuta(REUNION_ID, 'transcripción', 'texto final', acuerdos)

    expect(filasAcuerdos).toHaveLength(2)
  })

  it('publicar, borrar un acuerdo a mano y volver a publicar la misma minuta corregida SÍ lo vuelve a crear', async () => {
    await guardarMinuta(REUNION_ID, 'transcripción', 'texto final', [ACUERDO_CONFIRMADO])
    expect(filasAcuerdos).toHaveLength(1)

    // Franco borra el acuerdo a mano desde la sala (`eliminarAcuerdo`: DELETE
    // real, sin papelera — se simula tal cual, vaciando la tabla de juguete).
    filasAcuerdos = []

    await guardarMinuta(REUNION_ID, 'transcripción', 'texto final corregido', [ACUERDO_CONFIRMADO])

    // El dedupe mira el estado ACTUAL de `acuerdos`, no un historial de qué
    // se publicó alguna vez: sin la fila, vuelve a nacer.
    expect(filasAcuerdos).toHaveLength(1)
  })

  it('sin acuerdos confirmados, dos publicaciones no crean ninguna fila (caso trivial)', async () => {
    await guardarMinuta(REUNION_ID, 'transcripción', 'texto final', [])
    await guardarMinuta(REUNION_ID, 'transcripción', 'texto final', [])

    expect(filasAcuerdos).toHaveLength(0)
  })
})
