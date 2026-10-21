import base from '../base.module.css'
import estilos from './Descubrimos.module.css'
import { Escena } from '../../politico/Escena'
import { Foto, Luz, orden } from '../comun'
import { DOLORES, ROTULO } from '../contenido'

/**
 * 2 Y 3 · LO QUE HAY QUE ARREGLAR (rondas 4 y 5, 21-oct-2026). Lo primero que pidió Ceci: el dolor, dicho con todas
 * sus letras («María es como Ricardo: ¿qué tengo que arreglar?»), porque «si no conoces el antecedente y el dolor, no
 * sabes qué arreglar» y la Sra. María Laura no sabe lo que pasa adentro. Ocho hallazgos en dos pantallas de cuatro (a
 * tamaño de proyección no caben ocho en una: la escena se parte, no se achica).
 *
 * Cada hallazgo dice con qué lo resolvemos en palabras llanas (las del índice: pantallas, video, activaciones…), no
 * con marcas que ella todavía no conoce. Donde hay una foto real que lo prueba, va al lado.
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
                Lo que hay que arreglar
              </h2>
              <p className={`${base.nota} ${estilos.nota} ${base.aparece}`} style={orden(2)}>
                Recorrimos el Frontón, escuchamos a su equipo y revisamos cómo se vende hoy.
              </p>
            </>
          ) : (
            <h2 id="descubrimos-2-titulo" className={`${base.titulo} ${estilos.titulo} ${base.aparece}`} style={orden(1)}>
              Y cuatro cosas más
            </h2>
          )}
        </header>

        <ol className={estilos.dolores} start={dolores[0].n}>
          {dolores.map((d, i) => {
            const con = [...new Set(d.atienden.map((u) => ROTULO[u]).filter(Boolean))]
            return (
              <li
                key={d.n}
                className={`${base.vidrio} ${estilos.dolor} ${base.aparece}`}
                data-con-prueba={d.evidencia ? 'true' : undefined}
                style={orden(3 + i)}
              >
                <span className={estilos.numero} aria-hidden="true">
                  {d.n}
                </span>
                <div className={estilos.texto}>
                  <h3 className={estilos.dolorTitulo}>{d.titulo}</h3>
                  <p className={estilos.dolorTexto}>{d.texto}</p>
                  <p className={estilos.atienden}>
                    <span className={estilos.atiendenRotulo}>Lo resolvemos con:</span> {con.join(' · ').toLowerCase()}
                  </p>
                </div>
                {d.evidencia ? (
                  <Foto
                    src={d.evidencia.src}
                    alt={d.evidencia.alt}
                    marca={d.evidencia.marca}
                    posicion={d.evidencia.posicion}
                    className={estilos.prueba}
                  />
                ) : null}
              </li>
            )
          })}
        </ol>
      </Escena>
    </section>
  )
}
