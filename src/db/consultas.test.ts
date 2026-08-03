import { describe, it, expect } from 'vitest'
import { construirPulso } from './consultas'
import type { EstadoSala } from '@/dominio/salas'

/**
 * EL PULSO DEL MES — el síntoma exacto que reportó Franco: «en el contador
 * dice solo una sesión en el mes siendo que están agendadas todas y
 * registradas en la app». `construirPulso` es un derivado puro (no toca
 * Postgres, ver la cabecera de src/db/consultas.ts) y se prueba solo, con el
 * mismo criterio que el resto de "derivados puros" de ese archivo.
 */

function sala(parcial: Partial<EstadoSala>): EstadoSala {
  return {
    slug: 'neracode',
    nombre: 'NeraCode',
    color: '#101010',
    logoUrl: null,
    diasDesdeUltima: null,
    ultimaSesion: null,
    proximaSesion: null,
    enPreparacion: false,
    acuerdos: [],
    presentaciones: [],
    minutas: [],
    cadencia: 'mensual',
    activa: true,
    pausadaDesde: null,
    sesiones: [],
    ...parcial,
  }
}

const sesion = (fecha: string, estado: string, noDadaEn: string | null = null) => ({ fecha, estado, noDadaEn })

const HOY = '2026-08-03'

describe('construirPulso — el bug real de Franco (3-ago-2026)', () => {
  it('8 reuniones agendadas/en borrador este mes cuentan las 8, y ninguna se dio todavía', () => {
    // Los datos reales de producción el día del reporte: siete `agendada`
    // (10 al 20 de agosto) más una `borrador` (hoy, 3 de agosto) — repartidas
    // en varias salas, como en la base real. Antes, `sesionesUltimos30`
    // contaba SALAS con última sesión `presentada`/`minutada` en 30 días: 1
    // (Marketing United, `minutada` el 23-jul). Ninguna de las ocho de agosto
    // es todavía `lista` ni tiene su día civil pasado, así que `reunionesDadas`
    // da 0 — no "1": el número correcto hoy es cero reuniones dadas, no una
    // cifra inventada para que cuadre con la ilustración de la especificación.
    const salas = [
      sala({
        slug: 'research-land',
        sesiones: [sesion('2026-08-03T19:00:00Z', 'borrador'), sesion('2026-08-10T19:00:00Z', 'agendada')],
      }),
      sala({ slug: 'neracode', sesiones: [sesion('2026-08-11T16:00:00Z', 'agendada'), sesion('2026-07-28T20:10:32Z', 'lista')] }),
      sala({ slug: 'house-of-films', sesiones: [sesion('2026-08-12T16:00:00Z', 'agendada')] }),
      sala({ slug: 'marketing-united', sesiones: [sesion('2026-08-13T16:00:00Z', 'agendada'), sesion('2026-07-23T12:00:00Z', 'minutada')] }),
      sala({ slug: 'mexa-creativa', sesiones: [sesion('2026-08-18T16:00:00Z', 'agendada')] }),
      sala({ slug: 'promo-espacio', sesiones: [sesion('2026-08-19T16:00:00Z', 'agendada')] }),
      sala({ slug: 'uix', sesiones: [sesion('2026-08-20T16:00:00Z', 'agendada')] }),
    ]
    const pulso = construirPulso(salas, HOY)
    expect(pulso.reunionesEsteMes).toBe(8)
    expect(pulso.reunionesDadas).toBe(0)
  })
})

