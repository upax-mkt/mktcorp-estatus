import type { CSSProperties } from 'react'
import base from '../base.module.css'
import estilos from './Comprar.module.css'
import { Escena } from '../../politico/Escena'
import { orden, Luz, Fondo, Propuesta } from '../comun'
import { Aforo } from '../Aforo'

/**
 * 14 · COMPRAR. Frente 4 · «Que comprar sea fácil» (ronda 3, 20-oct-2026).
 *
 * La composición de la ronda 2 se queda: la bailarina de Malinche a sangre, el título a la izquierda sobre el negro de
 * la foto, en dos renglones («Que comprar / sea fácil», así «fácil» no cae sobre su pelo), y abajo un panel de vidrio
 * que no sube hasta su cara. Cambia cómo se cuenta cada unidad (`Propuesta`, ronda 3): el panel es UiX —su logo, qué
 * hace en una frase y sus dos acciones, lado a lado— y cierra con su imagen, el recorrido de quien va a Malinche:
 * cuatro paradas en una pista que no se corta (Lo descubre → Compra → En la función → Regresa) y que, al llegar a la
 * última, da la vuelta por debajo y regresa al principio. Al lado, en la columna del aforo, NeraCode con su única
 * acción, la boletera. Los dos logos quedan en la misma línea y se leen en orden, de izquierda a derecha. «Compra» es el
 * único acento naranja: la parada que el título pide hacer fácil, y la que toca la boletera. En la esquina, el aforo
 * enciende el tramo del frente 4.
 *
 * GEOMETRÍA FIJA: el recorrido es un lienzo de 1600 × 162 unidades (el viewBox) que conserva esa proporción; los
 * nombres de las paradas son HTML colocado en porcentajes de esas constantes. Nada se mide en JS.
 *
 * MOVIMIENTO (ms desde que llega la escena; quieta en ≤ 1200; solo las clases de la base y `orden`):
 *   0–560      antetítulo y título suben (escalón de 60 ms)
 *   120        el panel de vidrio sube
 *   180        UiX sube (logo, frase y acciones juntos) y la pista empieza a trazarse (480 ms, --mov-ease-in-out); cada
 *              parada brota (420 ms, la duración rápida de la casa) y su nombre sube cuando la línea llega a ella:
 *              180, 355, 389 y 407 (CAUSA VISIBLE); la flecha del regreso, a los 440
 *   355        cuando la línea llega a «Compra», sube NeraCode: la boletera es esa parada
 *   730–1195   AL FINAL, SOLO, el aforo enciende el tramo 4 butaca por butaca: lo demás ya asentó
 * Sin JS, impreso o con movimiento reducido: el cuadro final.
 */

const ANCHO = 1600
const ALTO = 162
/** La pista de ida: las cuatro paradas. Los nombres van encima, con su base 24 unidades sobre la pista. */
const IDA = 88
/** La vuelta: media circunferencia en cada extremo y la pista de regreso, por debajo. */
const RADIO = 30
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
/** La pista arranca con UiX: lo que hace UiX es justo ese recorrido. */
const PISTA_INICIO = 180
const PISTA_DURACION = 480
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
        </header>

        <div className={estilos.abajo}>
          {/* El panel entra después del título y antes que lo que lleva dentro: nunca se ve vacío en el cuadro 0. */}
          <div className={`${base.vidrio} ${estilos.panel} ${base.aparece}`} style={en(120)}>
            <Propuesta
              unidades={['uix']}
              frase="Revisamos el recorrido de quien compra Malinche y rediseñamos lo que lo acompaña."
              acciones={[
                {
                  titulo: 'El recorrido',
                  texto:
                    'Cómo descubren Malinche, cómo compran, qué encuentran durante la función y qué pasa después: un diagnóstico con propuestas de mejora.',
                },
                {
                  titulo: 'Los documentos oficiales',
                  texto:
                    'Rediseñados para representar la experiencia del evento, empezando por la presentación comercial del venue.',
                },
              ]}
              i={PISTA_INICIO / ESCALON}
              className={estilos.uix}
            />

            {/* La imagen de lo que hace UiX: el recorrido, con su ida y su vuelta. */}
            <div className={estilos.ruta}>
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
                    <path
                      key={x}
                      className={`${estilos.flecha} ${base.brota}`}
                      d={flechaDerecha(x, IDA)}
                      style={en(LLEGA.flechas[k])}
                    />
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
            </div>
          </div>

          {/* NeraCode, en la columna del aforo: sube cuando la línea llega a «Compra». */}
          <Propuesta
            unidades={['neracode']}
            acciones={[{ titulo: 'La boletera', texto: 'Las mejoras que salgan de esa revisión.' }]}
            i={LLEGA.paradas[ACENTO] / ESCALON}
            className={`${base.vidrio} ${estilos.neracode}`}
          />
        </div>

        <Aforo tam="chico" frentes={4} enciende={4} retardo={ENCIENDE} rotulo="Frente 4 de 5" className={base.aforoEsquina} />
      </Escena>
    </section>
  )
}
