import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createElement } from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { EstadoSala } from '@/dominio/salas'
import { PLANTILLAS } from '@/secciones/plantillas'
import { diaCivil } from '@/lib/fecha'

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

// Con nombre: el describe de "corregir un acuerdo" comprueba que el cambio
// se propaga a las CUATRO pantallas donde ese acuerdo puede estar.
const revalidatePathMock = vi.fn()
vi.mock('next/cache', () => ({ revalidatePath: (...args: unknown[]) => revalidatePathMock(...args) }))

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

/** La marca mínima que esta pantalla necesita para vestirse. */
const TEMA_BASE = { nombre: 'NeraCode', primario: '#101010', gradiente: ['#101010', '#202020'] }
/**
 * Reconfigurable por test (mismo patrón que `estadoDeSalaMock`): hace falta
 * para el módulo de Data & Analytics, cuya URL vive en el TEMA de la sala
 * (`salas.analytics_url`) y no en su estado.
 */
const cargarTemasMock = vi.fn()
vi.mock('@/db/temas', () => ({
  cargarTemas: () => cargarTemasMock(),
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

const editarAcuerdoMock = vi.fn()
const crearAcuerdoMock = vi.fn()
const salaDeAcuerdoMock = vi.fn()
vi.mock('@/db/acuerdos', () => ({
  moverEstatus: vi.fn(),
  editarAcuerdo: (...args: unknown[]) => editarAcuerdoMock(...args),
  // Con nombre desde la ronda 14, tarea 2 (ronda de arreglo): el describe de
  // "la fecha compromiso no se corre un día" comprueba CON QUÉ `Date` se
  // llamó `crearAcuerdo` — antes bastaba con que se llamara, un `vi.fn()`
  // anónimo no lo permite.
  crearAcuerdo: (...args: unknown[]) => crearAcuerdoMock(...args),
  eliminarAcuerdo: vi.fn(),
  // De qué sala es un acuerdo: lo pregunta la acción de corregir, para
  // rechazar el id de otro cliente.
  salaDeAcuerdo: (...args: unknown[]) => salaDeAcuerdoMock(...args),
  refrescarDesdeMonday: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/db/personas', () => ({
  directorio: vi.fn().mockResolvedValue([]),
  genteParaResponsable: vi.fn().mockResolvedValue([]),
  PREFIJO_APP: 'app:',
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
  puedeVerEstaSala: vi.fn().mockResolvedValue(true),
  cerrarSesion: vi.fn(),
  // Quién mira: decide si se le ofrece "Salir" — ver `conSesion` en la
  // página. Por defecto, nadie (el caso mayoritario desde que la sala es
  // pública: el enlace que se comparte con las UDNs).
  sesionActual: () => sesionActualMock(),
}))
const sesionActualMock = vi.fn().mockResolvedValue(null)

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
  eliminarReunion: vi.fn(),
  obtenerReunion: (...args: unknown[]) => obtenerReunionMock(...args),
  // Con nombre (no un `vi.fn()` anónimo): el describe de "crear una reunión"
  // (más abajo) comprueba CON QUÉ se llamó — el bug original era que la
  // acción mandaba el título `''` fijo, ignorando el campo.
  crearReunion: (...args: unknown[]) => crearReunionMock(...args),
}))
const crearReunionMock = vi.fn()

