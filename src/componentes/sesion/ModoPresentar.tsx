'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { RelojReunion } from './RelojReunion'
import { PunteroLaser } from './PunteroLaser'
import { GrabarReunion } from './GrabarReunion'
import { MinutaCliente } from '@/app/deck/[id]/minuta/MinutaCliente'
import type { PersonaResponsable } from '@/lib/personas'
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
   * De qué reunión es. Sin ella no se puede minutar lo grabado —la minuta
   * cuelga de una reunión— y las herramientas de grabar no se ofrecen.
   */
  reunionId?: string
  /** Solo el equipo minuta. Un director presenta y señala; no levanta el acta. */
  equipo?: boolean
  /** La gente viva de Mkt Corp, para el selector de responsable — solo se usa si reunionId && equipo llegan a mostrar MinutaCliente. */
  personas: PersonaResponsable[]
  /**
   * Deja constancia de que alguien abrió el modo presentación (ronda 9,
   * tarea 4 — «quiénes están en vivo interactuando»). Opcional por el mismo
   * motivo que `reunionId`: sin reunión no hay nada que registrar.
   *
   * Se llama SIN esperar su resultado y tragándose cualquier error: es una
   * bitácora, y un director en vivo delante de un cliente no puede quedarse
   * sin pantalla completa porque la bitácora tropezó. Quien no es de Mkt Corp
   * (el director de una UDN, que también presenta desde su sala) no tiene
   * correo que registrar — la Server Action que se pase aquí decide eso, no
   * este componente.
   */
  registrarPresentacionAction?: (reunionId: string) => Promise<void>
}

