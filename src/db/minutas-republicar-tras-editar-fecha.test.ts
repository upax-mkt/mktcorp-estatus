import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'
import * as esquema from './esquema'

/**
 * LA REGRESIÓN QUE LA RONDA 14 METIÓ SOBRE EL DEDUPE DE LA RONDA 11 (hallazgo
 * C1 de la revisión final de rama).
 *
 * `crearAcuerdo` (acuerdos.ts:225 y :244-246) deduplica comparando el
 * INSTANTE EXACTO de `fechaCompromiso` — `IS NOT DISTINCT FROM` en el
 * `NOT EXISTS`, y un `eq(...)` en el SELECT de respaldo. Mientras TODOS los
 * escritores de esa columna guardaran el mismo instante para un día civil
 * dado, esa comparación bastaba.
 *
 * La ronda 14 rompió esa condición sin querer: pasó unos escritores a
 * `instanteEnCDMX(dia, '12:00')` (= 18:00Z) y dejó a otros con
 * `new Date(<día civil>)` (= 00:00Z). Con dos instantes distintos para EL
 * MISMO día civil, el `NOT EXISTS` deja de reconocer la fila que él mismo
 * creó y el reintento inserta un acuerdo duplicado — que además entra en la
 * bandeja y puede subir a un tablero de Monday de 950 filas.
 *
 * LA SECUENCIA QUE REPRODUCE ESTE ARCHIVO, con datos reales:
 *   1. se publica una minuta con un acuerdo con fecha compromiso;
 *   2. alguien abre "✎ Corregir" en `/acuerdos` y solo ENFOCA Y SALE del
 *      campo de fecha — el `onBlur` de `AcuerdoControles.tsx:75` dispara sin
 *      comprobar si el valor cambió, así que se reescribe EL MISMO día civil;
 *   3. se republica la MISMA minuta (doble clic, reintento tras un hipo de
 *      red, o republicación tras corregir la transcripción — flujo que el
 *      propio comentario de `crearAcuerdo` declara soportado).
 * Sin el arreglo, el paso 3 crea un segundo acuerdo idéntico.
 *
 * DE PUNTA A PUNTA Y CON LOS DOS CAMINOS REALES: `guardarMinuta` real (con su
 * bucle de `crearAcuerdo` real, dedupe incluido) y `editarFechaEnTablaAction`
 * real (la acción que hay detrás del campo de fecha de `/acuerdos`, con su
 * `instanteEnCDMX` de verdad). Lo único doblado es el borde: Postgres, la
 * sesión, la revalidación y Monday.
 *
 * ARCHIVO APARTE de `minutas-concurrencia.test.ts` —que prueba el mismo
 * escenario de republicar— por el mismo criterio que aquel documenta en su
 * cabecera: la configuración de mocks es distinta (aquí hacen falta
 * `@/auth/roles`, `next/cache` y `@/monday/sincronizar`, porque el camino de
 * la acción de servidor los atraviesa) y mezclar dos configuraciones en un
 * archivo esconde cuál de las dos sostiene cada test.
 */

const dialect = new PgDialect()

interface FilaAcuerdoToy {
  id: string
  salaSlug: string
  que: string
  responsable: string
  /**
   * `Date` y no string, a diferencia del doble de `minutas-concurrencia`:
   * `timestamptz` vuelve de Drizzle como `Date`, y este archivo SÍ recorre
   * código que lo trata como tal (`isoDia` dentro de
   * `sincronizarDespuesDeEditar`). Un string ahí reventaría — y con él se
   * perdería la fidelidad justo en la columna que se está probando.
   */
  fechaCompromiso: Date | null
  reunionOrigenId: string | null
  estatus: string
  bandeja: string
  historia: unknown[]
}

const REUNION_ID = 'reunion-que-se-republica'
const SALA_SLUG = 'zeus'
/** El día civil del acuerdo. Nunca cambia en toda la secuencia: lo que cambia es el INSTANTE con que se guarda. */
const DIA_COMPROMISO = '2026-08-20'

let tablaMinutas: Map<string, { id: string; reunionId: string }>
let filasAcuerdos: FilaAcuerdoToy[]

/** El día UTC de un instante — lo que hace `date_trunc('day', ... AT TIME ZONE 'UTC')` en la sentencia real. */
const diaUTC = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : null)

