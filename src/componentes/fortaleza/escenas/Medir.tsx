import type { CSSProperties } from 'react'
import base from '../base.module.css'
import estilos from './Medir.module.css'
import { Escena } from '../../politico/Escena'
import { orden, Luz, Foto, Propuesta } from '../comun'
import { Aforo } from '../Aforo'

/**
 * 15 · MEDIR. Frente 5 · «Entender y medir». La última escena antes de la ruta y la cumbre (ronda 3, 20-oct-2026).
 *
 * Se queda la composición de la ronda 2: arriba, el título a la izquierda y la premisa a la derecha, en letra grande y
 * sin caja («Lo que ya sabemos: la obra genera satisfacción y recomendación.»); abajo, anclado, lo que se propone, en
 * el orden en que se dice. Cambia cómo se cuenta Research Land (`Propuesta`, ronda 3): su logo, qué hace en una frase
 * («Un estudio en cuatro partes…») y las cuatro partes en una sola rejilla de dos por dos, bajo esa frase, para que se
 * lean como partes de un mismo estudio y no como cuatro estudios. A su lado, su imagen: la encuesta a la salida de la
 * función. En la fila de abajo, el podcast que se graba en el Frontón (Research Land y House of Films), con su foto, y
 * «Cada semana» junto al aforo: el corte de lo que suma cada frente es justo lo que el aforo dibuja.
 *
 * LAS FOTOS: `rl-encuesta.jpg` es PROVISIONAL (se generará la encuesta a la salida de la función y se reemplaza el
 * archivo con el mismo nombre): el marco es 16:9 horizontal y va rotulado «Ilustración». La de los músicos ya no va
 * de fondo: con la imagen nueva y las cuatro partes, la cara del guitarrista quedaba debajo de un texto. La pantalla
 * queda en el índigo de la casa, con su luz, como la ruta.
 *
 * EL AFORO: llega al 90 %. Las butacas que faltan ya se ven como aros vacíos.
 *
 * MOVIMIENTO (ms desde que llega la escena; quieta en ≤ 1200; solo `.aparece` de la base y `orden`):
 *   0–560      antetítulo y título suben (escalón de 60 ms)
 *   120        la premisa
 *   180        Research Land: logo, frase y las cuatro partes, juntos
 *   240        su imagen
 *   300        «Noche de Jueves», foto y texto juntos
 *   360–860    «Cada semana»
 *   730–1195   AL FINAL, SOLO, el aforo enciende el tramo 5 butaca por butaca: lo demás ya asentó
 * Sin JS, impreso o con movimiento reducido: el cuadro final.
 */

/** El tramo 5 se enciende cuando lo demás ya asentó: 29 × 5 ms + 320 ms después, la escena queda quieta (1195). */
const ENCIENDE = 730

/** Arranque en ms, traducido al escalón de la casa (`--i` × 90 ms). */
const en = (ms: number) => ({ '--i': ms / 90 }) as CSSProperties

export function Medir() {
  return (
    <section data-layout="medir" className={`${base.pantalla} ${estilos.pantalla}`}>
      <Luz />
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <div className={estilos.arriba}>
          <header className={base.cabecera}>
            <p className={`${base.antetitulo} ${base.aparece}`} style={orden(0)}>
              Frente 5
            </p>
            <h2 className={`${base.titulo} ${estilos.titulo} ${base.aparece}`} style={en(60)}>
              Entender y medir
            </h2>
          </header>

          <div className={`${estilos.premisa} ${base.aparece}`} style={en(120)}>
            <h3 className={estilos.premisaEtiqueta}>Lo que ya sabemos</h3>
            <p className={estilos.premisaFrase}>La obra genera satisfacción y recomendación.</p>
          </div>
        </div>

        <div className={estilos.cuerpo}>
          <Propuesta
            unidades={['research-land']}
            frase="Un estudio en cuatro partes para saber quién más puede venir y qué lo haría volver."
            acciones={[
              { titulo: 'Quién puede venir', texto: 'A quién conviene invitar y qué lo detiene hoy.' },
              {
                titulo: 'Quién regresaría',
                texto: 'Cómo califican la experiencia quienes ya fueron, y si la recomiendan.',
              },
              { titulo: 'Por qué', texto: 'Entrevistas a profundidad con asistentes y con quien todavía no va.' },
              { titulo: 'Qué se dice', texto: 'Lo que se habla de Malinche en redes y medios.' },
            ]}
            i={180 / 90}
            className={estilos.estudio}
          />

          <Foto
            src="/fortaleza/rl-encuesta.jpg"
            alt="Ilustración: la encuesta de Research Land a la salida de la función de Malinche"
            marca="Ilustración"
            className={`${estilos.encuesta} ${base.aparece}`}
            style={en(240)}
          />

          {/* El podcast: su foto y su texto entran juntos, como una sola pieza. */}
          <div className={estilos.jueves}>
            <Foto
              src="/fortaleza/pasillo-calendario.jpg"
              alt="El pasillo de la piedra del calendario, en el Frontón México"
              posicion="40% 50%"
              className={`${estilos.juevesFoto} ${base.aparece}`}
              style={en(300)}
            />
            <Propuesta
              unidades={['research-land', 'house-of-films']}
              acciones={[
                {
                  titulo: '«Noche de Jueves»',
                  texto: 'Se graba en el Frontón con Juan Miguel Zunzunegui y parte de una encuesta de Research Land.',
                },
              ]}
              i={300 / 90}
              className={estilos.juevesTexto}
            />
          </div>

          {/* «Cada semana» no es de una unidad: va con la forma de una acción, sin logo, junto al aforo. */}
          <div className={`${base.accion} ${base.aparece} ${estilos.semana}`} style={en(360)}>
            <h3 className={base.accionTitulo}>Cada semana</h3>
            <p className={base.accionTexto}>Un corte de lo que suma cada frente.</p>
          </div>
        </div>

        <Aforo tam="chico" frentes={5} enciende={5} retardo={ENCIENDE} rotulo="Frente 5 de 5" className={base.aforoEsquina} />
      </Escena>
    </section>
  )
}
