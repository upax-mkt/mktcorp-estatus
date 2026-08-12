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
 * solo se deja incrustar desde `mktcorp-estatus.vercel.app` — cabecera
 * `Content-Security-Policy: frame-ancestors`, del lado de ORBIT.
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
 * Medido en su despliegue, su alto según el ancho que le des:
 *
 *     390 px → 1435 de alto      1100 px →  900
 *     700 px → 1175              1200 px →  900
 *     900 px → 1264              1280 px →  900
 *
 * A partir de 1100 px entra en su diseño de escritorio y mide 900. Por debajo
 * apila sus columnas y crece. El módulo de la sala mide ~1010 px, así que
 * caía justo en la zona apilada: 1264 px de contenido dentro de una caja de
 * 920, cortados.
 *
 * Así que se le da el ancho en el que su diseño encaja —`ANCHO_UTIL`— y se
 * escala hasta el ancho real. A 1010 px eso son 0,92: un 8 % más pequeño,
 * imperceptible, y el módulo BAJA de 920 a ~825 px. Alargar la caja habría
 * sido lo contrario de lo que se pidió, y encoger el ancho no arregla nada
 * porque el contenido crece cuando lo estrechas.
 *
 * EN PANTALLAS ESTRECHAS NO SE ESCALA. A 390 px la escala sería 0,35 y el
 * texto quedaría ilegible: ahí manda el diseño apilado de ORBIT, a su tamaño,
 * con la altura que pida. Un tablero pequeño pero legible le gana a uno
 * completo que no se lee.
 */

/** El ancho en el que ORBIT deja de apilar. Medido en su despliegue. */
const ANCHO_UTIL = 1100
/** Lo que mide de alto a ese ancho. */
const ALTO_UTIL = 900
/**
 * Por debajo de esto no se escala: reducir a menos de ~0,7 convierte el
 * tablero en algo que se ve entero y no se lee.
 */
const MINIMO_PARA_ESCALAR = 760
/** Lo que mide apilado en pantallas estrechas. */
const ALTO_APILADO = 1450

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
    </Seccion>
  )
}