const crearReunionConDocumentoMock = vi.fn()
vi.mock('@/db/documentos', () => ({
  crearReunionConDocumento: (...args: unknown[]) => crearReunionConDocumentoMock(...args),
  documentoDeReunion: vi.fn().mockResolvedValue(null),
  eliminarDocumentoDeReunion: vi.fn(),
  // El de verdad, no un doble: la acción lo usa para que una reunión sin
  // título escrito no nazca con el nombre en blanco, y este test comprueba
  // justo eso — doblarlo lo dejaría sin comprobar nada.
  tituloPorDefecto: (tipo: string, fecha: Date) =>
    `Estatus ${tipo} · ${fecha.toISOString().slice(0, 10)}`,
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
/**
 * `EditarAcuerdo` se envuelve para poder llamar su Server Action DIRECTO: el
 * gate de quién puede corregir un acuerdo publicado vive en la acción, no en
 * si el botón se pinta (esconder un botón no protege un endpoint).
 */
const editarAcuerdoPropsMock = vi.fn()
vi.mock('@/componentes/EditarAcuerdo', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('@/componentes/EditarAcuerdo')>()
  return {
    ...real,
    EditarAcuerdo: (props: Parameters<typeof real.EditarAcuerdo>[0]) => {
      editarAcuerdoPropsMock(props)
      return createElement(real.EditarAcuerdo, props)
    },
  }
})

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
const esEditorMock = vi.fn().mockResolvedValue(true)
vi.mock('@/auth/roles', () => ({
  esAdmin: () => esAdminMock(),
  esLector: () => esLectorMock(),
  // Quién edita los acuerdos desde el 12-ago: el equipo con permiso de
  // escritura, no el director de la UDN (ver `acuerdos-permisos.test.ts`).
  esEditor: () => esEditorMock(),
  exigirAdmin: vi.fn(),
  exigirEditor: (...args: unknown[]) => exigirEditorMock(...args),
}))

const { default: VistaSala } = await import('./page')

beforeEach(() => {
  vi.clearAllMocks()
  // Default para todo el archivo: la sala sin reuniones. El bloque de
  // participación lo pisa puntualmente con `mockResolvedValueOnce`.
  estadoDeSalaMock.mockResolvedValue(SALA_BASE)
  // Sin `analyticsUrl`: el módulo de Data & Analytics no existe salvo que un
  // test lo pida, que es exactamente su comportamiento en producción.
  cargarTemasMock.mockResolvedValue({ neracode: TEMA_BASE })
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

  /**
   * DOS MÓDULOS DE MATERIAL, no uno. "Archivos de interés" se renombró a
   * "Materiales Comerciales" cuando dejó de contener solo archivos; Franco
   * pidió después recuperar el de interés al lado, para lo que no es material
   * de venta. Son dos secciones con la misma mecánica y contenido distinto.
   */
  it('la sala pinta los dos módulos de material, en orden: primero el comercial', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)

    const { container } = render(await invocar())

    const comercial = screen.getByText(/materiales comerciales/i)
    const interes = screen.getByText(/archivos de interés/i)
    expect(comercial).toBeInTheDocument()
    expect(interes).toBeInTheDocument()
    // El comercial va primero: es el que se abre antes de una reunión.
    // `h2, summary`: los módulos se volvieron plegables en la ronda 12
    // (Franco: *"los módulos todos deben tener la opción de colapsarse"*) y
    // una sección plegable titula con `<summary>`, no con `<h2>`.
    const titulos = [...container.querySelectorAll<HTMLElement>('h2, summary')]
    expect(titulos.indexOf(comercial)).toBeLessThan(titulos.indexOf(interes))
  })

  /**
   * CADA MÓDULO TIENE SU PROPIA ACCIÓN Y SU CATEGORÍA FIJADA EN EL SERVIDOR.
   * Si la categoría viajara desde el navegador, quien conociera el endpoint
   * podría escribir en cualquiera — incluida `evidencia`, que tiene reglas
   * propias, o `presentacion`, que ordena la línea de tiempo de la sala.
   */
  it('el módulo de interés registra en su categoría, no en la comercial', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)
    const usuario = userEvent.setup()

    render(await invocar())

    await usuario.click(screen.getByRole('button', { name: '+ Añadir archivo' }))
    await usuario.type(screen.getByLabelText('Título'), 'Estudio de categoría')

    const entradas = document.querySelectorAll<HTMLInputElement>('input[type="file"]:not([aria-hidden])')
    const entrada = entradas[entradas.length - 1]
    if (!entrada) throw new Error('No se encontró el input de archivo del módulo.')
    await usuario.upload(entrada, new File(['x'], 'estudio.pdf', { type: 'application/pdf' }))

    await waitFor(() => expect(registrarArchivoMock).toHaveBeenCalled())
    expect(registrarArchivoMock).toHaveBeenCalledWith(
      expect.objectContaining({ salaSlug: 'neracode', categoria: 'interes', reunionId: null }),
    )
  })

  /**
   * `registrarArchivoAction` ACEPTA Y PASA `reunionId` (para la Tarea 9,
   * `CarasDeReunion`) — pero el único llamador que existe HOY sigue siendo
   * `AnadirMaterial` para los Materiales Comerciales, que nunca manda uno:
   * un material es de la SALA, no de ninguna reunión en particular.
   * Este test ejercita esa acción de punta a punta —clic, título, elegir
   * archivo— para comprobar que sin `reunionId` en la llamada, `registrarArchivo`
   * (el colaborador real, `src/db/archivos.ts`) igual lo recibe explícito en
   * `null`, no `undefined` perdido por el camino ni ausente del todo.
   */
  it('un material comercial se registra con reunionId null: no es de ninguna reunión, es de la sala', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)
    const usuario = userEvent.setup()

    render(await invocar())

    await usuario.click(screen.getByRole('button', { name: '+ Añadir material' }))
    await usuario.type(screen.getByLabelText('Título'), 'Catálogo 2026')

    // EL ÚLTIMO, no el primero: el módulo de reuniones tiene su propio
    // `input[type=file]` oculto y compartido, y va antes en el documento.
    const entradas = document.querySelectorAll<HTMLInputElement>('input[type="file"]:not([aria-hidden])')
    const entradaArchivo = entradas[entradas.length - 1]
    if (!entradaArchivo) throw new Error('No se encontró el input de archivo del módulo.')
    const archivo = new File(['contenido'], 'catalogo.pdf', { type: 'application/pdf' })
    await usuario.upload(entradaArchivo, archivo)

    await waitFor(() => expect(registrarArchivoMock).toHaveBeenCalled())
    expect(registrarArchivoMock).toHaveBeenCalledWith(
      expect.objectContaining({ salaSlug: 'neracode', categoria: 'comercial', reunionId: null }),
    )
  })

  /**
   * UN MATERIAL PUEDE SER UN ENLACE, no solo un fichero subido.
   *
   * Franco: "aquí no solo la UDN tienen PPT, o PDF, también puede ser un
   * video de YouTube o link de interés". El camino del enlace no pasa por
   * Blob —no hay binario— así que llega a `registrarArchivo` con `enlace` y
   * SIN `ruta`: es justo la combinación que la comprobación de esa función
   * exige, y la que este test fija.
   */
  it('un enlace se guarda como material, con enlace y sin ruta', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)
    const usuario = userEvent.setup()

    render(await invocar())

    await usuario.click(screen.getByRole('button', { name: '+ Añadir material' }))
    await usuario.click(screen.getByRole('button', { name: 'Un enlace o vídeo' }))
    await usuario.type(screen.getByLabelText('Título'), 'Caso Grupo Modelo')
    await usuario.type(screen.getByLabelText('Enlace'), 'https://youtu.be/dQw4w9WgXcQ')
    await usuario.click(screen.getByRole('button', { name: 'Guardar el enlace' }))

    await waitFor(() => expect(registrarArchivoMock).toHaveBeenCalled())
    expect(registrarArchivoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        salaSlug: 'neracode',
        categoria: 'comercial',
        titulo: 'Caso Grupo Modelo',
        enlace: 'https://youtu.be/dQw4w9WgXcQ',
      }),
    )
    // Sin `ruta`: no hay fichero. Es lo que distingue los dos caminos.
    expect(registrarArchivoMock.mock.calls[0][0].ruta).toBeUndefined()
  })

  /**
   * LA COMPROBACIÓN DEL ENLACE VUELVE A CORRER EN EL SERVIDOR.
   *
   * El cliente ya normaliza, pero eso es comodidad: un `javascript:` que
   * llegara a la base acabaría en un href que ve el director de la UDN. La
   * Server Action rechaza antes de tocar `registrarArchivo`.
   */
  it('un esquema que no es http(s) no llega nunca a la base', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)
    const usuario = userEvent.setup()

    render(await invocar())

    await usuario.click(screen.getByRole('button', { name: '+ Añadir material' }))
    await usuario.click(screen.getByRole('button', { name: 'Un enlace o vídeo' }))
    await usuario.type(screen.getByLabelText('Título'), 'Malicioso')
    await usuario.type(screen.getByLabelText('Enlace'), 'javascript:alert(1)')
    await usuario.click(screen.getByRole('button', { name: 'Guardar el enlace' }))

    expect(registrarArchivoMock).not.toHaveBeenCalled()
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
 * UNA REUNIÓN, UN SOLO SITIO (Franco: *"sigue estando rara la lógica en el
 * módulo de reuniones dentro de la sala… mejora la lógica entre
 * presentaciones, minutas y reuniones"*).
 *
 * La sala repartía la MISMA reunión en tres bloques que no se hablaban entre
 * ellos: una tira de "en preparación" arriba, la lista de reuniones en medio
 * y "por confirmar" abajo. El hallazgo 2 de la ronda 10 ya había parcheado
 * una de las duplicaciones con un filtro (`estado === 'agendada' &&
 * !fueDada(...)`), pero el problema era estructural y volvió por otro lado: al
 * DESCARTAR una presentación, la reunión se quedaba sin documento y la tira
 * seguía ofreciendo "Seguir editando · 0 de 0 secciones".
 *
 * Ahora la frontera es una sola —si su día ya pasó— y las dos listas son
 * complementarias por construcción (`historialDeReuniones` = lo que NO está
 * por venir), así que la duplicación no puede volver por ningún filtro nuevo.
 */
describe('VistaSala (/cliente/[slug]) — cada reunión aparece en un solo bloque', () => {
  const PASADA_MAQUETADA = {
    id: 'reunion-maquetada', titulo: 'Quincenal julio', fecha: '2026-07-15T10:00:00.000Z',
    tipo: 'mensual' as const, estado: 'agendada' as const, noDadaEn: null,
    documentoListo: true, archivos: [], acuerdos: [],
  }
  const PASADA_SIN_RESPALDO = {
    id: 'reunion-sin-respaldo', titulo: 'Standup sin nada encima', fecha: '2026-07-10T10:00:00.000Z',
    tipo: 'mensual' as const, estado: 'agendada' as const, noDadaEn: null,
    documentoListo: false, archivos: [], acuerdos: [],
  }
  /** Dentro de tres años: no hay "hoy" que la deje atrás. */
  const FUTURA_SIN_DOCUMENTO = {
    id: 'reunion-futura', titulo: 'La que viene sin nada', fecha: '2029-07-10T10:00:00.000Z',
    tipo: 'mensual' as const, estado: 'agendada' as const, noDadaEn: null,
    documentoListo: false, archivos: [], acuerdos: [],
  }

  it('lo que ya pasó NO se ofrece para seguir editando, tenga respaldo o no', async () => {
    estadoDeSalaMock.mockResolvedValueOnce({
      ...SALA_BASE, reuniones: [PASADA_MAQUETADA, PASADA_SIN_RESPALDO],
    })
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)

    render(await invocar())

    expect(screen.queryByText(/seguir editando/i)).not.toBeInTheDocument()
    // Pero siguen estando: en el historial, con su título. (`getAllBy`: la
    // destacada lo pinta como encabezado y el selector de minuta lo repite.)
    expect(screen.getAllByText('Quincenal julio').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Standup sin nada encima').length).toBeGreaterThan(0)
  })

  /**
   * EL BUG QUE REPORTÓ FRANCO. Descartó la presentación de una reunión —lo
   * que borra el documento y deja la junta en el calendario— y la sala siguió
   * ofreciéndole seguir editando algo que ya no existía.
   */
  it('una reunión por venir SIN documento ofrece las dos vías, no "seguir editando"', async () => {
    estadoDeSalaMock.mockResolvedValueOnce({ ...SALA_BASE, reuniones: [FUTURA_SIN_DOCUMENTO] })
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)

    render(await invocar())

    expect(screen.getByText('La que viene sin nada')).toBeInTheDocument()
    expect(screen.queryByText(/seguir editando/i)).not.toBeInTheDocument()
    expect(screen.getByText(/sin presentación todavía/i)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /armarla en el editor/i }).length).toBeGreaterThan(0)
  })

  /**
   * Y NO SE ROTULA "LA ÚLTIMA": el historial ordena por fecha y toma la
   * primera, así que sin esta separación una junta futura salía anunciada
   * como la última que se dio.
   */
  it('una reunión por venir no entra al historial ni se anuncia como "La última"', async () => {
    estadoDeSalaMock.mockResolvedValueOnce({
      ...SALA_BASE, reuniones: [FUTURA_SIN_DOCUMENTO, PASADA_MAQUETADA],
    })
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)

    render(await invocar())

    // "La última" existe, y es la pasada — no la de dentro de tres años.
    const destacada = screen.getByText('La última').closest('div')?.parentElement?.parentElement
    expect(destacada?.textContent).toContain('Quincenal julio')
    expect(destacada?.textContent).not.toContain('La que viene sin nada')
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
describe('VistaSala (/cliente/[slug]) — crear una reunión no crea su presentación', () => {
  async function crearActionCapturada() {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)
    render(await invocar())
    const props = nuevaSesionSalaPropsMock.mock.calls[0][0] as {
      crearAction: (datos: { plantilla: string; dia: string; titulo: string }) => Promise<{ error?: string }>
    }
    return props.crearAction
  }

  /**
   * EL CAMBIO QUE PIDIÓ FRANCO: *"aparece un botón que dice crear
   * presentación y debería ser crear reunión; una vez que la creo debo
   * decidir si la creo con el editor de presentaciones o cargar un archivo ya
   * creado"*.
   *
   * La acción llamaba a `crearReunionConDocumento` y terminaba en
   * `redirect(/deck/<id>)`: agendar la junta y empezar su deck eran el mismo
   * gesto. Quien ya tenía la presentación hecha acababa igual en el editor,
   * con ocho secciones vacías que nadie iba a llenar.
   */
  it('crea SOLO la reunión: no toca el documento', async () => {
    crearReunionMock.mockResolvedValueOnce({ id: 'r-nueva' })
    const crearAction = await crearActionCapturada()

    const resultado = await crearAction({
      plantilla: PLANTILLAS[0].id, dia: '2026-08-19', titulo: 'Research Land — Comercial',
    })

    expect(crearReunionMock).toHaveBeenCalledTimes(1)
    expect(crearReunionConDocumentoMock).not.toHaveBeenCalled()
    expect(resultado.error).toBeUndefined()
  })

  /** La plantilla elegida se guarda en la reunión y espera al editor. */
  it('la reunión recuerda qué clase de junta es', async () => {
    crearReunionMock.mockResolvedValueOnce({ id: 'r-nueva' })
    const crearAction = await crearActionCapturada()

    await crearAction({ plantilla: PLANTILLAS[1].id, dia: '2026-08-19', titulo: 'Comité' })

    expect(crearReunionMock).toHaveBeenCalledWith(
      expect.objectContaining({ plantilla: PLANTILLAS[1].id, salaSlug: 'neracode' }),
    )
  })

  it('un título escrito viaja tal cual', async () => {
    crearReunionMock.mockResolvedValueOnce({ id: 'r-nueva' })
    const crearAction = await crearActionCapturada()

    await crearAction({
      plantilla: PLANTILLAS[0].id, dia: '2026-08-19', titulo: 'Research Land — Comercial',
    })

    expect(crearReunionMock).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Research Land — Comercial' }),
    )
  })

  /**
   * Con el campo vacío el título lo resuelve el SERVIDOR y nunca llega vacío
   * a la base: antes lo hacía `crearReunionConDocumento` por dentro, y al
   * dejar de usarla había que reponerlo aquí o las reuniones nacerían sin
   * nombre.
   */
  it('con el campo vacío, el servidor pone un título legible — nunca uno en blanco', async () => {
    crearReunionMock.mockResolvedValueOnce({ id: 'r-nueva' })
    const crearAction = await crearActionCapturada()

    await crearAction({ plantilla: PLANTILLAS[0].id, dia: '2026-08-19', titulo: '' })

    const enviado = crearReunionMock.mock.calls.at(-1)?.[0] as { titulo: string }
    expect(enviado.titulo.trim().length).toBeGreaterThan(0)
  })

  it('una plantilla que no existe se rechaza sin tocar la base', async () => {
    const crearAction = await crearActionCapturada()
    crearReunionMock.mockClear()

    const resultado = await crearAction({ plantilla: 'inventada', dia: '2026-08-19', titulo: 'x' })

    expect(resultado.error).toMatch(/plantilla/i)
    expect(crearReunionMock).not.toHaveBeenCalled()
  })
})

