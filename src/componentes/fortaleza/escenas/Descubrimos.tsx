import base from '../base.module.css'
import estilos from './Descubrimos.module.css'
import { Escena } from '../../politico/Escena'
import { LOGOS, Luz, orden } from '../comun'
import { DOLORES } from '../contenido'

/**
 * 2 Y 3 · LO QUE DESCUBRIMOS (ronda 4, 21-oct-2026). Lo primero que pidió Ceci: el dolor, dicho con todas sus
 * letras, porque «si no conoces el antecedente y el dolor, no sabes qué arreglar» y la Sra. María Laura no sabe lo que
 * pasa adentro. Ocho hallazgos en dos pantallas de cuatro (a tamaño de proyección no caben ocho en una: la escena se
 * parte, no se achica). Cada uno dice qué unidad lo atiende, para que el dibujo de «Cómo podemos ayudar» se lea
 * como respuesta.
 *
 * Sin cifras de butacas vacías (regla del guion que aprobó Franco el 20-oct): el dolor se dice por sus causas.
 */
export function Descubrimos({ parte }: { parte: 1 | 2 }) {
  const dolores = DOLORES.slice((parte - 1) * 4, parte * 4)
  return (
    <section
      data-layout={`descubrimos-${parte}`}
      aria-labelledby={`descubrimos-${parte}-titulo`}
      className={base.pantalla}
    >
      <Luz />
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <header className={base.cabecera}>
          <p className={`${base.antetitulo} ${base.aparece}`} style={orden(0)}>
            Lo que descubrimos · {parte} de 2
          </p>
          {parte === 1 ? (
            <>
              <h2 id="descubrimos-1-titulo" className={`${base.titulo} ${estilos.titulo} ${base.aparece}`} style={orden(1)}>
                Lo que puede mejorar
              </h2>
              <p className={`${base.nota} ${estilos.nota} ${base.aparece}`} style={orden(2)}>
                Recorrimos el Frontón, escuchamos a su equipo y revisamos cómo se vende hoy. Esto encontramos:
              </p>
            </>
          ) : (
            <h2 id="descubrimos-2-titulo" className={`${base.titulo} ${estilos.titulo} ${base.aparece}`} style={orden(1)}>
              Lo que también encontramos
            </h2>
          )}
        </header>

        <ol className={estilos.dolores} start={dolores[0].n}>
          {dolores.map((d, i) => (
            <li key={d.n} className={`${base.vidrio} ${estilos.dolor} ${base.aparece}`} style={orden(3 + i)}>
              <span className={estilos.numero} aria-hidden="true">
                {d.n}
              </span>
              <div className={estilos.texto}>
                <h3 className={estilos.dolorTitulo}>{d.titulo}</h3>
                <p className={estilos.dolorTexto}>{d.texto}</p>
                <p className={estilos.atienden}>
                  <span className={estilos.atiendenRotulo}>Lo atiende{d.atienden.length > 1 ? 'n' : ''}:</span>{' '}
                  {d.atienden.map((u) => LOGOS[u].nombre).join(' · ')}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Escena>
    </section>
  )
}
