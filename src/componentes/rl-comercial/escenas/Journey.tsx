import type { CSSProperties } from 'react'
import base from '../base.module.css'
import estilos from './Journey.module.css'
import { Escena } from '../../politico/Escena'
import { orden, Punto, Luz } from '../comun'

/**
 * 5 · LA CUMBRE: «El cliente nunca se queda sin dueño» (6-oct-2026, motion-studio).
 *
 * Un camino, no tarjetas: una pista horizontal con doce paradas en cuatro fases;
 * los pasos impares cuelgan arriba y los pares abajo, cada uno unido a su parada
 * por un tallo. El cliente (el punto amarillo) recorre la pista de la 1 a la 12;
 * al pasar, cada tallo se traza y su paso y sus dueños se encienden. En las dos
 * puertas (3 y 6) se detiene y la puerta se enciende en amarillo. Al llegar a la
 * recompra, un arco tenue vuelve a la 1 y «nunca» pasa a amarillo: el único remate.
 *
 * GEOMETRÍA FIJA: el escenario mide 1600 × 760 unidades (el viewBox del SVG) y
 * conserva esa proporción; lo HTML se coloca en porcentajes de esas constantes y
 * la letra va en cqw del escenario. Nada se mide en JS. Tiempos y cronología en
 * `Journey.module.css`. Sin JS, impreso o con movimiento reducido: el estado final.
 */

type Paso = { titulo: string; detalle: string; duenos: string[]; puerta?: string }

const FASES: { nombre: string; pasos: Paso[] }[] = [
  {
    nombre: 'ABRIR',
    pasos: [
      { titulo: 'Prospección', detalle: 'Cuentas objetivo, por sector donde ya ganamos', duenos: ['SDR'] },
      { titulo: 'Reunión de diagnóstico', detalle: 'El problema del cliente, no el catálogo', duenos: ['Ejecutiva', 'PM'] },
      {
        titulo: 'Calificación',
        detalle: 'Presupuesto, decisor, necesidad y fecha',
        duenos: ['Ejecutiva'],
        puerta: 'Sin esto no se cotiza',
      },
    ],
  },
  {
    nombre: 'PROPONER',
    pasos: [
      { titulo: 'Diseño y cotización', detalle: 'Con tarifario, en 48 horas', duenos: ['PM', 'Operación'] },
      { titulo: 'Autorización', detalle: 'Solo lo que sale del tarifario', duenos: ['Dirección General'] },
      {
        titulo: 'Presentación en persona',
        detalle: 'Con quien va a ejecutar',
        duenos: ['PM', 'Ejecutiva', 'Operación'],
        puerta: 'Nunca por correo',
      },
    ],
  },
  {
    nombre: 'CERRAR Y ENTREGAR',
    pasos: [
      { titulo: 'Seguimiento', detalle: 'Con fecha de decisión', duenos: ['Ejecutiva'] },
      { titulo: 'Alta y arranque', detalle: 'Cliente, proyecto y equipo en una reunión', duenos: ['Administración', 'PM'] },
      { titulo: 'Ejecución', detalle: 'Estatus al cliente cada semana', duenos: ['PM', 'Operación'] },
    ],
  },
  {
    nombre: 'CRECER',
    pasos: [
      { titulo: 'Entrega de resultados', detalle: 'En persona; ahí nace la Fase II', duenos: ['PM', 'Operación'] },
      { titulo: 'Facturación y cobro', detalle: 'La comisión se paga sobre lo cobrado', duenos: ['Administración', 'Ejecutiva'] },
      { titulo: 'Recompra', detalle: 'La PM le pasa la cuenta al KAM', duenos: ['KAM'] },
    ],
  },
]

/** x de cada parada en el viewBox (paso 120, más 20 entre fases). La pista está en y = 400. */
const X = [110, 230, 350, 490, 610, 730, 870, 990, 1110, 1250, 1370, 1490]

/**
 * Cuándo pasa el punto por cada parada (ms desde que la escena entra). Salen de
 * invertir --mov-ease-in-out en cada tramo (1→3, 3→6, 6→9, 9→12); las puertas
 * retienen al punto 240 ms (680–920 y 1260–1500).
 */
const LLEGADA = [400, 540, 680, 1073, 1098, 1260, 1626, 1647, 1780, 1906, 1927, 2060]

const PISTA = 400
/** Porcentaje del ancho del escenario (1600 unidades). */
const pct = (x: number) => `${x / 16}%`
const vars = (v: Record<string, string | number>) => v as CSSProperties

const PASOS = FASES.flatMap((f) => f.pasos)

