'use client'

import { useState, useTransition } from 'react'
import estilos from '@/app/deck/deck.module.css'

/**
 * Registrar una minuta escrita fuera de la app.
 *
 * El flujo normal parte de una transcripción y la IA redacta el correo. Pero
 * hay minutas que ya existen —una junta anterior, un correo que alguien
 * escribió a mano— y sin esto no había forma de meterlas: el histórico de la
 * sala quedaba con huecos que no eran reales.
 *
 * No pasa por la IA ni propone acuerdos: es texto tal cual.
 */
export function MinutaExternaForm({ cargarAction }: { cargarAction: (texto: string) => Promise<void> }) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [pendiente, empezar] = useTransition()

  if (!abierto) {
    return (
      <button type="button" className={estilos.minutaExternaAbrir} onClick={() => setAbierto(true)}>
        ¿La minuta ya está escrita? Pégala aquí
      </button>
    )
  }

  return (
    <div className={estilos.minutaExterna}>
      <span className={estilos.campoInlineLabel}>Minuta ya escrita</span>
      <p className={estilos.minutaAviso}>
        Se guarda tal cual, sin pasar por la IA y sin proponer acuerdos. Para que la IA los detecte,
        usa la transcripción de arriba.
      </p>
      <textarea
        className={`${estilos.textarea} ${estilos.textareaAlta}`}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Pega aquí el texto de la minuta…"
        aria-label="Texto de la minuta ya escrita"
      />
      <div className={estilos.minutaAcciones}>
        <button
          type="button"
          className={`${estilos.boton} ${estilos.botonAcento}`}
          disabled={pendiente || texto.trim().length === 0}
          onClick={() => empezar(() => cargarAction(texto))}
        >
          {pendiente ? 'Guardando…' : 'Guardar minuta'}
        </button>
        <button
          type="button"
          className={`${estilos.boton} ${estilos.botonSecundario}`}
          onClick={() => setAbierto(false)}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
