import Image from 'next/image'
import type { CSSProperties } from 'react'
import base from '../base.module.css'
import estilos from './Lleno.module.css'
import { Escena } from '../../politico/Escena'
import { Luz } from '../comun'
import { ALTO, ANCHO, Aforo, BASE, CY, TOTAL, TRAMO } from '../Aforo'

/**
 * 15 · LLENO — la cumbre, sola (ronda 2, 20-oct-2026). El único remate de la pieza (motion-studio 00 §9 y 04 §8).
 *
 * El aforo grande llega viajando desde la esquina de la ruta (la transición de vista de ModoPresentar, 800 ms),
 * enciende solo su último 10 % («lo llenamos juntos»), se queda quieto un momento y se vuelve la foto real del teatro
 * lleno: la foto está encima del dibujo y se descubre en un círculo que nace de su escenario, así que va cubriendo el
 * abanico fila por fila, de adentro hacia afuera; las butacas se vuelven público. Entonces entra «Lo queremos lleno.»,
 * con el barrido de luz de marca sobre las letras y su subrayado, que mide lo que mide el título. Después, silencio:
 * no entra nada más. La ruta pasó a la escena 14 y la petición a la 16; el dibujo no regresa (sin insignia).
 *
 * CUADRO FIJO (impreso, sin JS o con movimiento reducido): la foto del teatro lleno con el título y su subrayado. El
 * aforo grande es solo un aparato del movimiento: está pintado desde el primer cuadro mientras la escena anima (para
 * que la transición de vista lo encuentre y lo haga viajar) y nunca en el cuadro fijo. Al disolverse pierde también
 * su nombre de transición: el corte a la escena 16, o de regreso a la 14, ya no lo hace aparecer.
 *
 * El título va arriba a la izquierda, sobre el techo oscuro de la foto: ninguna letra cae sobre una cara.
 *
 * TIEMPOS (ms desde que llega la escena; todo quieto en ≤ 2500, el presupuesto de la cumbre):
 *   0–800      el aforo viaja de la esquina al centro (ModoPresentar; con scroll, ya está ahí)
 *   700–1205   se enciende el último 10 %, butaca por butaca, cuando el aforo ya aterrizó (a los 700 ms va en el
 *              99 % de su viaje)
 *   1205–1515  pausa: nada se mueve
 *   1515–2135  la foto se descubre desde el escenario del dibujo (--mov-ease-in-out); hacia los 1825 ya cubrió todo el
 *              abanico y el dibujo, tapado, se apaga sin verse
 *   1899–2349  entra el título (sube 24 px, enfoca 6 px → 0); a esa hora la foto ya cubre su lugar
 *   1999–2399  el barrido de luz de marca cruza las letras y el subrayado se dibuja con él, con la misma curva
 *   2399–      silencio. Medido en el modo presentar, desde la tecla: quieta a los ~2460 (la transición de vista y el
 *              observador tardan unos 60 ms en arrancar la escena)
 */

/** El escenario del dibujo, en el lienzo de `Aforo.tsx`. */
const ESCENARIO_Y = CY
/** Cuánto baja el escenario desde el centro del dibujo, en anchos del dibujo: la máscara nace ahí. */
const ESCENARIO_DY = (ESCENARIO_Y - ALTO / 2) / ANCHO

/** El último 10 %: las butacas que faltan después de los cinco frentes. */
const FALTAN = TOTAL - (BASE + 5 * TRAMO)
const PASO_BUTACA = 5
const ENCIENDE = 700
const ENCENDIDO = ENCIENDE + (FALTAN - 1) * PASO_BUTACA + 320
const PAUSA = 310
const FOTO = ENCENDIDO + PAUSA
const FOTO_DURACION = 620
/** Cuando el círculo ya cubrió el abanico (la última fila queda a ~35 % del radio final: 47 % del tiempo). */
const DISUELVE = FOTO + Math.round(FOTO_DURACION * 0.5)
const DISUELVE_DURACION = 120
/** El título, cuando la foto ya cubre su lugar (62 % del tiempo de la máscara: su esquina queda a 79 % del radio). */
const TITULO = FOTO + Math.round(FOTO_DURACION * 0.62)
const TITULO_DURACION = 450
const BARRIDO = TITULO + 100
const BARRIDO_DURACION = 400

const tiempos = {
  '--escenario-dy': ESCENARIO_DY,
  '--t-foto': `${FOTO}ms`,
  '--d-foto': `${FOTO_DURACION}ms`,
  '--t-disuelve': `${DISUELVE}ms`,
  '--d-disuelve': `${DISUELVE_DURACION}ms`,
  '--t-titulo': `${TITULO}ms`,
  '--d-titulo': `${TITULO_DURACION}ms`,
  '--t-barrido': `${BARRIDO}ms`,
  '--d-barrido': `${BARRIDO_DURACION}ms`,
} as CSSProperties

export function Lleno() {
  return (
    <section data-layout="lleno" className={`${base.pantalla} ${estilos.pantalla}`} style={tiempos}>
      <Escena className={`${base.escena} ${base.conViaje} ${estilos.escena}`}>
        {/* El dibujo va debajo de la foto: la foto, al descubrirse desde su escenario, lo tapa fila por fila. */}
        <div className={estilos.momento} aria-hidden="true">
          <Aforo
            tam="grande"
            frentes={5}
            lleno
            enciende="cumbre"
            retardo={ENCIENDE}
            pasoButaca={PASO_BUTACA}
            etiqueta="El teatro se llena."
          />
        </div>
        <div className={estilos.foto} aria-hidden="true">
          <Image src="/fortaleza/teatro-lleno.jpg" alt="" fill sizes="100vw" unoptimized />
          <div className={estilos.velo} />
        </div>
        <div className={estilos.luz} aria-hidden="true">
          <Luz />
        </div>

        <h2 className={`${base.titulo} ${estilos.titulo}`}>
          <span className={estilos.texto}>
            <span className={estilos.renglon}>Lo queremos</span>{' '}
            <span className={estilos.renglon}>lleno.</span>
          </span>
          <span className={estilos.subrayado} aria-hidden="true" />
        </h2>
      </Escena>
    </section>
  )
}
