import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'
import { crearAcuerdo, editarAcuerdo, moverAcuerdoDeSala, moverEstatus, retomarAcuerdo } from './acuerdos'
import { obtenerAcuerdoMemoria, reiniciarStoreMemoria } from './store-memoria'
import * as clienteDB from './cliente'
import * as temasDB from './temas'
import * as esquema from './esquema'

/**
 * Integración de acuerdos.ts contra el store en memoria (sin DATABASE_URL,
 * vitest no lo define — ver src/db/cliente.ts) y contra un doble de la rama
 * de Postgres, para que las dos no diverjan.
 *
 * Todas las comprobaciones leen `obtenerAcuerdoMemoria` — el dato que quedó
 * en el store, no el objeto que se pasó como argumento.
 */
beforeEach(() => reiniciarStoreMemoria())

describe('crearAcuerdo — el responsable', () => {
  it('guarda el responsable tal como llega: es texto, y es lo único que identifica al dueño', async () => {
    const { id } = await crearAcuerdo('neracode', {
      que: 'Mandar propuesta de staffing',
      responsable: 'Franco Cruzat',
      fechaCompromiso: null,
    })

    expect(obtenerAcuerdoMemoria(id)?.responsable).toBe('Franco Cruzat')
  })

  it('un responsable de la UDN se guarda igual que uno de Mkt Corp: la app no distingue', async () => {
    // Hasta el 20-ago-2026 sí distinguía —`responsableMondayId` decidía si el
    // acuerdo subía al tablero de Monday— y esa columna era la mitad del
    // dato. Con Monday desmontado el dueño es un nombre y nada más; quien
    // reintroduzca dos identificadores para la misma persona, que lo haga a
    // propósito y no por herencia.
    const { id } = await crearAcuerdo('neracode', {
      que: 'Mandar logo en alta resolución',
      responsable: 'Directora de Marketing UDN',
      fechaCompromiso: null,
    })

    expect(obtenerAcuerdoMemoria(id)?.responsable).toBe('Directora de Marketing UDN')
  })

  it('editarAcuerdo cambia el responsable y lo deja escrito en la historia', async () => {
    const { id } = await crearAcuerdo('neracode', {
      que: 'Mandar propuesta',
      responsable: 'Directora UDN',
      fechaCompromiso: null,
    })

    await editarAcuerdo(id, { responsable: 'Franco Cruzat' })

    const guardado = obtenerAcuerdoMemoria(id)
    expect(guardado?.responsable).toBe('Franco Cruzat')
    expect(guardado?.historia).toContainEqual(
      expect.objectContaining({ cambios: { responsable: 'Franco Cruzat' } }),
    )
  })
})

/**
 * El dedupe de `crearAcuerdo` contra el STORE EN MEMORIA (sin DATABASE_URL —
 * el camino que corre `npm run dev` sin credenciales y la mayoría de los
 * tests de este repo). A diferencia de la carrera de `documentos.estructura`
 * —donde el camino en memoria ya era seguro sin tocarlo, por cómo se
 * intercalan las promesas de JS—, este dedupe es una regla de negocio NUEVA
 * que había que añadir a `store-memoria.ts` a propósito
 * (`buscarAcuerdoDuplicadoMemoria`): sin ella, el store en memoria seguiría
 * insertando dos filas en cada reintento aunque Postgres ya no lo hiciera —
 * el doble mintiendo, que es justo lo que la ronda pide evitar.
 */
