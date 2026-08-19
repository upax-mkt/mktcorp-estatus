import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReunionesSala } from './ReunionesSala'
import type { Reunion } from '@/dominio/reunion'
import type { Participante } from '@/db/participacion'

// La subida de "+ Subir presentación" va del navegador DIRECTO a Blob (ver
// `ArchivosSala.tsx`, de donde se extrajo `subirArchivoDirecto` para esta
// misma tarea, 9b) — se dobla igual que `page.test.ts` la dobla para
// `ArchivosSala`.
vi.mock('@vercel/blob/client', () => ({
  upload: vi.fn().mockResolvedValue({ pathname: 'salas/research-land/presentacion/prueba.pdf' }),
}))

/**
 * LA LÍNEA DE PARTICIPACIÓN EN LA SALA ES SOLO DE EQUIPO (ronda 10).
 *
 * Esto complementa —no sustituye— el test de `page.test.ts` que comprueba
 * que `participantesDe` ni siquiera se llama para un director: aquí se fija
 * la DEFENSA DOBLE del propio componente, para el caso en que
 * `participacionPorReunion` llegara poblado de todas formas (no debería, pero
 * un componente 'use client' no puede confiar en que su llamador nunca se
 * equivoque). Con `equipo=false`, `ReunionesSala` se niega a pintar la línea
 * aunque el mapa traiga nombres.
 *
 * MIGRADO A `Reunion` (`dominio/reunion.ts`) EN LA TAREA 7: las fijas de aquí
 * solo ejercitan la línea de participación, no `Caras` (intacta hasta la
 * Tarea 9), así que `documentoListo`/`archivos`/`acuerdos` se dejan en su
 * valor más simple — lo que importa es el `id`, que es ahora la clave del
 * mapa de participación.
 */

const P = (nombre: string): Participante => ({
  correo: `${nombre.toLowerCase()}@x.mx`,
  nombre,
  ediciones: 3,
  presento: true,
  ultimaEdicion: new Date('2026-07-20'),
})

const BASE = { tipo: 'mensual' as const, estado: 'dada' as const, noDadaEn: null, plantilla: null, documentoListo: true, archivos: [], acuerdos: [] }
const ULTIMA: Reunion = { ...BASE, id: 's1', fecha: '2026-07-15T10:00:00.000Z', titulo: 'Julio' }
const ANTERIOR: Reunion = { ...BASE, id: 's0', fecha: '2026-06-15T10:00:00.000Z', titulo: 'Junio' }

// Props nuevas de la Tarea 9b, sin las que `ReunionesSala` no compila: los
// tests de participación de arriba no las ejercitan, así que llevan un
// valor de relleno inerte — el propio describe de subida (más abajo) es
// quien de verdad las pone a prueba.
const SALA_SLUG = 'research-land'
const registrarArchivoActionNoop = vi.fn().mockResolvedValue({})

describe('ReunionesSala — participación de equipo', () => {
  it('equipo, con datos: pinta quién preparó y quién presentó en la reunión destacada', () => {
    render(
      <ReunionesSala porVenir={[]}
        reuniones={[ULTIMA]}
        equipo
        participacionPorReunion={{ s1: [P('Iris')] }}
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoActionNoop}
      />,
    )
    expect(screen.getByText('Cargada por: Iris')).toBeInTheDocument()
  })

  it('equipo, con datos: también la pinta en una reunión anterior (fila compacta)', () => {
    render(
      <ReunionesSala porVenir={[]}
        reuniones={[ULTIMA, ANTERIOR]}
        equipo
        participacionPorReunion={{ s0: [P('César')] }}
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoActionNoop}
      />,
    )
    // s1 (la destacada) no tiene entrada en el mapa: no debe pintar nada de
    // más para ella, solo para s0.
    expect(screen.getByText('Cargada por: César')).toBeInTheDocument()
  })

  it('director (equipo=false): NO se pinta, aunque el mapa traiga nombres', () => {
    // En la app real esto nunca ocurre —page.tsx no llama a participantesDe
    // para un director, así que el mapa llega vacío—, pero el propio
    // componente tiene que sostener la regla por su cuenta.
    render(
      <ReunionesSala porVenir={[]}
        reuniones={[ULTIMA]}
        equipo={false}
        participacionPorReunion={{ s1: [P('Iris')] }}
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoActionNoop}
      />,
    )
    expect(screen.queryByText(/Cargada por/)).toBeNull()
    expect(screen.queryByText(/Iris/)).toBeNull()
  })

  it('equipo, pero sin nadie que haya tocado esta sesión todavía: no pinta nada de más', () => {
    render(
      <ReunionesSala porVenir={[]}
        reuniones={[ULTIMA]}
        equipo
        participacionPorReunion={{}}
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoActionNoop}
      />,
    )
    expect(screen.queryByText(/Cargada por/)).toBeNull()
  })

  it('equipo, sin el prop siquiera (default): no revienta y no pinta nada', () => {
    render(
      <ReunionesSala porVenir={[]}
        reuniones={[ULTIMA]}
        equipo
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoActionNoop}
      />,
    )
    expect(screen.queryByText(/Cargada por/)).toBeNull()
  })
})

