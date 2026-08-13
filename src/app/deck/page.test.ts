import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReunionResumen } from '@/db/reuniones'
import type { DocumentoCompleto } from '@/db/documentos'

/**
 * `/deck` (Presentaciones — "Deck Designer" hasta la tarea 18). Esta suite
 * fija los dos hallazgos de la revisión final de la ronda 10 que tocan esta
 * página —hallazgo 1 ("falta minuta" con el mismo sesgo que "Levantar
 * minuta") y hallazgo 2 ("en preparación" duplica lo que ya se cuenta como
 * dado)— y, desde la tarea 18, el merge de "Se dieron, falta su minuta" +
 * "Reuniones cerradas" en un solo módulo, "Anteriores": no intenta cubrir el
 * resto (descargar minuta/PDF...).
 */

const exigirLecturaMock = vi.fn()
vi.mock('@/auth/roles', () => ({
  exigirLectura: () => exigirLecturaMock(),
  exigirEditor: vi.fn(),
  // `esAdmin` (ronda 11, tarea 2): `PagPreparar` ahora la llama dentro del
  // `Promise.all` para alimentar a `BarraNavegacion` — sin mockearla aquí,
  // `esAdmin()` es `undefined()` y el `Promise.all` entero rechaza. Mismo
  // mock, mismo motivo, que `src/app/page.test.ts` (Home).
  esAdmin: vi.fn().mockResolvedValue(false),
}))

