'use client'

import { useState } from 'react'
import estilos from '@/app/concurso/concurso.module.css'
import type { PropuestaConcurso } from '@/db/concurso'

/**
 * LAS VISTAS DE UNA PROPUESTA, COMO SLIDER.
 *
 * ⚠️ LA VERSIÓN ANTERIOR TAMBIÉN ERA UN SLIDER Y POR ESO SE VOTÓ A CIEGAS
 * (9-sep-2026). Era un `overflow-x` con scroll-snap y nada más: sin flechas,
 * sin puntos, sin contador y —en macOS, que oculta las barras— sin un solo
 * píxel que anunciara que había una segunda imagen. Quien subió el frente, la
 * espalda y las mangas compitió con el frente.
 *
 * La diferencia no es deslizar o no deslizar: es que AQUÍ SE VE QUE HAY MÁS.
 * El contador dice cuántas van de cuántas, los puntos las hacen saltables y las
 * flechas dan el gesto sin pedir que se adivine. Con una sola imagen no aparece
 * ninguno de los tres: un control que no controla nada es ruido.
 *
 * Los controles son `<button>` de verdad, no divs con onClick, para que el
 * teclado y los lectores de pantalla los encuentren sin que haya que añadir
 * nada más.
 */
export function SliderImagenes({
  titulo,
  imagenes,
  alto,
}: {
  titulo: string
  imagenes: PropuestaConcurso['imagenes']
  /** `alto` cambia la proporción del marco; el podio la quiere más generosa. */
  alto?: 'normal' | 'podio'
}) {
  const [activa, setActiva] = useState(0)
  const total = imagenes.length
  if (total === 0) return <div className={estilos.sliderVacio}>Sin imagen</div>

  // El módulo hace que la última empalme con la primera: en tres imágenes,
  // toparse con una flecha muerta es más molesto que dar la vuelta.
  const ir = (indice: number) => setActiva((indice + total) % total)
  const imagen = imagenes[activa]

  return (
    <div className={`${estilos.slider} ${alto === 'podio' ? estilos.sliderPodio : ''}`}>
      <div className={estilos.sliderMarco}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/concurso/imagen/${imagen.id}`} alt={`${titulo}, vista ${activa + 1} de ${total}`} />
        {total > 1 && (
          <>
            <button type="button" className={`${estilos.sliderFlecha} ${estilos.sliderAtras}`} onClick={() => ir(activa - 1)} aria-label="Vista anterior">‹</button>
            <button type="button" className={`${estilos.sliderFlecha} ${estilos.sliderAdelante}`} onClick={() => ir(activa + 1)} aria-label="Vista siguiente">›</button>
            <span className={estilos.sliderContador} aria-hidden="true">{activa + 1}/{total}</span>
          </>
        )}
      </div>
      {total > 1 && (
        <div className={estilos.sliderPuntos} role="tablist" aria-label={`Vistas de ${titulo}`}>
          {imagenes.map((img, i) => (
            <button
              key={img.id}
              type="button"
              role="tab"
              aria-selected={i === activa}
              aria-label={`Vista ${i + 1} de ${total}`}
              className={i === activa ? `${estilos.sliderPunto} ${estilos.sliderPuntoActivo}` : estilos.sliderPunto}
              onClick={() => ir(i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
