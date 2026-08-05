import { describe, it, expect } from 'vitest'
import { sesionesMinutables } from './salas'

/**
 * `sesionesMinutables` es la ÚNICA función de este archivo que sigue viva
 * tras la Tarea 7: sigue usándola el Home y la sala (con datos de
 * `listarReuniones()`, no de `EstadoSala`), sin cambios.
 *
 * RETIRADO EN LA TAREA 7: los tests de `reunionesDeSala`/`reunionesSinMinuta`
 * (el par viejo, cosido a mano desde `Presentacion[]`+`Minuta[]` por
 * `sesionId`) y de `fueDada`/`sesionesPorConfirmar` (dominio/salas.ts) — las
 * cuatro se jubilaron con esta tarea, sustituidas por sus sucesoras en
 * `dominio/reunion.ts` (`reunionesDeSala`, `fueDada`, `reunionesPorConfirmar`
 * — cubiertas en `dominio/reunion.test.ts`) o, para `reunionesSinMinuta`,
 * simplemente retirada sin sucesora (sin más llamador que su propio test).
 */

describe('qué se puede minutar', () => {
  const HOY = '2026-07-28'
  const sesion = (id: string, estado: string, fecha = '2026-07-20T12:00:00Z') =>
    ({ id, titulo: `Sesión ${id}`, fecha, salaSlug: 'zeus', estado })

  it('un BORRADOR no se ofrece: no es una reunión que ocurrió', () => {
    // Franco lo veía en el modal de minutas y no podía quitarlo de ahí. Un
    // borrador es preparación a medias, no una junta que se dio.
    const r = sesionesMinutables([sesion('a', 'borrador')], new Set(), HOY)
    expect(r).toHaveLength(0)
  })

  it('una AGENDADA tampoco: ni siquiera empezó', () => {
    expect(sesionesMinutables([sesion('a', 'agendada')], new Set(), HOY)).toHaveLength(0)
  })

  it('una LISTA sí: está maquetada y la reunión pudo darse', () => {
    // Marcarla como presentada es papeleo; la reunión ocurre igual.
    expect(sesionesMinutables([sesion('a', 'lista')], new Set(), HOY)).toHaveLength(1)
  })

  it('una PRESENTADA sí', () => {
    expect(sesionesMinutables([sesion('a', 'presentada')], new Set(), HOY)).toHaveLength(1)
  })

  it('la que ya tiene minuta, no', () => {
    expect(sesionesMinutables([sesion('a', 'presentada')], new Set(['a']), HOY)).toHaveLength(0)
  })

  it('la que aún no ha llegado, tampoco: no hay nada que transcribir', () => {
    const futura = sesion('a', 'lista', '2026-08-15T12:00:00Z')
    expect(sesionesMinutables([futura], new Set(), HOY)).toHaveLength(0)
  })

  it('una marcada como "no se dio" no se ofrece: no hay nada que transcribir de una reunión que no ocurrió', () => {
    const cancelada = { ...sesion('a', 'lista'), noDadaEn: '2026-07-25T10:00:00Z' }
    expect(sesionesMinutables([cancelada], new Set(), HOY)).toHaveLength(0)
  })

  it('una reunión de esta noche en CDMX sigue "de hoy" aunque ya sea mañana en UTC (bug de zona horaria)', () => {
    // HOY = '2026-07-28'. 23:00 del 28-jul en CDMX (UTC-6) es 05:00 UTC del
    // 29-jul — comparar contra `s.fecha.slice(0, 10)` leía "2026-07-29", un
    // día por delante de HOY, y la excluía como si aún no hubiera pasado.
    const estaNoche = sesion('a', 'lista', '2026-07-29T05:00:00.000Z')
    expect(sesionesMinutables([estaNoche], new Set(), HOY)).toHaveLength(1)
  })

  it('en cambio, una reunión que de verdad es de mañana en CDMX no se ofrece', () => {
    // Mismo instante "al día siguiente en UTC" que el caso de arriba, pero
    // ahora también al día siguiente en CDMX de verdad: 10:00 del 29-jul en
    // CDMX es 16:00 UTC del 29-jul. Confirma que la corrección no volvió la
    // comparación permisiva de más, solo correcta.
    const mañana = sesion('a', 'lista', '2026-07-29T16:00:00.000Z')
    expect(sesionesMinutables([mañana], new Set(), HOY)).toHaveLength(0)
  })
})
