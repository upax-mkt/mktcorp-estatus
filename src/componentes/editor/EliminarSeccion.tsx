'use client'

import { useState, useTransition } from 'react'
import estilos from './editor.module.css'

/**
 * Quitar una sección de la sesión.
 *
 * Con confirmación en dos pasos y sin diálogo del navegador: se borra
 * contenido que alguien escribió, y un `confirm()` se despacha con un enter
 * distraído. El segundo clic obliga a mirar qué se está borrando.
 */
export function EliminarSeccion({
  nombre,
  eliminarAction,
}: {
  nombre: string
  eliminarAction: () => Promise<void>
}) {
  const [confirmando, setConfirmando] = useState(false)
  const [pendiente, empezar] = useTransition()

  if (!confirmando) {
    return (
      <button
        type="button"
        className={estilos.botonIcono}
        title="Quitar sección"
        aria-label={`Quitar la sección ${nombre}`}
        onClick={() => setConfirmando(true)}
      >
        ✕
      </button>
    )
  }

  return (
    <div className={estilos.confirmar}>
      <span className={estilos.pista}>¿Quitar «{nombre}»?</span>
      <button
        type="button"
        className={estilos.botonPeligro}
        disabled={pendiente}
        onClick={() => empezar(() => eliminarAction())}
      >
        {pendiente ? 'Quitando…' : 'Sí, quitar'}
      </button>
      <button type="button" className={estilos.botonIcono} onClick={() => setConfirmando(false)} aria-label="Cancelar">
        ✕
      </button>
    </div>
  )
}
