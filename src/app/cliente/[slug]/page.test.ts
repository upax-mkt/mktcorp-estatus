import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createElement } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { EstadoSala } from '@/dominio/salas'
import { PLANTILLAS } from '@/secciones/plantillas'

/**
 * EL AGUJERO MÁS GRAVE DE LA RONDA 9, Y EL ÚNICO SIN UN TEST QUE SE CAYERA SI
 * ALGUIEN LO REVIERTE (corrección tras la segunda revisión).
 *
 * `generarTokenDeSala` no es una vista previa: firma, en el momento, un link
 * real de 30 días con acceso de lectura a la sala de un cliente. Antes de la
 * corrección, la guarda era `equipo` (cualquier rol) — hoy es `esAdmin()`. Si
 * alguien revierte `const admin = await esAdmin()` a `const admin = equipo`
 * —exactamente el bug original—, este test se cae. Sin él, los 1049 tests
 * seguían en verde con el agujero abierto.
 *
 * Mismo patrón que `reunion/[id]/page.test.ts`: invocar la página como una
 * función async cualquiera (un Server Component de App Router lo es) y mirar
 * qué se llamó, sin renderizar a DOM — los componentes de la vista se
 * referencian como JSX (`_jsx(Componente, props)`), que NO invoca la función
 * del componente; solo `VistaSala` misma se ejecuta.
 */

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

// `connection()` (ronda 11, enganche de la tarea 2): la página ahora lo
// llama para que `BarraNavegacion` pinte la fecha de HOY, no la del build
// (ver su comentario). Llamado FUERA de cualquier render real de Next,
// revienta con "connection was called outside a request scope" — mismo
// motivo por el que `next/cache` (arriba) se mockea, y mismo mock exacto
// que ya usa `reuniones/page.test.tsx` para el mismo cableado.
vi.mock('next/server', () => ({ connection: vi.fn().mockResolvedValue(undefined) }))

// SOLO PARA LOS TESTS QUE RENDERIZAN DE VERDAD (Tarea 11, más abajo):
// `LevantarMinuta` (fuera de mi lista de archivos de esta tarea) llama a
// `useRouter()` — sin un App Router real montado, la implementación real
// revienta ("invariant expected app router to be mounted"; confirmado con
// `src/componentes/__router-probe.test.tsx`, que documenta justo este fallo).
// `notFound`/`redirect` se conservan reales (`importOriginal`): ningún
// escenario de este archivo llega a dispararlos —ni antes de este mock ni
// después—, así que no hace falta doblarlos también.
vi.mock('next/navigation', async (importOriginal) => {
  const real = await importOriginal<typeof import('next/navigation')>()
  return {
    ...real,
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    }),
  }
})

vi.mock('@/db/temas', () => ({
  cargarTemas: vi.fn().mockResolvedValue({
    neracode: { nombre: 'NeraCode', primario: '#101010', gradiente: ['#101010', '#202020'] },
  }),
  slugsDeSalas: vi.fn().mockResolvedValue(['neracode']),
}))

const SALA_BASE: EstadoSala = {
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
}

// Una sala con dos reuniones reales —dadas, sin minuta— para el bloque de
// participación más abajo: `SALA_BASE` a propósito no tiene ninguna, así que
// con ella `reuniones` sale `[]` y la pregunta "¿se llamó participantesDe?"
// nunca se ejercitaría de verdad.
const REUNION_BASE = {
  tipo: 'mensual' as const, estado: 'dada' as const, noDadaEn: null, documentoListo: true, archivos: [], acuerdos: [],
}
const SALA_CON_REUNIONES: EstadoSala = {
  ...SALA_BASE,
  reuniones: [
    { ...REUNION_BASE, id: 'sesion-jul', fecha: '2026-07-15T10:00:00.000Z', titulo: 'Julio' },
    { ...REUNION_BASE, id: 'sesion-jun', fecha: '2026-06-15T10:00:00.000Z', titulo: 'Junio' },
  ],
}

// `acuerdosAbiertos`/`acuerdosVencidos`/`estaCongelado` se conservan REALES
// (importOriginal): son derivados puros sobre `EstadoSala` — con `acuerdos:
// []` no tienen nada que fallar, y no hace falta reimplementarlos aquí. Solo
// `estadoDeSala` (lectura real) se sustituye.
//
// `estadoDeSalaMock` sale del `vi.fn()` (antes vivía inline, sin nombre) para
// poder devolver `SALA_CON_REUNIONES` puntualmente en el bloque de
// participación de más abajo, sin tocar el default (`SALA_BASE`) que usa el
// resto de los tests de este archivo.
const estadoDeSalaMock = vi.fn()
vi.mock('@/db/consultas', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('@/db/consultas')>()
  return { ...real, estadoDeSala: (...args: unknown[]) => estadoDeSalaMock(...args) }
})

// El colaborador bajo prueba del bloque "la participación es solo de
// equipo": `participantesDe`. `resumirParticipacion` NO se sustituye —se
// deja real vía `importOriginal`, mismo patrón que `@/db/consultas` más
// abajo—: es una función pura (sin tocar `db`), y desde la Tarea 9b hace
// falta de verdad: `ParticipantesSesion` SÍ llega a ejecutarse (no solo a
// referenciarse como JSX) en el describe de "+ Subir presentación", que
// renderiza una sala con reuniones y `equipo=true` — la combinación que los
// describes anteriores evitaban (o no renderizaban, o partían de una sala
// sin reuniones).
const participantesDeMock = vi.fn()
vi.mock('@/db/participacion', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('@/db/participacion')>()
  return { ...real, participantesDe: (...args: unknown[]) => participantesDeMock(...args) }
})

vi.mock('@/db/acuerdos', () => ({
  moverEstatus: vi.fn(),
  editarAcuerdo: vi.fn(),
  crearAcuerdo: vi.fn(),
  eliminarAcuerdo: vi.fn(),
  refrescarDesdeMonday: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/db/personas', () => ({
  directorio: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/monday/cliente', () => ({
  ErrorMonday: class ErrorMonday extends Error {},
}))

