import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CarasDeReunion } from './CarasDeReunion'
import type { Reunion } from '@/dominio/reunion'

/**
 * LAS DOS CARAS DE UNA REUNIÓN, Y LOS HUECOS QUE LAS LLENAN (ronda 10, tarea 9).
 *
 * Antes, lo que le faltaba a una reunión se DECÍA pero no se PODÍA llenar:
 * "Sin presentación" y "Falta la minuta" eran texto muerto en `ReunionesSala`.
 * Franco: subió el PDF de su Quincenal con Research Land y la app no le
 * dejaba meterle la minuta a lo que ya había subido — ni al revés. Estos
 * tests fijan la regla: cada hueco es el botón que lo llena, pero SOLO para
 * el equipo — un director de UDN sigue viendo que algo falta (es información
 * útil) sin poder llenarlo, porque no le toca.
 *
 * DOCUMENTO Y ARCHIVO NO SON EXCLUYENTES: una reunión puede tener el
 * documento web que arma la app Y un PDF subido aparte a la vez, y las dos
 * caras se enseñan juntas. Cada archivo anuncia SU NOMBRE ORIGINAL, para
 * saber qué se va a descargar antes de hacer clic — no un genérico
 * "presentación".
 */

const REUNION = (parcial: Partial<Reunion> = {}): Reunion => ({
  id: 'r1',
  fecha: '2026-07-15T10:00:00.000Z',
  titulo: 'Quincenal Comercial · RL',
  tipo: 'quincenal',
  estado: 'dada',
  noDadaEn: null,
  documentoListo: false,
  archivos: [],
  acuerdos: [],
  ...parcial,
})

const ARCHIVO_PDF = {
  id: 'a1',
  titulo: 'Estatus RL agosto',
  nombreOriginal: 'Estatus RL agosto.pdf',
  url: '/api/archivo/a1',
}

const sinNada = REUNION()
const conPdf = REUNION({ archivos: [ARCHIVO_PDF] })
const conAmbos = REUNION({ documentoListo: true, archivos: [ARCHIVO_PDF] })
const conMinuta = REUNION({
  archivos: [ARCHIVO_PDF],
  minuta: { fecha: '2026-07-16T09:00:00.000Z', titulo: 'Minuta · Quincenal Comercial', enviadaA: 3 },
})

