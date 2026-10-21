import Image from 'next/image'
import base from '../base.module.css'
import estilos from './Grupo.module.css'
import { Escena } from '../../politico/Escena'
import { orden, Luz, Fondo, Propuesta, Tarjeta, MARCAS } from '../comun'
import { Aforo } from '../Aforo'

/**
 * 10 · GRUPO — Frente 2 · «Que el grupo lo viva» (ronda 3, 20-oct-2026: cada unidad se cuenta con su `Propuesta`).
 *
 * La composición de la ronda 2, ajustada. A la izquierda, lo que hace el grupo, ahora por unidad: arriba, NeraCode en
 * Zeus (los dos logos, qué hace en una frase y sus dos acciones: Boletos con beneficio y Comunicados); debajo, House of
 * Films con sus cápsulas. En medio, el teléfono de un colaborador: es la imagen de lo que hace NeraCode, el boleto de
 * Malinche con su QR dentro de Zeus, dibujado en CSS y rotulado «Ilustración». A la derecha, lo que pone Fortaleza («De
 * su lado»). De fondo, la escalera de los atlantes: la entrada del Frontón, por donde sube quien trae su boleto. Los
 * logos ya no van en la cabecera: cada bloque lleva el suyo.
 *
 * UN EJE ARRIBA Y UNO ABAJO: el bloque de NeraCode y «De su lado» arrancan en la misma línea; el rótulo del teléfono cae
 * en la última línea del bloque de House of Films. La esquina de abajo a la derecha es del aforo.
 *
 * El único acento naranja de la escena es la mira del QR: el mismo naranja de las butacas que este frente enciende.
 *
 * Movimiento (escalón corto de la casa, 60 ms; quieta a los 1185 ms): antetítulo 0 · título 60 · NeraCode y el teléfono
 * que lo ilustra 120 · House of Films 180 · «De su lado» 240 (a los ~490 ya asentó) · pausa · AL FINAL, SOLO, el aforo
 * enciende el tramo 2 butaca por butaca de 720 a 1185. Solo las clases de la base; estado final = estado por defecto.
 */

/** Cuándo empieza a encenderse el tramo 2: «De su lado» arranca a los 240 ms y a los ~490 ya asentó. */
const TRAMO_RETARDO = 720

/**
 * EL QR, CON PATRÓN FIJO (25 × 25, aspecto de versión 2): buscadores, temporización y alineación de un QR real; los
 * datos salieron una sola vez de un generador con semilla fija y quedaron aquí como constante. No codifica nada.
 */
const QR = [
  '1111111010011000101111111',
  '1000001000111101001000001',
  '1011101011010110101011101',
  '1011101011001011101011101',
  '1011101011000100001011101',
  '1000001010000001101000001',
  '1111111010101010101111111',
  '0000000011010110100000000',
  '1011011011000000001010011',
  '0010110110111110000100101',
  '1010101001011111101101100',
  '0001010110101011001011010',
  '0111101011000000001101100',
  '1101100111010000001111000',
  '1011101111001001100001001',
  '0001110011111100110001111',
  '1100101000101001111111110',
  '0000000011101010100010111',
  '1111111001101000101010001',
  '1000001000111010100010111',
  '1011101001000001111110010',
  '1011101001111010110111111',
  '1011101011101000111000011',
  '1000001001100000011011001',
  '1111111010010101110110001',
] as const

/** Los módulos oscuros en un solo trazado: cada racha horizontal es un rectángulo. */
const QR_TRAZADO = QR.flatMap((fila, y) => {
  const partes: string[] = []
  let x = 0
  while (x < fila.length) {
    if (fila[x] !== '1') {
      x++
      continue
    }
    let largo = 1
    while (fila[x + largo] === '1') largo++
    partes.push(`M${x} ${y}h${largo}v1h-${largo}z`)
    x += largo
  }
  return partes
}).join('')

/** La mira: cuatro esquinas alrededor del QR (caja de 100 × 100). Quieta: entra con el teléfono. */
const MIRA = 'M0 24V0H24M76 0H100V24M100 76V100H76M24 100H0V76'