describe('crearAcuerdo — el dedupe también en memoria (deuda de concurrencia, ronda 11)', () => {
  it('el mismo acuerdo, dos veces para la misma reunión, deja UNA sola fila en el store', async () => {
    const datos = { que: 'Mandar propuesta revisada', responsable: 'Pablo Levy', fechaCompromiso: null, reunionOrigenId: 'reunion-1' }
    const primero = await crearAcuerdo('neracode', datos)
    const segundo = await crearAcuerdo('neracode', datos)

    expect(segundo.id).toBe(primero.id)
    expect(obtenerAcuerdoMemoria(primero.id)).not.toBeUndefined()
  })

  it('sin reunionOrigenId (alta manual), dos altas iguales SÍ dejan dos filas', async () => {
    const datos = { que: 'Acuerdo manual', responsable: 'Alguien', fechaCompromiso: null }
    const primero = await crearAcuerdo('neracode', datos)
    const segundo = await crearAcuerdo('neracode', datos)

    expect(segundo.id).not.toBe(primero.id)
    expect(obtenerAcuerdoMemoria(primero.id)).not.toBeUndefined()
    expect(obtenerAcuerdoMemoria(segundo.id)).not.toBeUndefined()
  })

  it('con fechaCompromiso distinta, no se considera el mismo acuerdo', async () => {
    const base = { que: 'Mandar propuesta', responsable: 'Pablo Levy', reunionOrigenId: 'reunion-1' }
    const primero = await crearAcuerdo('neracode', { ...base, fechaCompromiso: new Date('2026-08-10') })
    const segundo = await crearAcuerdo('neracode', { ...base, fechaCompromiso: new Date('2026-08-20') })

    expect(segundo.id).not.toBe(primero.id)
  })
})

describe('retomarAcuerdo', () => {
  it('registra en la historia que la sesión lo retomó, sin tocar el estatus', async () => {
    const { id } = await crearAcuerdo('neracode', {
      que: 'Mandar propuesta de staffing',
      responsable: 'Directora de Marketing UDN',
      fechaCompromiso: null,
    })

    await retomarAcuerdo(id, 'sesion-1')

    const guardado = obtenerAcuerdoMemoria(id)
    expect(guardado?.estatus).toBe('abierto')
    expect(guardado?.historia).toContainEqual(expect.objectContaining({ cambios: { retomadoEnSesion: 'sesion-1' } }))
  })

  it('no duplica el acuerdo: sigue siendo la misma fila, con el mismo id, aunque lo retomen dos sesiones', async () => {
    const { id } = await crearAcuerdo('neracode', {
      que: 'Mandar logo en alta resolución',
      responsable: 'Directora de Marketing UDN',
      fechaCompromiso: null,
    })

    await retomarAcuerdo(id, 'sesion-1')
    await retomarAcuerdo(id, 'sesion-2')

    // Dos sesiones retomaron el MISMO acuerdo: una fila, dos entradas en su
    // historia — nunca un segundo acuerdo con el mismo "que".
    const guardado = obtenerAcuerdoMemoria(id)
    expect(guardado?.id).toBe(id)
    expect(guardado?.historia).toHaveLength(2)
  })

  it('un acuerdo que no existe revienta con un mensaje claro, no en silencio', async () => {
    await expect(retomarAcuerdo('no-existe', 'sesion-1')).rejects.toThrow('Acuerdo no encontrado')
  })
})

/**
 * `moverAcuerdoDeSala` (ronda 14, tarea 3): mover un acuerdo registrado en la
 * sala equivocada, sin borrarlo y volverlo a crear (lo que perdería su
 * `reunionOrigenId` y su historia).
 *
 * RULING de esta ronda, no reabrir: el store en memoria NO modela la sala
 * dentro de `actualizarAcuerdoMemoria` (su `Omit` excluye `salaSlug` a
 * propósito), así que estos tests corren contra `moverAcuerdoDeSalaMemoria`
 * —la función con nombre propio de `store-memoria.ts`— y no contra un
 * `actualizarAcuerdoMemoria` ensanchado.
 */
