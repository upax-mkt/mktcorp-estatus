'use client'

import { useEffect, useRef, useState } from 'react'
import { Seccion } from './Seccion'
import estilos from '@/app/cliente/cliente.module.css'

/**
 * EL TABLERO DE DATA & ANALYTICS DE LA UDN, incrustado en su sala.
 *
 * Franco: *"en cada sala hay que agregar un módulo más, arriba de los
 * acuerdos: es un iframe con data y analytics de la UDN"*. Lo sirve ORBIT
 * (RevOps) en `orbit-hub-fgap.vercel.app/embed/<slug>`, sin login, y esa ruta
 * solo se deja incrustar desde el dominio que ORBIT tenga en su cabecera
 * `Content-Security-Policy: frame-ancestors`.
 *
 * ⚠️ HOY ESA CABECERA DICE `mktcorp-estatus.vercel.app`, que era el dominio de
 * esta app antes del 12-ago. **Al renombrarla a `mktcorp-upax.vercel.app` el
 * tablero deja de cargar por el dominio nuevo** hasta que RevOps añada el
 * nuevo a su `frame-ancestors`. El viejo se conservó como alias justo para que
 * no se cayera mientras tanto.
 *
 * ⚠️ CONSECUENCIA: **en `localhost:3000` el iframe sale en blanco** y el
 * navegador escribe un error de CSP en consola. No es un fallo de esta
 * pantalla; es la política funcionando. Este módulo solo se juzga contra el
 * despliegue.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * SE ESCALA, NO SE ALARGA. Franco: *"se corta el iframe, hay que
 * reposicionarlo bien para que se vea bien, NO AGRANDES EL MÓDULO"*.
 *
 * Y el corte tenía una causa medible: **el tablero de ORBIT es responsive**.
 * Su alto real según el ancho que le des, medido en su despliegue:
 *
 *      390 px → 1414 de alto     1100 px →  636
 *      760 px → 1184             1200 px →  678
 *     1010 px → 1260
 *
 * Entre 1010 y 1100 está el salto: ahí entra en su diseño de escritorio y el
 * contenido se ordena en dos columnas. Por debajo apila y CRECE. El módulo de
 * la sala mide ~1100 px, así que caía en el filo — y con 1010 se iba a 1260,
 * dentro de una caja de 920: cortado.
 *
 * Así que se le da el ancho en el que su diseño encaja —`ANCHO_UTIL`— y se
 * escala hasta el ancho real, con la caja a la altura que le corresponde.
 * Alargar la caja habría sido lo contrario de lo que se pidió, y estrecharla
 * empeora el problema, porque el contenido crece cuando lo aprietas.
 *
 * ⚠️ MEDIR ESTO TIENE TRAMPA y la primera medida salió mal: `scrollHeight`
 * NUNCA es menor que la ventana, así que con un viewport de 900 devolvía 900
 * para todo lo que midiera menos —de ahí un módulo con 260 px de papel en
 * blanco debajo—. Y el `<body>` de ORBIT se estira al 100 % de la ventana, así
 * que medir elementos tampoco vale. Lo que funciona: capturar la página y
 * buscar la última fila de píxeles que no es el fondo.
 *
 * EN PANTALLAS ESTRECHAS NO SE ESCALA. A 390 px la escala sería 0,35 y el
 * texto quedaría ilegible: ahí manda el diseño apilado de ORBIT, a su tamaño,
 * con la altura que pida. Un tablero pequeño pero legible le gana a uno
 * completo que no se lee.
 */

/** El ancho en el que ORBIT usa su diseño de escritorio. Medido, no supuesto. */
const ANCHO_UTIL = 1200
/**
 * Lo que mide de alto a ese ancho: 678 px medidos, redondeados a 700 para que
 * un dato más —una fila que aparezca cuando la UDN cierre otro trato— no vuelva
 * a cortar el tablero.
 */
