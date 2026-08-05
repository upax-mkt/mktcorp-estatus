import { describe, it, expect } from 'vitest'
import { construirPulso } from './consultas'
import type { EstadoSala } from '@/dominio/salas'
import type { Reunion } from '@/dominio/reunion'

/**
 * EL PULSO DEL MES — el síntoma exacto que reportó Franco: «en el contador
 * dice solo una sesión en el mes siendo que están agendadas todas y
 * registradas en la app». `construirPulso` es un derivado puro (no toca
 * Postgres, ver la cabecera de src/db/consultas.ts) y se prueba solo, con el
 * mismo criterio que el resto de "derivados puros" de ese archivo.
 *
 * MIGRADO A `Reunion` (dominio/reunion.ts) EN LA TAREA 7: `construirPulso`
 * iteraba `EstadoSala.sesiones` (`SesionDeSala[]`, `{fecha, estado,
 * noDadaEn}`) contra el `fueDada` VIEJO (`dominio/salas.ts`, que entendía
 * `'presentada'`/`'minutada'`/`'lista'`). Ese campo y esa función se
 * retiraron con la Tarea 7 — `EstadoSala.reuniones: Reunion[]` es ahora la
 * ÚNICA fuente, y el `fueDada` que manda es el nuevo (`dominio/reunion.ts`):
 * `estado === 'dada'` es lo explícito; a falta de eso, cualquier RESPALDO
 * (documento listo, un archivo, o una minuta) con el día ya pasado deduce lo
 * mismo que antes deducía `'lista'`. Los escenarios de abajo son los MISMOS
 * que antes, traducidos al modelo nuevo: donde el original decía `'lista'`
 * aquí hay `documentoListo: true`; donde decía `'presentada'`/`'minutada'`
 * (explícito) aquí hay `estado: 'dada'`; donde decía `'borrador'`/`'agendada'`
 * (sin contenido) aquí hay `estado: 'agendada'` sin ningún respaldo.
 */

function sala(parcial: Partial<EstadoSala>): EstadoSala {
  return {
    slug: 'neracode',
    nombre: 'NeraCode',
    color: '#101010',
    logoUrl: null,
    diasDesdeUltima: null,
    ultimaSesion: null,
    proximaReunion: null,
    enPreparacion: false,
    acuerdos: [],
    reuniones: [],
    cadencia: 'mensual',
    activa: true,
    pausadaDesde: null,
    ...parcial,
  }
}

/** Una `Reunion` mínima para estos tests: agendada, sin respaldo, sin nada más — se sobreescribe lo que haga falta. */
function reunion(id: string, fecha: string, parcial: Partial<Reunion> = {}): Reunion {
  return {
    id,
    fecha,
    titulo: `Reunión ${id}`,
    tipo: 'mensual',
    estado: 'agendada',
    noDadaEn: null,
    documentoListo: false,
    archivos: [],
    acuerdos: [],
    ...parcial,
  }
}

const HOY = '2026-08-03'

describe('construirPulso — el bug real de Franco (3-ago-2026)', () => {
  it('8 reuniones agendadas/en preparación este mes cuentan las 8, y ninguna se dio todavía', () => {
    // Los datos reales de producción el día del reporte: siete agendadas sin
    // nada cargado (10 al 20 de agosto) más una de hoy, 3 de agosto, también
    // sin nada cargado — repartidas en varias salas, como en la base real.
    // Antes, `sesionesUltimos30` contaba SALAS con última sesión
    // `presentada`/`minutada` en 30 días: 1 (Marketing United, `minutada` el
    // 23-jul). Ninguna de las ocho de agosto tiene respaldo ni su día civil
    // pasado, así que `reunionesDadas` da 0 — no "1": el número correcto hoy
    // es cero reuniones dadas, no una cifra inventada para que cuadre con la
    // ilustración de la especificación.
    const salas = [
      sala({
        slug: 'research-land',
        reuniones: [reunion('r1', '2026-08-03T19:00:00Z'), reunion('r2', '2026-08-10T19:00:00Z')],
      }),
      sala({
        slug: 'neracode',
        reuniones: [reunion('r3', '2026-08-11T16:00:00Z'), reunion('r4', '2026-07-28T20:10:32Z', { documentoListo: true })],
      }),
      sala({ slug: 'house-of-films', reuniones: [reunion('r5', '2026-08-12T16:00:00Z')] }),
      sala({
        slug: 'marketing-united',
        reuniones: [reunion('r6', '2026-08-13T16:00:00Z'), reunion('r7', '2026-07-23T12:00:00Z', { estado: 'dada' })],
      }),
      sala({ slug: 'mexa-creativa', reuniones: [reunion('r8', '2026-08-18T16:00:00Z')] }),
      sala({ slug: 'promo-espacio', reuniones: [reunion('r9', '2026-08-19T16:00:00Z')] }),
      sala({ slug: 'uix', reuniones: [reunion('r10', '2026-08-20T16:00:00Z')] }),
    ]
    const pulso = construirPulso(salas, HOY)
    expect(pulso.reunionesEsteMes).toBe(8)
    expect(pulso.reunionesDadas).toBe(0)
  })
})

