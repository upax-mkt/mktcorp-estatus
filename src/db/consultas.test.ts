import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { EstadoSala } from '@/dominio/salas'
import type { Reunion } from '@/dominio/reunion'

/**
 * `construirPulso` es un derivado puro (no toca Postgres) y no necesita nada
 * de lo que sigue. `estadoDeSala`/`todosLosAcuerdos` (describes de más abajo,
 * hallazgos 1 y 2 de la revisión final de la ronda 10) SÍ pegan contra
 * `db()` en cuanto `hayDB()` es verdadero — y esa rama es precisamente donde
 * vivía el bug: no se puede probar contra el store en memoria porque
 * `estadoDeSalaDB`/`todosLosAcuerdos` están detrás de `if (hayDB())`, y en
 * vitest `hayDB()` es `false` por defecto (sin `DATABASE_URL`).
 *
 * `chainable` simula lo mínimo del constructor fluido de Drizzle: cada
 * método de encadenado (`from`/`where`/`leftJoin`/`innerJoin`/`orderBy`)
 * devuelve el mismo nodo, y el nodo es "thenable" — se resuelve a `filas`
 * cuando se hace `await` sobre él, exactamente como el query builder real
 * (que no ejecuta nada hasta que se le hace `await`). No hace falta mockear
 * `eq`/`and`/`desc` de drizzle-orm (a diferencia de `src/db/directorio.test.ts`,
 * que sí filtra por condición): aquí cada consulta se resuelve por ORDEN de
 * llamada a `select()` —determinista, ver el código fuente de
 * `estadoDeSalaDB`— vía `selectMock.mockReturnValueOnce(...)` encadenados.
 */
function chainable(filas: unknown[]) {
  const nodo: Record<string, unknown> = {}
  const encadenable = () => nodo
  nodo.from = encadenable
  nodo.leftJoin = encadenable
  nodo.innerJoin = encadenable
  nodo.where = encadenable
  nodo.orderBy = encadenable
  nodo.then = (resuelve: (v: unknown) => unknown, rechaza?: (e: unknown) => unknown) =>
    Promise.resolve(filas).then(resuelve, rechaza)
  return nodo
}

const selectMock = vi.fn()
vi.mock('./cliente', () => ({
  hayDB: () => true,
  db: () => ({ select: (...args: unknown[]) => selectMock(...args) }),
}))

// `cargarTemas`/`slugsDeSalas` (src/db/temas.ts) también tocan `db()` — se
// mockean aparte, con su propio doble, para no sumar dos consultas más a la
// secuencia de `selectMock` (que ya tiene que acertar el orden de las seis
// de `estadoDeSalaDB`).
vi.mock('./temas', () => ({
  cargarTemas: vi.fn(async () => ({
    'mexa-creativa': { nombre: 'Mexa Creativa', primario: '#8B1E3F' },
  })),
  slugsDeSalas: vi.fn(async () => ['mexa-creativa']),
}))

const { construirPulso, estadoDeSala, todosLosAcuerdos } = await import('./consultas')

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

/**
 * HALLAZGOS 1 Y 2 DE LA REVISIÓN FINAL DE LA RONDA 10 — contra Postgres
 * (`hayDB() === true`, ver el doble al principio del archivo).
 *
 * EL CASO EXACTO que reportó la revisión, verificado contra la base real:
 * Mexa Creativa dio su reunión el 15-jul a las 18:00 CDMX — la 00:00 UTC del
 * 16-jul. Antes de este arreglo, `isoFecha` (`.toISOString().slice(0,10)`,
 * el día en UTC crudo) leía "16-jul"; la tarjeta de la sala decía que su
 * última reunión había sido un día que no fue. `diaCivil` (anclado a
 * America/Mexico_City, `src/lib/fecha.ts`) lee "15-jul", el día correcto.
 *
 * Y el bug hermano (hallazgo 1): en Vercel (UTC), a partir de las 18:00 CDMX
 * `isoFecha(new Date())` YA devuelve el día siguiente, así que
 * `estatusEfectivo` marcaba un acuerdo vencido hasta seis horas antes de
 * tiempo. `AHORA`, abajo, cae justo en esa ventana: 05-ago 23:30 CDMX, ya
 * 06-ago en UTC.
 */
