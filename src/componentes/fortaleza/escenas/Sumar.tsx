import Image from 'next/image'
import base from '../base.module.css'
import estilos from './Sumar.module.css'
import { Escena } from '../../politico/Escena'
import { Aforo } from '../Aforo'
import { Fondo, Foto, Luz, MARCAS, Tarjeta, orden } from '../comun'

/**
 * 4 · SUMAR — «Dónde podemos sumar» (guion técnico, 20-oct-2026).
 *
 * Oportunidad, nunca auditoría: nada en rojo, sin íconos de alerta y sin fotos de pantallas apagadas. Cinco tarjetas
 * de vidrio, en el orden del guion y armadas como un tablero, no como una rejilla: Pantallas, alta, con una pantalla
 * vertical encendida con el arte de Malinche (dibujada y rotulada «Ilustración»: la foto del poster LED de Malinche es
 * la protagonista de la escena 7 y no se repite); al centro Empresas, El venue y Lunes a miércoles; a la derecha
 * Pelota Mestiza con su mesa servida, y debajo, en su esquina de siempre, el aforo con la mitad vacía en contorno: el
 * lugar que hay para sumar. El acento naranja es «sumar». De fondo, la tienda de Malinche, con velo.
 *
 * Ronda 2 (20-oct-2026): letra de proyección de la base, con el texto completo; el tablero llega a la misma línea de
 * abajo que el aforo, y el aforo ocupa la celda de abajo a la derecha (antes quedaba vacía y él flotaba debajo). Va
 * dentro de la retícula, pegado a su esquina: cae en el mismo lugar que el `.aforoEsquina` de las demás escenas.
 *
 * Movimiento (quieta a los 950 ms): título (0 ms) y las cinco tarjetas en el orden en que se dicen (90–450 ms) con la
 * entrada de la casa; las dos fotos se asientan dentro de su tarjeta con la misma curva y duración. El aforo no se
 * anima. Sin JS, impresa o con movimiento reducido, todo está en su sitio desde el HTML.
 */

export function Sumar() {
  return (
    <section data-layout="sumar" className={`${base.pantalla} ${estilos.pantalla}`}>
      <Fondo src="/fortaleza/tienda-taza.jpg" velo="total" posicion="center 55%" />
      <Luz />
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <header className={base.cabecera}>
          <h2 className={`${base.titulo} ${base.aparece}`} style={orden(0)}>
            Dónde podemos <span className={base.acento}>sumar</span>
          </h2>
        </header>

        <div className={`${base.cuerpo} ${estilos.cuerpo}`}>
          <div className={estilos.tablero}>
            <article
              className={`${base.vidrio} ${base.tarjeta} ${base.aparece} ${estilos.tarjeta} ${estilos.pantallas}`}
              style={orden(1)}
            >
              {/* LA PANTALLA ENCENDIDA: un poster LED dibujado, con el arte de Malinche y su halo. */}
              <figure className={estilos.vitrina}>
                <div className={`${estilos.totem} ${estilos.asienta}`}>
                  <div className={estilos.totemPantalla}>
                    <Image
                      src="/fortaleza/portada-elenco.jpg"
                      alt="Ilustración: una pantalla encendida con Malinche"
                      fill
                      sizes="20vw"
                      unoptimized
                      style={{ objectPosition: '50% 30%' }}
                    />
                    <Image
                      src={MARCAS.malinche.src}
                      alt=""
                      aria-hidden="true"
                      width={MARCAS.malinche.ancho}
                      height={MARCAS.malinche.alto}
                      unoptimized
                      className={estilos.totemLogo}
                    />
                  </div>
                </div>
                <figcaption className={estilos.rotulo}>Ilustración</figcaption>
              </figure>
              <h3 className={base.tarjetaTitulo}>Pantallas</h3>
              <p className={base.tarjetaTexto}>
                Las del lobby, la taquilla, las suites y el escenario pueden trabajar para Malinche.
              </p>
            </article>

            <Tarjeta titulo="Empresas" i={2} className={`${estilos.tarjeta} ${estilos.empresas}`}>
              Los paquetes que ya arma su equipo todavía no están a la vista de las empresas.
            </Tarjeta>
            <Tarjeta titulo="El venue" i={3} className={`${estilos.tarjeta} ${estilos.venue}`}>
              Una presentación comercial que venda todo lo que ya tiene.
            </Tarjeta>
            <Tarjeta titulo="Lunes a miércoles" i={4} className={`${estilos.tarjeta} ${estilos.semana}`}>
              No hay función: el recinto puede recibir otros públicos.
            </Tarjeta>

            <article
              className={`${base.vidrio} ${base.tarjeta} ${base.aparece} ${estilos.tarjeta} ${estilos.pelota}`}
              style={orden(5)}
            >
              <Foto
                src="/fortaleza/pelota-comedor.jpg"
                alt="Una mesa servida en Pelota Mestiza"
                posicion="50% 62%"
                className={`${estilos.mesa} ${estilos.asienta}`}
              />
              <h3 className={base.tarjetaTitulo}>Pelota Mestiza</h3>
              <p className={base.tarjetaTexto}>Tiene lugar para más mesas.</p>
            </article>

            {/* EL AFORO, en la celda de abajo a la derecha: la mitad vacía en contorno, el lugar que hay para sumar. */}
            <Aforo tam="chico" frentes={0} contorno rotulo="Hoy, la mitad" className={estilos.aforo} />
          </div>
        </div>
      </Escena>
    </section>
  )
}
