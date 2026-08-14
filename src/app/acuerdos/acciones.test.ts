import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as esquema from '@/db/esquema'
import { exigirAdmin, exigirEditor } from '@/auth/roles'
import { revalidatePath } from 'next/cache'
import { diaCivil } from '@/lib/fecha'

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
// Ronda 9, tarea 2: las cuatro acciones "de bandeja/estrella" que prueba este
// archivo (subir, descartar, destacar, editar en bandeja) exigen
// `exigirEditor()` —admin o editor, no viewer—; `pausarSalaAction`/
// `reactivarSalaAction` (más abajo, describe aparte) exigen `exigirAdmin()`
// —congelar una sala es una decisión de administrador, no de cualquier
// editor—. Las dos, de `@/auth/roles`, no de la vieja `exigirEquipo()` de
// `@/auth/sesion` (retirada).
vi.mock('@/auth/roles', () => ({
  exigirEditor: vi.fn().mockResolvedValue({ rol: 'equipo', rolApp: 'editor', sub: 'equipo-mkt-corp' }),
  exigirAdmin: vi.fn().mockResolvedValue({ rol: 'equipo', rolApp: 'admin', sub: 'equipo-mkt-corp' }),
}))

// Handle tipado sobre el mock de arriba: por defecto resuelve como equipo
// (todos los tests existentes de subir/descartar cuentan con eso), pero el
// test de destacarAction que exige sesión necesita poder hacerla fallar UNA
// vez sin tocar el resto — `mockRejectedValueOnce` se autoconsume, no hace
// falta resetearlo en beforeEach.
const exigirEditorMock = vi.mocked(exigirEditor)
const exigirAdminMock = vi.mocked(exigirAdmin)
// Ronda 14, tarea 2: el único describe de este archivo que necesita
// comprobar CON QUÉ ruta se llamó `revalidatePath` (todos los anteriores solo
// comprueban que la acción hizo o no lo que tenía que hacer, nunca la ruta
// exacta) — de ahí que sea el primero en capturar el mock con nombre en vez
// de dejarlo anónimo dentro de `vi.mock('next/cache', ...)`.
const revalidatePathMock = vi.mocked(revalidatePath)

const existeElGrupoMock = vi.fn()
const crearElementoEnDeliveryMock = vi.fn()
const crearSubelementoMock = vi.fn()
vi.mock('@/monday/cliente', () => ({
  existeElGrupo: (...args: unknown[]) => existeElGrupoMock(...args),
  crearElementoEnDelivery: (...args: unknown[]) => crearElementoEnDeliveryMock(...args),
  crearSubelemento: (...args: unknown[]) => crearSubelementoMock(...args),
}))

// El freeze de salas (revisión final de la ronda 7, punto 2; y ronda 9,
// tarea 2, para las dos con nombre): se mockea aparte, igual que
// @/monday/cliente arriba — subirAcuerdoAction importa las tres.
// `pausarSalaMock`/`reactivarSalaMock` con nombre (a diferencia de antes,
// cuando ningún test de este archivo las ejercitaba) porque el describe de
// más abajo sí las prueba: hace falta poder comprobar que NO se llamaron
// cuando `exigirAdmin()` rechaza.
const salaEstaActivaMock = vi.fn()
const pausarSalaMock = vi.fn()
const reactivarSalaMock = vi.fn()
vi.mock('@/db/salas', () => ({
  salaEstaActiva: (...args: unknown[]) => salaEstaActivaMock(...args),
  pausarSala: (...args: unknown[]) => pausarSalaMock(...args),
  reactivarSala: (...args: unknown[]) => reactivarSalaMock(...args),
}))

/**
 * `editarEnBandejaAction` (punto 8) reusa `editarAcuerdo` de src/db/acuerdos.ts
 * tal cual — se mockea aquí como colaborador externo, mismo criterio que
 * @/monday/cliente y @/db/salas arriba: lo que se prueba en ESTE archivo es
 * la acción (orden de la guarda, qué le pasa a editarAcuerdo, revalidación),
 * no la lógica de editarAcuerdo, que ya tiene su propia batería de tests en
 * db/acuerdos.test.ts. Dejarlo correr real aquí además reventaría: importa
 * sincronizarCambio → escrituraActiva/actualizarEnMonday de @/monday/cliente,
 * y ese módulo está mockeado arriba con solo tres símbolos.
 */
