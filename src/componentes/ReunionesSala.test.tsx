import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

const BASE = { tipo: 'mensual' as const, estado: 'dada' as const, noDadaEn: null, documentoListo: true, archivos: [], acuerdos: [] }
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
      <ReunionesSala
        reuniones={[ULTIMA]}
        equipo
        participacionPorReunion={{ s1: [P('Iris')] }}
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoActionNoop}
      />,
    )
    expect(screen.getByText('Preparó: Iris · Presentó: Iris')).toBeInTheDocument()
  })

  it('equipo, con datos: también la pinta en una reunión anterior (fila compacta)', () => {
    render(
      <ReunionesSala
        reuniones={[ULTIMA, ANTERIOR]}
        equipo
        participacionPorReunion={{ s0: [P('César')] }}
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoActionNoop}
      />,
    )
    // s1 (la destacada) no tiene entrada en el mapa: no debe pintar nada de
    // más para ella, solo para s0.
    expect(screen.getByText('Preparó: César · Presentó: César')).toBeInTheDocument()
  })

  it('director (equipo=false): NO se pinta, aunque el mapa traiga nombres', () => {
    // En la app real esto nunca ocurre —page.tsx no llama a participantesDe
    // para un director, así que el mapa llega vacío—, pero el propio
    // componente tiene que sostener la regla por su cuenta.
    render(
      <ReunionesSala
        reuniones={[ULTIMA]}
        equipo={false}
        participacionPorReunion={{ s1: [P('Iris')] }}
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoActionNoop}
      />,
    )
    expect(screen.queryByText(/Prepar/)).toBeNull()
    expect(screen.queryByText(/Iris/)).toBeNull()
  })

  it('equipo, pero sin nadie que haya tocado esta sesión todavía: no pinta nada de más', () => {
    render(
      <ReunionesSala
        reuniones={[ULTIMA]}
        equipo
        participacionPorReunion={{}}
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoActionNoop}
      />,
    )
    expect(screen.queryByText(/Prepar/)).toBeNull()
  })

  it('equipo, sin el prop siquiera (default): no revienta y no pinta nada', () => {
    render(
      <ReunionesSala
        reuniones={[ULTIMA]}
        equipo
        salaSlug={SALA_SLUG}
        registrarArchivoAction={registrarArchivoActionNoop}
      />,
    )
    expect(screen.queryByText(/Prepar/)).toBeNull()
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
      <ReunionesSala
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
      <ReunionesSala
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
      <ReunionesSala
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
})
