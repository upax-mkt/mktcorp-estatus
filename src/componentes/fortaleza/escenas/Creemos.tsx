import base from '../base.module.css'
import estilos from './Creemos.module.css'
import { Escena } from '../../politico/Escena'
import { Foto, Luz, orden } from '../comun'
import { FORTALEZAS } from '../contenido'

/**
 * 4 · POR QUÉ CREEMOS EN FORTALEZA MEXICANA (ronda 4, 21-oct-2026). El segundo paso que dictó Ceci: «¿por qué
 * creemos en Fortaleza Mexicana? Porque tiene esto, esto y esto». Cuatro razones, cada una con su foto (de su
 * brochure y de su sitio): la obra, el edificio, la cocina y la causa.
 */
export function Creemos() {
  return (
    <section data-layout="creemos" aria-labelledby="creemos-titulo" className={base.pantalla}>
      <Luz />
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <header className={base.cabecera}>
          <p className={`${base.antetitulo} ${base.aparece}`} style={orden(0)}>
            Por qué creemos
          </p>
          <h2 id="creemos-titulo" className={`${base.titulo} ${estilos.titulo} ${base.aparece}`} style={orden(1)}>
            Fortaleza Mexicana tiene con qué
          </h2>
        </header>

        <ul className={estilos.razones}>
          {FORTALEZAS.map((f, i) => (
            <li key={f.titulo} className={`${estilos.razon} ${base.aparece}`} style={orden(2 + i)}>
              <Foto src={f.foto} alt={f.alt} posicion={f.posicion} className={estilos.foto} />
              <h3 className={estilos.razonTitulo}>{f.titulo}</h3>
              <p className={estilos.razonTexto}>{f.texto}</p>
            </li>
          ))}
        </ul>
      </Escena>
    </section>
  )
}