// Mismo motivo que en `reuniones/page.test.tsx`: `connection()` fuera de un
// render real de Next revienta con "invariant expected a request store".
vi.mock('next/server', () => ({ connection: vi.fn().mockResolvedValue(undefined) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const listarReunionesMock = vi.fn()
// Handle propio para `eliminarReunion` (antes `vi.fn()` inline, sin forma de
// comprobar desde un test si se llegó a llamar): lo exige el crítico 4 de la
// auditoría 7-ago — probar que borrar exige el paso deliberado significa
// poder afirmar que NO se llamó tras un solo clic, y que SÍ tras el segundo.
const eliminarReunionMock = vi.fn()
vi.mock('@/db/reuniones', () => ({
  listarReuniones: () => listarReunionesMock(),
  eliminarReunion: (...args: unknown[]) => eliminarReunionMock(...args),
}))

const documentoDeReunionMock = vi.fn()
vi.mock('@/db/documentos', () => ({
  documentoDeReunion: (id: string) => documentoDeReunionMock(id),
  eliminarDocumentoDeReunion: vi.fn(),
}))

vi.mock('@/db/minutas', () => ({
  obtenerMinuta: vi.fn().mockResolvedValue(null),
}))

const { default: PagPreparar } = await import('./page')

// ---- fixtures ----

function reunion(datos: Partial<ReunionResumen> & { id: string }): ReunionResumen {
  return {
    salaSlug: 'neracode',
    salaNombre: 'NeraCode',
    salaColor: '#101010',
    fecha: '2026-07-10T18:00:00.000Z',
    titulo: 'Reunión',
    tipo: 'mensual',
    estado: 'agendada',
    noDadaEn: null,
    lugar: null,
    alcance: 'todos',
    participantes: [],
    tieneDocumento: false,
    tieneMinuta: false,
    archivos: 0,
    ...datos,
  }
}

/**
 * Un documento TERMINADO — y con contenido dentro.
 *
 * ⚠️ Llevaba `items: []`, y desde la ronda 13 eso ya no es un documento
 * terminado sino uno FANTASMA: `documentoCuentaComoPresentacion` exige estado
 * `listo` Y al menos una sección, justo para que un deck vacío no se ofrezca
 * como presentación (ver `dominio/reunion.ts` y el caso real de la reunión de
 * junio de Marketing United). El doble tenía que decir lo que dice su nombre:
 * un item basta.
 */
function documentoListo(): DocumentoCompleto {
  return {
    id: 'doc',
    reunionId: 'r',
    estado: 'listo',
    plantilla: null,
    items: [
      {
        id: 'i1', orden: 0, tipo: 'texto', titulo: 'Resumen', pregunta: '',
        contenido: {}, llenado: true, esBase: true, resultado: null,
      },
    ] as unknown as DocumentoCompleto['items'],
  }
}

// "Hoy" real del sistema (sin fake timers, mismo criterio que
// `cliente/[slug]/page.test.ts`): las fechas de fixtures de este archivo
// (julio 2026) quedan cómodamente en el pasado.

beforeEach(() => {
  exigirLecturaMock.mockReset().mockResolvedValue({ rol: 'equipo', rolApp: 'viewer', sub: 'equipo-mkt-corp' })
  listarReunionesMock.mockReset().mockResolvedValue([])
  documentoDeReunionMock.mockReset().mockResolvedValue(null)
  eliminarReunionMock.mockReset().mockResolvedValue(undefined)
})

/**
 * HALLAZGO 1 (parcial) DE LA REVISIÓN FINAL — "Anteriores" (antes "falta
 * minuta") tenía el mismo sesgo que "Levantar minuta": usaba `r.estado ===
 * 'dada'` a secas, mientras `/reuniones` ya deduce con `fueDada` — una
 * reunión `agendada` pero maquetada (documento LISTO) y con el día ya pasado
 * también cuenta, sin que nadie la haya confirmado a mano.
 *
 * REESCRITO EN LA TAREA 18: la etiqueta destino pasa de "Se dieron, falta su
 * minuta" a "Anteriores" — ese módulo (con "Reuniones cerradas") se muda a
 * `/reuniones`, y `/deck` se queda con "En preparación" + "Anteriores"
 * (Franco: "el deck designer solo debe tener las presentaciones en
 * preparación y presentaciones anteriores"). El comportamiento que este
 * hallazgo fija —lo deducido por `fueDada` cuenta igual— sigue vivo aquí
 * porque "Anteriores" usa el mismo `fueDada` como único gate.
 */
describe('PagPreparar (/deck) — "Anteriores" también cuenta lo deducido (hallazgo 1)', () => {
  it('una agendada maquetada (documento listo) cuyo día ya pasó aparece en "Anteriores", sin estar confirmada a mano', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-maquetada', titulo: 'Quincenal julio', fecha: '2026-07-10T18:00:00.000Z', estado: 'agendada', tieneDocumento: true }),
    ])
    documentoDeReunionMock.mockResolvedValue(documentoListo())

    render(await PagPreparar())

    expect(screen.getByText('Anteriores')).toBeInTheDocument()
    expect(screen.getByText('Quincenal julio')).toBeInTheDocument()
  })

  it('una agendada SIN respaldo (nada maquetado) no aparece ahí: sigue en preparación, no "dada"', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-sin-respaldo', titulo: 'Standup sin nada', fecha: '2026-07-10T18:00:00.000Z', estado: 'agendada' }),
    ])
    documentoDeReunionMock.mockResolvedValue(null)

    render(await PagPreparar())

    // Acotado a "Anteriores" (antes se comprobaba en todo el documento):
    // desde el arreglo del crítico 4 (auditoría 7-ago) "En preparación"
    // TAMBIÉN titula con el título de la reunión, así que "Standup sin nada"
    // ahora aparece ahí de forma legítima — lo que este test siempre quiso
    // decir es que no aparece en "Anteriores".
    const anteriores = screen.getByText('Anteriores').closest('section')!
    expect(within(anteriores).queryByText('Quincenal julio')).not.toBeInTheDocument()
    expect(within(anteriores).queryByText('Standup sin nada')).not.toBeInTheDocument()
  })
})

/**
 * TAREA 18 — "Anteriores" reemplaza a "Se dieron, falta su minuta" +
 * "Reuniones cerradas": Franco, el 6-ago, mirando la app desplegada: "el
 * deck designer solo debe tener las presentaciones en preparación y
 * presentaciones anteriores ligadas o no a una reunión". Un solo predicado
 * —`fueDada`, la misma fuente que ya usa "En preparación" para su mitad
 * negativa— decide qué está "antes": ya no importa si tiene minuta o no, esa
 * pregunta es de `/reuniones` ahora.
 */