describe('moverAcuerdoDeSala', () => {
  it('rechaza una sala que no existe, en vez de dejar el acuerdo huérfano', async () => {
    const { id } = await crearAcuerdo('neracode', {
      que: 'Mandar propuesta de staffing',
      responsable: 'Franco Cruzat',
      fechaCompromiso: null,
    })

    await expect(moverAcuerdoDeSala(id, 'sala-inventada')).rejects.toThrow(/desconocida/i)

    // Y el acuerdo se queda tal como estaba: el rechazo pasó ANTES de tocar la fila.
    expect(obtenerAcuerdoMemoria(id)?.salaSlug).toBe('neracode')
  })

  it('rechaza "grupo-upax": tiene fila en el registro de temas pero dejó de ser una sala el 24-jul', async () => {
    const { id } = await crearAcuerdo('neracode', {
      que: 'Mandar propuesta de staffing',
      responsable: 'Franco Cruzat',
      fechaCompromiso: null,
    })

    await expect(moverAcuerdoDeSala(id, 'grupo-upax')).rejects.toThrow(/desconocida/i)
  })

  it('un acuerdo que no existe revienta con un mensaje claro', async () => {
    await expect(moverAcuerdoDeSala('no-existe', 'zeus')).rejects.toThrow('Acuerdo no encontrado')
  })

  it('mueve el acuerdo a la sala nueva, sin tocar reunionOrigenId', async () => {
    const { id } = await crearAcuerdo('neracode', {
      que: 'Mandar propuesta de staffing',
      responsable: 'Franco Cruzat',
      fechaCompromiso: null,
      reunionOrigenId: 'reunion-1',
    })

    await moverAcuerdoDeSala(id, 'zeus')

    const guardado = obtenerAcuerdoMemoria(id)
    expect(guardado?.salaSlug).toBe('zeus')
    expect(guardado?.reunionOrigenId).toBe('reunion-1') // el acuerdo se acordó donde se acordó
  })

  it('deja constancia del movimiento en la historia, con la sala nueva', async () => {
    const { id } = await crearAcuerdo('neracode', {
      que: 'Mandar propuesta de staffing',
      responsable: 'Franco Cruzat',
      fechaCompromiso: null,
    })

    await moverAcuerdoDeSala(id, 'zeus')

    const guardado = obtenerAcuerdoMemoria(id)
    expect(guardado?.historia).toContainEqual(expect.objectContaining({ cambios: { salaSlug: 'zeus' } }))
  })

})

/**
 * LA RAMA DE POSTGRES de `moverEstatus`, `editarAcuerdo`, `retomarAcuerdo` y
 * `moverAcuerdoDeSala`.
 *
 * Los tests de arriba corren contra el store en memoria (`hayDB()` real es
 * falso en vitest, que no carga `.env.local`), así que nunca ejercitan la
 * rama de Postgres. Aquí se simula con un doble mínimo de `db()` (UNA sola
 * fila basta: no hay más de un acuerdo en juego en ningún test de este
 * bloque, mismo criterio aceptado en el doble de
 * src/app/acuerdos/acciones.test.ts).
 */
