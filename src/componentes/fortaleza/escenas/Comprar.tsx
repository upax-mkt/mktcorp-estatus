import type { CSSProperties } from 'react'
import base from '../base.module.css'
import estilos from './Comprar.module.css'
import { Escena } from '../../politico/Escena'
import { orden, Luz, Fondo, Firma } from '../comun'
import { Aforo } from '../Aforo'

/**
 * 12 · COMPRAR. Frente 4 · «Que comprar sea fácil» (ronda 2, 20-oct-2026).
 *
 * Arriba, a sangre, la función: la bailarina de Malinche es lo que se compra. El título va a la izquierda, sobre el
 * negro de la foto, en dos renglones («Que comprar / sea fácil»): así «fácil» ya no cae sobre su pelo. Abajo, un solo
 * panel de vidrio con todo el frente: el recorrido de quien va a Malinche, cuatro paradas en una pista que no se corta
 * (Lo descubre → Compra → En la función → Regresa) y que, al llegar a la última, da la vuelta por debajo y regresa al
 * principio; debajo, lo que hacen UiX y NeraCode. Un panel y no cuatro cajas: ningún texto queda sobre la cara ni el
 * pelo de la bailarina, y la foto respira. «Compra» es el único acento naranja: la parada que el título pide hacer
 * fácil. En la esquina, el aforo enciende el tramo del frente 4.
 *
 * GEOMETRÍA FIJA: el recorrido es un lienzo de 1600 × 210 unidades (el viewBox) que conserva esa proporción; los
 * nombres de las paradas son HTML colocado en porcentajes de esas constantes. Nada se mide en JS.
 *
 * MOVIMIENTO (ms desde que llega la escena; quieta en ≤ 1200; solo las clases de la base y `orden`):
 *   0–620      antetítulo, título y logos suben (escalón de 60 ms)
 *   120–720    la pista se traza (600 ms, --mov-ease-in-out); cada parada brota (420 ms, la duración rápida de la
 *              casa) y su nombre sube cuando la línea llega a ella: 120, 336, 379 y 402 (CAUSA VISIBLE)
 *   330–950    las tres acciones suben (escalón de 60 ms)
 *   730–1195   AL FINAL, SOLO, el aforo enciende el tramo 4 butaca por butaca: lo demás ya asentó
 * Sin JS, impreso o con movimiento reducido: el cuadro final.
 */

const ANCHO = 1600
const ALTO = 210
/** La pista de ida: las cuatro paradas. */
const IDA = 104
/** La vuelta: media circunferencia en cada extremo y la pista de regreso, por debajo. */
const RADIO = 46
const VUELTA = IDA + 2 * RADIO
const X = [150, 583, 1017, 1450] as const

const PARADAS = ['Lo descubre', 'Compra', 'En la función', 'Regresa'] as const
/** «Compra», el acento: la parada que el título pide hacer fácil. */
const ACENTO = 1

/** La pista completa, de un solo trazo: sale de «Lo descubre», pasa las cuatro paradas, da la vuelta y regresa. */
const PISTA = `M${X[0]} ${IDA} H${X[3]} A${RADIO} ${RADIO} 0 0 1 ${X[3]} ${VUELTA} H${X[0]} A${RADIO} ${RADIO} 0 0 1 ${X[0]} ${IDA}`
const LARGO = 2 * (X[3] - X[0]) + 2 * Math.PI * RADIO

/** Flechas del sentido: tres en la ida (entre paradas) y una en el regreso, a media pista de abajo. */
const IDA_FLECHAS = [0, 1, 2].map((k) => (X[k] + X[k + 1]) / 2)
const REGRESO_X = (X[1] + X[2]) / 2
const flechaDerecha = (x: number, y: number) => `M${x - 6} ${y - 10}L${x + 5} ${y}L${x - 6} ${y + 10}`
const flechaIzquierda = (x: number, y: number) => `M${x + 6} ${y - 10}L${x - 5} ${y}L${x + 6} ${y + 10}`

/** La curva del trazo de la base (--mov-ease-in-out): cubic-bezier(0.77, 0, 0.175, 1). */
const bezier = (t: number, a: number, b: number) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3

/** Qué fracción del tiempo del trazo tarda la línea en recorrer la fracción `p` de la pista (y(t) = p, luego x(t)). */
function fraccionDeTiempo(p: number): number {
  let bajo = 0
  let alto = 1
  for (let k = 0; k < 40; k++) {
    const medio = (bajo + alto) / 2
    if (bezier(medio, 0, 1) < p) bajo = medio
    else alto = medio
  }
  return bezier((bajo + alto) / 2, 0.77, 0.175)
}

const ESCALON = 90
const PISTA_INICIO = 120
const PISTA_DURACION = 600
/** Cuándo llega la línea a un punto de la pista, a `largo` unidades de «Lo descubre» (ms desde que llega la escena). */
const llega = (largo: number) => Math.round(PISTA_INICIO + fraccionDeTiempo(largo / LARGO) * PISTA_DURACION)

const LLEGA = {
  paradas: X.map((x) => llega(x - X[0])),
  flechas: IDA_FLECHAS.map((x) => llega(x - X[0])),
  regreso: llega(X[3] - X[0] + Math.PI * RADIO + (X[3] - REGRESO_X)),
}

