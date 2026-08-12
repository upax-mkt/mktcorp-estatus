import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModuloAcuerdos } from './ModuloAcuerdos'
import type { AcuerdoConSala } from '@/db/consultas'

/**
 * LOS TRES VACÍOS (tarea 12) son lo que se prueba aquí, y no por gusto.
 *
 * Antes había un solo módulo con DOS vacíos posibles y ya se equivocó una vez
 * (ver el historial de este archivo: una app recién estrenada saludaba con
 * "todo lo abierto tiene dueño y día"). Ahora son DOS bloques —Destacados y
 * Vencidos— y por tanto TRES situaciones distintas: no hay ni un acuerdo, los
 * hay pero ninguno destacado, y los hay pero ninguno vencido. Decir el texto
 * equivocado sobre cualquiera de los tres es el mismo bug otra vez.
 */

const nada = vi.fn(async () => {})

const BASE: AcuerdoConSala = {
  id: 'a1',
  que: 'Cerrar la lista de cuentas objetivo',
  responsable: 'por asignar',
  estatus: 'abierto',
  fechaCompromiso: null,
  salaSlug: 'zeus',
  salaNombre: 'Zeus',
  salaColor: '#614ACA',
  salaActiva: true,
  destacado: false,
  mondayUrl: null,
  mondayTipo: null,
  bandeja: 'no_aplica',
  mondayDesvinculado: false,
}

describe('ModuloAcuerdos, los tres vacíos', () => {
  it('sin NINGÚN acuerdo, lo dice y no enseña los bloques', () => {
    render(
      <ModuloAcuerdos
        destacados={[]}
        vencidos={[]}
        total={0}
        destacarAction={nada}
        cambiarEstatusAction={nada}
        ponerFechaAction={nada}
      />,
    )
    expect(screen.getByText(/todavía no hay acuerdos/i)).toBeInTheDocument()
    expect(screen.queryByText(/nada destacado/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/todo lo abierto está en fecha/i)).not.toBeInTheDocument()
  })

  it('con acuerdos pero ninguno destacado, lo dice en su bloque y enlaza al espacio de acuerdos', () => {
    render(
      <ModuloAcuerdos
        destacados={[]}
        vencidos={[{ ...BASE, id: 'a2', estatus: 'vencido' }]}
        total={3}
        destacarAction={nada}
        cambiarEstatusAction={nada}
        ponerFechaAction={nada}
      />,
    )
    expect(screen.getByText(/nada destacado todavía/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /espacio de acuerdos/i })).toHaveAttribute('href', '/acuerdos')
  })

  it('con acuerdos destacados pero ninguno vencido, lo dice en su bloque', () => {
    render(
      <ModuloAcuerdos
        destacados={[BASE]}
        vencidos={[]}
        total={5}
        destacarAction={nada}
        cambiarEstatusAction={nada}
        ponerFechaAction={nada}
      />,
    )
    expect(screen.getByText(/todo lo abierto está en fecha/i)).toBeInTheDocument()
    expect(screen.queryByText(/nada destacado/i)).not.toBeInTheDocument()
  })

  it('los dos bloques pueden estar vacíos SIN que el total sea cero: no confunde una cosa con la otra', () => {
    // Ej. real: todos los acuerdos que existen son de una sala en freeze, así
    // que ninguno cuenta como vencido, y ninguno está destacado.
    render(
      <ModuloAcuerdos
        destacados={[]}
        vencidos={[]}
        total={4}
        destacarAction={nada}
        cambiarEstatusAction={nada}
        ponerFechaAction={nada}
      />,
    )
    expect(screen.queryByText(/todavía no hay acuerdos/i)).not.toBeInTheDocument()
    expect(screen.getByText(/nada destacado todavía/i)).toBeInTheDocument()
    expect(screen.getByText(/todo lo abierto está en fecha/i)).toBeInTheDocument()
  })
})

describe('ModuloAcuerdos, con contenido', () => {
  it('lista destacados y vencidos en sus propios bloques, cada uno con su estrella', () => {
    render(
      <ModuloAcuerdos
        destacados={[BASE]}
        vencidos={[{ ...BASE, id: 'a2', que: 'Enviar propuesta de paid media', estatus: 'vencido' }]}
        total={2}
        destacarAction={nada}
        cambiarEstatusAction={nada}
        ponerFechaAction={nada}
      />,
    )
    expect(screen.getByText('Cerrar la lista de cuentas objetivo')).toBeInTheDocument()
    expect(screen.getByText('Enviar propuesta de paid media')).toBeInTheDocument()
    expect(screen.getByText('1 vencido')).toBeInTheDocument()
    // Sin dueño se dice así, no con la etiqueta interna "por asignar".
    expect(screen.getAllByText('sin dueño')).toHaveLength(2)
    // Una estrella por fila.
    expect(screen.getAllByRole('button', { name: /destacar en el home|quitar de destacados/i })).toHaveLength(2)
  })

  it('un destacado ya cumplido no ofrece el botón "Cumplido": no hay nada que marcar de nuevo', () => {
    render(
      <ModuloAcuerdos
        destacados={[{ ...BASE, estatus: 'cumplido' }]}
        vencidos={[]}
        total={1}
        destacarAction={nada}
        cambiarEstatusAction={nada}
        ponerFechaAction={nada}
      />,
    )
    expect(screen.queryByRole('button', { name: /cumplido/i })).not.toBeInTheDocument()
  })
})

