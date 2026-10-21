import type { CSSProperties } from 'react'
import base from '../base.module.css'
import estilos from './Ciudad.module.css'
import { Escena } from '../../politico/Escena'
import { Aforo } from '../Aforo'
import { Foto, Luz, Propuesta, orden } from '../comun'

/**
 * 7 · CIUDAD — Frente 1 · «Que la ciudad lo vea»: Promo Espacio (20-oct-2026, motion-studio; ronda 3).
 *
 * Franco: «no viene bien explicado la propuesta de cada UDN» y «no veo imágenes representativas de lo que queremos
 * hacer con ellos», sobre todo de Promo Espacio. Esta pantalla es de Promo Espacio sola y se cuenta con el bloque
 * común (`Propuesta`): su logo, qué hace en una frase y sus cuatro acciones, en el orden del guion (lobby, acceso,
 * suites y escenario, ciudad). A la derecha, lo que se va a ver: tres montajes sobre las fotos de Sergio, rotulados
 * «Simulación», cada uno con su pie. Arriba y a todo el ancho del mosaico, la protagonista: las pantallas de las barras
 * del lobby encendidas con Malinche (`pe-barra.jpg`); debajo, la de taquilla (`pe-taquilla.jpg`) y un poster LED de la
 * red con Malinche (`pe-poster.jpg`, recortado para que no entre la persona de la tienda de al lado). El aforo, debajo
 * del mosaico, en su esquina, enciende el tramo del frente 1. Las tarjetas de la ronda 2 se fueron: «Pantallas
 * encendidas» y «La red de Promo Espacio» son ahora acciones del bloque y la publicidad audiovisual es la pantalla 8.
 *
 * MOVIMIENTO (ms desde que la escena entra; quieta en 1186). El aforo NO entra: llega viajando del centro de la
 * escena 6 a esta esquina (transición de vista de `ModoPresentar`, 600 ms). Mientras viaja, lo demás solo se funde, sin
 * desplazarse (`base.conViaje`). Leída con scroll: antetítulo 0 · título 90 · la propuesta 180 · la barra 270 · la
 * taquilla 360 · el poster 450 (cada fundido, 500 ms). Al presentar, la propuesta y las tres fotos están en el camino
 * del aforo, que baja del centro a la esquina, y entran cuando aterriza (`base.esperaViaje`), en el mismo orden: 620,
 * 650, 680 y 710 (260 ms cada una). Su rótulo, que no viaja con el dibujo, se funde al aterrizar: 600–900. Al final,
 * solo, el tramo del frente 1 se enciende butaca por butaca: 750–1186 (30 butacas a 4 ms, 320 ms cada una).
 * Sin JS, impresa o con movimiento reducido, todo está en su estado final desde el HTML.
 */

/** Lo que espera al aforo: su lugar en la entrada de la casa (`i`) y en la que llega cuando aterriza (`j`). */
const espera = (i: number, j: number) => ({ ...orden(i), '--i-viaje': j }) as CSSProperties

export function Ciudad() {
  return (
    <section data-layout="ciudad" className={base.pantalla}>
      <Luz />
      <Escena className={`${base.escena} ${base.conViaje}`}>
        <div className={estilos.composicion}>
          {/* La cabecera del frente 1: la 8 y la 9 la repiten en el mismo lugar y sin entrada. */}
          <header className={`${base.cabecera} ${estilos.cabecera}`}>
            <p className={`${base.antetitulo} ${base.aparece}`} style={orden(0)}>
              Frente 1
            </p>
            <h2 className={`${base.titulo} ${estilos.titulo} ${base.aparece}`} style={orden(1)}>
              Que la ciudad lo vea
            </h2>
          </header>

          <Propuesta
            unidades={['promo-espacio']}
            frase="Encendemos las pantallas del Frontón y llevamos Malinche a las de la ciudad."
            i={2}
            className={`${estilos.propuesta} ${base.esperaViaje}`}
            style={{ '--i-viaje': 0 } as CSSProperties}
            acciones={[
              {
                titulo: 'En el lobby',
                texto:
                  'Las 10 pantallas de las barras y la de taquilla, conectadas a SIDI, la plataforma con la que programamos cada pantalla y vemos en tiempo real qué transmite.',
              },
              {
                titulo: 'En el acceso',
                texto: 'Posters LED de nuestro inventario, como punto de alto impacto a la entrada.',
              },
              {
                titulo: 'En suites y escenario',
                texto:
                  'Las pantallas de dentro y fuera de las suites y las laterales del escenario, para contenido y patrocinio en funciones y eventos.',
              },
              {
                titulo: 'En la ciudad',
                texto:
                  'Malinche, el Frontón y Pelota Mestiza en nuestra red, como las pantallas de sucursales de Banco Azteca, y en la de nuestros socios Forum, CETRAM y TeleUrban, con un mapa de visibilidad en vía pública.',
              },
            ]}
          />

          <div className={estilos.mosaico}>
            <Foto
              src="/fortaleza/pe-barra.jpg"
              alt="Simulación: las pantallas de las barras del lobby del Frontón, encendidas con Malinche."
              marca="Simulación"
              pie="Barras del lobby"
              className={`${estilos.barra} ${base.aparece} ${base.esperaViaje}`}
              style={espera(3, 1)}
            />
            <Foto
              src="/fortaleza/pe-taquilla.jpg"
              alt="Simulación: la pantalla de la taquilla del Frontón, encendida con Malinche."
              marca="Simulación"
              pie="Taquilla"
              className={`${estilos.taquilla} ${base.aparece} ${base.esperaViaje}`}
              style={espera(4, 2)}
            />
            <Foto
              src="/fortaleza/pe-poster.jpg"
              alt="Simulación: Malinche en un poster LED de la red de Promo Espacio."
              marca="Simulación"
              pie="Poster LED de nuestra red"
              posicion="100% 50%"
              className={`${estilos.poster} ${base.aparece} ${base.esperaViaje}`}
              style={espera(5, 3)}
            />
          </div>
        </div>

        <Aforo
          tam="chico"
          frentes={1}
          enciende={1}
          retardo={750}
          pasoButaca={4}
          rotulo="Frente 1 de 5"
          className={base.aforoEsquina}
        />
      </Escena>
    </section>
  )
}