const ALTO_UTIL = 700
/**
 * Por debajo de esto no se escala: reducir a menos de ~0,7 convierte el
 * tablero en algo que se ve entero y no se lee.
 */
const MINIMO_PARA_ESCALAR = 760
/** Lo que mide apilado en pantallas estrechas (1414 px a 390, medidos). */
const ALTO_APILADO = 1440
/** El hub entero, del que aquí solo se incrusta una vista. */
const ORBIT = 'https://orbit-hub-fgap.vercel.app/'

export function TableroAnalytics({
  url,
  nombreSala,
  id,
}: {
  url: string
  nombreSala: string
  id?: string
}) {
  const marco = useRef<HTMLDivElement>(null)
  const [ancho, setAncho] = useState<number | null>(null)

  useEffect(() => {
    const nodo = marco.current
    if (!nodo) return
    // `ResizeObserver` y no `window.resize`: el módulo cambia de ancho también
    // cuando se pliega otra sección o aparece una barra, sin que la ventana se
    // mueva.
    const observador = new ResizeObserver(([entrada]) => setAncho(entrada.contentRect.width))
    observador.observe(nodo)
    return () => observador.disconnect()
  }, [])

  const escalar = ancho != null && ancho >= MINIMO_PARA_ESCALAR
  const escala = escalar ? Math.min(1, ancho / ANCHO_UTIL) : 1

  return (
    /**
     * NACE PLEGADO. Con el cromo de la sala —dos barras, el hero de marca y su
     * franja— son unos 390 px antes del primer módulo, y el tablero añade 800
     * más: la cabecera de Acuerdos quedaba medio metro bajo el pliegue. Sigue
     * siendo el PRIMER módulo, como se pidió; lo que cambia es que ocupa una
     * línea hasta que se abre, y el índice de la sala lo alcanza en un clic.
     */
    <Seccion id={id} icono="benchmark" titulo="Data & Analytics" plegable abierta={false}>
      <div
        ref={marco}
        className={estilos.tableroMarco}
        // El alto lo manda el contenido escalado, no un número inventado: así
        // no sobra papel en blanco debajo ni se corta nada por arriba.
        style={{ height: escalar ? `${Math.round(ALTO_UTIL * escala)}px` : `${ALTO_APILADO}px` }}
      >
        <iframe
          src={url}
          title={`Data & Analytics · ${nombreSala}`}
          className={estilos.tableroIframe}
          loading="lazy"
          style={
            escalar
              ? { width: `${ANCHO_UTIL}px`, height: `${ALTO_UTIL}px`, transform: `scale(${escala})` }
              : { width: '100%', height: `${ALTO_APILADO}px`, transform: 'none' }
          }
        />
      </div>

      {/* EL PASO A ORBIT, al pie del mismo módulo. Franco: *"abajo del módulo,
          como parte del mismo Data y Analytics, hay que agregar un banner para
          llevarlos a ORBIT de Marketing Corp… con un mensaje que diga: si no
          tienes sus accesos, pídeselos al equipo"*.

          Lo que se incrusta arriba es UNA vista de ORBIT —el funnel de esta
          UDN— y ORBIT es bastante más. Quien quiera tirar del hilo tiene que
          saber que existe el sitio entero y, si rebota en su login, qué hacer:
          la frase evita el callejón sin salida de una puerta cerrada sin
          instrucciones.

          Va DENTRO de la sección y no como módulo aparte porque es el mismo
          asunto: al plegar Data & Analytics se pliega con él. */}
      <a
        className={estilos.tableroBanner}
        href={ORBIT}
        target="_blank"
        rel="noreferrer"
      >
        <span className={estilos.tableroBannerTexto}>
          <strong>Ver el tablero completo en ORBIT</strong>
          <span>
            El hub de datos de Marketing Corp. Si no tienes acceso, pídeselo al equipo.
          </span>
        </span>
        <span className={estilos.tableroBannerFlecha} aria-hidden>→</span>
      </a>
    </Seccion>
  )
}