export function Grupo() {
  return (
    <section data-layout="grupo" className={base.pantalla}>
      {/* Encuadre: la foto anclada abajo y un poco más cerca, para que las caras de piedra de los atlantes salgan
          del cuadro y no queden bajo el título (quedan sus cuerpos y la escalera). */}
      <div className={estilos.encuadre} aria-hidden="true">
        <Fondo src="/fortaleza/escalera-atlantes.jpg" velo="total" posicion="50% 100%" />
      </div>
      <Luz />
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <header className={base.cabecera}>
          <p className={`${base.antetitulo} ${base.aparece}`} style={orden(0)}>
            Frente 2
          </p>
          <h2 className={`${base.titulo} ${estilos.titulo} ${base.aparece}`} style={orden(1)}>
            Que el grupo lo viva
          </h2>
        </header>

        <div className={estilos.cuerpo}>
          {/* Lo que hace el grupo, por unidad: la columna de la izquierda. */}
          <Propuesta
            i={2}
            unidades={['neracode', 'zeus']}
            frase="Un módulo de boletos y comunicados dentro de Zeus, la plataforma que ya usan los colaboradores del grupo."
            acciones={[
              {
                titulo: 'Boletos con beneficio',
                texto:
                  'Catálogo de funciones, disponibilidad, compra y boleto digital con QR, con los beneficios para colaboradores.',
              },
              {
                titulo: 'Comunicados',
                texto: 'Por empresa, área o ubicación, programados, con notificación y evidencia de lectura.',
              },
            ]}
            className={`${base.vidrio} ${estilos.bloque} ${estilos.neracode}`}
          />
          <Propuesta
            i={3}
            unidades={['house-of-films']}
            acciones={[{ titulo: 'Cápsulas «¿Sabías que?»', texto: 'Con Juan Miguel Zunzunegui, para los colaboradores.' }]}
            className={`${base.vidrio} ${estilos.bloque} ${estilos.hof}`}
          />

          {/* En medio, el colaborador: su teléfono con el boleto. Entra con el bloque de NeraCode, que es lo que
              ilustra. */}
          <figure className={`${estilos.ilustracion} ${base.aparece}`} style={orden(2)}>
            <span className={estilos.halo} aria-hidden="true" />
            <div className={estilos.telefono} role="img" aria-label="Un teléfono con un boleto de Malinche y su código QR.">
              <div className={estilos.pantallaTel} aria-hidden="true">
                <span className={estilos.isla} />
                <span className={estilos.barraApp}>
                  <span className={estilos.atras} />
                  <span className={estilos.tituloApp} />
                </span>

                <div className={estilos.boleto}>
                  <div className={estilos.arte}>
                    <span className={estilos.foto}>
                      <Image
                        src="/fortaleza/elenco-principal.jpg"
                        alt=""
                        fill
                        sizes="(max-width: 760px) 70vw, 300px"
                        unoptimized
                        style={{ objectPosition: '50% 30%' }}
                      />
                    </span>
                    <Image
                      src={MARCAS.malinche.src}
                      alt=""
                      width={MARCAS.malinche.ancho}
                      height={MARCAS.malinche.alto}
                      unoptimized
                      className={estilos.logoMalinche}
                    />
                  </div>

                  <div className={estilos.talon}>
                    <span className={estilos.qr}>
                      <span className={estilos.placa}>
                        <svg viewBox="-1 -1 27 27" className={estilos.modulos} shapeRendering="crispEdges" focusable="false">
                          <path d={QR_TRAZADO} />
                        </svg>
                      </span>
                      <svg viewBox="0 0 100 100" className={estilos.mira} focusable="false">
                        <path d={MIRA} />
                      </svg>
                    </span>
                    <span className={estilos.renglon} />
                    <span className={estilos.renglon} />
                  </div>
                </div>

                <span className={estilos.inicio} />
              </div>
            </div>
            <figcaption className={estilos.rotulo}>Ilustración</figcaption>
          </figure>

          {/* Lo que pone Fortaleza: del otro lado del teléfono, en la línea de arriba del bloque de NeraCode. */}
          <Tarjeta i={4} titulo="De su lado" quien="Fortaleza" className={`${estilos.tarjeta} ${estilos.suyo}`}>
            El beneficio navideño desde el Buen Fin y una invitación suya a los directores del grupo.
          </Tarjeta>
        </div>

        <Aforo
          tam="chico"
          frentes={2}
          enciende={2}
          retardo={TRAMO_RETARDO}
          rotulo="Frente 2 de 5"
          className={base.aforoEsquina}
        />
      </Escena>
    </section>
  )
}
