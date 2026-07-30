'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { RelojReunion } from './RelojReunion'
import { PunteroLaser } from './PunteroLaser'
import { GrabarReunion } from './GrabarReunion'
import { MinutaCliente } from '@/app/deck/[id]/minuta/MinutaCliente'
import type { PersonaMonday } from '@/monday/personas'
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
interface Props {
  children: ReactNode
  /**
   * De qué sesión es. Sin ella no se puede minutar lo grabado —la minuta
   * cuelga de una sesión— y las herramientas de grabar no se ofrecen.
   */
  sesionId?: string
  /** Solo el equipo minuta. Un director presenta y señala; no levanta el acta. */
  equipo?: boolean
  /** La gente viva de Mkt Corp, para el selector de responsable — solo se usa si sesionId && equipo llegan a mostrar MinutaCliente. */
  personas: PersonaMonday[]
}

export function ModoPresentar({ children, sesionId, equipo, personas }: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const [presentando, setPresentando] = useState(false)
  const [actual, setActual] = useState(0)
  const [total, setTotal] = useState(0)
  const [arrancadoEn, setArrancadoEn] = useState(0)
  const [laser, setLaser] = useState(false)
  /** Lo grabado, esperando a que alguien lo revise y lo convierta en minuta. */
  const [transcripcion, setTranscripcion] = useState<string | null>(null)
  const dialogoMinuta = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const n = dialogoMinuta.current
    if (!n) return
    if (transcripcion !== null && !n.open) n.showModal()
    if (transcripcion === null && n.open) n.close()
  }, [transcripcion])

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
    // El reloj arranca AQUÍ y no al montar: mide la reunión, no el rato que
    // alguien lleva con el documento abierto.
    setArrancadoEn(Date.now())
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
    // El láser se apaga solo: un punto rojo persiguiendo al lector en una
    // página que se lee con scroll es un estorbo, no una herramienta.
    setLaser(false)
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

        {/* EL LÁSER VA DENTRO DEL CONTENEDOR, y no es un detalle de orden:
            este div es el que entra en pantalla completa, y en pantalla
            completa el navegador solo pinta ESE elemento y sus descendientes.
            Estando fuera, el punto existía en el DOM y no se veía nunca — que
            es exactamente lo que reportó Franco. */}
        {presentando && laser && <PunteroLaser />}

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

            <span className={estilos.separadorControl} aria-hidden />

            <RelojReunion arrancadoEn={arrancadoEn} />

            <button
              type="button"
              onClick={() => setLaser((v) => !v)}
              data-activo={laser ? 'true' : undefined}
              aria-pressed={laser}
              title="Puntero láser"
            >
              Láser
            </button>

            {/* Grabar solo si hay sesión y quien presenta puede minutar. */}
            {sesionId && equipo && <GrabarReunion alTerminar={setTranscripcion} />}

            <button type="button" onClick={salir} className={estilos.salir}>
              Salir
            </button>
          </nav>
        )}
      </div>

      {/* Lo grabado NO se publica solo: se abre la misma pantalla de revisión
          de siempre con la transcripción ya puesta. Un reconocimiento de voz
          se equivoca con los nombres propios, y esos nombres acaban siendo
          responsables de acuerdos en la sala de alguien. */}
      <dialog
        ref={dialogoMinuta}
        className={estilos.dialogoMinuta}
        aria-label="Minuta de la reunión grabada"
        onClose={() => setTranscripcion(null)}
      >
        {transcripcion !== null && sesionId && (
          <div className={estilos.cajaMinuta}>
            <header className={estilos.cabeceraMinuta}>
              <div>
                <h3>Lo que se grabó</h3>
                <p>
                  {transcripcion.trim().length === 0
                    ? 'No se oyó nada. Puedes pegar la transcripción a mano.'
                    : 'Revísalo antes de generar: el reconocimiento de voz falla sobre todo con los nombres propios, y esos nombres acaban siendo responsables de acuerdos.'}
                </p>
              </div>
              <button type="button" onClick={() => setTranscripcion(null)} aria-label="Cerrar">✕</button>
            </header>
            <MinutaCliente
              de={{ sesionId }}
              transcripcionInicial={transcripcion}
              alPublicar={() => setTranscripcion(null)}
              personas={personas}
            />
          </div>
        )}
      </dialog>

      {!presentando && (
        <button type="button" onClick={entrar} className={estilos.boton}>
          Presentar
        </button>
      )}
    </>
  )
}
