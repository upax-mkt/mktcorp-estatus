'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Dispara la animación de un gráfico cuando entra en pantalla, no al cargar.
 *
 * POR QUÉ NO AL CARGAR: el documento se lee con scroll y una sesión trae diez
 * o quince secciones. Animar todo al pintar significa que el gráfico de la
 * página siete ya terminó su animación antes de que nadie llegue a él —o sea,
 * que nadie la ve. Y en modo Presentar, cada sección ocupa una pantalla: la
 * animación tiene que arrancar al pasar a ella.
 *
 * Se dispara UNA vez y se olvida: un gráfico que se re-anima cada vez que pasa
 * por el viewport marea en una sesión donde se sube y se baja para comparar.
 *
 * NUNCA ESCONDE UN GRÁFICO. El estado de arranque (invisible) solo se aplica
 * cuando este componente ya montó en el navegador y puede sacarlo de ahí — ver
 * `data-animar`. Sin JavaScript, al imprimir o con `prefers-reduced-motion`,
 * el gráfico se ve completo desde el HTML del servidor.
 *
 * LOS DOS ATRIBUTOS SE ESCRIBEN EN EL DOM, no por estado de React. No hay nada
 * que re-renderizar —el SVG ya está pintado y solo cambia su CSS— y así el
 * componente no provoca dos renders de más por cada gráfico de la página.
 */

/**
 * Tope de seguridad. Si en este tiempo el observador no ha disparado —una
 * pestaña en segundo plano, un contenedor con overflow raro, un navegador
 * que se comporta distinto— el gráfico se muestra igual. Vale más una
 * animación perdida que un gráfico en blanco delante de un director.
 */
const ESPERA_MAXIMA = 1500

export function AlEntrar({ children, className }: { children: ReactNode; className?: string }) {
  const referencia = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const nodo = referencia.current
    if (!nodo) return

    const mostrar = () => {
      nodo.dataset.visible = 'true'
    }

    if (typeof IntersectionObserver === 'undefined') {
      mostrar()
      return
    }

    // A partir de aquí hay JavaScript vivo: se puede esconder el gráfico
    // sabiendo que algo va a volver a mostrarlo.
    nodo.dataset.animar = 'true'

    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          mostrar()
          observador.disconnect()
        }
      },
      // Un poco antes de que asome del todo: al llegar, ya está empezando.
      { rootMargin: '0px 0px -10% 0px', threshold: 0.15 },
    )
    observador.observe(nodo)

    const rescate = setTimeout(mostrar, ESPERA_MAXIMA)
    return () => {
      observador.disconnect()
      clearTimeout(rescate)
    }
  }, [])

  return (
    <div ref={referencia} className={className}>
      {children}
    </div>
  )
}
