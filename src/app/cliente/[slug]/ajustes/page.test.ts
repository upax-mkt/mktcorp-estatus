import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FormularioSala } from '@/componentes/salas/FormularioSala'
import { PausaSala } from '@/componentes/PausaSala'
import { ClaveDeSala } from '@/componentes/ClaveDeSala'
import { BarraNavegacion } from '@/componentes/BarraNavegacion'
import { CopiarBoton } from '@/componentes/CopiarBoton'
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

// `connection()` (Crítico B de la auditoría UX/UI, ronda 11 tarea 4):
// BarraNavegacion se monta aquí también, así que esta página necesita el
// mismo mecanismo que `cliente/[slug]/page.test.ts` y `deck/page.test.ts`
// para que pinte la fecha de HOY, no la del build. Llamado fuera de un
// request real de Next revienta con "connection was called outside a
// request scope".
vi.mock('next/server', () => ({ connection: vi.fn().mockResolvedValue(undefined) }))

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
// `esAdmin` (Crítico B): `BarraNavegacion` la necesita DE VERDAD, no un
// `true` fijo — a diferencia de `/salas` y `/personas`, que sí lo hardcodean
// (con su propio razonamiento: si `exigirAdmin()` no lanzó, ya es admin). El
// brief de esta tarea pide explícitamente lo contrario aquí: "si mañana
// cambia el gate, el hardcodeo miente". TRAMPA CONOCIDA (ya mordió a otro
// agente, ver `deck/page.test.ts`): si este mock no incluye `esAdmin`, la
// llamada real revienta con "esAdmin is not a function" y se lleva entre las
// patas cualquier `await`/`Promise.all` que la rodee.
const esAdminMock = vi.fn()
vi.mock('@/auth/roles', () => ({
  exigirAdmin: (...args: unknown[]) => exigirAdminMock(...args),
  esAdmin: () => esAdminMock(),
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

// EL ACCESO DEL DIRECTOR, MUDADO AQUÍ DESDE `cliente/[slug]/page.tsx` (ronda
// 11, tarea 3): `ClaveDeSala` y las dos acciones que la respaldan
// (`regenerarClaveAction`/`quitarClaveAction`, definidas EN esta página, más
// abajo). `estadoDeClave`/`regenerarClave`/`quitarClave` con nombre (no
// anónimos): el describe dedicado necesita comprobar CON QUÉ se llaman —el
// slug de esta sala, y el secreto de firma— no solo que se hayan llamado.
const estadoDeClaveMock = vi.fn()
const regenerarClaveMock = vi.fn()
const quitarClaveMock = vi.fn()
vi.mock('@/db/claves', () => ({
  estadoDeClave: (...args: unknown[]) => estadoDeClaveMock(...args),
  regenerarClave: (...args: unknown[]) => regenerarClaveMock(...args),
  quitarClave: (...args: unknown[]) => quitarClaveMock(...args),
}))

// `secretoConfigurado` ya vivía aquí. Desde la tarea 4 (Crítico A: el link
// firmado de 30 días se fusiona con la clave, bajo un solo "Acceso del
// director") se suman `generarTokenDeSala` —el colaborador bajo prueba del
// describe dedicado, más abajo, con nombre para comprobar CON QUÉ se
// llama— y `cerrarSesion`, que hace falta para `salirAction` de
// `BarraNavegacion` (Crítico B). Se sigue mockeando el módulo entero —igual
// que `cliente/[slug]/page.test.ts`— para no cargar el real, que importa
// `next/headers` a nivel de módulo.
const secretoConfiguradoMock = vi.fn()
const generarTokenDeSalaMock = vi.fn()
const cerrarSesionMock = vi.fn()
vi.mock('@/auth/sesion', () => ({
  secretoConfigurado: () => secretoConfiguradoMock(),
  generarTokenDeSala: (...args: unknown[]) => generarTokenDeSalaMock(...args),
  cerrarSesion: () => cerrarSesionMock(),
}))

const notFoundMock = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})
// `redirect` (Crítico B): la Server Action `salir` que esta página arma para
// `BarraNavegacion` la llama tras `cerrarSesion()`, igual que en las otras
// diez pantallas que ya montan la barra. Lanza, como la real: interrumpe la
// función justo donde se llama, nunca devuelve.
const redirectMock = vi.fn((..._args: unknown[]) => {
  throw new Error('NEXT_REDIRECT')
})
vi.mock('next/navigation', () => ({
  notFound: () => notFoundMock(),
  redirect: (...args: unknown[]) => redirectMock(...args),
}))

const { default: PaginaAjustesSala } = await import('./page')

beforeEach(() => {
  vi.clearAllMocks()
  hayDBMock.mockReturnValue(true)
  cargarTemasMock.mockResolvedValue(REGISTRO_TEMAS)
  exigirAdminMock.mockResolvedValue({ rol: 'equipo', rolApp: 'admin', sub: 'equipo-mkt-corp' })
  esAdminMock.mockResolvedValue(true)
  filaExtraMock.mockResolvedValue([
    { logoUrl: null, logoRelacionDeTinta: null, cadencia: 'mensual', activa: true, pausadaDesde: null },
  ])
  editarSalaActionMock.mockResolvedValue({})
  pausarSalaActionMock.mockResolvedValue(undefined)
  reactivarSalaActionMock.mockResolvedValue(undefined)
  secretoConfiguradoMock.mockReturnValue('secreto-de-prueba')
  estadoDeClaveMock.mockResolvedValue({ tiene: false, creadaEn: null })
  regenerarClaveMock.mockResolvedValue('faro-arena-3971')
  quitarClaveMock.mockResolvedValue(undefined)
  // `urlBase()` (real, sin mockear) resuelve sin tocar `next/headers` en
  // cuanto `APP_URL` está definida — mismo patrón que
  // `cliente/[slug]/page.test.ts`: hace falta para el link firmado, que arma
  // su texto con `await urlBase()`.
  process.env.APP_URL = 'https://mktcorp-estatus.example'
  generarTokenDeSalaMock.mockResolvedValue('token-firmado-de-prueba')
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

/**
 * EL ACCESO DEL DIRECTOR SE MUDÓ AQUÍ (ronda 11, tarea 3, paso 1). Franco:
 * "dentro de un cliente (sala) el módulo de acceso al director no debería
 * vivir allí, debería estar en los ajustes de cada sala". `ClaveDeSala` vivía
 * en `cliente/[slug]/page.tsx` junto a `regenerarClaveAction`/
 * `quitarClaveAction`; las tres se mudan juntas.
 *
 * NO SE DEBILITAN AL MUDARSE: las dos acciones siguen abriendo con
 * `exigirAdmin()`, exactamente igual que en su sitio viejo — una Server
 * Action es un endpoint propio, alcanzable con su id aunque la página que la
 * define ya haya gateado el render. Los tests de "regenerarAction"/
 * "quitarAction" limpian `exigirAdminMock` DESPUÉS de `invocar()` (que ya lo
 * llamó una vez, al cargar la página) para contar solo la llamada que hace la
 * ACCIÓN al ejecutarse — la prueba de que no se apoya solo en el gate de la
 * página.
 */
describe('PaginaAjustesSala — el acceso del director se mudó aquí desde la sala (ronda 11, tarea 3)', () => {
  it('monta ClaveDeSala con el estado real de la clave de esta sala', async () => {
    estadoDeClaveMock.mockResolvedValue({ tiene: true, creadaEn: '2026-07-01T00:00:00.000Z' })

    const arbol = await invocar('research-land')
    const clave = encontrarPorTipo(arbol, ClaveDeSala)

    expect(clave).not.toBeNull()
    expect(clave!.props.nombreSala).toBe('Research Land')
    expect(clave!.props.tiene).toBe(true)
    expect(clave!.props.creadaEn).toBe('2026-07-01T00:00:00.000Z')
    expect(estadoDeClaveMock).toHaveBeenCalledWith('research-land', 'secreto-de-prueba')
  })

  it('sin SESSION_SECRET configurado, ClaveDeSala recibe "sin clave" en vez de reventar — ni se consulta la base', async () => {
    secretoConfiguradoMock.mockReturnValue(null)

    const arbol = await invocar('research-land')
    const clave = encontrarPorTipo(arbol, ClaveDeSala)

    expect(clave!.props.tiene).toBe(false)
    expect(clave!.props.creadaEn).toBeNull()
    expect(estadoDeClaveMock).not.toHaveBeenCalled()
  })

  it('regenerarAction: exige admin POR SU CUENTA (no solo el gate de la página) y llama a regenerarClave con el slug y el secreto', async () => {
    const arbol = await invocar('research-land')
    const clave = encontrarPorTipo(arbol, ClaveDeSala)
    const regenerar = clave!.props.regenerarAction as () => Promise<{ clave?: string; error?: string }>

    exigirAdminMock.mockClear()
    const resultado = await regenerar()

    expect(exigirAdminMock).toHaveBeenCalledTimes(1)
    expect(regenerarClaveMock).toHaveBeenCalledWith('research-land', 'secreto-de-prueba')
    expect(resultado.clave).toBe('faro-arena-3971')
  })

  it('regenerarAction rebota si quien la llama no es admin, aunque haya llegado hasta aquí', async () => {
    const arbol = await invocar('research-land')
    const clave = encontrarPorTipo(arbol, ClaveDeSala)
    const regenerar = clave!.props.regenerarAction as () => Promise<{ clave?: string; error?: string }>

    exigirAdminMock.mockRejectedValueOnce(new Error('Esta acción es solo para administradores de Marketing Corporativo.'))

    await expect(regenerar()).rejects.toThrow(/admin/i)
    expect(regenerarClaveMock).not.toHaveBeenCalled()
  })

  it('regenerarAction sin SESSION_SECRET: error explícito, nunca llama a regenerarClave', async () => {
    const arbol = await invocar('research-land')
    const clave = encontrarPorTipo(arbol, ClaveDeSala)
    const regenerar = clave!.props.regenerarAction as () => Promise<{ clave?: string; error?: string }>

    secretoConfiguradoMock.mockReturnValue(null)
    const resultado = await regenerar()

    expect(resultado.error).toBeTruthy()
    expect(regenerarClaveMock).not.toHaveBeenCalled()
  })

  it('quitarAction: exige admin POR SU CUENTA y llama a quitarClave con el slug', async () => {
    const arbol = await invocar('research-land')
    const clave = encontrarPorTipo(arbol, ClaveDeSala)
    const quitar = clave!.props.quitarAction as () => Promise<void>

    exigirAdminMock.mockClear()
    await quitar()

    expect(exigirAdminMock).toHaveBeenCalledTimes(1)
    expect(quitarClaveMock).toHaveBeenCalledWith('research-land')
  })

  it('quitarAction rebota si quien la llama no es admin', async () => {
    const arbol = await invocar('research-land')
    const clave = encontrarPorTipo(arbol, ClaveDeSala)
    const quitar = clave!.props.quitarAction as () => Promise<void>

    exigirAdminMock.mockRejectedValueOnce(new Error('Esta acción es solo para administradores de Marketing Corporativo.'))

    await expect(quitar()).rejects.toThrow(/admin/i)
    expect(quitarClaveMock).not.toHaveBeenCalled()
  })
})

/**
 * EL LINK FIRMADO DE 30 DÍAS SE FUSIONA AQUÍ CON LA CLAVE (Crítico A de la
 * auditoría UX/UI, ronda 11 tarea 4). Hasta esta tarea, "Acceso del
 * director" existía en DOS pantallas con el MISMO título y mecanismos
 * distintos: aquí solo la clave (tarea 3) y en `cliente/[slug]/page.tsx` el
 * link firmado, en su propia tarjeta, también titulada "Acceso del
 * director" — peor que el problema original que la tarea 3 quiso resolver.
 * Ahora los dos mecanismos viven bajo el mismo encabezado, en esta página.
 *
 * NO SE DEBILITA AL MUDARSE: `generarTokenDeSala` ya traía su propia guarda
 * (`secretoConfigurado()` adentro, `src/auth/sesion.ts` — sin
 * SESSION_SECRET, `null`, nunca lanza) y esta página entera ya exige admin
 * desde su primera línea (`exigirAdmin()`). Ver el reporte de la tarea sobre
 * el alcance exacto: en la sala, `tokenDeAcceso` YA solo salía no-nulo para
 * `admin` (`admin ? await generarTokenDeSala(slug) : null`) — no había ahí
 * un `equipo` más amplio que perder.
 */
describe('PaginaAjustesSala — el link firmado de 30 días se fusiona con la clave, bajo un solo "Acceso del director" (Crítico A)', () => {
  it('genera el token para ESTA sala y arma el link con urlBase() real + el slug + el token', async () => {
    const arbol = await invocar('research-land')
    const boton = encontrarPorTipo(arbol, CopiarBoton)

    expect(generarTokenDeSalaMock).toHaveBeenCalledWith('research-land')
    expect(boton).not.toBeNull()
    expect(boton!.props.texto).toBe(
      'https://mktcorp-estatus.example/cliente/research-land?acceso=token-firmado-de-prueba',
    )
  })

  it('sin SESSION_SECRET (generarTokenDeSala devuelve null) el link no se ofrece, pero la clave sigue ahí', async () => {
    generarTokenDeSalaMock.mockResolvedValue(null)

    const arbol = await invocar('research-land')

    expect(encontrarPorTipo(arbol, CopiarBoton)).toBeNull()
    expect(encontrarPorTipo(arbol, ClaveDeSala)).not.toBeNull()
  })
})

/**
 * BARRANAVEGACION (Crítico B de la auditoría UX/UI, ronda 11 tarea 4):
 * ajustes nació en la ronda 10 y quedó fuera de la lista de la ronda 11 tarea
 * 2, que la montó en las otras diez pantallas de equipo — era la única
 * pantalla real de la app sin el menú global; su única salida era "←
 * <sala>". Mismo contrato que las diez, fijado en `BarraNavegacion.test.tsx`.
 */
describe('PaginaAjustesSala — BarraNavegacion (Crítico B)', () => {
  it('se monta con seccionActiva undefined: los ajustes de una sala no son ninguna de las cinco pestañas, mismo caso que el Home', async () => {
    const arbol = await invocar('research-land')
    const barra = encontrarPorTipo(arbol, BarraNavegacion)

    expect(barra).not.toBeNull()
    expect(barra!.props.seccionActiva).toBeUndefined()
  })

  it('admin viaja de esAdmin() de verdad, no hardcodeado: si el gate cambiara mañana esto lo reflejaría', async () => {
    esAdminMock.mockResolvedValue(false)

    const arbol = await invocar('research-land')
    const barra = encontrarPorTipo(arbol, BarraNavegacion)

    expect(barra!.props.admin).toBe(false)
  })

  it('hoy es la fecha real del request, no un valor fijo', async () => {
    const arbol = await invocar('research-land')
    const barra = encontrarPorTipo(arbol, BarraNavegacion)

    expect(barra!.props.hoy).toBeInstanceOf(Date)
  })

  it('salirAction: cierra sesión y redirige a /entrar, igual que en las otras diez pantallas', async () => {
    const arbol = await invocar('research-land')
    const barra = encontrarPorTipo(arbol, BarraNavegacion)
    const salir = barra!.props.salirAction as () => Promise<void>

    await expect(salir()).rejects.toThrow('NEXT_REDIRECT')

    expect(cerrarSesionMock).toHaveBeenCalledTimes(1)
    expect(redirectMock).toHaveBeenCalledWith('/entrar')
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
