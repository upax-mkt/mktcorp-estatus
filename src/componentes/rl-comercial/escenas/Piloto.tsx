import base from '../base.module.css'
import estilos from './Piloto.module.css'
import { Escena } from '../../politico/Escena'
import { orden, Punto } from '../comun'

/**
 * 8 · EL PILOTO DE ELI (verbo: construir; superficie clara).
 *
 * Protagonista: la línea de 90 días. El cliente (el punto) marca el día 0 y la
 * línea sale de él hacia la derecha; los hitos suben en orden y las dos
 * columnas entran después. El filete entre columnas cae justo bajo el día 45:
 * a la izquierda, cómo arranca; a la derecha, cómo se decide.
 *
 * Tiempos: trazo a 180 ms (quieto a 1080 ms), hitos a 180/270/360 ms,
 * columnas a 450 y 540 ms. Todo quieto antes de 1200 ms.
 */
export function Piloto() {
  return (
    <section data-layout="piloto" className={`${base.pantalla} ${base.clara}`}>
      <Escena className={base.escena}>
        <header className={base.cabecera}>
          <p className={`${base.antetitulo} ${base.aparece}`} style={orden(0)}>
            Ejecutivo comercial
          </p>
          <h2 className={`${base.titulo} ${base.aparece}`} style={orden(1)}>
            Eli abre cuentas; el piloto dirá si también las cierra
          </h2>
        </header>

        <div className={base.cuerpo}>
          <div className={estilos.linea}>
            <svg
              className={estilos.trazado}
              viewBox="0 0 1000 24"
              preserveAspectRatio="none"
              aria-hidden="true"
              focusable="false"
            >
              <path className={estilos.carril} d="M0 12H1000" />
              <path className={`${base.trazo} ${estilos.recorrido}`} d="M0 12H1000" pathLength={1} style={orden(2)} />
            </svg>

            <ol className={estilos.hitos}>
              <li className={estilos.hito}>
                <p className={`${estilos.dia} ${base.aparece}`} style={orden(2)}>
                  Día 0
                </p>
                <span className={estilos.zona}>
                  <Punto tam={20} className={base.brota} style={orden(2)} />
                </span>
                <p className={`${estilos.que} ${base.aparece}`} style={orden(2)}>
                  Arranca en dupla con la PM
                </p>
              </li>
              <li className={estilos.hito}>
                <p className={`${estilos.dia} ${base.aparece}`} style={orden(3)}>
                  Día 45
                </p>
                <span className={estilos.zona}>
                  <span className={`${estilos.marca} ${base.brota}`} style={orden(3)} aria-hidden="true" />
                </span>
                <p className={`${estilos.que} ${base.aparece}`} style={orden(3)}>
                  Revisión a fin de noviembre
                </p>
              </li>
              <li className={estilos.hito}>
                <p className={`${estilos.dia} ${base.aparece}`} style={orden(4)}>
                  Día 90
                </p>
                <span className={estilos.zona}>
                  <span
                    className={`${estilos.marca} ${estilos.marcaFinal} ${base.brota}`}
                    style={orden(4)}
                    aria-hidden="true"
                  />
                </span>
                <p className={`${estilos.que} ${base.aparece}`} style={orden(4)}>
                  Mediados de enero: sigue o se para
                </p>
              </li>
            </ol>
          </div>

          <div className={estilos.columnas}>
            <div className={`${estilos.columna} ${base.aparece}`} style={orden(5)}>
              <h3 className={estilos.columnaTitulo}>Cómo arranca</h3>
              <ul className={estilos.lista}>
                <li>En dupla con la PM: la PM presenta, Eli lleva la relación y el cierre</li>
                <li>Se queda con los negocios que ella abrió</li>
                <li>Sigue prospectando una parte de su semana hasta que llegue quien la reemplace</li>
                <li>
                  Sin la cuota individual del plan durante el piloto: cuota compartida con la PM y comisión sobre lo
                  cobrado
                </li>
              </ul>
            </div>
            <span className={`${estilos.filete} ${base.aparece}`} style={orden(6)} aria-hidden="true" />
            <div className={`${estilos.columna} ${base.aparece}`} style={orden(6)}>
              <h3 className={estilos.columnaTitulo}>Cuándo sigue y cuándo se para</h3>
              <ul className={estilos.lista}>
                <li>
                  <strong>Sigue</strong> si a mediados de enero ganó al menos dos de sus negocios y presentó en persona
                  todas sus propuestas
                </li>
                <li>
                  <strong>Se para</strong> si no ganó ninguno y más de la mitad se perdió sin respuesta
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Escena>
    </section>
  )
}
