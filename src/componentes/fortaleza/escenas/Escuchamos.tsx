import type { ReactNode } from 'react'
import base from '../base.module.css'
import estilos from './Escuchamos.module.css'
import { Escena } from '../../politico/Escena'
import { Aforo } from '../Aforo'
import { Fondo, Luz, orden } from '../comun'

/**
 * 2 · ESCUCHAMOS — «Lo que escuchamos» (guion técnico, 20-oct-2026).
 *
 * Sus palabras, sin atribuir, como se oyeron en el Frontón: tres frases grandes en vidrio sobre la escena de humo de
 * Malinche, muy oscura. Cada voz entra un paso más adentro que la anterior (una cascada, no una lista), y la única
 * palabra en naranja es «lleno»: el color de las butacas encendidas del aforo, que abajo a la derecha sigue a la mitad.
 *
 * Ronda 2 (20-oct-2026): cada frase lleva sus comillas completas, «…», en la misma letra que la frase. La comilla
 * atenuada y suelta que colgaba delante de cada una se leía como una flecha de «atrás».
 *
 * Movimiento (quieta a los 1040 ms): al presentar, el aforo llega viajando desde la portada (800 ms), así que la escena
 * es `conViaje`: lo demás entra solo con opacidad, sin desplazarse, para no competir con él. Antetítulo y título a
 * los 0 y 90 ms; cada frase, 180 ms después de la anterior (180, 360 y 540 ms). El aforo no tiene entrada propia.
 * Sin JS, impresa o con movimiento reducido, todo está en su sitio desde el HTML.
 */
const VOCES: { id: string; i: number; texto: ReactNode }[] = [
  {
    id: 'lleno',
    i: 2,
    texto: (
      <>
        «Lo quiero <span className={base.acento}>lleno</span>.»
      </>
    ),
  },
  { id: 'venue', i: 4, texto: '«Nadie sabe que es un venue.»' },
  { id: 'obras', i: 6, texto: '«Competimos con 16 obras.»' },
]

export function Escuchamos() {
  return (
    <section data-layout="escuchamos" className={base.pantalla}>
      <Fondo src="/fortaleza/escena-humo.jpg" velo="total" posicion="center 40%" />
      <Luz />
      <Escena className={`${base.escena} ${base.conViaje} ${estilos.escena}`}>
        <header className={base.cabecera}>
          <p className={`${base.antetitulo} ${base.aparece}`} style={orden(0)}>
            En el Frontón, el 14 de octubre
          </p>
          <h2 className={`${base.titulo} ${base.aparece}`} style={orden(1)}>
            Lo que escuchamos
          </h2>
        </header>

        <ul className={estilos.voces}>
          {VOCES.map((v) => (
            <li key={v.id} className={`${base.vidrio} ${estilos.voz} ${base.aparece}`} style={orden(v.i)}>
              <blockquote className={estilos.cita}>
                <p>{v.texto}</p>
              </blockquote>
            </li>
          ))}
        </ul>

        <Aforo tam="chico" frentes={0} rotulo="Hoy, la mitad" className={base.aforoEsquina} />
      </Escena>
    </section>
  )
}
