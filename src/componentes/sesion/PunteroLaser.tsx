'use client'

import { useEffect, useRef, useState } from 'react'
import estilos from './presentar.module.css'

/**
 * EL PUNTERO LÁSER.
 *
 * Franco: "una opción que despliegue herramientas interactivas como un puntero
 * láser".
 *
 * Un punto que sigue al cursor sobre lo proyectado. Sirve para lo que sirve un
 * láser de verdad: señalar una cifra concreta mientras se habla, sin tener que
 * decir "la tercera columna, la segunda fila".
 *
 * TRES DECISIONES que no son de gusto:
 *
 * - **`pointer-events: none`** en la capa. Sin eso, el láser se traga los
 *   clics de todo lo que hay debajo y la presentación deja de poder navegarse.
 * - **Se mueve fuera de React.** La posición se escribe directamente en el
 *   estilo del nodo con `requestAnimationFrame`, no con `useState`: un
 *   `setState` por cada `mousemove` son sesenta renders por segundo del
 *   documento entero, y el láser se arrastraría detrás del cursor justo
 *   cuando se está señalando algo.
 * - **Se apaga solo al salir de presentar.** Un láser encendido en una página
 *   que se lee con scroll es un punto rojo que persigue a quien lee.
 * - **Lo monta y desmonta el padre**, en vez de recibir un `activo` y quedarse
 *   dormido. Con un prop había que apagar el estado dentro del efecto al
 *   desactivarse —un `setState` en el cuerpo de un efecto, que el compilador
 *   de React marca como error— y además dejaba el punto en su última posición
 *   al reactivarlo. Desmontar resuelve las dos cosas sin código.
 */

export function PunteroLaser() {
  const punto = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let pendiente = 0
    let x = 0
    let y = 0

    function pintar() {
      pendiente = 0
      const nodo = punto.current
      if (nodo) nodo.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }

    function alMover(e: PointerEvent) {
      x = e.clientX
      y = e.clientY
      setVisible(true)
      // Un cuadro por movimiento como mucho: el navegador dispara `pointermove`
      // más rápido de lo que pinta.
      if (!pendiente) pendiente = requestAnimationFrame(pintar)
    }

    function alSalir() {
      setVisible(false)
    }

    window.addEventListener('pointermove', alMover)
    document.addEventListener('pointerleave', alSalir)
    return () => {
      window.removeEventListener('pointermove', alMover)
      document.removeEventListener('pointerleave', alSalir)
      if (pendiente) cancelAnimationFrame(pendiente)
    }
  }, [])

  return (
    <div
      ref={punto}
      className={estilos.laser}
      data-visible={visible ? 'true' : undefined}
      aria-hidden
    />
  )
}