/**
 * HALLAZGO QUE ESTA VERSIÓN CIERRA: el doble ANTES reimplementaba "comparar
 * por día" fijo en JS (un `diaUTC(...) === diaUTC(...)` que no dependía de lo
 * que `crearAcuerdo` mandara a Postgres). Con eso, revertir el `date_trunc`
 * de `acuerdos.ts:254` a comparar el INSTANTE exacto —el bug real de la
 * ronda 14, el que este archivo existe para impedir que vuelva— no cambiaba
 * NADA en este doble: los 1.997 tests seguían en verde. Se demostró a mano:
 * revertir el `date_trunc` y correr la suite deja todo en verde igual.
 *
 * EL ARREGLO: la granularidad de la comparación NO se decide aquí. Se LEE de
 * la sentencia SQL que `crearAcuerdo` acaba de emitir de verdad
 * (`dialect.sqlToQuery(query).sql`, la misma que Postgres ejecutaría). Si esa
 * sentencia sigue truncando a día (`date_trunc('day', ...)`), el doble
 * compara por día. Si alguien revierte `crearAcuerdo` a comparar el instante
 * (quita el `date_trunc`), el texto que el doble lee ya no lo contiene, y el
 * doble pasa a comparar por instante — exactamente el comportamiento que
 * Postgres tendría con esa sentencia revertida, así que el duplicado que C1
 * arregló vuelve a aparecer y el test que lo prueba se pone rojo.
 *
 * POR QUÉ ESTE CAMINO Y NO LOS OTROS DOS (Franco pidió valorarlos):
 *   - "Afirmar sobre el SQL emitido" (un `expect(sqlTexto).toContain(...)`)
 *     es más barato pero prueba la FORMA de la sentencia, no su
 *     comportamiento: pasaría igual si `date_trunc('day', ...)` apareciera en
 *     la sentencia pero el resto de la lógica de dedupe estuviera rota. Este
 *     archivo prueba el resultado (¿se duplicó el acuerdo o no?), y la
 *     granularidad leída del SQL solo alimenta esa evaluación real.
 *   - "Hacer que el doble se comporte como Postgres" del todo —parsear y
 *     evaluar el WHERE como un motor SQL real— pediría una dependencia nueva
 *     (pg-mem o similar; no hay ninguna en este repo) para un único WHERE.
 *     Este archivo hace el equivalente MÍNIMO que hace falta para este caso:
 *     en vez de adivinar la granularidad, la toma del único lugar donde
 *     `date_trunc('day'` puede aparecer en esta sentencia (la comparación de
 *     `fecha_compromiso` del dedupe) y evalúa el NOT EXISTS real con esa
 *     granularidad — no una tercera comparación inventada, la MISMA que la
 *     sentencia real dice tener.
 */
function granularidadDeLaSentencia(sqlTexto: string): 'dia' | 'instante' {
  return sqlTexto.includes('date_trunc(') ? 'dia' : 'instante'
}

/** Lo que evalúa el `NOT EXISTS` de `crearAcuerdo`, con la granularidad que su sentencia real diga tener. */
function coincideAcuerdo(
  f: FilaAcuerdoToy,
  candidato: { que: string; responsable: string; fechaCompromisoIso: string | null; reunionOrigenId: string | null },
  granularidad: 'dia' | 'instante',
): boolean {
  const fechaFila = f.fechaCompromiso?.toISOString() ?? null
  const fechaCoincide =
    granularidad === 'dia'
      ? diaUTC(fechaFila) === diaUTC(candidato.fechaCompromisoIso)
      : fechaFila === candidato.fechaCompromisoIso

  return (
    f.reunionOrigenId !== null &&
    f.reunionOrigenId === candidato.reunionOrigenId &&
    f.que === candidato.que &&
    f.responsable === candidato.responsable &&
    fechaCoincide
  )
}