vi.mock('@/db/benchmark', () => ({
  obtenerBenchmark: vi.fn().mockResolvedValue(null),
}))

// `registrarArchivo` con nombre (no un `vi.fn()` anónimo): la Tarea 11 lo
// necesita para comprobar CON QUÉ se llamó de verdad —si `reunionId` llegó y
// en qué forma— no solo que se haya llamado. `editarArchivo` con nombre
// desde la ronda 11, tarea 3: el describe de "editar desde la reunión"
// comprueba que NUNCA le llega una `fecha` cuando la edición viene de
// `CarasDeReunion` — mandarla en `null` la borraría (`editarArchivo`,
// `src/db/archivos.ts`, trata `undefined` como "no la toques").
const registrarArchivoMock = vi.fn()
const editarArchivoMock = vi.fn()
vi.mock('@/db/archivos', () => ({
  listarArchivos: vi.fn().mockResolvedValue([]),
  registrarArchivo: (...args: unknown[]) => registrarArchivoMock(...args),
  editarArchivo: (...args: unknown[]) => editarArchivoMock(...args),
  eliminarArchivo: vi.fn(),
}))

vi.mock('@vercel/blob', () => ({
  // `.mockResolvedValue` (no un `vi.fn()` a secas): la real es async, y el
  // código de la página encadena `.catch(...)` sobre su resultado — tanto en
  // el catch de siempre como en el rechazo cruzado de sala del hallazgo 4a.
  del: vi.fn().mockResolvedValue(undefined),
}))

// La subida de `ArchivosSala` (SubirArchivo) va del navegador DIRECTO a Blob
// antes de llamar a la Server Action — ver la cabecera de ese componente.
vi.mock('@vercel/blob/client', () => ({
  upload: vi.fn().mockResolvedValue({ pathname: 'salas/neracode/interes/archivo-de-prueba.pdf' }),
}))

// `@/auth/sesion` que usa esta página, mockeado con lo mínimo para que el
// camino de lectura llegue completo sin lanzar — `puedeVerEstaSala` en
// `true` (si no, `notFound()` corta antes de llegar a la línea que importa).
//
// `generarTokenDeSala` YA NO SE MOCKEA AQUÍ (Crítico A de la auditoría UX/UI,
// ronda 11 tarea 4): la página dejó de importarla — el link firmado de 30
// días se fusionó con la clave en `cliente/[slug]/ajustes/page.tsx` (su
// propio `page.test.ts` es quien ahora prueba ese colaborador). Si `page.tsx`
// alguna vez volviera a importarla, este módulo no la expondría y el test
// fallaría al intentar llamar algo que no es función — la propia ausencia
// del mock es la guarda contra una regresión silenciosa.
vi.mock('@/auth/sesion', () => ({
  secretoConfigurado: vi.fn().mockReturnValue(null),
  puedeEditarAcuerdosDe: vi.fn().mockResolvedValue(false),
  puedeVerEstaSala: vi.fn().mockResolvedValue(true),
  cerrarSesion: vi.fn(),
  exigirEdicionDeAcuerdos: vi.fn(),
}))

// Migrado de @/db/sesiones (ronda 10, tarea 5b): `listarSesiones` ->
// `listarReuniones` (@/db/reuniones); `crearSesionConEstructura` ->
// `crearReunionConDocumento` (@/db/documentos). Con `listarReuniones` en
// `[]`, `enPreparacion` sale vacío y `documentoDeReunion` (que la página
// también importa ahora, para resolver itemsLlenados/totalItems por
// reunión) nunca llega a invocarse — se mockea igual, mínimo defensivo,
// mismo criterio que el resto de este archivo.
// `obtenerReunion` con nombre (hallazgo 4a, revisión final ronda 10):
// `registrarArchivoAction` lo necesita para comprobar que un `reunionId` que
// llega del cliente es de ESTA sala antes de registrar el archivo — ver el
// describe dedicado, más abajo.
const obtenerReunionMock = vi.fn()
vi.mock('@/db/reuniones', () => ({
  listarReuniones: vi.fn().mockResolvedValue([]),
  marcarDada: vi.fn(),
  marcarNoDada: vi.fn(),
  desmarcarNoDada: vi.fn(),
  obtenerReunion: (...args: unknown[]) => obtenerReunionMock(...args),
}))

// `crearReunionConDocumento` con nombre (no un `vi.fn()` anónimo): el describe
// de "crearSesionAction reenvía el título" (más abajo) necesita comprobar CON
// QUÉ se llamó de verdad — el bug original era exactamente que la acción lo
// mandaba `''` fijo, ignorando lo que el cliente hubiera mandado.
const crearReunionConDocumentoMock = vi.fn()
vi.mock('@/db/documentos', () => ({
  crearReunionConDocumento: (...args: unknown[]) => crearReunionConDocumentoMock(...args),
  documentoDeReunion: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/app/acuerdos/acciones', () => ({
  pausarSalaAction: vi.fn(),
  reactivarSalaAction: vi.fn(),
  destacarAction: vi.fn(),
}))

/**
 * `ReunionesSala` SIGUE RENDERIZANDO DE VERDAD (los tests de "Tarea 9b"/"Tarea
 * 11" más abajo dependen de eso: clic real, input de archivo real) — este
 * doble solo ENVUELVE al componente real (`importOriginal`) para poder
 * espiar con qué `registrarArchivoAction` lo llama la página, sin tocar su
 * comportamiento. Hace falta para el describe de "hallazgo 4a" (más abajo):
 * la validación cruzada de sala solo se puede ejercitar con un `reunionId`
 * que la UI real de esta sala JAMÁS ofrecería (la UI no cruza salas — lo dice
 * el propio hallazgo), así que hay que invocar la acción directo con un dato
 * fabricado.
 */
