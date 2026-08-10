import { describe, it, expect, vi, beforeEach } from 'vitest'
import { is, SQL } from 'drizzle-orm'
import { PgDialect } from 'drizzle-orm/pg-core'
import * as esquema from './esquema'

/**
 * LA CARRERA DE `documentos.estructura` (deuda de concurrencia, ronda 11,
 * arreglo #1): `anadirSeccion`/`eliminarSeccion` (`./documentos.ts`) hacían
 * SELECT del jsonb `estructura`, lo modificaban en JS y lo REESCRIBÍAN
 * ENTERO con un UPDATE aparte — un leer-modificar-escribir con un hueco real
 * en medio. Dos personas añadiendo (o borrando) secciones a la vez leen la
 * MISMA `estructura`; cada una le aplica SU cambio en memoria; la segunda
 * escritura PISA a la primera. El item de la sección perdida sobrevive en la
 * tabla `items` (esa sí es su propia fila, un INSERT/DELETE independiente),
 * pero sin definición en `estructura` — `documentoCompletoDeFilas` cae al
 * `def` de respaldo y la sección se pinta con su tipo crudo (`seccion-<uuid>`).
 *
 * ARCHIVO APARTE de `documentos.test.ts` (mismo criterio que separa
 * `participacion.test.ts` de `participacion-resiliencia.test.ts`, o
 * `refrescar-desde-monday.test.ts` de su `-cancelado`): ese otro archivo NO
 * mockea `./cliente` — corre entero contra el store en memoria, porque
 * vitest no define `DATABASE_URL`. Probar la carrera de Postgres exige
 * simular una base que SÍ existe, con una tabla de juguete con estado — dos
 * configuraciones de doble que no conviven bien en un solo archivo.
 *
 * CÓMO SE MONTA LA CARRERA (difícil de verdad — ver el comentario de
 * `armarCarrera` más abajo): no basta con `Promise.all([a(), b()])` y
 * confiar en que el intercalado natural de microtasks las haga chocar —
 * puede que no choquen nunca y el test "pase" sin haber probado nada. Aquí
 * se CONTROLA el intercalado a mano: la lectura de `estructura` que hace el
 * código VIEJO (una `select` con proyección, que el código NUEVO ya no hace
 * — la condición vive dentro del propio UPDATE) se cuelga la PRIMERA vez que
 * se pide, hasta que el test la libera explícitamente. Eso fuerza el peor
 * caso: las dos llamadas leen la MISMA `estructura` antes de que cualquiera
 * escriba.
 *
 * QUÉ PRUEBA ESTO Y QUÉ NO: el doble interpreta el fragmento SQL que
 * `anadirSeccion`/`eliminarSeccion` construyen (vía `PgDialect().sqlToQuery`,
 * la misma pieza que usa Drizzle para compilar la sentencia real) y le
 * confía a Postgres que `jsonb_set`/`||`/`jsonb_agg` hacen lo que documentan
 * — exactamente la misma confianza que ya extiende `minutas.test.ts` a
 * `ON CONFLICT DO UPDATE`. Lo que SÍ prueba de punta a punta: que el código
 * ya no lee `estructura` en una sentencia aparte para escribirla en otra —
 * si lo hiciera, el "cuelgue" de abajo se dispararía y el test lo vería.
 */

const dialect = new PgDialect()

interface FilaDocumentoToy {
  id: string
  reunionId: string
  estado: 'borrador' | 'listo'
  estructura: { items: Array<{ tipo: string; titulo: string; pregunta: string; layout: string; padre?: string }> }
  plantilla: string | null
}

interface FilaItemToy {
  id: string
  documentoId: string
  orden: number
  tipo: string
  contenidoCrudo: unknown
  decisionMaquetacion: unknown
}

const DOCUMENTO_ID = 'doc-carrera-1'

let filaDocumento: FilaDocumentoToy
let itemsToy: FilaItemToy[]

// ---- el "cuelgue" que fuerza el peor intercalado (ver el comentario de cabecera) ----
let armado = false // el test lo activa justo antes de lanzar las dos llamadas concurrentes
let yaColgoUna = false
let liberar: (() => void) | null = null

function idDeCondicion(condicion: unknown): string {
  return dialect.sqlToQuery(condicion as SQL).params[0] as string
}