/**
 * CORREGIR UN ACUERDO YA PUBLICADO.
 *
 * Franco preguntó *"¿cómo hago para editar un acuerdo ya publicado?"* y la
 * respuesta era: no se podía. El texto solo se editaba en la bandeja y solo
 * mientras el acuerdo seguía `pendiente`; una vez en la sala, ante una errata
 * la única salida era borrarlo y crearlo de nuevo.
 *
 * Y lo que fija este describe sobre todo es el CANDADO, que Franco pidió
 * explícito: *"solo el admin y editores pueden hacer cambios en los acuerdos
 * ya publicados"*.
 */
describe('VistaSala (/cliente/[slug]) — corregir un acuerdo publicado', () => {
  const CON_ACUERDO: EstadoSala = {
    ...SALA_BASE,
    acuerdos: [{
      id: 'ac-1', que: 'Mandar el reporte', responsable: 'Ana', estatus: 'abierto',
      fechaCompromiso: null, destacado: false,
    } as EstadoSala['acuerdos'][number]],
  }

  async function accionCapturada() {
    // Por defecto el acuerdo es de esta sala; el test del id ajeno lo cambia.
    salaDeAcuerdoMock.mockResolvedValue('neracode')
    estadoDeSalaMock.mockResolvedValueOnce(CON_ACUERDO)
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)
    render(await invocar())
    const props = editarAcuerdoPropsMock.mock.calls[0][0] as {
      editarAction: (
        id: string,
        cambios: { que: string; responsable: string; responsableMondayId: string | null },
      ) => Promise<{ error?: string }>
    }
    return props.editarAction
  }

  it('el lápiz solo se ofrece al equipo, no al director de la UDN', async () => {
    estadoDeSalaMock.mockResolvedValueOnce(CON_ACUERDO)
    esLectorMock.mockResolvedValue(false) // el director
    esAdminMock.mockResolvedValue(false)

    render(await invocar())

    expect(editarAcuerdoPropsMock).not.toHaveBeenCalled()
  })

  /**
   * EL GATE QUE CUENTA: `exigirEditor()`. Hasta el 12-ago convivía con
   * `exigirEdicionDeAcuerdos(slug)`, que dejaba pasar al director de la UDN
   * para SU sala y era la que usaban mover estatus y fecha; se retiró al
   * cerrar la vista compartida en solo lectura, así que hoy las cuatro
   * acciones de acuerdos exigen lo mismo.
   */
  it('la acción exige editor, no el permiso de acuerdos del director', async () => {
    const editar = await accionCapturada()
    exigirEditorMock.mockClear()

    await editar('ac-1', { que: 'Mandar el reporte corregido', responsable: 'Ana', responsableMondayId: null })

    expect(exigirEditorMock).toHaveBeenCalledTimes(1)
  })

  it('guarda el texto y el responsable nuevos', async () => {
    const editar = await accionCapturada()
    editarAcuerdoMock.mockClear()

    await editar('ac-1', { que: '  Mandar el reporte al cierre  ', responsable: 'Iris', responsableMondayId: 'm-9' })

    expect(editarAcuerdoMock).toHaveBeenCalledWith('ac-1', expect.objectContaining({
      que: 'Mandar el reporte al cierre', // recortado
      responsable: 'Iris',
      responsableMondayId: 'm-9',
    }))
  })

  it('un acuerdo de OTRA sala se rechaza: el id lo manda el navegador', async () => {
    const editar = await accionCapturada()
    editarAcuerdoMock.mockClear()

    salaDeAcuerdoMock.mockResolvedValueOnce('mexa-creativa')
    const r = await editar('de-otra-sala', { que: 'x', responsable: 'Ana', responsableMondayId: null })

    expect(r.error).toMatch(/no es de este cliente/i)
    expect(editarAcuerdoMock).not.toHaveBeenCalled()
  })

  it('no deja vaciar el texto: un acuerdo sin qué hacer no es un acuerdo', async () => {
    const editar = await accionCapturada()
    editarAcuerdoMock.mockClear()

    const r = await editar('ac-1', { que: '   ', responsable: 'Ana', responsableMondayId: null })

    expect(r.error).toBeTruthy()
    expect(editarAcuerdoMock).not.toHaveBeenCalled()
  })

  /**
   * "Desaparece de todos lados" (Franco): si faltara una pantalla, el texto
   * viejo seguiría ahí hasta que a alguien le caducara la caché.
   */
  it('revalida las cuatro pantallas donde el acuerdo puede estar', async () => {
    const editar = await accionCapturada()
    revalidatePathMock.mockClear()

    await editar('ac-1', { que: 'Nuevo texto', responsable: 'Ana', responsableMondayId: null })

    const rutas = revalidatePathMock.mock.calls.map((c) => c[0])
    for (const ruta of ['/cliente/neracode', '/', '/acuerdos', '/acuerdos/bandeja']) {
      expect(rutas, `no revalida ${ruta}`).toContain(ruta)
    }
  })
})