describe('escrituras sobre la fila real (rama Postgres)', () => {
  interface FilaDB {
    id: string
    salaSlug: string
    que: string
    estatus: 'abierto' | 'cumplido' | 'vencido' | 'cancelado'
    fechaCompromiso: Date | null
    responsable: string
    historia: unknown[]
    updatedAt: Date
  }

  function claveDeColumna(columna: unknown): keyof FilaDB {
    const entrada = Object.entries(esquema.acuerdos).find(([, valor]) => valor === columna)
    if (!entrada) throw new Error('Columna no reconocida en el doble de prueba de db().')
    return entrada[0] as keyof FilaDB
  }

  let fila: FilaDB

  function dobleDB() {
    return {
      select(proyeccion?: Record<string, unknown>) {
        return {
          from: () => ({
            where: () => {
              if (!proyeccion) return Promise.resolve([{ ...fila }])
              const salida: Record<string, unknown> = {}
              for (const [clave, columna] of Object.entries(proyeccion)) salida[clave] = fila[claveDeColumna(columna)]
              return Promise.resolve([salida])
            },
          }),
        }
      },
      update() {
        return {
          set: (parche: Partial<FilaDB>) => ({
            where: () => {
              Object.assign(fila, parche)
              return Promise.resolve(undefined)
            },
          }),
        }
      },
    }
  }

  beforeEach(() => {
    fila = {
      id: 'a1',
      salaSlug: 'neracode',
      que: 'Mandar propuesta de staffing',
      estatus: 'abierto',
      fechaCompromiso: null,
      responsable: 'Franco Cruzat',
      historia: [],
      updatedAt: new Date('2026-07-01T00:00:00Z'),
    }
    vi.spyOn(clienteDB, 'hayDB').mockReturnValue(true)
    vi.spyOn(clienteDB, 'db').mockReturnValue(dobleDB() as unknown as ReturnType<typeof clienteDB.db>)
  })

  afterEach(() => vi.restoreAllMocks())

  it('moverEstatus escribe el estatus nuevo y guarda el anterior en la historia', async () => {
    fila.estatus = 'abierto'

    await moverEstatus('a1', 'cumplido')

    expect(fila.estatus).toBe('cumplido')
    expect(fila.historia).toContainEqual(expect.objectContaining({ estatusAnterior: 'abierto' }))
  })

  it('retomarAcuerdo no cambia el estatus guardado: solo la historia', async () => {
    await retomarAcuerdo('a1', 'sesion-1')

    expect(fila.estatus).toBe('abierto')
    expect(fila.historia).toContainEqual(expect.objectContaining({ cambios: { retomadoEnSesion: 'sesion-1' } }))
  })

  /**
   * `moverAcuerdoDeSala` — rama Postgres (ronda de arreglo 1/5 sobre la
   * tarea 3: hallazgo de revisión. Era la única función de escritura de este
   * archivo cuya rama `hayDB()` no ejercitaba ningún test — sus tres
   * hermanas, arriba, sí). NIDO dentro de este describe a propósito, no un
   * describe hermano con su propio doble duplicado: `fila`/`dobleDB` de
   * arriba son closures de ESTE bloque (no visibles fuera de él), y son
   * EXACTAMENTE el doble mínimo de `db()` que hace falta aquí también — un
   * describe nuevo "al lado" habría significado copiar otra vez la interfaz
   * `FilaDB`, `claveDeColumna` y `dobleDB()`, cuando anidar los reusa tal
   * cual, con el mismo `beforeEach` que ya deja `hayDB()`/`db()` mockeados.
   */
  describe('moverAcuerdoDeSala', () => {
    beforeEach(() => {
      // `moverAcuerdoDeSala` pasa por `validarSala` → `slugsDeSalas()`
      // (src/db/temas.ts), que a su vez llama a `cargarTemas()` — y ESA sí
      // golpea `db()` con una forma de consulta (`.select().from(esquema.salas)`,
      // sin `.where()`) que el `dobleDB()` de este bloque no modela (solo
      // sabe responder `select().from().where()`). Mismo mockeo directo que
      // ya usa el describe de "crearAcuerdo — no duplica..." más abajo, y por
      // el mismo motivo: sin esto no se prueba la escritura de este describe,
      // se prueba si `slugsDeSalas` sabe leer un doble que no es el suyo.
      vi.spyOn(temasDB, 'slugsDeSalas').mockResolvedValue(['neracode', 'zeus'])
    })

    it('escribe salaSlug y deja la entrada de historia sobre la fila real', async () => {
      await moverAcuerdoDeSala('a1', 'zeus')

      expect(fila.salaSlug).toBe('zeus')
      expect(fila.historia).toContainEqual(expect.objectContaining({ cambios: { salaSlug: 'zeus' } }))
    })
  })
})

