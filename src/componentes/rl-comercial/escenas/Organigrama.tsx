import type { CSSProperties } from 'react'
import base from '../base.module.css'
import estilos from './Organigrama.module.css'
import { Escena } from '../../politico/Escena'
import { orden, Punto } from '../comun'

/**
 * ESCENA 4 · EL ORGANIGRAMA (construir · energía 4 · clara).
 *
 * Un árbol de arriba abajo: Dirección General, las cuatro áreas (los tres
 * puestos nuevos con contorno morado grueso y su etiqueta «Nuevo»), la banda
 * de operación y los dos apoyos punteados. El cliente baja al pie: las líneas
 * de los tres puestos nuevos convergen en el punto.
 *
 * Un solo viewBox fijo; el lienzo guarda su proporción con unidades de
 * contenedor, así que el punto (HTML, hilo conductor) se ancla en porcentaje
 * exacto sin medir nada en JS.
 *
 * Tiempos (ms): dirección 180 · ramas 270 (450 ms) · áreas 420-600 ·
 * convergencia 620 · punto 480 · banda 640 · apoyos 700 → quieta en ≤ 1200 ms.
 */

const ESCALON = 90
/** Arranque en milisegundos, traducido al escalón de la casa (`--i` × 90 ms). */
const en = (ms: number) => orden(ms / ESCALON)
const trazo = (ms: number, duracion: number) => ({ ...en(ms), '--mov-trazo': `${duracion}ms` }) as CSSProperties

/** viewBox con 4 unidades de margen para que ningún trazo se corte. */
const VB = { x: -4, y: -4, ancho: 1248, alto: 612 }

const COLUMNA = 286
const HUECO = 32
const x0 = (k: number) => k * (COLUMNA + HUECO)
const centro = (k: number) => x0(k) + COLUMNA / 2

const DIRECCION = { x: 440, y: 0, ancho: 360, alto: 92 }
const BUS = 120
const AREA_Y = 148
const AREA_ALTO = 124
const AREA_PIE = AREA_Y + AREA_ALTO
const CLIENTE = { x: centro(2), y: 356 }
const LLEGADA = CLIENTE.y - 20
const BANDA = { y: 412, alto: 108 }
const APOYO = { y: 540, alto: 64, ancho: 610, hueco: 20 }

const ancla = {
  left: `${(((CLIENTE.x - VB.x) / VB.ancho) * 100).toFixed(3)}%`,
  top: `${(((CLIENTE.y - VB.y) / VB.alto) * 100).toFixed(3)}%`,
}

const AREAS = [
  { rol: 'Inteligencia de Negocio', persona: 'Giovanni Sanabria', tarea: [] as string[], nuevo: false },
  { rol: 'Ejecutiva comercial', persona: 'Elizabeth Gómez', tarea: ['A prueba 90 días'], nuevo: true },
  { rol: 'Project Manager', persona: 'Rocío Cervantes', tarea: ['Puente entre cliente,', 'comercial y operación'], nuevo: true },
  { rol: 'Key Account Manager', persona: 'Juan Carlos Hesles', tarea: ['Recompra y crecimiento'], nuevo: true },
]

const HIJOS = [
  { area: 'Producto', persona: 'Nora Osorno', tarea: 'catálogo y tarifario', y: 309 },
  { area: 'Información ejecutiva', persona: 'Andrés Gutiérrez', tarea: 'tablero semanal', y: 361 },
]

const OPERACION = [
  { area: 'Cualitativo', quien: 'Cristina Nieto' },
  { area: 'Cuantitativo', quien: 'tres gerencias' },
  { area: 'Campo', quien: 'Landers' },
  { area: 'Panel', quien: 'Azteca y proveedores' },
]
const OPERACION_X = 404
const OPERACION_COLUMNA = 203

const APOYOS = [
  { area: 'SDR', quien: 'Implant de Marketing Corporativo', tarea: 'llena la agenda de la ejecutiva' },
  { area: 'Administración', quien: 'Carolina González', tarea: 'alta, facturación y cobro' },
]

