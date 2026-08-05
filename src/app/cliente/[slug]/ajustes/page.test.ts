import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FormularioSala } from '@/componentes/salas/FormularioSala'
import { PausaSala } from '@/componentes/PausaSala'
import type { Cadencia } from '@/dominio/reunion'

/**
 * `/CLIENTE/[SLUG]/AJUSTES` (ronda 10, tarea 15): los ajustes de una sala,
 * movidos de la pantalla global `/salas` a dentro de la propia sala. Franco,
 * cerrando su queja del módulo de reuniones: "la sala debería tener arriba un
 * enlace para los ajustes de la misma sala".
 *
 * Mismo criterio que `cliente/[slug]/page.test.ts` y `agenda/[token]/page.test.ts`:
 * una página de App Router es una función async con dependencias sustituibles
 * por dobles — no hace falta montar un navegador. `FormularioSala`/`PausaSala`
 * se importan REALES (nunca mockeados) solo para comparar identidad de tipo
 * (`elemento.type === FormularioSala`): el árbol que devuelve la página es JSX
 * sin renderizar (`_jsx(Componente, props)`), así que referenciar el
 * componente en el árbol NUNCA invoca su función — es seguro inspeccionar qué
 * props recibió sin montarlo (mismo motivo por el que este archivo no
 * necesita @testing-library/react).
 */

interface ElementoReact {
  type: unknown
  props: Record<string, unknown> & { children?: unknown }
}

function esElemento(valor: unknown): valor is ElementoReact {
  return typeof valor === 'object' && valor !== null && 'type' in valor && 'props' in valor
}

/** Busca, en el árbol JSX devuelto por la página, el primer elemento de un tipo dado. */
function encontrarPorTipo(nodo: unknown, tipo: unknown): ElementoReact | null {
  if (!esElemento(nodo)) return null
  if (nodo.type === tipo) return nodo
  const hijos = nodo.props.children
  const lista = Array.isArray(hijos) ? hijos : [hijos]
  for (const hijo of lista) {
    const encontrado = encontrarPorTipo(hijo, tipo)
    if (encontrado) return encontrado
  }
  return null
}

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

// El registro COMPLETO (las diez filas, grupo-upax incluido) — ver el
// comentario en page.tsx sobre por qué esta página no usa slugsDeSalas().
const REGISTRO_TEMAS = {
  'research-land': {
    slug: 'research-land',
    nombre: 'Research Land',
    primario: '#1E0FF2',
    familiaDisplay: 'outfit',
    familiaTexto: 'outfit',
    gradiente: ['#770EB3', '#1E0FF2'],
  },
  'grupo-upax': {
    slug: 'grupo-upax',
    nombre: 'Grupo UPAX',
    primario: '#e34714',
    familiaDisplay: 'outfit',
    familiaTexto: 'outfit',
    gradiente: ['#e34714', '#000000'],
  },
}
const cargarTemasMock = vi.fn()
vi.mock('@/db/temas', () => ({
  cargarTemas: (...args: unknown[]) => cargarTemasMock(...args),
}))

const exigirAdminMock = vi.fn()
vi.mock('@/auth/roles', () => ({
  exigirAdmin: (...args: unknown[]) => exigirAdminMock(...args),
}))

// La consulta directa a `esquema.salas` para lo que `Tema` no trae
// (logoUrl/logoRelacionDeTinta/cadencia/activa/pausadaDesde) — mismo patrón
// que `logoDeLaEditada` en `src/app/salas/page.tsx`. Se mockea la cadena
// entera de Drizzle; el `esquema` real se deja sin mockear (es solo
// declaración de tablas, sin I/O al importarse).
const filaExtraMock = vi.fn()
const hayDBMock = vi.fn(() => true)
vi.mock('@/db/cliente', () => ({
  hayDB: () => hayDBMock(),
  db: () => ({
    select: () => ({
      from: () => ({
        where: () => filaExtraMock(),
      }),
    }),
  }),
}))

const editarSalaActionMock = vi.fn()
vi.mock('@/app/salas/acciones', () => ({
  editarSalaAction: (...args: unknown[]) => editarSalaActionMock(...args),
}))