/**
 * `crearAcuerdo` — deuda de concurrencia, ronda 11, arreglo #2: `guardarMinuta`
 * (`src/db/minutas.ts`) llama a `crearAcuerdo` una vez por acuerdo confirmado,
 * EN UN BUCLE. Un doble clic en "Publicar" o un reintento tras un hipo de red
 * repiten la MISMA llamada con el MISMO `acuerdosConfirmados` — sin nada aquí,
 * cada repetición volvía a insertar los mismos acuerdos, duplicados en la
 * sala. Es "la reunión fantasma" (participacion.ts:75-88) aplicada a los
 * acuerdos.
 *
 * Este describe prueba el MECANISMO (crearAcuerdo en sí, contra un doble de
 * Postgres); `minutas-concurrencia.test.ts` prueba el ESCENARIO completo
 * ("publicar dos veces la misma minuta no duplica los acuerdos").
 *
 * El doble de `db()` interpreta el fragmento SQL con `PgDialect().sqlToQuery`
 * —la misma pieza que usa Drizzle para compilarlo de verdad— y le confía a
 * Postgres que `INSERT ... SELECT ... WHERE NOT EXISTS` hace lo que
 * documenta: mismo criterio que ya usa `minutas.test.ts` para `ON CONFLICT
 * DO UPDATE`, y `documentos-concurrencia.test.ts` para `jsonb_set`/`jsonb_agg`.
 */
