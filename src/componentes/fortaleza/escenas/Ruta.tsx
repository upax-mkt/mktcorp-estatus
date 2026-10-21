import type { CSSProperties } from 'react'
import base from '../base.module.css'
import estilos from './Ruta.module.css'
import { Escena } from '../../politico/Escena'
import { Aforo } from '../Aforo'
import { Luz, orden } from '../comun'

const RUTA = [
  { mes: 'Octubre', etapa: 'Arranque', texto: 'Líderes por frente, pantallas y revisión de la compra.' },
  { mes: 'Noviembre', etapa: 'Primeros resultados', texto: 'Patrocinios, kit para empresas y Track Day.' },
  { mes: 'Diciembre', etapa: 'Cierre de año', texto: 'Funciones y fiestas para empresas.' },
  { mes: 'Enero', etapa: 'Cierre de temporada', texto: 'Resultados y plan 2027.' },
] as const

/**
 * 14 · RUTA — de octubre a enero (ronda 2, 20-oct-2026: sale de la cumbre para que la cumbre quede sola).
 *
 * LA MISMA VÍA DE LA ESCENA 5 («La temporada cierra el 30 de enero»), ahora con el plan encima: la temporada como una
 * regla de semanas, del 1 de octubre al 30 de enero, una marca por lunes, el corte de cada mes y el tope del 30 de
 * enero. Sobre la vía, una columna por mes con su etapa y lo que se hace, en la retícula de los días de cada mes
 * (31 · 30 · 31 · 29), para que cada columna empiece donde empieza su mes en la línea. Diciembre lleva el mismo tramo
 * naranja que en la escena 5: es el único acento. Las etapas van en blanco.
 *
 * Sin foto: es la lámina tranquila antes de la cumbre, y deja que la foto del teatro lleno llegue sola después. La
 * atmósfera la dan la luz de marca, la viñeta y el grano de la base.
 *
 * GEOMETRÍA FIJA: diez unidades por día (121 días, viewBox de 1210 × 64), las mismas proporciones de la escena 5.
 *
 * MOVIMIENTO (ms desde que llega la escena; quieta en ≤ 1200; solo las clases de la base):
 *   0–500      el título sube
 *   90–860     cada mes, en orden (escalón de la casa, 90 ms): su columna sube y su tramo de la vía se enciende
 *              (420 ms, --mov-ease-in-out), así la temporada se llena de plan de octubre a enero. Diciembre, en naranja.
 * El aforo está desde el primer cuadro con los cinco frentes encendidos, parejos (`destacar={false}`).
 * Sin JS, impreso o con movimiento reducido: el cuadro final.
 */

const DIAS = 121
/** Día (desde el 1 de octubre) en que empieza cada mes; la temporada cierra el 30 de enero (día 121). */
const INICIO = [0, 31, 61, 92] as const
const FIN = [31, 61, 92, DIAS] as const
/** Los lunes de la temporada (del 5 de octubre al 25 de enero). Sin los que caen a un día de un corte de mes: ahí ya
 *  está el corte, y dos marcas juntas se leen como un error. */
const LUNES = [4, 11, 18, 25, 32, 39, 46, 53, 60, 67, 74, 81, 88, 95, 102, 109, 116].filter(
  (dia) => !INICIO.some((corte) => corte > 0 && Math.abs(dia - corte) <= 1),
)
/** Diciembre: el acento de la escena, como en la escena 5. */
const DICIEMBRE = 2

const X = (dia: number) => dia * 10
const ALTO = 64
const LINEA_Y = ALTO / 2

const ESCALON = 90
/** Cuándo entra cada mes: escalón de la casa después del título. */
const ENTRA = RUTA.map((_, k) => ESCALON * (k + 1))

const vars = (v: Record<string, string | number>) => v as CSSProperties

export function Ruta() {
  return (
    <section data-layout="ruta" className={`${base.pantalla} ${estilos.pantalla}`}>
      <Luz />
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <header className={base.cabecera}>
          <h2 className={`${base.titulo} ${base.aparece}`} style={orden(0)}>
            La ruta
          </h2>
        </header>

        <div className={estilos.cuerpo}>
          <div className={estilos.plan}>
            <ol className={estilos.meses}>
              {RUTA.map((r, k) => (
                <li
                  key={r.mes}
                  className={`${estilos.mes} ${base.aparece}`}
                  style={vars({ '--i': ENTRA[k] / ESCALON, '--col': k + 1 })}
                >
                  <h3 className={estilos.nombre}>{r.mes}</h3>
                  <p className={estilos.etapa}>{r.etapa}</p>
                  <p className={estilos.texto}>{r.texto}</p>
                </li>
              ))}
            </ol>

            {/* La vía entra después del título, como en la escena 5 (antes se veía desde el cuadro 0). */}
            <svg
              className={`${estilos.regla} ${base.aparece}`}
              style={orden(1)}
              viewBox={`0 0 ${X(DIAS)} ${ALTO}`}
              aria-hidden="true"
              focusable="false"
            >
              <path className={estilos.carril} d={`M0 ${LINEA_Y}H${X(DIAS)}`} />
              {/* El corte de cada mes: la misma marca alta y quieta de la escena 5, más la del arranque. */}
              {INICIO.map((dia) => (
                <path key={dia} className={estilos.corte} d={`M${X(dia)} 6V${ALTO - 6}`} />
              ))}
              {LUNES.map((dia) => (
                <path key={dia} className={estilos.semana} d={`M${X(dia)} 22V42`} />
              ))}
              {/* El plan llena la temporada: cada mes enciende su tramo cuando entra su columna. */}
              {RUTA.map((r, k) => (
                <path
                  key={r.mes}
                  className={`${k === DICIEMBRE ? estilos.encendido : estilos.tramo} ${base.trazo}`}
                  d={`M${X(INICIO[k])} ${LINEA_Y}H${X(FIN[k])}`}
                  pathLength={1}
                  style={vars({ '--i': ENTRA[k] / ESCALON, '--mov-trazo': '420ms' })}
                />
              ))}
              {/* El tope del 30 de enero: la temporada termina ahí. */}
              <path className={estilos.tope} d={`M${X(DIAS)} 0V${ALTO}`} />
            </svg>
          </div>
        </div>

        <Aforo tam="chico" frentes={5} destacar={false} rotulo="Los cinco frentes" className={base.aforoEsquina} />
      </Escena>
    </section>
  )
}
