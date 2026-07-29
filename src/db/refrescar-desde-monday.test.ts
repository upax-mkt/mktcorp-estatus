import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as esquema from './esquema'

/**
 * `refrescarDesdeMonday` (src/db/acuerdos.ts, tarea 9) es la ORQUESTACIÓN de
 * la vuelta: lee los acuerdos con mondayId, llama a `leerAcuerdosDeMonday` y
 * aplica `reconciliar` a cada uno, escribiendo el resultado. `reconciliar`
 * en sí ya está probado como función pura (sincronizar.test.ts); lo que este
 * archivo cubre es la parte que esos tests NO pueden: que la orquestación
 * lea la fila correcta, escriba solo lo que le toca a cada rama, y no cruce
 * el resultado de un acuerdo con el de otro cuando hay varios a la vez.
 *
 * `@/db/cliente` y `@/monday/cliente` se sustituyen aquí — es el mismo
 * criterio que src/app/acuerdos/acciones.test.ts (la primera vez que este
 * repo montó un `db()` que EVALÚA de verdad `eq`/`isNotNull` en vez de
 * devolver siempre lo mismo). `reconciliar` NO se mockea: corre real, para
 * que este archivo pruebe la integración de verdad y no una simulación de
 * lo que "debería" devolver.
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

/** De qué propiedad de FilaAcuerdoVuelta es esta columna de esquema.acuerdos — misma técnica que acciones.test.ts. */
function claveDeColumna(columna: unknown): keyof FilaAcuerdoVuelta {
  const entrada = Object.entries(esquema.acuerdos).find(([, valor]) => valor === columna)
  if (!entrada) throw new Error('Columna no reconocida en el doble de prueba de db().')
  return entrada[0] as keyof FilaAcuerdoVuelta
}

// Las filas "en la base", compartidas por todos los tests de este archivo
// vía beforeEach. Varias a la vez a propósito: con una sola fila, un UPDATE
// mal filtrado (que pisara la primera que encuentra en vez de la del id
// pedido) pasaría inadvertido.
let filas: FilaAcuerdoVuelta[] = []

