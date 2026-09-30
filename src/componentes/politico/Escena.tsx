'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/**
 * ARRANCA LA ANIMACIÓN DE UNA ESCENA CUANDO LLEGA A LA PANTALLA.
 *
 * Es el mismo oficio que `AlEntrar` (src/componentes/graficos/AlEntrar.tsx), con
 * una diferencia que en una presentación decide todo: el RESCATE. `AlEntrar`
 * muestra todo a los 1.5 s aunque no se vea, porque en un documento vale más un
 * gráfico sin animar que uno en blanco. Aquí eso hacía que las escenas de más
 * abajo terminaran su animación antes de que nadie llegara a ellas: al pasar a
 * la lámina seis, ya estaba quieta. El rescate de esta versión solo actúa si la
 * escena YA está en pantalla y el observador no disparó, que es el único caso
 * en que esperar sería dejarla en blanco.
 *
 * NUNCA ESCONDE NADA SIN JAVASCRIPT. El estado de arranque (`data-animar`) lo
 * pone este componente ya montado en el navegador; sin JS, al imprimir o con
 * `prefers-reduced-motion`, la escena se ve completa desde el HTML del servidor
 * (ver `politico.module.css`).
 *
 * Los atributos se escriben en el DOM y no en estado de React, igual que en
 * `AlEntrar`: no hay nada que re-renderizar, solo cambia el CSS.
 */
const ESPERA_RESCATE = 2000

export function Escena({ children, className }: { children: ReactNode; className?: string }) {
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

    nodo.dataset.animar = 'true'

    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          mostrar()
          observador.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.2 },
    )
    observador.observe(nodo)

    const rescate = setTimeout(() => {
      const caja = nodo.getBoundingClientRect()
      if (caja.top < window.innerHeight && caja.bottom > 0) {
        mostrar()
        observador.disconnect()
      }
    }, ESPERA_RESCATE)

    // Al imprimir se ve todo, esté donde esté.
    window.addEventListener('beforeprint', mostrar)
    return () => {
      observador.disconnect()
      clearTimeout(rescate)
      window.removeEventListener('beforeprint', mostrar)
    }
  }, [])

  return (
    <div ref={referencia} className={className}>
      {children}
    </div>
  )
}
