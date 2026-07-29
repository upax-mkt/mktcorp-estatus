import { describe, it, expect, vi, afterEach } from 'vitest'
import { sincronizarCambio, reconciliar } from './sincronizar'
import { TABLERO } from './mapeo'
import * as clienteDB from '@/db/cliente'
import * as esquema from '@/db/esquema'

/**
 * `eq` de drizzle-orm se sustituye por una versión mínima que devuelve un
 * objeto plano e inspeccionable, mismo criterio que el doble de
 * src/app/acuerdos/acciones.test.ts: la representación SQL interna real de
 * Drizzle no está pensada para leerse desde fuera. Se sustituye a nivel de
 * archivo, pero es inerte para los dos tests de arriba —nunca llegan a
 * llamar `eq`, porque `mondayIdDe` corta en `!hayDB()` antes de esa línea—,
 * así que no cambia lo que esos dos tests prueban.
 */
vi.mock('drizzle-orm', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('drizzle-orm')>()
  return { ...real, eq: (columna: unknown, valor: unknown) => ({ columna, valor }) }
})

/**
 * `sincronizarCambio` sin base de datos (como corre toda la suite: vitest no
 * define DATABASE_URL — ver src/db/cliente.ts) es exactamente el caso "sin
 * mondayId": `mondayIdDe` no tiene de dónde leer la fila y devuelve null. Es
 * el caso real, no un simulacro: así corre `sincronizarCambio` en todos los
 * demás tests de la suite que pasan por `editarAcuerdo`/`moverEstatus`.
 *
 * Estos dos tests son el candado de la regla central de la tarea 6: sin ellos,
 * alguien podría reintroducir el "si no hay mondayId, créalo" de antes y la
 * suite seguiría en verde — el mismo hueco que la revisión de la tarea 5
 * encontró para `crearAcuerdo`.
 */
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  // Restaura los vi.spyOn(clienteDB, …) del bloque de abajo — sin esto, un
  // hayDB()/db() espiado en un test se quedaría pisando a los que corren
  // después en el mismo archivo (incluidos los dos de arriba).
  vi.restoreAllMocks()
})

const DATOS = {
  salaSlug: 'mexa-creativa',
  que: 'Enviar propuesta de paid media',
  estatus: 'abierto' as const,
  fechaCompromiso: null,
}

describe('sincronizarCambio', () => {
  it('sin mondayId no crea nada: no llama a Monday y lo devuelve como no intentado', async () => {
    const espia = vi.fn()
    vi.stubEnv('MONDAY_TOKEN', 'ficticio')
    vi.stubEnv('MONDAY_GRUPO', 'group_mm15cfz2')
    vi.stubEnv('MONDAY_ESCRITURA', 'si')
    vi.stubGlobal('fetch', espia)

    const resultado = await sincronizarCambio('acuerdo-sin-monday-id', DATOS)

    expect(resultado).toEqual({ intentado: false, ok: false })
    expect(espia).not.toHaveBeenCalled()
  })

  it('con la escritura apagada, tampoco llama a Monday', async () => {
    const espia = vi.fn()
    vi.stubEnv('MONDAY_TOKEN', 'ficticio')
    // Sin MONDAY_ESCRITURA=si: escrituraActiva() es falso antes de mirar mondayId.
    vi.stubGlobal('fetch', espia)

    const resultado = await sincronizarCambio('acuerdo-cualquiera', DATOS)

    expect(resultado).toEqual({ intentado: false, ok: false })
    expect(espia).not.toHaveBeenCalled()
  })
})

// ---- La rama que faltaba: "con mondayId, sí actualiza" ----
//
// Deuda declarada de las tareas 6 y 8: los dos tests de arriba solo cubren
// las ramas que NO hacen nada (sin mondayId, con escritura apagada). Nadie
// había probado que, CON mondayId guardado, sincronizarCambio de verdad
// llegue a llamar actualizarEnMonday — para eso hace falta un `db()` que
// responda con una fila, y hasta ahora ningún test de este archivo montaba
// uno.

interface FilaAcuerdoMondayId {
  id: string
  mondayId: string | null
  mondayTipo: string | null
}

/**
 * De qué propiedad de FilaAcuerdoMondayId es esta columna de esquema.acuerdos.
 * Misma técnica que el doble de src/app/acuerdos/acciones.test.ts: compara
 * por IDENTIDAD contra las columnas reales de `esquema.acuerdos` (el mismo
 * módulo, sin mockear, así que son las mismas referencias que usa
 * `mondayIdDe` en sincronizar.ts).
 */
function claveDeColumna(columna: unknown): keyof FilaAcuerdoMondayId {
  const entrada = Object.entries(esquema.acuerdos).find(([, valor]) => valor === columna)
  if (!entrada) throw new Error('Columna no reconocida en el doble de prueba de db().')
  return entrada[0] as keyof FilaAcuerdoMondayId
}