const reunionesSalaPropsMock = vi.fn()
vi.mock('@/componentes/ReunionesSala', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('@/componentes/ReunionesSala')>()
  return {
    ...real,
    ReunionesSala: (props: Parameters<typeof real.ReunionesSala>[0]) => {
      reunionesSalaPropsMock(props)
      return createElement(real.ReunionesSala, props)
    },
  }
})

// `NuevaSesionSala`, mismo criterio que `ReunionesSala` arriba: doble que
// ENVUELVE al componente real (`importarOriginal`) solo para espiar con qué
// `crearAction` (= `crearSesionAction`, la Server Action de esta página) lo
// monta la pantalla — el describe de "crearSesionAction reenvía el título"
// (más abajo) llama esa acción capturada directo, con un `titulo` fabricado,
// para comprobar que ya no se manda `''` fijo (el bug que cerró esta tarea).
const nuevaSesionSalaPropsMock = vi.fn()
vi.mock('@/componentes/NuevaSesionSala', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('@/componentes/NuevaSesionSala')>()
  return {
    ...real,
    NuevaSesionSala: (props: Parameters<typeof real.NuevaSesionSala>[0]) => {
      nuevaSesionSalaPropsMock(props)
      return createElement(real.NuevaSesionSala, props)
    },
  }
})

// `LevantarMinuta`, en cambio, se sustituye por un doble MUDO: ningún test de
// este archivo interactúa con su UI real (abrir el diálogo, elegir una
// reunión) — el describe de "hallazgo 1" (más abajo) solo necesita saber QUÉ
// `sesiones` le llegó de prop, no verlo pintado. Evita además depender del
// polyfill de `<dialog>`/`useRouter()` para algo que este archivo no ejercita.
const levantarMinutaPropsMock = vi.fn()
vi.mock('@/componentes/LevantarMinuta', () => ({
  LevantarMinuta: (props: unknown) => {
    levantarMinutaPropsMock(props)
    return null
  },
}))

// Los dos predicados de la ronda 9 bajo control directo — son el eje del
// test: `esLector()` decide si `equipo` (visibilidad general) es `true`,
// `esAdmin()` decide si se genera el token. `exigirEditor` con nombre desde
// la ronda 11, tarea 3: el describe de "editar desde la reunión" comprueba
// que `editarArchivoAction` lo exige por su cuenta, no solo que la pantalla
// lo esconda.
const esAdminMock = vi.fn()
const esLectorMock = vi.fn()
const exigirEditorMock = vi.fn()
vi.mock('@/auth/roles', () => ({
  esAdmin: () => esAdminMock(),
  esLector: () => esLectorMock(),
  exigirAdmin: vi.fn(),
  exigirEditor: (...args: unknown[]) => exigirEditorMock(...args),
}))

const { default: VistaSala } = await import('./page')

beforeEach(() => {
  vi.clearAllMocks()
  // Default para todo el archivo: la sala sin reuniones. El bloque de
  // participación lo pisa puntualmente con `mockResolvedValueOnce`.
  estadoDeSalaMock.mockResolvedValue(SALA_BASE)
  participantesDeMock.mockResolvedValue([])
  // Default: cualquier reunionId que llegue a `registrarArchivoAction` se
  // resuelve como de ESTA sala ('neracode', el slug fijo de `invocar()`) —
  // mismo slug que toda fixture de este archivo. El describe de "hallazgo 4a"
  // lo pisa con un slug distinto para probar el rechazo cruzado.
  obtenerReunionMock.mockResolvedValue({ salaSlug: 'neracode' })
})

async function invocar() {
  return VistaSala({ params: Promise.resolve({ slug: 'neracode' }) })
}

/**
 * LA PARTICIPACIÓN DE CADA REUNIÓN (quién preparó, quién presentó) ES SOLO DE
 * EQUIPO — Y LA GUARDA ESTÁ EN LA CARGA, NO EN EL PINTADO (ronda 10).
 *
 * `ReunionesSala` es `'use client'`: lo que esta página le pase de prop se
 * serializa en el payload del navegador aunque el propio componente decida
 * no mostrarlo (la misma fuga que ya se corrigió para `directorio()` en esta
 * pantalla, y para `directorio()` otra vez en `/reunion/[id]`). Por eso el
 * test que importa no es "¿la pantalla del director pinta la línea?" —eso lo
 * cubre `ReunionesSala.test.tsx`, del lado del componente— sino "¿el
 * servidor llegó a PEDIR los nombres siquiera?". Si `participantesDe` nunca
 * se llama, los nombres de Mkt Corp no llegan a existir en este cierre, así
 * que no hay nada que un payload pueda llevarse.
 */
describe('VistaSala (/cliente/[slug]) — la participación de cada reunión es solo de equipo', () => {
  it('director (esLector false): participantesDe NI SIQUIERA SE LLAMA, aunque la sala tenga reuniones', async () => {
    estadoDeSalaMock.mockResolvedValueOnce(SALA_CON_REUNIONES)
    esLectorMock.mockResolvedValue(false)
    esAdminMock.mockResolvedValue(false)

    await invocar()

    expect(participantesDeMock).not.toHaveBeenCalled()
  })

  it('equipo (esLector true): participantesDe se llama para cada sesión de la sala', async () => {
    estadoDeSalaMock.mockResolvedValueOnce(SALA_CON_REUNIONES)
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)

    await invocar()

    expect(participantesDeMock).toHaveBeenCalledTimes(2)
    expect(participantesDeMock).toHaveBeenCalledWith('sesion-jul')
    expect(participantesDeMock).toHaveBeenCalledWith('sesion-jun')
  })

  it('equipo, pero sin ninguna reunión todavía (SALA_BASE): tampoco se llama — no hay qué pedir', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)

    await invocar()

    expect(participantesDeMock).not.toHaveBeenCalled()
  })
})

