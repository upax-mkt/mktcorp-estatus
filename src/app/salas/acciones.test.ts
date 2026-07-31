import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as esquema from '@/db/esquema'
import { derivarMarca } from '@/lib/marca'

/**
 * `crearSalaAction`/`editarSalaAction` contra un doble de `db()` en memoria —
 * mismo patrón que `src/app/acuerdos/acciones.test.ts`: `eq` de drizzle-orm
 * se sustituye por una versión mínima que devuelve un objeto plano
 * inspeccionable, y el resto del módulo se conserva real, así que
 * `esquema.salas.slug` que ve el doble de abajo es la MISMA referencia de
 * columna que usa `acciones.ts`. Nunca toca Neon — `DATABASE_URL` no está
 * seteada en este proceso de todas formas.
 *
 * Nace de tres archivos de scratch de la revisión de la tarea 6 (verificación
 * EJECUTADA contra el código real, no solo leída) que probaban justo esto:
 * el slug vacío se rechaza por los dos caminos por los que puede llegar, el
 * slug repetido se rechaza contra las DIEZ filas (no solo las nueve "reales"
 * — `grupo-upax` incluida), y `editarSalaAction` no puede cambiar el
 * identificador de una fila pase lo que mande el llamador.
 */

vi.mock('drizzle-orm', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('drizzle-orm')>()
  return { ...real, eq: (columna: unknown, valor: unknown) => ({ tipo: 'eq' as const, columna, valor }) }
})

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
// Ronda 9, tarea 2: las acciones de esta pantalla ahora exigen `exigirAdmin()`
// (crear/editar salas y marcas, y el enlace de agenda, son de administrador),
// importado de `@/auth/roles` y no de `@/auth/sesion`.
vi.mock('@/auth/roles', () => ({
  exigirAdmin: vi.fn().mockResolvedValue({ rol: 'equipo', rolApp: 'admin', sub: 'equipo-mkt-corp' }),
}))

interface FilaFalsa {
  slug: string
  nombre: string
  primario: string
  familiaDisplay?: string
  familiaTexto?: string
  // Los ocho campos derivados (revisión final de la rama, punto 1): solo los
  // necesitan las nuevas describe() de más abajo, que comprueban que
  // `editarSalaAction` los deja intactos y que `recalcularPaletaAction` es
  // la única que los toca.
  secundario?: string
  acento?: string
  superficieClara?: string
  superficieOscura?: string
  textoSobreClara?: string
  textoSobreOscura?: string
  gradiente?: string[]
}
const filas = new Map<string, FilaFalsa>()

const insertMock = vi.fn()
const setCapturado: { ultimo: Record<string, unknown> | null } = { ultimo: null }
/** Si es `true`, el próximo `.update(...).set(...)` lanza — para probar el try/catch. */
let updateDebeLanzar = false

function claveDeColumna(columna: unknown): string {
  const entrada = Object.entries(esquema.salas).find(([, v]) => v === columna)
  if (!entrada) throw new Error('columna no reconocida')
  return entrada[0]
}

const dbMock = {
  select: (_proy?: Record<string, unknown>) => ({
    from: () => ({
      where: (cond: { tipo: 'eq'; columna: unknown; valor: unknown }) => {
        const clave = claveDeColumna(cond.columna)
        const encontrada = [...filas.values()].find((f) => (f as unknown as Record<string, unknown>)[clave] === cond.valor)
        return Promise.resolve(encontrada ? [{ slug: encontrada.slug }] : [])
      },
    }),
  }),
  insert: () => ({
    values: (v: Record<string, unknown>) => {
      insertMock(v)
      filas.set(v.slug as string, v as unknown as FilaFalsa)
      return Promise.resolve(undefined)
    },
  }),
  update: () => ({
    set: (parche: Record<string, unknown>) => ({
      where: (cond: { tipo: 'eq'; columna: unknown; valor: unknown }) => {
        if (updateDebeLanzar) throw new Error('la conexión se cayó a mitad del UPDATE')
        setCapturado.ultimo = parche
        const clave = claveDeColumna(cond.columna)
        const encontrada = [...filas.values()].find((f) => (f as unknown as Record<string, unknown>)[clave] === cond.valor)
        // Aplica el parche SOLO a los campos que trae — igual que un UPDATE
        // real: si 'slug' no está en el parche, el slug de la fila NUNCA cambia.
        if (encontrada) Object.assign(encontrada, parche)
        return {
          returning: (_p?: Record<string, unknown>) => Promise.resolve(encontrada ? [{ slug: encontrada.slug }] : []),
        }
      },
    }),
  }),
}

