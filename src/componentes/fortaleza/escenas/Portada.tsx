import Image from 'next/image'
import base from '../base.module.css'
import estilos from './Portada.module.css'
import { Escena } from '../../politico/Escena'
import { Luz, Fondo, MARCAS } from '../comun'

/**
 * 1 · PORTADA. «Fortaleza Mexicana.» Ronda 4 (21-oct-2026): Ceci, «Fortaleza Mexicana es el bastión»; la pieza dice
 * de quién es y qué trae (lo que descubrimos y cómo podemos ayudar), sin el aforo ni el «lo queremos lleno».
 *
 * A la derecha, los tres protagonistas de Malinche, enteros: la foto va en su proporción (16:9, sin recorte) y se
 * funde con la noche por arriba y por la izquierda. A la izquierda, sobre la noche, el logo, el título, la nota y,
 * debajo, sus tres marcas.
 *
 * Ronda 2 (20-oct-2026): ninguna letra cae sobre una cara, en pantalla ni en el PDF. Con la foto a sangre no se
 * podía: a 16:9 las tres caras cruzan todo el ancho, y la del hombre de la izquierda quedaba entre el logo y el
 * antetítulo. Ahora la geometría del elenco sale de la misma unidad que el texto (Portada.module.css), así que las
 * caras quedan fuera de la columna de texto en cualquier pantalla y en la hoja impresa.
 *
 * Movimiento: ninguno. Una portada se muestra entera (motion-studio 04 §8).
 */
export function Portada() {
  return (
    <section data-layout="portada" className={`${base.pantalla} ${estilos.pantalla}`}>
      <div className={estilos.elenco}>
        <Fondo src="/fortaleza/portada-elenco.jpg" velo="abajo" preload />
      </div>
      <Luz />
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <Image
          src="/logos/grupo-upax-blanco.png"
          alt="Grupo UPAX"
          width={639}
          height={164}
          preload
          unoptimized
          className={estilos.logo}
        />
        <div className={estilos.centro}>
          <header className={`${base.cabecera} ${estilos.cabecera}`}>
            <p className={base.antetitulo}>Grupo UPAX · octubre de 2026</p>
            <h1 className={`${base.titulo} ${estilos.titulo}`}>
              Fortaleza <span className={estilos.renglon}>Mexicana</span>
            </h1>
            <p className={`${base.nota} ${estilos.nota}`}>
              Lo que descubrimos y cómo podemos ayudar a Malinche, el Frontón México y Pelota Mestiza.
            </p>
          </header>
        </div>
        <ul className={estilos.marcas} aria-label="Sus marcas">
          <li>
            <Image src={MARCAS.malinche.src} alt={MARCAS.malinche.nombre} width={MARCAS.malinche.ancho} height={MARCAS.malinche.alto} unoptimized className={estilos.malinche} />
          </li>
          <li>
            <Image src={MARCAS.fronton.src} alt={MARCAS.fronton.nombre} width={MARCAS.fronton.ancho} height={MARCAS.fronton.alto} unoptimized className={estilos.fronton} />
          </li>
          <li>
            <Image src={MARCAS.pelota.src} alt={MARCAS.pelota.nombre} width={MARCAS.pelota.ancho} height={MARCAS.pelota.alto} unoptimized className={estilos.pelota} />
          </li>
        </ul>
      </Escena>
    </section>
  )
}
