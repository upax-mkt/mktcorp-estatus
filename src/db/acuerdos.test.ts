import { describe, it, expect, beforeEach, vi } from 'vitest'
import { crearAcuerdo, editarAcuerdo } from './acuerdos'
import { obtenerAcuerdoMemoria, actualizarAcuerdoMemoria, reiniciarStoreMemoria } from './store-memoria'
import * as sincronizarMod from '@/monday/sincronizar'

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