describe('construirPulso — reunionesEsteMes', () => {
  it('cuenta REUNIONES, no salas: una sala con dos sesiones este mes cuenta dos', () => {
    const salas = [sala({ sesiones: [sesion('2026-08-05T10:00:00Z', 'agendada'), sesion('2026-08-12T10:00:00Z', 'agendada')] })]
    expect(construirPulso(salas, HOY).reunionesEsteMes).toBe(2)
  })

  it('cualquier estado cuenta — agendada, borrador, lista, presentada y minutada', () => {
    const salas = [
      sala({
        sesiones: [
          sesion('2026-08-01T10:00:00Z', 'agendada'),
          sesion('2026-08-02T10:00:00Z', 'borrador'),
          sesion('2026-08-03T10:00:00Z', 'lista'),
          sesion('2026-08-04T10:00:00Z', 'presentada'),
          sesion('2026-08-05T10:00:00Z', 'minutada'),
        ],
      }),
    ]
    expect(construirPulso(salas, HOY).reunionesEsteMes).toBe(5)
  })

  it('es el MES NATURAL en curso: julio no es agosto, aunque esté a un día de distancia', () => {
    // Horas ancladas lejos de cualquier frontera de día en CDMX (mediodía),
    // no cerca de medianoche: mismo cuidado que exige src/lib/fecha.ts —
    // '2026-08-01T01:00:00Z' es en realidad las 19:00 del 31 de julio en
    // CDMX, y habría probado justo lo contrario de lo que dice el test.
    const salas = [sala({ sesiones: [sesion('2026-07-31T18:00:00Z', 'presentada'), sesion('2026-08-01T18:00:00Z', 'agendada')] })]
    expect(construirPulso(salas, HOY).reunionesEsteMes).toBe(1)
  })

  it('una sala en pausa no aporta ninguna, aunque tenga sesiones este mes', () => {
    const salas = [sala({ activa: false, sesiones: [sesion('2026-08-05T10:00:00Z', 'agendada')] })]
    expect(construirPulso(salas, HOY).reunionesEsteMes).toBe(0)
  })

  it('sin sesiones en ninguna sala, cero — no revienta', () => {
    expect(construirPulso([sala({}), sala({ slug: 'zeus' })], HOY).reunionesEsteMes).toBe(0)
  })
})

describe('construirPulso — reunionesDadas', () => {
  it('presentada y minutada cuentan siempre, sin importar el día', () => {
    const salas = [sala({ sesiones: [sesion('2026-08-20T10:00:00Z', 'presentada'), sesion('2026-08-25T10:00:00Z', 'minutada')] })]
    expect(construirPulso(salas, HOY).reunionesDadas).toBe(2)
  })

  it('lista con el día ya pasado cuenta — la deducción automática', () => {
    const salas = [sala({ sesiones: [sesion('2026-08-01T10:00:00Z', 'lista')] })]
    expect(construirPulso(salas, HOY).reunionesDadas).toBe(1)
  })

  it('lista de HOY MISMO no cuenta: el día no "ya pasó"', () => {
    const salas = [sala({ sesiones: [sesion('2026-08-03T23:00:00Z', 'lista')] })]
    expect(construirPulso(salas, HOY).reunionesDadas).toBe(0)
  })

  it('lista futura no cuenta', () => {
    const salas = [sala({ sesiones: [sesion('2026-08-20T10:00:00Z', 'lista')] })]
    expect(construirPulso(salas, HOY).reunionesDadas).toBe(0)
  })

  it('agendada o borrador con el día pasado no cuentan: nunca tuvieron contenido', () => {
    const salas = [sala({ sesiones: [sesion('2026-08-01T10:00:00Z', 'agendada'), sesion('2026-08-02T10:00:00Z', 'borrador')] })]
    expect(construirPulso(salas, HOY).reunionesDadas).toBe(0)
  })

  it('marcada "no se dio" no cuenta aunque sea lista con el día pasado', () => {
    const salas = [sala({ sesiones: [sesion('2026-08-01T10:00:00Z', 'lista', '2026-08-02T09:00:00Z')] })]
    expect(construirPulso(salas, HOY).reunionesDadas).toBe(0)
  })

  it('una sesión de un mes distinto no aporta a reunionesDadas, aunque fueDada la diera por ocurrida', () => {
    // reunionesDadas es "de las de ESTE mes, cuántas ya se dieron" — no un
    // conteo histórico de todo lo dado alguna vez.
    const salas = [sala({ sesiones: [sesion('2026-07-15T10:00:00Z', 'presentada')] })]
    const pulso = construirPulso(salas, HOY)
    expect(pulso.reunionesEsteMes).toBe(0)
    expect(pulso.reunionesDadas).toBe(0)
  })
})

describe('construirPulso — el resto de las cifras sigue igual', () => {
  it('salas cuenta TODAS las filas, pausadas incluidas', () => {
    const salas = [sala({ slug: 'a' }), sala({ slug: 'b', activa: false })]
    expect(construirPulso(salas, HOY).salas).toBe(2)
  })

  it('suma acuerdos abiertos y vencidos de todas las salas activas', () => {
    const salas = [
      sala({
        slug: 'a',
        acuerdos: [
          { id: '1', que: 'x', responsable: 'y', fechaCompromiso: null, estatus: 'abierto' },
          { id: '2', que: 'x', responsable: 'y', fechaCompromiso: null, estatus: 'vencido' },
        ],
      }),
    ]
    const pulso = construirPulso(salas, HOY)
    expect(pulso.acuerdosAbiertos).toBe(1)
    expect(pulso.acuerdosVencidos).toBe(1)
  })
})