const pausarSalaActionMock = vi.fn()
const reactivarSalaActionMock = vi.fn()
vi.mock('@/app/acuerdos/acciones', () => ({
  pausarSalaAction: (...args: unknown[]) => pausarSalaActionMock(...args),
  reactivarSalaAction: (...args: unknown[]) => reactivarSalaActionMock(...args),
}))

const notFoundMock = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})
vi.mock('next/navigation', () => ({
  notFound: () => notFoundMock(),
}))

const { default: PaginaAjustesSala } = await import('./page')

beforeEach(() => {
  vi.clearAllMocks()
  hayDBMock.mockReturnValue(true)
  cargarTemasMock.mockResolvedValue(REGISTRO_TEMAS)
  exigirAdminMock.mockResolvedValue({ rol: 'equipo', rolApp: 'admin', sub: 'equipo-mkt-corp' })
  filaExtraMock.mockResolvedValue([
    { logoUrl: null, logoRelacionDeTinta: null, cadencia: 'mensual', activa: true, pausadaDesde: null },
  ])
  editarSalaActionMock.mockResolvedValue({})
  pausarSalaActionMock.mockResolvedValue(undefined)
  reactivarSalaActionMock.mockResolvedValue(undefined)
})

function invocar(slug = 'research-land') {
  return PaginaAjustesSala({ params: Promise.resolve({ slug }) })
}

describe('PaginaAjustesSala (/cliente/[slug]/ajustes) — solo admin, del lado del servidor', () => {
  // Test 1 del brief: "esconder el enlace no protege la página".
  it('un editor rebota: exigirAdmin() no es un adorno', async () => {
    exigirAdminMock.mockRejectedValue(
      new Error('Esta acción es solo para administradores de Marketing Corporativo.'),
    )
    await expect(invocar('research-land')).rejects.toThrow(/admin/i)
  })

  it('exigirAdmin() se llama ANTES de tocar el registro de temas o la base — primera línea de verdad, no solo primera en la lectura', async () => {
    exigirAdminMock.mockRejectedValue(new Error('solo administradores'))
    await expect(invocar('research-land')).rejects.toThrow()
    expect(cargarTemasMock).not.toHaveBeenCalled()
    expect(filaExtraMock).not.toHaveBeenCalled()
  })

  it('un admin de verdad entra sin problema', async () => {
    await expect(invocar('research-land')).resolves.toBeTruthy()
  })
})

describe('PaginaAjustesSala — guardar NO re-deriva la paleta (regla dura de la ronda 8)', () => {
  // Test 2 del brief.
  it('FormularioSala se monta SIN la prop recalcularPaleta: el botón de recalcular no puede ni aparecer', async () => {
    const arbol = await invocar('research-land')
    const formulario = encontrarPorTipo(arbol, FormularioSala)
    expect(formulario).not.toBeNull()
    expect(formulario!.props.recalcularPaleta).toBeUndefined()
  })
})

describe('PaginaAjustesSala — cadencia (el encargo principal: cerrar lo que destapó la T16)', () => {
  it('lee la cadencia real de la sala (de esquema.salas, no de Tema) y se la pasa a FormularioSala como valor actual', async () => {
    filaExtraMock.mockResolvedValue([
      { logoUrl: null, logoRelacionDeTinta: null, cadencia: 'quincenal', activa: true, pausadaDesde: null },
    ])
    const arbol = await invocar('research-land')
    const formulario = encontrarPorTipo(arbol, FormularioSala)
    expect((formulario!.props.sala as { cadencia?: Cadencia }).cadencia).toBe('quincenal')
  })

  it('sin fila extra (defensivo: sin DB o slug recién sembrado) cae a "mensual", el mismo default que la columna', async () => {
    filaExtraMock.mockResolvedValue([])
    const arbol = await invocar('research-land')
    const formulario = encontrarPorTipo(arbol, FormularioSala)
    expect((formulario!.props.sala as { cadencia?: Cadencia }).cadencia).toBe('mensual')
  })

  it('guardar está ligado a editarSalaAction PARA ESTE slug: elegir "quincenal" y guardar llega de verdad a la acción', async () => {
    const arbol = await invocar('research-land')
    const formulario = encontrarPorTipo(arbol, FormularioSala)
    const guardar = formulario!.props.guardar as (datos: unknown) => Promise<{ error?: string }>

    await guardar({
      nombre: 'Research Land',
      slug: 'research-land',
      primario: '#1E0FF2',
      familiaDisplay: 'outfit',
      familiaTexto: 'outfit',
      logoUrl: null,
      logoRelacionDeTinta: null,
      cadencia: 'quincenal',
    })

    expect(editarSalaActionMock).toHaveBeenCalledWith(
      'research-land',
      expect.objectContaining({ cadencia: 'quincenal' }),
    )
  })
})

