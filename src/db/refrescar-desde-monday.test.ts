import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as esquema from './esquema'

/**
 * `refrescarDesdeMonday` (src/db/acuerdos.ts, tarea 9; ampliada en la
 * revisión final de la ronda 7 con `salaSlug` y la ventana de frescura) es la
 * ORQUESTACIÓN de la vuelta: lee los acuerdos con mondayId que tocan
 * refrescar, llama a `leerAcuerdosDeMonday` y aplica `reconciliar` a cada
 * uno, escribiendo el resultado. `reconciliar` en sí ya está probado como
 * función pura (sincronizar.test.ts); lo que este archivo cubre es la parte
 * que esos tests NO pueden: que la orquestación lea la fila correcta,
 * escriba solo lo que le toca a cada rama, filtre por sala cuando se le pide,
 * respete la ventana de frescura, y no cruce el resultado de un acuerdo con
 * el de otro cuando hay varios a la vez.
 *
 * `@/db/cliente` y `@/monday/cliente` se sustituyen aquí — es el mismo
 * criterio que src/app/acuerdos/acciones.test.ts (la primera vez que este
 * repo montó un `db()` que EVALÚA de verdad `eq`/`isNotNull`/`and` en vez de
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
    and: (...condiciones: unknown[]) => ({ tipo: 'and' as const, condiciones }),
  }
})

interface FilaAcuerdoVuelta {
  id: string
  salaSlug: string
  mondayId: string | null
  mondayTipo: string | null
  mondayUrl: string | null
  mondaySincronizadoEn: Date | null
  estatus: 'abierto' | 'cumplido' | 'vencido' | 'cancelado'
  fechaCompromiso: Date | null
  historia: unknown[]
  updatedAt: Date
}

type Condicion =
  | { tipo: 'eq'; columna: unknown; valor: unknown }
  | { tipo: 'isNotNull'; columna: unknown }
  | { tipo: 'and'; condiciones: Condicion[] }

/** De qué propiedad de FilaAcuerdoVuelta es esta columna de esquema.acuerdos — misma técnica que acciones.test.ts. */
function claveDeColumna(columna: unknown): keyof FilaAcuerdoVuelta {
  const entrada = Object.entries(esquema.acuerdos).find(([, valor]) => valor === columna)
  if (!entrada) throw new Error('Columna no reconocida en el doble de prueba de db().')
  return entrada[0] as keyof FilaAcuerdoVuelta
}

/**
 * A diferencia de la versión anterior de este doble —que el SELECT ignoraba
 * el WHERE por completo—, ahora SÍ hace falta evaluarlo de verdad: el punto 4
 * de la revisión final añade `and(isNotNull(mondayId), eq(salaSlug, …))`
 * cuando se llama desde una sala, y sin esto ningún test podría distinguir
 * "filtró bien" de "trajo todo e ignoró el argumento".
 */