describe('estadoDeSala — el día civil de un instante real, no el UTC (hallazgos 1 y 2)', () => {
  const REUNION_PASADA_ID = 'reunion-mexa-15-jul'
  const REUNION_FUTURA_ID = 'reunion-mexa-19-ago'
  // 05-ago-2026 23:30 CDMX = 06-ago 05:30 UTC: "ahora" ya cruzó la
  // medianoche UTC, pero en CDMX sigue siendo el día anterior.
  const AHORA = new Date('2026-08-06T05:30:00.000Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(AHORA)
    selectMock.mockReset()
    selectMock
      // #1 salaRow
      .mockReturnValueOnce(chainable([{
        activa: true,
        cadencia: 'mensual',
        // La sala se pausó el 05-ago a las 23:00 CDMX = 06-ago 05:00 UTC.
        pausadaDesde: new Date('2026-08-06T05:00:00.000Z'),
        logoUrl: null,
      }]))
      // #2 reunionesRows (LEFT JOIN documentos)
      .mockReturnValueOnce(chainable([
        {
          id: REUNION_PASADA_ID,
          fecha: new Date('2026-07-16T00:00:00.000Z'), // 15-jul 18:00 CDMX
          titulo: 'Mensual Mexa Creativa · julio',
          tipo: 'mensual',
          estado: 'dada', // explícito: no hace falta calcular respaldo
          noDadaEn: null,
          documentoId: null,
          documentoEstado: null,
        },
        {
          id: REUNION_FUTURA_ID,
          fecha: new Date('2026-08-20T00:00:00.000Z'), // 19-ago 18:00 CDMX
          titulo: 'Mensual Mexa Creativa · agosto',
          tipo: 'mensual',
          estado: 'agendada',
          noDadaEn: null,
          documentoId: null,
          documentoEstado: null,
        },
      ]))
      // #3 acuerdosRows
      .mockReturnValueOnce(chainable([{
        id: 'acuerdo-1',
        que: 'Entregar propuesta',
        responsable: 'Alguien',
        squad: null,
        // `fechaCompromiso` nace de un <input type="date"> vía
        // `new Date('YYYY-MM-DD')` — medianoche UTC (verificado contra la
        // base real: cada fila cae en 00:00:00.000Z). Vence HOY, 05-ago CDMX.
        fechaCompromiso: new Date('2026-08-05T00:00:00.000Z'),
        estatus: 'abierto',
        destacado: false,
        reunionOrigenId: null,
      }]))
      // #4 minutasRows (INNER JOIN reuniones)
      .mockReturnValueOnce(chainable([{
        reunionId: REUNION_PASADA_ID,
        enviadaA: null,
        textoFinal: 'Texto final de la minuta',
        fecha: new Date('2026-07-16T00:00:00.000Z'), // misma junta, 15-jul 18:00 CDMX
        titulo: 'Mensual Mexa Creativa · julio',
      }]))
      // #5 archivosRows
      .mockReturnValueOnce(chainable([]))
      // #6 itemsRows
      .mockReturnValueOnce(chainable([]))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('ultimaSesion lee el día CDMX de la reunión (15-jul), no el UTC (16-jul)', async () => {
    const sala = await estadoDeSala('mexa-creativa')
    expect(sala?.ultimaSesion).toBe('2026-07-15')
  })

  it('proximaReunion lee el día CDMX (19-ago), no el UTC (20-ago)', async () => {
    const sala = await estadoDeSala('mexa-creativa')
    expect(sala?.proximaReunion).toBe('2026-08-19')
  })

  it('la fecha de la minuta (Reunion.minuta.fecha) también se lee en día CDMX', async () => {
    const sala = await estadoDeSala('mexa-creativa')
    const reunion = sala?.reuniones.find((r) => r.id === REUNION_PASADA_ID)
    expect(reunion?.minuta?.fecha).toBe('2026-07-15')
  })

  it('pausadaDesde lee el día CDMX (05-ago), no el UTC (06-ago)', async () => {
    const sala = await estadoDeSala('mexa-creativa')
    expect(sala?.pausadaDesde).toBe('2026-08-05')
  })

  it('un acuerdo que vence HOY (CDMX) sigue abierto a las 23:30 — antes marcaba vencido seis horas antes de tiempo', async () => {
    const sala = await estadoDeSala('mexa-creativa')
    const acuerdo = sala?.acuerdos.find((a) => a.id === 'acuerdo-1')
    expect(acuerdo?.estatus).toBe('abierto')
  })
})

/**
 * El mismo hallazgo 1, en su propio call site: `todosLosAcuerdos` (la vista
 * `/acuerdos`, las diez salas juntas) calculaba su propio "hoy" con
 * `isoFecha(new Date())`, un tercer sitio —independiente de `estadoDeSalaDB`
 * y de `acuerdosArrastrablesDe`— con el mismo bug.
 */
describe('todosLosAcuerdos — el mismo "hoy" (hallazgo 1), en su propio call site', () => {
  const AHORA = new Date('2026-08-06T05:30:00.000Z') // 05-ago 23:30 CDMX

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(AHORA)
    selectMock.mockReset().mockReturnValueOnce(chainable([{
      id: 'acuerdo-2',
      que: 'Entregar propuesta',
      responsable: 'Alguien',
      squad: null,
      fechaCompromiso: new Date('2026-08-05T00:00:00.000Z'), // vence HOY, 05-ago CDMX
      estatus: 'abierto',
      destacado: false,
      mondayUrl: null,
      mondayTipo: null,
      mondayId: null,
      mondaySincronizadoEn: null,
      bandeja: 'no_aplica',
      salaSlug: 'mexa-creativa',
      salaActiva: true,
    }]))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('un acuerdo que vence HOY (CDMX) no aparece vencido a las 23:30, aunque en UTC ya sea mañana', async () => {
    const acuerdos = await todosLosAcuerdos()
    expect(acuerdos.find((a) => a.id === 'acuerdo-2')?.estatus).toBe('abierto')
  })
})