function dobleDB() {
  const acuerdosWhere = (condicion?: unknown) => {
    const { params } = dialect.sqlToQuery(condicion as SQL)
    // Un solo parámetro = `eq(acuerdos.id, ...)`: la lectura por id que hacen
    // `editarAcuerdo`, `sincronizarDespuesDeEditar` y `salaDeAcuerdo`.
    // Varios = el SELECT de respaldo del dedupe (reunión + qué + responsable
    // + fecha), que solo corre cuando el INSERT condicionado no insertó nada.
    const filas =
      params.length === 1
        ? filasAcuerdos.filter((f) => f.id === params[0])
        : filasAcuerdos.filter(
            (f) => f.reunionOrigenId === params[0] && f.que === params[1] && f.responsable === params[2],
          )
    // Thenable CON `.limit()`: `salaDeAcuerdo` encadena `.limit(1)` y el resto
    // de llamadores hace `await` directo sobre el `where`.
    return Object.assign(Promise.resolve(filas), { limit: () => Promise.resolve(filas) })
  }

  return {
    select: () => ({
      from: (tabla: unknown) => ({
        where: (condicion?: unknown) => {
          if (tabla === esquema.reuniones) return Promise.resolve([{ salaSlug: SALA_SLUG }])
          if (tabla === esquema.minutas) return Promise.resolve([...tablaMinutas.values()])
          if (tabla === esquema.acuerdos) return acuerdosWhere(condicion)
          throw new Error(`select inesperado en el doble: ${String(tabla)}`)
        },
      }),
    }),
    insert: (tabla: unknown) => {
      if (tabla !== esquema.minutas) throw new Error(`insert inesperado en el doble: ${String(tabla)}`)
      return {
        values: (vals: { id: string; reunionId: string }) => ({
          // ON CONFLICT (reunion_id) DO UPDATE — la protección que la minuta
          // SÍ tiene desde la ronda 11. No es lo que se prueba aquí, pero
          // `guardarMinuta` lo atraviesa siempre antes del bucle de acuerdos.
          onConflictDoUpdate: () => {
            const existente = [...tablaMinutas.values()].find((f) => f.reunionId === vals.reunionId)
            if (!existente) tablaMinutas.set(vals.id, { ...vals })
            return Promise.resolve(undefined)
          },
        }),
      }
    },
    update: (tabla: unknown) => {
      if (tabla !== esquema.acuerdos) throw new Error(`update inesperado en el doble: ${String(tabla)}`)
      return {
        set: (valores: Partial<FilaAcuerdoToy>) => ({
          where: (condicion: unknown) => {
            const { params } = dialect.sqlToQuery(condicion as SQL)
            const fila = filasAcuerdos.find((f) => f.id === params[0])
            if (fila) Object.assign(fila, valores)
            return Promise.resolve(undefined)
          },
        }),
      }
    },
    /** El INSERT ... WHERE NOT EXISTS de `crearAcuerdo`, evaluado de verdad. */
    execute: (query: unknown) => {
      const { sql: sqlTexto, params } = dialect.sqlToQuery(query as SQL)
      const [id, salaSlug, que, responsable, , , fechaCompromisoIso, reunionOrigenId] = params as (string | null)[]
      const candidato = {
        que: que as string,
        responsable: responsable as string,
        fechaCompromisoIso: fechaCompromisoIso ?? null,
        reunionOrigenId: reunionOrigenId ?? null,
      }
      // La granularidad viene de la sentencia real emitida en ESTA llamada,
      // no de una constante del archivo — ver la cabecera de
      // `granularidadDeLaSentencia` sobre por qué.
      const granularidad = granularidadDeLaSentencia(sqlTexto)
      if (filasAcuerdos.some((f) => coincideAcuerdo(f, candidato, granularidad))) return Promise.resolve({ rows: [] })
      filasAcuerdos.push({
        id: id as string,
        salaSlug: salaSlug as string,
        que: candidato.que,
        responsable: candidato.responsable,
        fechaCompromiso: fechaCompromisoIso ? new Date(fechaCompromisoIso) : null,
        reunionOrigenId: candidato.reunionOrigenId,
        estatus: 'abierto',
        bandeja: 'no_aplica',
        historia: [],
      })
      return Promise.resolve({ rows: [{ id }] })
    },
  }
}

vi.mock('./cliente', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('./cliente')>()
  return { ...real, hayDB: () => true, db: () => dobleDB() }
})

vi.mock('./temas', () => ({
  slugsDeSalas: async () => [SALA_SLUG],
  cargarTemas: async () => ({}),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/auth/roles', () => ({
  exigirEditor: vi.fn().mockResolvedValue({ rol: 'equipo', rolApp: 'editor', sub: 'equipo-mkt-corp' }),
  exigirAdmin: vi.fn().mockResolvedValue({ rol: 'equipo', rolApp: 'admin', sub: 'equipo-mkt-corp' }),
}))

// Monday se dobla entero: corregir una fecha llama a `sincronizarDespuesDeEditar`,
// y lo que este archivo prueba es la columna que queda en la base, no el tablero.
vi.mock('@/monday/sincronizar', () => ({
  sincronizarCambio: vi.fn().mockResolvedValue({ intentado: false, ok: false }),
  reconciliar: vi.fn(),
}))

const { guardarMinuta } = await import('./minutas')
const { editarFechaEnTablaAction } = await import('@/app/acuerdos/acciones')

/** El acuerdo tal como lo confirma quien revisa la propuesta de la IA antes de publicar. */
const ACUERDO_CONFIRMADO = {
  que: 'Mandar la propuesta revisada',
  responsable: 'Pablo Levy',
  prioridad: 'alta',
  fechaCompromiso: DIA_COMPROMISO as string | null,
}

beforeEach(() => {
  tablaMinutas = new Map()
  filasAcuerdos = []
})

