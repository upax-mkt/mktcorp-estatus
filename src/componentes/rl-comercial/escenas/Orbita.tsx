import type { CSSProperties } from 'react'
import base from '../base.module.css'
import estilos from './Orbita.module.css'
import { Escena } from '../../politico/Escena'
import { orden, Punto, Luz } from '../comun'

/**
 * ESCENA 3 · LA ÓRBITA (construir · energía 7 · noche).
 *
 * El cliente al centro y los cuatro puestos a su alrededor, en el orden en que
 * lo tocan (horario, desde arriba a la izquierda). La operación es el anillo
 * de afuera: está desde el principio, apenas, y al final se aclara.
 *
 * Toda la geometría vive en un viewBox fijo y escala sola: el lienzo guarda la
 * proporción del viewBox con unidades de contenedor, así que el centro del
 * lienzo ES el centro de la órbita y el punto (HTML, hilo conductor) cae justo
 * ahí sin medir nada en JS.
 *
 * Tiempos (ms desde que la escena entra): punto 0 · nodos 250/380/530/680 con
 * su arco de 150 ms · anillo 760 → quieta en ≤ 1200 ms.
 */

const ESCALON = 90
/** Arranque en milisegundos, traducido al escalón de la casa (`--i` × 90 ms). */
const en = (ms: number) => orden(ms / ESCALON)
const trazo = (ms: number, duracion: number) => ({ ...en(ms), '--mov-trazo': `${duracion}ms` }) as CSSProperties

const ANCHO = 1240
const ALTO = 540
const C = { x: ANCHO / 2, y: ALTO / 2 }
const R_ORBITA = 140
const R_ANILLO = 205
/** Grados que el arco se separa del nodo, para no meterse debajo. */
const HUECO_NODO = 9
/** Grados que el anillo de operación se abre para dejar pasar su rótulo. */
const HUECO_ROTULO = 19
const DURACION_ARCO = 150
const TEXTO_IZQUIERDA = 400
const TEXTO_DERECHA = 840

const rad = (g: number) => (g * Math.PI) / 180
const redondo = (n: number) => Math.round(n * 10) / 10

function sobre(r: number, g: number) {
  return { x: redondo(C.x + r * Math.cos(rad(g))), y: redondo(C.y + r * Math.sin(rad(g))) }
}

