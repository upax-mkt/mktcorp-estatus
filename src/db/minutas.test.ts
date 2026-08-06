import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * `guardarMinuta` — la política que `LevantarMinuta` promete en pantalla
 * (Tarea 8c, 5-ago): "Si la asignas a una sala, su minuta y sus acuerdos
 * quedan ahí; sin sala, la minuta existe igual y sus acuerdos se quedan en
 * el texto." Los acuerdos CONFIRMADOS que llegan aquí ya salieron del texto
 * de la minuta (`MinutaCliente`) — lo que decide esta política es si,
 * ADEMÁS, nacen como FILA en `acuerdos` (spec §4: un acuerdo cuelga de una
 * SALA) o se quedan tal cual, solo en el texto ya guardado.
 *
 * SIN DOBLE para `@/db/reuniones` (`crearReunion`, real): mismo patrón que
 * src/db/reuniones.test.ts — comparte el store en memoria con
 * `guardarMinuta` (las dos pasan por `store-memoria.ts`), así que crear la
 * reunión de verdad es más simple y más honesto que construir a mano una
 * fila. Siempre `estado: 'dada'`: no es el freeze de sala lo que este
 * archivo prueba, y así se evita rozarlo (mismo criterio que ya usa
 * reuniones.test.ts para su segundo caso).
 *
 * CON DOBLE para `./acuerdos` (`crearAcuerdo`): lo único que `guardarMinuta`
 * decide aquí es SI lo llama y con qué sala — no cómo se comporta
 * `crearAcuerdo` por dentro, eso ya lo cubre src/db/acuerdos.test.ts. Espiar
 * la llamada (no su resultado) es la prueba más directa de la política.
 */

const crearAcuerdoMock = vi.fn()
vi.mock('./acuerdos', () => ({
  crearAcuerdo: (...args: unknown[]) => crearAcuerdoMock(...args),
}))

/**
 * `hayDB`/`db` MOCKEABLES (hallazgo 3, revisión final de la ronda 10): por
 * defecto delegan a la implementación real de `./cliente` —`hayDB() ===
 * false` en vitest, sin `DATABASE_URL`—, así que TODOS los tests de arriba y
 * de abajo que ya existían siguen ejercitando el store en memoria exactamente
 * igual que antes. Solo el describe "ON CONFLICT" (al final de este archivo)
 * los reconfigura para simular Postgres: es la ÚNICA forma de probar la rama
 * `if (hayDB())` de `guardarMinuta` — el store en memoria no modela la
 * restricción UNIQUE que esta tarea le agrega a la tabla real.
 */
const hayDBMock = vi.fn<() => boolean>()
const dbMock = vi.fn()
vi.mock('./cliente', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('./cliente')>()
  return { ...real, hayDB: () => hayDBMock(), db: () => dbMock() }
})

const { crearReunion, obtenerReunion } = await import('./reuniones')
const { guardarMinuta, obtenerMinuta } = await import('./minutas')
const { reiniciarStoreMemoria } = await import('./store-memoria')
const esquema = await import('./esquema')

/** Un acuerdo confirmado cualquiera — la forma que produce MinutaCliente al revisar la propuesta de la IA. */
const ACUERDO_CONFIRMADO = {
  que: 'Mandar la propuesta revisada',
  responsable: 'Pablo Levy',
  prioridad: 'alta',
  fechaCompromiso: null as string | null,
}

beforeEach(() => {
  reiniciarStoreMemoria()
  crearAcuerdoMock.mockReset().mockResolvedValue({ id: 'acuerdo-1' })
  // Sin esto, `hayDBMock()` no devuelve nada (undefined) y toda esta
  // suite —memoria, la de arriba— caería por la rama de Postgres sin querer.
  hayDBMock.mockReset().mockReturnValue(false)
  dbMock.mockReset()
})