export function ModoPresentar({ children, reunionId, equipo, personas, registrarPresentacionAction }: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const [presentando, setPresentando] = useState(false)
  const [actual, setActual] = useState(0)
  const [total, setTotal] = useState(0)
  const [arrancadoEn, setArrancadoEn] = useState(0)
  const [laser, setLaser] = useState(false)
  /**
   * Lo grabado, esperando a que alguien lo revise y lo convierta en minuta.
   *
   * Ya NO se vacía al cerrar el diálogo (revisión final de la rama, punto 3):
   * solo `limpiarTranscripcion()`, más abajo, lo hace — y eso solo pasa al
   * publicar la minuta con éxito o al pulsar «Descartar» explícitamente.
   * `revisionAbierta`, justo debajo, es quien de verdad controla si el
   * `<dialog>` está en pantalla; las dos son independientes desde este fix.
   */
  const [transcripcion, setTranscripcion] = useState<string | null>(null)
  /**
   * Si el diálogo de revisión está a la vista — independiente de si HAY
   * transcripción. Cerrar (la ✕, o el Esc nativo del navegador sobre un
   * `<dialog>` abierto con `showModal()`) solo apaga esto: la transcripción
   * sigue viva en `transcripcion` y el botón «Transcripción pendiente» (más
   * abajo en el JSX) reabre el mismo diálogo con el mismo texto.
   */
  const [revisionAbierta, setRevisionAbierta] = useState(false)
  const dialogoMinuta = useRef<HTMLDialogElement>(null)
  /** Ver `salir()`: si «Salir» va a cortar una grabación viva, pide confirmar primero. */
  const [confirmarSalida, setConfirmarSalida] = useState(false)
  /**
   * Copia en ref de `confirmarSalida`, para que `salir()` la lea al día pase
   * lo que pase con qué cierre exacto la esté ejecutando — ver el comentario
   * grande en `salir()`.
   */
  const confirmarSalidaRef = useRef(false)
  useEffect(() => {
    confirmarSalidaRef.current = confirmarSalida
  }, [confirmarSalida])
  /**
   * La última copia de lo grabado, según llega (prop `alAcumular` de
   * `GrabarReunion`) — independiente de `transcripcion`, que solo se llena
   * al TERMINAR. Sirve únicamente para que `salir()` sepa si hay algo que
   * una salida cortaría a medio camino; no se muestra en pantalla.
   */
  const grabacionEnCurso = useRef('')

  // Sincroniza el <dialog> IMPERATIVO con `revisionAbierta`: `showModal()`/
  // `close()` son los únicos que de verdad abren o cierran un <dialog> modal
  // — no basta con leer/escribir un atributo. Depende de `revisionAbierta` y
  // NO de `transcripcion` (revisión final de la rama, punto 3): desde este
  // fix son dos cosas distintas — hay transcripción sin diálogo visible en
  // cuanto alguien lo cierra sin descartarla.
  useEffect(() => {
    const n = dialogoMinuta.current
    if (!n) return
    if (revisionAbierta && !n.open) n.showModal()
    if (!revisionAbierta && n.open) n.close()
  }, [revisionAbierta])

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

    // Sin esperar y tragándose el error: ver el comentario de la prop. Entrar
    // en vivo no puede depender de que esta bitácora responda.
    if (reunionId && registrarPresentacionAction) {
      registrarPresentacionAction(reunionId).catch(() => {})
    }
  }

  async function salir() {
    /*
     * SEGUNDA RED, no la principal — diagnóstico 2026-07-31 y comentario
     * grande en `GrabarReunion.tsx` (la limpieza al desmontar).
     *
     * Esto solo evita CORTAR una grabación viva sin querer con el botón
     * «Salir» o con el Esc que captura el efecto de más abajo. NO cubre el
     * Esc NATIVO del navegador saliendo de pantalla completa: ese sale de
     * pantalla completa él solo, sin pasar por esta función, y no se puede
     * interceptar — por eso la garantía real de que nada se pierde vive en
     * `GrabarReunion`, no aquí.
     *
     * Dos pasos (pedir, y solo salir si ya se pidió) y no un `confirm()` del
     * navegador: mismo criterio que `PausaSala`/`EliminarSeccion` en esta
     * misma base.
     *
     * Se lee `confirmarSalidaRef.current` y NO el `confirmarSalida` de
     * arriba: el efecto del teclado (más abajo) tiene `[presentando, actual]`
     * como dependencias A PROPÓSITO —no se resuscribe en cada tecla de
     * sección—, así que su `alTeclado` puede seguir referenciando un `salir`
     * de un render viejo. Leyendo el ref en vez del estado capturado, da
     * igual qué cierre de `salir` se ejecute: el SEGUNDO Esc (el que
     * confirma) siempre ve el valor actual.
     */
    if (grabacionEnCurso.current.trim() && !confirmarSalidaRef.current) {
      setConfirmarSalida(true)
      return
    }
    setConfirmarSalida(false)

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

  /** `alTerminar` de `GrabarReunion`: además de abrir la revisión, esta
   * sesión ya se entregó — apaga la señal de "hay grabación viva". */
  function alTerminarGrabacion(texto: string) {
    grabacionEnCurso.current = ''
    setConfirmarSalida(false)
    setTranscripcion(texto)
    setRevisionAbierta(true)
  }

  /** `alAcumular` de `GrabarReunion`: la copia fuera del componente, según
   * llega — ver el comentario en `GrabarReunion.tsx`. */
  function alAcumularGrabacion(texto: string) {
    grabacionEnCurso.current = texto
  }

  /**
   * CIERRA sin destruir (revisión final de la rama, punto 3). La llaman la ✕
   * y el `onClose` del `<dialog>` —que es a donde llega el Esc NATIVO del
   * navegador—: las dos ocultan el diálogo nada más. La transcripción sigue
   * en `transcripcion`, y el botón «Transcripción pendiente» (JSX, más abajo)
   * lo vuelve a abrir con el mismo texto.
   */
  function cerrarRevision() {
    setRevisionAbierta(false)
  }

  /**
   * BORRA de verdad: transcripción Y diálogo. Dos gestos la llaman, los dos a
   * propósito —publicar la minuta con éxito, o el botón «Descartar»— y
   * NINGUNO es cerrar el diálogo. Antes de este fix, cerrar (la ✕ o el Esc
   * nativo) hacía exactamente esto — `onClose` ponía la transcripción a
   * `null` — y como `parar()` ya había vaciado el acumulado de
   * `GrabarReunion` y no existe `localStorage` ni `beforeunload` en toda la
   * app, ese Esc borraba la única copia que quedaba de la reunión grabada.
   */
  function limpiarTranscripcion() {
    setTranscripcion(null)
    setRevisionAbierta(false)
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
      // CON EL DIÁLOGO DE REVISIÓN ABIERTO, esta presentación no intercepta
      // ninguna tecla (revisión final de la rama, punto 3). El `<dialog>` no
      // está anidado dentro de `contenedor` —es su hermano, más abajo en el
      // JSX— así que un `keydown` disparado ahí adentro (el Esc con el que el
      // navegador cierra el diálogo, o hasta un espacio tecleado dentro del
      // formulario de la minuta) burbujea igual hasta este listener de
      // `window`. Sin esta guarda, ese mismo Esc —además de cerrar el
      // diálogo, por su cuenta, a nivel de navegador— también llamaba a
      // `salir()` aquí y sacaba de la presentación entera de un solo golpe de
      // tecla. Se deja que el diálogo —y lo que haya dentro— resuelva su
      // propia tecla; esta presentación no decide nada mientras esté abierto.
      if (dialogoMinuta.current?.open) return
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

            {/* `laserBoton` no es decoración: la hoja lo esconde donde no hay
                puntero fino (`@media (hover: none)`). En una pantalla táctil
                el láser no llega a pintarse nunca —medido: se queda en
                `opacity: 0` con un toque y arrastrando el dedo— y el gesto que
                lo movería es el mismo que hace scroll de la presentación. Ver
                el comentario grande de `.laserBoton` en `presentar.module.css`. */}
            <button
              type="button"
              className={estilos.laserBoton}
              onClick={() => setLaser((v) => !v)}
              data-activo={laser ? 'true' : undefined}
              aria-pressed={laser}
              title="Puntero láser"
            >
              Láser
            </button>

            {/* Grabar solo si hay reunión y quien presenta puede minutar. */}
            {reunionId && equipo && (
              <GrabarReunion alTerminar={alTerminarGrabacion} alAcumular={alAcumularGrabacion} />
            )}

            {confirmarSalida ? (
              <span className={estilos.confirmarSalida}>
                <span className={estilos.confirmarSalidaTexto}>Hay una grabación en curso.</span>
                <button type="button" onClick={salir} className={estilos.confirmarSalidaSi}>
                  Sí, salir
                </button>
                <button type="button" onClick={() => setConfirmarSalida(false)}>
                  No
                </button>
              </span>
            ) : (
              <button type="button" onClick={salir} className={estilos.salir}>
                Salir
              </button>
            )}
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
        // El Esc nativo de un <dialog> abierto con showModal() llega AQUÍ, no
        // a ningún manejador de React: es el navegador quien lo cierra, y
        // este evento es el único aviso de que pasó. Antes ponía la
        // transcripción a null (el bug de este punto) — `parar()` ya había
        // vaciado el acumulado de `GrabarReunion` y esto era la ÚNICA copia
        // que quedaba en toda la app (no hay `localStorage` ni
        // `beforeunload`). Cerrar ya no destruye nada: solo oculta el
        // diálogo — ver `cerrarRevision`, arriba.
        onClose={cerrarRevision}
      >
        {transcripcion !== null && reunionId && (
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
              <div className={estilos.cabeceraMinutaAcciones}>
                {/* GESTO EXPLÍCITO y distinto de cerrar: la ✕ (y el Esc) solo
                    ocultan el diálogo — lo grabado se puede reabrir con el
                    botón «Transcripción pendiente», más abajo. Este es el
                    ÚNICO botón que de verdad lo borra. */}
                <button
                  type="button"
                  onClick={limpiarTranscripcion}
                  className={estilos.descartarTranscripcion}
                >
                  Descartar
                </button>
                <button
                  type="button"
                  onClick={cerrarRevision}
                  aria-label="Cerrar — la transcripción se conserva para reabrirla"
                  title="Cerrar — la transcripción se conserva para reabrirla"
                >
                  ✕
                </button>
              </div>
            </header>
            <MinutaCliente
              de={{ reunionId }}
              transcripcionInicial={transcripcion}
              alPublicar={limpiarTranscripcion}
              personas={personas}
            />
          </div>
        )}
      </dialog>

      {/* Lo grabado sigue vivo aunque el diálogo esté cerrado (con la ✕ o con
          el Esc nativo): esto es lo que deja REABRIRLO. Sin este botón,
          cerrar sin publicar ni descartar dejaba la transcripción sin ningún
          camino de vuelta a la pantalla — viva en memoria, pero invisible. */}
      {transcripcion !== null && !revisionAbierta && (
        <button
          type="button"
          onClick={() => setRevisionAbierta(true)}
          className={estilos.reabrirTranscripcion}
        >
          Transcripción pendiente de revisar
        </button>
      )}

      {!presentando && (
        <button type="button" onClick={entrar} className={estilos.boton}>
          Presentar
        </button>
      )}
    </>
  )
}
