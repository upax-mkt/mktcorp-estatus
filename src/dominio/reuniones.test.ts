import { describe, it, expect } from 'vitest'
import {
  reunionesDeSala, reunionesSinMinuta, sesionesMinutables,
  type Presentacion, type Minuta,
} from './salas'

/**
 * La reunión es la unidad, no la presentación ni la minuta por separado.
 * Franco: "así la presentación está asociada a una minuta, es decir a una
 * reunión".
 */

const P = (sesionId: string | undefined, fecha: string, titulo: string): Presentacion =>
  ({ sesionId, fecha, titulo, tipo: 'mensual' })
const M = (sesionId: string | undefined, fecha: string, titulo: string): Minuta =>
  ({ sesionId, fecha, titulo, enviadaA: 4 })

describe('reunionesDeSala', () => {
  it('une la presentación y la minuta de la MISMA sesión', () => {
    const r = reunionesDeSala(
      [P('s1', '2026-06-30T10:00:00Z', 'Estatus de junio')],
      [M('s1', '2026-06-30T12:00:00Z', 'Minuta de junio')],
    )
    expect(r).toHaveLength(1)
    expect(r[0].presentacion?.titulo).toBe('Estatus de junio')
    expect(r[0].minuta?.titulo).toBe('Minuta de junio')
  })

  it('una presentación sin minuta sigue siendo una reunión', () => {
    const r = reunionesDeSala([P('s1', '2026-06-30T10:00:00Z', 'Estatus')], [])
    expect(r).toHaveLength(1)
    expect(r[0].minuta).toBeUndefined()
  })

  it('una minuta cargada sin presentación también', () => {
    // Una reunión anterior a esta herramienta: se minutó, nunca se maquetó.
    const r = reunionesDeSala([], [M('s2', '2026-05-12T10:00:00Z', 'Minuta de mayo')])
    expect(r).toHaveLength(1)
    expect(r[0].presentacion).toBeUndefined()
    expect(r[0].minuta?.titulo).toBe('Minuta de mayo')
  })

  it('NO empareja por fecha: dos reuniones el mismo día son dos', () => {
    // Coincidir en el día no las hace la misma. Una sala puede tener el
    // semanal y un extraordinario el mismo martes.
    const r = reunionesDeSala(
      [P('s1', '2026-06-30T10:00:00Z', 'Semanal')],
      [M('s2', '2026-06-30T17:00:00Z', 'Extraordinario')],
    )
    expect(r).toHaveLength(2)
  })

  it('lo que llegó sin sesión no se empareja con nada', () => {
    const r = reunionesDeSala(
      [P(undefined, '2026-06-30T10:00:00Z', 'Vieja')],
      [M(undefined, '2026-06-30T10:00:00Z', 'Vieja')],
    )
    expect(r).toHaveLength(2)
  })

  it('ordena de la más reciente a la más antigua', () => {
    const r = reunionesDeSala(
      [P('a', '2026-04-01T10:00:00Z', 'Abril'), P('c', '2026-06-01T10:00:00Z', 'Junio')],
      [M('b', '2026-05-01T10:00:00Z', 'Mayo')],
    )
    expect(r.map((x) => x.titulo)).toEqual(['Junio', 'Mayo', 'Abril'])
  })
})

describe('reunionesSinMinuta', () => {
  it('son las presentadas que siguen sin acuerdos levantados', () => {
    const r = reunionesDeSala(
      [P('s1', '2026-06-30T10:00:00Z', 'Junio'), P('s2', '2026-05-30T10:00:00Z', 'Mayo')],
      [M('s2', '2026-05-30T12:00:00Z', 'Minuta de mayo')],
    )
    expect(reunionesSinMinuta(r).map((x) => x.titulo)).toEqual(['Junio'])
  })

  it('una minuta suelta NO cuenta como pendiente', () => {
    const r = reunionesDeSala([], [M('s1', '2026-05-30T10:00:00Z', 'Suelta')])
    expect(reunionesSinMinuta(r)).toHaveLength(0)
  })
})

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
})