/**
 * TAREA 11: "ANTES DE ESTA HERRAMIENTA" DESAPARECE.
 *
 * Franco: "no entiendo por qué hacer la distinción si al final a la UDN le
 * interesa ver la última reunión con su presentación y minuta y abajo
 * Reuniones anteriores con lo mismo". Para la UDN nunca hubo dos clases de
 * reunión — la subsección era una distinción de implementación (archivo
 * suelto vs. armado en la app) ascendida a título de sección.
 *
 * A DIFERENCIA de los describes de arriba (que invocan `VistaSala` sin
 * renderizar — ver la cabecera del archivo), aquí SÍ hace falta `render()`:
 * lo que se comprueba es qué TEXTO queda en pantalla, no qué colaborador se
 * llamó. `equipo=true` es a propósito, no un default cualquiera: con
 * `listarArchivos` mockeado en `[]` (arriba) y `equipo=false`, el bloque
 * viejo YA no se pintaba de por sí —su guarda es `archivosPresentaciones.length
 * > 0 || equipo`—, así que el primer test habría "pasado" incluso contra el
 * código sin tocar (falso verde). Con `equipo=true` el bloque SÍ se pinta hoy
 * —cualquiera del equipo ve el botón para subir una presentación vieja,
 * aunque no haya ninguna todavía—, así que el RED es real.
 *
 * Mismo `equipo=true` resuelve también la segunda pregunta del brief ("¿y si
 * en la base real no hay ni un archivo de interés?"): la sección "Archivos de
 * interés" se muestra para el equipo SIEMPRE (`archivosDeInteres.length > 0 ||
 * equipo`, igual que el bloque viejo) — no hace falta sembrar un archivo de
 * prueba ni tocar `ArchivosSala` para probar que la sección sigue en su
 * sitio, y el test no depende de que la base tenga datos que hoy no tiene.
 */
describe('VistaSala (/cliente/[slug]) — la sala ya no separa las juntas por la herramienta con que se hicieron', () => {
  it('"antes de esta herramienta" ya no aparece en pantalla', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)

    render(await invocar())

    expect(screen.queryByText(/antes de esta herramienta/i)).toBeNull()
  })

  it('archivos de interés sigue en su sitio: eso sí es otra cosa', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)

    render(await invocar())

    expect(screen.getByText(/archivos de interés/i)).toBeInTheDocument()
  })

  /**
   * `registrarArchivoAction` ACEPTA Y PASA `reunionId` (para la Tarea 9,
   * `CarasDeReunion`) — pero el único llamador que existe HOY sigue siendo
   * `ArchivosSala` para "archivos de interés", que nunca manda uno: un
   * archivo de interés es de la SALA, no de ninguna reunión en particular.
   * Este test ejercita esa acción de punta a punta —clic, título, elegir
   * archivo— para comprobar que sin `reunionId` en la llamada, `registrarArchivo`
   * (el colaborador real, `src/db/archivos.ts`) igual lo recibe explícito en
   * `null`, no `undefined` perdido por el camino ni ausente del todo.
   */
  it('un archivo de interés se registra con reunionId null: no es de ninguna reunión, es de la sala', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)
    const usuario = userEvent.setup()

    render(await invocar())

    await usuario.click(screen.getByRole('button', { name: 'Subir un archivo' }))
    await usuario.type(screen.getByLabelText('Título'), 'Catálogo 2026')

    const entradaArchivo = document.querySelector('input[type="file"]')
    if (!(entradaArchivo instanceof HTMLInputElement)) throw new Error('No se encontró el input de archivo.')
    const archivo = new File(['contenido'], 'catalogo.pdf', { type: 'application/pdf' })
    await usuario.upload(entradaArchivo, archivo)

    await waitFor(() => expect(registrarArchivoMock).toHaveBeenCalled())
    expect(registrarArchivoMock).toHaveBeenCalledWith(
      expect.objectContaining({ salaSlug: 'neracode', categoria: 'interes', reunionId: null }),
    )
  })
})

/**
 * TAREA 9b: "+ SUBIR PRESENTACIÓN" DE UNA REUNIÓN YA SUBE DE VERDAD.
 *
 * La Tarea 9 dejó `CarasDeReunion` pidiendo un `onSubirPresentacion`; la
 * Tarea 11 dejó `registrarArchivoAction` aceptando y reenviando `reunionId`.
 * `page.tsx:756` montaba `<ReunionesSala .../>` sin pasarle NADA de eso — el
 * botón se veía, se pulsaba, y no pasaba nada. Peor que "Sin presentación":
 * un lamento honesto contra una promesa rota.
 *
 * Prueba de punta a punta —clic en la fila ANTERIOR (no la destacada, que es
 * donde un cableado "siempre la primera reunión" se delataría), elegir
 * archivo, esperar la llamada real a `registrarArchivo` (mockeado arriba, en
 * `@/db/archivos`)— de que el archivo queda con el `reunionId` Y LA FECHA de
 * ESA reunión, no `null` y no el de la otra.
 */
describe('VistaSala (/cliente/[slug]) — "+ Subir presentación" de una reunión (ronda 10, tarea 9b)', () => {
  const REUNION_SIN_PRESENTACION_BASE = {
    tipo: 'mensual' as const, estado: 'dada' as const, noDadaEn: null, documentoListo: false, archivos: [], acuerdos: [],
  }
  const SALA_SIN_PRESENTACIONES: EstadoSala = {
    ...SALA_BASE,
    reuniones: [
      { ...REUNION_SIN_PRESENTACION_BASE, id: 'reunion-jul', fecha: '2026-07-15T10:00:00.000Z', titulo: 'Julio' },
      { ...REUNION_SIN_PRESENTACION_BASE, id: 'reunion-jun', fecha: '2026-06-15T10:00:00.000Z', titulo: 'Junio' },
    ],
  }

  it('el archivo se registra con el reunionId Y LA FECHA de la reunión desde la que se pulsó, no de otra ni null', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)
    estadoDeSalaMock.mockResolvedValueOnce(SALA_SIN_PRESENTACIONES)
    const usuario = userEvent.setup()

    render(await invocar())

    // Julio (más reciente) es la destacada; Junio es la fila anterior — el
    // segundo botón "+ Subir presentación" es el de Junio.
    const botones = screen.getAllByRole('button', { name: /subir presentación/i })
    expect(botones).toHaveLength(2)
    await usuario.click(botones[1])

    const entradaArchivo = document.querySelector('input[type="file"]')
    if (!(entradaArchivo instanceof HTMLInputElement)) throw new Error('No se encontró el input de archivo.')
    const archivo = new File(['contenido'], 'quincenal-junio.pdf', { type: 'application/pdf' })
    await usuario.upload(entradaArchivo, archivo)

    await waitFor(() => expect(registrarArchivoMock).toHaveBeenCalled())
    expect(registrarArchivoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        salaSlug: 'neracode',
        categoria: 'presentacion',
        reunionId: 'reunion-jun',
        fecha: new Date('2026-06-15T10:00:00.000Z'),
        nombreOriginal: 'quincenal-junio.pdf',
      }),
    )
  })
})

