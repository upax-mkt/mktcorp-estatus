'use client'

import { useLayoutEffect, useRef } from 'react'

/**
 * UNA CIFRA QUE CUENTA HASTA SU VALOR cuando llega a la pantalla.
 *
 * El servidor pinta el valor FINAL: sin JavaScript, al imprimir o con
 * `prefers-reduced-motion`, se lee el número correcto y nada se mueve. Solo ya
 * montado en el navegador, y antes del primer pintado (`useLayoutEffect`), la
 * cifra baja a cero para contar desde ahí al entrar — así no parpadea el valor
 * final antes de arrancar.
 *
 * El número se escribe en el DOM y no en estado de React: son sesenta cuadros
 * por segundo durante un segundo y medio, y ninguno necesita un render.
 */
interface Props {
  valor: number
  decimales?: number
  prefijo?: string
  sufijo?: string
  className?: string
  /** Cuánto dura la cuenta. Por defecto, 1400 ms. */
  duracion?: number
  /** Espera antes de arrancar, para que varias cifras cuenten de una en una. */
  retraso?: number
}

const DURACION = 1400
const ESPERA_RESCATE = 2000

function formatear(n: number, decimales: number): string {
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(n)
}

export function CifraAnimada({ valor, decimales = 0, prefijo = '', sufijo = '', className, duracion = DURACION, retraso = 0 }: Props) {
  const referencia = useRef<HTMLSpanElement>(null)
  const final = `${prefijo}${formatear(valor, decimales)}${sufijo}`

  useLayoutEffect(() => {
    // Se escribe sobre el MISMO nodo de texto que pintó React (`nodeValue`), no
    // con `textContent`, que lo reemplazaría por uno nuevo y dejaría a React
    // apuntando a un nodo que ya no está en la página.
    const texto = referencia.current?.firstChild
    if (!texto || texto.nodeType !== Node.TEXT_NODE) return
    const nodo = referencia.current as HTMLSpanElement
    const sinMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (typeof IntersectionObserver === 'undefined' || sinMovimiento) return

    let cuadro = 0
    let espera: ReturnType<typeof setTimeout> | undefined
    let arrancada = false
    texto.nodeValue = `${prefijo}${formatear(0, decimales)}${sufijo}`

    const contar = () => {
      if (arrancada) return
      arrancada = true
      let inicio = 0
      const paso = (ahora: number) => {
        if (!inicio) inicio = ahora
        const avance = Math.min(1, (ahora - inicio) / duracion)
        // Sale rápido y frena al llegar: el número se asienta, no choca.
        const curva = 1 - Math.pow(1 - avance, 3)
        texto.nodeValue = `${prefijo}${formatear(valor * curva, decimales)}${sufijo}`
        if (avance < 1) cuadro = requestAnimationFrame(paso)
      }
      espera = setTimeout(() => { cuadro = requestAnimationFrame(paso) }, retraso)
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          observador.disconnect()
          contar()
        }
      },
      { threshold: 0.5 },
    )
    observador.observe(nodo)

    // Si ya está a la vista y el observador no disparó, cuenta igual: una cifra
    // en cero delante de Ceci es peor que una animación perdida.
    const rescate = setTimeout(() => {
      const caja = nodo.getBoundingClientRect()
      if (caja.top < window.innerHeight && caja.bottom > 0) {
        observador.disconnect()
        contar()
      }
    }, ESPERA_RESCATE)

    const alImprimir = () => {
      clearTimeout(espera)
      cancelAnimationFrame(cuadro)
      texto.nodeValue = `${prefijo}${formatear(valor, decimales)}${sufijo}`
    }
    window.addEventListener('beforeprint', alImprimir)

    return () => {
      observador.disconnect()
      clearTimeout(rescate)
      clearTimeout(espera)
      cancelAnimationFrame(cuadro)
      window.removeEventListener('beforeprint', alImprimir)
    }
  }, [valor, decimales, prefijo, sufijo, duracion, retraso])

  return (
    <span ref={referencia} className={className}>
      {final}
    </span>
  )
}