/**
 * Aplica sobre `actual` lo que el fragmento SQL de `estructura` le pide a
 * Postgres — jsonb_set + `||` (anadirSeccion, sin "jsonb_agg" en el texto) o
 * jsonb_set + jsonb_agg (eliminarSeccion). Se detecta cuál es por el texto
 * compilado porque son las DOS únicas formas que este módulo genera para
 * esta columna (ver el comentario de cabecera de cada función en
 * `documentos.ts`) — no un parser genérico de SQL, un reconocedor de las dos
 * formas que el propio código bajo prueba construye.
 */
function aplicarFragmentoEstructura(
  actual: FilaDocumentoToy['estructura'],
  fragmento: SQL,
): FilaDocumentoToy['estructura'] {
  const { sql: texto, params } = dialect.sqlToQuery(fragmento)
  if (texto.includes('jsonb_agg')) {
    const tiposBorrados: string[] = JSON.parse(params[0] as string)
    return { items: actual.items.filter((d) => !tiposBorrados.includes(d.tipo)) }
  }
  const nuevos = JSON.parse(params[0] as string) as FilaDocumentoToy['estructura']['items']
  return { items: [...actual.items, ...nuevos] }
}

function dobleDB() {
  return {
    select(proyeccion?: Record<string, unknown>) {
      return {
        from: (tabla: unknown) => ({
          where: () => {
            if (tabla === esquema.documentos) {
              if (proyeccion && armado && !yaColgoUna) {
                // La lectura de `estructura` del código VIEJO. Se cuelga
                // hasta `liberar()` — el código NUEVO nunca llega aquí.
                //
                // LA TRAMPA QUE ESTO EVITA: `liberar` tiene que resolver con
                // el valor que esta llamada HABRÍA LEÍDO en el instante en
                // que se colgó — una foto de ESE momento —, no con
                // `filaDocumento.estructura` releída al momento de liberar.
                // Si se releyera en vivo, para cuando el test llama a
                // `liberar()` la OTRA llamada ya terminó de escribir, y la
                // que estaba "colgada" recibiría el valor YA ACTUALIZADO —
                // exactamente la ejecución SECUENCIAL y correcta, no la
                // carrera que este archivo existe para demostrar. Por eso se
                // clona `estructura` AQUÍ, al colgarse, no dentro de `liberar`.
                yaColgoUna = true
                const foto = JSON.parse(JSON.stringify(filaDocumento.estructura)) as FilaDocumentoToy['estructura']
                return new Promise((resolve) => {
                  liberar = () => resolve([{ estructura: foto }])
                })
              }
              return Promise.resolve(proyeccion ? [{ estructura: filaDocumento.estructura }] : [{ ...filaDocumento }])
            }
            if (tabla === esquema.items) {
              const propias = () => itemsToy.filter((i) => i.documentoId === DOCUMENTO_ID).sort((a, b) => a.orden - b.orden)
              return { orderBy: () => Promise.resolve(propias()) }
            }
            throw new Error(`select inesperado en el doble: ${String(tabla)}`)
          },
        }),
      }
    },
    update(tabla: unknown) {
      if (tabla === esquema.documentos) {
        return {
          set: (cambios: { estructura?: unknown }) => ({
            where: () => {
              if (cambios.estructura !== undefined) {
                filaDocumento.estructura = is(cambios.estructura, SQL)
                  ? aplicarFragmentoEstructura(filaDocumento.estructura, cambios.estructura)
                  : (cambios.estructura as FilaDocumentoToy['estructura']) // código viejo: objeto plano, pisa tal cual
              }
              return Promise.resolve(undefined)
            },
          }),
        }
      }
      if (tabla === esquema.items) {
        return {
          set: (cambios: { orden?: number }) => ({
            where: (condicion: unknown) => {
              const id = idDeCondicion(condicion)
              const item = itemsToy.find((i) => i.id === id)
              if (item && cambios.orden !== undefined) item.orden = cambios.orden
              return Promise.resolve(undefined)
            },
          }),
        }
      }
      throw new Error(`update inesperado en el doble: ${String(tabla)}`)
    },
    insert(tabla: unknown) {
      if (tabla !== esquema.items) throw new Error(`insert inesperado en el doble: ${String(tabla)}`)
      return {
        values: (fila: FilaItemToy) => {
          itemsToy.push({ ...fila })
          return Promise.resolve(undefined)
        },
      }
    },
    delete(tabla: unknown) {
      if (tabla !== esquema.items) throw new Error(`delete inesperado en el doble: ${String(tabla)}`)
      return {
        where: (condicion: unknown) => {
          const id = idDeCondicion(condicion)
          itemsToy = itemsToy.filter((i) => i.id !== id)
          return Promise.resolve(undefined)
        },
      }
    },
  }
}