/**
 * EL ENLACE ⚙ A LOS AJUSTES DE LA SALA (ronda 10, añadido a la Tarea 9b).
 *
 * Franco, en la misma queja que originó la ronda: "además la sala debería
 * tener arriba un enlace para los ajustes de la misma sala". La Tarea 15
 * construyó `/cliente/[slug]/ajustes` con `exigirAdmin()` como primera
 * línea — ESA es la protección real. Este enlace es cortesía de interfaz:
 * solo se enseña a quien no le va a rebotar.
 */
describe('VistaSala (/cliente/[slug]) — el enlace ⚙ a los ajustes de la sala', () => {
  it('admin: ve el enlace a los ajustes de ESTA sala', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(true)

    render(await invocar())

    expect(screen.getByRole('link', { name: /ajustes/i })).toHaveAttribute('href', '/cliente/neracode/ajustes')
  })

  it('editor (equipo, no admin): NO ve el enlace — le rebotaría', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)

    render(await invocar())

    expect(screen.queryByRole('link', { name: /ajustes/i })).toBeNull()
  })

  it('director (ni equipo): tampoco lo ve', async () => {
    esLectorMock.mockResolvedValue(false)
    esAdminMock.mockResolvedValue(false)

    render(await invocar())

    expect(screen.queryByRole('link', { name: /ajustes/i })).toBeNull()
  })
})

/**
 * LA BARRA GLOBAL (`BarraNavegacion`) ES SOLO EQUIPO (ronda 11, enganche de
 * la tarea 2) — EL RIESGO CENTRAL DE ENGANCHARLA AQUÍ: a diferencia de las
 * otras siete pantallas que ya la montan, esta sala también la ve el
 * DIRECTOR de una UDN (sesión `rol: 'sala'`, `esLector()` → `false`).
 * `BarraNavegacion` no sabe de roles —nada en su contrato distingue equipo
 * de director, solo recibe `admin` para el gate de Clientes/Personas—, así
 * que sin el `{equipo && ...}` de `page.tsx` un director vería el menú
 * global entero: cinco enlaces que `puedeVerRuta` (lista blanca estricta,
 * `src/auth/politica.ts`) le va a negar a TODOS, más la insinuación de que
 * hay más app de la que le toca ver.
 *
 * Se detecta por el `aria-label` único del `<nav>` interno de
 * `BarraNavegacion` ("Secciones de Marketing Corp", ver
 * `BarraNavegacion.tsx`) — NO por el texto "Salir": esta misma pantalla ya
 * pinta un botón con ese nombre para el director (`salirDeLaSala`, línea
 * arriba), así que buscar por ese texto daría un falso positivo tanto si la
 * barra se monta como si no.
 */
describe('VistaSala (/cliente/[slug]) — BarraNavegacion es SOLO EQUIPO (ronda 11, enganche de la tarea 2)', () => {
  it('director de UDN (esLector false): NO ve el menú global — ninguna de las cinco pestañas, ni el resto de la app que no le toca', async () => {
    esLectorMock.mockResolvedValue(false)
    esAdminMock.mockResolvedValue(false)

    render(await invocar())

    expect(screen.queryByRole('navigation', { name: 'Secciones de Marketing Corp' })).not.toBeInTheDocument()
  })

  it('equipo (esLector true, cualquier rolApp): SÍ ve el menú global', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)

    render(await invocar())

    expect(screen.getByRole('navigation', { name: 'Secciones de Marketing Corp' })).toBeInTheDocument()
  })
})

/**
 * EL ACCESO DEL DIRECTOR (CLAVE + LINK FIRMADO) SE MUDÓ ENTERO A AJUSTES
 * (ronda 11, tarea 3 y tarea 4 — tarea 4 cierra el Crítico A de la auditoría
 * UX/UI). Franco, tarea 3: "dentro de un cliente (sala) el módulo de acceso
 * al director no debería vivir allí, debería estar en los ajustes de cada
 * sala".
 *
 * La tarea 3 solo mudó `ClaveDeSala` — el link firmado de 30 días
 * (`generarTokenDeSala`) se quedó aquí, en su propia tarjeta, TAMBIÉN
 * titulada "Acceso del director": dos secciones con el mismo nombre y
 * mecanismos distintos, en dos pantallas, que es justo lo que reportó la
 * auditoría (peor que el problema original). La tarea 4 termina la mudanza:
 * las DOS viven ahora juntas en `cliente/[slug]/ajustes/page.tsx`, bajo un
 * solo "Acceso del director" (ver su propio `page.test.ts`, describe "el
 * link firmado... se fusiona"). Aquí no queda nada de ninguna de las dos, ni
 * el import de `@/db/claves` (ya fuera desde la tarea 3) ni el de
 * `generarTokenDeSala`/`CopiarBoton`/`urlBase` (@/auth/sesion ya no expone
 * `generarTokenDeSala` en el mock de arriba — si esta página la importara de
 * nuevo, fallaría al llamarla, no en silencio).
 *
 * La sala NO se queda sin ninguna puerta al acceso del director: el enlace ⚙
 * a ajustes (describe de arriba) es la ÚNICA, y es intencional — Franco pidió
 * la sección entera adentro, no una copia repartida entre las dos pantallas.
 */