const editarAcuerdoMock = vi.fn()
const eliminarAcuerdoMock = vi.fn()
const moverEstatusMock = vi.fn()
const salaDeAcuerdoMock = vi.fn().mockResolvedValue('mexa-creativa')
vi.mock('@/db/acuerdos', () => ({
  editarAcuerdo: (...args: unknown[]) => editarAcuerdoMock(...args),
  // Ronda 13: las dos acciones nuevas de la pestaña (`editarAcuerdoEnTabla` /
  // `eliminarAcuerdoEnTabla`) delegan aquí. Sin estas dos claves el módulo
  // doble no exporta lo que acciones.ts importa y el archivo entero revienta
  // al cargarse.
  eliminarAcuerdo: (...args: unknown[]) => eliminarAcuerdoMock(...args),
  salaDeAcuerdo: (...args: unknown[]) => salaDeAcuerdoMock(...args),
  // Ronda 14, tarea 2: `cambiarEstatusEnTablaAction` importa `moverEstatus`.
  // Mismo motivo que las dos claves de arriba (comentario de ronda 13) — sin
  // esta, el módulo doble no la exporta y el archivo entero revienta al
  // cargarse, no solo el test que la usa.
  moverEstatus: (...args: unknown[]) => moverEstatusMock(...args),
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
// `db()` antes de `exigirEditor()`, la guarda seguiría lanzando, la fila
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

const {
  subirAcuerdoAction, descartarAcuerdoAction, destacarAction, editarEnBandejaAction,
  pausarSalaAction, reactivarSalaAction,
} = await import('./acciones')

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
  existeElGrupoMock.mockReset().mockResolvedValue({ existe: true, titulo: 'Delivery Mkt Corp 2026' })
  salaEstaActivaMock.mockReset().mockResolvedValue(true)
  crearElementoEnDeliveryMock.mockReset()
  crearSubelementoMock.mockReset()
  editarAcuerdoMock.mockReset().mockResolvedValue(undefined)
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

describe('subirAcuerdoAction — el grupo configurado no existe en el tablero', () => {
  it('no reclama la fila ni llama a Monday', async () => {
    existeElGrupoMock.mockResolvedValue({ existe: false, titulo: null })

    await expect(subirAcuerdoAction('a1', { tipo: 'elemento' })).rejects.toThrow('no existe en el tablero')

    expect(crearElementoEnDeliveryMock).not.toHaveBeenCalled()
    expect(estado.fila?.bandeja).toBe('pendiente') // nunca se tocó: la comprobación corta ANTES del UPDATE de reclamo
  })
})

/**
 * EL FREEZE llega a la escritura (revisión final de la ronda 7, punto 2).
 *
 * Antes de esta corrección, `subirAcuerdoAction` solo exigía
 * `bandeja = 'pendiente'`: `entraALaBandeja` (src/monday/bandeja.ts) excluye
 * una sala en pausa de la LECTURA (`acuerdosPendientesDeSubir`), pero eso no
 * protegía la ESCRITURA — una pestaña abierta antes de pausar la sala podía
 * llegar hasta aquí y subir el acuerdo igual. `salaEstaActiva` (src/db/salas.ts)
 * se pregunta fresca, justo antes de llamar a Monday.
 */
describe('subirAcuerdoAction — la sala está en pausa', () => {
  it('no llama a Monday y devuelve la fila a pendiente', async () => {
    salaEstaActivaMock.mockResolvedValue(false)

    await expect(subirAcuerdoAction('a1', { tipo: 'elemento' })).rejects.toThrow('en pausa')

    expect(crearElementoEnDeliveryMock).not.toHaveBeenCalled()
    expect(estado.fila?.bandeja).toBe('pendiente') // se reclamó y se devolvió, no se quedó en 'subido'
    expect(estado.fila?.mondayId).toBeNull()
  })

  it('pregunta por la sala del acuerdo reclamado, no una constante', async () => {
    salaEstaActivaMock.mockResolvedValue(false)

    await expect(subirAcuerdoAction('a1', { tipo: 'elemento' })).rejects.toThrow()

    expect(salaEstaActivaMock).toHaveBeenCalledWith('mexa-creativa') // BASE.salaSlug
  })

  it('con la sala activa, sí llega a llamar a Monday (la guarda no bloquea el camino normal)', async () => {
    crearElementoEnDeliveryMock.mockResolvedValue({ id: 'm1', url: 'https://monday.com/m1' })

    await subirAcuerdoAction('a1', { tipo: 'elemento' })

    expect(crearElementoEnDeliveryMock).toHaveBeenCalledTimes(1)
    expect(estado.fila?.bandeja).toBe('subido')
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
 * `exigirEditor()` → `hayDB()` → UPDATE → error si no existe →
 * `revalidatePath` no tenía ningún test que lo ejecutara de verdad. Reusa el
 * mismo doble de arriba, sin arnés nuevo.
 */
describe('destacarAction', () => {
  it('exige sesión de equipo ANTES de tocar la base: si no la hay, no llega a escribir', async () => {
    exigirEditorMock.mockRejectedValueOnce(
      new Error('Esta acción requiere permiso de edición en Marketing Corporativo.'),
    )

    await expect(destacarAction('a1', true)).rejects.toThrow('permiso de edición')

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

/**
 * editarEnBandejaAction (punto 8, revisión final de la ronda 7): "el
 * acuerdo, su responsable y su fecha, editables ahí mismo" — la primera
 * acción de escritura de la bandeja que no es ni subir ni descartar.
 */
describe('editarEnBandejaAction', () => {
  const CAMBIOS = {
    que: 'Enviar propuesta revisada',
    responsable: 'Iris Múgica',
    responsableMondayId: '65476486',
    fechaCompromiso: '2026-08-20',
  }

  it('exige sesión de equipo ANTES de llamar a editarAcuerdo', async () => {
    exigirEditorMock.mockRejectedValueOnce(
      new Error('Esta acción requiere permiso de edición en Marketing Corporativo.'),
    )

    await expect(editarEnBandejaAction('a1', 'mexa-creativa', CAMBIOS)).rejects.toThrow('permiso de edición')

    expect(editarAcuerdoMock).not.toHaveBeenCalled()
  })

  it('llama a editarAcuerdo con el id y los tres campos, convirtiendo la fecha a Date', async () => {
    await editarEnBandejaAction('a1', 'mexa-creativa', CAMBIOS)

    expect(editarAcuerdoMock).toHaveBeenCalledWith('a1', {
      que: 'Enviar propuesta revisada',
      responsable: 'Iris Múgica',
      responsableMondayId: '65476486',
      fechaCompromiso: new Date('2026-08-20'),
    })
  })

  it('sin fecha (null), manda fechaCompromiso: null — no una cadena vacía ni Invalid Date', async () => {
    await editarEnBandejaAction('a1', 'mexa-creativa', { ...CAMBIOS, fechaCompromiso: null })

    expect(editarAcuerdoMock).toHaveBeenCalledWith('a1', expect.objectContaining({ fechaCompromiso: null }))
  })

  it('responsableMondayId null (alguien de la UDN) viaja tal cual, no se pierde', async () => {
    await editarEnBandejaAction('a1', 'mexa-creativa', { ...CAMBIOS, responsableMondayId: null })

    expect(editarAcuerdoMock).toHaveBeenCalledWith('a1', expect.objectContaining({ responsableMondayId: null }))
  })

  /**
   * LA CONDICIÓN QUE LE FALTABA (corrección de revisión): el docstring de
   * `editarEnBandejaAction` afirma "un acuerdo ya subido no se puede tocar
   * desde aquí", pero a la acción le faltaba el `WHERE bandeja = 'pendiente'`
   * que sí llevan `subirAcuerdoAction`/`descartarAcuerdoAction` — sin él, el
   * comentario mentía: la edición llegaba igual a `editarAcuerdo` y de ahí a
   * Monday. Estos dos tests son los que fijan que ahora es verdad.
   */
  it('un acuerdo ya subido no se puede tocar desde aquí: no llama a editarAcuerdo', async () => {
    estado.fila = { ...BASE, bandeja: 'subido', mondayId: 'm1', mondayUrl: 'https://monday.com/m1' }

    await editarEnBandejaAction('a1', 'mexa-creativa', CAMBIOS)

    expect(editarAcuerdoMock).not.toHaveBeenCalled()
  })

  it('un acuerdo descartado tampoco se puede tocar desde aquí', async () => {
    estado.fila = { ...BASE, bandeja: 'descartado' }

    await editarEnBandejaAction('a1', 'mexa-creativa', CAMBIOS)

    expect(editarAcuerdoMock).not.toHaveBeenCalled()
  })

  it('un acuerdo de verdad pendiente sí se sigue editando (la guarda no rompe el camino normal)', async () => {
    await editarEnBandejaAction('a1', 'mexa-creativa', CAMBIOS)

    expect(editarAcuerdoMock).toHaveBeenCalledTimes(1)
  })
})

/**
 * `pausarSalaAction`/`reactivarSalaAction` exigen ADMIN, no editor (ronda 9,
 * tarea 2): congelar o reactivar una relación comercial es una decisión de
 * quien administra Mkt Corp, el mismo nivel que crear/editar la sala —no una
 * tarea de contenido del día a día. Sin test hasta la corrección post-revisión
 * de la ronda 9 (una de las dos piezas de más riesgo que quedaron sin cubrir).
 */
describe('pausarSalaAction / reactivarSalaAction exigen admin', () => {
  it('pausarSalaAction: sin admin, rechaza y no llega a pausarSala', async () => {
    exigirAdminMock.mockRejectedValueOnce(
      new Error('Esta acción es solo para administradores de Marketing Corporativo.'),
    )

    await expect(pausarSalaAction('mexa-creativa')).rejects.toThrow('solo para administradores')

    expect(pausarSalaMock).not.toHaveBeenCalled()
  })

  it('pausarSalaAction: con admin, sí pausa la sala pedida', async () => {
    await pausarSalaAction('mexa-creativa')

    expect(pausarSalaMock).toHaveBeenCalledWith('mexa-creativa')
  })

  it('reactivarSalaAction: sin admin, rechaza y no llega a reactivarSala', async () => {
    exigirAdminMock.mockRejectedValueOnce(
      new Error('Esta acción es solo para administradores de Marketing Corporativo.'),
    )

    await expect(reactivarSalaAction('mexa-creativa')).rejects.toThrow('solo para administradores')

    expect(reactivarSalaMock).not.toHaveBeenCalled()
  })

  it('reactivarSalaAction: con admin, sí reactiva la sala pedida', async () => {
    await reactivarSalaAction('mexa-creativa')

    expect(reactivarSalaMock).toHaveBeenCalledWith('mexa-creativa')
  })
})

/**
 * RONDA 13 — corregir y eliminar desde la pestaña `/acuerdos`.
 *
 * Lo que se prueba aquí es el REPARTO DE PERMISOS, que es lo único que
 * distingue estas dos acciones de las que ya existían: corregir es trabajo de
 * equipo (editor) y eliminar es de administración (admin), aunque dentro de
 * una sala el mismo borrado lo hace cualquier editor. La diferencia es el
 * alcance de la pantalla: aquí están los de las nueve salas juntos.
 */
describe('editar y eliminar desde la pestaña de acuerdos', () => {
  beforeEach(() => {
    editarAcuerdoMock.mockReset()
    eliminarAcuerdoMock.mockReset()
    moverEstatusMock.mockReset()
    salaDeAcuerdoMock.mockReset().mockResolvedValue('mexa-creativa')
  })

  it('editar exige editor: sin sesión de equipo no toca la base', async () => {
    const { editarAcuerdoEnTablaAction } = await import('./acciones')
    exigirEditorMock.mockRejectedValueOnce(new Error('Hay que entrar para hacer esto.'))

    await expect(
      editarAcuerdoEnTablaAction('a1', { que: 'x', responsable: 'Iris', responsableMondayId: null }),
    ).rejects.toThrow('Hay que entrar')
    expect(editarAcuerdoMock).not.toHaveBeenCalled()
  })

  it('editar delega en editarAcuerdo tal cual, sin reimplementar la regla', async () => {
    const { editarAcuerdoEnTablaAction } = await import('./acciones')

    const r = await editarAcuerdoEnTablaAction('a1', {
      que: 'Mandar la propuesta',
      responsable: 'RevOps & Analytics',
      responsableMondayId: null,
    })

    expect(r).toEqual({})
    expect(editarAcuerdoMock).toHaveBeenCalledWith('a1', {
      que: 'Mandar la propuesta',
      responsable: 'RevOps & Analytics',
      responsableMondayId: null,
    })
  })

  it('si la base se queja, el error vuelve a la pantalla en vez de romperla', async () => {
    const { editarAcuerdoEnTablaAction } = await import('./acciones')
    editarAcuerdoMock.mockRejectedValueOnce(new Error('Acuerdo no encontrado'))

    const r = await editarAcuerdoEnTablaAction('fantasma', { que: 'x', responsable: '', responsableMondayId: null })

    expect(r).toEqual({ error: 'Acuerdo no encontrado' })
  })

  it('eliminar exige ADMIN, no editor: en esta pantalla están los de las nueve salas', async () => {
    const { eliminarAcuerdoEnTablaAction } = await import('./acciones')
    exigirAdminMock.mockRejectedValueOnce(
      new Error('Esta acción es solo para administradores de Marketing Corporativo.'),
    )

    await expect(eliminarAcuerdoEnTablaAction('a1')).rejects.toThrow('solo para administradores')
    expect(eliminarAcuerdoMock).not.toHaveBeenCalled()
  })

  /**
   * El slug se lee ANTES del borrado a propósito: después la fila ya no
   * existe y no habría a qué sala revalidar — se quedaría enseñando un
   * acuerdo que ya no está hasta que otra cosa la tocara.
   */
  it('eliminar averigua la sala antes de borrar, para poder revalidarla', async () => {
    const { eliminarAcuerdoEnTablaAction } = await import('./acciones')
    const orden: string[] = []
    salaDeAcuerdoMock.mockImplementationOnce(async () => { orden.push('leer sala'); return 'neracode' })
    eliminarAcuerdoMock.mockImplementationOnce(async () => { orden.push('borrar') })

    await eliminarAcuerdoEnTablaAction('a1')

    expect(orden).toEqual(['leer sala', 'borrar'])
    expect(eliminarAcuerdoMock).toHaveBeenCalledWith('a1')
  })
})

/**
 * RONDA 14, TAREA 2 — estatus y fecha compromiso desde la pestaña de
 * acuerdos. `AcuerdoControles` ya resuelve las dos cosas dentro de la sala;
 * aquí solo faltaban sus Server Actions equivalentes para `/acuerdos`.
 *
 * Mismo idioma que el describe de arriba: `exigirEditorMock`,
 * `editarAcuerdoMock`, `salaDeAcuerdoMock` (más `moverEstatusMock`, nuevo
 * aquí). `cambiarEstatusEnTablaAction`/`editarFechaEnTablaAction` exigen
 * EDITOR, no admin — corregir el estado o la fecha es trabajo de equipo,
 * igual que corregir el texto (`editarAcuerdoEnTablaAction`). Solo eliminar
 * pide admin en esta pantalla.
 */
describe('cambiar estatus y fecha desde la pestaña de acuerdos', () => {
  beforeEach(() => {
    moverEstatusMock.mockReset()
    editarAcuerdoMock.mockReset()
    salaDeAcuerdoMock.mockReset().mockResolvedValue('mexa-creativa')
  })

  it('cambiar el estatus exige editor', async () => {
    const { cambiarEstatusEnTablaAction } = await import('./acciones')
    exigirEditorMock.mockRejectedValueOnce(new Error('no autorizado'))

    await expect(cambiarEstatusEnTablaAction('a1', 'cumplido')).rejects.toThrow('no autorizado')
    expect(moverEstatusMock).not.toHaveBeenCalled()
  })

  it('cambiar el estatus lo guarda y revalida la sala del acuerdo', async () => {
    const { cambiarEstatusEnTablaAction } = await import('./acciones')
    salaDeAcuerdoMock.mockResolvedValue('zeus')

    await cambiarEstatusEnTablaAction('a1', 'cumplido')

    expect(moverEstatusMock).toHaveBeenCalledWith('a1', 'cumplido')
    expect(revalidatePathMock).toHaveBeenCalledWith('/cliente/zeus')
  })

  it('editar la fecha exige editor', async () => {
    const { editarFechaEnTablaAction } = await import('./acciones')
    exigirEditorMock.mockRejectedValueOnce(new Error('no autorizado'))

    await expect(editarFechaEnTablaAction('a1', '2026-09-01')).rejects.toThrow('no autorizado')
    expect(editarAcuerdoMock).not.toHaveBeenCalled()
  })

  it('una fecha vacía se guarda como null: "sin fecha" es un valor, no un error', async () => {
    const { editarFechaEnTablaAction } = await import('./acciones')
    salaDeAcuerdoMock.mockResolvedValue('zeus')

    await editarFechaEnTablaAction('a1', null)

    expect(editarAcuerdoMock).toHaveBeenCalledWith('a1', { fechaCompromiso: null })
  })

  /**
   * ESTE TEST ES EL QUE IMPORTA (brief de la tarea, no ceremonia):
   * `fechaCompromiso` es un `Date`, no un string, y `new Date('2026-09-01')`
   * es medianoche UTC — las 18:00 del 31 de agosto en México. La acción debe
   * usar `instanteEnCDMX`, anclada a America/Mexico_City, para que el día
   * civil guardado sea el mismo que se tecleó.
   */
  it('el 1 de septiembre guardado es el 1 de septiembre en México, no el 31 de agosto', async () => {
    const { editarFechaEnTablaAction } = await import('./acciones')
    salaDeAcuerdoMock.mockResolvedValue('zeus')

    await editarFechaEnTablaAction('a1', '2026-09-01')

    const guardada = editarAcuerdoMock.mock.calls[0][1].fechaCompromiso as Date
    expect(diaCivil(guardada.toISOString())).toBe('2026-09-01')
  })
})
