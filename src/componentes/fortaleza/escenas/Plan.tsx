import base from '../base.module.css'
import estilos from './Plan.module.css'
import { Escena } from '../../politico/Escena'
import { Luz, orden } from '../comun'
import { PLAN } from '../contenido'

/**
 * 6 · EL PLAN (ronda 4, 21-oct-2026). La ruta de octubre a enero, que Ceci aprobó el 20-oct («está bueno»), ahora con
 * quién hace cada cosa: se lee como una tabla, mes por mes, y cierra en el fin de la temporada.
 */
export function Plan() {
  return (
    <section data-layout="plan" aria-labelledby="plan-titulo" className={base.pantalla}>
      <Luz />
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <header className={base.cabecera}>
          <p className={`${base.antetitulo} ${base.aparece}`} style={orden(0)}>
            El plan
          </p>
          <h2 id="plan-titulo" className={`${base.titulo} ${estilos.titulo} ${base.aparece}`} style={orden(1)}>
            De octubre a enero
          </h2>
          <p className={`${base.nota} ${estilos.nota} ${base.aparece}`} style={orden(2)}>
            La temporada cierra el <span className={base.acento}>30 de enero</span>. Las fiestas de fin de año se venden
            desde noviembre.
          </p>
        </header>

        <ol className={estilos.meses}>
          {PLAN.map((m, i) => (
            <li key={m.mes} className={`${base.vidrio} ${estilos.mes} ${base.aparece}`} style={orden(3 + i)}>
              <h3 className={estilos.mesNombre}>{m.mes}</h3>
              <p className={estilos.etapa}>{m.etapa}</p>
              <ul className={estilos.pasos}>
                {m.pasos.map((p) => (
                  <li key={p.que} className={estilos.paso}>
                    <span className={estilos.que}>{p.que}</span>
                    <span className={estilos.quien}>{p.quien}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Escena>
    </section>
  )
}
