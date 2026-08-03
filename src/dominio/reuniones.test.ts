import { describe, it, expect } from 'vitest'
import {
  reunionesDeSala, reunionesSinMinuta, sesionesMinutables, fueDada, sesionesPorConfirmar,
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

/**
 * SI UNA REUNIÓN YA OCURRIÓ, sin que nadie tenga que decirlo — la raíz del
 * síntoma "el contador dice una cosa distinta a lo agendado" (Franco,
 * 3-ago-2026): antes de esto, contar y "la sala" solo daban por ocurrida una
 * sesión con `estado === 'presentada' || 'minutada'`, y marcar presentada es
 * papeleo — exactamente el mismo motivo por el que `sesionesMinutables` (arriba)
 * dejó de exigirlo. `fueDada` es la MISMA idea aplicada a "¿ya pasó?" en vez de
 * "¿se puede minutar?": por eso el requisito de contenido reutiliza la misma
 * frontera (`lista` = maquetada) en vez de inventar un umbral nuevo — así una
 * sesión `fueDada` siempre cae también dentro de `sesionesMinutables` mientras
 * no tenga minuta, nunca al revés.
 */
describe('fueDada', () => {
  const HOY = '2026-07-28'
  const sesion = (estado: string, fecha = '2026-07-20T12:00:00Z', noDadaEn: string | null = null) =>
    ({ estado, fecha, noDadaEn })

  it('presentada: sí, sin importar la fecha', () => {
    expect(fueDada(sesion('presentada', '2026-08-15T12:00:00Z'), HOY)).toBe(true)
  })

  it('minutada: sí, sin importar la fecha', () => {
    expect(fueDada(sesion('minutada', '2026-08-15T12:00:00Z'), HOY)).toBe(true)
  })

  it('lista con el día civil ya pasado: sí — es la deducción nueva', () => {
    expect(fueDada(sesion('lista', '2026-07-20T12:00:00Z'), HOY)).toBe(true)
  })

  it('lista de HOY MISMO: no — un día no "ya pasó" aunque sea tarde en el reloj', () => {
    // El caso exacto que pide el punto 3: una reunión de hoy a las 9:00 no
    // está "pasada" a las 10:00 del mismo día porque se compara por día
    // civil, no por instante.
    expect(fueDada(sesion('lista', '2026-07-28T22:00:00Z'), HOY)).toBe(false)
  })

  it('lista en el futuro: no', () => {
    expect(fueDada(sesion('lista', '2026-08-15T12:00:00Z'), HOY)).toBe(false)
  })

  it('borrador con el día muy pasado: no — no tiene contenido, es preparación a medias', () => {
    expect(fueDada(sesion('borrador', '2026-06-01T12:00:00Z'), HOY)).toBe(false)
  })

  it('agendada con el día muy pasado: no — ni siquiera empezó', () => {
    expect(fueDada(sesion('agendada', '2026-06-01T12:00:00Z'), HOY)).toBe(false)
  })

  it('lista con el día pasado pero marcada "no se dio": no — el override manda sobre la deducción', () => {
    expect(fueDada(sesion('lista', '2026-07-20T12:00:00Z', '2026-07-25T10:00:00Z'), HOY)).toBe(false)
  })

  it('presentada manda incluso si por error quedara un noDadaEn colgado', () => {
    // No debería pasar — marcarPresentada limpia noDadaEn al confirmar — pero
    // lo explícito y positivo ("se dio") nunca se apaga por un campo que solo
    // existe para frenar la deducción AUTOMÁTICA.
    expect(fueDada(sesion('presentada', '2026-07-20T12:00:00Z', '2026-07-25T10:00:00Z'), HOY)).toBe(true)
  })
})

describe('sesionesPorConfirmar', () => {
  const HOY = '2026-07-28'
  const sesion = (
    id: string,
    estado: string,
    fecha = '2026-07-20T12:00:00Z',
    noDadaEn: string | null = null,
  ) => ({ id, titulo: `Sesión ${id}`, fecha, salaSlug: 'zeus', estado, noDadaEn })

  it('una lista con el día pasado y sin decidir: aparece, pendiente', () => {
    const r = sesionesPorConfirmar([sesion('a', 'lista')], HOY)
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ id: 'a', noDadaEn: null })
  })

  it('una lista con el día pasado y ya marcada "no se dio": sigue apareciendo, para poder deshacerlo', () => {
    const r = sesionesPorConfirmar([sesion('a', 'lista', '2026-07-20T12:00:00Z', '2026-07-25T10:00:00Z')], HOY)
    expect(r).toHaveLength(1)
    expect(r[0].noDadaEn).toBe('2026-07-25T10:00:00Z')
  })

  it('una lista de hoy mismo: no aparece, su día no ha pasado', () => {
    expect(sesionesPorConfirmar([sesion('a', 'lista', '2026-07-28T22:00:00Z')], HOY)).toHaveLength(0)
  })

  it('una lista futura: no aparece', () => {
    expect(sesionesPorConfirmar([sesion('a', 'lista', '2026-08-15T12:00:00Z')], HOY)).toHaveLength(0)
  })

  it('una presentada o minutada: no aparece — ya está resuelta explícitamente', () => {
    const r = sesionesPorConfirmar(
      [sesion('a', 'presentada'), sesion('b', 'minutada')],
      HOY,
    )
    expect(r).toHaveLength(0)
  })

  it('un borrador o una agendada con el día pasado: no aparece — nunca fue "dada", nada que confirmar', () => {
    const r = sesionesPorConfirmar(
      [sesion('a', 'borrador'), sesion('b', 'agendada')],
      HOY,
    )
    expect(r).toHaveLength(0)
  })

  it('ordena de la más reciente a la más antigua', () => {
    const r = sesionesPorConfirmar(
      [sesion('vieja', 'lista', '2026-06-01T12:00:00Z'), sesion('nueva', 'lista', '2026-07-10T12:00:00Z')],
      HOY,
    )
    expect(r.map((x) => x.id)).toEqual(['nueva', 'vieja'])
  })

  /**
   * UNA SALA EN PAUSA NO OFRECE NADA (revisión, 2026-08-03): confirmar o
   * negar es la "gestión" que el freeze comercial congela — Franco pausó
   * Zeus y esto dejó de ser un caso hipotético.
   */
  describe('respeta el freeze de la sala', () => {
    it('salaActiva: false — no aparece, aunque sea lista con el día pasado', () => {
      const r = sesionesPorConfirmar([{ ...sesion('a', 'lista'), salaActiva: false }], HOY)
      expect(r).toHaveLength(0)
    })

    it('salaActiva: true — aparece con normalidad', () => {
      const r = sesionesPorConfirmar([{ ...sesion('a', 'lista'), salaActiva: true }], HOY)
      expect(r).toHaveLength(1)
    })

    it('salaActiva ausente (sin sala, o el llamador no lo sabe): se trata como activa', () => {
      const r = sesionesPorConfirmar([sesion('a', 'lista')], HOY)
      expect(r).toHaveLength(1)
    })

    it('una marcada "no se dio" en una sala pausada tampoco aparece: ni para deshacerla mientras dure la pausa', () => {
      const r = sesionesPorConfirmar(
        [{ ...sesion('a', 'lista', '2026-07-20T12:00:00Z', '2026-07-25T10:00:00Z'), salaActiva: false }],
        HOY,
      )
      expect(r).toHaveLength(0)
    })

    it('con varias salas, solo se excluye la pausada — las demás siguen ofreciéndose', () => {
      const r = sesionesPorConfirmar(
        [
          { ...sesion('activa', 'lista'), salaActiva: true },
          { ...sesion('pausada', 'lista'), salaActiva: false },
        ],
        HOY,
      )
      expect(r.map((x) => x.id)).toEqual(['activa'])
    })
  })
})
