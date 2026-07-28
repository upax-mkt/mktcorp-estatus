'use client'

import { useState, useTransition } from 'react'
import estilos from '@/app/deck/deck.module.css'

/**
 * "Ya la presentamos."
 *
 * Cierra el ciclo de una sesión: hasta que alguien lo dice, la sesión sigue
 * siendo trabajo en curso y no aparece en la sala de su UDN. Por eso pide
 * confirmación en dos tiempos: no es destructivo, pero sí publica —a partir de
 * aquí el director la ve en su sala— y el botón vive en la pantalla que se
 * tiene abierta DURANTE la reunión, donde un clic de más es fácil.
 */
interface Props {
  marcarAction: () => Promise<void>
}

export function MarcarPresentada({ marcarAction }: Props) {
  const [confirmando, setConfirmando] = useState(false)
  const [pendiente, empezar] = useTransition()

  if (!confirmando) {
    return (
      <button
        type="button"
        className={`${estilos.boton} ${estilos.botonSecundario} ${estilos.botonChico}`}
        onClick={() => setConfirmando(true)}
      >
        Ya la presentamos
      </button>
    )
  }

  return (
    <span className={estilos.confirmarInline}>
      <span className={estilos.confirmarTexto}>Aparecerá en el espacio del cliente.</span>
      <button
        type="button"
        className={`${estilos.boton} ${estilos.botonAcento} ${estilos.botonChico}`}
        disabled={pendiente}
        onClick={() => empezar(async () => { await marcarAction() })}
      >
        {pendiente ? 'Marcando…' : 'Confirmar'}
      </button>
      <button
        type="button"
        className={estilos.botonTexto}
        disabled={pendiente}
        onClick={() => setConfirmando(false)}
      >
        Cancelar
      </button>
    </span>
  )
}
