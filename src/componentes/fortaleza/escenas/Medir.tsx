import Image from 'next/image'
import type { CSSProperties } from 'react'
import base from '../base.module.css'
import estilos from './Medir.module.css'
import { Escena } from '../../politico/Escena'
import { orden, Luz, Foto, Firma, Tarjeta } from '../comun'
import { Aforo } from '../Aforo'

/**
 * 13 · MEDIR. Frente 5 · «Entender y medir». La última escena antes de la ruta y la cumbre (ronda 2, 20-oct-2026).
 *
 * Arriba, tres piezas en una fila: el título con sus logos (Research Land y House of Films) a la izquierda, el
 * guitarrista de Malinche al centro, y a la derecha la premisa, en letra grande y sin caja: «Lo que ya sabemos: la
 * obra genera satisfacción y recomendación.» La etiqueta va pegada a la frase. Abajo, anclados, los estudios en el
 * orden en que se dicen: quién más puede venir y lo que se dice; el podcast que se graba en el Frontón, con su foto, y
 * al final «Cada semana», junto al aforo: el corte de lo que suma cada frente es justo lo que el aforo dibuja.
 *
 * LA FOTO: `musicos.jpg` acercada 1.25 desde la esquina de abajo a la derecha. Queda un solo protagonista, con la cara
 * libre entre el título y la premisa, y el músico de la izquierda sale de cuadro: nada se pone sobre una cara.
 *
 * EL AFORO: llega al 90 %. Las butacas que faltan ya se ven como aros vacíos (así las dibuja el aforo desde la ronda
 * 2): la capa propia de anillos de la ronda 1 se quitó, porque repetía ese dibujo y añadía un movimiento más después
 * del tramo.
 *
 * MOVIMIENTO (ms desde que llega la escena; quieta en ≤ 1200; solo `.aparece` de la base y `orden`):
 *   0–620      antetítulo, título y logos suben (escalón de 60 ms)
 *   180–680    la premisa
 *   270–950    los estudios, en el orden en que se dicen (escalón de 60 ms)
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
      <div className={estilos.foto} aria-hidden="true">
        <Image src="/fortaleza/musicos.jpg" alt="" fill sizes="100vw" unoptimized />
      </div>
      <div className={`${base.velo} ${estilos.velo}`} aria-hidden="true" />
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
            <Firma
              unidades={['research-land', 'house-of-films']}
              className={`${estilos.firma} ${base.aparece}`}
              style={en(120)}
            />
          </header>

          <div className={`${estilos.premisa} ${base.aparece}`} style={en(180)}>
            <h3 className={estilos.premisaEtiqueta}>Lo que ya sabemos</h3>
            <p className={estilos.premisaFrase}>La obra genera satisfacción y recomendación.</p>
            <p className={base.quien}>Research Land</p>
          </div>
        </div>

        <div className={estilos.estudios}>
          <Tarjeta titulo="Quién más puede venir" quien="Research Land" i={270 / 90} className={estilos.quienMas}>
            Research Land propone estudiar quién más puede venir, qué lo detiene y quién regresaría.
          </Tarjeta>
          <Tarjeta titulo="Lo que se dice" quien="Research Land" i={330 / 90} className={estilos.seDice}>
            Escucha de redes y medios sobre Malinche.
          </Tarjeta>
          <div className={`${estilos.jueves} ${base.aparece}`} style={en(390)}>
            <Foto
              src="/fortaleza/pasillo-calendario.jpg"
              alt="El pasillo de la piedra del calendario, en el Frontón México"
              posicion="40% 50%"
              className={estilos.juevesFoto}
            />
            <article className={`${base.vidrio} ${base.tarjeta} ${estilos.juevesTarjeta}`}>
              <h3 className={base.tarjetaTitulo}>«Noche de Jueves»</h3>
              <p className={base.tarjetaTexto}>
                Se graba en el Frontón con Juan Miguel Zunzunegui y parte de una encuesta de Research Land.
              </p>
              <p className={base.quien}>Research Land, House of Films</p>
            </article>
          </div>
          <Tarjeta titulo="Cada semana" i={450 / 90} className={estilos.semana}>
            Un corte de lo que suma cada frente.
          </Tarjeta>
        </div>

        <Aforo tam="chico" frentes={5} enciende={5} retardo={ENCIENDE} rotulo="Frente 5 de 5" className={base.aforoEsquina} />
      </Escena>
    </section>
  )
}
