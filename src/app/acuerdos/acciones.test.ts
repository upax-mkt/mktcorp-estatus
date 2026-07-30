import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as esquema from '@/db/esquema'
import { exigirEquipo } from '@/auth/sesion'

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

// Handle tipado sobre el mock de arriba: por defecto resuelve como equipo
// (todos los tests existentes de subir/descartar cuentan con eso), pero el
// test de destacarAction que exige sesión necesita poder hacerla fallar UNA
// vez sin tocar el resto — `mockRejectedValueOnce` se autoconsume, no hace
// falta resetearlo en beforeEach.
const exigirEquipoMock = vi.mocked(exigirEquipo)

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
  destacado: boolean
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

// `dbMock` espía las llamadas a `db()` en sí, no solo lo que el doble
// devuelve. Hace falta para un caso concreto (revisión a esta tarea): que la
// fila no haya cambiado prueba que no hubo ESCRITURA, pero no que `db()` ni
// se invocara — si alguien reordenara `destacarAction` y dejara `hayDB()`/
// `db()` antes de `exigirEquipo()`, la guarda seguiría lanzando, la fila
// seguiría intacta, y un test que solo mirara la fila seguiría en verde pese
// a haberse perdido que la comprobación de sesión va PRIMERO.
const dbMock = vi.fn(() => ({
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
}))

vi.mock('@/db/cliente', () => ({
  hayDB: () => true,
  // `db()` real (src/db/cliente.ts) no toma argumentos nunca; sin spread —a
  // diferencia de existeElGrupoMock y vecinos, que sí reenvían los suyos—
  // porque no hay nada que reenviar.
  db: () => dbMock(),
}))

const { subirAcuerdoAction, descartarAcuerdoAction, destacarAction } = await import('./acciones')

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
  destacado: false,
  updatedAt: new Date('2026-07-01T00:00:00Z'),
}

beforeEach(() => {
  estado.fila = { ...BASE }
  existeElGrupoMock.mockReset().mockResolvedValue(true)
  crearElementoEnDeliveryMock.mockReset()
  crearSubelementoMock.mockReset()
  // mockClear(), no mockReset(): hay que borrar el historial de llamadas de
  // cada test sin tocar la implementación (`() => ({ select, update })`) que
  // es la infraestructura permanente del doble — un mockReset() la dejaría
  // devolviendo undefined para todos los tests que corran después.
  dbMock.mockClear()
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

/**
 * destacarAction (tarea 11, ronda 7). A diferencia de subir/descartar, la
 * cuerpo de esta acción nunca corría en los tests de `Estrella`/`TablaAcuerdos`
 * —ahí `destacar` es siempre un `vi.fn()`—, así que el orden real
 * `exigirEquipo()` → `hayDB()` → UPDATE → error si no existe →
 * `revalidatePath` no tenía ningún test que lo ejecutara de verdad. Reusa el
 * mismo doble de arriba, sin arnés nuevo.
 */
describe('destacarAction', () => {
  it('exige sesión de equipo ANTES de tocar la base: si no la hay, no llega a escribir', async () => {
    exigirEquipoMock.mockRejectedValueOnce(
      new Error('Esta acción es solo para el equipo de Marketing Corporativo.'),
    )

    await expect(destacarAction('a1', true)).rejects.toThrow('solo para el equipo')

    // Nada se movió: la fila sigue exactamente como la dejó beforeEach.
    expect(estado.fila).toEqual(BASE)
    // Y no es solo que no haya ESCRITURA: `db()` ni se llamó. Sin esto, una
    // función que reordenara la guarda después de `hayDB()`/`db()` seguiría
    // lanzando por otro motivo (p. ej. el `where` no encontraría nada) y
    // este test seguiría en verde sin proteger que la sesión se comprueba
    // ANTES que cualquier otra cosa.
    expect(dbMock).not.toHaveBeenCalled()
  })

  it('marca un acuerdo como destacado', async () => {
    await destacarAction('a1', true)
    expect(estado.fila?.destacado).toBe(true)
  })

  it('lo puede volver a quitar', async () => {
    estado.fila = { ...BASE, destacado: true }
    await destacarAction('a1', false)
    expect(estado.fila?.destacado).toBe(false)
  })

  it('no confunde "coincide por el id correcto" con "es la única fila que hay"', async () => {
    // Fila señuelo: existe en el doble, pero con OTRO id. Si `coincide`
    // solo comprobara "hay una fila" en vez de comparar el id de verdad,
    // este UPDATE la encontraría igual y el test no distinguiría nada —
    // es el punto ciego que el doble tiene anotado en su cabecera.
    estado.fila = { ...BASE, id: 'senuelo', destacado: false }

    await expect(destacarAction('a1', true)).rejects.toThrow('Acuerdo no encontrado: "a1"')
    expect(estado.fila?.destacado).toBe(false) // el señuelo no se tocó

    // Con la fila correcta en su lugar, la MISMA llamada sí actualiza —
    // confirma que el rechazo de arriba fue por el id, no por otra cosa.
    estado.fila = { ...BASE, id: 'a1', destacado: false }
    await destacarAction('a1', true)
    expect(estado.fila?.destacado).toBe(true)
  })

  it('acuerdo inexistente: error explícito', async () => {
    estado.fila = null
    await expect(destacarAction('no-existe', true)).rejects.toThrow('Acuerdo no encontrado: "no-existe"')
  })
})