describe('ReunionesSala — jerarquía de lectura compartida', () => {
  it.each([
    { modo: 'editor', equipo: true },
    { modo: 'viewer', equipo: false },
  ])('en $modo expone el historial como una región y cada reunión como artículo', ({ equipo }) => {
    render(
      <ReunionesSala
        porVenir={[]}
        reuniones={[ULTIMA]}
        equipo={equipo}
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoActionNoop}
      />,
    )

    const historial = screen.getByRole('region', { name: /historial de reuniones/i })
    const reunion = within(historial).getByRole('article', { name: /julio/i })

    expect(within(reunion).getByRole('heading', { name: 'Julio', level: 3 })).toBeInTheDocument()
    expect(within(reunion).getByText(/15 de julio de 2026/i).closest('time')).toHaveAttribute(
      'dateTime',
      ULTIMA.fecha,
    )
  })

  it('separa las próximas reuniones del historial con una región y un artículo propios', () => {
    const futura: Reunion = {
      ...ULTIMA,
      id: 'proxima',
      titulo: 'Revisión de septiembre',
      fecha: '2026-09-04T10:00:00.000Z',
      estado: 'agendada',
      documentoListo: false,
    }

    render(
      <ReunionesSala
        porVenir={[futura]}
        reuniones={[]}
        equipo={false}
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoActionNoop}
      />,
    )

    const proximas = screen.getByRole('region', { name: /próximas reuniones/i })
    expect(within(proximas).getByRole('article', { name: /revisión de septiembre/i })).toBeInTheDocument()
  })
})

/**
 * LA CLASE DE JUNTA LLEGA AL MÓDULO Y LO AGRUPA (ronda 14.3, tarea 1).
 *
 * `reuniones.plantilla` (`src/secciones/plantillas.ts`) ya se guardaba —lo
 * que faltaba era que este módulo la usara. Tres preguntas, en este orden:
 *
 * 1. ¿Se ve la clase de cada junta, sin inventar una cuando no la tiene?
 *    `obtenerPlantilla(null)` cae a la PRIMERA del catálogo por diseño —eso
 *    es lo que necesita el editor para no dejar un desplegable vacío—, pero
 *    usarla a secas aquí pintaría "Estatus de UDN" sobre una junta sin
 *    clasificar: un dato inventado en una pantalla que ve el director.
 * 2. ¿"La última" es la más reciente DE CADA CLASE, no una sola global?
 * 3. ¿Las anteriores se reparten en una columna por clase, con su conteo, en
 *    el orden del catálogo, y sin pintar una columna vacía?
 *
 * `BASE`/`PROPS` son LOCALES a este describe (no los de arriba): los de
 * arriba no traen `id`/`fecha`/`titulo` fijos —cada test viejo los pone a
 * mano— y aquí la mayoría de los tests solo necesita variar `plantilla`,
 * así que un `BASE` completo reduce el ruido. `equipo: false`: la clase de
 * junta es información que también ve el director, así que estos tests
 * corren en la vista más restrictiva —si se ve ahí, se ve en las dos.
 */