/**
 * EL ENLACE DE UNA SALA SE COMPARTE: SE MIRA, NO SE TOCA.
 *
 * Franco: *"cuando comparto esta URL —/cliente/neracode— quien no está
 * logueado solo puede ver la vista de solo lectura; por ende no tiene que
 * verse el botón añadir acuerdo, ni poder modificar fechas o estatus"*.
 *
 * Hasta el 12-ago el director de la UDN SÍ movía el estatus y la fecha de los
 * acuerdos de su sala: era la única excepción a "solo Marketing Corp escribe"
 * (`puedeEditarAcuerdos`, ronda 7), y tenía su razón — que el dueño de un
 * compromiso pueda marcarlo cumplido sin pedirlo por Slack. Se cierra porque
 * ese enlace circula, y lo que circula tiene que ser inerte.
 *
 * SE COMPRUEBA POR LAS PROPS Y NO POR LO PINTADO: `AcuerdoControles` es
 * `'use client'`, así que lo que la página le pase viaja al navegador aunque
 * el componente decida no enseñarlo. Lo que importa es que no se le pase.
 */
describe('VistaSala (/cliente/[slug]) — la vista compartida es de solo lectura', () => {
  const CON_ACUERDOS: EstadoSala = {
    ...SALA_BASE,
    acuerdos: [{
      id: 'ac-1', que: 'Mandar el reporte', responsable: 'Ana', estatus: 'abierto',
      fechaCompromiso: null, destacado: false,
    } as EstadoSala['acuerdos'][number]],
  }

  it('sin permiso de escritura no se ofrece crear ni mover un acuerdo', async () => {
    estadoDeSalaMock.mockResolvedValueOnce(CON_ACUERDOS)
    esLectorMock.mockResolvedValue(false) // quien llega con el enlace de la sala
    esEditorMock.mockResolvedValue(false)
    esAdminMock.mockResolvedValue(false)

    render(await invocar())

    // El acuerdo SÍ se lee: la vista compartida informa.
    expect(screen.getByText('Mandar el reporte')).toBeInTheDocument()
    // Y no se toca por ninguna vía.
    expect(screen.queryByRole('button', { name: /añadir acuerdo/i })).not.toBeInTheDocument()
    expect(document.querySelectorAll('select')).toHaveLength(0)
    expect(document.querySelectorAll('input[type="date"]')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /corregir el acuerdo/i })).not.toBeInTheDocument()
  })

  it('con permiso de escritura sí, evidentemente', async () => {
    estadoDeSalaMock.mockResolvedValueOnce(CON_ACUERDOS)
    esLectorMock.mockResolvedValue(true)
    esEditorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)

    render(await invocar())

    expect(document.querySelectorAll('select').length).toBeGreaterThan(0)
    expect(document.querySelectorAll('input[type="date"]').length).toBeGreaterThan(0)
  })

  /**
   * UN VIEWER DE MARKETING CORP TAMPOCO ESCRIBE. Es `esEditor()` y no
   * `esLector()` lo que abre los controles: alguien de Mkt Corp con permiso de
   * lectura ve la sala entera —incluida la participación del equipo— pero no
   * mueve un acuerdo.
   */
  it('un viewer de Mkt Corp lee la sala y no mueve acuerdos', async () => {
    estadoDeSalaMock.mockResolvedValueOnce(CON_ACUERDOS)
    esLectorMock.mockResolvedValue(true)
    esEditorMock.mockResolvedValue(false)
    esAdminMock.mockResolvedValue(false)

    render(await invocar())

    expect(screen.getByText('Mandar el reporte')).toBeInTheDocument()
    expect(document.querySelectorAll('select')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /añadir acuerdo/i })).not.toBeInTheDocument()
  })
})