describe('CarasDeReunion — presentación ausente', () => {
  it('sin presentación, el equipo ve un botón para subirla — no un lamento', () => {
    render(<CarasDeReunion reunion={sinNada} equipo onLeerMinuta={() => {}} onSubirPresentacion={() => {}} />)
    expect(screen.getByRole('button', { name: /subir presentación/i })).toBeInTheDocument()
  })

  it('sin presentación, el director ve que falta pero no puede llenarla', () => {
    render(<CarasDeReunion reunion={sinNada} equipo={false} onLeerMinuta={() => {}} />)
    expect(screen.queryByRole('button', { name: /subir presentación/i })).toBeNull()
    expect(screen.getByText(/sin presentación/i)).toBeInTheDocument()
  })

  it('pulsar «+ Subir presentación» dispara la acción que le pasa quien usa el componente', async () => {
    const usuario = userEvent.setup()
    const alSubir = vi.fn()
    render(<CarasDeReunion reunion={sinNada} equipo onLeerMinuta={() => {}} onSubirPresentacion={alSubir} />)

    await usuario.click(screen.getByRole('button', { name: /subir presentación/i }))

    expect(alSubir).toHaveBeenCalledTimes(1)
  })

  it('sin manejador no hay botón: un botón que no hace nada es peor que el lamento que sustituye', () => {
    // Antes había aquí un test que comprobaba lo contrario —que el botón se
    // pintaba igual sin manejador y "no reventaba al pulsarlo"— porque la
    // tarea 9 construyó el botón y la 11 tenía que cablearlo. Entre las dos
    // se quedó sin cablear y llegó así a producción: se veía, se pulsaba, y
    // no pasaba nada. Aquel test bendecía el defecto.
    //
    // La regla es la contraria: sin manejador, ese hueco no se ofrece como
    // acción. Es lo que ya hace el camino del director de UDN, que ve la
    // píldora informativa y ningún botón.
    render(<CarasDeReunion reunion={sinNada} equipo onLeerMinuta={() => {}} />)

    expect(screen.queryByRole('button', { name: /subir presentación/i })).toBeNull()
    // El otro camino SÍ sigue: es un enlace a una ruta que siempre existe, no
    // depende de que nadie le pase un manejador.
    expect(screen.getByRole('link', { name: /armarla en el editor/i })).toBeInTheDocument()
  })

  /**
   * LAS DOS VÍAS AL CREAR LA REUNIÓN (Franco: *"allí me debe permitir o
   * cargar la presentación que ya hicimos o crearla en el editor"*).
   *
   * Solo se ofrecía subir un archivo, así que armarla aquí exigía saberse la
   * ruta o volver por la lista de Presentaciones. Ninguno de los dos caminos
   * es el principal: unas veces el deck ya existe y otras se construye.
   */
  it('una reunión sin presentación ofrece los dos caminos: subirla o armarla en el editor', () => {
    render(
      <CarasDeReunion
        reunion={sinNada}
        equipo
        onLeerMinuta={() => {}}
        onSubirPresentacion={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: /subir presentación/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /armarla en el editor/i }))
      .toHaveAttribute('href', `/deck/${sinNada.id}`)
  })

  /** Al director de la UDN no se le ofrece ninguna de las dos: él no prepara. */
  it('sin ser equipo no se ofrece ningún camino, solo el estado', () => {
    render(<CarasDeReunion reunion={sinNada} equipo={false} onLeerMinuta={() => {}} onSubirPresentacion={() => {}} />)

    expect(screen.getByText(/sin presentación/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /subir presentación/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /armarla en el editor/i })).toBeNull()
  })
})

