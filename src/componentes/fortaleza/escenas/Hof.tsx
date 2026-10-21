import base from '../base.module.css'
import estilos from './Hof.module.css'
import { Escena } from '../../politico/Escena'
import { Aforo } from '../Aforo'
import { Foto, Luz, Propuesta, orden } from '../comun'

/**
 * 8 · HOUSE OF FILMS — Frente 1 · «Que la ciudad lo vea» (20-oct-2026, motion-studio; ronda 3).
 *
 * La pantalla de cine del frente: una sola imagen grande, en 16:9, que sale a sangre por la izquierda (el rodaje en
 * el escenario del Frontón, `hof-rodaje.jpg`, rotulada «Ilustración»), y a su derecha la propuesta de House of Films
 * con el bloque común (`Propuesta`): su logo, qué hace en una frase y sus tres acciones. La imagen es PROVISIONAL: se
 * va a generar el rodaje y se reemplaza el archivo con el mismo nombre; el marco ya es 16:9 y la foto va centrada,
 * así que la nueva entra sin tocar nada. Composición distinta de la 7 (propuesta a la izquierda y mosaico a la
 * derecha) y de la 9 (dos propuestas y una foto a la derecha).
 *
 * MOVIMIENTO (ms desde que la escena entra; quieta en 590). La cabecera no entra: es la de la 7, en el mismo lugar, y
 * en el corte se queda quieta. Lo nuevo entra como entra la casa, subir 20 px con fundido, en el orden en que se
 * dice: la propuesta 0 · la imagen 90 (cada una, 500 ms). El aforo está quieto desde el primer cuadro: el tramo del
 * frente 1 se encendió en la 7.
 * Sin JS, impresa o con movimiento reducido, todo está en su estado final desde el HTML.
 */
export function Hof() {
  return (
    <section data-layout="hof" className={base.pantalla}>
      <Luz />
      <Escena className={base.escena}>
        <div className={estilos.composicion}>
          {/* Sin entrada: es la misma cabecera de la 7, en el mismo lugar. En el corte se queda quieta. */}
          <header className={`${base.cabecera} ${estilos.cabecera}`}>
            <p className={base.antetitulo}>Frente 1</p>
            <h2 className={`${base.titulo} ${estilos.titulo}`}>Que la ciudad lo vea</h2>
          </header>

          <Propuesta
            unidades={['house-of-films']}
            frase="Producimos la publicidad audiovisual de Malinche y del Frontón."
            i={0}
            className={estilos.propuesta}
            acciones={[
              { titulo: 'El spot de Malinche', texto: 'Del guion a la producción.' },
              { titulo: 'El video del venue', texto: 'El Frontón y sus espacios, para ofrecerlos a empresas y eventos.' },
              {
                titulo: 'Contenido para las pantallas',
                texto: 'Lo que se ve en las pantallas que enciende Promo Espacio: lobby, suites y escenario.',
              },
            ]}
          />

          <Foto
            src="/fortaleza/hof-rodaje.jpg"
            alt="Ilustración: un rodaje en el escenario del Frontón."
            marca="Ilustración"
            className={`${estilos.rodaje} ${base.aparece}`}
            style={orden(1)}
          />
        </div>

        <Aforo tam="chico" frentes={1} rotulo="Frente 1 de 5" className={base.aforoEsquina} />
      </Escena>
    </section>
  )
}