describe('ReunionesSala — la clase de junta agrupa el módulo (ronda 14.3, tarea 1)', () => {
  const BASE: Reunion = {
    id: 'r1',
    fecha: '2026-08-01T10:00:00.000Z',
    titulo: 'Reunión de prueba',
    tipo: 'mensual',
    estado: 'dada',
    noDadaEn: null,
    plantilla: null,
    documentoListo: false,
    archivos: [],
    acuerdos: [],
  }
  const PROPS = {
    porVenir: [] as Reunion[],
    equipo: false,
    salaSlug: SALA_SLUG,
    registrarArchivoAction: registrarArchivoActionNoop,
  }

  it('cada reunión enseña de qué clase es', () => {
    render(<ReunionesSala {...PROPS} reuniones={[{ ...BASE, plantilla: 'sync-comercial' }]} />)

    expect(screen.getByText(/sync comercial/i)).toBeInTheDocument()
  })

  it('una junta sin clase lo dice, en vez de fingir una', () => {
    render(<ReunionesSala {...PROPS} reuniones={[{ ...BASE, plantilla: null }]} />)

    expect(screen.getByText(/sin clasificar/i)).toBeInTheDocument()
    // Y NO se le pega la primera del catálogo:
    expect(screen.queryByText(/estatus de udn/i)).toBeNull()
  })

  it('"la última" es la más reciente DE CADA CLASE, no una sola', () => {
    render(
      <ReunionesSala
        {...PROPS}
        reuniones={[
          { ...BASE, id: 'e1', plantilla: 'estatus-udn', fecha: '2026-08-12T10:00:00Z', titulo: 'Estatus Julio' },
          { ...BASE, id: 's1', plantilla: 'sync-comercial', fecha: '2026-08-14T10:00:00Z', titulo: 'Sync Semana 33' },
          { ...BASE, id: 's0', plantilla: 'sync-comercial', fecha: '2026-08-07T10:00:00Z', titulo: 'Sync Semana 32' },
        ]}
      />,
    )

    // Las dos más recientes de su clase, destacadas; la vieja del sync no.
    const ultimas = screen.getByTestId('ultimas-por-clase')
    expect(within(ultimas).getByText(/Estatus Julio/)).toBeInTheDocument()
    expect(within(ultimas).getByText(/Sync Semana 33/)).toBeInTheDocument()
    expect(within(ultimas).queryByText(/Sync Semana 32/)).toBeNull()
  })

  it('las anteriores se reparten en una columna por clase, con su conteo', () => {
    render(
      <ReunionesSala
        {...PROPS}
        reuniones={[
          { ...BASE, id: 'e1', plantilla: 'estatus-udn', fecha: '2026-08-14T10:00:00Z', titulo: 'Estatus agosto' },
          { ...BASE, id: 'e2', plantilla: 'estatus-udn', fecha: '2026-07-14T10:00:00Z', titulo: 'Estatus julio' },
          { ...BASE, id: 'e3', plantilla: 'estatus-udn', fecha: '2026-06-14T10:00:00Z', titulo: 'Estatus junio' },
          { ...BASE, id: 's1', plantilla: 'sync-comercial', fecha: '2026-08-13T10:00:00Z', titulo: 'Sync semana 33' },
          { ...BASE, id: 's0', plantilla: 'sync-comercial', fecha: '2026-08-06T10:00:00Z', titulo: 'Sync semana 32' },
        ]}
      />,
    )

    // Dos columnas — "estatus agosto"/"sync semana 33" ya salieron como
    // últimas, así que cada columna se queda con lo que sobra: dos de
    // estatus, una de sync. El conteo se valida a ojo en las capturas del
    // informe (Step 6): aquí, con dígitos sueltos, un `getByText(/2/)`
    // también encontraría el "2" de "26" en una fecha — un falso positivo
    // que no prueba nada.
    const grupoEstatus = screen.getByRole('group', { name: /estatus de udn/i })
    const grupoSync = screen.getByRole('group', { name: /sync comercial/i })
    expect(within(grupoEstatus).getByText('Estatus julio')).toBeInTheDocument()
    expect(within(grupoEstatus).getByText('Estatus junio')).toBeInTheDocument()
    expect(within(grupoEstatus).queryByText('Estatus agosto')).toBeNull()
    expect(within(grupoSync).getByText('Sync semana 32')).toBeInTheDocument()
    expect(within(grupoSync).queryByText('Sync semana 33')).toBeNull()
  })

  it('una clase sin ninguna reunión anterior no pinta columna vacía', () => {
    render(
      <ReunionesSala
        {...PROPS}
        reuniones={[
          { ...BASE, id: 'e1', plantilla: 'estatus-udn', fecha: '2026-08-14T10:00:00Z', titulo: 'Estatus reciente' },
          { ...BASE, id: 'e2', plantilla: 'estatus-udn', fecha: '2026-07-14T10:00:00Z', titulo: 'Estatus viejo' },
        ]}
      />,
    )

    expect(screen.getByRole('group', { name: /estatus de udn/i })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /sync comercial/i })).toBeNull()
  })

  it('"Sin clasificar" va al final, detrás de las clases reales del catálogo', () => {
    render(
      <ReunionesSala
        {...PROPS}
        reuniones={[
          { ...BASE, id: 'n1', plantilla: null, fecha: '2026-08-10T10:00:00Z', titulo: 'Sin clase reciente' },
          { ...BASE, id: 'n2', plantilla: null, fecha: '2026-07-10T10:00:00Z', titulo: 'Sin clase vieja' },
          { ...BASE, id: 'e1', plantilla: 'estatus-udn', fecha: '2026-08-14T10:00:00Z', titulo: 'Estatus reciente' },
          { ...BASE, id: 'e2', plantilla: 'estatus-udn', fecha: '2026-07-14T10:00:00Z', titulo: 'Estatus viejo' },
        ]}
      />,
    )

    const rotulos = screen
      .getAllByRole('group')
      .map((g) => within(g).getByRole('heading', { level: 3 }).textContent)
    expect(rotulos.at(-1)).toMatch(/sin clasificar/i)
  })

  it('con una sola clase en toda la sala (el caso real de hoy), sigue habiendo una "última" y una columna de anteriores', () => {
    render(
      <ReunionesSala
        {...PROPS}
        reuniones={[
          { ...BASE, id: 'e1', plantilla: 'estatus-udn', fecha: '2026-08-14T10:00:00Z', titulo: 'Estatus agosto' },
          { ...BASE, id: 'e2', plantilla: 'estatus-udn', fecha: '2026-07-14T10:00:00Z', titulo: 'Estatus julio' },
        ]}
      />,
    )

    const ultimas = screen.getByTestId('ultimas-por-clase')
    expect(within(ultimas).getByText('Estatus agosto')).toBeInTheDocument()
    const grupo = screen.getByRole('group', { name: /estatus de udn/i })
    expect(within(grupo).getByText('Estatus julio')).toBeInTheDocument()
    // Una sola columna: no hay una segunda clase de la que distinguirse.
    expect(screen.getAllByRole('group')).toHaveLength(1)
  })

  /**
   * I3 (revisión de la ronda 14.3): las tarjetas "La última" se ordenaban
   * por CATÁLOGO —el mismo orden que usan las columnas de "Anteriores"—, así
   * que con dos clases la tarjeta de la izquierda no era necesariamente la
   * más nueva. `estatus-udn` va primero en `PLANTILLAS`, pero aquí la de
   * `sync-comercial` es dos días más reciente: tiene que encabezar.
   */
  it('las tarjetas "La última" se ordenan por fecha, no por el orden del catálogo', () => {
    render(
      <ReunionesSala
        {...PROPS}
        reuniones={[
          { ...BASE, id: 'e1', plantilla: 'estatus-udn', fecha: '2026-08-12T10:00:00Z', titulo: 'Estatus Julio' },
          { ...BASE, id: 's1', plantilla: 'sync-comercial', fecha: '2026-08-14T10:00:00Z', titulo: 'Sync Semana 33' },
        ]}
      />,
    )

    const ultimas = screen.getByTestId('ultimas-por-clase')
    const titulos = within(ultimas).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(titulos).toEqual(['Sync Semana 33', 'Estatus Julio'])
  })

  /**
   * `esClaseDeJunta` (revisión de la ronda 14.3, hallazgo menor): 'en-blanco'
   * es la salida de emergencia del catálogo, no una clase de junta —ver su
   * comentario en `secciones/plantillas.ts`—, así que una reunión con esa
   * plantilla se agrupa y se etiqueta EXACTAMENTE igual que una sin clase:
   * "Sin clasificar", nunca "En blanco". El dato es real (`mexa-creativa`
   * tiene reuniones así hoy en producción, verificado contra la base).
   */
  it('"en-blanco" no es una clase de junta: se ve y se agrupa como "Sin clasificar"', () => {
    render(
      <ReunionesSala
        {...PROPS}
        reuniones={[{ ...BASE, id: 'b1', plantilla: 'en-blanco', fecha: '2026-08-01T10:00:00.000Z', titulo: 'Deck libre' }]}
      />,
    )

    expect(screen.getByText(/sin clasificar/i)).toBeInTheDocument()
    expect(screen.queryByText(/en blanco/i)).toBeNull()
  })
})

