'use client'

import { useEffect, useState } from 'react'
import estilos from './presentar.module.css'

/**
 * EL RELOJ DE LA REUNIÓN.
 *
 * Franco: "cuando se activa el modo pantalla completa debe aparecer un
 * contador para llevar el control del tiempo".
 *
 * Cuenta HACIA ARRIBA desde que se entra a presentar, no hacia atrás desde un
 * límite. La diferencia importa: una cuenta atrás que llega a cero se queda en
 * cero y deja de informar justo cuando más falta —"llevamos 52, íbamos por 45"
 * es la frase que se necesita a los 52—. El objetivo, si se pone, cambia el
 * color; no detiene nada.
 *
 * Sin `setInterval` de 1 s sobre el estado de React en la ruta de render: se
 * guarda el instante de arranque y cada tic solo recalcula la diferencia. Un
 * reloj que acumula errores de deriva en una reunión de una hora acaba
 * mintiendo por medio minuto.
 */

/** Objetivos que se ofrecen. Se eligen tecleando cero veces. */
const OBJETIVOS = [30, 45, 60, 90]

function reloj(segundos: number): string {
  const m = Math.floor(segundos / 60)
  const s = segundos % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function RelojReunion({ arrancadoEn }: { arrancadoEn: number }) {
  const [ahora, setAhora] = useState(() => Date.now())
  const [objetivo, setObjetivo] = useState<number | null>(null)
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const segundos = Math.max(0, Math.floor((ahora - arrancadoEn) / 1000))
  const minutos = segundos / 60

  // Tres estados y no dos: avisar solo al pasarse llega tarde para poder
  // acelerar. El ámbar entra al 85% del objetivo, que es cuando todavía se
  // puede recortar algo.
  const tono = objetivo == null
    ? undefined
    : minutos >= objetivo ? 'pasado'
    : minutos >= objetivo * 0.85 ? 'cerca'
    : undefined

  return (
    <div className={estilos.reloj}>
      <button
        type="button"
        className={estilos.relojCifra}
        data-tono={tono}
        onClick={() => setAbierto((v) => !v)}
        title={objetivo ? `Objetivo: ${objetivo} min` : 'Poner un objetivo de duración'}
        aria-label={`Tiempo de reunión: ${reloj(segundos)}${objetivo ? `, objetivo ${objetivo} minutos` : ''}`}
      >
        {reloj(segundos)}
        {objetivo != null && <span className={estilos.relojObjetivo}>/ {objetivo}′</span>}
      </button>

      {abierto && (
        <div className={estilos.relojMenu} role="group" aria-label="Objetivo de duración">
          {OBJETIVOS.map((m) => (
            <button
              key={m}
              type="button"
              data-activo={objetivo === m ? 'true' : undefined}
              onClick={() => { setObjetivo(m); setAbierto(false) }}
            >
              {m}′
            </button>
          ))}
          <button type="button" onClick={() => { setObjetivo(null); setAbierto(false) }}>
            sin objetivo
          </button>
        </div>
      )}
    </div>
  )
}