describe('republicar una minuta después de tocar la fecha en /acuerdos (regresión C1, ronda 14)', () => {
  it('enfocar y salir del campo de fecha sin cambiar el día NO hace que la republicación duplique el acuerdo', async () => {
    await guardarMinuta(REUNION_ID, 'transcripción', 'texto final', [ACUERDO_CONFIRMADO])
    expect(filasAcuerdos).toHaveLength(1)
    const idOriginal = filasAcuerdos[0].id

    // PASO 2: el `onBlur` de `AcuerdoControles.tsx` dispara al salir del
    // campo, aunque nadie haya tocado el valor — se reescribe EL MISMO día.
    await editarFechaEnTablaAction(idOriginal, DIA_COMPROMISO)

    // PASO 3: la MISMA minuta se publica otra vez (doble clic, reintento de
    // red, o republicación tras corregir la transcripción).
    await guardarMinuta(REUNION_ID, 'transcripción', 'texto final corregido', [ACUERDO_CONFIRMADO])

    expect(filasAcuerdos).toHaveLength(1)
    expect(filasAcuerdos[0].id).toBe(idOriginal)
  })

  /**
   * LAS FILAS QUE YA ESTÁN EN LA BASE, guardadas por el escritor viejo.
   *
   * MEDIDO CONTRA LA BASE DE PRODUCCIÓN el 14-ago, antes de tocar el dedupe:
   * las 19 filas de `acuerdos` con `fecha_compromiso` están a las 00:00Z, y
   * las 19 tienen `reunion_origen_id` — o sea, TODAS nacieron de una minuta y
   * TODAS pueden republicarse. Unificar los escritores arregla lo que se cree
   * de aquí en adelante, pero por sí solo mueve el problema de sitio: el
   * escritor nuevo produce 18:00Z y esas 19 filas siguen a 00:00Z, así que
   * republicar cualquiera de sus minutas dejaría de reconocerlas —
   * exactamente el duplicado de C1, sobre datos reales y sin que nadie tenga
   * que tocar ninguna fecha.
   *
   * Por eso el dedupe pasa a comparar el DÍA (`date_trunc`, en UTC) y no el
   * instante: es la única forma de que las dos formas de escribir el mismo
   * día civil —la vieja y la nueva— se reconozcan sin migrar datos.
   */
  it('una fila guardada por el escritor VIEJO (00:00Z) tampoco se duplica al republicar su minuta', async () => {
    await guardarMinuta(REUNION_ID, 'transcripción', 'texto final', [ACUERDO_CONFIRMADO])
    const idOriginal = filasAcuerdos[0].id

    // Las 19 filas que hoy están en producción: mismo día civil, instante
    // viejo. Se simula tal cual, sin pasar por ningún escritor.
    filasAcuerdos[0].fechaCompromiso = new Date(`${DIA_COMPROMISO}T00:00:00.000Z`)

    await guardarMinuta(REUNION_ID, 'transcripción', 'texto final corregido', [ACUERDO_CONFIRMADO])

    expect(filasAcuerdos).toHaveLength(1)
    expect(filasAcuerdos[0].id).toBe(idOriginal)
  })

  it('dos días civiles DISTINTOS siguen siendo dos acuerdos: el dedupe no se volvió ciego a la fecha', async () => {
    await guardarMinuta(REUNION_ID, 'transcripción', 'texto final', [ACUERDO_CONFIRMADO])

    await guardarMinuta(REUNION_ID, 'transcripción', 'texto final', [
      { ...ACUERDO_CONFIRMADO, fechaCompromiso: '2026-08-21' },
    ])

    // Comparar por día no puede significar "cualquier fecha vale": el día
    // siguiente es otro compromiso, y la ronda 11 lo fijó así a propósito.
    expect(filasAcuerdos).toHaveLength(2)
  })

  it('los dos escritores dejan el MISMO instante para el mismo día civil: es lo que sostiene al dedupe', async () => {
    await guardarMinuta(REUNION_ID, 'transcripción', 'texto final', [ACUERDO_CONFIRMADO])
    const instanteAlPublicar = filasAcuerdos[0].fechaCompromiso?.toISOString()

    await editarFechaEnTablaAction(filasAcuerdos[0].id, DIA_COMPROMISO)
    const instanteTrasCorregir = filasAcuerdos[0].fechaCompromiso?.toISOString()

    // El test de arriba prueba la CONSECUENCIA (no hay duplicado); este prueba
    // la CAUSA, para que si mañana vuelven a divergir el informe diga por qué
    // y no solo "salieron dos filas". `instanteEnCDMX(dia, '12:00')` = 18:00Z.
    expect(instanteAlPublicar).toBe('2026-08-20T18:00:00.000Z')
    expect(instanteTrasCorregir).toBe(instanteAlPublicar)
  })
})
