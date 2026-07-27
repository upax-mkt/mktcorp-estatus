'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import estilos from './presentar.module.css'

/**
 * Envuelve el documento de una sesión y le añade el modo presentación.
 *
 * Es lo que sustituye a "exportar a PowerPoint": el mismo documento que se lee
 * con scroll el resto del mes se proyecta en la junta a pantalla completa, una
 * sección a la vez, sin generar ningún archivo. Nada se duplica ni se queda
 * desactualizado, porque es la misma página.
 *
 * Fuera del modo presentación no interfiere con nada: el documento se lee
 * normal y esto solo aporta el botón.
 */
export function ModoPresentar({ children }: { children: ReactNode }) {
  const contenedor = useRef<HTMLDivElement>(null)
  const [presentando, setPresentando] = useState(false)
  const [actual, setActual] = useState(0)
  const [total, setTotal] = useState(0)

  // Sin useCallback/useMemo a propósito: el proyecto compila con React
  // Compiler, que memoiza por su cuenta y avisa (como error de lint) cuando una
  // memoización manual le impide hacerlo.
  function secciones(): HTMLElement[] {
    const raiz = contenedor.current
    if (!raiz) return []
    // Solo las que se ven. La agenda se esconde al proyectar (repite lo que
    // viene después), y contarla hacía dos cosas mal: el contador decía
    // "1 / 14" habiendo 13 alcanzables, y la primera flecha no hacía nada
    // porque `scrollIntoView` sobre un `display: none` es un no-op.
    return Array.from(raiz.querySelectorAll<HTMLElement>('[data-layout]')).filter(
      (seccion) => seccion.offsetParent !== null,
    )
  }

  async function entrar() {
    const raiz = contenedor.current
    if (!raiz) return
    setTotal(secciones().length)
    try {
      // Si el navegador la niega (permisos, iframe), se presenta igual en la
      // ventana: el modo es útil aunque no haya pantalla completa.
      await raiz.requestFullscreen?.()
    } catch {
      /* se sigue sin pantalla completa */
    }
    setPresentando(true)
    irA(0)
  }

  async function salir() {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen()
      } catch {
        /* ya estaba fuera */
      }
    }
    setPresentando(false)
  }

  function irA(indice: number) {
    const lista = secciones()
    if (lista.length === 0) return
    const destino = Math.max(0, Math.min(indice, lista.length - 1))
    lista[destino].scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActual(destino)
  }

  // Salir con Esc lo maneja el navegador: hay que enterarse para sincronizar.
  useEffect(() => {
    function alCambiarPantalla() {
      if (!document.fullscreenElement) setPresentando(false)
    }
    document.addEventListener('fullscreenchange', alCambiarPantalla)
    return () => document.removeEventListener('fullscreenchange', alCambiarPantalla)
  }, [])

  // El salto se resuelve aquí dentro, leyendo el DOM en el momento de la
  // tecla: así el efecto no depende de ninguna función del componente (que
  // cambiaría en cada render) y se suscribe una sola vez por sección.
  useEffect(() => {
    if (!presentando) return

    function saltar(paso: number) {
      const raiz = contenedor.current
      if (!raiz) return
      const lista = Array.from(raiz.querySelectorAll<HTMLElement>('[data-layout]'))
      if (lista.length === 0) return
      const destino = Math.max(0, Math.min(actual + paso, lista.length - 1))
      lista[destino].scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActual(destino)
    }

    function alTeclado(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault()
        saltar(1)
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        saltar(-1)
      } else if (e.key === 'Escape') {
        salir()
      }
    }

    window.addEventListener('keydown', alTeclado)
    return () => window.removeEventListener('keydown', alTeclado)
  }, [presentando, actual])

  return (
    <>
      <div
        ref={contenedor}
        className={presentando ? estilos.presentando : undefined}
        data-presentando={presentando ? 'true' : undefined}
      >
        {children}

        {presentando && (
          <nav className={estilos.controles} aria-label="Controles de presentación">
            <button type="button" onClick={() => irA(actual - 1)} aria-label="Sección anterior">
              ←
            </button>
            <span className={estilos.contador}>
              {Math.min(actual + 1, total)} / {total}
            </span>
            <button type="button" onClick={() => irA(actual + 1)} aria-label="Sección siguiente">
              →
            </button>
            <button type="button" onClick={salir} className={estilos.salir}>
              Salir
            </button>
          </nav>
        )}
      </div>

      {!presentando && (
        <button type="button" onClick={entrar} className={estilos.boton}>
          Presentar
        </button>
      )}
    </>
  )
}
