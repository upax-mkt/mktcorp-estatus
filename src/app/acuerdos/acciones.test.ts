import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as esquema from '@/db/esquema'

/**
 * CONCURRENCIA DE LA BANDEJA (revisión de Franco a la tarea 8).
 *
 * Dos huecos que el diseño original no cerraba:
 *
 * 1. `subirAcuerdoAction` leía el acuerdo, llamaba a Monday y SOLO ENTONCES
 *    marcaba `bandeja = 'subido'`. Dos pestañas sobre el mismo acuerdo leían
 *    las dos `pendiente` antes de que ninguna escribiera, y subían las dos:
 *    un duplicado en un tablero de 950 filas que mira todo el equipo.
 * 2. `descartarAcuerdoAction` no comprobaba en qué estado estaba la fila: una
 *    pestaña vieja podía descartar un acuerdo que otra ya había subido de
 *    verdad, dejando `mondayId`/`mondayUrl` reales bajo `bandeja =
 *    'descartado'` — la única fuente de verdad de ese estado, mintiendo.
 *
 * El arreglo (ver acciones.ts) es reclamar la fila con un
 * `UPDATE ... WHERE bandeja = 'pendiente'` ANTES de llamar a Monday, y exigir
 * la misma condición en el UPDATE de descartar. Es exactamente esa condición
 * la que está bajo prueba aquí, así que el doble de `db()` de abajo la
 * EVALÚA de verdad contra una fila en memoria — no es un mock que siempre
 * dice que sí. Es la primera vez que este repo prueba la rama de Postgres de
 * una acción de escritura: ningún test existente monta un `db()` falso (los
 * de `db/acuerdos.ts` corren contra el store en memoria, que no modela
 * updates condicionados por WHERE).
 *
 * `eq`/`and` de drizzle-orm se sustituyen por versiones mínimas que
 * devuelven objetos planos e inspeccionables, en vez de la representación
 * SQL interna real de Drizzle (una struct de `SQL`/`queryChunks` pensada
 * para generar consultas, no para leerse desde fuera). El resto del módulo
 * se conserva real, así que `esquema.acuerdos.id`/`.bandeja` que ve el doble
 * de abajo son las MISMAS referencias de columna que usa acciones.ts.
 */

vi.mock('drizzle-orm', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('drizzle-orm')>()
  return {
    ...real,
    eq: (columna: unknown, valor: unknown) => ({ tipo: 'eq' as const, columna, valor }),
    and: (...condiciones: unknown[]) => ({ tipo: 'and' as const, condiciones }),
  }
})

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/auth/sesion', () => ({
  exigirEquipo: vi.fn().mockResolvedValue({ rol: 'equipo', sub: 'equipo-mkt-corp' }),
}))

const existeElGrupoMock = vi.fn()
const crearElementoEnDeliveryMock = vi.fn()
const crearSubelementoMock = vi.fn()
vi.mock('@/monday/cliente', () => ({
  existeElGrupo: (...args: unknown[]) => existeElGrupoMock(...args),
  crearElementoEnDelivery: (...args: unknown[]) => crearElementoEnDeliveryMock(...args),
  crearSubelemento: (...args: unknown[]) => crearSubelementoMock(...args),
}))

// ---- El doble de fila + db() ----

interface FilaFalsa {
  id: string
  salaSlug: string
  que: string
  estatus: 'abierto' | 'cumplido' | 'vencido' | 'cancelado'
  fechaCompromiso: Date | null
  responsableMondayId: string | null
  bandeja: string
  mondayId: string | null
  mondayTipo: string | null
  mondayUrl: string | null
  mondaySincronizadoEn: Date | null
  updatedAt: Date
}

type Condicion =
  | { tipo: 'eq'; columna: unknown; valor: unknown }
  | { tipo: 'and'; condiciones: Condicion[] }

// Una sola fila basta: las dos acciones bajo prueba siempre operan sobre UN
// acuerdo por id. `estado` (no una `let` suelta) para que las funciones del
// doble, definidas más abajo, la lean/escriban sin depender del orden de
// inicialización del módulo.
const estado: { fila: FilaFalsa | null } = { fila: null }

/** De qué propiedad de FilaFalsa es esta columna de esquema.acuerdos. */
function claveDeColumna(columna: unknown): keyof FilaFalsa {
  const entrada = Object.entries(esquema.acuerdos).find(([, valor]) => valor === columna)
  if (!entrada) throw new Error('Columna no reconocida en el doble de prueba de db().')
  return entrada[0] as keyof FilaFalsa
}

function coincide(cond: Condicion): boolean {
  if (!estado.fila) return false
  if (cond.tipo === 'eq') return estado.fila[claveDeColumna(cond.columna)] === cond.valor
  return cond.condiciones.every(coincide)
}

function proyectar(proyeccion?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!estado.fila) return undefined
  if (!proyeccion) return { ...estado.fila }
  const salida: Record<string, unknown> = {}
  for (const [clave, columna] of Object.entries(proyeccion)) {
    salida[clave] = estado.fila[claveDeColumna(columna)]
  }
  return salida
}