/** El tramo 4 se enciende cuando lo demás ya asentó: 29 × 5 ms + 320 ms después, la escena queda quieta (1195). */
const ENCIENDE = 730

const vars = (v: Record<string, string | number>) => v as CSSProperties
/** Arranque en ms, traducido al escalón de la casa (`--i` × 90 ms). */
const en = (ms: number) => vars({ '--i': ms / ESCALON })

/** La base de los nombres de las paradas, 24 unidades sobre la pista, en % del alto del lienzo. */
const BASE_ETIQUETA = `${((ALTO - (IDA - 24)) / ALTO) * 100}%`

const ACCIONES = [
  {
    titulo: 'Todo el recorrido',
    texto: 'UiX revisa cómo descubren Malinche, cómo compran, qué encuentran durante la función y qué pasa después.',
    quien: 'UiX',
  },
  {
    titulo: 'Documentos oficiales',
    texto: 'UiX los renueva, empezando por la presentación comercial del venue.',
    quien: 'UiX',
  },
  {
    titulo: 'La boletera',
    texto: 'NeraCode hace las mejoras que hagan falta, según esa revisión.',
    quien: 'NeraCode',
  },
] as const

export function Comprar() {
  return (
    <section data-layout="comprar" className={`${base.pantalla} ${estilos.pantalla}`}>
      <Fondo src="/fortaleza/bailarina.jpg" velo="abajo" posicion="50% 100%" />
      <Luz />
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <header className={base.cabecera}>
          <p className={`${base.antetitulo} ${base.aparece}`} style={orden(0)}>
            Frente 4
          </p>
          <h2 className={`${base.titulo} ${estilos.titulo} ${base.aparece}`} style={en(60)}>
            Que comprar <span className={estilos.renglon}>sea fácil</span>
          </h2>
          <Firma unidades={['uix', 'neracode']} className={`${estilos.firma} ${base.aparece}`} style={en(120)} />
        </header>

        <div className={`${base.vidrio} ${estilos.panel}`}>
          <div className={estilos.recorrido} style={vars({ '--base-etiqueta': BASE_ETIQUETA })}>
            <svg
              className={estilos.dibujo}
              viewBox={`0 0 ${ANCHO} ${ALTO}`}
              role="img"
              aria-label="Recorrido de ida y vuelta por cuatro paradas."
            >
              <defs>
                {/* La ida brilla; el regreso, por debajo, es más tenue. */}
                <linearGradient id="fm-comprar-pista" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#fff" stopOpacity="0.92" />
                  <stop offset="0.5" stopColor="#fff" stopOpacity="0.5" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0.26" />
                </linearGradient>
              </defs>

              <path
                className={`${estilos.pista} ${base.trazo}`}
                d={PISTA}
                pathLength={1}
                stroke="url(#fm-comprar-pista)"
                style={vars({ '--i': PISTA_INICIO / ESCALON, '--mov-trazo': `${PISTA_DURACION}ms` })}
              />

              {IDA_FLECHAS.map((x, k) => (
                <path key={x} className={`${estilos.flecha} ${base.brota}`} d={flechaDerecha(x, IDA)} style={en(LLEGA.flechas[k])} />
              ))}
              <path
                className={`${estilos.flecha} ${estilos.flechaRegreso} ${base.brota}`}
                d={flechaIzquierda(REGRESO_X, VUELTA)}
                style={en(LLEGA.regreso)}
              />

              {X.map((x, k) => (
                <g
                  key={x}
                  className={`${estilos.estacion} ${base.brota}`}
                  data-acento={k === ACENTO || undefined}
                  style={en(LLEGA.paradas[k])}
                >
                  <circle className={estilos.anillo} cx={x} cy={IDA} r={k === ACENTO ? 19 : 15} />
                  <circle className={estilos.nucleo} cx={x} cy={IDA} r={k === ACENTO ? 7 : 5.5} />
                </g>
              ))}
            </svg>

            <ol className={estilos.paradas}>
              {PARADAS.map((nombre, k) => (
                <li
                  key={nombre}
                  className={`${estilos.parada} ${base.aparece} ${k === ACENTO ? base.acento : ''}`}
                  style={vars({ '--i': LLEGA.paradas[k] / ESCALON, '--x': `${(X[k] / ANCHO) * 100}%` })}
                >
                  {nombre}
                </li>
              ))}
            </ol>
          </div>

          <div className={estilos.acciones}>
            {ACCIONES.map((a, k) => (
              <article key={a.titulo} className={`${estilos.accion} ${base.aparece}`} style={en(330 + k * 60)}>
                <h3 className={base.tarjetaTitulo}>{a.titulo}</h3>
                <p className={base.tarjetaTexto}>{a.texto}</p>
                <p className={base.quien}>{a.quien}</p>
              </article>
            ))}
          </div>
        </div>

        <Aforo tam="chico" frentes={4} enciende={4} retardo={ENCIENDE} rotulo="Frente 4 de 5" className={base.aforoEsquina} />
      </Escena>
    </section>
  )
}
