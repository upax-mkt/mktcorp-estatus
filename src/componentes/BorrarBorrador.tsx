'use client'

import { useState, useTransition } from 'react'
import estilos from '@/app/deck/deck.module.css'

/**
 * Borrar una sesión en preparación desde la lista.
 *
 * Franco: «quedó una lista de "borradores", ¿no puedo editar ni limpiar esa
 * lista?».
 *
 * No era solo incomodidad: esas mismas sesiones reaparecían en el selector de
 * «Generar una minuta» —cualquier reunión cuyo día ya llegó y siga sin acta— y
 * ahí tampoco había forma de quitarlas. Un borrador abandonado ensuciaba dos
 * pantallas y no se podía tocar en ninguna.
 *
 * Confirma en dos tiempos y dice qué se lleva. Un borrador no tiene acuerdos
 * publicados —nunca se presentó— así que aquí no hay nada que sobreviva: por
 * eso el aviso es más corto que el de una reunión cerrada.
 */
export function BorrarBorrador({
  sesionId,
  titulo,
  eliminarAction,
  aviso = 'Se borra con todo lo escrito.',
}: {
  sesionId: string
  titulo: string
  eliminarAction: (id: string) => Promise<{ error?: string }>
  /** Qué se lleva por delante. Cambia según de qué lista se borre. */
  aviso?: string
}) {
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  if (!confirmando) {
    return (
      <button
        type="button"
        className={estilos.accionBorrar}
        onClick={() => setConfirmando(true)}
        aria-label={`Eliminar ${titulo}`}
      >
        Eliminar
      </button>
    )
  }

  return (
    <span className={estilos.accionesReunion}>
      {error ? (
        <span className={estilos.accionesAviso}>{error}</span>
      ) : (
        <span className={estilos.accionesAviso}>{aviso}</span>
      )}
      <button
        type="button"
        className={`${estilos.boton} ${estilos.botonPeligro} ${estilos.botonChico}`}
        disabled={pendiente}
        onClick={() => empezar(async () => {
          const r = await eliminarAction(sesionId)
          if (r.error) { setError(r.error); setConfirmando(false) }
        })}
      >
        {pendiente ? 'Borrando…' : 'Sí, borrar'}
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