describe('construirPulso — reunionesEsteMes', () => {
  it('cuenta REUNIONES, no salas: una sala con dos reuniones este mes cuenta dos', () => {
    const salas = [sala({ reuniones: [reunion('r1', '2026-08-05T10:00:00Z'), reunion('r2', '2026-08-12T10:00:00Z')] })]
    expect(construirPulso(salas, HOY).reunionesEsteMes).toBe(2)
  })

  it('cuenta sin importar si ya tienen respaldo o no: cinco reuniones de agosto son cinco, dadas o no', () => {
    const salas = [
      sala({
        reuniones: [
          reunion('sin-nada', '2026-08-01T10:00:00Z'),
          reunion('con-archivo', '2026-08-02T10:00:00Z', { archivos: [{ id: 'a', titulo: 'x', nombreOriginal: 'x.pdf', url: '/x' }] }),
          reunion('doc-listo', '2026-08-03T10:00:00Z', { documentoListo: true }),
          reunion('con-minuta', '2026-08-04T10:00:00Z', { minuta: { fecha: '2026-08-04T10:00:00Z', titulo: 'M', enviadaA: 0 } }),
          reunion('dada', '2026-08-05T10:00:00Z', { estado: 'dada' }),
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
    const salas = [sala({ reuniones: [reunion('jul', '2026-07-31T18:00:00Z', { estado: 'dada' }), reunion('ago', '2026-08-01T18:00:00Z')] })]
    expect(construirPulso(salas, HOY).reunionesEsteMes).toBe(1)
  })

  it('una sala en pausa no aporta ninguna, aunque tenga reuniones este mes', () => {
    const salas = [sala({ activa: false, reuniones: [reunion('r1', '2026-08-05T10:00:00Z')] })]
    expect(construirPulso(salas, HOY).reunionesEsteMes).toBe(0)
  })

  it('sin reuniones en ninguna sala, cero — no revienta', () => {
    expect(construirPulso([sala({}), sala({ slug: 'zeus' })], HOY).reunionesEsteMes).toBe(0)
  })
})

describe('construirPulso — reunionesDadas', () => {
  it('estado "dada" cuenta siempre, sin importar el día', () => {
    const salas = [
      sala({ reuniones: [reunion('r1', '2026-08-20T10:00:00Z', { estado: 'dada' }), reunion('r2', '2026-08-25T10:00:00Z', { estado: 'dada' })] }),
    ]
    expect(construirPulso(salas, HOY).reunionesDadas).toBe(2)
  })

  it('documento listo con el día ya pasado cuenta — la deducción automática', () => {
    const salas = [sala({ reuniones: [reunion('r1', '2026-08-01T10:00:00Z', { documentoListo: true })] })]
    expect(construirPulso(salas, HOY).reunionesDadas).toBe(1)
  })

  it('un archivo colgado con el día ya pasado también cuenta: el respaldo no es solo el documento', () => {
    // EL CASO QUE HOY NO EXISTÍA (Tarea 6/7): antes solo "el documento
    // maquetado" bastaba. Un PDF de una junta que ya pasó respalda igual.
    const salas = [
      sala({ reuniones: [reunion('r1', '2026-08-01T10:00:00Z', { archivos: [{ id: 'a', titulo: 'x', nombreOriginal: 'x.pdf', url: '/x' }] })] }),
    ]
    expect(construirPulso(salas, HOY).reunionesDadas).toBe(1)
  })

  it('documento listo de HOY MISMO no cuenta: el día no "ya pasó"', () => {
    const salas = [sala({ reuniones: [reunion('r1', '2026-08-03T23:00:00Z', { documentoListo: true })] })]
    expect(construirPulso(salas, HOY).reunionesDadas).toBe(0)
  })

  it('documento listo en fecha futura no cuenta', () => {
    const salas = [sala({ reuniones: [reunion('r1', '2026-08-20T10:00:00Z', { documentoListo: true })] })]
    expect(construirPulso(salas, HOY).reunionesDadas).toBe(0)
  })

  it('agendada sin ningún respaldo y con el día pasado no cuenta: nunca tuvo contenido', () => {
    const salas = [sala({ reuniones: [reunion('r1', '2026-08-01T10:00:00Z')] })]
    expect(construirPulso(salas, HOY).reunionesDadas).toBe(0)
  })

  it('marcada "no se dio" no cuenta aunque tenga el documento listo y el día pasado', () => {
    const salas = [
      sala({ reuniones: [reunion('r1', '2026-08-01T10:00:00Z', { documentoListo: true, noDadaEn: '2026-08-02T09:00:00Z' })] }),
    ]
    expect(construirPulso(salas, HOY).reunionesDadas).toBe(0)
  })

  it('una reunión de un mes distinto no aporta a reunionesDadas, aunque fueDada la diera por ocurrida', () => {
    // reunionesDadas es "de las de ESTE mes, cuántas ya se dieron" — no un
    // conteo histórico de todo lo dado alguna vez.
    const salas = [sala({ reuniones: [reunion('r1', '2026-07-15T10:00:00Z', { estado: 'dada' })] })]
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
