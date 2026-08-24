import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { EstadoSala } from '@/dominio/salas'
import type { Reunion } from '@/dominio/reunion'

/**
 * El Home (`/`). SIN TEST HASTA AHORA — esta suite es DELIBERADAMENTE
 * ACOTADA: fija solo el hallazgo 1 de la revisión final de la ronda 10
 * ("Levantar minuta" volvía a exigir papeleo), no intenta cubrir el resto de
 * esta página (acuerdos, calendario, agendar rápido, salir...). Mismo
 * criterio de mocking que `reuniones/page.test.tsx`: los componentes hijos
 * se sustituyen por dobles que capturan sus props — no hace falta un App
 * Router real montado ni abrir ningún `<dialog>` para comprobar QUÉ LE LLEGA
 * a `ModuloMinutas`.
 */

const exigirLecturaMock = vi.fn()
vi.mock('@/auth/roles', () => ({
  exigirLectura: () => exigirLecturaMock(),
  exigirEditor: vi.fn(),
  esAdmin: vi.fn().mockResolvedValue(false),
}))

// `connection()` (next/server), llamado FUERA de cualquier render real de
// Next, revienta con "invariant expected a request store" — mismo motivo por
// el que `reuniones/page.test.tsx` la mockea.
vi.mock('next/server', () => ({ connection: vi.fn().mockResolvedValue(undefined) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const estadoDeSalasMock = vi.fn()
// Reconfigurable por test (mismo patrón que `estadoDeSalasMock`): hace falta
// para probar el singular/plural del pulso (extra de la auditoría UX/UI,
// ronda 11) sin depender del valor fijo que bastaba hasta ahora.
const pulsoDelMesMock = vi.fn()
/**
 * El desplegable de Clientes de la barra pide la lista de salas
 * (`clientesParaBarra()`); esta suite no va de eso, así que se dobla.
 */
vi.mock('@/db/temas', () => ({
  slugsDeSalas: () => Promise.resolve(['neracode', 'mexa-creativa']),
  cargarTemas: () => Promise.resolve({
    neracode: { nombre: 'NeraCode', primario: '#101010' },
    'mexa-creativa': { nombre: 'Mexa Creativa', primario: '#c0392b' },
  }),
}))

vi.mock('@/db/consultas', () => ({
  estadoDeSalas: () => estadoDeSalasMock(),
  ordenarPorProximaReunion: (salas: EstadoSala[]) => salas,
  temperatura: vi.fn().mockReturnValue('reciente'),
  acuerdosAbiertos: vi.fn().mockReturnValue(0),
  acuerdosVencidos: vi.fn().mockReturnValue(0),
  todosLosAcuerdos: vi.fn().mockResolvedValue([]),
  pulsoDelMes: () => pulsoDelMesMock(),
}))

vi.mock('@/db/acuerdos', () => ({
  moverEstatus: vi.fn(),
  editarAcuerdo: vi.fn(),
}))

vi.mock('@/app/acuerdos/acciones', () => ({
  destacarAction: vi.fn(),
}))

vi.mock('@/db/reuniones', () => ({
  listarReuniones: vi.fn().mockResolvedValue([]),
  marcarDada: vi.fn(),
  marcarNoDada: vi.fn(),
  desmarcarNoDada: vi.fn(),
  // Agendar crea la REUNIÓN, no su deck: ver el describe de más abajo.
  crearReunion: (...args: unknown[]) => crearReunionMock(...args),
}))
const crearReunionMock = vi.fn()

vi.mock('@/db/documentos', () => ({
  // El de verdad, no un doble: es lo que impide que una reunión agendada sin
  // título nazca sin nombre, y el test de abajo comprueba justo eso.
  tituloPorDefecto: (tipo: string, fecha: Date) =>
    `Estatus ${tipo} · ${fecha.toISOString().slice(0, 10)}`,
}))

vi.mock('@/db/participacion', () => ({
  registrarEdicion: vi.fn(),
}))

vi.mock('@/db/personas', () => ({
  genteParaResponsable: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/db/plantillas', () => ({
  moldeDeMinuta: vi.fn().mockResolvedValue({}),
  guardarMoldeDeMinuta: vi.fn(),
}))

vi.mock('@/auth/sesion', () => ({
  cerrarSesion: vi.fn(),
}))

vi.mock('@/db/cliente', () => ({
  hayDB: vi.fn().mockReturnValue(true),
}))

// Componentes hijos: dobles mudos — nada de este archivo necesita verlos
// pintados, solo saber qué prop les llegó. Mismo patrón que `PanelAgenda` en
// `reuniones/page.test.tsx`.
//
// SIN DOBLE PARA `ModuloAcuerdos` (ronda 14.5, tarea 1): este archivo lo tuvo
// —`() => null`—, y por eso el describe de más abajo ("el Home se invierte")
// no lo necesita: la tarea es justo RETIRAR ese import de `page.tsx`, así que
// después de esta ronda no hay nada que doblar. Mientras la tarea estuvo a
// medio hacer, dejar el módulo real (sin doblar) fue lo que permitió que el
// primer test de ese describe fallara de verdad contra el `page.tsx` viejo
// —con el doble puesto, "Acuerdos y pendientes" nunca pintaba un `<h2>` y el
// test habría pasado sin que la página cambiara una línea.
vi.mock('@/componentes/hogar/ModuloCalendario', () => ({ ModuloCalendario: () => null }))
// Captura props (mismo patrón que `moduloMinutasPropsMock`, más abajo): hace
// falta para poder invocar `agendar` (el cierre de `agendarRapidoAction`)
// desde fuera y comprobar qué le llega a `crearReunionConDocumento` — ver el
// describe "Agendar rápido" (auditoría UX/UI, ronda 11).
const agendarRapidoPropsMock = vi.fn()
vi.mock('@/componentes/hogar/AgendarRapido', () => ({
  AgendarRapido: (props: unknown) => {
    agendarRapidoPropsMock(props)
    return null
  },
}))
vi.mock('@/componentes/ReunionesPorConfirmar', () => ({ ReunionesPorConfirmar: () => null }))

const moduloMinutasPropsMock = vi.fn()
vi.mock('@/componentes/hogar/ModuloMinutas', () => ({
  ModuloMinutas: (props: unknown) => {
    moduloMinutasPropsMock(props)
    return null
  },
}))

const { default: Hub } = await import('./page')

const REUNION_BASE: Reunion = {
  id: 'r1',
  fecha: '2026-07-15T10:00:00.000Z',
  titulo: 'Quincenal julio',
  tipo: 'mensual',
  estado: 'agendada',
  noDadaEn: null,
  plantilla: null,
  documentoListo: false,
  archivos: [],
  acuerdos: [],
}

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

beforeEach(() => {
  vi.clearAllMocks()
  exigirLecturaMock.mockResolvedValue({ rol: 'equipo', rolApp: 'viewer', sub: 'equipo-mkt-corp' })
  estadoDeSalasMock.mockResolvedValue([])
  pulsoDelMesMock.mockResolvedValue({
    salas: 0, reunionesEsteMes: 0, reunionesDadas: 0, acuerdosAbiertos: 0, acuerdosVencidos: 0,
    salaMasDesatendida: null,
  })
})

/**
 * HALLAZGO 1 DE LA REVISIÓN FINAL (ronda 10) — "Levantar minuta" volvió a
 * exigir papeleo, Y ES UNA REGRESIÓN DE LA LECCIÓN DE LA RONDA 4.
 *
 * `sinMinuta` (lo que llega a `ModuloMinutas` como `pendientes`) llamaba a
 * `sesionesMinutables` (dominio/salas.ts) sobre `reuniones` —el
 * `ReunionResumen[]` plano de `listarReuniones()`—, cuyo filtro `estado !==
 * 'borrador' && estado !== 'agendada'` se escribió para el modelo viejo de
 * cinco estados. Con `EstadoReunion = 'agendada' | 'dada'` (ronda 10) ese
 * filtro pasó a significar SOLO 'dada': una reunión maquetada (con su
 * documento LISTO) pero sin confirmar a mano no aparecía como pendiente de
 * minutar, pese a que el propio comentario de la función dice lo contrario.
 *
 * El reemplazo, `reunionesMinutables` (dominio/reunion.ts, escrita en esta
 * misma ronda), opera sobre las `Reunion[]` de CADA sala
 * (`salasCrudas[].reuniones`, con su respaldo completo ya cosido) y usa el
 * criterio correcto: `estado === 'dada' || tienePresentacion(r)`.
 */
describe('Hub (/) — "Levantar minuta" no exige confirmar a mano (hallazgo 1)', () => {
  it('una reunión maquetada (agendada, documento listo) cuyo día ya pasó llega a ModuloMinutas como pendiente', async () => {
    estadoDeSalasMock.mockResolvedValue([
      { ...SALA_BASE, reuniones: [{ ...REUNION_BASE, id: 'r-maquetada', documentoListo: true }] },
    ])

    render(await Hub())

    const props = moduloMinutasPropsMock.mock.calls[0][0] as { pendientes: Array<{ id: string }> }
    expect(props.pendientes.map((p) => p.id)).toContain('r-maquetada')
  })

  it('una agendada SIN ningún respaldo no aparece como pendiente: no hay nada que transcribir', async () => {
    estadoDeSalasMock.mockResolvedValue([
      { ...SALA_BASE, reuniones: [{ ...REUNION_BASE, id: 'r-sin-respaldo', documentoListo: false }] },
    ])

    render(await Hub())

    const props = moduloMinutasPropsMock.mock.calls[0][0] as { pendientes: Array<{ id: string }> }
    expect(props.pendientes.map((p) => p.id)).not.toContain('r-sin-respaldo')
  })

  it('una ya explícitamente dada, sin minuta, sigue apareciendo (lo explícito nunca se pierde)', async () => {
    estadoDeSalasMock.mockResolvedValue([
      { ...SALA_BASE, reuniones: [{ ...REUNION_BASE, id: 'r-dada', estado: 'dada' }] },
    ])

    render(await Hub())

    const props = moduloMinutasPropsMock.mock.calls[0][0] as { pendientes: Array<{ id: string }> }
    expect(props.pendientes.map((p) => p.id)).toContain('r-dada')
  })

  it('cruza dos salas y ordena de la más reciente a la más antigua, con el nombre/color de SU sala', async () => {
    estadoDeSalasMock.mockResolvedValue([
      {
        ...SALA_BASE, slug: 'neracode', nombre: 'NeraCode', color: '#101010',
        reuniones: [{ ...REUNION_BASE, id: 'r-vieja', fecha: '2026-06-01T10:00:00.000Z', documentoListo: true }],
      },
      {
        ...SALA_BASE, slug: 'uix', nombre: 'UiX', color: '#2b6cc0',
        reuniones: [{ ...REUNION_BASE, id: 'r-nueva', fecha: '2026-07-20T10:00:00.000Z', documentoListo: true }],
      },
    ])

    render(await Hub())

    const props = moduloMinutasPropsMock.mock.calls[0][0] as {
      pendientes: Array<{ id: string; salaNombre?: string }>
    }
    expect(props.pendientes.map((p) => p.id)).toEqual(['r-nueva', 'r-vieja'])
    expect(props.pendientes.find((p) => p.id === 'r-nueva')?.salaNombre).toBe('UiX')
    expect(props.pendientes.find((p) => p.id === 'r-vieja')?.salaNombre).toBe('NeraCode')
  })
})

/**
 * EXTRA DE LA AUDITORÍA UX/UI (ronda 11): la fila de estadísticas decía "1
 * YA SE DIERON" y "1 VENCIDOS" —plural con número singular— y "Los clientes"
 * decía "ORDENADAS por próxima reunión" —adjetivo femenino para un sustantivo
 * masculino—. Mismo criterio que ya usa esta misma pantalla más abajo, en la
 * píldora de cada tarjeta de sala (`vencido{vencidos > 1 ? 's' : ''}`).
 */
describe('Hub (/) — singular/plural del pulso y género de "Los clientes" (extra de la auditoría UX/UI)', () => {
  it('con exactamente 1 reunión ya dada dice "ya se dio", no "ya se dieron"', async () => {
    pulsoDelMesMock.mockResolvedValue({
      salas: 0, reunionesEsteMes: 1, reunionesDadas: 1, acuerdosAbiertos: 0, acuerdosVencidos: 0,
      salaMasDesatendida: null,
    })

    render(await Hub())

    expect(screen.getByText('ya se dio')).toBeInTheDocument()
    expect(screen.queryByText('ya se dieron')).not.toBeInTheDocument()
  })

  it('con más de 1 reunión ya dada sigue diciendo "ya se dieron"', async () => {
    pulsoDelMesMock.mockResolvedValue({
      salas: 0, reunionesEsteMes: 2, reunionesDadas: 2, acuerdosAbiertos: 0, acuerdosVencidos: 0,
      salaMasDesatendida: null,
    })

    render(await Hub())

    expect(screen.getByText('ya se dieron')).toBeInTheDocument()
  })

  it('con 0 reuniones dadas dice "ya se dieron" (plural por defecto, como antes)', async () => {
    render(await Hub())

    expect(screen.getByText('ya se dieron')).toBeInTheDocument()
  })

  it('con exactamente 1 acuerdo vencido dice "vencido", no "vencidos"', async () => {
    pulsoDelMesMock.mockResolvedValue({
      salas: 0, reunionesEsteMes: 0, reunionesDadas: 0, acuerdosAbiertos: 0, acuerdosVencidos: 1,
      salaMasDesatendida: null,
    })

    render(await Hub())

    expect(screen.getByText('vencido')).toBeInTheDocument()
    expect(screen.queryByText('vencidos')).not.toBeInTheDocument()
  })

  it('con más de 1 acuerdo vencido sigue diciendo "vencidos"', async () => {
    pulsoDelMesMock.mockResolvedValue({
      salas: 0, reunionesEsteMes: 0, reunionesDadas: 0, acuerdosAbiertos: 0, acuerdosVencidos: 3,
      salaMasDesatendida: null,
    })

    render(await Hub())

    expect(screen.getByText('vencidos')).toBeInTheDocument()
  })

  /**
   * LA NOTA DE ORDEN SE RETIRÓ (ronda 12) — y este test se queda para contar
   * por qué, en vez de borrarse.
   *
   * Aquí se comprobaba que "Los clientes" dijera "ORDENADOS por próxima
   * reunión" y no "ordenadas": el sustantivo es masculino y el adjetivo
   * concordaba con "salas", que es lo que hay en el código pero no lo que
   * está escrito en la pantalla. Esa lección de concordancia sigue viva en el
   * resto de esta suite.
   *
   * La frase entera se fue cuando el Home adoptó la cabecera de la sala (ver
   * `componentes/Seccion.tsx`): a la derecha del título va un CONTEO, no una
   * explicación. El orden de la rejilla ya se lee solo —cada tarjeta enseña
   * su próxima reunión, en orden— mientras que cuántos clientes están sin
   * agendar no se sabe sin ir contándolos a ojo. En ese sitio, uno de los dos
   * datos vale y el otro decora.
   */
  it('la cabecera de "Los clientes" cuenta clientes, no explica el orden', async () => {
    render(await Hub())

    expect(screen.queryByText(/ordenad[oa]s por próxima reunión/)).not.toBeInTheDocument()
  })
})

/**
 * AGENDAR RÁPIDO: CREA LA REUNIÓN, NO SU PRESENTACIÓN.
 *
 * Este atajo llamaba a `crearReunionConDocumento`, que agenda la junta Y le
 * monta el deck de una vez — el criterio viejo de toda la app, "toda reunión
 * agendada nace con su documento". Franco lo desmontó: *"debería ser crear
 * reunión; una vez que la creo debo decidir si la creo con el editor de
 * presentaciones o cargar un archivo ya creado"*.
 *
 * La sala y `/reuniones` se cambiaron con esa petición y ESTE SE QUEDÓ ATRÁS,
 * que es el defecto que este describe impide repetir: el mismo gesto dejando
 * la reunión en dos estados distintos según la pantalla por la que se entre.
 *
 * Y el título sigue sin poder llegar vacío: lo resolvía
 * `crearReunionConDocumento` por dentro, así que al dejar de usarla hay que
 * reponerlo aquí — si no, dos quincenales de la misma sala (el caso real de
 * Research Land, Comercial vs. Digital) nacen sin nombre en el calendario.
 */
describe('Hub (/) — "Agendar rápido" agenda la reunión y nada más', () => {
  function agendarDesdeElHome() {
    const { agendar } = agendarRapidoPropsMock.mock.calls[0][0] as {
      agendar: (datos: {
        salaSlug: string; dia: string; hora: string; tipo: string; titulo: string; plantilla?: string
      }) => Promise<{ error?: string }>
    }
    return agendar
  }

  it('crea SOLO la reunión: no monta su documento', async () => {
    render(await Hub())
    crearReunionMock.mockClear()

    await agendarDesdeElHome()({
      salaSlug: 'neracode', dia: '2026-08-19', hora: '10:00', tipo: 'mensual',
      titulo: 'Estatus Comercial Quincenal',
    })

    expect(crearReunionMock).toHaveBeenCalledTimes(1)
    expect(crearReunionMock).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Estatus Comercial Quincenal', salaSlug: 'neracode' }),
    )
  })

  it('sin título escrito, el servidor pone uno legible — nunca uno en blanco', async () => {
    render(await Hub())
    crearReunionMock.mockClear()

    await agendarDesdeElHome()({
      salaSlug: 'neracode', dia: '2026-08-19', hora: '10:00', tipo: 'mensual', titulo: '',
    })

    const enviado = crearReunionMock.mock.calls.at(-1)?.[0] as { titulo: string }
    expect(enviado.titulo.trim().length).toBeGreaterThan(0)
  })

  /**
   * "¿QUÉ JUNTA ES?" (cierre de deuda técnica): `AgendarRapido` ahora la
   * pregunta (ver su test propio), y esto fija la otra mitad — que
   * `agendarRapidoAction` la reenvía a `crearReunion` traducida a `null`
   * cuando llega vacía, NUNCA la primera clase del catálogo. Antes de esta
   * tarea el atajo del Home ni siquiera mandaba el campo, así que toda
   * reunión creada aquí nacía sin clase por OMISIÓN — este test fija que
   * sigue naciendo sin clase, ahora por una DECISIÓN explícita del código, no
   * por un campo que faltaba.
   */
  it('sin clase elegida, crearReunion recibe plantilla: null — no la primera del catálogo', async () => {
    render(await Hub())
    crearReunionMock.mockClear()

    await agendarDesdeElHome()({
      salaSlug: 'neracode', dia: '2026-08-19', hora: '10:00', tipo: 'mensual', titulo: '', plantilla: '',
    })

    expect(crearReunionMock).toHaveBeenCalledWith(expect.objectContaining({ plantilla: null }))
  })

  it('con una clase elegida, crearReunion recibe ese id tal cual', async () => {
    render(await Hub())
    crearReunionMock.mockClear()

    await agendarDesdeElHome()({
      salaSlug: 'neracode', dia: '2026-08-19', hora: '10:00', tipo: 'mensual', titulo: '', plantilla: 'comite',
    })

    expect(crearReunionMock).toHaveBeenCalledWith(expect.objectContaining({ plantilla: 'comite' }))
  })
})

/**
 * EL TRABAJO QUE EL HOME NO ESTABA DICIENDO EN VOZ ALTA (ronda 12).
 *
 * Franco: *"el home sigo percibiéndolo sin lógica y desconectado, al menos del
 * UX/UI de las salas"*.
 *
 * Parte del arreglo fue de forma —el Home adoptó la cabecera de la sala, ver
 * `componentes/Seccion.tsx`— y parte de fondo: el pulso contaba cinco cosas y
 * ninguna era la que define el oficio de Marketing Corporativo, que a ninguna
 * UDN se le pase el estatus. Cuántos clientes están hoy sin nada agendado
 * estaba solo implícito, repartido en las tarjetas que ponen "por agendar" en
 * naranja y que había que ir contando a ojo.
 *
 * DOS TRAMPAS, y las dos se prueban aquí porque las dos son maneras de que la
 * cifra mienta justo cuando importa: contar salas EN PAUSA (que no tienen
 * próxima reunión a propósito — el freeze se convertiría en una tarea
 * pendiente) y no distinguir "sin próxima" de "sin ninguna todavía".
 */
describe('Hub (/) — la cuenta de clientes sin próxima reunión', () => {
  it('cuenta las activas que no tienen próxima reunión', async () => {
    estadoDeSalasMock.mockResolvedValue([
      { ...SALA_BASE, slug: 'a', nombre: 'A', proximaReunion: null },
      { ...SALA_BASE, slug: 'b', nombre: 'B', proximaReunion: null },
      { ...SALA_BASE, slug: 'c', nombre: 'C', proximaReunion: '2026-09-01' },
    ])

    render(await Hub())

    expect(screen.getByText('sin próxima reunión')).toBeInTheDocument()
    expect(screen.getByText('2 por agendar')).toBeInTheDocument()
  })

  /** Una sala en freeze no tiene próxima reunión a propósito: no es trabajo. */
  it('NO cuenta las salas en pausa', async () => {
    estadoDeSalasMock.mockResolvedValue([
      { ...SALA_BASE, slug: 'a', nombre: 'A', proximaReunion: null },
      { ...SALA_BASE, slug: 'z', nombre: 'Zeus', proximaReunion: null, activa: false, pausadaDesde: '2026-08-03' },
    ])

    render(await Hub())

    expect(screen.getByText('1 por agendar')).toBeInTheDocument()
  })

  /** Con todo agendado, la cabecera no anuncia un cero: no hay nada que hacer. */
  it('sin ninguno por agendar, no pone un conteo en cero', async () => {
    estadoDeSalasMock.mockResolvedValue([
      { ...SALA_BASE, slug: 'a', nombre: 'A', proximaReunion: '2026-09-01' },
    ])

    render(await Hub())

    expect(screen.queryByText(/por agendar$/)).not.toBeInTheDocument()
  })
})

/**
 * CADA CIFRA DEL PULSO LLEVA A DONDE SE ATIENDE (ronda 12).
 *
 * Eran seis números que se leían y no se podían tocar: se entendía que algo
 * había que hacer y para hacerlo tocaba buscar dónde. Un tablero cuyos números
 * no llevan a su trabajo es decoración con datos dentro.
 */
describe('Hub (/) — el pulso es navegable', () => {
  it('los acuerdos llevan a su pantalla; los clientes y el calendario, a su bloque', async () => {
    render(await Hub())

    const destino = (rotulo: string) =>
      screen.getByText(rotulo).closest('a')?.getAttribute('href')

    expect(destino('acuerdos abiertos')).toBe('/acuerdos')
    expect(destino('vencidos')).toBe('/acuerdos')
    expect(destino('clientes')).toBe('#clientes')
    expect(destino('sin próxima reunión')).toBe('#clientes')
    expect(destino('reuniones este mes')).toBe('#calendario')
  })
})

/**
 * EL HOME SE INVIERTE (ronda 14.5, tarea 1). Franco, textual: *"hay que
 * transformarlo, ya que es el lugar donde lo primero que ves son las salas y
 * luego otros módulos de interés agnósticos y generales"* — medido antes de
 * esta ronda: "Los clientes" empezaba en el píxel 1.140 de 2.238 a 1440px, a
 * mitad de página, con el módulo de acuerdos entero encima.
 *
 * Decisión de Franco, textual: los acuerdos salen del Home y quedan **"solo
 * una cifra"** — no un módulo más chico, una cifra que lleva a `/acuerdos`.
 * Esa cifra ya existía (ronda 12, ver "el pulso es navegable" arriba); lo que
 * se retira aquí es el bloque `ModuloAcuerdos` completo —Destacados y
 * Vencidos, editable in situ— que hasta esta ronda seguía viviendo a mitad
 * de la página.
 *
 * SE AFIRMA SOBRE EL DOCUMENTO, NO SOBRE EL CSS (mismo criterio que se dejó
 * como deuda en `/reuniones`, aquí resuelto desde el principio): si el orden
 * se resolviera con `order` de CSS en vez de mover las secciones en el JSX,
 * quien navega con teclado o lector de pantalla seguiría topándose primero
 * con acuerdos aunque a la vista se vea distinto — por eso el primer test lee
 * `getAllByRole('heading', { level: 2 })`, que recorre el DOM, no el layout.
 *
 * EL FIXTURE ERA MUDO (re-revisión, hallazgo I1): con `estadoDeSalas=[]`,
 * `listarReuniones=[]` y `ModuloCalendario`/`ModuloMinutas` dobladas a
 * `null`, `getAllByRole('heading', { level: 2 })` devolvía UN SOLO elemento
 * —"Los clientes"—, así que `secciones[0]` pasaba estuviera "Los clientes"
 * donde estuviera en el documento. El test SÍ falló contra el `page.tsx`
 * original (Step 3 del brief, cuando `ModuloAcuerdos` todavía pintaba su
 * propio `<h2>`) pero perdió esa capacidad al borrarse ese componente: nadie
 * lo volvió a poner a prueba. Comprobado moviendo la sección a mano (ver el
 * informe de esta ronda) — con el fixture viejo NO caía; con este, sí.
 *
 * Ahora el fixture arma TRES secciones reales — "Por confirmar" (una reunión
 * con respaldo cuyo día ya pasó), "Los clientes" (una sala activa) y "En
 * pausa" (una sala pausada, la mínima que pide el hallazgo) — y el test
 * COMPARA ÍNDICES, no asume que el primer elemento de la lista es el
 * ganador por ser el único. Eso además fija, de una vez, el hallazgo I2: que
 * "Por confirmar" —antes el primer `<h2>` del documento— quede por debajo de
 * "Los clientes", con los demás módulos generales, tal como pide el spec §4
 * (pulso → clientes → calendario y agendar → minutas → en pausa; "Por
 * confirmar" no va delante de clientes).
 */
describe('Hub (/) — el Home se invierte: los clientes primero, los acuerdos solo una cifra (ronda 14.5)', () => {
  beforeEach(() => {
    // Sala activa con una reunión pasada y con respaldo (documentoListo) →
    // dispara "Por confirmar" (`reunionesPorConfirmar`, dominio/reunion.ts), y
    // con un acuerdo vencido → dispara "Acuerdos vencidos". Entre las dos,
    // `getAllByRole` deja de devolver una lista de uno: el test recupera
    // dientes.
    //
    // El módulo "En pausa" ya no existe (24-ago-2026): una sala congelada vive
    // apagada al final de la rejilla de clientes, así que la tercera sección
    // que este test necesita para comparar posiciones la pone ahora el módulo
    // de vencidos.
    estadoDeSalasMock.mockResolvedValue([
      {
        ...SALA_BASE,
        slug: 'activa',
        nombre: 'Activa',
        activa: true,
        reuniones: [{ ...REUNION_BASE, id: 'r-por-confirmar', documentoListo: true }],
        acuerdos: [{
          id: 'ac-vencido', que: 'Mandar el reporte', responsable: 'Ana',
          fechaCompromiso: '2026-07-01', estatus: 'vencido' as const,
        }],
      },
      {
        ...SALA_BASE,
        slug: 'pausada',
        nombre: 'Pausada',
        activa: false,
        pausadaDesde: '2026-01-01',
      },
    ])
  })

  it('lo primero que se ve son los clientes, no los acuerdos ni "Por confirmar"', async () => {
    render(await Hub())

    // El orden en el DOM es el orden de lectura y el del teclado: se afirma
    // sobre el documento, no sobre el CSS.
    const secciones = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent ?? '')
    // Con el fixture de arriba esto NO puede ser una lista de uno: si lo
    // fuera, este `expect` estaría mintiendo sobre lo que comprueba.
    expect(secciones.length).toBeGreaterThanOrEqual(3)

    const iClientes = secciones.findIndex((t) => /clientes/i.test(t))
    const iConfirmar = secciones.findIndex((t) => /confirmar/i.test(t))
    const iVencidos = secciones.findIndex((t) => /vencidos/i.test(t))
    expect(iClientes).toBeGreaterThanOrEqual(0)
    expect(iConfirmar).toBeGreaterThanOrEqual(0)
    expect(iVencidos).toBeGreaterThanOrEqual(0)

    // La comparación es por ÍNDICE, no por "es el primero del arreglo": lo
    // que importa es la posición relativa a las otras secciones, no que
    // "Los clientes" sea casualmente la única.
    expect(iClientes).toBeLessThan(iConfirmar) // I2: "Por confirmar" ya no va delante.
    expect(iClientes).toBeLessThan(iVencidos)
  })

  it('los acuerdos son una cifra que lleva a su pestaña, no una lista', async () => {
    render(await Hub())

    // El rótulo exacto, tal cual lo pinta el pulso (ronda 12): no se inventa
    // aquí, se lee del propio componente.
    expect(screen.getByRole('link', { name: /acuerdos abiertos/i })).toHaveAttribute('href', '/acuerdos')
    // Y el módulo que los listaba ya no está: sin él, la estrella de un
    // acuerdo ("Fijar arriba en Acuerdos", `Estrella.tsx`) deja de prometer
    // dentro del Home un efecto que aquí ya no existe — deuda anotada en el
    // spec §4 desde el milestone 1, saldada al retirar este bloque.
    expect(screen.queryByRole('heading', { name: /acuerdos y pendientes/i })).toBeNull()
  })
})

/**
 * ═══ LOS CLIENTES SON UNA SOLA REJILLA, Y LO VENCIDO TIENE SITIO ═══════════
 *
 * Franco (24-ago-2026): *"la sala de Zeus no debe quedar abajo en un módulo
 * aparte, basta con que se vea gris apagada al final de la grilla en el módulo
 * principal de Los Clientes. El módulo 'en pausa' reemplázalo por un módulo
 * que muestre los acuerdos vencidos con un botón que me lleve a la pestaña de
 * acuerdos"*.
 */
describe('Hub (/) — una sola rejilla de clientes, y los vencidos en su lugar', () => {
  const CON_PAUSADA = [
    {
      ...SALA_BASE,
      slug: 'activa', nombre: 'Activa', activa: true,
      acuerdos: [{
        id: 'ac-1', que: 'Mandar el reporte de agosto', responsable: 'Ana',
        fechaCompromiso: '2026-07-01', estatus: 'vencido' as const,
      }],
    },
    { ...SALA_BASE, slug: 'zeus', nombre: 'Zeus', activa: false, pausadaDesde: '2026-01-01' },
  ]

  it('ya no hay un módulo "En pausa": la sala congelada vive en la rejilla de clientes', async () => {
    estadoDeSalasMock.mockResolvedValue(CON_PAUSADA)
    render(await Hub())

    expect(screen.queryByRole('heading', { level: 2, name: /en pausa/i })).toBeNull()
    // Y sigue estando: es un cliente, no un archivo. Con su enlace a su sala.
    expect(screen.getByRole('link', { name: /zeus/i })).toHaveAttribute('href', '/cliente/zeus')
  })

  /**
   * ⚠️ UNA SALA EN PAUSA NO DICE "AL DÍA". `acuerdosAbiertos`/`acuerdosVencidos`
   * devuelven 0 para una congelada a propósito (sus compromisos están parados,
   * no vencidos), así que sin un caso propio la tarjeta de Zeus afirmaría estar
   * al día sobre un trabajo que nadie está haciendo.
   */
  it('la tarjeta de una sala en pausa lo dice, y no se declara "al día"', async () => {
    estadoDeSalasMock.mockResolvedValue(CON_PAUSADA)
    render(await Hub())

    const zeus = screen.getByRole('link', { name: /zeus/i })
    expect(zeus.textContent).toMatch(/en pausa/i)
    expect(zeus.textContent).not.toMatch(/al día/i)
  })

  it('los vencidos se listan con su sala, su dueño y desde cuándo', async () => {
    estadoDeSalasMock.mockResolvedValue(CON_PAUSADA)
    render(await Hub())

    const seccion = screen.getByRole('heading', { level: 2, name: /vencidos/i }).closest('section')!
    expect(seccion.textContent).toContain('Mandar el reporte de agosto')
    expect(seccion.textContent).toContain('Ana')
    expect(seccion.textContent).toMatch(/venció el/i)
  })

  it('y llevan a la sala del acuerdo, con un botón aparte a la pestaña de acuerdos', async () => {
    estadoDeSalasMock.mockResolvedValue(CON_PAUSADA)
    render(await Hub())

    const seccion = screen.getByRole('heading', { level: 2, name: /vencidos/i }).closest('section')!
    expect(within(seccion).getByRole('link', { name: /Mandar el reporte/i }))
      .toHaveAttribute('href', '/cliente/activa#s-acuerdos')
    expect(within(seccion).getByRole('link', { name: /ver todos los acuerdos/i }))
      .toHaveAttribute('href', '/acuerdos')
  })

  /**
   * Los compromisos de una sala congelada están PARADOS, no vencidos — misma
   * regla que ya aplican `acuerdosVencidos()` y `salaMasDesatendida()`.
   * Listarlos aquí sería pedir cuentas por trabajo que alguien decidió parar.
   */
  it('los acuerdos de una sala en pausa no entran en la lista de vencidos', async () => {
    estadoDeSalasMock.mockResolvedValue([
      {
        ...SALA_BASE, slug: 'zeus', nombre: 'Zeus', activa: false, pausadaDesde: '2026-01-01',
        acuerdos: [{
          id: 'ac-z', que: 'Algo congelado', responsable: 'Quien sea',
          fechaCompromiso: '2026-06-01', estatus: 'vencido' as const,
        }],
      },
    ])
    render(await Hub())

    expect(screen.queryByRole('heading', { level: 2, name: /vencidos/i })).toBeNull()
    expect(screen.queryByText(/Algo congelado/)).toBeNull()
  })

  it('sin vencidos, el módulo no ocupa sitio diciendo cero', async () => {
    estadoDeSalasMock.mockResolvedValue([{ ...SALA_BASE, slug: 'activa', nombre: 'Activa', activa: true }])
    render(await Hub())

    expect(screen.queryByRole('heading', { level: 2, name: /vencidos/i })).toBeNull()
  })
})
