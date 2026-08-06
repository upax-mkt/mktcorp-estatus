import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DocumentoSesion } from './DocumentoSesion'
import { grupoUpax } from '@/temas/grupo-upax'
import type { Acuerdo } from '@/dominio/salas'

/**
 * EN PANTALLA TODO SE LLAMA REUNIÓN (regla dura de la ronda 10: "sesión
 * desaparece de la interfaz"). Este documento es el que lee el CLIENTE —el
 * director de UDN, sin ningún equipo de Mkt Corp de por medio— así que es el
 * sitio de más peso para que "sesión" no se le escape. Hasta la revisión
 * final de esta ronda, la sección de Acuerdos decía "no del día de la
 * sesión"; este test fija el vocabulario correcto para que no vuelva.
 *
 * Dobles de MinutaCliente/GrabarReunion: mismo criterio que
 * `ModoPresentar.test.tsx` (de quien `DocumentoSesion` cuelga vía
 * `ModoPresentar`) — aquí no importa el modo presentación ni la grabación,
 * solo el documento por debajo. Sin "Presentar" pulsado ninguno de los dos
 * llega a pintarse; el doble solo evita cargar esas dependencias de más.
 */
vi.mock('@/app/deck/[id]/minuta/MinutaCliente', () => ({
  MinutaCliente: () => null,
}))
vi.mock('./GrabarReunion', () => ({
  GrabarReunion: () => null,
}))

const ACUERDO: Acuerdo = {
  id: 'a1',
  que: 'Cruce de paid media con el equipo de César',
  responsable: 'Fernando',
  estatus: 'abierto',
  fechaCompromiso: '2026-08-08',
}

describe('DocumentoSesion — vocabulario de la sección de Acuerdos', () => {
  it('dice "reunión", nunca "sesión": este documento lo lee el cliente', () => {
    render(<DocumentoSesion tema={grupoUpax} secciones={[]} acuerdos={[ACUERDO]} personas={[]} />)

    expect(screen.getByText(/no del día de la reunión/i)).toBeInTheDocument()
    expect(screen.queryByText(/sesión/i)).toBeNull()
  })
})