describe('PagPreparar (/deck) — "Anteriores" absorbe "cerradas" y "falta minuta" (tarea 18)', () => {
  it('una reunión dada CON minuta aparece en "Anteriores" (antes vivía en "Reuniones cerradas")', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-cerrada', titulo: 'Estatus de julio', fecha: '2026-07-05T18:00:00.000Z', estado: 'dada', tieneMinuta: true, tieneDocumento: true }),
    ])
    documentoDeReunionMock.mockResolvedValue(documentoListo())

    render(await PagPreparar())

    const seccion = screen.getByText('Anteriores').closest('section')!
    expect(within(seccion).getByText('Estatus de julio')).toBeInTheDocument()
  })

  it('una reunión dada SIN minuta TAMBIÉN aparece en "Anteriores" — misma sección, no una aparte (antes "Se dieron, falta su minuta")', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-sin-minuta', titulo: 'Kickoff campaña Q3', fecha: '2026-07-08T18:00:00.000Z', estado: 'dada', tieneMinuta: false, tieneDocumento: true }),
    ])
    documentoDeReunionMock.mockResolvedValue(documentoListo())

    render(await PagPreparar())

    const seccion = screen.getByText('Anteriores').closest('section')!
    expect(within(seccion).getByText('Kickoff campaña Q3')).toBeInTheDocument()
  })

  it('las etiquetas viejas —"Se dieron, falta su minuta" y "Reuniones cerradas"— ya no existen: cada cosa en su pestaña', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-cerrada', titulo: 'Estatus de julio', fecha: '2026-07-05T18:00:00.000Z', estado: 'dada', tieneMinuta: true, tieneDocumento: true }),
      reunion({ id: 'r-sin-minuta', titulo: 'Kickoff campaña Q3', fecha: '2026-07-08T18:00:00.000Z', estado: 'dada', tieneMinuta: false, tieneDocumento: true }),
    ])
    documentoDeReunionMock.mockResolvedValue(documentoListo())

    render(await PagPreparar())

    expect(screen.queryByText(/se dieron, falta su minuta/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/reuniones cerradas/i)).not.toBeInTheDocument()
  })

  it('se ordena por fecha de la reunión, la más reciente primero ("se ordena por la presentación": hoy 1:1 con su reunión)', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-vieja', titulo: 'Estatus de junio', fecha: '2026-06-10T18:00:00.000Z', estado: 'dada', tieneMinuta: true, tieneDocumento: true }),
      reunion({ id: 'r-nueva', titulo: 'Estatus de julio', fecha: '2026-07-15T18:00:00.000Z', estado: 'dada', tieneMinuta: true, tieneDocumento: true }),
    ])
    documentoDeReunionMock.mockResolvedValue(documentoListo())

    render(await PagPreparar())

    const seccion = screen.getByText('Anteriores').closest('section')!
    const titulos = within(seccion).getAllByText(/^Estatus de (junio|julio)$/).map((n) => n.textContent)
    expect(titulos).toEqual(['Estatus de julio', 'Estatus de junio'])
  })

  // CORREGIDO (auditoría UX/UI 7-ago, importante 8): "Sin minuta" era texto
  // muerto — exactamente el patrón que la ronda 10 vino a matar en la sala
  // (ver CarasDeReunion.test.tsx, "minuta ausente"), sobreviviendo aquí. Este
  // test antes fijaba el defecto ("AccionesReunion, reusado sin cambios");
  // ahora fija el arreglo: el mismo enlace de verdad que ya usa la sala.
  it('una reunión sin minuta ofrece "+ Levantar minuta" — un enlace de verdad a /deck/{id}/minuta, no texto muerto', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-sin-minuta', titulo: 'Kickoff campaña Q3', fecha: '2026-07-08T18:00:00.000Z', estado: 'dada', tieneMinuta: false, tieneDocumento: true }),
    ])
    documentoDeReunionMock.mockResolvedValue(documentoListo())

    render(await PagPreparar())

    const seccion = screen.getByText('Anteriores').closest('section')!
    const enlace = within(seccion).getByRole('link', { name: /levantar minuta/i })
    expect(enlace).toHaveAttribute('href', '/deck/r-sin-minuta/minuta')
    expect(within(seccion).queryByText('Sin minuta')).not.toBeInTheDocument()
  })

  /**
   * LA REGLA DURA, TAMBIÉN AQUÍ: "En preparación" y "Anteriores" son las
   * DOS mitades de `fueDada` (`!fueDada` / `fueDada`) — una partición, no dos
   * listas que puedan coincidir. Mismo defecto, mismas dos pantallas
   * (hallazgo 2, más abajo) que ya se arregló una vez en esta ronda.
   */
  it('ninguna reunión sale en "En preparación" Y en "Anteriores" a la vez', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-en-prep', titulo: 'Standup sin nada', fecha: '2026-07-10T18:00:00.000Z', estado: 'agendada' }),
      reunion({ id: 'r-maquetada', titulo: 'Quincenal julio', fecha: '2026-07-10T18:00:00.000Z', estado: 'agendada', tieneDocumento: true }),
      reunion({ id: 'r-cerrada', titulo: 'Estatus de julio', fecha: '2026-07-05T18:00:00.000Z', estado: 'dada', tieneMinuta: true, tieneDocumento: true }),
    ])
    documentoDeReunionMock.mockImplementation((id: string) =>
      Promise.resolve(id === 'r-en-prep' ? null : documentoListo()),
    )

    render(await PagPreparar())

    // Por HREF, no por texto: aunque desde el arreglo del crítico 4
    // (auditoría 7-ago) las dos secciones titulan con el nombre de la
    // reunión — antes "En preparación" solo mostraba la sala, ver
    // `hrefsEnPreparacion` más abajo —, dos fixtures de este archivo pueden
    // compartir texto. El `/deck/{id}` de cada fila es el único
    // identificador que nunca colisiona entre las dos secciones.
    function hrefsDe(tituloSeccion: string): string[] {
      const seccion = screen.getByText(tituloSeccion).closest('section')!
      return within(seccion)
        .queryAllByRole('link')
        .map((a) => a.getAttribute('href'))
        .filter((href): href is string => href != null)
    }

    const enPrep = hrefsDe('En preparación')
    const anteriores = hrefsDe('Anteriores')

    expect(enPrep).toContain('/deck/r-en-prep')
    expect(anteriores).toContain('/deck/r-maquetada')
    expect(anteriores).toContain('/deck/r-cerrada')
    // Y nunca las dos a la vez: ningún href de una sección aparece en la otra.
    for (const href of enPrep) expect(anteriores).not.toContain(href)
    for (const href of anteriores) expect(enPrep).not.toContain(href)
  })
})

