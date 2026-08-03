import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { crearAcuerdo, editarAcuerdo, moverEstatus, retomarAcuerdo } from './acuerdos'
import { obtenerAcuerdoMemoria, actualizarAcuerdoMemoria, reiniciarStoreMemoria } from './store-memoria'
import * as sincronizarMod from '@/monday/sincronizar'
import * as clienteDB from './cliente'
import * as esquema from './esquema'

/**
 * Integración de acuerdos.ts contra el store en memoria (sin DATABASE_URL,
 * vitest no lo define — ver src/db/cliente.ts). Cubre lo que bandeja.test.ts
 * no puede: que `crearAcuerdo` y `editarAcuerdo` de verdad USEN la regla pura
 * de src/monday/bandeja.ts al guardar, y que la rama de Postgres y la de
 * memoria no diverjan.
 *
 * Todas las comprobaciones leen `obtenerAcuerdoMemoria` — el dato que quedó
 * en el store, no el objeto que se pasó como argumento. Si `crearAcuerdo` o
 * `editarAcuerdo` dejaran de guardar `responsableMondayId` o `bandeja` en la
 * rama de memoria, estos tests tienen que caer.
 */
beforeEach(() => reiniciarStoreMemoria())

describe('crearAcuerdo y la bandeja', () => {
  it('con responsable de Mkt Corp, guarda el id y queda pendiente', async () => {
    const { id } = await crearAcuerdo('neracode', {
      que: 'Mandar propuesta de staffing',
      responsable: 'Franco Cruzat',
      fechaCompromiso: null,
      responsableMondayId: '65476480',
    })

    const guardado = obtenerAcuerdoMemoria(id)
    expect(guardado?.responsableMondayId).toBe('65476480')
    expect(guardado?.bandeja).toBe('pendiente')
  })

  it('sin responsable de Mkt Corp (responsable de la UDN), no aplica', async () => {
    const { id } = await crearAcuerdo('neracode', {
      que: 'Mandar logo en alta resolución',
      responsable: 'Directora de Marketing UDN',
      fechaCompromiso: null,
      // Sin responsableMondayId: es de la UDN, no de Mkt Corp.
    })

    const guardado = obtenerAcuerdoMemoria(id)
    expect(guardado?.responsableMondayId).toBeNull()
    expect(guardado?.bandeja).toBe('no_aplica')
  })

  it('con responsableMondayId como cadena vacía, se guarda como null y no queda pendiente (candado compartido)', async () => {
    // El candado del formulario (NuevoAcuerdoForm) no es el único llamador
    // posible de crearAcuerdo — este test cubre la capa de escritura misma,
    // para que a nadie que escriba el siguiente llamador (la minuta, por
    // ejemplo) le toque acordarse de normalizar por su cuenta.
    const { id } = await crearAcuerdo('neracode', {
      que: 'Acuerdo con id vacío',
      responsable: 'Alguien',
      fechaCompromiso: null,
      responsableMondayId: '',
    })

    const guardado = obtenerAcuerdoMemoria(id)
    expect(guardado?.responsableMondayId).toBeNull()
    expect(guardado?.bandeja).toBe('no_aplica')
  })

  it('el alta ya no llama a ninguna sincronización con Monday: encola en la bandeja, no escribe sola', async () => {
    // Es el cambio central de la tarea 5, y la tarea 6 lo reforzó borrando
    // `sincronizarAlta` (se quedó sin llamadores) y quitándole a
    // `sincronizarCambio` la rama que creaba el elemento cuando no había
    // `mondayId`. Con las dos rutas de creación automática fuera, el único
    // símbolo que queda para vigilar aquí es `sincronizarCambio`. Un spy
    // sobre el módulo real (no un mock que reemplace toda la lógica) es lo
    // único que cae si alguien reintroduce una llamada a Monday desde el
    // alta — un test que solo mirara `bandeja` no lo detectaría, porque
    // 'pendiente' es el resultado correcto se llame o no a Monday.
    const espia = vi.spyOn(sincronizarMod, 'sincronizarCambio').mockResolvedValue({ intentado: false, ok: false })

    await crearAcuerdo('neracode', {
      que: 'Acuerdo cualquiera',
      responsable: 'Franco Cruzat',
      fechaCompromiso: null,
      responsableMondayId: '65476480',
    })

    expect(espia).not.toHaveBeenCalled()
    espia.mockRestore()
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

describe('editarAcuerdo y la bandeja', () => {
  async function acuerdoPendiente() {
    const { id } = await crearAcuerdo('neracode', {
      que: 'Mandar propuesta de staffing',
      responsable: 'Franco Cruzat',
      fechaCompromiso: null,
      responsableMondayId: '65476480',
    })
    return id
  }

  it('un acuerdo ya subido NO vuelve a la bandeja aunque la edición traiga responsableMondayId', async () => {
    const id = await acuerdoPendiente()
    // Simula que ya se subió — no hay todavía una función pública que mueva
    // la bandeja (eso es tarea 9), así que se fuerza el estado directamente
    // en el store, mismo patrón que usa ciclo-sesion.test.ts para simular un
    // estado alcanzado fuera del flujo normal.
    actualizarAcuerdoMemoria(id, { bandeja: 'subido' })

    await editarAcuerdo(id, { responsableMondayId: '999999' })

    expect(obtenerAcuerdoMemoria(id)?.bandeja).toBe('subido')
  })

  it('un acuerdo descartado tampoco revive con una edición', async () => {
    const id = await acuerdoPendiente()
    actualizarAcuerdoMemoria(id, { bandeja: 'descartado' })

    await editarAcuerdo(id, { responsableMondayId: null })

    expect(obtenerAcuerdoMemoria(id)?.bandeja).toBe('descartado')
  })

  it('editar sin tocar responsableMondayId no recalcula la bandeja', async () => {
    const { id } = await crearAcuerdo('neracode', {
      que: 'Mandar propuesta',
      responsable: 'Directora UDN',
      fechaCompromiso: null,
      // no_aplica al nacer, sin responsableMondayId
    })

    await editarAcuerdo(id, { que: 'Mandar propuesta revisada' })

    const guardado = obtenerAcuerdoMemoria(id)
    expect(guardado?.que).toBe('Mandar propuesta revisada')
    expect(guardado?.bandeja).toBe('no_aplica')
  })

  it('sí recalcula cuando la edición trae un responsableMondayId nuevo y la bandeja todavía es no_aplica/pendiente', async () => {
    // Contraparte de los dos tests de arriba: si `bandejaTrasEditar` se
    // rompiera hacia el otro lado (nunca recalcula nada), este es el que cae.
    const { id } = await crearAcuerdo('neracode', {
      que: 'Mandar propuesta',
      responsable: 'Directora UDN',
      fechaCompromiso: null,
    })
    expect(obtenerAcuerdoMemoria(id)?.bandeja).toBe('no_aplica')

    await editarAcuerdo(id, { responsableMondayId: '65476480' })

    const guardado = obtenerAcuerdoMemoria(id)
    expect(guardado?.responsableMondayId).toBe('65476480')
    expect(guardado?.bandeja).toBe('pendiente')
  })

  it('editar con responsableMondayId como cadena vacía lo guarda como null (candado compartido)', async () => {
    const id = await acuerdoPendiente()

    await editarAcuerdo(id, { responsableMondayId: '' })

    const guardado = obtenerAcuerdoMemoria(id)
    expect(guardado?.responsableMondayId).toBeNull()
    // '' normalizado a null SÍ es un cambio de responsable de verdad (de
    // alguien de Mkt Corp a nadie), así que la bandeja debe reflejarlo.
    expect(guardado?.bandeja).toBe('no_aplica')
  })
})

/**
 * `estatusAnterior` hacia sincronizarCambio (corrección CRÍTICA de la
 * revisión final de la ronda 7).
 *
 * Los tests de arriba corren contra el store en memoria (`hayDB()` real es
 * falso en vitest, que no carga `.env.local`), así que nunca ejercitan la
 * rama de Postgres de `moverEstatus`/`editarAcuerdo` — ni antes de esta
 * corrección ni después. Aquí se simula esa rama con un doble mínimo de
 * `db()` (UNA sola fila basta: no hay más de un acuerdo en juego en ningún
 * test de este bloque, mismo criterio aceptado en el doble de
 * src/app/acuerdos/acciones.test.ts) y se espía `sincronizarCambio` para ver
 * exactamente qué le llega — sin ir hasta la red, que ya cubren
 * cliente.test.ts y sincronizar.test.ts.
 */
describe('moverEstatus / editarAcuerdo — el estatusAnterior que le pasan a Monday (rama Postgres)', () => {
  interface FilaDB {
    id: string
    salaSlug: string
    que: string
    estatus: 'abierto' | 'cumplido' | 'vencido' | 'cancelado'
    fechaCompromiso: Date | null
    responsable: string
    responsableMondayId: string | null
    bandeja: string
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
      responsableMondayId: null,
      bandeja: 'no_aplica',
      historia: [],
      updatedAt: new Date('2026-07-01T00:00:00Z'),
    }
    vi.spyOn(clienteDB, 'hayDB').mockReturnValue(true)
    vi.spyOn(clienteDB, 'db').mockReturnValue(dobleDB() as unknown as ReturnType<typeof clienteDB.db>)
  })

  afterEach(() => vi.restoreAllMocks())

  it('moverEstatus manda el estatus REAL de antes del cambio, no el nuevo', async () => {
    fila.estatus = 'abierto'
    const espia = vi.spyOn(sincronizarMod, 'sincronizarCambio').mockResolvedValue({ intentado: false, ok: false })

    await moverEstatus('a1', 'cumplido')

    // Firma: (acuerdoId, datos-con-el-estatus-NUEVO, estatusAnterior).
    expect(espia).toHaveBeenCalledWith('a1', expect.objectContaining({ estatus: 'cumplido' }), 'abierto')
  })

  it('editarAcuerdo manda como "anterior" el MISMO estatus que ya tenía: nunca lo cambia', async () => {
    fila.estatus = 'cumplido'
    const espia = vi.spyOn(sincronizarMod, 'sincronizarCambio').mockResolvedValue({ intentado: false, ok: false })

    await editarAcuerdo('a1', { fechaCompromiso: new Date('2026-09-01T00:00:00Z') })

    // Si esto alguna vez mandara un estatusAnterior DISTINTO del actual, una
    // simple edición de fecha volvería a forzar la columna de Fase en
    // Monday — justo el bug que esta ronda corrigió.
    expect(espia).toHaveBeenCalledWith('a1', expect.objectContaining({ estatus: 'cumplido' }), 'cumplido')
  })

  it('retomarAcuerdo NO llama a Monday: retomar no es un cambio que le importe al tablero', async () => {
    const espia = vi.spyOn(sincronizarMod, 'sincronizarCambio').mockResolvedValue({ intentado: false, ok: false })

    await retomarAcuerdo('a1', 'sesion-1')

    expect(espia).not.toHaveBeenCalled()
    // Y tampoco cambia el estatus guardado: solo la historia.
    expect(fila.estatus).toBe('abierto')
    expect(fila.historia).toContainEqual(expect.objectContaining({ cambios: { retomadoEnSesion: 'sesion-1' } }))
  })
})
