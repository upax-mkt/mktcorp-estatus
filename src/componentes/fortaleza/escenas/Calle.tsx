import type { CSSProperties } from 'react'
import base from '../base.module.css'
import estilos from './Calle.module.css'
import { Escena } from '../../politico/Escena'
import { Aforo } from '../Aforo'
import { Foto, Luz, Propuesta, orden } from '../comun'

/**
 * 9 · CALLE — Frente 1 · «Que la ciudad lo vea»: Marketing United y Marketing Corporativo (20-oct-2026,
 * motion-studio; ronda 3).
 *
 * Lo que lleva Malinche a donde está la gente. A la izquierda, bajo la cabecera del frente, las dos propuestas con el
 * bloque común (`Propuesta`): Marketing United (su logo, su frase y sus tres acciones) y, tras un filo, Marketing
 * Corporativo (escrito, sin frase, con su acción: Prensa). A la derecha, desde la línea del antetítulo y hasta antes
 * del aforo, la foto de la calle (`FOTO`). Composición distinta de la 8 (la imagen grande, a sangre, a la izquierda).
 *
 * MOVIMIENTO (ms desde que la escena entra; quieta en 680). La cabecera no entra: es la de la 7, en el mismo lugar, y
 * en el corte se queda quieta. Lo nuevo entra como entra la casa, subir 20 px con fundido, en el orden en que se dice:
 * Marketing United 0 · su foto 90 · Marketing Corporativo 180 (cada uno, 500 ms). El aforo está quieto desde el primer
 * cuadro: el tramo del frente 1 se encendió en la 7.
 * Sin JS, impresa o con movimiento reducido, todo está en su estado final desde el HTML.
 */

/**
 * LA FOTO DE LA CALLE. Hoy es una foto real (sin marca) de gente que camina por un acceso público
 * (`poster-led-acceso.jpg`), recortada a lo que camina: fuera el anuncio ajeno del poster LED y los dos empleados de
 * cara pixelada. Cuando lleguen las fotos del stand de Malinche (de Jaime), aquí se cambian `src`, `alt`,
 * `proporcion` (ancho entre alto de la foto, o del recorte que se quiera) y `posicion`: el marco toma esa proporción y
 * cabe igual una foto horizontal que una vertical (ver `.marco` en `Calle.module.css`).
 */
const FOTO = {
  src: '/fortaleza/poster-led-acceso.jpg',
  alt: 'Gente que camina por un acceso público de la ciudad.',
  proporcion: 0.62,
  posicion: '97% 50%',
} as const

export function Calle() {
  return (
    <section data-layout="calle" className={base.pantalla}>
      <Luz />
      <Escena className={base.escena}>
        <div className={estilos.composicion}>
          {/* Sin entrada: es la misma cabecera de la 7, en el mismo lugar. En el corte se queda quieta. */}
          <header className={`${base.cabecera} ${estilos.cabecera}`}>
            <p className={base.antetitulo}>Frente 1</p>
            <h2 className={`${base.titulo} ${estilos.titulo}`}>Que la ciudad lo vea</h2>
          </header>

          <div className={estilos.texto}>
            <Propuesta
              unidades={['marketing-united']}
              frase="Llevamos Malinche a donde está la gente."
              i={0}
              acciones={[
                {
                  titulo: 'Un stand itinerante',
                  texto:
                    'Con pantallas y personajes, vende boletos en corporativos, escuelas y plazas. Ya montamos uno de Malinche en la fiesta de cumpleaños de Ricardo Salinas.',
                },
                { titulo: 'Flyers en la calle', texto: 'En autos y motos de conductores de apps.' },
                {
                  titulo: 'Visitantes y turistas',
                  texto:
                    'Embajadas, concierges de hoteles, agencias de viaje y rutas de Turibus que terminan en el Frontón.',
                },
              ]}
            />
            <Propuesta
              unidades={['marketing-corporativo']}
              i={2}
              className={estilos.corporativo}
              acciones={[
                {
                  titulo: 'Prensa',
                  texto: 'Editores que publican a UPAX, invitados a ver Malinche, y difusión del altar de muertos.',
                },
              ]}
            />
          </div>

          <Foto
            src={FOTO.src}
            alt={FOTO.alt}
            posicion={FOTO.posicion}
            className={`${estilos.marco} ${base.aparece}`}
            style={{ ...orden(1), '--proporcion': FOTO.proporcion } as CSSProperties}
          />
        </div>

        <Aforo tam="chico" frentes={1} rotulo="Frente 1 de 5" className={base.aforoEsquina} />
      </Escena>
    </section>
  )
}
