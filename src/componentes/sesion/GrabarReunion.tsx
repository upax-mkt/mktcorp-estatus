'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import estilos from './presentar.module.css'

/**
 * GRABAR LA REUNIÓN Y SACAR SU TRANSCRIPCIÓN.
 *
 * Franco: "una opción para grabar la reunión y luego generar la minuta
 * directamente en la webapp, conectada al módulo de minutas".
 *
 * EL LÍMITE, dicho aquí y también en pantalla: la API de Anthropic no acepta
 * audio —Claude lee texto, imágenes y PDF—, así que "grabar y minutar" no
 * puede ser una llamada al mismo sitio al que ya se llama. Se resuelve con lo
 * que trae el navegador: la Web Speech API transcribe mientras se habla, y esa
 * transcripción entra por el MISMO sitio por el que hoy entra una pegada a
 * mano. Es de Chrome, y la calidad depende del micrófono y del ruido de la
 * sala.
 *
 * POR QUÉ SE DICE EN PANTALLA y no solo aquí: quien pulsa "grabar" en una
 * reunión con un director está apostando el acta de esa reunión. Descubrir
 * después de una hora que el navegador no era el bueno, o que el micrófono
 * cogía la mitad, es la peor forma de enterarse.
 *
 * LO QUE NO HACE: publicar nada. Deja la transcripción escrita y quien la lea
 * decide. Una transcripción automática se equivoca con los nombres propios, y
 * esos nombres acaban siendo responsables de acuerdos en la sala de alguien.
 */

/** Lo que expone el navegador, que no está en los tipos estándar. */
interface Reconocimiento extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

type ConstructorReconocimiento = new () => Reconocimiento

function constructorDeReconocimiento(): ConstructorReconocimiento | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: ConstructorReconocimiento
    webkitSpeechRecognition?: ConstructorReconocimiento
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

interface Props {
  /** Se llama al parar, con lo transcrito. Vacío si no se oyó nada. */
  alTerminar: (transcripcion: string) => void
}

/** Nunca cambia: no hay a qué suscribirse. */
const SIN_SUSCRIPCION = () => () => {}

export function GrabarReunion({ alTerminar }: Props) {
  const [estado, setEstado] = useState<'listo' | 'grabando'>('listo')
  const [error, setError] = useState<string | null>(null)
  const [parcial, setParcial] = useState('')
  const [palabras, setPalabras] = useState(0)
  const reconocimiento = useRef<Reconocimiento | null>(null)
  const texto = useRef<string[]>([])

  /**
   * ¿Este navegador transcribe?
   *
   * Con `useSyncExternalStore` y no con un efecto: es un valor del entorno que
   * no cambia nunca, y leerlo en un efecto para meterlo en el estado es un
   * `setState` en el cuerpo del efecto —que el compilador de React marca como
   * error— además de un render de más. El tercer argumento es lo que se
   * responde EN EL SERVIDOR, donde no hay `window`: se dice que sí para que el
   * HTML del servidor y el del cliente coincidan en el caso normal (Chrome), y
   * React arregla la diferencia al hidratar si resulta que no.
   */
  const soportado = useSyncExternalStore(
    SIN_SUSCRIPCION,
    () => constructorDeReconocimiento() !== null,
    () => true,
  )

  // Se para al desmontar pase lo que pase: un reconocimiento vivo sigue
  // escuchando el micrófono después de cerrar la presentación.
  useEffect(() => {
    return () => {
      try {
        reconocimiento.current?.stop()
      } catch {
        /* ya estaba parado */
      }
    }
  }, [])

  function arrancar() {
    const Constructor = constructorDeReconocimiento()
    if (!Constructor) return
    setError(null)
    texto.current = []
    setPalabras(0)

    const r = new Constructor()
    r.lang = 'es-MX'
    r.continuous = true
    // Los parciales son lo que hace visible que ESTÁ oyendo. Sin ellos, una
    // pausa larga de nadie hablando no se distingue de un micrófono muerto.
    r.interimResults = true

    r.onresult = (e) => {
      let enCurso = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const trozo = e.results[i][0].transcript
        if (e.results[i].isFinal) texto.current.push(trozo.trim())
        else enCurso += trozo
      }
      setParcial(enCurso)
      setPalabras(texto.current.join(' ').split(/\s+/).filter(Boolean).length)
    }

    r.onerror = (e) => {
      // `no-speech` y `aborted` son ruido normal en una reunión con silencios:
      // avisar de ellos enseñaría a ignorar los avisos.
      if (e.error === 'no-speech' || e.error === 'aborted') return
      setError(
        e.error === 'not-allowed'
          ? 'El navegador no dio permiso al micrófono. Actívalo en el candado de la barra de direcciones.'
          : `El reconocimiento se detuvo (${e.error}).`,
      )
      setEstado('listo')
    }

    // Chrome corta solo cada cierto tiempo. Se reanuda mientras siga grabando:
    // sin esto, una reunión de una hora produce cinco minutos de acta.
    r.onend = () => {
      if (reconocimiento.current === r) {
        try {
          r.start()
        } catch {
          /* ya arrancó */
        }
      }
    }

    reconocimiento.current = r
    try {
      r.start()
      setEstado('grabando')
    } catch {
      setError('No se pudo empezar a grabar.')
    }
  }

  function parar() {
    const r = reconocimiento.current
    reconocimiento.current = null // corta el reenganche de `onend`
    try {
      r?.stop()
    } catch {
      /* ya parado */
    }
    setEstado('listo')
    setParcial('')
    alTerminar(texto.current.join(' ').trim())
  }

  if (!soportado) {
    return (
      <span className={estilos.grabarNota} title="Requiere Chrome">
        Grabar no está disponible en este navegador
      </span>
    )
  }

  return (
    <div className={estilos.grabar}>
      {estado === 'grabando' ? (
        <>
          <button type="button" className={estilos.grabarParar} onClick={parar}>
            <span className={estilos.grabarPunto} aria-hidden />
            Parar y minutar
          </button>
          <span className={estilos.grabarEstado} aria-live="polite">
            {palabras > 0 ? `${palabras} palabras` : 'escuchando…'}
            {parcial && <em className={estilos.grabarParcial}>{parcial.slice(-60)}</em>}
          </span>
        </>
      ) : (
        <button type="button" onClick={arrancar} title="Transcribe con el reconocimiento de voz de Chrome">
          Grabar
        </button>
      )}
      {error && <span className={estilos.grabarError}>{error}</span>}
    </div>
  )
}
