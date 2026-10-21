import base from '../base.module.css'
import estilos from './Ciudad.module.css'
import { Escena } from '../../politico/Escena'
import { Aforo } from '../Aforo'
import { Firma, Foto, Luz, Tarjeta, orden } from '../comun'

/**
 * 7 · CIUDAD — Frente 1 · «Que la ciudad lo vea», las pantallas (20-oct-2026, motion-studio; ronda 2).
 *
 * Una sala a oscuras y un solo objeto encendido: Malinche en un poster LED de Promo Espacio, que alumbra lo que tiene
 * cerca. Es la parte de arriba del poster (`poster-led-malinche-recorte.jpg`: el logo de Banco Azteca, MALINCHE,
 * Nacho Cano y el arte), sin el descuento, los precios ni las marcas del súper que lo rodeaban en la foto. Va a la
 * derecha, sobre el aforo: la pantalla arriba, la sala abajo, y el tramo del frente 1 se enciende al final. A la
 * izquierda, la cabecera con las unidades del frente (Promo Espacio y House of Films) y las tres tarjetas de las
 * pantallas, en el orden en que se dicen, cada una con su unidad en el renglón del título. «En la calle», «Visitantes
 * y turistas» y «Prensa» siguen en la escena 8.
 *
 * MOVIMIENTO (ms desde que la escena entra; quieta en 1186). El aforo NO entra: llega viajando del centro de la
 * escena 6 a esta esquina (transición de vista de `ModoPresentar`, 800 ms). Mientras viaja, lo demás solo se funde,
 * sin desplazarse (`base.conViaje`): antetítulo 0 · título 90 · logos 180 · el poster 270 · las tres tarjetas 360,
 * 450 y 540 (cada fundido, 500 ms). Su rótulo, que no viaja con el dibujo, se funde al aterrizar: 600–1000. Ya
 * asentadas las tarjetas, solo, el tramo del frente 1 se enciende butaca por butaca: 750–1186 (30 butacas a 4 ms,
 * 320 ms cada una).
 * Sin JS, impresa o con movimiento reducido, todo está en su estado final desde el HTML.
 */
export function Ciudad() {
  return (
    <section data-layout="ciudad" className={base.pantalla}>
      <Luz />
      <Escena className={`${base.escena} ${base.conViaje}`}>
        <div className={estilos.composicion}>
          <header className={estilos.cabecera}>
            <div className={base.cabecera}>
              <p className={`${base.antetitulo} ${base.aparece}`} style={orden(0)}>
                Frente 1
              </p>
              <h2 className={`${base.titulo} ${estilos.titulo} ${base.aparece}`} style={orden(1)}>
                Que la ciudad lo vea
              </h2>
            </div>
            <Firma
              unidades={['promo-espacio', 'house-of-films']}
              className={`${estilos.firma} ${base.aparece}`}
              style={orden(2)}
            />
          </header>

          {/* El poster y las tarjetas están en el camino del aforo que baja del centro: entran cuando aterriza. */}
          <div className={`${estilos.cartel} ${base.aparece} ${base.esperaViaje}`} style={orden(3)}>
            <Foto
              src="/fortaleza/poster-led-malinche-recorte.jpg"
              alt="Malinche en un poster LED de Promo Espacio."
              posicion="50% 0%"
              className={estilos.foto}
            />
          </div>

          <div className={estilos.lista}>
            <Tarjeta i={4} titulo="Pantallas encendidas" quien="Promo Espacio" className={`${estilos.tarjeta} ${base.esperaViaje}`}>
              Con SIDI, las pantallas del lobby, la taquilla, las suites y el escenario, y posters LED de nuestro inventario
              en el acceso, abiertas a patrocinadores.
            </Tarjeta>
            <Tarjeta i={5} titulo="La red de Promo Espacio" quien="Promo Espacio" className={`${estilos.tarjeta} ${base.esperaViaje}`}>
              Malinche, el Frontón y Pelota Mestiza en sus pantallas, como las de sucursales de Banco Azteca, y en las de sus
              socios: Forum, CETRAM y TeleUrban. Más un mapa de visibilidad en vía pública.
            </Tarjeta>
            <Tarjeta i={6} titulo="Publicidad audiovisual" quien="House of Films" className={`${estilos.tarjeta} ${base.esperaViaje}`}>
              Spot, video del venue y contenido para las pantallas.
            </Tarjeta>
          </div>
        </div>

        <Aforo
          tam="chico"
          frentes={1}
          enciende={1}
          retardo={750}
          pasoButaca={4}
          rotulo="Frente 1 de 5"
          className={`${base.aforoEsquina} ${estilos.aforo}`}
        />
      </Escena>
    </section>
  )
}
