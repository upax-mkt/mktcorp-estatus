import type { CSSProperties } from 'react'
import base from '../base.module.css'
import estilos from './Nuestro.module.css'
import { Escena } from '../../politico/Escena'
import { Aforo } from '../Aforo'
import { Firma, Fondo, Luz, orden } from '../comun'

/**
 * 6 · NUESTRO — «Lo hacemos nuestro.» (20-oct-2026, motion-studio; ronda 2 tras el revisor ciego).
 *
 * El giro de la pieza: de lo que escuchamos a lo que hacemos. El aforo crece y se vuelve el protagonista: la mitad
 * encendida es la de hoy y la mitad vacía queda partida en cinco tramos, en franjas alternas y con su número en las
 * dos alas (lo dibuja `Aforo` con `marcarFrentes`). A su lado, la leyenda de los cinco frentes en un panel de vidrio,
 * con los mismos círculos numerados del dibujo y a tamaño de título de tarjeta. Abajo, el equipo: las unidades, con
 * Zeus (aparece en el Frente 2), Marketing Corporativo escrito y quién coordina. Detrás, el escenario visto desde la
 * sala (`escenario-publico-recorte.jpg`: sin la franja izquierda donde asomaba el rótulo de un monitor), con velo
 * fuerte que deja las luces y apaga la pantalla del fondo.
 *
 * La nota del guion se reparte en dos lugares sin tocar una palabra: «Grupo UPAX se suma con un solo equipo y cinco
 * frentes.» abre, junto al título; «Coordinan…» firma, junto a los logos.
 *
 * MOVIMIENTO (ms desde que la escena entra; quieta en 1040). El aforo NO entra: llega viajando desde la esquina de la
 * escena 5 (transición de vista de `ModoPresentar`, 800 ms) y está en su sitio desde el primer cuadro. Mientras
 * viaja, lo demás solo se funde, sin desplazarse (`base.conViaje`): título 0–500 · nota 90–590 · el panel de la
 * leyenda 180–680 y sus cinco frentes, en orden, 225–977 (escalón de 63 ms) · el equipo 540–1040. El rótulo del
 * aforo, que no viaja con el dibujo, se funde al aterrizar: 600–1000.
 * Sin JS, impresa o con movimiento reducido, todo está en su estado final desde el HTML.
 */

const FRENTES = [
  'Que la ciudad lo vea',
  'Que el grupo lo viva',
  'Que lo usen toda la semana',
  'Que comprar sea fácil',
  'Entender y medir',
] as const

/**
 * El equipo, en el orden del guion. Zeus se suma (ronda 2: aparece en el Frente 2) al final de las unidades, y
 * Marketing Corporativo, que es el área de marketing del grupo y no una unidad, cierra la fila escrito.
 */
const EQUIPO = [
  'promo-espacio',
  'house-of-films',
  'marketing-united',
  'uix',
  'neracode',
  'research-land',
  'zeus',
  'marketing-corporativo',
] as const

export function Nuestro() {
  return (
    <section data-layout="nuestro" className={`${base.pantalla} ${estilos.pantalla}`}>
      <Fondo src="/fortaleza/escenario-publico-recorte.jpg" velo="total" posicion="50% 38%" />
      <Luz />
      <Escena className={`${base.escena} ${base.conViaje} ${estilos.escena}`}>
        <header className={base.cabecera}>
          <h2 className={`${base.titulo} ${estilos.titulo} ${base.aparece}`} style={orden(0)}>
            Lo hacemos nuestro.
          </h2>
          <p className={`${base.nota} ${estilos.nota} ${base.aparece}`} style={orden(1)}>
            Grupo UPAX se suma con un solo equipo y cinco frentes.
          </p>
        </header>

        <div className={estilos.cuerpo}>
          {/* Sin entrada propia: es el objeto que viaja (04 §5). */}
          <Aforo tam="grande" frentes={0} marcarFrentes rotulo="Hoy, la mitad" className={estilos.aforo} />

          {/* La leyenda y el equipo están en el camino del aforo que llega de la esquina: entran cuando aterriza. */}
          <ol className={`${base.vidrio} ${estilos.frentes} ${base.aparece} ${base.esperaViaje}`} style={orden(2)}>
            {FRENTES.map((frente, k) => (
              <li
                key={frente}
                className={`${estilos.frente} ${base.aparece} ${base.esperaViaje}`}
                style={{ ...orden(2.5 + k * 0.7), '--i-viaje': k } as CSSProperties}
              >
                <span className={estilos.numero}>{k + 1}</span>
                <span className={estilos.frenteTexto}>{frente}</span>
              </li>
            ))}
          </ol>
        </div>

        <footer
          className={`${estilos.equipo} ${base.aparece} ${base.esperaViaje}`}
          style={{ ...orden(6), '--i-viaje': 5 } as CSSProperties}
        >
          <Firma unidades={EQUIPO} className={estilos.firma} />
          <p className={estilos.coordinan}>
            Coordinan Héctor Ibarra, por UPAX, y Eucario González, por Fortaleza.
          </p>
        </footer>
      </Escena>
    </section>
  )
}