vi.mock('@/db/cliente', () => ({
  hayDB: () => true,
  db: () => dbMock,
}))

const { crearSalaAction, editarSalaAction, recalcularPaletaAction } = await import('./acciones')

beforeEach(() => {
  filas.clear()
  filas.set('zeus', { slug: 'zeus', nombre: 'Zeus', primario: '#614aca' })
  filas.set('grupo-upax', { slug: 'grupo-upax', nombre: 'Grupo UPAX', primario: '#e34714' })
  insertMock.mockClear()
  setCapturado.ultimo = null
  updateDebeLanzar = false
})

describe('crearSalaAction — un slug vacío no se guarda', () => {
  it('nombre de puro emoji/símbolos (el slug también sale vacío) se rechaza, sin insertar', async () => {
    const r = await crearSalaAction({
      nombre: '🎉🎉🎉', slug: '🎉🎉🎉', primario: '#614aca', familiaDisplay: 'outfit', familiaTexto: 'outfit', logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toBeTruthy()
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('un slug crudo mandado directo con solo símbolos (bypass del formulario, la Server Action es un endpoint) se rechaza igual', async () => {
    const r = await crearSalaAction({
      nombre: 'Una Sala De Verdad', slug: '###???', primario: '#614aca', familiaDisplay: 'outfit', familiaTexto: 'outfit', logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toBeTruthy()
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('slug vacío explícito se rechaza', async () => {
    const r = await crearSalaAction({
      nombre: 'Otra Sala', slug: '', primario: '#614aca', familiaDisplay: 'outfit', familiaTexto: 'outfit', logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toBeTruthy()
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('nombre vacío se rechaza aunque el slug mandado no lo esté', async () => {
    const r = await crearSalaAction({
      nombre: '   ', slug: 'algo-valido', primario: '#614aca', familiaDisplay: 'outfit', familiaTexto: 'outfit', logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toBeTruthy()
    expect(insertMock).not.toHaveBeenCalled()
  })
})

describe('crearSalaAction — un slug repetido se rechaza diciendo cuál es', () => {
  it('crear "zeus" de nuevo rechaza sin insertar', async () => {
    const r = await crearSalaAction({
      nombre: 'Zeus Falso', slug: 'zeus', primario: '#614aca', familiaDisplay: 'outfit', familiaTexto: 'outfit', logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toContain('zeus')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('rechaza también contra "grupo-upax" — la décima fila, fuera de las nueve "salas de verdad"', async () => {
    const r = await crearSalaAction({
      nombre: 'Grupo Upax', slug: 'grupo-upax', primario: '#614aca', familiaDisplay: 'outfit', familiaTexto: 'outfit', logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toContain('grupo-upax')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('un nombre que normaliza al mismo slug que uno existente, aunque escrito distinto, también choca', async () => {
    const r = await crearSalaAction({
      nombre: 'Zeus', slug: '  ZEUS  ', primario: '#614aca', familiaDisplay: 'outfit', familiaTexto: 'outfit', logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toContain('zeus')
    expect(insertMock).not.toHaveBeenCalled()
  })
})

describe('crearSalaAction — tope de longitud del nombre (revisión final de la rama, punto 4)', () => {
  it('un nombre de 61 caracteres se rechaza, sin insertar: se pinta sin recortar en el hub, la sala y la agenda pública', async () => {
    const r = await crearSalaAction({
      nombre: 'A'.repeat(61), slug: 'sala-larga', primario: '#614aca',
      familiaDisplay: 'outfit', familiaTexto: 'outfit', logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toBeTruthy()
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('exactamente 60 caracteres SÍ se acepta: el tope es inclusive', async () => {
    const r = await crearSalaAction({
      nombre: 'B'.repeat(60), slug: 'sala-justa', primario: '#614aca',
      familiaDisplay: 'outfit', familiaTexto: 'outfit', logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toBeUndefined()
    expect(insertMock).toHaveBeenCalledOnce()
  })

  it('editarSalaAction rechaza el mismo tope', async () => {
    const r = await editarSalaAction('zeus', {
      nombre: 'C'.repeat(61), slug: 'zeus', primario: '#614aca',
      familiaDisplay: 'outfit', familiaTexto: 'outfit', logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toBeTruthy()
    expect(setCapturado.ultimo).toBeNull()
  })
})

describe('editarSalaAction — el identificador de una sala existente es inmutable', () => {
  it('mandar un slug distinto en los datos no lo cambia: el UPDATE nunca toca la columna slug', async () => {
    const r = await editarSalaAction('zeus', {
      nombre: 'Zeus Renombrado', slug: 'otro-completamente-distinto', primario: '#00ff00',
      familiaDisplay: 'outfit', familiaTexto: 'outfit', logoUrl: null, logoRelacionDeTinta: null,
    })

    expect(r.error).toBeUndefined()
    // La fila "zeus" original sigue existiendo con ESE slug — nunca se creó
    // "otro-completamente-distinto", ni desapareció "zeus".
    expect(filas.has('zeus')).toBe(true)
    expect(filas.has('otro-completamente-distinto')).toBe(false)
    expect(filas.get('zeus')!.slug).toBe('zeus')
    // El nombre y el color SÍ se actualizaron (la edición real funcionó):
    expect(filas.get('zeus')!.nombre).toBe('Zeus Renombrado')
    // Pero el `.set()` que se mandó a Drizzle nunca incluye 'slug': estructuralmente
    // no hay ningún valor que pueda sobrescribir la clave primaria.
    expect(setCapturado.ultimo).not.toHaveProperty('slug')
  })

  it('editar una sala que no existe da error explícito con su slug, sin crear nada', async () => {
    const r = await editarSalaAction('sala-fantasma', {
      nombre: 'Fantasma', slug: 'lo-que-sea', primario: '#614aca', familiaDisplay: 'outfit', familiaTexto: 'outfit', logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toContain('sala-fantasma')
    expect(filas.has('sala-fantasma')).toBe(false)
  })

  /**
   * Corrección de esta misma revisión: antes el `db().update(...)` no estaba
   * envuelto en try/catch, así que un fallo de escritura se propagaba como
   * promesa RECHAZADA en vez de `{error}`. `FormularioSala` ahora atrapa
   * cualquier rechazo igual (ver su comentario), pero la acción no debe
   * depender de que quien la llama la envuelva bien.
   */
  it('si el UPDATE falla, devuelve {error} en vez de rechazar la promesa', async () => {
    updateDebeLanzar = true
    await expect(
      editarSalaAction('zeus', {
        nombre: 'Zeus', slug: 'zeus', primario: '#614aca', familiaDisplay: 'outfit', familiaTexto: 'outfit', logoUrl: null, logoRelacionDeTinta: null,
      }),
    ).resolves.toEqual({ error: 'la conexión se cayó a mitad del UPDATE' })
  })
})

// TIPOGRAFÍA (tarea 7): antes `crearSalaAction` clavaba 'outfit' para toda
// sala nueva ("sin selector todavía") y `editarSalaAction` ni siquiera
// tocaba la columna. Ahora las dos vienen del formulario y esta acción es
// quien de verdad las valida y las guarda — es un endpoint, y confiar en
// que el cliente mande algo razonable es exactamente el hueco que
// `validarDatosComunes` cierra en el resto de campos (slug, color).
describe('crearSalaAction — tipografía', () => {
  it('una familia de títulos que no existe se rechaza, sin insertar', async () => {
    const r = await crearSalaAction({
      nombre: 'Sala Nueva', slug: 'sala-nueva', primario: '#614aca',
      familiaDisplay: 'esto-no-es-una-fuente', familiaTexto: 'outfit', logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toContain('esto-no-es-una-fuente')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('una familia de texto que no existe se rechaza, sin insertar', async () => {
    const r = await crearSalaAction({
      nombre: 'Sala Nueva', slug: 'sala-nueva', primario: '#614aca',
      familiaDisplay: 'outfit', familiaTexto: 'esto-tampoco', logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toContain('esto-tampoco')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('inserta la familia elegida de verdad, no una constante fija para todas', async () => {
    const r = await crearSalaAction({
      nombre: 'Sala Nueva', slug: 'sala-nueva', primario: '#614aca',
      familiaDisplay: 'anton', familiaTexto: 'raleway', logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toBeUndefined()
    expect(insertMock).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ familiaDisplay: 'anton', familiaTexto: 'raleway' }),
    )
  })

  it('acepta también los dos alias heredados de la Fase 1 (specialGothic, satoshi) — no solo las veinte del catálogo elegible', async () => {
    const r = await crearSalaAction({
      nombre: 'Sala Nueva', slug: 'sala-nueva', primario: '#614aca',
      familiaDisplay: 'specialGothic', familiaTexto: 'satoshi', logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toBeUndefined()
    expect(insertMock).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ familiaDisplay: 'specialGothic', familiaTexto: 'satoshi' }),
    )
  })
})

describe('editarSalaAction — tipografía', () => {
  it('el .set() SÍ incluye la tipografía ahora (antes esta acción no la tocaba en absoluto)', async () => {
    const r = await editarSalaAction('zeus', {
      nombre: 'Zeus', slug: 'zeus', primario: '#614aca',
      familiaDisplay: 'oswald', familiaTexto: 'inter', logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toBeUndefined()
    expect(setCapturado.ultimo).toMatchObject({ familiaDisplay: 'oswald', familiaTexto: 'inter' })
    expect(filas.get('zeus')!.familiaDisplay).toBe('oswald')
    expect(filas.get('zeus')!.familiaTexto).toBe('inter')
  })

  it('una familia inventada rechaza la edición completa (también el resto de campos que sí eran válidos), sin actualizar', async () => {
    const r = await editarSalaAction('zeus', {
      nombre: 'Zeus Con Nombre Nuevo', slug: 'zeus', primario: '#00ff00',
      familiaDisplay: 'inventada-total', familiaTexto: 'outfit', logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toContain('inventada-total')
    expect(setCapturado.ultimo).toBeNull()
    // El nombre NO cambió: el rechazo fue completo, no parcial.
    expect(filas.get('zeus')!.nombre).toBe('Zeus')
  })
})

// ---- REVISIÓN FINAL DE LA RAMA, PUNTO 1 (🔴 CRÍTICO) ----
//
// `editarSalaAction` llamaba a `derivarMarca(nombre, primario)` y
// sobrescribía los OCHO campos derivados en CADA guardado — medido contra
// las diez filas reales: los ocho de las diez divergen de lo que
// `derivarMarca` produce hoy (Research Land pierde su azul y le queda un
// oliva, Zeus pierde su rosa, UiX pierde una parada de su degradado, House
// of Films pierde su negro puro). Y el camino para llegar ahí es exactamente
// el que recorre cualquiera que solo quiera cambiar la tipografía: abrir el
// formulario y pulsar "Guardar cambios".
//
// Esta es la red que impide que eso vuelva: sea cual sea el cambio que se
// mande —tipografía, o hasta el propio color— el `.set()` que le llega a
// Drizzle nunca incluye ninguno de los ocho campos derivados.
describe('editarSalaAction — el guardado normal NO toca los ocho campos derivados (revisión final de la rama, punto 1)', () => {
  const DERIVADOS_ORIGINALES = {
    secundario: '#1E0FF2',
    acento: '#F7BB11',
    superficieClara: '#FFFFFF',
    superficieOscura: '#1A0B33',
    textoSobreClara: '#4D4D4D',
    textoSobreOscura: '#FFFFFF',
    gradiente: ['#770EB3', '#1E0FF2'],
  }
  const CAMPOS_DERIVADOS = Object.keys(DERIVADOS_ORIGINALES)

  beforeEach(() => {
    // Una fila con una paleta COMPLETA y DISTINGUIBLE de lo que `derivarMarca`
    // produciría para este mismo primario — si `editarSalaAction` volviera a
    // derivar por error, estos valores cambiarían y los tests de abajo lo
    // atraparían.
    filas.set('zeus', {
      slug: 'zeus', nombre: 'Zeus', primario: '#614aca',
      familiaDisplay: 'figtree', familiaTexto: 'figtree',
      ...DERIVADOS_ORIGINALES,
    })
  })

  it('editar SOLO la tipografía —el camino exacto que pidió Franco— deja los ocho derivados byte a byte iguales', async () => {
    const r = await editarSalaAction('zeus', {
      nombre: 'Zeus', slug: 'zeus', primario: '#614aca', // el mismo color: no cambia
      familiaDisplay: 'oswald', familiaTexto: 'inter', // esto sí cambia
      logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toBeUndefined()

    const filaFinal = filas.get('zeus') as unknown as Record<string, unknown>
    for (const [campo, valorOriginal] of Object.entries(DERIVADOS_ORIGINALES)) {
      expect(filaFinal[campo], campo).toEqual(valorOriginal)
    }
    // Y la tipografía SÍ cambió: la edición real funcionó, no se quedó en un no-op.
    expect(filaFinal.familiaDisplay).toBe('oswald')
    expect(filaFinal.familiaTexto).toBe('inter')
  })

  it('el .set() que se manda a Drizzle no incluye NINGUNO de los ocho campos derivados', async () => {
    await editarSalaAction('zeus', {
      nombre: 'Zeus', slug: 'zeus', primario: '#614aca',
      familiaDisplay: 'oswald', familiaTexto: 'inter', logoUrl: null, logoRelacionDeTinta: null,
    })
    for (const campo of CAMPOS_DERIVADOS) {
      expect(setCapturado.ultimo, campo).not.toHaveProperty(campo)
    }
  })

  it('el .set() SÍ incluye exactamente los seis campos que el formulario edita de verdad', async () => {
    await editarSalaAction('zeus', {
      nombre: 'Zeus Nuevo', slug: 'zeus', primario: '#00ff00',
      familiaDisplay: 'oswald', familiaTexto: 'inter', logoUrl: 'https://blob/x.png', logoRelacionDeTinta: 0.4,
    })
    expect(Object.keys(setCapturado.ultimo!).sort()).toEqual(
      ['nombre', 'primario', 'familiaDisplay', 'familiaTexto', 'logoUrl', 'logoRelacionDeTinta', 'updatedAt'].sort(),
    )
  })

  it('cambiar el primario en un guardado normal SÍ se guarda, pero la paleta derivada se queda calculada del color viejo — el caso abierto a propósito', async () => {
    const r = await editarSalaAction('zeus', {
      nombre: 'Zeus', slug: 'zeus', primario: '#00ff00', // color nuevo
      familiaDisplay: 'figtree', familiaTexto: 'figtree', logoUrl: null, logoRelacionDeTinta: null,
    })
    expect(r.error).toBeUndefined()
    const filaFinal = filas.get('zeus') as unknown as Record<string, unknown>
    expect(filaFinal.primario).toBe('#00ff00')
    for (const [campo, valorOriginal] of Object.entries(DERIVADOS_ORIGINALES)) {
      expect(filaFinal[campo], campo).toEqual(valorOriginal)
    }
  })
})

// La respuesta explícita al caso de arriba: un botón aparte, separado del
// guardado normal, que SÍ recalcula — y solo eso.
describe('recalcularPaletaAction (revisión final de la rama, punto 1)', () => {
  beforeEach(() => {
    filas.set('zeus', {
      slug: 'zeus', nombre: 'Zeus', primario: '#614aca',
      familiaDisplay: 'figtree', familiaTexto: 'figtree',
      secundario: '#stale1', acento: '#stale2', superficieClara: '#stale3', superficieOscura: '#stale4',
      textoSobreClara: '#stale5', textoSobreOscura: '#stale6', gradiente: ['#stale7', '#stale8'],
    })
  })

  it('recalcula los ocho campos derivados desde el color que se le pase', async () => {
    const r = await recalcularPaletaAction('zeus', '#00ff00')
    expect(r.error).toBeUndefined()

    const esperado = derivarMarca('lo-que-sea', '#00ff00') // el nombre no participa en el cálculo
    const filaFinal = filas.get('zeus') as unknown as Record<string, unknown>
    expect(filaFinal.primario).toBe(esperado.primario)
    expect(filaFinal.secundario).toBe(esperado.secundario)
    expect(filaFinal.acento).toBe(esperado.acento)
    expect(filaFinal.superficieClara).toBe(esperado.superficieClara)
    expect(filaFinal.superficieOscura).toBe(esperado.superficieOscura)
    expect(filaFinal.textoSobreClara).toBe(esperado.textoSobreClara)
    expect(filaFinal.textoSobreOscura).toBe(esperado.textoSobreOscura)
    expect(filaFinal.gradiente).toEqual(esperado.gradiente)
  })

  it('NO toca nombre, tipografía ni logo: recalcular la paleta no es ninguna de esas tres cosas', async () => {
    await recalcularPaletaAction('zeus', '#00ff00')
    const filaFinal = filas.get('zeus') as unknown as Record<string, unknown>
    expect(filaFinal.nombre).toBe('Zeus')
    expect(filaFinal.familiaDisplay).toBe('figtree')
    expect(filaFinal.familiaTexto).toBe('figtree')
    expect(setCapturado.ultimo).not.toHaveProperty('nombre')
    expect(setCapturado.ultimo).not.toHaveProperty('familiaDisplay')
    expect(setCapturado.ultimo).not.toHaveProperty('familiaTexto')
    expect(setCapturado.ultimo).not.toHaveProperty('logoUrl')
  })

  it('rechaza un color inválido sin escribir nada', async () => {
    const r = await recalcularPaletaAction('zeus', 'no-es-un-hex')
    expect(r.error).toBeTruthy()
    expect(setCapturado.ultimo).toBeNull()
  })

  it('sala desconocida da error explícito, sin crear nada', async () => {
    const r = await recalcularPaletaAction('sala-fantasma', '#00ff00')
    expect(r.error).toContain('sala-fantasma')
    expect(filas.has('sala-fantasma')).toBe(false)
  })
})