describe('VistaSala (/cliente/[slug]) — el acceso del director (clave + link firmado) se mudó ENTERO a ajustes (ronda 11, tarea 4)', () => {
  it('ya no ofrece generar ni quitar la clave desde la sala', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(true)

    render(await invocar())

    expect(screen.queryByRole('button', { name: /generar clave/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /quitar el acceso/i })).toBeNull()
    expect(screen.queryByText(/no tiene clave todavía/i)).toBeNull()
  })

  it('ya NO ofrece el link firmado de solo lectura: se fusionó con la clave en ajustes, no se quedó aquí', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(true)

    render(await invocar())

    expect(screen.queryByText(/link de solo lectura/i)).toBeNull()
  })

  it('no queda ningún rastro de la sección "Acceso del director" en la sala, para ningún rol', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(true)

    render(await invocar())

    expect(screen.queryByText('Acceso del director')).toBeNull()
  })
})

/**
 * HALLAZGO 1 DE LA REVISIÓN FINAL (ronda 10) — "Levantar minuta" volvió a
 * exigir papeleo, Y ES UNA REGRESIÓN DE LA LECCIÓN DE LA RONDA 4.
 *
 * `pendientesDeMinuta` llamaba a `sesionesMinutables` (dominio/salas.ts), cuyo
 * filtro `estado !== 'borrador' && estado !== 'agendada'` se escribió para el
 * viejo modelo de cinco estados (donde dejaba pasar `lista`/`presentada`/
 * `minutada`). Con `EstadoReunion = 'agendada' | 'dada'` (ronda 10) ese mismo
 * filtro pasó a significar SOLO 'dada' — justo lo contrario de lo que dice el
 * comentario de la función: "ahora se puede minutar cualquier sesión cuyo día
 * ya llegó... sea borrador, lista o presentada. Lo que NO se puede es minutar
 * algo que aún no ha pasado". De siete reuniones dadas en la base real solo
 * una se marcó a mano — exactamente el escenario que este test fija.
 *
 * El reemplazo, `reunionesMinutables` (dominio/reunion.ts, escrita en esta
 * misma ronda), usa el criterio correcto: `estado === 'dada' ||
 * tienePresentacion(r)` — una reunión maquetada (documento LISTO) cuenta,
 * aunque nadie la haya confirmado a mano.
 */
describe('VistaSala (/cliente/[slug]) — "Levantar minuta" no exige confirmar a mano (hallazgo 1)', () => {
  const REUNION_AGENDADA_MAQUETADA = {
    id: 'reunion-maquetada', titulo: 'Quincenal julio', fecha: '2026-07-15T10:00:00.000Z',
    tipo: 'mensual' as const, estado: 'agendada' as const, noDadaEn: null,
    documentoListo: true, archivos: [], acuerdos: [],
  }
  const REUNION_AGENDADA_SIN_RESPALDO = {
    id: 'reunion-sin-respaldo', titulo: 'Standup sin nada encima', fecha: '2026-07-10T10:00:00.000Z',
    tipo: 'mensual' as const, estado: 'agendada' as const, noDadaEn: null,
    documentoListo: false, archivos: [], acuerdos: [],
  }
  const SALA_CON_MAQUETADA_SIN_CONFIRMAR: EstadoSala = {
    ...SALA_BASE,
    reuniones: [REUNION_AGENDADA_MAQUETADA, REUNION_AGENDADA_SIN_RESPALDO],
  }

  it('una reunión maquetada (agendada, documento listo) cuyo día ya pasó SE PUEDE minutar sin confirmarla a mano', async () => {
    estadoDeSalaMock.mockResolvedValueOnce(SALA_CON_MAQUETADA_SIN_CONFIRMAR)
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)

    render(await invocar())

    const props = levantarMinutaPropsMock.mock.calls[0][0] as { sesiones: Array<{ id: string }> }
    expect(props.sesiones.map((s) => s.id)).toContain('reunion-maquetada')
  })

  it('una agendada SIN ningún respaldo no aparece: no hay nada que transcribir todavía', async () => {
    estadoDeSalaMock.mockResolvedValueOnce(SALA_CON_MAQUETADA_SIN_CONFIRMAR)
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)

    render(await invocar())

    const props = levantarMinutaPropsMock.mock.calls[0][0] as { sesiones: Array<{ id: string }> }
    expect(props.sesiones.map((s) => s.id)).not.toContain('reunion-sin-respaldo')
  })
})

/**
 * HALLAZGO 2 DE LA REVISIÓN FINAL (ronda 10) — la misma reunión salía a la
 * vez en "En preparación" (arriba, "Seguir editando →") y en "Por confirmar"
 * (abajo, "¿se dio?"). El filtro de `enPreparacion` perdió su segunda mitad
 * al migrar de sesión a reunión: antes excluía lo que la deducción de
 * `fueDada` ya contaba como dado; ahora es `estado === 'agendada'` a secas.
 *
 * Este test fija la mitad que faltaba: `estado === 'agendada' && !fueDada(...)`.
 */
describe('VistaSala (/cliente/[slug]) — "En preparación" no duplica lo que ya se cuenta como dado (hallazgo 2)', () => {
  const REUNION_AGENDADA_MAQUETADA = {
    id: 'reunion-maquetada', titulo: 'Quincenal julio', fecha: '2026-07-15T10:00:00.000Z',
    tipo: 'mensual' as const, estado: 'agendada' as const, noDadaEn: null,
    documentoListo: true, archivos: [], acuerdos: [],
  }
  const REUNION_AGENDADA_SIN_RESPALDO = {
    id: 'reunion-sin-respaldo', titulo: 'Standup sin nada encima', fecha: '2026-07-10T10:00:00.000Z',
    tipo: 'mensual' as const, estado: 'agendada' as const, noDadaEn: null,
    documentoListo: false, archivos: [], acuerdos: [],
  }
  const SALA_MIXTA: EstadoSala = {
    ...SALA_BASE,
    reuniones: [REUNION_AGENDADA_MAQUETADA, REUNION_AGENDADA_SIN_RESPALDO],
  }

  it('una agendada ya deducible como dada (con respaldo, día pasado) NO sale en "en preparación"', async () => {
    estadoDeSalaMock.mockResolvedValueOnce(SALA_MIXTA)
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)

    render(await invocar())

    expect(
      screen.queryByRole('link', { name: /Quincenal julio[\s\S]*Seguir editando/i }),
    ).not.toBeInTheDocument()
  })

  it('una agendada SIN respaldo todavía sigue en "en preparación": de esa sí falta todo', async () => {
    estadoDeSalaMock.mockResolvedValueOnce(SALA_MIXTA)
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)

    render(await invocar())

    expect(
      screen.getByRole('link', { name: /Standup sin nada encima[\s\S]*Seguir editando/i }),
    ).toBeInTheDocument()
  })
})