describe('guardarMinuta', () => {
  it('con sala: guarda la minuta y publica cada acuerdo confirmado como fila, en ESA sala', async () => {
    const { id: reunionId } = await crearReunion({
      salaSlug: 'neracode',
      fecha: new Date('2026-08-01T16:00:00.000Z'),
      titulo: 'Mensual NeraCode',
      tipo: 'mensual',
      estado: 'dada',
    })

    await guardarMinuta(reunionId, 'transcripción cruda', 'texto final del correo', [ACUERDO_CONFIRMADO])

    expect(crearAcuerdoMock).toHaveBeenCalledTimes(1)
    expect(crearAcuerdoMock).toHaveBeenCalledWith(
      'neracode',
      expect.objectContaining({ que: 'Mandar la propuesta revisada', reunionOrigenId: reunionId }),
    )

    const minuta = await obtenerMinuta(reunionId)
    expect(minuta?.textoFinal).toBe('texto final del correo')
  })

  it('sin sala (comité, interna de Mkt Corp): guarda la minuta igual, pero NO crea ningún acuerdo como fila', async () => {
    const { id: reunionId } = await crearReunion({
      salaSlug: null,
      fecha: new Date('2026-08-01T16:00:00.000Z'),
      titulo: 'Comité de dirección · agosto',
      tipo: 'mensual',
      estado: 'dada',
    })

    const textoConAcuerdoEscrito = 'Texto final. Acuerdo: Mandar la propuesta revisada — Pablo Levy.'
    await guardarMinuta(reunionId, 'transcripción cruda', textoConAcuerdoEscrito, [ACUERDO_CONFIRMADO])

    // LA POLÍTICA: sin sala no hay dónde colgar una fila de `acuerdos` (spec
    // §4, cuelgan de una sala) — se quedan escritos en el texto, no como
    // fila aparte.
    expect(crearAcuerdoMock).not.toHaveBeenCalled()

    // La minuta sí existe, con el acuerdo tal cual quedó en el texto — y la
    // reunión persiste con `salaSlug: null`, no con un valor inventado.
    const minuta = await obtenerMinuta(reunionId)
    expect(minuta?.textoFinal).toBe(textoConAcuerdoEscrito)
    expect((await obtenerReunion(reunionId))?.salaSlug).toBeNull()
  })

  it('sin sala y sin acuerdos confirmados: tampoco llama a crearAcuerdo (caso trivial, sin reventar)', async () => {
    const { id: reunionId } = await crearReunion({
      salaSlug: null,
      fecha: new Date('2026-08-01T16:00:00.000Z'),
      titulo: 'Arranque de campaña',
      tipo: 'mensual',
      estado: 'dada',
    })

    await guardarMinuta(reunionId, 'transcripción', 'texto final', [])

    expect(crearAcuerdoMock).not.toHaveBeenCalled()
    const minuta = await obtenerMinuta(reunionId)
    expect(minuta?.textoFinal).toBe('texto final')
  })
})

/**
 * HALLAZGO 3 DE LA REVISIÓN FINAL DE LA RONDA 10: contra Postgres, el INSERT
 * de `guardarMinuta` escribía a ciegas — sin `minutas_reunion_id_unique`
 * (esquema.test.ts) nada impedía dos filas para la misma reunión, y
 * `obtenerMinuta` (`:164`) leía `[0]` de un select sin orden: un doble clic o
 * un reintento de red dejaba dos minutas, cada una con sus propios acuerdos
 * confirmados ya publicados en la sala — la misma «reunión fantasma» que
 * documenta `participacion.ts:75-88`.
 *
 * El store en memoria (arriba) no puede probar esto: no modela la
 * restricción UNIQUE de la tabla real, así que el INSERT ciego nunca fallaba
 * ahí. Este describe simula Postgres lo justo para probar la sentencia real
 * — `INSERT ... ON CONFLICT (reunion_id) DO UPDATE`, el mismo patrón que ya
 * usa `participacion.ts:93-99` — sin pegarle a una base de verdad.
 */
