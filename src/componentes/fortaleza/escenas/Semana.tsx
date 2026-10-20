import Image from 'next/image'
import base from '../base.module.css'
import estilos from './Semana.module.css'
import { Escena } from '../../politico/Escena'
import { orden, Luz, Fondo, MARCAS } from '../comun'
import { Aforo } from '../Aforo'

/**
 * 10 · SEMANA — Frente 3, primera pantalla · «Que lo usen toda la semana» (ronda 2, 20-oct-2026: la vieja escena 9 no
 * cabía a tamaño de proyección y se partió; las cinco tarjetas pasaron a `Usos`). Aquí solo la semana, grande.
 *
 * Siete columnas, una por día, y tres filas. Arriba, los días con su luz, el mismo código del aforo: encendido =
 * ocupado; de jueves a domingo, la luz tenue de lo que ya hay (como la mitad de hoy en el aforo) y de lunes a
 * miércoles, la luz clara de lo que suma este frente (como su tramo). En medio, bajo sus días: lunes a miércoles, los
 * usos en lista vertical (las palabras del guion, una por renglón) y jueves a domingo, Malinche bajo su haz de luz.
 * Abajo, las cenas a cuatro manos, con la foto exactamente en la columna del miércoles. La esquina de abajo a la
 * derecha es del aforo. De fondo, el flamenco de Malinche, con velo.
 *
 * Tapando los textos se sigue viendo el argumento: los siete días quedan encendidos y lo nuevo brilla más.
 *
 * Movimiento (escalón corto de la casa, 60 ms; quieta a los 1185 ms): antetítulo 0 · título 60 · los días y Malinche
 * (la semana de hoy) 120 · lunes a miércoles 180, y sus luces se encienden con él: lunes 180, martes 240 y miércoles
 * 300 (420 ms, la duración rápida), con las cenas del miércoles · todo aterrizado a los ~550 · pausa · AL FINAL, SOLO,
 * el aforo enciende el tramo 3 de 720 a 1185. Estado final = estado por defecto.
 */

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const
/** Lunes, martes y miércoles: lo que la propuesta suma. */
const NUEVOS = 3

/** Los usos de lunes a miércoles: las palabras del guion, ahora una por renglón. */
const USOS = [
  'Transmisiones con patrocinador',
  'escuelas de música y de arte dramático',
  'cine',
  'catas',
  'noches prehispánicas',
] as const

/** El tramo 3 se enciende cuando terminó de encenderse la luz del miércoles (300 + 420 ms). */
const TRAMO_RETARDO = 720

export function Semana() {
  return (
    <section data-layout="semana" className={base.pantalla}>
      <Fondo src="/fortaleza/flamenco.jpg" alt="El flamenco de Malinche, en escena." velo="total" posicion="50% 35%" />
      <div className={estilos.sombra} aria-hidden="true" />
      <Luz />
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <header className={base.cabecera}>
          <p className={`${base.antetitulo} ${base.aparece}`} style={orden(0)}>
            Frente 3
          </p>
          <h2 className={`${base.titulo} ${estilos.titulo} ${base.aparece}`} style={orden(1)}>
            Que lo usen toda la semana
          </h2>
        </header>

        <div className={estilos.semana}>
          {/* El eje: los siete días con su luz. Para el lector de pantalla, cada bloque dice sus días. */}
          <ol className={`${estilos.dias} ${base.aparece}`} style={orden(2)} aria-hidden="true">
            {DIAS.map((dia, n) => (
              <li key={dia} className={estilos.dia} data-nuevo={n < NUEVOS ? 'true' : undefined}>
                <span className={estilos.diaNombre}>{dia}</span>
                <span className={estilos.luz} style={n < NUEVOS ? orden(3 + n) : undefined} />
              </li>
            ))}
          </ol>

          {/* Lunes a miércoles: lo que suma la propuesta. */}
          <div className={`${base.vidrio} ${estilos.lunMie} ${base.aparece}`} style={orden(3)}>
            <h3 className={estilos.cuando}>Lun a Mié</h3>
            <ul className={estilos.usos}>
              {USOS.map((uso) => (
                <li key={uso} className={estilos.uso}>
                  {uso}
                </li>
              ))}
            </ul>
          </div>

          {/* Jueves a domingo: lo que ya hay. */}
          <div className={`${estilos.jueDom} ${base.aparece}`} style={orden(2)}>
            <h3 className={estilos.cuando}>Jue a Dom</h3>
            <span className={estilos.haz} aria-hidden="true" />
            <Image
              src={MARCAS.malinche.src}
              alt={MARCAS.malinche.nombre}
              width={MARCAS.malinche.ancho}
              height={MARCAS.malinche.alto}
              unoptimized
              className={estilos.malinche}
            />
          </div>

          {/* El miércoles: las cenas, con la foto en su columna. Entran con la luz del miércoles. */}
          <div className={`${base.vidrio} ${estilos.cenas} ${base.aparece}`} style={orden(5)}>
            <div className={estilos.cenasTexto}>
              <h3 className={estilos.cenasDia}>Mié</h3>
              <p className={estilos.cenasFrase}>Cenas a cuatro manos con nuestros clientes</p>
            </div>
            <div className={estilos.cenasFoto}>
              <Image
                src="/fortaleza/pelota-fuego.jpg"
                alt="Fuego en la cocina de Pelota Mestiza."
                fill
                sizes="(max-width: 760px) 90vw, 16vw"
                unoptimized
                style={{ objectPosition: '50% 30%' }}
              />
            </div>
          </div>
        </div>

        <Aforo
          tam="chico"
          frentes={3}
          enciende={3}
          retardo={TRAMO_RETARDO}
          rotulo="Frente 3 de 5"
          className={base.aforoEsquina}
        />
      </Escena>
    </section>
  )
}
