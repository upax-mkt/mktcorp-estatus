import type { CSSProperties } from 'react'
import base from '../base.module.css'
import estilos from './Ahora.module.css'
import { Escena } from '../../politico/Escena'
import { Aforo } from '../Aforo'
import { Fondo, Luz, orden } from '../comun'

/**
 * 5 · AHORA — «La temporada cierra el 30 de enero.» (20-oct-2026, motion-studio).
 *
 * El dibujo prueba el título: la temporada es una regla de semanas que se acaba. Del 1 de octubre al 30 de enero,
 * una marca por lunes; diciembre, el único tramo encendido (el acento naranja de la escena), dentro de una columna
 * de vidrio que la línea atraviesa; al final, un tope rotulado: arriba «30 de enero», abajo «cierra la temporada».
 * Sin marcador de «hoy»: la fecha en que se presenta no está fija. Detrás, el guerrero de Malinche
 * (`calendario-guerrero.jpg`) con velo fuerte.
 *
 * Ronda 2 (20-oct-2026): el guerrero señala arriba a la izquierda, así que el título va arriba a la derecha, sobre el
 * cielo, cortado «La temporada cierra / el 30 de enero.», y la regla baja hasta su torso: ni el título le cruza el
 * brazo ni la línea le corta el cuello (medido a 1920, 1440 y 1366). Sin las marcas de cambio de mes, que caían a
 * 13 px de un lunes: los meses se leen por sus rótulos y por la columna de diciembre.
 *
 * GEOMETRÍA FIJA: diez unidades por día (121 días, viewBox de 1210). La retícula usa las mismas proporciones
 * (31 · 30 · 31 · 29 días), así que cada rótulo y la columna de diciembre caen sobre su tramo de la línea sin medir
 * nada en JS.
 *
 * MOVIMIENTO (ms desde que la escena entra; quieta a los ≈1190):
 *   0–500      el título sube
 *   90–510     la vía se tiende (se ve después del título, no desde el primer cuadro) y el tope del 30 de enero se
 *              traza; su rótulo sube a los 135: el final ya está puesto
 *   180–1080   la temporada corre de octubre al tope: la línea se traza (--mov-ease-in-out) con su punta, cada lunes
 *              se marca cuando la punta pasa por él y cada mes asoma su nombre al llegar (tiempos sacados de
 *              invertir la curva, abajo)
 *   ≈610–1190  la punta cruza diciembre: su columna de vidrio sube, su tramo se enciende detrás de la punta y entra
 *              su texto. Es lo último que se lee.
 * Sin JS, impresa o con movimiento reducido, todo está en su estado final desde el HTML.
 */

const DIAS = 121
/** Día (desde el 1 de octubre) en que empieza cada mes; enero llega al 30, cuando cierra la temporada. */
const OCTUBRE = 0
const NOVIEMBRE = 31
const DICIEMBRE = 61
const ENERO = 92
/** Los lunes de la temporada, en días desde el 1 de octubre (del 5 de octubre al 25 de enero). */
const LUNES = [4, 11, 18, 25, 32, 39, 46, 53, 60, 67, 74, 81, 88, 95, 102, 109, 116]

const X = (dia: number) => dia * 10
const ALTO = 64
const LINEA_Y = ALTO / 2

/** La curva del trazo de la base (--mov-ease-in-out): cubic-bezier(0.77, 0, 0.175, 1). */
const bezier = (t: number, a: number, b: number) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3

/** Qué fracción del tiempo del trazo tarda la punta en recorrer la fracción `p` de la línea (y(t) = p, luego x(t)). */
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
const VIA_INICIO = 90
const LINEA_INICIO = 180
const LINEA_DURACION = 900
/** Cuándo pasa la punta por un día (ms desde que la escena entra). */
const llega = (dia: number) => Math.round(LINEA_INICIO + fraccionDeTiempo(dia / DIAS) * LINEA_DURACION)
const CRUZA_DICIEMBRE = llega(DICIEMBRE)

const vars = (v: Record<string, string | number>) => v as CSSProperties
/** Arranque en ms, traducido al escalón de la casa (`--i` × 90 ms). */
const en = (ms: number) => vars({ '--i': ms / ESCALON })
const trazo = (ms: number, duracion: number) => vars({ '--i': ms / ESCALON, '--mov-trazo': `${duracion}ms` })
/** La columna de la retícula de cada mes (1 a 4). */
const COLUMNA = { [OCTUBRE]: 1, [NOVIEMBRE]: 2, [DICIEMBRE]: 3, [ENERO]: 4 } as Record<number, number>