/**
 * RONDA 14, TAREA 2 (ronda de arreglo) — LA FECHA COMPROMISO NO SE CORRE UN
 * DÍA, SE EDITE DESDE DONDE SE EDITE.
 *
 * `editarFechaAction`/`crearAcuerdoAction` (arriba, dentro de `VistaSala`)
 * hacían `new Date(fecha)` sobre un string `YYYY-MM-DD` — medianoche UTC, que
 * en México (UTC-6) son las 18:00 del día ANTERIOR. Medido antes de tocar el
 * código: `new Date('2026-09-01')` da el día civil "2026-08-31". La pestaña
 * `/acuerdos` (`editarFechaEnTablaAction`, src/app/acuerdos/acciones.ts) ya
 * escribe esta MISMA columna (`fechaCompromiso`) con `instanteEnCDMX`; sin
 * este test, un cambio futuro en cualquiera de las dos pantallas podría
 * volver a desalinearlas sin que nada se cayera.
 *
 * Los dos tests ejercitan el camino REAL, de punta a punta — un input de
 * fecha de verdad, no la Server Action llamada a mano — porque el bug nunca
 * estuvo en `AcuerdoControles`/`NuevoAcuerdoForm` (mandan el string tal cual
 * tecleado): estaba en cómo `page.tsx` convertía ese string a `Date` antes de
 * guardarlo.
 */
