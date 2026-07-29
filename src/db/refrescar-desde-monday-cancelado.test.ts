import { describe, it, expect, vi, afterEach } from 'vitest'
import * as esquema from './esquema'
import { COLUMNA_ELEMENTO } from '@/monday/mapeo'

/**
 * EL CICLO COMPLETO del hallazgo crítico de la revisión de la tarea 9: un
 * acuerdo CANCELADO aquí, sincronizado a Monday (que lo escribe como
 * "🚫 Detenido" — ver FASE_DE_ESTATUS en mapeo.ts), no debe resucitar como
 * abierto en el siguiente refresh.
 *
 * No es un caso hipotético que exige que alguien más toque Monday: es
 * GARANTIZADO por nuestra propia ida. Cancelar aquí guarda `updatedAt = T0`
 * y ENTONCES sincroniza "🚫 Detenido" a Monday — esa llamada ocurre siempre
 * DESPUÉS de guardar aquí, así que el `updated_at` que Monday le pone queda
 * siempre en T1 > T0, por construcción. El siguiente refresh ve T1 > T0 y da
 * `gana-monday`; si `estatusDeFase('🚫 Detenido')` cayera a `abierto` (el bug
 * que corrige esta revisión), el acuerdo reaparecería como compromiso activo
 * en la vista de sala del director.
 *
 * A diferencia de refrescar-desde-monday.test.ts (que mockea
 * `@/monday/cliente` entero para probar la orquestación en aislamiento), este
 * archivo NO lo mockea: corren `leerAcuerdosDeMonday`, `estatusDeFase` y
 * `reconciliar` REALES de punta a punta, y solo se sustituye la base de
 * datos y la red. Es la única forma de probar el camino real de producción
 * y no una simulación de lo que "debería" devolver.
 */

vi.mock('drizzle-orm', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('drizzle-orm')>()
  return {
    ...real,
    eq: (columna: unknown, valor: unknown) => ({ tipo: 'eq' as const, columna, valor }),
    isNotNull: (columna: unknown) => ({ tipo: 'isNotNull' as const, columna }),
  }
})

interface FilaAcuerdoVuelta {
  id: string
  mondayId: string | null
  mondayTipo: string | null
  estatus: 'abierto' | 'cumplido' | 'vencido' | 'cancelado'
  fechaCompromiso: Date | null
  historia: unknown[]
  updatedAt: Date
}

type Condicion = { tipo: 'eq'; columna: unknown; valor: unknown } | { tipo: 'isNotNull'; columna: unknown }

function claveDeColumna(columna: unknown): keyof FilaAcuerdoVuelta {
  const entrada = Object.entries(esquema.acuerdos).find(([, valor]) => valor === columna)
  if (!entrada) throw new Error('Columna no reconocida en el doble de prueba de db().')
  return entrada[0] as keyof FilaAcuerdoVuelta
}

let filas: FilaAcuerdoVuelta[] = []

function dobleDB() {
  return {
    select(proyeccion: Record<string, unknown>) {
      return {
        from: () => ({
          where: () =>
            Promise.resolve(
              filas.map((f) => {
                const salida: Record<string, unknown> = {}
                for (const [clave, columna] of Object.entries(proyeccion)) {
                  salida[clave] = f[claveDeColumna(columna)]
                }
                return salida
              }),
            ),
        }),
      }
    },
    update() {
      return {
        set: (parche: Partial<FilaAcuerdoVuelta>) => ({
          where: (cond: Condicion) => {
            if (cond.tipo !== 'eq') throw new Error('El UPDATE de refrescarDesdeMonday siempre filtra por eq(id, …).')
            const fila = filas.find((f) => f[claveDeColumna(cond.columna)] === cond.valor)
            if (fila) Object.assign(fila, parche)
            return Promise.resolve(undefined)
          },
        }),
      }
    },
  }
}

vi.mock('./cliente', () => ({ hayDB: () => true, db: () => dobleDB() }))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const { refrescarDesdeMonday } = await import('./acuerdos')

/** Una respuesta de Monday con un único item, con la fase y el updated_at que pida el test. */
function respuestaDeMonday(fase: string, actualizadoEn: string): Response {
  return new Response(
    JSON.stringify({
      data: {
        items: [
          {
            id: '9',
            updated_at: actualizadoEn,
            column_values: [
              { id: COLUMNA_ELEMENTO.fase, text: fase, value: null },
              { id: COLUMNA_ELEMENTO.deadline, text: null, value: null },
            ],
          },
        ],
      },
    }),
  )
}

describe('refrescarDesdeMonday — el ciclo completo de "cancelado" (regresión crítica de revisión)', () => {
  it('un acuerdo cancelado aquí, que Monday devuelve como "🚫 Detenido" con un updated_at posterior, SIGUE cancelado', async () => {
    filas = [
      {
        id: 'acuerdo-cancelado',
        mondayId: '9',
        mondayTipo: 'elemento',
        estatus: 'cancelado',
        fechaCompromiso: null,
        historia: [{ en: '2026-07-20T00:00:00.000Z', estatusAnterior: 'abierto' }],
        updatedAt: new Date('2026-07-29T10:00:00Z'), // T0: cuando se canceló aquí
      },
    ]
    vi.stubEnv('MONDAY_TOKEN', 'ficticio')
    // T1 > T0: exactamente lo que pasa siempre que se sincroniza un cambio,
    // no un caso especial construido para el test — ver la cabecera.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuestaDeMonday('🚫 Detenido', '2026-07-29T10:00:05Z')))

    await refrescarDesdeMonday()

    expect(filas[0].estatus).toBe('cancelado')
  })

  it('confirma el otro sentido: "Detenido" puesto directo en Monday (sin cancelar aquí) también deja el acuerdo cancelado — es lo correcto, el tablero no tiene mejor fase para "sin efecto"', async () => {
    filas = [
      {
        id: 'acuerdo-abierto',
        mondayId: '9',
        mondayTipo: 'elemento',
        estatus: 'abierto',
        fechaCompromiso: null,
        historia: [],
        updatedAt: new Date('2026-07-29T10:00:00Z'),
      },
    ]
    vi.stubEnv('MONDAY_TOKEN', 'ficticio')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuestaDeMonday('🚫 Detenido', '2026-07-29T11:00:00Z')))

    await refrescarDesdeMonday()

    expect(filas[0].estatus).toBe('cancelado')
  })
})