/**
 * "+ SUBIR PRESENTACIÓN" DE VERDAD SUBE (ronda 10, tarea 9b).
 *
 * La Tarea 9 dejó el hueco (`onSubirPresentacion?: (reunion: Reunion) =>
 * void`, sin nadie que lo llenara); la Tarea 11 dejó el otro extremo listo
 * (`registrarArchivoAction` ya acepta y reenvía `reunionId`). Nadie los
 * unió — el botón se veía, se pulsaba, y no pasaba nada, peor que el texto
 * muerto que vino a sustituir.
 *
 * El flujo vive AQUÍ, no en `CarasDeReunion` (que solo pide el clic, según
 * su propio comentario de cabecera): un input de archivo compartido, oculto,
 * disparado programáticamente por el botón de LA fila que se pulsó — el
 * mismo mecanismo de subida que `ArchivosSala` (`subirArchivoDirecto`,
 * extraída de ahí en esta misma tarea), con `categoria: 'presentacion'` y el
 * `reunionId`/`fecha` de esa reunión en concreto.
 *
 * El test central de la tarea: el `reunionId` que llega a la acción es el de
 * la fila que se pulsó, NO nulo y NO el de otra — se prueba pulsando la fila
 * ANTERIOR (no la destacada), que es donde un cableado por accidente
 * ("siempre la primera reunión") se delataría.
 */
