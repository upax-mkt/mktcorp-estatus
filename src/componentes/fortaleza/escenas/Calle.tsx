import base from '../base.module.css'
import estilos from './Calle.module.css'
import { Escena } from '../../politico/Escena'
import { Aforo } from '../Aforo'
import { Firma, Fondo, Luz, Tarjeta, orden } from '../comun'

/**
 * 8 · CALLE — Frente 1, segunda pantalla: «Que la ciudad lo vea», en la calle (ronda 2, 20-oct-2026: la escena 7 no
 * cabía a tamaño de proyección y se partió en dos; el texto es el del guion).
 *
 * Si la 7 es una sala a oscuras con un objeto encendido, esta es la calle: la foto a sangre de un acceso público por
 * donde pasa la gente junto a un poster LED de Promo Espacio (`poster-led-acceso.jpg`), y la gente a la vista, a la
 * derecha. Sobre la parte oscura, la cabecera con sus unidades (Marketing United y Marketing Corporativo) y, abajo, el
 * frente en dos alturas: «En la calle», la destacada, a lo ancho y con el título mayor; debajo, «Visitantes y
 * turistas» y «Prensa», lado a lado. El aforo sigue en su esquina con el tramo del frente 1 ya encendido.
 *
 * MOVIMIENTO (ms desde que la escena entra; quieta en 770). La cabecera no entra: es la de la 7, en el mismo lugar,
 * y en el corte se queda quieta; cambian sus logos. Lo nuevo entra como entra la casa, subir 20 px con fundido, en el
 * orden en que se dice: logos 0 · «En la calle» 90 · «Visitantes y turistas» 180 · «Prensa» 270 (cada una, 500 ms).
 * El aforo está quieto desde el primer cuadro: este frente ya se encendió en la 7.
 * Sin JS, impresa o con movimiento reducido, todo está en su estado final desde el HTML.
 */
export function Calle() {
  return (
    <section data-layout="calle" className={`${base.pantalla} ${estilos.pantalla}`}>
      <Fondo src="/fortaleza/poster-led-acceso.jpg" velo="izquierda" posicion="50% 100%" />
      <Luz />
      <Escena className={base.escena}>
        <div className={estilos.composicion}>
          <header className={estilos.cabecera}>
            {/* Sin entrada: es la misma cabecera de la 7, en el mismo lugar. En el corte se queda quieta. */}
            <div className={base.cabecera}>
              <p className={base.antetitulo}>Frente 1</p>
              <h2 className={`${base.titulo} ${estilos.titulo}`}>Que la ciudad lo vea</h2>
            </div>
            <Firma
              unidades={['marketing-united', 'marketing-corporativo']}
              className={`${estilos.firma} ${base.aparece}`}
              style={orden(0)}
            />
          </header>

          <div className={estilos.frente}>
            <Tarjeta
              i={1}
              titulo="En la calle"
              quien="Marketing United"
              className={`${estilos.tarjeta} ${estilos.destacada}`}
            >
              Un stand itinerante con pantallas y personajes vende boletos en corporativos, escuelas y plazas. En la fiesta de
              cumpleaños de Ricardo Salinas ya montamos un stand de Malinche. Y flyers en autos y motos de conductores de apps.
            </Tarjeta>
            <Tarjeta i={2} titulo="Visitantes y turistas" quien="Marketing United" className={estilos.tarjeta}>
              Embajadas, concierges de hoteles, agencias de viaje y rutas de Turibus que terminan en el Frontón.
            </Tarjeta>
            <Tarjeta i={3} titulo="Prensa" quien="Marketing Corporativo" className={estilos.tarjeta}>
              Editores que publican a UPAX, invitados a ver Malinche, y difusión del altar de muertos.
            </Tarjeta>
          </div>
        </div>

        <Aforo tam="chico" frentes={1} rotulo="Frente 1 de 5" className={base.aforoEsquina} />
      </Escena>
    </section>
  )
}