/**
 * HALLAZGO 2 DE LA REVISIÓN FINAL — "En preparación" perdió su segunda
 * mitad al migrar de sesión a reunión: antes de esta corrección era
 * `estado === 'agendada'` a secas, así que una agendada YA deducible como
 * dada (con respaldo y el día pasado) seguía en "En preparación" mientras
 * `/reuniones` ya la contaba en "Ya dadas este mes" — la misma reunión en dos
 * sitios que se contradicen.
 */
describe('PagPreparar (/deck) — "En preparación" no incluye lo que ya se cuenta como dado (hallazgo 2)', () => {
  /**
   * Identificar cada fila por su `href` (`/deck/{id}`, único por reunión),
   * no por texto: desde el arreglo del crítico 4 (auditoría 7-ago) "En
   * preparación" también titula con el nombre de la reunión —antes mostraba
   * solo `s.salaNombre`, ver el describe de más abajo—, así que dos
   * fixtures de este archivo podrían compartir título sin que eso sea un
   * error. El `href` nunca colisiona.
   */
  function hrefsEnPreparacion(): string[] {
    const seccion = screen.getByText('En preparación').closest('section')!
    // `queryAllByRole`, no `getAllByRole`: el caso de éxito de más de un test
    // de aquí abajo es precisamente que la lista quede VACÍA (el vacío
    // "Nada en preparación todavía" no lleva ningún link) — `getAllByRole`
    // lanza cuando no encuentra nada, `queryAllByRole` devuelve `[]`.
    return within(seccion)
      .queryAllByRole('link')
      .map((a) => a.getAttribute('href'))
      .filter((href): href is string => href != null)
  }

  it('una agendada maquetada (con respaldo, día pasado) NO sale en "En preparación"', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-maquetada', titulo: 'Quincenal julio', fecha: '2026-07-10T18:00:00.000Z', estado: 'agendada', tieneDocumento: true }),
    ])
    documentoDeReunionMock.mockResolvedValue(documentoListo())

    render(await PagPreparar())

    expect(hrefsEnPreparacion()).not.toContain('/deck/r-maquetada')
  })

  it('una agendada SIN respaldo todavía sigue en "En preparación"', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-sin-respaldo', titulo: 'Standup sin nada', fecha: '2026-07-10T18:00:00.000Z', estado: 'agendada' }),
    ])
    documentoDeReunionMock.mockResolvedValue(null)

    render(await PagPreparar())

    expect(hrefsEnPreparacion()).toContain('/deck/r-sin-respaldo')
  })

  it('una futura (agendada, sin pasar su día) sigue en "En preparación" aunque esté maquetada', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-futura', titulo: 'Planeación futura', fecha: '2030-01-15T18:00:00.000Z', estado: 'agendada', tieneDocumento: true }),
    ])
    documentoDeReunionMock.mockResolvedValue(documentoListo())

    render(await PagPreparar())

    expect(hrefsEnPreparacion()).toContain('/deck/r-futura')
  })
})