describe('ReunionesSala — subir presentación (ronda 10, tarea 9b)', () => {
  const SIN_PRESENTACION_ULTIMA: Reunion = {
    ...BASE, id: 's1', fecha: '2026-07-15T10:00:00.000Z', titulo: 'Julio', documentoListo: false, archivos: [],
  }
  const SIN_PRESENTACION_ANTERIOR: Reunion = {
    ...BASE, id: 's0', fecha: '2026-06-15T10:00:00.000Z', titulo: 'Junio', documentoListo: false, archivos: [],
  }

  it('sube el archivo de LA reunión anterior que se pulsó, con SU reunionId y SU fecha — no nulo, no el de otra', async () => {
    const usuario = userEvent.setup()
    const registrarArchivoAction = vi.fn().mockResolvedValue({})

    render(
      <ReunionesSala porVenir={[]}
        reuniones={[SIN_PRESENTACION_ULTIMA, SIN_PRESENTACION_ANTERIOR]}
        equipo
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoAction}
      />,
    )

    const botones = screen.getAllByRole('button', { name: /subir presentación/i })
    expect(botones).toHaveLength(2)
    await usuario.click(botones[1]) // la fila anterior (s0), no la destacada

    const entradaArchivo = document.querySelector('input[type="file"]')
    if (!(entradaArchivo instanceof HTMLInputElement)) throw new Error('No se encontró el input de archivo.')
    const archivo = new File(['contenido'], 'quincenal-junio.pdf', { type: 'application/pdf' })
    await usuario.upload(entradaArchivo, archivo)

    await waitFor(() => expect(registrarArchivoAction).toHaveBeenCalled())
    expect(registrarArchivoAction).toHaveBeenCalledWith(
      expect.objectContaining({
        categoria: 'presentacion',
        reunionId: 's0',
        fecha: SIN_PRESENTACION_ANTERIOR.fecha,
        nombreOriginal: 'quincenal-junio.pdf',
      }),
    )
  })

  it('sube el archivo de LA reunión destacada que se pulsó, con SU reunionId — la primera fila no es un default fijo', async () => {
    const usuario = userEvent.setup()
    const registrarArchivoAction = vi.fn().mockResolvedValue({})

    render(
      <ReunionesSala porVenir={[]}
        reuniones={[SIN_PRESENTACION_ULTIMA, SIN_PRESENTACION_ANTERIOR]}
        equipo
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoAction}
      />,
    )

    const botones = screen.getAllByRole('button', { name: /subir presentación/i })
    await usuario.click(botones[0]) // la fila destacada (s1)

    const entradaArchivo = document.querySelector('input[type="file"]')
    if (!(entradaArchivo instanceof HTMLInputElement)) throw new Error('No se encontró el input de archivo.')
    const archivo = new File(['contenido'], 'quincenal-julio.pdf', { type: 'application/pdf' })
    await usuario.upload(entradaArchivo, archivo)

    await waitFor(() => expect(registrarArchivoAction).toHaveBeenCalled())
    expect(registrarArchivoAction).toHaveBeenCalledWith(
      expect.objectContaining({ reunionId: 's1', fecha: SIN_PRESENTACION_ULTIMA.fecha }),
    )
  })

  it('si la acción devuelve error, se enseña junto a la fila — no se traga en silencio', async () => {
    const usuario = userEvent.setup()
    const registrarArchivoAction = vi.fn().mockResolvedValue({ error: 'No se pudo registrar el archivo.' })

    render(
      <ReunionesSala porVenir={[]}
        reuniones={[SIN_PRESENTACION_ULTIMA]}
        equipo
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoAction}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: /subir presentación/i }))
    const entradaArchivo = document.querySelector('input[type="file"]')
    if (!(entradaArchivo instanceof HTMLInputElement)) throw new Error('No se encontró el input de archivo.')
    await usuario.upload(entradaArchivo, new File(['contenido'], 'deck.pdf', { type: 'application/pdf' }))

    expect(await screen.findByText('No se pudo registrar el archivo.')).toBeInTheDocument()
  })

  /**
   * REVISIÓN FINAL DE LA RONDA 10: "Subiendo…" y el error de subida eran
   * `<p>` sin región viva — un lector de pantalla no se enteraba de que algo
   * estaba pasando, ni de que algo salió mal, a menos que fuera a buscarlo.
   * Mismo patrón que ya usa el resto de la app: `role="alert"` para el error
   * (ReunionesPorConfirmar, Estrella) y `aria-live="polite"` para el estado
   * de progreso (EditorSeccion.estadoGuardado).
   */
  it('el error de subida es una región viva (role="alert"), no un <p> mudo', async () => {
    const usuario = userEvent.setup()
    const registrarArchivoAction = vi.fn().mockResolvedValue({ error: 'No se pudo registrar el archivo.' })

    render(
      <ReunionesSala porVenir={[]}
        reuniones={[SIN_PRESENTACION_ULTIMA]}
        equipo
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoAction}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: /subir presentación/i }))
    const entradaArchivo = document.querySelector('input[type="file"]')
    if (!(entradaArchivo instanceof HTMLInputElement)) throw new Error('No se encontró el input de archivo.')
    await usuario.upload(entradaArchivo, new File(['contenido'], 'deck.pdf', { type: 'application/pdf' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo registrar el archivo.')
  })

  it('mientras sube, "Subiendo…" es una región viva (aria-live="polite"), no un <p> mudo', async () => {
    const usuario = userEvent.setup()
    let liberar: (valor: { error?: string }) => void = () => {}
    const registrarArchivoAction = vi.fn(
      () => new Promise<{ error?: string }>((resolve) => { liberar = resolve }),
    )

    render(
      <ReunionesSala porVenir={[]}
        reuniones={[SIN_PRESENTACION_ULTIMA]}
        equipo
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoAction}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: /subir presentación/i }))
    const entradaArchivo = document.querySelector('input[type="file"]')
    if (!(entradaArchivo instanceof HTMLInputElement)) throw new Error('No se encontró el input de archivo.')
    await usuario.upload(entradaArchivo, new File(['contenido'], 'deck.pdf', { type: 'application/pdf' }))

    const aviso = await screen.findByText('Subiendo…')
    expect(aviso).toHaveAttribute('aria-live', 'polite')

    // Se libera para no dejar una promesa colgando entre tests.
    liberar({})
    await waitFor(() => expect(screen.queryByText('Subiendo…')).toBeNull())
  })
})

/**
 * LOS ACUERDOS DE UNA REUNIÓN SE VEN EN SU FILA.
 *
 * Franco lo pidió con estas palabras: "la minuta con un link a ver los
 * acuerdos de esa reu, se puede desplegar ahí mismo".
 *
 * `AcuerdosDeReunion` se escribió y se probó en la tarea 10 — y se quedó sin
 * montar en ninguna pantalla hasta la revisión final. Estaba completo, tenía
 * su CSS y sus tests en verde, y los datos ya le llegaban: solo faltaba que
 * alguien lo llamara. Es el segundo caso de la misma ronda en que dos tareas
 * construyen cada extremo de un puente y nadie lo une.
 *
 * Estos tests son la costura, no el componente: comprueban que ESTÁ montado,
 * en la destacada y en las anteriores. Sus propias reglas —el vacío que no
 * pinta nada, el singular, el "por definir"— viven en AcuerdosDeReunion.test.
 */