function coincideSelect(cond: Condicion, fila: FilaAcuerdoVuelta): boolean {
  if (cond.tipo === 'eq') return fila[claveDeColumna(cond.columna)] === cond.valor
  if (cond.tipo === 'isNotNull') return fila[claveDeColumna(cond.columna)] != null
  return cond.condiciones.every((c) => coincideSelect(c, fila))
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
          where: (cond: Condicion) =>
            Promise.resolve(
              filas
                .filter((f) => coincideSelect(cond, f))
                .map((f) => {
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

// `mondaySincronizadoEn` bien viejo a propósito: la ventana de frescura
// (60 s, ver VENTANA_FRESCURA_MS en acuerdos.ts) tiene que dejar pasar estas
// filas en los tests que no la ejercitan a propósito — si no, ningún test
// de este archivo llegaría a llamar a leerAcuerdosDeMonday.
const HACE_MUCHO = new Date('2026-07-01T00:00:00Z')

const FILA_A: FilaAcuerdoVuelta = {
  id: 'acuerdo-a',
  salaSlug: 'mexa-creativa',
  mondayId: '9',
  mondayTipo: 'elemento',
  mondayUrl: 'https://monday.com/x/9',
  mondaySincronizadoEn: HACE_MUCHO,
  estatus: 'abierto',
  fechaCompromiso: new Date('2026-08-01T00:00:00Z'),
  historia: [{ en: '2026-07-01T00:00:00.000Z', cambios: { que: 'inicial' } }],
  updatedAt: new Date('2026-07-29T10:00:00Z'),
}

// Señuelo: otro acuerdo, otro mondayId, OTRA sala. Sin él, un UPDATE que
// ignorara el id (o un SELECT que ignorara la sala) pasaría los tests igual.
const FILA_B: FilaAcuerdoVuelta = {
  id: 'acuerdo-b',
  salaSlug: 'neracode',
  mondayId: '77',
  mondayTipo: 'subelemento',
  mondayUrl: 'https://monday.com/x/77',
  mondaySincronizadoEn: HACE_MUCHO,
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
  it('gana-monday: actualiza estatus, fecha y mondaySincronizadoEn de LA FILA CORRECTA, sin tocar la señuelo', async () => {
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
    expect(a.mondaySincronizadoEn!.getTime()).toBeGreaterThan(HACE_MUCHO.getTime()) // ventana de frescura: se acaba de comprobar

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

    // La señuelo (gana-local) NO cambia estatus/fecha/historia — pero sí se
    // le bumpea mondaySincronizadoEn, ver el test dedicado más abajo.
    const b = filas.find((f) => f.id === 'acuerdo-b')!
    expect(b.estatus).toBe(FILA_B.estatus)
    expect(b.fechaCompromiso).toEqual(FILA_B.fechaCompromiso)
    expect(b.historia).toEqual(FILA_B.historia)
  })

  it('desapareció: pone mondayId/mondayUrl/mondayTipo = null y dice por qué en la historia, sin borrar el acuerdo ni cambiar su estatus', async () => {
    leerAcuerdosDeMondayMock.mockResolvedValue(
      new Map([
        ['9', { estatus: 'abierto', fechaCompromiso: null, actualizadoEn: new Date(0), existe: false }],
        ['77', { estatus: 'abierto', fechaCompromiso: null, actualizadoEn: new Date('2026-07-01T00:00:00Z'), existe: true }],
      ]),
    )

    await refrescarDesdeMonday()

    const a = filas.find((f) => f.id === 'acuerdo-a')!
    expect(a.mondayId).toBeNull()
    // Corrección de la revisión final de la ronda 7 (punto 6): antes solo se
    // limpiaba mondayId, y la fila se quedaba enseñando "Ver en Monday ↗" a
    // un elemento que ya no existe (ver TablaAcuerdos.tsx).
    expect(a.mondayUrl).toBeNull()
    expect(a.mondayTipo).toBeNull()
    // mondaySincronizadoEn NO se limpia: es la señal que distingue este caso
    // ("se sincronizó y luego desapareció") de uno que nunca se sincronizó —
    // ver AcuerdoConSala.mondayDesvinculado en src/db/consultas.ts.
    expect(a.mondaySincronizadoEn).not.toBeNull()
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

  it('gana-local: no cambia estatus/fecha/historia, pero SÍ bumpea mondaySincronizadoEn (alimenta la ventana de frescura)', async () => {
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

    const a = filas.find((f) => f.id === 'acuerdo-a')!
    const b = filas.find((f) => f.id === 'acuerdo-b')!
    expect(a.estatus).toBe(FILA_A.estatus)
    expect(a.fechaCompromiso).toEqual(FILA_A.fechaCompromiso)
    expect(a.historia).toEqual(FILA_A.historia)
    expect(b.estatus).toBe(FILA_B.estatus)
    expect(b.historia).toEqual(FILA_B.historia)
    // La comprobación SÍ pasó, así que las dos quedan "recién vistas" — sin
    // esto, un acuerdo estable se volvería a consultar en cada carga.
    expect(a.mondaySincronizadoEn!.getTime()).toBeGreaterThan(HACE_MUCHO.getTime())
    expect(b.mondaySincronizadoEn!.getTime()).toBeGreaterThan(HACE_MUCHO.getTime())
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

// ---- Punto 4 de la revisión final de la ronda 7: filtro por sala ----

describe('refrescarDesdeMonday(salaSlug) — filtra por sala', () => {
  it('con un slug, solo pide a Monday los acuerdos de ESA sala', async () => {
    leerAcuerdosDeMondayMock.mockResolvedValue(new Map())

    await refrescarDesdeMonday('mexa-creativa')

    // Solo el mondayId de acuerdo-a (mexa-creativa) — el de acuerdo-b
    // (neracode) ni se pide.
    expect(leerAcuerdosDeMondayMock).toHaveBeenCalledWith([{ mondayId: '9', tipo: 'elemento' }])
  })

  it('sin slug, pide los de TODAS las salas', async () => {
    leerAcuerdosDeMondayMock.mockResolvedValue(new Map())

    await refrescarDesdeMonday()

    expect(leerAcuerdosDeMondayMock).toHaveBeenCalledWith([
      { mondayId: '9', tipo: 'elemento' },
      { mondayId: '77', tipo: 'subelemento' },
    ])
  })

  it('una sala sin acuerdos sincronizados no llama a Monday', async () => {
    await refrescarDesdeMonday('zeus')
    expect(leerAcuerdosDeMondayMock).not.toHaveBeenCalled()
  })
})

// ---- Punto 4 de la revisión final de la ronda 7: ventana de frescura ----

describe('refrescarDesdeMonday — ventana de frescura', () => {
  it('un acuerdo comprobado hace menos de 60 s NO se vuelve a consultar', async () => {
    filas = [{ ...FILA_A, mondaySincronizadoEn: new Date() }, { ...FILA_B }]
    leerAcuerdosDeMondayMock.mockResolvedValue(new Map())

    await refrescarDesdeMonday()

    // Solo acuerdo-b (viejo, HACE_MUCHO) se pide; acuerdo-a está fresco.
    expect(leerAcuerdosDeMondayMock).toHaveBeenCalledWith([{ mondayId: '77', tipo: 'subelemento' }])
  })

  it('un acuerdo que nunca se comprobó (mondaySincronizadoEn null) siempre se pide', async () => {
    filas = [{ ...FILA_A, mondaySincronizadoEn: null }]
    leerAcuerdosDeMondayMock.mockResolvedValue(new Map())

    await refrescarDesdeMonday()

    expect(leerAcuerdosDeMondayMock).toHaveBeenCalledWith([{ mondayId: '9', tipo: 'elemento' }])
  })

  it('con las dos filas frescas, no llama a Monday en absoluto', async () => {
    filas = [{ ...FILA_A, mondaySincronizadoEn: new Date() }, { ...FILA_B, mondaySincronizadoEn: new Date() }]

    await refrescarDesdeMonday()

    expect(leerAcuerdosDeMondayMock).not.toHaveBeenCalled()
  })
})