/**
 * Un doble de `db()` mínimo para `mondayIdDe`: solo cubre
 * `select(proyección).from(acuerdos).where(eq(id, …))`, que es la única
 * consulta que esa función hace.
 *
 * A diferencia del doble de acciones.test.ts (una fila fija), este acepta
 * VARIAS: `mondayIdDe` filtra por id, y con una sola fila el test no puede
 * distinguir "encontró la fila por su id" de "hay una fila y la devuelve
 * siempre pase lo que pase" — hace falta un señuelo con otro id para que la
 * comparación de verdad esté bajo prueba (punto ciego señalado para esta
 * tarea).
 */
function dbConFilas(filas: FilaAcuerdoMondayId[]) {
  return {
    select(proyeccion: Record<string, unknown>) {
      return {
        from: () => ({
          where: (cond: { columna: unknown; valor: unknown }) => {
            const fila = filas.find((f) => f[claveDeColumna(cond.columna)] === cond.valor)
            if (!fila) return Promise.resolve([])
            const salida: Record<string, unknown> = {}
            for (const [clave, columna] of Object.entries(proyeccion)) {
              salida[clave] = fila[claveDeColumna(columna)]
            }
            return Promise.resolve([salida])
          },
        }),
      }
    },
  }
}

describe('sincronizarCambio — con mondayId guardado', () => {
  it('sí actualiza: encuentra el mondayId de LA FILA CORRECTA (no la señuelo) y llama a Monday con su tablero', async () => {
    vi.spyOn(clienteDB, 'hayDB').mockReturnValue(true)
    vi.spyOn(clienteDB, 'db').mockReturnValue(
      dbConFilas([
        { id: 'acuerdo-1', mondayId: '9', mondayTipo: 'elemento' },
        // Señuelo: otro id, otro mondayId. Sin esta fila, el test pasaría
        // igual aunque mondayIdDe ignorara el id recibido.
        { id: 'acuerdo-decoy', mondayId: '111', mondayTipo: 'subelemento' },
      ]) as unknown as ReturnType<typeof clienteDB.db>,
    )
    vi.stubEnv('MONDAY_TOKEN', 'ficticio')
    vi.stubEnv('MONDAY_GRUPO', 'group_mm15cfz2')
    vi.stubEnv('MONDAY_ESCRITURA', 'si')
    const espia = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: { change_multiple_column_values: { id: '9' } } })))
    vi.stubGlobal('fetch', espia)

    const resultado = await sincronizarCambio('acuerdo-1', DATOS)

    expect(resultado).toEqual({ intentado: true, ok: true })
    expect(espia).toHaveBeenCalledTimes(1)
    const cuerpo = JSON.parse(espia.mock.calls[0][1].body as string)
    expect(cuerpo.variables.item).toBe('9') // el mondayId de acuerdo-1, no el de la señuelo ('111')
    expect(cuerpo.variables.tablero).toBe(String(TABLERO)) // 'elemento' → TABLERO, no TABLERO_SUBELEMENTOS
  })

  it('si Monday responde con error, lo devuelve como no-ok con el motivo (la otra mitad del try/catch, tampoco probada hasta ahora)', async () => {
    vi.spyOn(clienteDB, 'hayDB').mockReturnValue(true)
    vi.spyOn(clienteDB, 'db').mockReturnValue(
      dbConFilas([{ id: 'acuerdo-1', mondayId: '9', mondayTipo: 'elemento' }]) as unknown as ReturnType<
        typeof clienteDB.db
      >,
    )
    vi.stubEnv('MONDAY_TOKEN', 'ficticio')
    vi.stubEnv('MONDAY_GRUPO', 'group_mm15cfz2')
    vi.stubEnv('MONDAY_ESCRITURA', 'si')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('server error', { status: 500 })))

    const resultado = await sincronizarCambio('acuerdo-1', DATOS)

    expect(resultado.intentado).toBe(true)
    expect(resultado.ok).toBe(false)
    expect(resultado.motivo).toContain('500')
  })
})

describe('reconciliar', () => {
  const local = {
    estatus: 'abierto' as const,
    fechaCompromiso: '2026-08-12',
    updatedAt: new Date('2026-07-29T10:00:00Z'),
  }

  it('gana quien lo tocó más tarde, aunque sea Monday', () => {
    const remoto = {
      estatus: 'cumplido' as const,
      fechaCompromiso: '2026-08-12',
      actualizadoEn: new Date('2026-07-29T11:00:00Z'),
      existe: true,
    }
    expect(reconciliar(local, remoto)).toBe('gana-monday')
  })

  it('si lo nuestro es más reciente, Monday espera al siguiente empujón', () => {
    const remoto = {
      estatus: 'cumplido' as const,
      fechaCompromiso: null,
      actualizadoEn: new Date('2026-07-29T09:00:00Z'),
      existe: true,
    }
    expect(reconciliar(local, remoto)).toBe('gana-local')
  })

  it('un elemento borrado en Monday no borra nuestro acuerdo', () => {
    const remoto = {
      estatus: 'abierto' as const,
      fechaCompromiso: null,
      actualizadoEn: new Date(),
      existe: false,
    }
    expect(reconciliar(local, remoto)).toBe('desapareció')
  })
})