/**
 * AUDITORÍA UX/UI — 7 de agosto de 2026
 * (`docs/superpowers/specs/2026-08-07-auditoria-ux-ui.md`). Los describe de
 * aquí abajo fijan el crítico 4 y la parte del importante 6 que le toca a
 * esta página.
 */

/**
 * CRÍTICO 4 — "Eliminar" tenía el mismo peso visual que "Descargar": las
 * tres acciones de una fila de "Anteriores" compartían tono y tamaño, sin
 * nada que marcara cuál de las tres borra la reunión ENTERA. El arreglo real
 * es visual (`.accionBorrar` pasa a los tokens `--alerta`/`--alerta-suave`
 * de `deck.module.css` — los mismos que ya usa `.botonPeligro`, no un rojo
 * inventado aparte) y no hay forma honesta de afirmar eso con un test de
 * jsdom, que no calcula estilos reales.
 *
 * Lo que SÍ se puede fijar con un test —y es la otra mitad del hallazgo,
 * "está a un clic"— es que borrar de verdad exige el paso deliberado que ya
 * ofrecían `AccionesReunion` y `BorrarBorrador` (dos tiempos: "Eliminar"
 * arma la confirmación con lo que se pierde escrito, "Sí, borrar" ejecuta).
 * Ninguno de los dos tenía test propio hasta ahora — así que esta suite
 * también sirvió para confirmar, ya en rojo-antes-de-tocar-nada, que el gate
 * de dos pasos existía de verdad y no solo en apariencia.
 */
describe('PagPreparar (/deck) — borrar exige un paso deliberado, no un clic suelto (auditoría 7-ago, crítico 4)', () => {
  it('"Anteriores": un clic en "Eliminar" NO borra — arma la confirmación; hace falta "Sí, borrar"', async () => {
    const usuario = userEvent.setup()
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-cerrada', titulo: 'Estatus de julio', fecha: '2026-07-05T18:00:00.000Z', estado: 'dada', tieneMinuta: true, tieneDocumento: true }),
    ])
    documentoDeReunionMock.mockResolvedValue(documentoListo())

    render(await PagPreparar())
    const seccion = screen.getByText('Anteriores').closest('section')!

    await usuario.click(within(seccion).getByRole('button', { name: /eliminar/i }))

    // El primer clic solo arma la confirmación: todavía no se llamó.
    expect(eliminarReunionMock).not.toHaveBeenCalled()
    expect(within(seccion).getByText(/se borran la reunión, su documento y su minuta/i)).toBeInTheDocument()

    await usuario.click(within(seccion).getByRole('button', { name: /^sí, borrar$/i }))

    await waitFor(() => expect(eliminarReunionMock).toHaveBeenCalledWith('r-cerrada', expect.any(Function)))
  })

  it('"Anteriores": "Cancelar" vuelve atrás sin borrar nada', async () => {
    const usuario = userEvent.setup()
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-cerrada', titulo: 'Estatus de julio', fecha: '2026-07-05T18:00:00.000Z', estado: 'dada', tieneMinuta: true, tieneDocumento: true }),
    ])
    documentoDeReunionMock.mockResolvedValue(documentoListo())

    render(await PagPreparar())
    const seccion = screen.getByText('Anteriores').closest('section')!

    await usuario.click(within(seccion).getByRole('button', { name: /eliminar/i }))
    await usuario.click(within(seccion).getByRole('button', { name: /cancelar/i }))

    expect(eliminarReunionMock).not.toHaveBeenCalled()
    expect(within(seccion).getByRole('button', { name: /eliminar/i })).toBeInTheDocument()
  })

  it('"En preparación" (BorrarBorrador): el mismo gate de dos tiempos', async () => {
    const usuario = userEvent.setup()
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-borrador', salaNombre: 'UiX', titulo: 'Quincenal UiX', fecha: '2026-07-10T18:00:00.000Z', estado: 'agendada' }),
    ])
    documentoDeReunionMock.mockResolvedValue(null)

    render(await PagPreparar())
    const seccion = screen.getByText('En preparación').closest('section')!

    await usuario.click(within(seccion).getByRole('button', { name: /eliminar/i }))
    expect(eliminarReunionMock).not.toHaveBeenCalled()

    await usuario.click(within(seccion).getByRole('button', { name: /^sí, borrar$/i }))
    await waitFor(() => expect(eliminarReunionMock).toHaveBeenCalledWith('r-borrador', expect.any(Function)))
  })
})

