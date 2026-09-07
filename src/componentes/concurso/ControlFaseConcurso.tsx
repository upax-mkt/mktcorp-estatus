'use client'

import { useState, useTransition } from 'react'
import estilos from '@/app/concurso/concurso.module.css'
import { establecerFaseConcursoAction } from '@/app/concurso/acciones'
import type { FaseConcurso } from '@/concurso/fase'

/**
 * ABRIR Y CERRAR EL CONCURSO SIN REDESPLEGAR.
 *
 * ⚠️ EXISTE POR UN DÍA CONCRETO. El 7-sep-2026 la recepción cerró sola a las
 * 11:00 mientras un defecto impedía reemplazar imágenes: el concurso pasó a
 * votación con la galería en público y una sola propuesta dentro, y recuperarlo
 * exigió editar una constante y volver a desplegar. Las fechas siguen mandando
 * el 99% del tiempo; esto es el 1% restante.
 *
 * AUTOMÁTICO NO ES UNA FASE MÁS, y por eso su botón va aparte y en verde. Fijar
 * a mano la fase que el calendario ya daría parece inofensivo y no lo es: deja
 * el concurso clavado ahí, y a las 15:45 nadie se acordará de que el paso a
 * resultados dejó de ser automático. Volver a automático es la posición de
 * reposo, no una opción equivalente.
 */
const OPCIONES: ReadonlyArray<{ fase: FaseConcurso; boton: string; explica: string }> = [
  { fase: 'recepcion', boton: 'Recepción abierta', explica: 'se suben propuestas y la galería está cerrada' },
  { fase: 'votacion', boton: 'Votación abierta', explica: 'la galería es pública y se puede votar' },
  { fase: 'cerrado', boton: 'Votación cerrada', explica: 'se ve la galería, ya no se vota, sin resultado' },
  { fase: 'resultados', boton: 'Resultados', explica: 'se revela el ganador y quién firma cada propuesta' },
]

export function ControlFaseConcurso({
  faseActual,
  faseForzada,
}: {
  faseActual: FaseConcurso
  faseForzada: FaseConcurso | null
}) {
  const [pendiente, comenzar] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)

  function fijar(fase: FaseConcurso | null) {
    setError(null)
    setMensaje(null)
    comenzar(async () => {
      const r = await establecerFaseConcursoAction(fase)
      if (r.error) setError(r.error)
      else setMensaje(r.ok ?? 'Hecho.')
    })
  }

  const explicacion = OPCIONES.find((o) => o.fase === faseActual)?.explica ?? ''

  return (
    <div className={estilos.faseControl}>
      <h4>Estado del concurso</h4>
      <p className={estilos.faseEstado}>
        Ahora mismo: <strong>{faseActual}</strong> — {explicacion}.
        {' '}
        {faseForzada === null
          ? <>Lo decide el <strong>calendario</strong>, y seguirá avanzando solo.</>
          : <span className={estilos.faseManual}>Fijado <strong>a mano</strong>: el calendario está en suspenso hasta que vuelvas a automático.</span>}
      </p>
      <div className={estilos.faseBotones}>
        {OPCIONES.map((o) => (
          <button
            key={o.fase}
            type="button"
            disabled={pendiente}
            className={faseForzada === o.fase ? estilos.faseActiva : undefined}
            title={o.explica}
            onClick={() => fijar(o.fase)}
          >
            {o.boton}
          </button>
        ))}
        <button
          type="button"
          disabled={pendiente || faseForzada === null}
          className={estilos.faseAuto}
          title="Devuelve el mando a las fechas de config.ts"
          onClick={() => fijar(null)}
        >
          Volver al calendario
        </button>
      </div>
      {error && <p className={estilos.mensajeError} role="alert">{error}</p>}
      {mensaje && <p className={estilos.mensajeOk} role="status">{mensaje}</p>}
    </div>
  )
}
