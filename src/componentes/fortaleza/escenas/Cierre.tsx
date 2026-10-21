import Image from 'next/image'
import base from '../base.module.css'
import estilos from './Cierre.module.css'
import { Escena } from '../../politico/Escena'
import { Luz } from '../comun'

/**
 * 7 · CIERRE (ronda 4, 21-oct-2026). Lo que dijo Ceci, dicho como Grupo UPAX: «mi trabajo es ofrecerte todas estas
 * herramientas para que sí tengas un lleno total». El lleno es la meta de ellos; lo nuestro son las herramientas. Debajo
 * de un filo naranja, el primer paso y quién cierra los detalles.
 *
 * Lámina tranquila (motion-studio 04 §8): se muestra entera, sin animar. De fondo, el teatro con la pantalla lateral
 * encendida con Malinche (simulación sobre la foto real): el primer paso que se propone. La frase es el titular de la
 * lámina (h2): así la nombra el navegador del modo presentar.
 */
export function Cierre() {
  return (
    <section data-layout="cierre" aria-labelledby="cierre-titulo" className={`${base.pantalla} ${estilos.pantalla}`}>
      <div className={estilos.foto} aria-hidden="true">
        <Image src="/fortaleza/teatro-lleno.jpg" alt="" fill sizes="100vw" unoptimized />
      </div>
      <div className={estilos.velo} aria-hidden="true" />
      <Luz />
      {/* Escena sin nada que animar: la lámina llega entera. Marca data-visible como las demás. */}
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <h2 id="cierre-titulo" className={estilos.frase}>
          Nuestro trabajo es darle a Fortaleza Mexicana todas estas herramientas para que tenga un lleno total.
        </h2>
        <span className={estilos.filo} aria-hidden="true" />
        <div className={estilos.peticion}>
          <p className={estilos.propuesta}>Con su visto bueno, empezamos por las pantallas.</p>
          <p className={estilos.alcances}>Los detalles de cada unidad los cerramos con Eucario y su equipo.</p>
        </div>
        <Image
          src="/logos/grupo-upax-blanco.png"
          alt="Grupo UPAX"
          width={639}
          height={164}
          unoptimized
          className={estilos.logo}
        />
      </Escena>
    </section>
  )
}