describe('ReunionesSala — los acuerdos cuelgan de su reunión', () => {
  const ACUERDO = {
    id: 'a1',
    que: 'Cruce de paid media con el equipo de César',
    responsable: 'Fernando',
    estatus: 'abierto' as const,
    fechaCompromiso: '2026-08-08',
  }

  it('la reunión destacada despliega los suyos', () => {
    render(
      <ReunionesSala porVenir={[]}
        reuniones={[{ ...ULTIMA, acuerdos: [ACUERDO] }]}
        equipo
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoActionNoop}
      />,
    )

    expect(screen.getByText(/1 acuerdo/)).toBeInTheDocument()
    expect(screen.getByText(/Cruce de paid media/)).toBeInTheDocument()
  })

  it('una reunión anterior también, no solo la última', () => {
    render(
      <ReunionesSala porVenir={[]}
        reuniones={[ULTIMA, { ...ANTERIOR, acuerdos: [ACUERDO] }]}
        equipo
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoActionNoop}
      />,
    )

    expect(screen.getByText(/Cruce de paid media/)).toBeInTheDocument()
  })

  it('los acuerdos de una reunión no se cuelan en otra', () => {
    render(
      <ReunionesSala porVenir={[]}
        reuniones={[{ ...ULTIMA, acuerdos: [ACUERDO] }, ANTERIOR]}
        equipo
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoActionNoop}
      />,
    )

    // Uno solo: si el desplegable se pintara con la lista entera en vez de
    // con la de su reunión, saldría dos veces.
    expect(screen.getAllByText(/Cruce de paid media/)).toHaveLength(1)
  })

  it('el director de UDN también los ve: son suyos, no del equipo', () => {
    render(
      <ReunionesSala porVenir={[]}
        reuniones={[{ ...ULTIMA, acuerdos: [ACUERDO] }]}
        equipo={false}
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoActionNoop}
      />,
    )

    expect(screen.getByText(/Cruce de paid media/)).toBeInTheDocument()
  })
})

/**
 * EL CICLO DE UNA REUNIÓN, DE PRINCIPIO A FIN.
 *
 * Franco: *"cuando ya creé la reunión y subí la presentación, debería
 * ofrecerme generar la minuta, generar acuerdos y finalizar o marcar como
 * completada, ya que el journey se cumplió, y pasar al grupo que le
 * corresponda"*.
 *
 * "Lo que viene" solo sabía preparar: una vez subida la presentación, la
 * reunión se quedaba ahí sin nada que hacer con ella. Estas pruebas fijan las
 * tres etapas y, sobre todo, que **cerrarla es lo que la mueve de grupo** —
 * sin tocar su fecha.
 */
describe('ReunionesSala — el ciclo de una reunión por venir', () => {
  const POR_VENIR = {
    tipo: 'mensual' as const, estado: 'agendada' as const, noDadaEn: null, plantilla: null, acuerdos: [],
  }
  const SIN_NADA: Reunion = {
    ...POR_VENIR, id: 'v1', fecha: '2029-09-15T10:00:00.000Z', titulo: 'La que viene',
    documentoListo: false, archivos: [],
  }
  const EMPEZADA: Reunion = { ...SIN_NADA, documentoId: 'doc-1' }
  const LISTA: Reunion = {
    ...SIN_NADA,
    archivos: [{ id: 'a1', titulo: 'Deck de agosto', url: '/api/archivo/a1', nombreOriginal: 'deck.pdf' }],
  }

  function pintar(reunion: Reunion, extra: Record<string, unknown> = {}) {
    return render(
      <ReunionesSala
        reuniones={[]}
        porVenir={[reunion]}
        equipo
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoActionNoop}
        {...extra}
      />,
    )
  }

  it('sin presentación ofrece las dos vías y NADA de cierre: no hay junta que dar por dada', () => {
    pintar(SIN_NADA, { marcarDadaAction: vi.fn() })

    expect(screen.getByRole('button', { name: /subir presentación/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /armarla en el editor/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ya se dio/i })).not.toBeInTheDocument()
  })

  /** A medias no se empieza de cero: una sola salida, seguir donde se dejó. */
  it('a medio armar ofrece seguir editando, no volver a empezar', () => {
    pintar(EMPEZADA, { marcarDadaAction: vi.fn() })

    expect(screen.getByRole('link', { name: /seguir editando/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /subir presentación/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ya se dio/i })).not.toBeInTheDocument()
  })

  it('con la presentación lista ofrece el cierre: levantar la minuta y darla por dada', () => {
    pintar(LISTA, { marcarDadaAction: vi.fn() })

    expect(screen.getByText('Deck de agosto')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /levantar minuta/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ya se dio/i })).toBeInTheDocument()
    expect(screen.getByText(/presentación lista/i)).toBeInTheDocument()
  })

  it('"Ya se dio" llama a la acción que la mueve de grupo, con SU id', async () => {
    const marcarDadaAction = vi.fn().mockResolvedValue(undefined)
    const usuario = userEvent.setup()
    pintar(LISTA, { marcarDadaAction })

    await usuario.click(screen.getByRole('button', { name: /ya se dio/i }))

    expect(marcarDadaAction).toHaveBeenCalledWith('v1')
  })

  /** Al director de la UDN no se le ofrece cerrar la junta: no le toca. */
  it('sin ser equipo no hay cierre ni borrado', () => {
    render(
      <ReunionesSala
        reuniones={[]}
        porVenir={[LISTA]}
        equipo={false}
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoActionNoop}
        marcarDadaAction={vi.fn()}
        eliminarReunionAction={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: /ya se dio/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /borrar la reunión/i })).not.toBeInTheDocument()
  })
})