describe('guardarMinuta — ON CONFLICT (reunion_id) DO UPDATE, contra Postgres (hallazgo 3)', () => {
  const REUNION_ID = 'reunion-fija-para-el-upsert'

  /** Una "tabla" minutas de juguete: Map por id, para simular UNIQUE(reunion_id) + upsert. */
  let tablaMinutas: Map<
    string,
    { id: string; reunionId: string; transcripcion: string | null; textoFinal: string | null; enviadaA: string[] | null; createdAt: Date }
  >

  beforeEach(() => {
    hayDBMock.mockReturnValue(true)
    tablaMinutas = new Map()
    dbMock.mockReturnValue({
      // `salaDeReunion` (minutas.ts) consulta `reuniones` antes de escribir
      // — `salaSlug: null` mantiene el test enfocado en la minuta misma, sin
      // arrastrar el loop de `crearAcuerdo` (ya cubierto arriba, en memoria).
      select: () => ({
        from: (tabla: unknown) => ({
          where: () => {
            if (tabla === esquema.reuniones) return Promise.resolve([{ salaSlug: null }])
            if (tabla === esquema.minutas) return Promise.resolve([...tablaMinutas.values()])
            throw new Error(`select inesperado en el test: ${String(tabla)}`)
          },
        }),
      }),
      insert: (tabla: unknown) => {
        if (tabla !== esquema.minutas) throw new Error(`insert inesperado en el test: ${String(tabla)}`)
        return {
          values: (vals: { id: string; reunionId: string; transcripcion: string | null; textoFinal: string | null; enviadaA: string[] | null }) => ({
            onConflictDoUpdate: ({ target, set }: { target: unknown; set: Record<string, unknown> }) => {
              // EL CONFLICTO SE RESUELVE POR reunionId, no por id — es la
              // columna con la restricción UNIQUE nueva, la misma que
              // esquema.test.ts comprueba.
              expect(target).toBe(esquema.minutas.reunionId)
              const existente = [...tablaMinutas.values()].find((f) => f.reunionId === vals.reunionId)
              // `createdAt` nunca entra en `set` (mismo criterio que el
              // código real: no se toca en el conflicto) — solo se pone al
              // crear la fila, con el default de la base (`defaultNow()`).
              if (existente) tablaMinutas.set(existente.id, { ...existente, ...set })
              else tablaMinutas.set(vals.id, { ...vals, createdAt: new Date() })
              return Promise.resolve()
            },
          }),
        }
      },
    })
  })

  it('llamar guardarMinuta dos veces para la misma reunión deja UNA sola fila, con el contenido de la SEGUNDA llamada', async () => {
    await guardarMinuta(REUNION_ID, 'transcripción v1', 'texto final v1', [])
    expect(tablaMinutas.size).toBe(1)

    await guardarMinuta(REUNION_ID, 'transcripción v2', 'texto final v2', [])

    // LA PRUEBA: sigue habiendo UNA sola fila —la restricción UNIQUE + ON
    // CONFLICT hacen lo que antes solo prometía la disciplina del código— y
    // su contenido es el de la ÚLTIMA llamada, no dos filas peleando por
    // cuál gana en `obtenerMinuta`.
    expect(tablaMinutas.size).toBe(1)
    const fila = [...tablaMinutas.values()][0]
    expect(fila.textoFinal).toBe('texto final v2')
    expect(fila.transcripcion).toBe('transcripción v2')

    const minuta = await obtenerMinuta(REUNION_ID)
    expect(minuta?.textoFinal).toBe('texto final v2')
  })

  it('el id de la fila no cambia entre la primera y la segunda llamada: es una actualización, no una fila nueva', async () => {
    await guardarMinuta(REUNION_ID, 't1', 'v1', [])
    const idOriginal = [...tablaMinutas.values()][0].id

    await guardarMinuta(REUNION_ID, 't2', 'v2', [])

    expect([...tablaMinutas.values()][0].id).toBe(idOriginal)
  })

  it('dos reuniones distintas SÍ dejan dos filas: el UNIQUE es por reunión, no global', async () => {
    await guardarMinuta(REUNION_ID, 't1', 'v1', [])
    await guardarMinuta('otra-reunion', 't2', 'v2', [])

    expect(tablaMinutas.size).toBe(2)
  })
})