/**
 * HALLAZGO 4a DE LA REVISIÓN FINAL (ronda 10) — `registrarArchivoAction`
 * aceptaba `datos.reunionId` crudo del cliente sin comprobar que esa reunión
 * fuera de ESTA sala. `puedeVerlo` (`src/app/api/archivo/[id]/route.ts`) da
 * prioridad a `reunionId` sobre `salaSlug` al decidir quién puede LEER el
 * archivo después: un archivo registrado bajo la sala A pero apuntando a una
 * reunión de la sala B lo leería el director de B. Hoy no es explotable por
 * la UI (que nunca cruza salas — de ahí que este test invoque la acción
 * DIRECTO, con un dato que la UI real jamás produciría), pero el endpoint
 * tiene que rechazarlo por su cuenta: esconder el botón no protege la acción.
 */
describe('VistaSala (/cliente/[slug]) — registrarArchivoAction valida que la reunión sea de ESTA sala (hallazgo 4a)', () => {
  async function accionCapturada() {
    render(await invocar())
    const props = reunionesSalaPropsMock.mock.calls[0][0] as {
      registrarArchivoAction: (datos: {
        categoria: 'presentacion'
        titulo: string
        fecha: string | null
        ruta: string
        nombreOriginal: string
        tipoContenido: string | null
        tamanoBytes: number | null
        reunionId?: string | null
      }) => Promise<{ error?: string }>
    }
    return props.registrarArchivoAction
  }

  const DATOS_ARCHIVO = {
    categoria: 'presentacion' as const,
    titulo: 'Estatus de otra sala',
    fecha: null,
    ruta: 'salas/mexa-creativa/presentacion/archivo.pdf',
    nombreOriginal: 'archivo.pdf',
    tipoContenido: 'application/pdf',
    tamanoBytes: 100,
  }

  it('un reunionId de OTRA sala se rechaza: no se registra el archivo', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)
    obtenerReunionMock.mockResolvedValue({ salaSlug: 'mexa-creativa' })

    const registrarArchivoAction = await accionCapturada()
    const resultado = await registrarArchivoAction({ ...DATOS_ARCHIVO, reunionId: 'reunion-de-mexa-creativa' })

    expect(resultado.error).toBeTruthy()
    expect(registrarArchivoMock).not.toHaveBeenCalled()
  })

  it('una reunión que ya no existe (obtenerReunion → null) también se rechaza', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)
    obtenerReunionMock.mockResolvedValue(null)

    const registrarArchivoAction = await accionCapturada()
    const resultado = await registrarArchivoAction({ ...DATOS_ARCHIVO, reunionId: 'reunion-borrada' })

    expect(resultado.error).toBeTruthy()
    expect(registrarArchivoMock).not.toHaveBeenCalled()
  })

  it('un reunionId de ESTA MISMA sala se acepta con normalidad', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)
    obtenerReunionMock.mockResolvedValue({ salaSlug: 'neracode' })

    const registrarArchivoAction = await accionCapturada()
    const resultado = await registrarArchivoAction({ ...DATOS_ARCHIVO, reunionId: 'reunion-de-neracode' })

    expect(resultado.error).toBeUndefined()
    expect(registrarArchivoMock).toHaveBeenCalledWith(
      expect.objectContaining({ salaSlug: 'neracode', reunionId: 'reunion-de-neracode' }),
    )
  })

  it('sin reunionId (archivo de sala, no de una reunión) no llama a obtenerReunion: no hay nada que validar', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)

    const registrarArchivoAction = await accionCapturada()
    await registrarArchivoAction({ ...DATOS_ARCHIVO, reunionId: null })

    expect(obtenerReunionMock).not.toHaveBeenCalled()
    expect(registrarArchivoMock).toHaveBeenCalled()
  })
})

/**
 * EDITAR EL TÍTULO DE UN ARCHIVO DESDE LA REUNIÓN (ronda 11, tarea 3, paso
 * 3). Franco: "una vez cargado un archivo como una presentación debería
 * poder editar el nombre con el que se ve en el front". `editarArchivoAction`
 * YA EXISTÍA (la usa `ArchivosSala` para los archivos de interés) — lo que
 * faltaba era pasársela también a `ReunionesSala`, que es quien la reenvía a
 * `CarasDeReunion` (ver su propio test). Se reutiliza LA MISMA acción, no una
 * copia: por eso este describe comprueba, de punta a punta, que la instancia
 * capturada vía `reunionesSalaPropsMock` (el mismo doble que ya usa el
 * describe de "hallazgo 4a", arriba) es de verdad `editarArchivoAction` y no
 * un valor inerte — si `page.tsx` la olvidara al armar `<ReunionesSala>`,
 * este describe se caería.
 *
 * NUNCA MANDA `fecha`: `CaraArchivo` (dominio/reunion.ts) no la trae —la
 * fecha de un archivo de reunión es la de SU reunión, no una propia— y
 * `editarArchivo` (`src/db/archivos.ts`) trata `fecha: null` como "bórrala".
 * `editarArchivoAction` amplía su firma para aceptar `cambios.fecha` como
 * OPCIONAL (antes era obligatorio): con ella ausente, no se le pasa la
 * clave `fecha` en absoluto a `editarArchivo`, así que la fecha existente del
 * archivo —fijada al subirlo desde la reunión— no se toca. El camino viejo
 * de `ArchivosSala` (que sí manda `fecha` siempre, incluso `null` cuando no
 * aplica) se comprueba aparte para no quedar roto por la ampliación.
 */
