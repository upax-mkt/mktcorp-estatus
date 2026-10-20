import Image from 'next/image'
import base from '../base.module.css'
import estilos from './Cierre.module.css'
import { Escena } from '../../politico/Escena'
import { Luz } from '../comun'

/**
 * 16 · CIERRE — la petición, después de la cumbre (ronda 2, 20-oct-2026).
 *
 * Lámina tranquila (motion-studio 04 §8): se muestra entera, sin animar; solo el corte de la casa la trae. Es la misma
 * foto del teatro lleno, con el mismo encuadre que el cuadro final de la cumbre y más velo: la foto se sostiene, no se
 * repite. Arriba a la izquierda, donde estaba el título, la propuesta y los alcances; debajo de un filo naranja (el
 * único acento: el color de las butacas llenas), la pregunta, en grande: es lo que se le pide contestar. El dibujo
 * del aforo ya no regresa.
 *
 * La pregunta es el titular de la lámina (h2): así la nombra también el navegador de láminas del modo presentar.
 */
export function Cierre() {
  return (
    <section data-layout="cierre" className={`${base.pantalla} ${estilos.pantalla}`}>
      <div className={estilos.foto} aria-hidden="true">
        <Image src="/fortaleza/teatro-lleno.jpg" alt="" fill sizes="100vw" unoptimized />
      </div>
      <div className={estilos.velo} aria-hidden="true" />
      <Luz />
      {/* Escena sin nada que animar: la lámina llega entera. Marca data-visible como las demás. */}
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <div className={estilos.peticion}>
          <p className={estilos.propuesta}>Con su visto bueno, empezamos por las pantallas.</p>
          <p className={estilos.alcances}>Los alcances de cada frente los cerramos con Eucario.</p>
        </div>
        <span className={estilos.filo} aria-hidden="true" />
        <h2 className={estilos.pregunta}>
          <span className={estilos.preguntaInicio}>¿Qué llenamos primero:</span> las butacas de diciembre, las mesas de
          los miércoles o la agenda del venue?
        </h2>
      </Escena>
    </section>
  )
}
