import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
    expect(screen.getByText(/sin presentación/i)).toBeInTheDocument()
  })
})

describe('CarasDeReunion — presentación presente', () => {
  it('un archivo se anuncia con SU nombre, para saber qué se descarga', () => {
    render(<CarasDeReunion reunion={conPdf} equipo onLeerMinuta={() => {}} />)
    const enlace = screen.getByRole('link', { name: /Estatus RL agosto\.pdf/ })
    expect(enlace).toBeInTheDocument()
    expect(enlace).toHaveAttribute('href', '/api/archivo/a1')
  })

  it('documento y archivo conviven: no son excluyentes', () => {
    render(<CarasDeReunion reunion={conAmbos} equipo onLeerMinuta={() => {}} />)
    const documento = screen.getByRole('link', { name: /documento/i })
    const archivo = screen.getByRole('link', { name: /\.pdf/ })
    expect(documento).toBeInTheDocument()
    expect(documento).toHaveAttribute('href', `/reunion/${conAmbos.id}`)
    expect(archivo).toBeInTheDocument()
  })

  it('con presentación ya resuelta, no se ofrece subir de nuevo', () => {
    render(<CarasDeReunion reunion={conAmbos} equipo onLeerMinuta={() => {}} />)
    expect(screen.queryByRole('button', { name: /subir presentación/i })).toBeNull()
  })

  it('con varios archivos, cada uno se anuncia por separado con su propio nombre', () => {
    const conDos = REUNION({
      archivos: [
        ARCHIVO_PDF,
        { id: 'a2', titulo: 'Anexo', nombreOriginal: 'Anexo financiero.xlsx', url: '/api/archivo/a2' },
      ],
    })
    render(<CarasDeReunion reunion={conDos} equipo onLeerMinuta={() => {}} />)
    expect(screen.getByRole('link', { name: /Estatus RL agosto\.pdf/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Anexo financiero\.xlsx/ })).toBeInTheDocument()
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
