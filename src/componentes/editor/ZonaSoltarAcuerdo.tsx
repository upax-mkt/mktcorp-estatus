'use client'

import { useState, useTransition } from 'react'
import type { Acuerdo } from '@/dominio/salas'
import estilos from './zona-soltar-acuerdo.module.css'

interface Props {
  /** Los acuerdos ya retomados en esta sección — solo para el aviso; el contenido real se ve en la vista previa de la sección. */
  acuerdos: Acuerdo[]
  /** Retoma el acuerdo cuyo id llega en el `drop`. */
  alSoltar: (acuerdoId: string) => void | Promise<void>
}

/**
 * LA ZONA DE DESTINO del arrastre (ronda 9, tarea 6 — revisión del
 * coordinador, corrigiendo el primer intento).
 *
 * `AcuerdosArrastrables` es la FUENTE: sus tarjetas son `draggable` y ponen
 * el id del acuerdo en `dataTransfer`. Esto es el DESTINO. Sin un elemento
 * que llame `preventDefault()` en `dragover`, el navegador no ofrece NINGÚN
 * sitio de esta pantalla como válido para soltar — es lo que hacía que, en
 * el primer intento, soltar en CUALQUIER parte disparara la acción igual
 * (no había destino real que pudiera rechazarla). Con esto puesto, un
 * arrastre que se suelta fuera de aquí simplemente no hace nada: el
 * navegador lo trata como cancelado.
 *
 * Vive DENTRO de `TarjetaSeccion`, en la tarjeta de Acuerdos y Pendientes —
 * la única sección a la que un acuerdo puede aterrizar (ver
 * `itemDeAcuerdosPendientes`, src/db/sesiones.ts) — y por eso solo se pinta
 * ahí, no en cada sección de la sesión.
 */
export function ZonaSoltarAcuerdo({ acuerdos, alSoltar }: Props) {
  const [sobrevolando, setSobrevolando] = useState(false)
  const [, empezarTransicion] = useTransition()

  function soltar(acuerdoId: string) {
    empezarTransicion(async () => {
      try {
        await alSoltar(acuerdoId)
      } catch (error) {
        // Mismo criterio que AcuerdosArrastrables: sin revalidación (falló
        // antes de llegar), el acuerdo se sigue ofreciendo y se puede
        // reintentar — arrastrando otra vez, o con el botón «Añadir».
        console.error(`[ZonaSoltarAcuerdo] no se pudo retomar "${acuerdoId}":`, error)
      }
    })
  }

  return (
    <div
      className={estilos.zona}
      role="group"
      aria-label="Suelta aquí un acuerdo para retomarlo en esta reunión"
      data-sobrevolando={sobrevolando ? 'true' : undefined}
      onDragOver={(evento) => {
        evento.preventDefault() // Sin esto el navegador nunca ofrece soltar aquí.
        evento.dataTransfer.dropEffect = 'copy'
        setSobrevolando(true)
      }}
      onDragLeave={() => setSobrevolando(false)}
      onDrop={(evento) => {
        evento.preventDefault()
        setSobrevolando(false)
        const acuerdoId = evento.dataTransfer.getData('text/plain')
        if (acuerdoId) soltar(acuerdoId)
      }}
    >
      <span className={estilos.icono} aria-hidden="true">⬇</span>
      <p className={estilos.texto}>
        {acuerdos.length === 0
          ? 'Suelta aquí un acuerdo de la columna de arriba para retomarlo en esta reunión.'
          : `${acuerdos.length} ${acuerdos.length === 1 ? 'acuerdo retomado' : 'acuerdos retomados'} de la sala — se ven en la vista previa de abajo. Suelta otro aquí para añadirlo.`}
      </p>
    </div>
  )
}