/** De cada puesto nuevo al cliente: sale vertical y llega vertical al punto. */
function convergencia(k: number) {
  const x = centro(k)
  if (x === CLIENTE.x) return `M ${x} ${AREA_PIE} V ${LLEGADA}`
  return `M ${x} ${AREA_PIE} C ${x} ${AREA_PIE + 42}, ${CLIENTE.x} ${LLEGADA - 42}, ${CLIENTE.x} ${LLEGADA}`
}

export function Organigrama() {
  return (
    <section data-layout="organigrama" className={`${base.pantalla} ${base.clara}`}>
      <Escena className={base.escena}>
        <header className={base.cabecera}>
          <p className={`${base.antetitulo} ${base.aparece}`} style={orden(0)}>
            Cómo se organiza
          </p>
          <h2 className={`${base.titulo} ${base.aparece}`} style={orden(1)}>
            Así se organiza el área
          </h2>
        </header>

        <div className={estilos.cuerpo}>
          <div className={estilos.lienzo}>
            <svg className={estilos.svg} viewBox={`${VB.x} ${VB.y} ${VB.ancho} ${VB.alto}`} preserveAspectRatio="xMidYMid meet">
              {/* Ramas: de Dirección General a cada área, de arriba abajo. */}
              {AREAS.map((a, k) => (
                <path
                  key={`rama-${a.rol}`}
                  className={`${estilos.conector} ${base.trazo}`}
                  d={`M ${DIRECCION.x + DIRECCION.ancho / 2} ${DIRECCION.alto} V ${BUS} H ${centro(k)} V ${AREA_Y}`}
                  pathLength={1}
                  style={trazo(270, 450)}
                  aria-hidden="true"
                />
              ))}

              {/* Dirección General */}
              <g className={base.aparece} style={en(180)}>
                <rect
                  className={`${estilos.caja} ${estilos.cajaDireccion}`}
                  x={DIRECCION.x}
                  y={DIRECCION.y}
                  width={DIRECCION.ancho}
                  height={DIRECCION.alto}
                  rx={12}
                />
                <text className={`${estilos.rol} ${estilos.rolDireccion}`} x={620} y={38} textAnchor="middle">
                  Dirección General
                </text>
                <text className={estilos.persona} x={620} y={62} textAnchor="middle">
                  Pablo Levy
                </text>
                <text className={estilos.tarea} x={620} y={82} textAnchor="middle">
                  Aprueba lo que sale del tarifario
                </text>
              </g>

              {/* Las cuatro áreas; los tres puestos nuevos con contorno morado grueso. */}
              {AREAS.map((a, k) => {
                const x = x0(k) + 20
                return (
                  <g key={a.rol} className={base.aparece} style={en(420 + 60 * k)}>
                    <rect
                      className={`${estilos.caja} ${a.nuevo ? estilos.cajaNueva : ''}`}
                      x={x0(k)}
                      y={AREA_Y}
                      width={COLUMNA}
                      height={AREA_ALTO}
                      rx={12}
                    />
                    {a.nuevo ? (
                      <>
                        <rect className={estilos.marca} x={x0(k) + COLUMNA - 82} y={AREA_Y - 11} width={62} height={22} rx={11} />
                        <text className={estilos.marcaTexto} x={x0(k) + COLUMNA - 51} y={AREA_Y + 4} textAnchor="middle">
                          Nuevo
                        </text>
                      </>
                    ) : null}
                    <text className={estilos.rol} x={x} y={AREA_Y + 44}>
                      {a.rol}
                    </text>
                    <text className={estilos.persona} x={x} y={AREA_Y + 70}>
                      {a.persona}
                    </text>
                    {a.tarea.length > 0 ? (
                      <text className={estilos.tarea} x={x} y={AREA_Y + 94}>
                        {a.tarea.map((renglon, j) => (
                          <tspan key={renglon} x={x} dy={j === 0 ? 0 : 18}>
                            {renglon}
                          </tspan>
                        ))}
                      </text>
                    ) : null}
                  </g>
                )
              })}

              {/* Inteligencia de Negocio: sus dos áreas. */}
              <path
                className={`${estilos.conector} ${base.trazo}`}
                d={`M 28 ${AREA_PIE} V ${HIJOS[0].y - 5} H 44 M 28 ${HIJOS[0].y - 5} V ${HIJOS[1].y - 5} H 44`}
                pathLength={1}
                style={trazo(600, 300)}
                aria-hidden="true"
              />
              {HIJOS.map((h, k) => (
                <g key={h.area} className={base.aparece} style={en(650 + 50 * k)}>
                  <text className={estilos.hijo} x={54} y={h.y}>
                    <tspan className={estilos.fuerte}>{h.area}</tspan> · {h.persona}
                  </text>
                  <text className={estilos.hijoTarea} x={54} y={h.y + 19}>
                    {h.tarea}
                  </text>
                </g>
              ))}

              {/* El área converge en el cliente. */}
              {AREAS.map((a, k) =>
                a.nuevo ? (
                  <path
                    key={`converge-${a.rol}`}
                    className={`${estilos.converge} ${base.trazo}`}
                    d={convergencia(k)}
                    pathLength={1}
                    style={trazo(620, 420)}
                    aria-hidden="true"
                  />
                ) : null,
              )}
              <text className={`${estilos.cliente} ${base.aparece}`} x={CLIENTE.x} y={CLIENTE.y + 38} textAnchor="middle" style={en(690)}>
                Cliente
              </text>

              {/* Operación: la autoridad técnica. */}
              <g className={base.aparece} style={en(640)}>
                <rect className={estilos.banda} x={0} y={BANDA.y} width={1240} height={BANDA.alto} rx={14} />
                <text className={estilos.bandaTitulo} x={28} y={BANDA.y + 34}>
                  Operación · la autoridad técnica
                </text>
                <text className={estilos.bandaLinea} x={28} y={BANDA.y + 64}>
                  <tspan x={28} dy={0}>
                    Diseña, cotiza con tarifario y
                  </tspan>
                  <tspan x={28} dy={22}>
                    presenta lo que va a ejecutar.
                  </tspan>
                </text>
                {OPERACION.map((o, k) => {
                  const x = OPERACION_X + OPERACION_COLUMNA * k
                  return (
                    <g key={o.area}>
                      <line className={estilos.division} x1={x} y1={BANDA.y + 22} x2={x} y2={BANDA.y + BANDA.alto - 22} aria-hidden="true" />
                      <text className={estilos.area} x={x + 22} y={BANDA.y + 50}>
                        {o.area}
                      </text>
                      <text className={estilos.quien} x={x + 22} y={BANDA.y + 76}>
                        {o.quien}
                      </text>
                    </g>
                  )
                })}
              </g>

              {/* Apoyos, con borde punteado. */}
              {APOYOS.map((a, k) => {
                const x = k * (APOYO.ancho + APOYO.hueco)
                return (
                  <g key={a.area} className={base.aparece} style={en(700)}>
                    <rect className={estilos.apoyo} x={x} y={APOYO.y} width={APOYO.ancho} height={APOYO.alto} rx={12} />
                    <text className={estilos.apoyoTexto} x={x + 24} y={APOYO.y + 26}>
                      <tspan className={estilos.fuerte}>{a.area}</tspan> · {a.quien}
                    </text>
                    <text className={estilos.apoyoTarea} x={x + 24} y={APOYO.y + 49}>
                      {a.tarea}
                    </text>
                  </g>
                )
              })}
            </svg>

            {/* EL CLIENTE, al pie del árbol. */}
            <div className={estilos.ancla} style={ancla}>
              <Punto tam={22} className={base.brota} style={en(480)} />
            </div>
          </div>
        </div>
      </Escena>
    </section>
  )
}