/**
 * IMPORTANTE 6 (mitad 1) — "Las dos mitades de Presentaciones no hablan
 * igual": "En preparación" titulaba con el nombre de la SALA y dejaba el
 * título de la reunión sin mostrar en ningún sitio; "Anteriores" siempre
 * tituló con el título de la reunión. Es la misma pantalla — ahora titulan
 * igual, y la sala pasa a ser el dato secundario (no desaparece).
 */
describe('PagPreparar (/deck) — "En preparación" titula con el nombre de la reunión (auditoría 7-ago, importante 6)', () => {
  it('muestra el título de la reunión como texto principal; antes solo mostraba el nombre de la sala', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-1', salaNombre: 'UiX', titulo: 'Quincenal UiX · Agosto', fecha: '2026-07-10T18:00:00.000Z', estado: 'agendada' }),
    ])
    documentoDeReunionMock.mockResolvedValue(null)

    render(await PagPreparar())

    const seccion = screen.getByText('En preparación').closest('section')!
    expect(within(seccion).getByText('Quincenal UiX · Agosto')).toBeInTheDocument()
    // La sala no desaparece: pasa a dato secundario, no se pierde información.
    expect(within(seccion).getByText('UiX')).toBeInTheDocument()
  })
})

/**
 * IMPORTANTE 6 (mitad 2) — "En preparación" etiquetaba cada fila como
 * "agendada": el estado de la JUNTA, no del documento. Como esta sección es
 * por definición solo reuniones `agendada` (ver el filtro de
 * `enPreparacion` en `page.tsx`), esa etiqueta era CONSTANTE en el 100% de
 * las filas — cero información, y encima el eje equivocado. Lo que importa
 * en Presentaciones es si el documento está en borrador o listo: mismo eje
 * y mismas palabras que ya usa `/deck/[id]/page.tsx`.
 */
describe('PagPreparar (/deck) — "En preparación" etiqueta el DOCUMENTO, no la junta (auditoría 7-ago, importante 6)', () => {
  it('sin nada maquetado, la etiqueta es "borrador"', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-vacia', titulo: 'Sin nada aún', fecha: '2026-07-10T18:00:00.000Z', estado: 'agendada' }),
    ])
    documentoDeReunionMock.mockResolvedValue(null)

    render(await PagPreparar())

    const seccion = screen.getByText('En preparación').closest('section')!
    expect(within(seccion).getByText('borrador')).toBeInTheDocument()
    expect(within(seccion).queryByText('agendada')).not.toBeInTheDocument()
  })

  it('maquetada (documento listo, aún sin pasar su día) se etiqueta "listo"', async () => {
    listarReunionesMock.mockResolvedValue([
      reunion({ id: 'r-futura-lista', titulo: 'Ya maquetada', fecha: '2030-01-15T18:00:00.000Z', estado: 'agendada', tieneDocumento: true }),
    ])
    documentoDeReunionMock.mockResolvedValue(documentoListo())

    render(await PagPreparar())

    const seccion = screen.getByText('En preparación').closest('section')!
    expect(within(seccion).getByText('listo')).toBeInTheDocument()
    expect(within(seccion).queryByText('agendada')).not.toBeInTheDocument()
  })
})
