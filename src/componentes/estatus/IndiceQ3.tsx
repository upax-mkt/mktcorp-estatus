'use client'

import { useEffect, useState } from 'react'
import estilos from './estatus.module.css'

export type BloqueQ3 = { id: string; numero: string; nombre: string }

/**
 * EL ÍNDICE LATERAL: dónde está quien lee, cuánto falta y salto a cualquier bloque.
 *
 * Cecilia navega sola: el índice es lo que le deja entrar por cualquier parte.
 * El punto naranja es el hilo de la pieza —nace en la portada orbitando «Q3»— y
 * aquí marca el bloque activo.
 *
 * Sin JavaScript es una lista de enlaces que funciona igual. El bloque activo y
 * el tono (claro u oscuro) se escriben como atributos, no como estilos: el CSS
 * decide cómo se ven.
 */
export function IndiceQ3({ bloques }: { bloques: readonly BloqueQ3[] }) {
  const [activo, setActivo] = useState(bloques[0]?.id ?? '')
  const [tono, setTono] = useState('foto')
  const [foco, setFoco] = useState<string | null>(null)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const laminas = Array.from(document.querySelectorAll<HTMLElement>('[data-layout][data-bloque]'))
    // La lámina que cruza la mitad de la pantalla es la que se está leyendo.
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue
          const nodo = e.target as HTMLElement
          setActivo(nodo.dataset.bloque ?? '')
          setTono(nodo.dataset.tono ?? 'claro')
        }
      },
      { rootMargin: '-50% 0px -50% 0px', threshold: 0 },
    )
    laminas.forEach((l) => observador.observe(l))

    // La UDN elegida en cualquier gráfico vive en <html>: aquí solo se refleja.
    const raiz = document.documentElement
    const leer = () => setFoco(raiz.dataset.udnFoco ?? null)
    const mutaciones = new MutationObserver(leer)
    mutaciones.observe(raiz, { attributes: true, attributeFilter: ['data-udn-foco'] })
    leer()
    // El brillo de los paneles de vidrio sigue al cursor: se publica su posición
    // una vez por cuadro y el CSS hace el resto. Solo con puntero fino.
    let cuadro = 0
    const seguir = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || cuadro) return
      cuadro = requestAnimationFrame(() => {
        cuadro = 0
        raiz.style.setProperty('--mx', `${e.clientX}px`)
        raiz.style.setProperty('--my', `${e.clientY}px`)
      })
    }
    window.addEventListener('pointermove', seguir, { passive: true })
    // Teclado: cada pulsación lleva a la lámina siguiente o anterior, encuadrada.
    // No actúa en modo presentación (tiene sus propias teclas), con un diálogo
    // abierto, ni cuando la tecla le pertenece al control que tiene el foco.
    let ultimo = { i: -1, t: 0 }
    const tecla = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || window.innerWidth < 900) return
      if (document.querySelector('[data-presentando="true"], dialog[open]')) return
      const adelante = ['PageDown', 'ArrowDown', 'ArrowRight'].includes(e.key) || (e.key === ' ' && !e.shiftKey)
      const atras = ['PageUp', 'ArrowUp', 'ArrowLeft'].includes(e.key) || (e.key === ' ' && e.shiftKey)
      if (!adelante && !atras) return
      const enControl = (e.target as HTMLElement | null)?.closest('button, a, input, select, textarea')
      if (enControl && e.key === ' ') return
      const todas = Array.from(document.querySelectorAll<HTMLElement>('[data-layout]'))
      const enPantalla = todas.findIndex((l) => l.offsetTop + l.offsetHeight / 2 > window.scrollY)
      const desde = Date.now() - ultimo.t < 700 && ultimo.i >= 0 ? ultimo.i : Math.max(0, enPantalla)
      const i = Math.min(todas.length - 1, Math.max(0, desde + (adelante ? 1 : -1)))
      e.preventDefault()
      ultimo = { i, t: Date.now() }
      todas[i].scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
    }
    window.addEventListener('keydown', tecla)
    return () => { observador.disconnect(); mutaciones.disconnect(); window.removeEventListener('pointermove', seguir); window.removeEventListener('keydown', tecla); cancelAnimationFrame(cuadro) }
  }, [])

  const indice = Math.max(0, bloques.findIndex((b) => b.id === activo))
  return (
    <nav className={estilos.indice} data-tono={tono} aria-label="Bloques de la presentación">
      <ol>
        {bloques.map((b, i) => (
          <li key={b.id} data-activo={i === indice} data-visto={i < indice}>
            <a href={`#${b.id}`} aria-current={i === indice ? 'step' : undefined}>
              <span className={estilos.indiceNombre}>{b.nombre}</span>
              <span className={estilos.indicePunto} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ol>
      {foco && (
        <button type="button" className={estilos.indiceFoco} onClick={() => { delete document.documentElement.dataset.udnFoco }}>
          <span>Siguiendo a <b>{foco}</b></span><i aria-hidden="true">Quitar ×</i><span className={estilos.soloLectores}> — dejar de seguir</span>
        </button>
      )}
    </nav>
  )
}