/**
 * LA MINUTA SE LEE CON SU FORMATO, no como un volcado de texto.
 *
 * Franco: *"cuando se publica la minuta, después para verla pierde formato
 * bonito"*. Este visor pintaba `minuta.texto` a pelo dentro de un `pre-wrap`:
 * los encabezados llegaban como una línea más y la tabla de acuerdos
 * —alineada con barras, que solo se lee en monoespaciada— se deshacía en
 * frases separadas por palotes.
 *
 * Ahora usa `CorreoMinuta`, el MISMO componente que pinta la vista previa
 * antes de publicar y el mismo HTML que se copia al portapapeles: lo que se
 * revisa, lo que se manda y lo que se archiva son la misma cosa.
 */
describe('ReunionesSala — la minuta publicada conserva su forma', () => {
  const TEXTO = [
    'Hola, equipo:',
    '',
    'Acuerdos y accionables',
    'Acción | Owner | Fecha',
    'Mandar el reporte | Ana | 3 ago',
  ].join('\n')

  const CON_MINUTA: Reunion = {
    ...BASE,
    id: 'm1',
    fecha: '2026-07-15T10:00:00.000Z',
    titulo: 'Con minuta',
    minuta: { titulo: 'Minuta de julio', fecha: '2026-07-15T10:00:00.000Z', texto: TEXTO, enviadaA: 0 },
  }

  it('la pinta como correo: encabezado en negrita y la tabla con sus celdas', async () => {
    const usuario = userEvent.setup()
    const { container } = render(
      <ReunionesSala
        reuniones={[CON_MINUTA]}
        porVenir={[]}
        equipo
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoActionNoop}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: /minuta/i }))

    const dialogo = container.querySelector('dialog')
    expect(dialogo).not.toBeNull()
    // La tabla existe DE VERDAD, no como línea de texto con barras.
    expect(dialogo!.querySelectorAll('table')).toHaveLength(1)
    expect(dialogo!.querySelectorAll('td').length).toBeGreaterThan(0)
    expect(dialogo!.querySelectorAll('strong').length).toBeGreaterThan(0)
    // Y el texto crudo con palotes ya no aparece en ninguna parte.
    expect(dialogo!.textContent).not.toContain('Acción | Owner | Fecha')
  })

  /**
   * ⚠️ EL ENLACE QUE LLEVABA A UN 404 (ronda 13, auditoría móvil).
   *
   * "Ver la presentación →" se ofrecía con `tienePresentacion` —"documento
   * listo O algún archivo"— y lo veía CUALQUIERA que abriera la sala pública.
   * Pero `/reunion/<id>` pinta EL DOCUMENTO y hace `notFound()` si no tiene
   * secciones maquetadas: una reunión cuya presentación es un PDF subido
   * —todas las reales de esta app— mandaba al director a un 404 del servidor.
   *
   * El PDF no se pierde: su chip sigue en la tarjeta de la reunión.
   */
  it('con la presentación subida como archivo, NO se ofrece "Ver la presentación" (llevaba a un 404)', async () => {
    const usuario = userEvent.setup()
    render(
      <ReunionesSala
        reuniones={[{
          ...CON_MINUTA,
          documentoListo: false,
          archivos: [{ id: 'a1', titulo: 'PPT | Julio', nombreOriginal: 'julio.pptx', url: '/api/archivo/a1' }],
        }]}
        porVenir={[]}
        equipo={false}
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoActionNoop}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: /minuta/i }))

    expect(screen.queryByRole('link', { name: /ver la presentación/i })).toBeNull()
  })

  it('con documento maquetado sí se ofrece: ahí hay algo que pintar', async () => {
    const usuario = userEvent.setup()
    render(
      <ReunionesSala
        reuniones={[{ ...CON_MINUTA, documentoListo: true }]}
        porVenir={[]}
        equipo={false}
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoActionNoop}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: /minuta/i }))

    expect(screen.getByRole('link', { name: /ver la presentación/i })).toHaveAttribute('href', '/reunion/m1')
  })
})

/**
 * BORRAR UNA REUNIÓN: LA FRICCIÓN ESCALA CON LO QUE SE PIERDE.
 *
 * Franco: *"borrar una reunión que ya se dio y se marcó como tal no puede ser
 * eliminada solo con un clic; debería el editor o admin teclear un captcha o
 * escribir ELIMINAR"*.
 *
 * No son el mismo acto. Tirar una junta del jueves creada por error no
 * destruye nada. Tirar una que ya se dio se lleva su presentación, su minuta
 * y el registro de que ocurrió — y eso no se rehace, porque la transcripción
 * de la que salió el acta ya no está.
 */