describe('VistaSala (/cliente/[slug]) — la fecha compromiso no se corre un día', () => {
  const CON_ACUERDO_SIN_FECHA: EstadoSala = {
    ...SALA_BASE,
    acuerdos: [{
      id: 'ac-1', que: 'Mandar el reporte', responsable: 'Ana', estatus: 'abierto',
      fechaCompromiso: null, destacado: false,
    } as EstadoSala['acuerdos'][number]],
  }

  it('editar la fecha desde la sala guarda el mismo día civil que se tecleó', async () => {
    estadoDeSalaMock.mockResolvedValueOnce(CON_ACUERDO_SIN_FECHA)
    esLectorMock.mockResolvedValue(true)
    esEditorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)

    render(await invocar())

    const campoFecha = screen.getByLabelText('Editar fecha compromiso')
    fireEvent.change(campoFecha, { target: { value: '2026-09-01' } })
    fireEvent.blur(campoFecha) // dispara el onBlur que llama a editarFechaAction

    await waitFor(() => expect(editarAcuerdoMock).toHaveBeenCalled())
    const guardada = editarAcuerdoMock.mock.calls[0][1].fechaCompromiso as Date
    expect(diaCivil(guardada.toISOString())).toBe('2026-09-01') // NO '2026-08-31'
  })

  it('crear un acuerdo con fecha desde la sala guarda el mismo día civil que se tecleó', async () => {
    estadoDeSalaMock.mockResolvedValueOnce(SALA_BASE) // sin acuerdos: no estorba el formulario
    esLectorMock.mockResolvedValue(true)
    esEditorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(false)
    const usuario = userEvent.setup()

    render(await invocar())

    await usuario.click(screen.getByRole('button', { name: /añadir acuerdo/i }))
    await usuario.type(screen.getByPlaceholderText('Qué se acordó'), 'Enviar la propuesta')
    const campoFecha = document.querySelector<HTMLInputElement>('input[name="fecha"][type="date"]')
    if (!campoFecha) throw new Error('No se encontró el campo de fecha del alta de acuerdo.')
    fireEvent.change(campoFecha, { target: { value: '2026-09-01' } })
    await usuario.click(screen.getByRole('button', { name: 'Añadir' }))

    await waitFor(() => expect(crearAcuerdoMock).toHaveBeenCalled())
    const datos = crearAcuerdoMock.mock.calls[0][1] as { fechaCompromiso: Date | null }
    const guardada = datos.fechaCompromiso
    if (!guardada) throw new Error('fechaCompromiso llegó null: el campo no se leyó.')
    expect(diaCivil(guardada.toISOString())).toBe('2026-09-01') // NO '2026-08-31'
  })
})

