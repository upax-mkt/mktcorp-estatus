import Image from 'next/image'
import base from '../base.module.css'
import estilos from './Decisiones.module.css'
import { Escena } from '../../politico/Escena'
import { orden, Punto, Luz } from '../comun'

/**
 * 10 · EL CIERRE. Tres decisiones para hoy.
 *
 * El cliente vuelve al centro: el punto, arriba y al medio, y de él baja una
 * línea fina que se abre en tres ramas, una por decisión. Tapando los textos
 * se sigue viendo el argumento: las tres decisiones cuelgan del cliente.
 *
 * Movimiento (quieta en ≤ 1200 ms): antetítulo y título suben (0–590 ms), el
 * punto brota (180 ms), la línea se traza hacia abajo (270–870 ms) y las tres
 * decisiones suben en orden a medida que la línea llega (495, 585 y 675 ms).
 */
const DECISIONES = [
  { verbo: 'Aprobar', resto: 'la estructura, los roles y el journey.' },
  { verbo: 'Nombrar', resto: 'a Rocío Cervantes como PM y arrancar el piloto de Eli.' },
  { verbo: 'Mandar', resto: 'a Capital Humano los descriptivos y las comisiones con estas reglas.' },
]

/* Salen del punto (600, 0) y llegan verticales al centro de cada columna (1/6, 1/2, 5/6). */
const RAMAS = [
  'M600 0 V22 C600 82 200 58 200 130',
  'M600 0 V130',
  'M600 0 V22 C600 82 1000 58 1000 130',
]

export function Decisiones() {
  return (
    <section data-layout="decisiones" className={`${base.pantalla} ${base.noche}`}>
      <Luz />
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <header className={`${base.cabecera} ${estilos.cabecera}`}>
          <p className={`${base.antetitulo} ${base.aparece}`} style={orden(0)}>
            Lo que necesitamos de ustedes
          </p>
          <h2 className={`${base.titulo} ${estilos.titulo} ${base.aparece}`} style={orden(1)}>
            Tres decisiones para hoy
          </h2>
        </header>
        <div className={`${base.cuerpo} ${estilos.cuerpo}`}>
          <div className={estilos.mapa}>
            <div className={estilos.origen}>
              <Punto tam={28} className={base.brota} style={orden(2)} />
            </div>
            <svg className={estilos.ramas} viewBox="0 0 1200 130" aria-hidden="true" focusable="false">
              {RAMAS.map((d) => (
                <path key={d} d={d} pathLength={1} className={base.trazo} style={orden(3)} />
              ))}
            </svg>
            <ol className={estilos.decisiones}>
              {DECISIONES.map((decision, i) => (
                <li key={decision.verbo} className={`${estilos.decision} ${base.aparece}`} style={orden(5.5 + i)}>
                  <span className={estilos.numero}>{i + 1}</span>
                  <p className={estilos.texto}>
                    <strong>{decision.verbo}</strong> {decision.resto}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Escena>
      <Image
        src="/logos/research-land-blanco.png"
        alt="Research Land"
        width={1121}
        height={164}
        className={estilos.logo}
      />
    </section>
  )
}