vi.mock('@/db/cliente', () => ({
  hayDB: () => true,
  db: () => ({
    select(proyeccion?: Record<string, unknown>) {
      return {
        from: () => ({
          where: (cond: Condicion) => Promise.resolve(coincide(cond) ? [proyectar(proyeccion)] : []),
        }),
      }
    },
    update() {
      return {
        set: (parche: Partial<FilaFalsa>) => ({
          where: (cond: Condicion) => {
            // La comprobación y la escritura pasan en el mismo paso
            // síncrono, sin ningún `await` entre medio — como el
            // `UPDATE ... WHERE` de Postgres, que las resuelve las dos a la
            // vez. Es lo que hace válido simular "dos pestañas" con dos
            // llamadas seguidas: la primera que llega a este punto gana.
            const afecta = coincide(cond)
            if (afecta && estado.fila) estado.fila = { ...estado.fila, ...parche }
            const promesa = Promise.resolve(undefined) as Promise<undefined> & {
              returning: (proyeccion?: Record<string, unknown>) => Promise<unknown[]>
            }
            promesa.returning = (proyeccion?: Record<string, unknown>) =>
              Promise.resolve(afecta ? [proyectar(proyeccion)] : [])
            return promesa
          },
        }),
      }
    },
  }),
}))

const { subirAcuerdoAction, descartarAcuerdoAction } = await import('./acciones')

const BASE: FilaFalsa = {
  id: 'a1',
  salaSlug: 'mexa-creativa',
  que: 'Enviar propuesta de paid media',
  estatus: 'abierto',
  fechaCompromiso: null,
  responsableMondayId: '65476486',
  bandeja: 'pendiente',
  mondayId: null,
  mondayTipo: null,
  mondayUrl: null,
  mondaySincronizadoEn: null,
  updatedAt: new Date('2026-07-01T00:00:00Z'),
}

beforeEach(() => {
  estado.fila = { ...BASE }
  existeElGrupoMock.mockReset().mockResolvedValue(true)
  crearElementoEnDeliveryMock.mockReset()
  crearSubelementoMock.mockReset()
})

describe('subirAcuerdoAction — dos pestañas sobre el mismo acuerdo', () => {
  it('la segunda llamada no crea un segundo elemento en Monday', async () => {
    crearElementoEnDeliveryMock.mockResolvedValue({ id: 'm1', url: 'https://monday.com/m1' })

    // La primera reclama la fila (bandeja pasa a 'subido' antes de llamar a
    // Monday) y sube. La segunda —misma fila, ya no 'pendiente'— no debe
    // encontrar nada que reclamar.
    await subirAcuerdoAction('a1', { tipo: 'elemento' })
    await subirAcuerdoAction('a1', { tipo: 'elemento' })

    expect(crearElementoEnDeliveryMock).toHaveBeenCalledTimes(1)
    expect(estado.fila?.bandeja).toBe('subido')
    expect(estado.fila?.mondayId).toBe('m1')
  })

  it('con destino subelemento, tampoco se duplica: la segunda llamada no cuelga un segundo subelemento', async () => {
    crearSubelementoMock.mockResolvedValue({ id: 's1', url: 'https://monday.com/s1' })

    await subirAcuerdoAction('a1', { tipo: 'subelemento', padreId: '999' })
    await subirAcuerdoAction('a1', { tipo: 'subelemento', padreId: '999' })

    expect(crearSubelementoMock).toHaveBeenCalledTimes(1)
  })
})

describe('subirAcuerdoAction — Monday falla después de reclamar la fila', () => {
  it('devuelve la fila a pendiente para poder reintentar', async () => {
    crearElementoEnDeliveryMock.mockRejectedValue(new Error('Monday respondió 500.'))

    await expect(subirAcuerdoAction('a1', { tipo: 'elemento' })).rejects.toThrow('Monday respondió 500.')

    expect(estado.fila?.bandeja).toBe('pendiente')
    expect(estado.fila?.mondayId).toBeNull()
  })

  it('el fallo no impide reintentar: con la fila de vuelta en pendiente, la segunda llamada sí sube', async () => {
    crearElementoEnDeliveryMock.mockRejectedValueOnce(new Error('Monday no respondió.'))
    crearElementoEnDeliveryMock.mockResolvedValueOnce({ id: 'm2', url: 'https://monday.com/m2' })

    await expect(subirAcuerdoAction('a1', { tipo: 'elemento' })).rejects.toThrow('Monday no respondió.')
    await subirAcuerdoAction('a1', { tipo: 'elemento' })

    expect(crearElementoEnDeliveryMock).toHaveBeenCalledTimes(2)
    expect(estado.fila?.bandeja).toBe('subido')
    expect(estado.fila?.mondayId).toBe('m2')
  })
})

describe('subirAcuerdoAction — el id no existe', () => {
  it('lanza un error explícito y no llama a Monday', async () => {
    estado.fila = null

    await expect(subirAcuerdoAction('no-existe', { tipo: 'elemento' })).rejects.toThrow(
      'Acuerdo no encontrado: "no-existe"',
    )
    expect(crearElementoEnDeliveryMock).not.toHaveBeenCalled()
  })
})

describe('descartarAcuerdoAction — no pisa un acuerdo que ya se subió', () => {
  it('un acuerdo ya subido no se marca como descartado', async () => {
    estado.fila = { ...BASE, bandeja: 'subido', mondayId: 'm1', mondayUrl: 'https://monday.com/m1' }

    await descartarAcuerdoAction('a1')

    expect(estado.fila?.bandeja).toBe('subido') // sigue 'subido', NO 'descartado'
    expect(estado.fila?.mondayId).toBe('m1') // su elemento real no se toca
  })

  it('un acuerdo de verdad pendiente sí se descarta (la guarda no rompe el camino normal)', async () => {
    await descartarAcuerdoAction('a1')
    expect(estado.fila?.bandeja).toBe('descartado')
  })
})