const hayDBMock = vi.fn(() => true)
const dbMock = vi.fn(() => dobleDB())
vi.mock('./cliente', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('./cliente')>()
  return { ...real, hayDB: () => hayDBMock(), db: () => dbMock() }
})

// `obtenerDocumento` (privada, la usan anadirSeccion/eliminarSeccion) llama
// SIEMPRE a `obtenerReunion` para resolver acuerdos retomados — aquí no hay
// ninguno (`idsAcuerdos` vacío, `resolverAcuerdosRetomados` corta antes de
// consultar nada), así que basta un doble mínimo y fijo.
vi.mock('./reuniones', () => ({
  crearReunion: async () => {
    throw new Error('crearReunion no debería llamarse en este archivo')
  },
  obtenerReunion: async () => ({ salaSlug: 'neracode' }),
}))

const { anadirSeccion, eliminarSeccion } = await import('./documentos')

beforeEach(() => {
  filaDocumento = { id: DOCUMENTO_ID, reunionId: 'reunion-1', estado: 'borrador', estructura: { items: [] }, plantilla: null }
  itemsToy = []
  armado = false
  yaColgoUna = false
  liberar = null
  hayDBMock.mockClear()
  dbMock.mockClear()
})

/**
 * Corre `a` y `b` "a la vez": arranca las dos, deja correr a la que NO se
 * cuelga hasta que termine, libera a la que sí se colgó, y espera a las dos.
 * No asume cuál de las dos gana la carrera por llegar primero a la lectura
 * vieja — cualquiera de las dos puede ser la que se cuelgue.
 */
async function armarCarrera(a: Promise<unknown>, b: Promise<unknown>): Promise<void> {
  await Promise.race([a, b])
  liberar?.()
  await Promise.all([a, b])
}

describe('anadirSeccion — dos altas concurrentes no pierden ninguna sección', () => {
  it('las dos definiciones sobreviven en estructura.items, sin importar el orden en que Postgres corriera cada UPDATE', async () => {
    armado = true
    const a = anadirSeccion(DOCUMENTO_ID, 'texto-multicolumna', 'Sección A')
    const b = anadirSeccion(DOCUMENTO_ID, 'texto-multicolumna', 'Sección B')
    await armarCarrera(a, b)

    const titulos = filaDocumento.estructura.items.map((d) => d.titulo).sort()
    expect(titulos).toEqual(['Sección A', 'Sección B'])

    // Daño colateral que describe el reporte: sin el arreglo, el item de la
    // sección perdida sobrevive en `items` pero SIN definición en
    // `estructura` — aquí las DOS deben tener su tipo presente en `estructura`.
    const tiposEnEstructura = new Set(filaDocumento.estructura.items.map((d) => d.tipo))
    for (const item of itemsToy) {
      expect(tiposEnEstructura.has(item.tipo)).toBe(true)
    }
  })
})

describe('eliminarSeccion — dos bajas concurrentes no resucitan la definición ya borrada', () => {
  it('las dos secciones quedan fuera de estructura.items, ninguna sobrevive por una escritura pisada', async () => {
    // Seed secuencial (sin carrera todavía): dos secciones que se puedan borrar.
    const { itemId: idA } = await anadirSeccion(DOCUMENTO_ID, 'texto-multicolumna', 'Para borrar A')
    const { itemId: idB } = await anadirSeccion(DOCUMENTO_ID, 'texto-multicolumna', 'Para borrar B')
    expect(filaDocumento.estructura.items).toHaveLength(2)

    yaColgoUna = false // el seed de arriba no debe dejar la trampa armada
    armado = true
    const a = eliminarSeccion(DOCUMENTO_ID, idA)
    const b = eliminarSeccion(DOCUMENTO_ID, idB)
    await armarCarrera(a, b)

    expect(filaDocumento.estructura.items).toEqual([])
    expect(itemsToy).toHaveLength(0)
  })
})