describe('ReunionesSala — borrar una reunión con historia exige teclearlo', () => {
  const BASE_BORRAR = {
    tipo: 'mensual' as const, noDadaEn: null, plantilla: null, documentoListo: false, archivos: [], acuerdos: [],
  }
  const VACIA: Reunion = {
    ...BASE_BORRAR, id: 'v1', fecha: '2029-09-15T10:00:00.000Z', titulo: 'Recién creada',
    estado: 'agendada',
  }
  const YA_SE_DIO: Reunion = { ...VACIA, id: 'd1', titulo: 'Quincenal de julio', estado: 'dada' }

  /**
   * ⚠️ EL DOBLE TIENE QUE DEVOLVER UNA PROMESA, y no la devolvía.
   *
   * `vi.fn()` a secas devuelve `undefined`, y el manejador del botón encadena
   * `.then().catch().finally()` sobre lo que le den — que es lo correcto: lo
   * que recibe de verdad es una Server Action. Resultado: los dos tests de
   * borrado de aquí abajo hacían clic, el manejador reventaba con
   * «Cannot read properties of undefined (reading 'then')» y aun así salían
   * VERDES, porque lo que comprueban (la confirmación en dos tiempos) ocurre
   * antes de la explosión. Vitest lo cantaba como dos «unhandled errors» al
   * final de la suite entera, lejos de aquí.
   *
   * Un doble tiene que representar lo que su nombre promete — la misma regla
   * que ya nos cobró los fixtures de `/deck` que se decían "listos" con cero
   * secciones.
   */
  function pintarPorVenir(
    reunion: Reunion,
    eliminarReunionAction = vi.fn().mockResolvedValue(undefined),
  ) {
    render(
      <ReunionesSala
        reuniones={[]}
        porVenir={[reunion]}
        equipo
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoActionNoop}
        eliminarReunionAction={eliminarReunionAction}
      />,
    )
    return eliminarReunionAction
  }

  it('una reunión vacía y por venir se borra en dos tiempos, sin teclear nada', async () => {
    const usuario = userEvent.setup()
    const eliminar = pintarPorVenir(VACIA)

    await usuario.click(screen.getByRole('button', { name: /borrar la reunión/i }))
    expect(screen.queryByLabelText(/escribe eliminar/i)).not.toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: /sí, borrar la reunión/i }))
    expect(eliminar).toHaveBeenCalledWith('v1')
  })

  it('una que YA SE DIO pide teclear ELIMINAR, y hasta entonces no deja borrar', async () => {
    const usuario = userEvent.setup()
    const eliminar = pintarPorVenir(YA_SE_DIO)

    await usuario.click(screen.getByRole('button', { name: /borrar la reunión/i }))

    const boton = screen.getByRole('button', { name: /sí, borrar la reunión/i })
    expect(boton).toBeDisabled()
    // Y dice qué se lleva, que es para lo que sirve la fricción.
    expect(screen.getByText(/ya se dio/i)).toBeInTheDocument()
    expect(screen.getByText(/no se puede recuperar/i)).toBeInTheDocument()

    await usuario.type(screen.getByLabelText(/escribe eliminar/i), 'ELIMINAR')
    expect(boton).toBeEnabled()
    await usuario.click(boton)
    expect(eliminar).toHaveBeenCalledWith('d1')
  })

  it('media palabra no basta', async () => {
    const usuario = userEvent.setup()
    const eliminar = pintarPorVenir(YA_SE_DIO)

    await usuario.click(screen.getByRole('button', { name: /borrar la reunión/i }))
    await usuario.type(screen.getByLabelText(/escribe eliminar/i), 'ELIMIN')

    expect(screen.getByRole('button', { name: /sí, borrar la reunión/i })).toBeDisabled()
    expect(eliminar).not.toHaveBeenCalled()
  })

  /** Con minuta, presentación o acuerdos también pesa, aunque nadie la haya confirmado. */
  it.each([
    ['con minuta', { minuta: { titulo: 'm', fecha: '2029-09-15T10:00:00.000Z', texto: 'x', enviadaA: 0 } }],
    ['con presentación', { documentoListo: true }],
    ['con acuerdos', { acuerdos: [{ id: 'a1', que: 'x', responsable: 'Ana', estatus: 'abierto' }] }],
  ])('%s también exige teclearlo, aunque siga agendada', async (_caso, extra) => {
    const usuario = userEvent.setup()
    pintarPorVenir({ ...VACIA, ...extra } as Reunion)

    await usuario.click(screen.getByRole('button', { name: /borrar la reunión/i }))

    expect(screen.getByLabelText(/escribe eliminar/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sí, borrar la reunión/i })).toBeDisabled()
  })

  it('cancelar limpia lo tecleado: al reabrir hay que escribirlo otra vez', async () => {
    const usuario = userEvent.setup()
    pintarPorVenir(YA_SE_DIO)

    await usuario.click(screen.getByRole('button', { name: /borrar la reunión/i }))
    await usuario.type(screen.getByLabelText(/escribe eliminar/i), 'ELIMINAR')
    await usuario.click(screen.getByRole('button', { name: /cancelar/i }))
    await usuario.click(screen.getByRole('button', { name: /borrar la reunión/i }))

    expect(screen.getByLabelText(/escribe eliminar/i)).toHaveValue('')
    expect(screen.getByRole('button', { name: /sí, borrar la reunión/i })).toBeDisabled()
  })
})
