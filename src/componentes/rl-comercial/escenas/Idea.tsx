import { Fragment, type CSSProperties } from 'react'
import base from '../base.module.css'
import estilos from './Idea.module.css'
import { Escena } from '../../politico/Escena'
import { orden, Punto } from '../comun'

/**
 * 2 · LA IDEA. La tesis de su plan, de la que sale todo lo demás.
 *
 * Superficie morado sólido (sin la luz azul de `Luz`: el degradado de marca
 * nunca va debajo del texto); solo grano y una viñeta del mismo tono.
 * El cliente se vuelve el punto final de la frase: el `Punto` va en la línea
 * base, pegado a «sabe», a 0.22em del cuerpo de la cita.
 *
 * Movimiento (quieta en ≤ 1200 ms): la cita sube palabra por palabra con
 * escalón de 60 ms (60–420 ms, pasos de 420 ms) y la explicación la sigue
 * (480 ms); pausa, y el punto final brota al último (900–1200 ms).
 */
const PRIMERA_LINEA = ['El', 'cliente', 'le', 'compra']
const SEGUNDA_LINEA = ['a', 'quien']

export function Idea() {
  return (
    <section data-layout="idea" className={`${base.pantalla} ${base.morado}`}>
      <div className={estilos.vineta} aria-hidden="true" />
      <div className={base.grano} aria-hidden="true" />
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <header className={base.cabecera}>
          <p className={`${base.antetitulo} ${base.aparece}`} style={orden(0)}>
            La idea de su plan
          </p>
        </header>
        <div className={`${base.cuerpo} ${estilos.cuerpo}`}>
          <h2 className={`${base.titulo} ${estilos.cita}`}>
            <span className={estilos.linea}>
              {PRIMERA_LINEA.map((palabra, i) => (
                <Fragment key={palabra}>
                  <span className={`${estilos.palabra} ${base.aparece}`} style={orden(i + 1)}>
                    {palabra}
                  </span>{' '}
                </Fragment>
              ))}
            </span>
            <span className={estilos.linea}>
              {SEGUNDA_LINEA.map((palabra, i) => (
                <Fragment key={palabra}>
                  <span
                    className={`${estilos.palabra} ${base.aparece}`}
                    style={orden(PRIMERA_LINEA.length + i + 1)}
                  >
                    {palabra}
                  </span>{' '}
                </Fragment>
              ))}
              <span className={estilos.final}>
                <span className={`${estilos.palabra} ${base.aparece}`} style={orden(7)}>
                  sabe
                </span>
                <Punto
                  className={`${base.brota} ${estilos.punto}`}
                  style={{ ...orden(15), '--punto': '0.22em' } as CSSProperties}
                />
              </span>
            </span>
          </h2>
          <p className={`${base.nota} ${estilos.explicacion} ${base.aparece}`} style={orden(8)}>
            Por eso la operación sale a vender junto con comercial: quien diseña el estudio lo presenta.
          </p>
        </div>
      </Escena>
    </section>
  )
}
