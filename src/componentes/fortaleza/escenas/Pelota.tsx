import base from '../base.module.css'
import estilos from './Pelota.module.css'
import { Escena } from '../../politico/Escena'
import { Aforo } from '../Aforo'
import { Foto, Luz, Propuesta, orden } from '../comun'

/**
 * 13 · PELOTA MESTIZA — Frente 3, «Que lo usen toda la semana» (ronda 3, 20-oct-2026: el restaurante tiene su propia
 * pantalla; antes era una acción más en la de las empresas).
 *
 * LA MESA PUESTA: a la izquierda, la propuesta de Marketing United (su logo, «Más motivos para cenar en Pelota
 * Mestiza.» y sus cuatro acciones); a la derecha, grande, la imagen de lo que se va a hacer: la cena de Le Petit
 * Malinche, con la historia de la obra proyectada sobre la mesa, rotulada «Ilustración». La imagen mide lo que mide la
 * propuesta (mismo borde de arriba, mismo de abajo) y llena el resto del ancho: una foto horizontal, casi 16:9 en las
 * tres pantallas de prueba (1.7 a 1.9). La esquina de abajo a la derecha es del aforo. Es la composición que no repiten
 * sus vecinas: la 12 es un programa a lo ancho, sin foto; la 14, el recorrido de compra.
 *
 * LA IMAGEN ES PROVISIONAL: `/fortaleza/pelota-le-petit-malinche.jpg` se reemplaza por la cena generada, con el mismo
 * nombre y en 16:9 horizontal. Va recortada con `cover`: no hace falta tocar el código.
 *
 * Sin acento naranja: la imagen ya trae la luz de la proyección.
 *
 * MOVIMIENTO (escalón de la casa, 90 ms; quieta a los 590 ms). La cabecera no entra: es la de la 11 y la 12, en el
 * mismo lugar, y en el corte se queda quieta. La propuesta sube a los 0 y la imagen a los 90, en el orden en que se
 * dicen (la última acción es la que muestra la imagen). El aforo no se mueve: su tramo se encendió en la 11. Solo
 * `.aparece` de la base; estado final = estado por defecto.
 */
export function Pelota() {
  return (
    <section data-layout="pelota" className={base.pantalla}>
      <div className={estilos.mesa} aria-hidden="true" />
      <Luz />
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <header className={base.cabecera}>
          {/* Sin entrada: es la misma cabecera de la 11 y la 12, en el mismo lugar. En el corte se queda quieta. */}
          <p className={base.antetitulo}>Frente 3</p>
          <h2 className={`${base.titulo} ${estilos.titulo}`}>Que lo usen toda la semana</h2>
        </header>

        <div className={estilos.cuerpo}>
          <Propuesta
            i={0}
            unidades={['marketing-united']}
            frase="Más motivos para cenar en Pelota Mestiza."
            acciones={[
              { titulo: 'Menús de temporada', texto: 'Como el mes de muertos y un mes negro.' },
              { titulo: 'Con la chef Lula', texto: 'Experiencias y escuelas de gastronomía.' },
              { titulo: 'Celebraciones', texto: 'Aniversarios y fin de año de empresas.' },
              { titulo: 'Le Petit Malinche', texto: 'Una cena con la historia de Malinche proyectada sobre la mesa.' },
            ]}
            className={estilos.propuesta}
          />
          <Foto
            src="/fortaleza/pelota-le-petit-malinche.jpg"
            alt="Ilustración: una cena con la historia de Malinche proyectada sobre la mesa."
            marca="Ilustración"
            className={`${estilos.imagen} ${base.aparece}`}
            style={orden(1)}
          />
        </div>

        <Aforo tam="chico" frentes={3} rotulo="Frente 3 de 5" className={base.aforoEsquina} />
      </Escena>
    </section>
  )
}
