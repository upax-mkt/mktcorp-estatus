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
  /**
   * Se llama con TODO lo acumulado hasta el momento, cada vez que llega un
   * tramo nuevo confirmado (`onresult` con `isFinal`) — no solo con lo nuevo.
   *
   * Opcional, y pensado para que exista una copia fuera de este componente
   * mientras graba, no solo al terminar: diagnóstico 2026-07-31, la
   * transcripción es lo único de una reunión que no se puede recuperar, así
   * que cuantos más sitios tengan una copia de lo ya dicho, menos depende
   * todo de que un solo camino (este componente, este `useRef`) llegue
   * entero hasta el final. `ModoPresentar` la usa para saber si hay
   * grabación viva antes de dejar salir de la presentación.
   */
  alAcumular?: (texto: string) => void
}

/** Nunca cambia: no hay a qué suscribirse. */
const SIN_SUSCRIPCION = () => () => {}

/**
 * Cuántos reenganches seguidos de `onend` se aceptan SIN que llegara ningún
 * resultado real entre medias, antes de rendirse (revisión final de la rama,
 * punto 3b). Ver el comentario grande en `onend`, más abajo: es el freno de
 * un fallo permanente que si no giraría para siempre con el botón ya
 * diciendo «Grabar».
 */
const TOPE_REINTENTOS = 3