/**
 * "SALIR" SOLO SI HAY ALGO QUE CERRAR.
 *
 * Este botón nació para el director que entra con la clave de su sala: la
 * cookie dura 30 días, la raíz lo devuelve aquí, y sin él se quedaba sin
 * ninguna salida — *"una sesión que no se puede terminar no es una sesión, es
 * una trampa"*, dice su comentario en la página, "y en un ordenador
 * compartido deja la sala de una UDN abierta a quien se siente después".
 *
 * Su condición era `!equipo`, que entonces significaba "el director". Cuando
 * la sala pasó a verse SIN LOGIN (Franco: *"todo sin login, pueden descargar
 * pero no pueden editar nada"*) esa condición se quedó igual y empezó a
 * significar otra cosa: también quien no ha entrado — que es hoy el visitante
 * mayoritario, el del enlace que se comparte con las UDNs. Se le ofrecía
 * cerrar una sesión que no tiene.
 */
describe('VistaSala (/cliente/[slug]) — "Salir" solo cuando hay sesión', () => {
  it('sin ninguna sesión —el enlace compartido— no se ofrece salir', async () => {
    esLectorMock.mockResolvedValue(false)
    esAdminMock.mockResolvedValue(false)
    sesionActualMock.mockResolvedValue(null)

    render(await invocar())

    expect(screen.queryByRole('button', { name: 'Salir' })).not.toBeInTheDocument()
  })

  it('con la sesión de sala del director, sí: es la salida que la cookie de 30 días necesita', async () => {
    esLectorMock.mockResolvedValue(false)
    esAdminMock.mockResolvedValue(false)
    sesionActualMock.mockResolvedValue({ rol: 'sala', sala: 'neracode', exp: Date.now() + 1000 })

    render(await invocar())

    expect(screen.getByRole('button', { name: 'Salir' })).toBeInTheDocument()
  })
})

/**
 * LA RONDA 12, PARTE 2 — cuatro peticiones de Franco sobre la sala.
 */