/**
 * CRÍTICO DE LA AUDITORÍA UX/UI (ronda 11): `destacados` y `vencidos` llegan
 * como dos filtros independientes sobre la MISMA lista (`src/app/page.tsx`,
 * `todosLosAcuerdos()`) y no son excluyentes — un acuerdo destacado que
 * además venció cumple los dos filtros de origen. Antes de este arreglo el
 * módulo lo pintaba entero en los dos bloques: mismo texto, misma fecha,
 * mismo botón, misma estrella. Aquí se prueba con el input REAL que produce
 * ese solape (el mismo objeto en las dos listas, no dos objetos con el mismo
 * id) — es justo la forma en la que llega hoy desde `page.tsx`.
 */
describe('ModuloAcuerdos, el solapamiento destacado + vencido (crítico de la auditoría UX/UI)', () => {
  const destacadoYVencido: AcuerdoConSala = {
    ...BASE,
    id: 'a-doble',
    que: 'Sesión de trabajo para bosquejar la agenda, el pretexto y la lista de invitados del desayuno de los 15 líderes',
    salaNombre: 'Marketing United',
    estatus: 'vencido',
    destacado: true,
  }

  it('EL QUE VALE: un acuerdo destacado Y vencido aparece exactamente una vez en el módulo', () => {
    render(
      <ModuloAcuerdos
        destacados={[destacadoYVencido]}
        vencidos={[destacadoYVencido]}
        total={1}
        destacarAction={nada}
        cambiarEstatusAction={nada}
        ponerFechaAction={nada}
      />,
    )
    expect(screen.getAllByText(destacadoYVencido.que)).toHaveLength(1)
  })

  it('VENCIDOS MANDA: vive en el bloque de Vencidos, y su estrella rellena es la marca de que también está destacado', () => {
    render(
      <ModuloAcuerdos
        destacados={[destacadoYVencido]}
        vencidos={[destacadoYVencido]}
        total={1}
        destacarAction={nada}
        cambiarEstatusAction={nada}
        ponerFechaAction={nada}
      />,
    )
    // La píldora roja de la cabecera sigue contando sobre `vencidos` tal cual
    // llega, sin dedupear: 1 acuerdo de verdad vencido.
    expect(screen.getByText('1 vencido')).toBeInTheDocument()
    // Nada se pierde: sigue destacado. La estrella rellena (con su
    // aria-label de "quitar", no "destacar") es esa marca.
    expect(screen.getByRole('button', { name: /quitar de destacados/i })).toBeInTheDocument()
  })

  /**
   * EL BLOQUE ENTERO DESAPARECE (ronda 12), en vez de quedarse vacío con una
   * nota que explica dónde mirar. La lección que este test cuida sigue siendo
   * la misma y es la importante: NUNCA decir "nada destacado todavía"
   * habiéndolos. Lo que cambió es el remedio — antes una frase, ahora ningún
   * bloque: el acuerdo está justo debajo, en Vencidos, con su estrella puesta.
   */
  it('Destacados se queda sin su único elemento: el bloque no se pinta, y NO dice "nada destacado todavía"', () => {
    render(
      <ModuloAcuerdos
        destacados={[destacadoYVencido]}
        vencidos={[destacadoYVencido]}
        total={1}
        destacarAction={nada}
        cambiarEstatusAction={nada}
        ponerFechaAction={nada}
      />,
    )
    expect(screen.queryByText(/nada destacado todavía/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Destacados')).not.toBeInTheDocument()
    // Y el acuerdo sigue a la vista, que es lo que hacía innecesaria la nota.
    expect(screen.getByText(destacadoYVencido.que)).toBeInTheDocument()
  })

  it('con dos destacados vencidos a la vez, tampoco queda un bloque vacío: los dos se ven en Vencidos', () => {
    const otro: AcuerdoConSala = {
      ...destacadoYVencido, id: 'a-doble-2', que: 'Otro compromiso destacado y vencido',
    }
    render(
      <ModuloAcuerdos
        destacados={[destacadoYVencido, otro]}
        vencidos={[destacadoYVencido, otro]}
        total={2}
        destacarAction={nada}
        cambiarEstatusAction={nada}
        ponerFechaAction={nada}
      />,
    )
    expect(screen.queryByText('Destacados')).not.toBeInTheDocument()
    expect(screen.getByText(destacadoYVencido.que)).toBeInTheDocument()
    expect(screen.getByText(otro.que)).toBeInTheDocument()
  })

  it('un destacado que NO está vencido no se toca: sigue en Destacados, ajeno al solapamiento de otro acuerdo', () => {
    const soloDestacado: AcuerdoConSala = { ...BASE, id: 'a-solo', destacado: true, estatus: 'abierto' }
    render(
      <ModuloAcuerdos
        destacados={[soloDestacado, destacadoYVencido]}
        vencidos={[destacadoYVencido]}
        total={2}
        destacarAction={nada}
        cambiarEstatusAction={nada}
        ponerFechaAction={nada}
      />,
    )
    expect(screen.getAllByText(soloDestacado.que)).toHaveLength(1)
    expect(screen.getAllByText(destacadoYVencido.que)).toHaveLength(1)
  })
})
