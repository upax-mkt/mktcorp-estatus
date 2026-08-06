import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ModoPresentar } from './ModoPresentar'

/**
 * REVISIÓN FINAL DE LA RAMA, PUNTO 3a.
 *
 * Un Esc en el diálogo de revisión de la transcripción grabada la borraba
 * entera: `onClose` (el evento nativo con el que el navegador cierra un
 * `<dialog>` abierto con `showModal()`, incluido el que dispara el Esc)
 * ponía `transcripcion` a `null`. Para entonces `parar()` ya había vaciado
 * el acumulado de `GrabarReunion` y no hay ninguna otra copia en toda la
 * app — ni `localStorage` ni `beforeunload`. Y ese mismo Esc, si se seguía
 * presentando, también salía de la presentación (el listener de `window` no
 * sabía que había un diálogo modal abierto encima).
 *
 * Estos tests prueban el fix por comportamiento observable, no por estado
 * interno: cerrar (✕ o el evento nativo `close`) conserva el texto y se
 * puede reabrir; solo «Descartar» lo borra de verdad; y el Esc con el
 * diálogo abierto ya no saca de la presentación.
 */

/**
 * Doble de GrabarReunion: un botón que dispara `alTerminar` con un texto
 * fijo. La Web Speech API real ya se prueba en GrabarReunion.test.tsx — aquí
 * importa qué hace ModoPresentar con lo que GrabarReunion le entrega, no
 * cómo se transcribe.
 */
vi.mock('./GrabarReunion', () => ({
  GrabarReunion: ({ alTerminar }: { alTerminar: (texto: string) => void }) => (
    <button type="button" onClick={() => alTerminar('lo que se grabó')}>
      Simular fin de grabación
    </button>
  ),
}))

/**
 * Doble de MinutaCliente: solo enseña la transcripción recibida, para poder
 * comprobar que el diálogo la sigue mostrando tras cerrarse y reabrirse. El
 * flujo real de generar/publicar el acta tiene sus propios tests.
 */
vi.mock('@/app/deck/[id]/minuta/MinutaCliente', () => ({
  MinutaCliente: ({ transcripcionInicial }: { transcripcionInicial: string }) => (
    <div data-testid="minuta-cliente">{transcripcionInicial}</div>
  ),
}))

function montar() {
  return render(
    <ModoPresentar reunionId="reunion-1" equipo personas={[]}>
      <div data-layout="portada">hola</div>
    </ModoPresentar>,
  )
}

async function grabarYTerminar() {
  await userEvent.click(screen.getByRole('button', { name: /^presentar$/i }))
  await userEvent.click(screen.getByRole('button', { name: /simular fin de grabación/i }))
}

describe('ModoPresentar — el diálogo de revisión no destruye la transcripción', () => {
  it('el evento nativo "close" (el Esc del navegador) NO borra el texto: se puede reabrir', async () => {
    montar()
    await grabarYTerminar()
    const dialogo = screen.getByRole('dialog', { name: /minuta de la reunión grabada/i })
    expect(screen.getByTestId('minuta-cliente')).toHaveTextContent('lo que se grabó')

    // El Esc nativo de un <dialog> abierto con showModal() dispara su propio
    // evento "close" — no pasa por ningún manejador de teclado de React, así
    // que se simula disparando el evento tal cual lo haría el navegador.
    // Cerrar un <dialog> no desmonta su contenido (solo dejar de mostrarlo,
    // como cualquier <dialog> real): la prueba de que sigue vivo es el
    // atributo `open`, no la ausencia del nodo en el árbol.
    fireEvent(dialogo, new Event('close'))
    expect(dialogo).not.toHaveAttribute('open')

    const reabrir = screen.getByRole('button', { name: /transcripción pendiente/i })
    await userEvent.click(reabrir)
    expect(dialogo).toHaveAttribute('open')
    expect(screen.getByTestId('minuta-cliente')).toHaveTextContent('lo que se grabó')
  })

  it('la ✕ cierra sin destruir, igual que el Esc', async () => {
    montar()
    await grabarYTerminar()
    const dialogo = screen.getByRole('dialog', { name: /minuta de la reunión grabada/i })

    await userEvent.click(screen.getByRole('button', { name: /^cerrar/i }))

    expect(dialogo).not.toHaveAttribute('open')
    const reabrir = screen.getByRole('button', { name: /transcripción pendiente/i })
    expect(reabrir).toBeInTheDocument()
    await userEvent.click(reabrir)
    expect(dialogo).toHaveAttribute('open')
    expect(screen.getByTestId('minuta-cliente')).toHaveTextContent('lo que se grabó')
  })

  it('«Descartar» SÍ borra el texto, y es un botón distinto de cerrar', async () => {
    montar()
    await grabarYTerminar()

    await userEvent.click(screen.getByRole('button', { name: /^descartar$/i }))

    expect(screen.queryByTestId('minuta-cliente')).not.toBeInTheDocument()
    // No queda nada que reabrir: se borró de verdad, no solo se ocultó.
    expect(screen.queryByRole('button', { name: /transcripción pendiente/i })).not.toBeInTheDocument()
  })

  it('el Esc con el diálogo abierto no dispara además la salida de la presentación', async () => {
    montar()
    await grabarYTerminar()
    // Seguimos presentando: el botón «Presentar» no ha vuelto a aparecer.
    expect(screen.queryByRole('button', { name: /^presentar$/i })).not.toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })

    // El Esc, con el diálogo de revisión abierto, no debe sacar de la
    // presentación — antes de este fix, el listener de `window` lo capturaba
    // igual y llamaba a `salir()` al mismo tiempo que el navegador cerraba
    // el diálogo.
    expect(screen.queryByRole('button', { name: /^presentar$/i })).not.toBeInTheDocument()
  })
})