export function Journey() {
  return (
    <section data-layout="journey" className={`${base.pantalla} ${base.noche}`}>
      <Luz />
      <Escena className={base.escena}>
        <header className={`${base.cabecera} ${estilos.cabecera}`}>
          <p className={`${base.antetitulo} ${base.aparece}`} style={orden(0)}>
            Journey comercial
          </p>
          <h2 className={`${base.titulo} ${base.aparece}`} style={orden(1)}>
            El cliente <span className={estilos.nunca}>nunca</span> se queda sin dueño
          </h2>
        </header>

        <div className={`${base.cuerpo} ${estilos.cuerpo}`}>
          <div className={estilos.escenario}>
            <svg className={estilos.plano} viewBox="0 0 1600 760" aria-hidden="true" focusable="false">
              <g className={estilos.capaBase}>
                {FASES.map((f, k) => (
                  <path
                    key={f.nombre}
                    className={estilos.corchete}
                    d={`M${X[k * 3] - 14} 42V34H${X[k * 3 + 2] + 14}V42`}
                  />
                ))}
                <path className={estilos.pista} d={`M${X[0]} ${PISTA}H${X[11]}`} />
              </g>

              {/* La recompra vuelve a empezar: de la 12 a la 1, por debajo de la pista. */}
              <path className={estilos.regreso} d="M1490 400C1290 470 310 470 110 400" pathLength={1} />
              {/* El rastro que deja el cliente: se traza detrás del punto, con sus mismos tiempos. */}
              <path className={estilos.rastro} d={`M${X[0]} ${PISTA}H${X[11]}`} pathLength={1} />

              {PASOS.map((p, i) => {
                const arriba = i % 2 === 0
                const desde = arriba ? (p.puerta ? 372 : 391) : p.puerta ? 428 : 409
                const hasta = arriba ? 342 : 458
                return (
                  <path
                    key={p.titulo}
                    className={estilos.tallo}
                    d={`M${X[i]} ${desde}V${hasta}`}
                    pathLength={1}
                    style={vars({ '--t': `${LLEGADA[i]}ms` })}
                  />
                )
              })}

              <g className={estilos.capaBase}>
                {PASOS.map((p, i) =>
                  p.puerta ? (
                    <g key={p.titulo} style={vars({ '--t': `${LLEGADA[i]}ms` })}>
                      <rect className={estilos.puertaHalo} x={X[i] - 16} y={372} width={32} height={56} rx={16} />
                      <rect className={estilos.puerta} x={X[i] - 16} y={372} width={32} height={56} rx={16} />
                    </g>
                  ) : null,
                )}
                {PASOS.map((p, i) => (
                  <circle
                    key={p.titulo}
                    className={estilos.parada}
                    cx={X[i]}
                    cy={PISTA}
                    r={7}
                    style={vars({ '--t': `${LLEGADA[i]}ms` })}
                  />
                ))}
              </g>
            </svg>

            <ol className={estilos.fases}>
              {FASES.map((f, k) => (
                <li key={f.nombre} className={estilos.fase}>
                  <p
                    className={estilos.faseNombre}
                    style={vars({ '--cx': pct((X[k * 3] + X[k * 3 + 2]) / 2), '--i': k })}
                  >
                    {f.nombre}
                  </p>
                  <ol className={estilos.pasos}>
                    {f.pasos.map((p, j) => {
                      const i = k * 3 + j
                      return (
                        <li
                          key={p.titulo}
                          className={estilos.paso}
                          data-lado={i % 2 === 0 ? 'arriba' : 'abajo'}
                          data-puerta={p.puerta ? 'true' : undefined}
                          style={vars({ '--x': pct(X[i]), '--t': `${LLEGADA[i]}ms`, '--i': k })}
                        >
                          <div className={estilos.luz}>
                            <p className={estilos.numero}>{String(i + 1).padStart(2, '0')}</p>
                            <h3 className={estilos.tituloPaso}>{p.titulo}</h3>
                            <p className={estilos.detalle}>{p.detalle}</p>
                            <ul className={estilos.duenos} aria-label="Dueños">
                              {p.duenos.map((d, n) => (
                                <li key={d} className={estilos.dueno} style={vars({ '--k': n })}>
                                  {d}
                                </li>
                              ))}
                            </ul>
                            {p.puerta ? <p className={estilos.puertaEtiqueta}>{p.puerta}</p> : null}
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                </li>
              ))}
            </ol>

            {/* EL CLIENTE. Sin JS, impreso o con movimiento reducido, reposa en la parada 12. */}
            <div className={estilos.viajero} aria-hidden="true">
              <Punto className={estilos.punto} style={vars({ '--punto': '1.6cqw' })} />
            </div>
          </div>
        </div>
      </Escena>
      <p className={base.pie}>Las dos puertas en amarillo son las que hoy no existen.</p>
    </section>
  )
}