function dobleDB() {
  return {
    select(proyeccion: Record<string, unknown>) {
      return {
        from: () => ({
          // El SELECT real filtra por `isNotNull(mondayId)`; aquí no hace
          // falta reevaluar esa condición porque cada test solo siembra
          // filas que YA tienen mondayId (como las devolvería ese filtro).
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

const mondayConectadoMock = vi.fn()
const leerAcuerdosDeMondayMock = vi.fn()
vi.mock('@/monday/cliente', () => ({
  mondayConectado: (...args: unknown[]) => mondayConectadoMock(...args),
  leerAcuerdosDeMonday: (...args: unknown[]) => leerAcuerdosDeMondayMock(...args),
}))

const { refrescarDesdeMonday } = await import('./acuerdos')

const FILA_A: FilaAcuerdoVuelta = {
  id: 'acuerdo-a',
  mondayId: '9',
  mondayTipo: 'elemento',
  estatus: 'abierto',
  fechaCompromiso: new Date('2026-08-01T00:00:00Z'),
  historia: [{ en: '2026-07-01T00:00:00.000Z', cambios: { que: 'inicial' } }],
  updatedAt: new Date('2026-07-29T10:00:00Z'),
}

// Señuelo: otro acuerdo, otro mondayId. Sin él, un UPDATE que ignorara el id
// y escribiera "la primera fila que encuentre" pasaría los tests igual.
const FILA_B: FilaAcuerdoVuelta = {
  id: 'acuerdo-b',
  mondayId: '77',
  mondayTipo: 'subelemento',
  estatus: 'abierto',
  fechaCompromiso: null,
  historia: [],
  updatedAt: new Date('2026-07-29T10:00:00Z'),
}

beforeEach(() => {
  filas = [{ ...FILA_A }, { ...FILA_B }]
  mondayConectadoMock.mockReset().mockReturnValue(true)
  leerAcuerdosDeMondayMock.mockReset()
})

describe('refrescarDesdeMonday', () => {
  it('gana-monday: actualiza estatus y fecha de LA FILA CORRECTA, sin tocar la señuelo', async () => {
    leerAcuerdosDeMondayMock.mockResolvedValue(
      new Map([
        [
          '9',
          {
            estatus: 'cumplido',
            fechaCompromiso: '2026-08-15',
            actualizadoEn: new Date('2026-07-29T11:00:00Z'), // más tarde que el updatedAt local
            existe: true,
          },
        ],
        [
          '77',
          {
            // A la fila señuelo Monday la devuelve SIN cambios reales (misma
            // fecha en la que ya está aquí), para que este test aísle lo que
            // le pasa a A de lo que le pasa a B.
            estatus: 'abierto',
            fechaCompromiso: null,
            actualizadoEn: new Date('2026-07-01T00:00:00Z'), // más viejo: gana-local, no toca nada
            existe: true,
          },
        ],
      ]),
    )

    await refrescarDesdeMonday()

    expect(leerAcuerdosDeMondayMock).toHaveBeenCalledWith([
      { mondayId: '9', tipo: 'elemento' },
      { mondayId: '77', tipo: 'subelemento' },
    ])

    const a = filas.find((f) => f.id === 'acuerdo-a')!
    expect(a.estatus).toBe('cumplido')
    expect(a.fechaCompromiso).toEqual(new Date('2026-08-15'))
    expect(a.mondayId).toBe('9') // sigue sincronizado
    expect(a.updatedAt.getTime()).toBeGreaterThan(new Date('2026-07-29T10:00:00Z').getTime()) // se bumpeó: si no, el próximo refresco lo reescribiría en bucle

    // gana-monday SÍ deja rastro en la historia (corrección de revisión):
    // sin esto, un cambio de estatus por la vuelta es indistinguible de uno
    // por un clic en la sala — justo lo que hace falta para diagnosticar un
    // caso como 'cancelado' resucitando si volviera a pasar de otra forma.
    expect(a.historia).toHaveLength(2)
    expect(a.historia[0]).toEqual(FILA_A.historia[0]) // la entrada previa se conserva
    expect(a.historia[1]).toEqual({
      en: expect.any(String),
      estatusAnterior: 'abierto', // lo que tenía ANTES de esta vuelta
      cambios: { origen: 'monday', estatus: 'cumplido', fechaCompromiso: '2026-08-15' },
    })

    // La señuelo (gana-local) queda exactamente como estaba.
    const b = filas.find((f) => f.id === 'acuerdo-b')!
    expect(b).toEqual(FILA_B)
  })

  it('desapareció: pone mondayId = null y dice por qué en la historia, sin borrar el acuerdo ni cambiar su estatus', async () => {
    leerAcuerdosDeMondayMock.mockResolvedValue(
      new Map([
        ['9', { estatus: 'abierto', fechaCompromiso: null, actualizadoEn: new Date(0), existe: false }],
        ['77', { estatus: 'abierto', fechaCompromiso: null, actualizadoEn: new Date('2026-07-01T00:00:00Z'), existe: true }],
      ]),
    )

    await refrescarDesdeMonday()

    const a = filas.find((f) => f.id === 'acuerdo-a')!
    expect(a.mondayId).toBeNull()
    expect(a.estatus).toBe('abierto') // el estatus que ya tenía NO se toca
    expect(a.historia).toHaveLength(2)
    expect(a.historia[0]).toEqual(FILA_A.historia[0]) // la entrada previa se conserva
    const aviso = a.historia[1] as { cambios?: { mondayId?: unknown; aviso?: unknown } }
    expect(aviso.cambios?.mondayId).toBeNull()
    expect(typeof aviso.cambios?.aviso).toBe('string')
    expect((aviso.cambios?.aviso as string).length).toBeGreaterThan(0)

    // La señuelo, ilesa: su mondayId sigue ahí.
    const b = filas.find((f) => f.id === 'acuerdo-b')!
    expect(b.mondayId).toBe('77')
  })

  it('gana-local: no escribe nada — ni estatus, ni fecha, ni historia', async () => {
    leerAcuerdosDeMondayMock.mockResolvedValue(
      new Map([
        [
          '9',
          {
            estatus: 'cumplido', // distinto al local, pero MÁS VIEJO: no debe aplicarse
            fechaCompromiso: '2026-01-01',
            actualizadoEn: new Date('2026-07-01T00:00:00Z'),
            existe: true,
          },
        ],
        ['77', { estatus: 'abierto', fechaCompromiso: null, actualizadoEn: new Date(0), existe: true }],
      ]),
    )

    await refrescarDesdeMonday()

    expect(filas.find((f) => f.id === 'acuerdo-a')).toEqual(FILA_A)
    expect(filas.find((f) => f.id === 'acuerdo-b')).toEqual(FILA_B)
  })

  it('sin conexión a Monday, no consulta nada ni escribe nada', async () => {
    mondayConectadoMock.mockReturnValue(false)

    await refrescarDesdeMonday()

    expect(leerAcuerdosDeMondayMock).not.toHaveBeenCalled()
    expect(filas).toEqual([FILA_A, FILA_B])
  })

  it('sin acuerdos con mondayId, no llama a leerAcuerdosDeMonday', async () => {
    filas = []

    await refrescarDesdeMonday()

    expect(leerAcuerdosDeMondayMock).not.toHaveBeenCalled()
  })
})