function Mes({ dia, nombre }: { dia: number; nombre: string }) {
  return (
    <p className={`${estilos.mes} ${base.aparece}`} style={{ ...en(llega(dia)), ...vars({ '--col': COLUMNA[dia] }) }}>
      {nombre}
    </p>
  )
}

export function Ahora() {
  return (
    <section data-layout="ahora" className={`${base.pantalla} ${estilos.pantalla}`}>
      <Fondo src="/fortaleza/calendario-guerrero.jpg" velo="total" posicion="50% 22%" />
      <Luz />
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <header className={`${base.cabecera} ${estilos.cabecera}`}>
          <h2 className={`${base.titulo} ${estilos.titulo} ${base.aparece}`} style={orden(0)}>
            La temporada cierra <span className={estilos.renglon}>el 30 de enero.</span>
          </h2>
        </header>

        <div className={`${base.cuerpo} ${estilos.cuerpo}`}>
          <div className={estilos.temporada}>
            {/* Diciembre: una columna de vidrio que la línea atraviesa; detrás de todo. */}
            <div className={`${base.vidrio} ${estilos.ventana} ${base.aparece}`} style={en(CRUZA_DICIEMBRE)} aria-hidden="true" />

            <Mes dia={OCTUBRE} nombre="Octubre" />
            <Mes dia={NOVIEMBRE} nombre="Noviembre" />
            {/* Un solo párrafo para el lector de pantalla; sus dos partes van arriba y abajo de la línea. */}
            <p className={estilos.partido}>
              <span className={`${estilos.mes} ${estilos.mesDiciembre} ${base.aparece}`} style={en(CRUZA_DICIEMBRE + 30)}>
                Diciembre:
              </span>{' '}
              <span className={`${estilos.diciembreTexto} ${base.aparece}`} style={en(CRUZA_DICIEMBRE + 75)}>
                fiestas de fin de año y funciones para empresas
              </span>
            </p>
            <Mes dia={ENERO} nombre="Enero" />

            {/* El tope, rotulado: la fecha arriba de la línea y lo que pasa, abajo. También un solo párrafo. */}
            <p className={estilos.partido}>
              <span className={`${estilos.finFecha} ${base.aparece}`} style={en(135)}>
                30 de enero
              </span>
              <span className={estilos.finSeparador}> · </span>
              <span className={`${estilos.finTexto} ${base.aparece}`} style={en(135)}>
                cierra la temporada
              </span>
            </p>

            <svg className={estilos.regla} viewBox={`0 0 ${X(DIAS)} ${ALTO}`} aria-hidden="true" focusable="false">
              {/* La vía: se tiende después del título y va por delante de la temporada que corre. */}
              <path
                className={`${estilos.carril} ${base.trazo}`}
                d={`M0 ${LINEA_Y}H${X(DIAS)}`}
                pathLength={1}
                style={trazo(VIA_INICIO, 420)}
              />
              {/* Un lunes, una marca: se traza cuando la punta pasa por ella. */}
              {LUNES.map((dia) => (
                <path
                  key={dia}
                  className={`${estilos.semana} ${dia > DICIEMBRE && dia < ENERO ? estilos.semanaDiciembre : ''} ${base.trazo}`}
                  d={`M${X(dia)} 22V42`}
                  pathLength={1}
                  style={trazo(llega(dia) - 30, 220)}
                />
              ))}
              {/* La temporada que corre. */}
              <path
                className={`${estilos.recorrido} ${base.trazo}`}
                d={`M0 ${LINEA_Y}H${X(DIAS)}`}
                pathLength={1}
                style={trazo(LINEA_INICIO, LINEA_DURACION)}
              />
              {/* Diciembre se enciende detrás de la punta: el acento de la escena. */}
              <path
                className={`${estilos.encendido} ${base.trazo}`}
                d={`M${X(DICIEMBRE)} ${LINEA_Y}H${X(ENERO)}`}
                pathLength={1}
                style={trazo(CRUZA_DICIEMBRE, 420)}
              />
              {/* El tope del 30 de enero: puesto antes de que la línea llegue. */}
              <path className={`${estilos.tope} ${base.trazo}`} d={`M${X(DIAS)} 0V${ALTO}`} pathLength={1} style={trazo(VIA_INICIO, 420)} />
            </svg>

            {/* La punta: viaja con el trazo (misma curva, misma duración) y reposa en el tope. */}
            <span className={estilos.viajero} style={en(LINEA_INICIO)} aria-hidden="true">
              <span className={estilos.punta} />
            </span>
          </div>
        </div>

        <Aforo tam="chico" frentes={0} rotulo="Hoy, la mitad" className={base.aforoEsquina} />
      </Escena>
    </section>
  )
}