export function GrabarReunion({ alTerminar, alAcumular }: Props) {
  const [estado, setEstado] = useState<'listo' | 'grabando'>('listo')
  const [error, setError] = useState<string | null>(null)
  const [parcial, setParcial] = useState('')
  const [palabras, setPalabras] = useState(0)
  const reconocimiento = useRef<Reconocimiento | null>(null)
  const texto = useRef<string[]>([])
  /**
   * El freno del bucle sin fin (revisión final de la rama, punto 3b) — ver
   * `onend` y `onerror`, más abajo. Se resetea en cada `arrancar()` manual y
   * cada vez que `onresult` prueba que el reconocedor sigue vivo de verdad.
   */
  const intentosSeguidos = useRef(0)

  /** Lo acumulado hasta ahora, como una sola cadena. Un solo sitio que hace
   * `texto.current.join(' ').trim()` para que la limpieza de desmontaje, el
   * arranque y `onresult` cuenten siempre la misma historia. */
  function textoAcumulado(): string {
    return texto.current.join(' ').trim()
  }

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

  // `alTerminar` se usa dentro de la limpieza de un efecto que se monta UNA
  // sola vez (dependencias `[]`, a propósito: no hay que reiniciar el
  // reconocimiento en cada render). Ese cierre queda fijo con el `alTerminar`
  // del primer render; el ref lo mantiene al día sin tener que meterlo en el
  // arreglo de dependencias y sin reiniciar el efecto en cada cambio de prop.
  // La escritura va DENTRO de un efecto y no en el cuerpo del componente:
  // React (y el lint de react-hooks/refs) no deja tocar un ref durante el
  // render, solo en manejadores o efectos.
  const alTerminarRef = useRef(alTerminar)
  useEffect(() => {
    alTerminarRef.current = alTerminar
  }, [alTerminar])

  // Se para al desmontar pase lo que pase, Y ENTREGA LO ACUMULADO si había
  // una grabación viva — antes de este fix solo apagaba el micrófono.
  //
  // Diagnóstico 2026-07-31: la transcripción es lo único de una reunión que
  // no se puede recuperar, y hasta este fix el ÚNICO camino que la entregaba
  // era el clic en «Parar y minutar» (ver `parar()` más abajo). Salir de la
  // presentación a medio grabar —el botón «Salir», el Esc que captura
  // `ModoPresentar`, o el Esc NATIVO del navegador saliendo de pantalla
  // completa, que esta app no puede interceptar— desmonta este componente
  // sin pasar por ahí, y eso perdía la reunión completa en silencio.
  //
  // `reconocimiento.current !== null` es la señal de "hubo una sesión viva
  // que no pasó por `parar()`": se comprueba eso y no si hay texto, porque
  // una grabación que arrancó y todavía no capturó nada merece el mismo
  // trato que un «Parar y minutar» con la sala en silencio — que ya entrega
  // una cadena vacía sin distinguir el caso (ver el tercer test: sin haber
  // llegado a grabar nunca, `reconocimiento.current` sigue en `null` y no se
  // entrega nada).
  useEffect(() => {
    return () => {
      if (reconocimiento.current) {
        try {
          reconocimiento.current.stop()
        } catch {
          /* ya estaba parado */
        }
        alTerminarRef.current(textoAcumulado())
      }
    }
  }, [])

  /**
   * PIDE EL MICRÓFONO ANTES DE NADA.
   *
   * Franco: "la herramienta de grabación no generó nada, al parecer no se
   * configuró ni buscó permisos de utilizar mi mic". Tenía razón y la causa
   * es concreta: en PANTALLA COMPLETA el navegador NO enseña el diálogo de
   * permisos. La Web Speech API lo pedía por su cuenta, el diálogo no salía,
   * y `start()` terminaba en silencio sin un solo error visible.
   *
   * Pedirlo con `getUserMedia` resuelve las dos cosas: fuerza el diálogo —y
   * si el navegador lo bloquea por estar en pantalla completa, DEVUELVE un
   * error que se puede enseñar— y deja el permiso concedido antes de que el
   * reconocimiento arranque. La pista se cierra en cuanto se concede: quien
   * escucha es el reconocimiento, no nosotros, y dejarla abierta encendería
   * el indicador de micrófono sin motivo.
   */
  async function pedirMicrofono(): Promise<string | null> {
    if (!navigator.mediaDevices?.getUserMedia) {
      return 'Este navegador no da acceso al micrófono.'
    }
    try {
      const pista = await navigator.mediaDevices.getUserMedia({ audio: true })
      pista.getTracks().forEach((t) => t.stop())
      return null
    } catch (e) {
      const nombre = e instanceof Error ? e.name : ''
      if (nombre === 'NotAllowedError') {
        return document.fullscreenElement
          ? 'El navegador no pide permiso de micrófono en pantalla completa. Sal de pantalla completa (Esc), pulsa Grabar y vuelve a entrar.'
          : 'No diste permiso al micrófono. Actívalo en el candado de la barra de direcciones y vuelve a intentar.'
      }
      if (nombre === 'NotFoundError') return 'No se encontró ningún micrófono.'
      return 'No se pudo acceder al micrófono.'
    }
  }

  async function arrancar() {
    const Constructor = constructorDeReconocimiento()
    if (!Constructor) return
    setError(null)

    const problema = await pedirMicrofono()
    if (problema) {
      setError(problema)
      return
    }

    // OJO: `texto.current` NO se limpia aquí a propósito.
    //
    // Ruta 2 del diagnóstico 2026-07-31: un error de reconocimiento a media
    // reunión (`network`, `audio-capture`) devuelve el botón a «Grabar» sin
    // haber entregado nada (ver `onerror`). Si al pulsar «Grabar» de nuevo
    // esto borrara `texto.current`, el gesto con el que alguien intenta
    // SEGUIR grabando sería el mismo que borra lo ya dicho. Quien sí limpia
    // es `parar()`: ahí la reunión ya se entregó de verdad, y la siguiente
    // vez que se pulse «Grabar» es una sesión distinta que debe empezar en
    // blanco. `setPalabras` sí se recalcula, por si esto es un reinicio y ya
    // había algo acumulado — mostrar "0 palabras" habiendo ya una reunión
    // grabada sería mentir en pantalla.
    setPalabras(textoAcumulado().split(/\s+/).filter(Boolean).length)

    // Intento manual nuevo: el freno del bucle sin fin arranca en cero, sin
    // heredar fallos de una grabación anterior que ya nada tiene que ver.
    intentosSeguidos.current = 0

    const r = new Constructor()
    r.lang = 'es-MX'
    r.continuous = true
    // Los parciales son lo que hace visible que ESTÁ oyendo. Sin ellos, una
    // pausa larga de nadie hablando no se distingue de un micrófono muerto.
    r.interimResults = true

    r.onresult = (e) => {
      // Hay progreso real: se resetea el freno del bucle sin fin (`onend`,
      // más abajo). Un fallo permanente nunca llega hasta aquí — es
      // precisamente lo que lo distingue de un corte periódico normal de
      // Chrome, que sí sigue produciendo resultados entre reenganche y
      // reenganche.
      intentosSeguidos.current = 0
      let enCurso = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const trozo = e.results[i][0].transcript
        if (e.results[i].isFinal) texto.current.push(trozo.trim())
        else enCurso += trozo
      }
      setParcial(enCurso)
      const acumulado = textoAcumulado()
      setPalabras(acumulado.split(/\s+/).filter(Boolean).length)
      // Copia fuera del componente, según llega: si algo impide que la
      // limpieza de desmontaje entregue lo acumulado como se espera, quien
      // pasó `alAcumular` (hoy, `ModoPresentar`) ya tiene lo último que se
      // dijo. Diagnóstico 2026-07-31: la transcripción es lo único de una
      // reunión que no se puede recuperar.
      alAcumular?.(acumulado)
    }

    r.onerror = (e) => {
      // `no-speech` y `aborted` son ruido normal en una reunión con silencios:
      // avisar de ellos enseñaría a ignorar los avisos. Tampoco cuentan para
      // el freno del bucle sin fin: no son la señal de un fallo permanente.
      if (e.error === 'no-speech' || e.error === 'aborted') return
      setError(
        e.error === 'not-allowed'
          ? 'El navegador no dio permiso al micrófono. Actívalo en el candado de la barra de direcciones.'
          : `El reconocimiento se detuvo (${e.error}).`,
      )
      setEstado('listo')
      // NO se toca `texto.current`: ruta 2 del diagnóstico 2026-07-31. Antes
      // de este fix el botón volvía a decir «Grabar» sin haber entregado
      // nada, y lo acumulado quedaba huérfano — sin un «Parar y minutar» que
      // lo entregara y sin sobrevivir a un reinicio, que lo borraba (ver el
      // comentario en `arrancar()`). Aquí no hay nada que arreglar en el
      // sentido de "limpiar": el arreglo es, precisamente, NO limpiar.
      //
      // QUE EL ERROR CORTE DE VERDAD (revisión final de la rama, punto 3b):
      // todo error fatal termina en un `onend` (el navegador cierra la
      // sesión de reconocimiento detrás), y ese `onend` reenganchaba el
      // MISMO reconocedor sin que nada se lo impidiera — el botón ya decía
      // «Grabar» pero el micrófono seguía escuchando, y si el usuario pulsaba
      // «Grabar» de nuevo, el reconocedor huérfano (resucitado por `onend`) y
      // el nuevo escribían los dos en `texto.current`: cada frase salía
      // duplicada. Forzar el contador al tope —en vez de anular
      // `reconocimiento.current`, como hace `parar()`— hace que el `onend`
      // que sigue se rinda sin reenganchar, sin desactivar la segunda red del
      // efecto de desmontaje: `reconocimiento.current` sigue apuntando a `r`,
      // así que si nadie vuelve a tocar nada, salir de la página todavía
      // entrega lo acumulado.
      intentosSeguidos.current = TOPE_REINTENTOS
    }

    // Chrome corta solo cada cierto tiempo. Se reanuda mientras siga grabando:
    // sin esto, una reunión de una hora produce cinco minutos de acta.
    r.onend = () => {
      if (reconocimiento.current !== r) return // `parar()` ya cortó esta referencia: no reenganchar.

      intentosSeguidos.current += 1
      if (intentosSeguidos.current > TOPE_REINTENTOS) {
        // EL FRENO DEL BUCLE SIN FIN (revisión final de la rama, punto 3b).
        // Un fallo permanente —mic desconectado, permiso revocado a medio
        // camino— puede hacer que CADA reinicio vuelva a terminar al
        // instante: sin este tope, `onend` se reengancha para siempre con el
        // botón ya diciendo «Grabar», que es justo el bug que reportó Franco.
        // `onerror` (arriba) fuerza el contador al tope de un solo golpe, así
        // que un solo error fatal basta para rendirse en el siguiente
        // `onend`; esta rama, aparte, cubre el caso más raro de un `onend`
        // que se repite sin pasar nunca por `onerror`. No se toca
        // `texto.current` ni `reconocimiento.current`: lo acumulado sigue
        // disponible para un «Grabar» manual o para la segunda red del
        // efecto de desmontaje.
        setEstado('listo')
        setError((actual) => actual ?? 'El reconocimiento se detuvo varias veces seguidas. Pulsa «Grabar» para intentarlo de nuevo.')
        return
      }

      try {
        r.start()
      } catch {
        /* ya arrancó */
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
    const acumulado = textoAcumulado()
    // Esta sesión ya se entregó de verdad: limpiar aquí, y no en `arrancar()`,
    // es lo que deja que un reinicio TRAS UN ERROR seguir acumulando (arriba)
    // sin que una reunión nueva arranque heredando el texto de la anterior.
    texto.current = []
    alTerminar(acumulado)
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
        <button
          type="button"
          onClick={() => { void arrancar() }}
          title="Pide el micrófono y transcribe con el reconocimiento de voz de Chrome"
        >
          Grabar
        </button>
      )}
      {error && <span className={estilos.grabarError}>{error}</span>}
    </div>
  )
}