describe('VistaSala (/cliente/[slug]) — el freeze se gobierna en ajustes', () => {
  /**
   * Franco: *"pausar la sala solo debe vivir dentro de los ajustes de la
   * sala"*. El interruptor estaba en lo primero de la sala, encima de los
   * acuerdos, todos los días — para un gesto que se hace una vez al año. Y ya
   * existía además en `/cliente/<slug>/ajustes`: era el mismo botón en dos
   * sitios, y el de aquí era el que estorbaba.
   */
  it('ni al admin le ofrece pausar desde la sala', async () => {
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(true)

    render(await invocar())

    expect(screen.queryByRole('button', { name: /pausar esta sala/i })).not.toBeInTheDocument()
  })

  /**
   * LO QUE SÍ SE QUEDA, y ahora para TODOS y no solo para el director: que una
   * sala esté congelada explica por qué no tiene próxima reunión ni
   * vencimientos, y esa pregunta se la hace igual quien la gestiona.
   */
  it('con la sala en pausa, el aviso se ve también siendo del equipo', async () => {
    estadoDeSalaMock.mockResolvedValueOnce({ ...SALA_BASE, activa: false, pausadaDesde: '2026-08-03' })
    esLectorMock.mockResolvedValue(true)
    esAdminMock.mockResolvedValue(true)

    render(await invocar())

    expect(screen.getByText(/está en pausa/i)).toBeInTheDocument()
    // Y con la puerta a donde se cambia, que es lo único que se movió.
    expect(screen.getByRole('link', { name: /reactivar en los ajustes/i })).toBeInTheDocument()
  })

  it('con la sala activa no hay aviso ninguno', async () => {
    esLectorMock.mockResolvedValue(true)

    render(await invocar())

    expect(screen.queryByText(/está en pausa/i)).not.toBeInTheDocument()
  })
})

describe('VistaSala (/cliente/[slug]) — un módulo vacío no existe para quien solo mira', () => {
  /**
   * Franco: *"si hay algún módulo que no tenga contenido en la vista de viewer
   * no debe mostrarse"*. Al director de la UDN, "Benchmark aún no cargado para
   * esta sala" no le dice nada que pueda hacer: es una nota interna sobre
   * trabajo de Marketing Corp, en la sala que se le comparte.
   */
  it('sin benchmark, el director no ve el módulo', async () => {
    esLectorMock.mockResolvedValue(false)
    esAdminMock.mockResolvedValue(false)

    render(await invocar())

    expect(screen.queryByText(/benchmark competitivo/i)).not.toBeInTheDocument()
  })

  /** Al equipo sí: para él ese vacío ES la puerta de entrada a cargarlo. */
  it('sin benchmark, el equipo sí lo ve: es por donde se carga', async () => {
    esLectorMock.mockResolvedValue(true)

    render(await invocar())

    expect(screen.getByText(/benchmark competitivo/i)).toBeInTheDocument()
  })
})

describe('VistaSala (/cliente/[slug]) — Data & Analytics', () => {
  /**
   * Franco: *"en cada sala hay que agregar un módulo más, debe estar arriba de
   * los acuerdos: es un iframe de un módulo que contiene data y analytics de
   * la UDN"*. La URL la guarda cada sala (`salas.analytics_url`); sin ella no
   * hay módulo, ni vacío ni aviso — que es la misma regla del bloque de
   * arriba.
   */
  it('sin URL guardada, el módulo no existe', async () => {
    esLectorMock.mockResolvedValue(true)

    render(await invocar())

    expect(screen.queryByText(/data & analytics/i)).not.toBeInTheDocument()
    expect(document.querySelector('iframe')).toBeNull()
  })

  it('con URL, el iframe apunta ahí y va ARRIBA de los acuerdos', async () => {
    cargarTemasMock.mockResolvedValue({
      neracode: { ...TEMA_BASE, analyticsUrl: 'https://orbit-hub-fgap.vercel.app/embed/neracode' },
    })
    esLectorMock.mockResolvedValue(true)

    const { container } = render(await invocar())

    const marco = container.querySelector('iframe')
    expect(marco?.getAttribute('src')).toBe('https://orbit-hub-fgap.vercel.app/embed/neracode')
    // El orden importa y es lo que se pidió: primero los datos.
    const titulos = [...container.querySelectorAll<HTMLElement>('h2, summary')].map((t) => t.textContent ?? '')
    const analytics = titulos.findIndex((t) => /data & analytics/i.test(t))
    const acuerdos = titulos.findIndex((t) => /acuerdos/i.test(t))
    expect(analytics).toBeGreaterThanOrEqual(0)
    expect(analytics).toBeLessThan(acuerdos)
  })
})

describe('VistaSala (/cliente/[slug]) — todos los módulos se colapsan', () => {
  /**
   * Franco: *"los módulos todos deben tener la opción de colapsarse"*. Solo
   * Acuerdos lo era. Se comprueba sobre `<details>` —no sobre una clase— porque
   * eso es lo que hace que funcione con teclado y sin JavaScript.
   */
  it('cada sección de la sala es un <details> abierto', async () => {
    esLectorMock.mockResolvedValue(true)

    const { container } = render(await invocar())

    const plegables = [...container.querySelectorAll('main details')]
    // Acuerdos, Reuniones, Benchmark, Materiales Comerciales, Archivos de Interés.
    expect(plegables.length).toBeGreaterThanOrEqual(5)
    // Abiertos de serie: lo que se esconde por defecto deja de existir.
    for (const d of plegables) expect((d as HTMLDetailsElement).open).toBe(true)
  })
})