describe('VistaSala (/cliente/[slug]) — editar el título de un archivo desde la reunión (ronda 11, tarea 3)', () => {
  async function editarArchivoActionCapturada() {
    render(await invocar())
    const props = reunionesSalaPropsMock.mock.calls[0][0] as {
      editarArchivoAction?: (id: string, cambios: { titulo: string; fecha?: string | null }) => Promise<void>
    }
    return props.editarArchivoAction
  }

  it('editarArchivoAction se pasa a ReunionesSala: no queda huérfana la Tarea 9/11 sin cablear otra vez', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)

    const editarArchivoAction = await editarArchivoActionCapturada()

    expect(typeof editarArchivoAction).toBe('function')
  })

  it('exige editor por su cuenta y llama a editarArchivo con el título, SIN mandar fecha', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)

    const editarArchivoAction = await editarArchivoActionCapturada()
    await editarArchivoAction!('archivo-de-reunion', { titulo: 'Estatus RL — agosto final' })

    expect(exigirEditorMock).toHaveBeenCalled()
    expect(editarArchivoMock).toHaveBeenCalledTimes(1)
    const [id, cambios] = editarArchivoMock.mock.calls[0]
    expect(id).toBe('archivo-de-reunion')
    expect(cambios).toEqual({ titulo: 'Estatus RL — agosto final' })
    expect(Object.prototype.hasOwnProperty.call(cambios, 'fecha')).toBe(false)
  })

  it('el camino de ArchivosSala (con fecha explícita) se conserva igual: ampliar el tipo no lo rompió', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)

    const editarArchivoAction = await editarArchivoActionCapturada()
    await editarArchivoAction!('archivo-de-interes', { titulo: 'Catálogo 2026', fecha: '2026-08-01' })

    expect(editarArchivoMock).toHaveBeenCalledWith('archivo-de-interes', {
      titulo: 'Catálogo 2026',
      fecha: new Date('2026-08-01'),
    })
  })

  it('con fecha: null explícito (ArchivosSala sin fecha propia) se sigue borrando a propósito', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)

    const editarArchivoAction = await editarArchivoActionCapturada()
    await editarArchivoAction!('archivo-de-interes', { titulo: 'Catálogo 2026', fecha: null })

    expect(editarArchivoMock).toHaveBeenCalledWith('archivo-de-interes', { titulo: 'Catálogo 2026', fecha: null })
  })
})

/**
 * CREARSESIONACTION REENVÍA EL TÍTULO, NO LO MANDA FIJO EN BLANCO (deuda
 * menor, cierre de ronda) — el tercero de tres formularios que mandaban el
 * título vacío. `AgendarRapido` (Home) y `deck/nueva` ya reenviaban
 * `datos.titulo` a `crearReunionConDocumento`; este atajo ("Preparar una
 * presentación nueva", dentro de la propia sala) seguía mandando `titulo: ''`
 * FIJO, sin mirar lo que el cliente hubiera mandado — el bug original exacto
 * era ese: el campo podía existir en el formulario y la acción lo ignoraba de
 * todos modos.
 *
 * `crearReunionConDocumentoMock` se hace RECHAZAR a propósito en los dos
 * tests: `crearSesionAction` llama a `crearReunionConDocumento` ANTES del
 * `redirect()` final, así que el rechazo dispara el `catch` de la acción (que
 * devuelve `{ error }`) y la ejecución nunca llega a `redirect()` — evita
 * depender de la implementación real de `next/navigation` (deliberadamente
 * NO mockeada en este archivo — ver el comentario junto a `vi.mock('next/
 * navigation', ...)`, arriba, "ningún escenario de este archivo llega a
 * dispararlos") solo para un test que no necesita llegar tan lejos: lo único
 * que importa aquí es CON QUÉ se llamó a `crearReunionConDocumento`. El
 * `resultado.error` que se comprueba al final es la prueba de que, en
 * efecto, ninguno de los dos tests rozó el `redirect()` real.
 */
describe('VistaSala (/cliente/[slug]) — crearSesionAction reenvía el título, no lo manda fijo en blanco (deuda menor)', () => {
  async function crearActionCapturada() {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)
    render(await invocar())
    const props = nuevaSesionSalaPropsMock.mock.calls[0][0] as {
      crearAction: (datos: { plantilla: string; dia: string; titulo: string }) => Promise<{ error?: string }>
    }
    return props.crearAction
  }

  const CORTE_DE_PRUEBA = 'corte de prueba: no interesa llegar al redirect'

  it('un título escrito viaja tal cual a crearReunionConDocumento — antes se mandaba \'\' fijo, ignorando el campo', async () => {
    crearReunionConDocumentoMock.mockRejectedValueOnce(new Error(CORTE_DE_PRUEBA))
    const crearAction = await crearActionCapturada()

    const resultado = await crearAction({
      plantilla: PLANTILLAS[0].id, dia: '2026-08-19', titulo: 'Research Land — Comercial',
    })

    expect(crearReunionConDocumentoMock).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Research Land — Comercial' }),
    )
    expect(resultado.error).toBe(CORTE_DE_PRUEBA)
  })

  it('con el campo vacío, se reenvía tal cual (crearReunionConDocumento decide el default) — no se ignora ni se sustituye', async () => {
    crearReunionConDocumentoMock.mockRejectedValueOnce(new Error(CORTE_DE_PRUEBA))
    const crearAction = await crearActionCapturada()

    const resultado = await crearAction({ plantilla: PLANTILLAS[0].id, dia: '2026-08-19', titulo: '' })

    expect(crearReunionConDocumentoMock).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: '' }),
    )
    expect(resultado.error).toBe(CORTE_DE_PRUEBA)
  })
})
