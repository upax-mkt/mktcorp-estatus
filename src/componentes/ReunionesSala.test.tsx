import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReunionesSala } from './ReunionesSala'
import type { Reunion } from '@/dominio/reunion'
import type { Participante } from '@/db/participacion'

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

describe('ReunionesSala — participación de equipo', () => {
  it('equipo, con datos: pinta quién preparó y quién presentó en la reunión destacada', () => {
    render(
      <ReunionesSala reuniones={[ULTIMA]} equipo participacionPorReunion={{ s1: [P('Iris')] }} />,
    )
    expect(screen.getByText('Preparó: Iris · Presentó: Iris')).toBeInTheDocument()
  })

  it('equipo, con datos: también la pinta en una reunión anterior (fila compacta)', () => {
    render(
      <ReunionesSala
        reuniones={[ULTIMA, ANTERIOR]}
        equipo
        participacionPorReunion={{ s0: [P('César')] }}
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
      <ReunionesSala reuniones={[ULTIMA]} equipo={false} participacionPorReunion={{ s1: [P('Iris')] }} />,
    )
    expect(screen.queryByText(/Prepar/)).toBeNull()
    expect(screen.queryByText(/Iris/)).toBeNull()
  })

  it('equipo, pero sin nadie que haya tocado esta sesión todavía: no pinta nada de más', () => {
    render(<ReunionesSala reuniones={[ULTIMA]} equipo participacionPorReunion={{}} />)
    expect(screen.queryByText(/Prepar/)).toBeNull()
  })

  it('equipo, sin el prop siquiera (default): no revienta y no pinta nada', () => {
    render(<ReunionesSala reuniones={[ULTIMA]} equipo />)
    expect(screen.queryByText(/Prepar/)).toBeNull()
  })
})