/** Arco en sentido horario (el sentido del recorrido del cliente). */
function arco(r: number, desde: number, hasta: number) {
  const a = sobre(r, desde)
  const b = sobre(r, hasta)
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${hasta - desde > 180 ? 1 : 0} 1 ${b.x} ${b.y}`
}

/** Chevrón sobre la órbita que apunta en el sentido del recorrido. */
function flecha(g: number) {
  const p = sobre(R_ORBITA, g)
  const t = { x: -Math.sin(rad(g)), y: Math.cos(rad(g)) }
  const n = { x: Math.cos(rad(g)), y: Math.sin(rad(g)) }
  const q = (dt: number, dn: number) => `${redondo(p.x + dt * t.x + dn * n.x)} ${redondo(p.y + dt * t.y + dn * n.y)}`
  return `M ${q(-5, 7)} L ${q(5, 0)} L ${q(-5, -7)}`
}

interface Puesto {
  rol: string
  tarea: string[]
  persona: string
  angulo: number
  lado: 'izquierda' | 'derecha'
  /** ms en que aparece el nodo (y su arco sale hacia el siguiente). */
  nodo: number
  arco: number
}

const PUESTOS: Puesto[] = [
  { rol: 'SDR', tarea: ['Abre la puerta'], persona: 'Implant de Marketing Corporativo', angulo: -135, lado: 'izquierda', nodo: 250, arco: 250 },
  {
    rol: 'Ejecutiva comercial',
    tarea: ['Abre la cuenta y', 'conduce la venta'],
    persona: 'Elizabeth Gómez, a prueba',
    angulo: -45,
    lado: 'derecha',
    nodo: 380,
    arco: 400,
  },
  { rol: 'Project Manager', tarea: ['Traduce el problema y entrega'], persona: 'Rocío Cervantes', angulo: 45, lado: 'derecha', nodo: 530, arco: 550 },
  { rol: 'Key Account Manager', tarea: ['Hace crecer la cuenta'], persona: 'Juan Carlos Hesles', angulo: 135, lado: 'izquierda', nodo: 680, arco: 700 },
]

const OPERACION = [
  { area: 'Cualitativo', angulo: -118 },
  { area: 'Cuantitativo', angulo: -62 },
  { area: 'Campo', angulo: 62 },
  { area: 'Panel', angulo: 118 },
]
const ACLARA = 760

export function Orbita() {
  return (
    <section data-layout="orbita" className={`${base.pantalla} ${base.noche}`}>
      <Luz />
      <Escena className={base.escena}>
        <header className={base.cabecera}>
          <p className={`${base.antetitulo} ${base.aparece}`} style={orden(0)}>
            Estructura
          </p>
          <h2 className={`${base.titulo} ${base.aparece}`} style={orden(1)}>
            Cuatro puestos, cada uno con un momento del cliente
          </h2>
          <p className={`${base.nota} ${base.aparece}`} style={orden(2)}>
            Comercial abre y conduce; la operación diseña y presenta lo que va a ejecutar.
          </p>
        </header>

        <div className={estilos.cuerpo}>
          <div className={estilos.lienzo}>
            <svg className={estilos.svg} viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="xMidYMid meet">
              {/* La operación: el anillo de afuera, tenue y punteado. */}
              <g className={estilos.anillo} style={en(ACLARA)}>
                {OPERACION.map((o, k) => {
                  const siguiente = OPERACION[(k + 1) % OPERACION.length]
                  const hasta = (k === OPERACION.length - 1 ? siguiente.angulo + 360 : siguiente.angulo) - HUECO_ROTULO
                  return (
                    <path
                      key={`anillo-${o.area}`}
                      className={estilos.anilloTrazo}
                      d={arco(R_ANILLO, o.angulo + HUECO_ROTULO, hasta)}
                      aria-hidden="true"
                    />
                  )
                })}
                {OPERACION.map((o) => {
                  const p = sobre(R_ANILLO, o.angulo)
                  return (
                    <text key={o.area} className={estilos.anilloRotulo} x={p.x} y={p.y + 4.5} textAnchor="middle">
                      {o.area}
                    </text>
                  )
                })}
                <text className={estilos.anilloTitulo} x={C.x} y={C.y + R_ANILLO + 44} textAnchor="middle">
                  Operación · la autoridad técnica
                </text>
              </g>

              {/* La órbita: una pista quieta y los cuatro arcos que la recorren en orden. */}
              <circle className={estilos.pista} cx={C.x} cy={C.y} r={R_ORBITA} aria-hidden="true" />
              {PUESTOS.map((p, k) => {
                const siguiente = PUESTOS[(k + 1) % PUESTOS.length]
                const hasta = (k === PUESTOS.length - 1 ? siguiente.angulo + 360 : siguiente.angulo) - HUECO_NODO
                return (
                  <path
                    key={`arco-${p.rol}`}
                    className={`${estilos.arco} ${base.trazo}`}
                    d={arco(R_ORBITA, p.angulo + HUECO_NODO, hasta)}
                    pathLength={1}
                    style={trazo(p.arco, DURACION_ARCO)}
                    aria-hidden="true"
                  />
                )
              })}
              {PUESTOS.map((p) => (
                <path
                  key={`flecha-${p.rol}`}
                  className={`${estilos.flecha} ${estilos.funde}`}
                  d={flecha(p.angulo + 45)}
                  style={en(p.arco + DURACION_ARCO / 2)}
                  aria-hidden="true"
                />
              ))}

              <text className={`${estilos.cliente} ${base.aparece}`} x={C.x} y={C.y + 54} textAnchor="middle" style={en(180)}>
                Cliente
              </text>

              {PUESTOS.map((p) => {
                const n = sobre(R_ORBITA, p.angulo)
                const izquierda = p.lado === 'izquierda'
                const x = izquierda ? TEXTO_IZQUIERDA : TEXTO_DERECHA
                const ancla = izquierda ? 'end' : 'start'
                const linea = n.y + 14
                return (
                  <g key={p.rol}>
                    <line
                      className={`${estilos.guia} ${estilos.funde}`}
                      x1={izquierda ? n.x - 22 : n.x + 22}
                      y1={n.y}
                      x2={izquierda ? x + 14 : x - 14}
                      y2={n.y}
                      style={en(p.nodo)}
                      aria-hidden="true"
                    />
                    <g className={estilos.surge} style={en(p.nodo)} aria-hidden="true">
                      <circle className={estilos.halo} cx={n.x} cy={n.y} r={23} />
                      <circle className={estilos.nodo} cx={n.x} cy={n.y} r={14} />
                    </g>
                    <g className={base.aparece} style={en(p.nodo + 20)}>
                      <text className={estilos.rol} x={x} y={linea} textAnchor={ancla}>
                        {p.rol}
                      </text>
                      <text className={estilos.tarea} x={x} y={linea + 32} textAnchor={ancla}>
                        {p.tarea.map((renglon, j) => (
                          <tspan key={renglon} x={x} dy={j === 0 ? 0 : 27}>
                            {renglon}
                          </tspan>
                        ))}
                      </text>
                      <text className={estilos.persona} x={x} y={linea + 32 + 27 * p.tarea.length} textAnchor={ancla}>
                        {p.persona}
                      </text>
                    </g>
                  </g>
                )
              })}
            </svg>

            {/* EL CLIENTE: el centro del lienzo es el centro de la órbita. */}
            <div className={estilos.centro}>
              <Punto tam={30} className={base.brota} style={orden(0)} />
            </div>
          </div>
        </div>
      </Escena>
    </section>
  )
}
