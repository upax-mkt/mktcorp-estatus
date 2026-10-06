import base from '../base.module.css'
import estilos from './Plan.module.css'
import { Escena } from '../../politico/Escena'
import { orden, Punto } from '../comun'

/**
 * 9 · NOVENTA DÍAS PARA PROBARLO (verbo: acumular; morado sólido, sin degradado).
 *
 * Protagonista: el calendario. La línea se dibuja de izquierda a derecha y el
 * cliente (el punto) va en su punta: recorre del primer hito al último con la
 * misma curva y duración que el trazo (var(--mov-ease-in-out), 900 ms desde
 * 180 ms: quieto a 1080 ms). Los textos cuelgan de cada hito y entran conforme
 * el punto se acerca (180, 360, 450 y 540 ms: lento al salir, como el punto).
 *
 * Su posición por defecto —sin JS, impreso y con movimiento reducido— es el
 * último hito. El viaje solo existe en pantalla ancha (≥ 900 px); al apilarse,
 * el punto brota en su sitio.
 */
const HITOS = [
  {
    cuando: 'Semanas 1 y 2',
    tareas: ['Anunciar a la PM y a la ejecutiva', 'Pedir el SDR que reemplace a Eli', 'Cuotas y comisiones a Capital Humano'],
    i: 2,
  },
  {
    cuando: 'Primer mes',
    tareas: ['Tarifario y calculadora', 'Toda propuesta presentada en persona', 'Tablero semanal arriba'],
    i: 4,
  },
  {
    cuando: 'Fin de noviembre',
    tareas: ['Primera revisión del piloto'],
    i: 5,
  },
  {
    cuando: 'Mediados de enero',
    tareas: ['Decisión sobre la estructura y la ejecutiva, con los datos del piloto'],
    i: 6,
  },
]

export function Plan() {
  return (
    <section data-layout="plan" className={`${base.pantalla} ${base.morado}`}>
      <Escena className={base.escena}>
        <header className={base.cabecera}>
          <p className={`${base.antetitulo} ${base.aparece}`} style={orden(0)}>
            Siguientes pasos
          </p>
          <h2 className={`${base.titulo} ${base.aparece}`} style={orden(1)}>
            Noventa días para probarlo
          </h2>
        </header>

        <div className={base.cuerpo}>
          <div className={estilos.calendario}>
            {/* La línea va del primer hito (0 %) al último (75 %): la retícula es de cuatro columnas sin hueco. */}
            <svg className={estilos.via} viewBox="0 0 1000 24" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              <path className={estilos.carril} d="M0 12H750" />
              <path className={`${base.trazo} ${estilos.recorrido}`} d="M0 12H750" pathLength={1} style={orden(2)} />
            </svg>

            <ol className={estilos.hitos}>
              {HITOS.map((hito, n) => (
                <li key={hito.cuando} className={estilos.hito}>
                  <span className={`${estilos.marca} ${base.brota}`} style={orden(hito.i)} aria-hidden="true" />
                  {n === HITOS.length - 1 ? (
                    <span className={estilos.viajero} style={orden(2)} aria-hidden="true">
                      <Punto tam={18} className={`${base.brota} ${estilos.cliente}`} style={orden(2)} />
                    </span>
                  ) : null}
                  <div className={`${estilos.texto} ${base.aparece}`} style={orden(hito.i)}>
                    <h3 className={estilos.cuando}>{hito.cuando}</h3>
                    <ul className={estilos.tareas}>
                      {hito.tareas.map((tarea) => (
                        <li key={tarea}>{tarea}</li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Escena>
    </section>
  )
}