describe('crearAcuerdo — no duplica un acuerdo de la misma reunión al reintentar (deuda de concurrencia, ronda 11)', () => {
  const dialect = new PgDialect()

  interface FilaAcuerdoToy {
    id: string
    salaSlug: string
    que: string
    responsable: string
    fechaCompromiso: string | null
    reunionOrigenId: string | null
  }

  let filas: FilaAcuerdoToy[]

  /** Mismo criterio de unicidad que la sentencia real: reunionOrigenId no nulo + que + responsable + fechaCompromiso. */
  function coincide(f: FilaAcuerdoToy, candidato: Omit<FilaAcuerdoToy, 'id' | 'salaSlug'>): boolean {
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
      // El INSERT ... SELECT ... WHERE NOT EXISTS ... RETURNING id de
      // `crearAcuerdo`: params en el orden fijo que arma la sentencia real
      // (ver el comentario de `crearAcuerdo`) — id, salaSlug, que,
      // responsable, squad, prioridad, fechaCompromiso, reunionOrigenId.
      execute: (query: unknown) => {
        const { params } = dialect.sqlToQuery(query as SQL)
        const [id, salaSlug, que, responsable, , , fechaCompromiso, reunionOrigenId] = params as (string | null)[]
        const candidato = { que: que as string, responsable: responsable as string, fechaCompromiso, reunionOrigenId }
        if (filas.some((f) => coincide(f, candidato))) return Promise.resolve({ rows: [] })
        filas.push({ id: id as string, salaSlug: salaSlug as string, ...candidato })
        return Promise.resolve({ rows: [{ id }] })
      },
      // El SELECT de respaldo que busca el id ya existente cuando el INSERT
      // de arriba no insertó nada (ver el comentario de `crearAcuerdo`).
      select: () => ({
        from: () => ({
          where: (condicion: unknown) => {
            const { params } = dialect.sqlToQuery(condicion as SQL)
            const [reunionOrigenId, que, responsable] = params as (string | null)[]
            const encontrada = filas.find(
              (f) => f.reunionOrigenId === reunionOrigenId && f.que === que && f.responsable === responsable,
            )
            return Promise.resolve(encontrada ? [{ id: encontrada.id }] : [])
          },
        }),
      }),
      // EL INSERT LISO DEL CÓDIGO VIEJO (`.insert(acuerdos).values({...})`,
      // sin condición): se deja funcionando A PROPÓSITO, sin ningún dedupe,
      // para que el RED de este describe demuestre la duplicación de verdad
      // (dos filas) en vez de solo un TypeError por método faltante — el
      // código arreglado ya no llama a `.insert()` para esta tabla, así que
      // contra él esta rama simplemente no se ejercita.
      insert: (tabla: unknown) => {
        if (tabla !== esquema.acuerdos) throw new Error(`insert inesperado en el doble: ${String(tabla)}`)
        return {
          values: (vals: FilaAcuerdoToy) => {
            filas.push({ ...vals })
            return Promise.resolve(undefined)
          },
        }
      },
    }
  }

  beforeEach(() => {
    filas = []
    vi.spyOn(clienteDB, 'hayDB').mockReturnValue(true)
    vi.spyOn(clienteDB, 'db').mockReturnValue(dobleDB() as unknown as ReturnType<typeof clienteDB.db>)
    // `validarSala` pasa por `slugsDeSalas` (src/db/temas.ts, envuelta en
    // `cache()` de React): en vez de fiarse de que `hayDB()` mockeado se
    // propague correctamente hasta su rama de Postgres —arriesgado, memoiza
    // por argumento y este archivo ya la pudo haber llamado antes con
    // `hayDB() === false`—, se mockea directo. Sin esto no es la carrera lo
    // que se prueba, es si `slugsDeSalas` sabe leer el doble de esta suite.
    vi.spyOn(temasDB, 'slugsDeSalas').mockResolvedValue(['neracode'])
  })

  afterEach(() => vi.restoreAllMocks())

  it('publicar el mismo acuerdo dos veces para la misma reunión deja UNA sola fila', async () => {
    const datos = { que: 'Mandar propuesta revisada', responsable: 'Pablo Levy', fechaCompromiso: null, reunionOrigenId: 'reunion-1' }
    await crearAcuerdo('neracode', datos)
    await crearAcuerdo('neracode', datos)

    expect(filas).toHaveLength(1)
  })

  it('el reintento devuelve el id de la fila YA creada, nunca uno fabricado que no corresponde a ninguna fila', async () => {
    const datos = { que: 'Mandar propuesta revisada', responsable: 'Pablo Levy', fechaCompromiso: null, reunionOrigenId: 'reunion-1' }
    const primero = await crearAcuerdo('neracode', datos)
    const segundo = await crearAcuerdo('neracode', datos)

    expect(segundo.id).toBe(primero.id)
    expect(filas.map((f) => f.id)).toEqual([primero.id])
  })

  it('dos reuniones distintas SÍ dejan dos filas: el dedupe es por reunión, no un candado global sobre el texto', async () => {
    const base = { que: 'Mandar propuesta', responsable: 'Pablo Levy', fechaCompromiso: null }
    await crearAcuerdo('neracode', { ...base, reunionOrigenId: 'reunion-1' })
    await crearAcuerdo('neracode', { ...base, reunionOrigenId: 'reunion-2' })

    expect(filas).toHaveLength(2)
  })

  it('un alta manual (sin reunionOrigenId, como crearAcuerdoAction) nunca se dedupea: sigue siendo un INSERT liso', async () => {
    const datos = { que: 'Acuerdo dado de alta a mano', responsable: 'Directora UDN', fechaCompromiso: null }
    await crearAcuerdo('neracode', datos)
    await crearAcuerdo('neracode', datos)

    // Dos altas manuales con el mismo texto son dos compromisos reales, no
    // un reintento — `reunionOrigenId` nulo nunca activa el dedupe (ver el
    // comentario de `crearAcuerdo` sobre `=` vs. `IS NOT DISTINCT FROM`).
    expect(filas).toHaveLength(2)
  })

  it('borrar el acuerdo a mano y volver a publicar la misma minuta SÍ lo vuelve a crear', async () => {
    const datos = { que: 'Mandar propuesta', responsable: 'Pablo Levy', fechaCompromiso: null, reunionOrigenId: 'reunion-1' }
    await crearAcuerdo('neracode', datos)
    // Simula `eliminarAcuerdo`: DELETE real, sin papelera.
    filas = []

    await crearAcuerdo('neracode', datos)

    // El dedupe mira el estado ACTUAL de la tabla, no un historial de qué se
    // publicó alguna vez: sin la fila, NOT EXISTS vuelve a ser verdadero.
    expect(filas).toHaveLength(1)
  })
})