describe('PaginaAjustesSala — pausar funciona desde esta página (lo necesita la T17)', () => {
  it('PausaSala recibe el estado real de la sala: activa y pausadaDesde, no valores fijos', async () => {
    filaExtraMock.mockResolvedValue([
      {
        logoUrl: null,
        logoRelacionDeTinta: null,
        cadencia: 'mensual',
        activa: false,
        pausadaDesde: new Date('2026-07-30T12:00:00.000Z'),
      },
    ])
    const arbol = await invocar('research-land')
    const pausa = encontrarPorTipo(arbol, PausaSala)
    expect(pausa).not.toBeNull()
    expect(pausa!.props.activa).toBe(false)
    expect(pausa!.props.pausadaDesde).toBe('2026-07-30')
  })

  it('pausarAction llama de verdad a pausarSalaAction con el slug de esta sala', async () => {
    const arbol = await invocar('research-land')
    const pausa = encontrarPorTipo(arbol, PausaSala)
    const pausarAction = pausa!.props.pausarAction as () => Promise<void>

    await pausarAction()

    expect(pausarSalaActionMock).toHaveBeenCalledWith('research-land')
  })

  it('reactivarAction llama de verdad a reactivarSalaAction con el slug de esta sala', async () => {
    const arbol = await invocar('research-land')
    const pausa = encontrarPorTipo(arbol, PausaSala)
    const reactivarAction = pausa!.props.reactivarAction as () => Promise<void>

    await reactivarAction()

    expect(reactivarSalaActionMock).toHaveBeenCalledWith('research-land')
  })

  /**
   * grupo-upax: la Tarea 17 depende de que ESTA página no le cierre el paso.
   * `pausarSalaActionMock` está mockeada, así que esto NO prueba que
   * `db/salas.ts` (fuera de esta tarea) vaya a aceptar "grupo-upax" de
   * verdad — su `validarSala()` usa `slugsDeSalas()`, que EXCLUYE
   * grupo-upax, así que hoy esa llamada real lanzaría "Sala desconocida:
   * grupo-upax" (ver el reporte de la tarea 15). Lo que este test fija es
   * que el límite no está aquí.
   */
  it('el mecanismo de pausar se ofrece igual para grupo-upax a nivel de página', async () => {
    const arbol = await invocar('grupo-upax')
    const pausa = encontrarPorTipo(arbol, PausaSala)
    expect(pausa).not.toBeNull()
    const pausarAction = pausa!.props.pausarAction as () => Promise<void>

    await pausarAction()

    expect(pausarSalaActionMock).toHaveBeenCalledWith('grupo-upax')
  })
})

describe('PaginaAjustesSala — el slug se valida contra el registro completo, no contra las nueve "salas de verdad"', () => {
  it('grupo-upax SÍ abre esta página, aunque no sea navegable en /cliente/[slug] ni en /cliente/[slug]/benchmark', async () => {
    const arbol = await invocar('grupo-upax')
    expect(arbol).toBeTruthy()
    expect(notFoundMock).not.toHaveBeenCalled()
  })

  it('un slug que no existe en ninguna fila responde notFound()', async () => {
    await expect(invocar('no-existe')).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFoundMock).toHaveBeenCalledTimes(1)
  })
})

describe('PaginaAjustesSala — sin base de datos no revienta (mismo criterio que /salas)', () => {
  it('hayDB() en false: cae a los valores por defecto en vez de llamar a db()', async () => {
    hayDBMock.mockReturnValue(false)

    const arbol = await invocar('research-land')

    expect(filaExtraMock).not.toHaveBeenCalled()
    const formulario = encontrarPorTipo(arbol, FormularioSala)
    expect((formulario!.props.sala as { cadencia?: Cadencia }).cadencia).toBe('mensual')
    const pausa = encontrarPorTipo(arbol, PausaSala)
    expect(pausa!.props.activa).toBe(true)
    expect(pausa!.props.pausadaDesde).toBeNull()
  })
})
