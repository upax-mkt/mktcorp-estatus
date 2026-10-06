import type { CSSProperties } from 'react'
import base from './base.module.css'

/** El orden de entrada de un elemento dentro de su escena (escalón de 90 ms). */
export const orden = (i: number) => ({ '--i': i }) as CSSProperties

/**
 * EL CLIENTE: el punto amarillo que atraviesa toda la pieza (hilo conductor).
 * `tam` en px. Decorativo para el lector de pantalla: el texto de cada escena
 * ya nombra al cliente.
 */
export function Punto({ tam = 22, className = '', style }: { tam?: number; className?: string; style?: CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      className={`${base.punto} ${className}`}
      style={{ '--punto': `${tam}px`, ...style } as CSSProperties}
    />
  )
}

/** Las dos capas de luz de una escena oscura: luz y grano. Van primero dentro de la `<section>`. */
export function Luz() {
  return (
    <>
      <div className={base.luz} aria-hidden="true" />
      <div className={base.grano} aria-hidden="true" />
    </>
  )
}