describe('CarasDeReunion — presentación presente', () => {
  /**
   * SE ANUNCIA CON SU TÍTULO, no con `nombreOriginal` (ronda 11, tarea 3,
   * paso 3) — al revés que antes de esta tarea. Franco: "una vez cargado un
   * archivo como una presentación debería poder editar el nombre con el que
   * se ve en el front". El título es lo editable y manda en cuanto existe;
   * `nombreOriginal` se conserva como DATO —sigue siendo el `href` real, lo
   * que se descarga— pero deja de ser lo que se lee.
   */
  it('un archivo se anuncia con SU TÍTULO — el nombre original sigue siendo lo que se descarga', () => {
    render(<CarasDeReunion reunion={conPdf} equipo onLeerMinuta={() => {}} />)
    const enlace = screen.getByRole('link', { name: 'Estatus RL agosto' })
    expect(enlace).toBeInTheDocument()
    expect(enlace).toHaveAttribute('href', '/api/archivo/a1')
  })

  it('sin título (dato defensivo — el alta siempre exige uno), cae al nombre original', () => {
    const sinTitulo = REUNION({ archivos: [{ ...ARCHIVO_PDF, titulo: '' }] })
    render(<CarasDeReunion reunion={sinTitulo} equipo onLeerMinuta={() => {}} />)
    expect(screen.getByRole('link', { name: 'Estatus RL agosto.pdf' })).toBeInTheDocument()
  })

  it('documento y archivo conviven: no son excluyentes', () => {
    render(<CarasDeReunion reunion={conAmbos} equipo onLeerMinuta={() => {}} />)
    const documento = screen.getByRole('link', { name: /documento/i })
    const archivo = screen.getByRole('link', { name: 'Estatus RL agosto' })
    expect(documento).toBeInTheDocument()
    expect(documento).toHaveAttribute('href', `/reunion/${conAmbos.id}`)
    expect(archivo).toBeInTheDocument()
  })

  it('con presentación ya resuelta, no se ofrece subir de nuevo', () => {
    render(<CarasDeReunion reunion={conAmbos} equipo onLeerMinuta={() => {}} />)
    expect(screen.queryByRole('button', { name: /subir presentación/i })).toBeNull()
  })

  it('con varios archivos, cada uno se anuncia por separado con su propio título', () => {
    const conDos = REUNION({
      archivos: [
        ARCHIVO_PDF,
        { id: 'a2', titulo: 'Anexo', nombreOriginal: 'Anexo financiero.xlsx', url: '/api/archivo/a2' },
      ],
    })
    render(<CarasDeReunion reunion={conDos} equipo onLeerMinuta={() => {}} />)
    expect(screen.getByRole('link', { name: 'Estatus RL agosto' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Anexo' })).toBeInTheDocument()
  })
})

/**
 * EL TÍTULO DE UN ARCHIVO SE PUEDE EDITAR DESDE LA REUNIÓN (ronda 11, tarea
 * 3, paso 3). Franco: "una vez cargado un archivo como una presentación
 * debería poder editar el nombre con el que se ve en el front". `editarArchivo`
 * (`src/db/archivos.ts`) y su Server Action ya existían para "archivos de
 * interés" (`ArchivosSala`) — lo que faltaba era ofrecerlo desde `CarasDeReunion`,
 * que es donde se ve un archivo de presentación colgado de una reunión.
 *
 * `editarArchivoAction` es OPCIONAL, MISMO CRITERIO que `onSubirPresentacion`
 * arriba: sin ella no se ofrece el lápiz, ni para equipo — un botón que no
 * hace nada es peor que no tener botón (la misma lección de la tarea 9/9b).
 * El director de UDN nunca la recibe: no edita nada.
 */
describe('CarasDeReunion — editar el título de un archivo (ronda 11, tarea 3)', () => {
  it('equipo, con la acción disponible: ve el lápiz junto al archivo', () => {
    render(<CarasDeReunion reunion={conPdf} equipo onLeerMinuta={() => {}} editarArchivoAction={vi.fn()} />)
    expect(screen.getByRole('button', { name: /editar el título/i })).toBeInTheDocument()
  })

  it('sin la acción (aunque seas equipo), no se ofrece el lápiz', () => {
    render(<CarasDeReunion reunion={conPdf} equipo onLeerMinuta={() => {}} />)
    expect(screen.queryByRole('button', { name: /editar el título/i })).toBeNull()
  })

  it('el director no ve el lápiz aunque la acción esté disponible: no edita nada', () => {
    render(
      <CarasDeReunion reunion={conPdf} equipo={false} onLeerMinuta={() => {}} editarArchivoAction={vi.fn()} />,
    )
    expect(screen.queryByRole('button', { name: /editar el título/i })).toBeNull()
  })

  it('pulsar el lápiz muestra un campo con el título actual, no vacío', async () => {
    const usuario = userEvent.setup()
    render(<CarasDeReunion reunion={conPdf} equipo onLeerMinuta={() => {}} editarArchivoAction={vi.fn()} />)

    await usuario.click(screen.getByRole('button', { name: /editar el título/i }))

    expect(screen.getByLabelText(/título de/i, { selector: 'input' })).toHaveValue('Estatus RL agosto')
  })

  it('guardar llama a editarArchivoAction con el id del archivo y el título nuevo', async () => {
    const usuario = userEvent.setup()
    const editar = vi.fn().mockResolvedValue(undefined)
    render(<CarasDeReunion reunion={conPdf} equipo onLeerMinuta={() => {}} editarArchivoAction={editar} />)

    await usuario.click(screen.getByRole('button', { name: /editar el título/i }))
    const campo = screen.getByLabelText(/título de/i, { selector: 'input' })
    await usuario.clear(campo)
    await usuario.type(campo, 'Estatus RL — agosto final')
    await usuario.click(screen.getByRole('button', { name: /^guardar$/i }))

    await waitFor(() =>
      expect(editar).toHaveBeenCalledWith('a1', { titulo: 'Estatus RL — agosto final' }),
    )
  })

  it('guardar no manda `fecha`: el archivo de una reunión no tiene una propia (mandar null la borraría)', async () => {
    const usuario = userEvent.setup()
    const editar = vi.fn().mockResolvedValue(undefined)
    render(<CarasDeReunion reunion={conPdf} equipo onLeerMinuta={() => {}} editarArchivoAction={editar} />)

    await usuario.click(screen.getByRole('button', { name: /editar el título/i }))
    await usuario.click(screen.getByRole('button', { name: /^guardar$/i }))

    await waitFor(() => expect(editar).toHaveBeenCalled())
    const [, cambios] = editar.mock.calls[0]
    expect(Object.prototype.hasOwnProperty.call(cambios, 'fecha')).toBe(false)
  })

  it('cancelar descarta el cambio sin llamar a la acción, y el enlace vuelve a verse', async () => {
    const usuario = userEvent.setup()
    const editar = vi.fn()
    render(<CarasDeReunion reunion={conPdf} equipo onLeerMinuta={() => {}} editarArchivoAction={editar} />)

    await usuario.click(screen.getByRole('button', { name: /editar el título/i }))
    await usuario.type(screen.getByLabelText(/título de/i, { selector: 'input' }), ' algo distinto')
    await usuario.click(screen.getByRole('button', { name: /cancelar/i }))

    expect(editar).not.toHaveBeenCalled()
    expect(screen.queryByLabelText(/título de/i, { selector: 'input' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Estatus RL agosto' })).toBeInTheDocument()
  })

  it('con el título vacío, Guardar queda deshabilitado', async () => {
    const usuario = userEvent.setup()
    render(<CarasDeReunion reunion={conPdf} equipo onLeerMinuta={() => {}} editarArchivoAction={vi.fn()} />)

    await usuario.click(screen.getByRole('button', { name: /editar el título/i }))
    await usuario.clear(screen.getByLabelText(/título de/i, { selector: 'input' }))

    expect(screen.getByRole('button', { name: /^guardar$/i })).toBeDisabled()
  })
})

describe('CarasDeReunion — minuta ausente', () => {
  // ES UN <Link>, NO UN <button> CON window.location.href (revisión final de
  // la ronda 10): recarga dura, se pierde el scroll, y como <button> no hay
  // clic-medio, ctrl-clic, "copiar dirección del enlace" ni vista previa del
  // destino al pasar el ratón. `getByRole('link', …)` con su `href` es lo que
  // distingue un enlace de verdad de un botón que solo se le parece.
  it('sin minuta, el equipo la puede levantar desde la propia fila — con un enlace de verdad, no un botón con recarga dura', () => {
    render(<CarasDeReunion reunion={conPdf} equipo onLeerMinuta={() => {}} />)
    const enlace = screen.getByRole('link', { name: /levantar minuta/i })
    expect(enlace).toBeInTheDocument()
    expect(enlace).toHaveAttribute('href', `/deck/${conPdf.id}/minuta`)
  })

  it('sin minuta, el director ve que falta pero no puede levantarla', () => {
    render(<CarasDeReunion reunion={conPdf} equipo={false} onLeerMinuta={() => {}} />)
    expect(screen.queryByRole('link', { name: /levantar minuta/i })).toBeNull()
    expect(screen.getByText(/falta la minuta/i)).toBeInTheDocument()
  })
})

describe('CarasDeReunion — minuta ya publicada', () => {
  it('el equipo la puede leer, y ya no se le ofrece levantarla de nuevo', () => {
    render(<CarasDeReunion reunion={conMinuta} equipo onLeerMinuta={() => {}} />)
    expect(screen.getByRole('button', { name: /^minuta$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /levantar minuta/i })).toBeNull()
  })

  it('el director también la puede leer — leer una minuta nunca fue privilegio del equipo', () => {
    render(<CarasDeReunion reunion={conMinuta} equipo={false} onLeerMinuta={() => {}} />)
    expect(screen.getByRole('button', { name: /^minuta$/i })).toBeInTheDocument()
  })

  it('pulsar «Minuta» llama a onLeerMinuta', async () => {
    const usuario = userEvent.setup()
    const alLeer = vi.fn()
    render(<CarasDeReunion reunion={conMinuta} equipo onLeerMinuta={alLeer} />)

    await usuario.click(screen.getByRole('button', { name: /^minuta$/i }))

    expect(alLeer).toHaveBeenCalledTimes(1)
  })
})
