import base from '../base.module.css'
import estilos from './Plan.module.css'
import { Escena } from '../../politico/Escena'
import { LOGOS, Luz, orden } from '../comun'
import { PLAN, type Paso } from '../contenido'

/**
 * EL PLAN DE ACCIÓN (ronda 5, 21-oct-2026), por tiempo: esta semana, noviembre, diciembre y el cierre de temporada
 * (30 de enero); aparte, lo que es para la siguiente temporada. Es la ruta que Ceci aprobó el 20-oct («está bueno»)
 * con quién hace cada cosa, y responde a lo que pidieron en la sala: «un plan de acción rápido», «más sencillo».
 */
function Quien({ paso }: { paso: Paso }) {
  return <span className={estilos.quien}>{paso.quien.map((u) => LOGOS[u].nombre).join(' · ')}</span>
}

export function Plan() {
  return (
    <section data-layout="plan" aria-labelledby="plan-titulo" className={base.pantalla}>
      <Luz />
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <header className={base.cabecera}>
          <p className={`${base.antetitulo} ${base.aparece}`} style={orden(0)}>
            El plan de acción
          </p>
          <h2 id="plan-titulo" className={`${base.titulo} ${estilos.titulo} ${base.aparece}`} style={orden(1)}>
            Qué pasa y cuándo
          </h2>
          <p className={`${base.nota} ${estilos.nota} ${base.aparece}`} style={orden(2)}>
            La temporada cierra el <span className={base.acento}>30 de enero</span>. Lo que es para la siguiente va aparte.
          </p>
        </header>

        <ol className={estilos.columnas}>
          {PLAN.columnas.map((c, i) => (
            <li key={c.cuando} className={`${base.vidrio} ${estilos.columna} ${base.aparece}`} style={orden(3 + i)}>
              <h3 className={estilos.cuando}>{c.cuando}</h3>
              <p className={estilos.etapa}>{c.etapa}</p>
              <ul className={estilos.pasos}>
                {c.pasos.map((p) => (
                  <li key={p.que} className={estilos.paso} data-conseguido={p.conseguido ? 'true' : undefined}>
                    <span className={estilos.que}>
                      {p.conseguido ? <span className={estilos.ya}>Ya corre</span> : null}
                      {p.que}
                    </span>
                    <Quien paso={p} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <div className={`${estilos.siguiente} ${base.aparece}`} style={orden(7)}>
          <p className={estilos.siguienteRotulo}>Para la siguiente temporada</p>
          <ul className={estilos.siguientePasos}>
            {PLAN.siguiente.map((p) => (
              <li key={p.que}>
                <span className={estilos.que}>{p.que}</span>
                <Quien paso={p} />
              </li>
            ))}
          </ul>
        </div>
      </Escena>
    </section>
  )
}
