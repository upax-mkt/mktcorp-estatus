import base from '../base.module.css'
import estilos from './Joya.module.css'
import { Escena } from '../../politico/Escena'
import { Aforo } from '../Aforo'
import { Fondo, Foto, Luz, orden } from '../comun'

/**
 * 3 · JOYA — «Una joya de la Ciudad de México» (guion técnico, 20-oct-2026).
 *
 * Una galería, no una lámina de datos. La fachada Art Déco entra a sangre por la derecha, a todo lo alto, y se funde
 * con la noche: es la joya en su vitrina. A la izquierda, en el orden en que se dice: el edificio, el teatro y sus
 * cinco espacios —fotos con su nombre y su capacidad, en personas, en una etiqueta de vidrio esmerilado sobre la propia
 * foto—, y la placa de Malinche, donde el 4.5 es el protagonista: la única cifra en naranja, con cinco estrellas que se
 * llenan hasta cuatro y media (el dibujo prueba la cifra). Cierra Fortaleza Mexicana.
 *
 * Ronda 2 (20-oct-2026): tamaños de proyección de la base; «personas» en las cinco capacidades; la columna de texto
 * termina antes de la fachada (su ancho y el arranque de la fachada salen de la misma medida, Joya.module.css).
 *
 * Movimiento (quieta a los 1180 ms): título y fachada a los 0 ms (la fachada se descubre de abajo hacia arriba con una
 * máscara, 900 ms, la duración lenta de la firma); el edificio (90), el teatro (180) y los cinco espacios (270–390)
 * suben con la entrada de la casa y sus fotos se asientan; la placa sube a los 450 y Fortaleza Mexicana a los 540.
 * Al final, solo: las estrellas se llenan de 880 a 1180 ms. El 4.5 aterriza el último y después nada se mueve.
 * El aforo no se anima. Sin JS, impresa o con movimiento reducido, todo está en su sitio desde el HTML.
 */

type Espacio = { nombre: string; cupo: string; src: string; posicion: string; alt: string }

const ESPACIOS: readonly Espacio[] = [
  { nombre: 'Templo Canalla', cupo: '300', src: '/fortaleza/lobby-templo-canalla.jpg', posicion: '60% 55%', alt: 'Interior de Templo Canalla' },
  { nombre: 'Pelota Mestiza', cupo: '75', src: '/fortaleza/pelota-mestiza-salon.jpg', posicion: '50% 62%', alt: 'Interior de Pelota Mestiza' },
  { nombre: 'Última Noche', cupo: '78', src: '/fortaleza/ultima-noche.jpg', posicion: '50% 60%', alt: 'Interior de Última Noche' },
  { nombre: 'Templo Mayor', cupo: '25', src: '/fortaleza/templo-mayor.jpg', posicion: '55% 60%', alt: 'Interior de Templo Mayor' },
  { nombre: 'Sala de Consejo', cupo: '16', src: '/fortaleza/sala-consejo.jpg', posicion: '50% 62%', alt: 'Interior de Sala de Consejo' },
]

/** Cinco estrellas de 24 unidades con 4 de aire. El relleno llega a la mitad de la quinta: x = 4 × 28 + 12 = 124. */
const PUNTAS: readonly [number, number][] = [
  [12, 1.5], [14.91, 9.1], [23.03, 9.52], [16.71, 14.63], [18.82, 22.48],
  [12, 18.05], [5.18, 22.48], [7.29, 14.63], [0.97, 9.52], [9.09, 9.1],
]
const ESTRELLAS = [0, 28, 56, 84, 112]
  .map((dx) => `M${PUNTAS.map(([x, y]) => `${Math.round((x + dx) * 100) / 100} ${y}`).join('L')}Z`)
  .join('')
const HASTA = 4 * 28 + 12

/** Las estrellas se llenan al final, solas: arrancan a los 880 ms (300 ms de trazo, ver Joya.module.css). */
const LLENAR_EN = 880

export function Joya() {
  return (
    <section data-layout="joya" className={`${base.pantalla} ${estilos.pantalla}`}>
      {/* LA JOYA EN SU VITRINA: la fachada, a sangre por la derecha. Se descubre al llegar (ver Joya.module.css). */}
      <div className={estilos.fachada} style={orden(0)}>
        <Fondo
          src="/fortaleza/fachada.jpg"
          alt="La fachada Art Déco del Frontón México"
          velo="abajo"
          posicion="50% 30%"
        />
      </div>
      <Luz />
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <div className={estilos.contenido}>
          <header className={base.cabecera}>
            <h2 className={`${base.titulo} ${estilos.titulo} ${base.aparece}`} style={orden(0)}>
              Una joya de la Ciudad de México
            </h2>
            <p className={`${base.nota} ${estilos.edificio} ${base.aparece}`} style={orden(1)}>
              Un edificio Art Déco frente al Monumento a la Revolución.
            </p>
          </header>

          <div className={estilos.cuerpo}>
            <p className={`${estilos.teatro} ${base.aparece}`} style={orden(2)}>
              Un teatro para <strong>1,100 personas</strong> y cinco espacios más.
            </p>

            <ul className={estilos.espacios}>
              {ESPACIOS.map((e, k) => (
                <li key={e.nombre} className={base.aparece} style={orden(3 + k / 3)}>
                  <Foto
                    src={e.src}
                    alt={e.alt}
                    posicion={e.posicion}
                    className={`${estilos.espacio} ${estilos.asienta}`}
                    pie={
                      <>
                        <span className={estilos.nombre}>{e.nombre}</span>{' '}
                        <span className={estilos.cupo}>
                          <span className={estilos.cifraCupo}>{e.cupo}</span>{' '}
                          <span className={estilos.unidad}>personas</span>
                        </span>
                      </>
                    }
                  />
                </li>
              ))}
            </ul>

            <div className={`${base.vidrio} ${estilos.placa} ${base.aparece}`} style={orden(5)}>
              <Foto
                src="/fortaleza/malinche-vertical.jpg"
                alt="Una escena de Malinche"
                posicion="50% 28%"
                className={`${estilos.obra} ${estilos.asienta}`}
              />
              <div className={estilos.calificacion}>
                <p className={estilos.frase}>
                  <span className={estilos.obraNombre}>Malinche:</span>{' '}
                  <span className={estilos.cifra}>4.5</span>{' '}
                  <span className={estilos.resto}>de 5 en más de 12,600 reseñas, y un público que la recomienda.</span>
                  <svg className={estilos.estrellas} viewBox="0 0 136 24" aria-hidden="true" focusable="false">
                    <defs>
                      <clipPath id="joya-estrellas">
                        <path d={ESTRELLAS} />
                      </clipPath>
                    </defs>
                    <path className={estilos.estrellasVacias} d={ESTRELLAS} />
                    <path
                      className={`${estilos.relleno} ${base.trazo}`}
                      d={`M0 12H${HASTA}`}
                      pathLength={1}
                      clipPath="url(#joya-estrellas)"
                      style={orden(LLENAR_EN / 90)}
                    />
                  </svg>
                </p>
                <p className={estilos.fuente}>Reseñas en Fever, al 20 de octubre de 2026</p>
              </div>
            </div>

            <p className={`${estilos.cierre} ${base.aparece}`} style={orden(6)}>
              Fortaleza Mexicana, que hace del Frontón un bastión cultural.
            </p>
          </div>
        </div>

        <Aforo tam="chico" frentes={0} rotulo="Hoy, la mitad" className={base.aforoEsquina} />
      </Escena>
    </section>
  )
}
