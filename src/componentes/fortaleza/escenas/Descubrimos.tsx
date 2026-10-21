import base from '../base.module.css'
import estilos from './Descubrimos.module.css'
import { Escena } from '../../politico/Escena'
import { Foto, Luz, orden } from '../comun'
import { DESCUBRIMOS, DOLORES } from '../contenido'

/**
 * LO QUE DESCUBRIMOS (ronda 6, 21-oct-2026), una pantalla por parte de Fortaleza Mexicana: Malinche, el Frontón
 * México, y Pelota Mestiza con sus cenas.
 *
 * Solo los problemas. Ceci, al ver la ronda 5 con las unidades: «primero qué descubrimos y luego qué resolvemos, no
 * todo junto», y cada problema por separado («no se venden» y «se cambian a mano» son dos cosas). Cómo se resuelve
 * viene después, en «Lo que proponemos», que nombra cada problema por su número.
 *
 * El Frontón lleva su foto por fuera, sola: «afuera nadie sabe que existe ese venue» (pedido en la sala).
 * Sin cifras de butacas vacías (regla del guion que aprobó Franco el 20-oct): el dolor se dice por sus causas.
 */
export function Descubrimos({ grupo, parte }: { grupo: (typeof DESCUBRIMOS)[number]; parte: number }) {
  const dolores = DOLORES.filter((d) => grupo.propiedades.includes(d.propiedad))
  const titulo = `descubrimos-${grupo.id}-titulo`
  return (
    <section
      data-layout={`descubrimos-${grupo.id}`}
      aria-labelledby={titulo}
      className={base.pantalla}
    >
      <Luz />
      <Escena className={`${base.escena} ${estilos.escena} ${grupo.foto ? estilos.conFoto : ''}`}>
        <header className={base.cabecera}>
          <p className={`${base.antetitulo} ${base.aparece}`} style={orden(0)}>
            Lo que descubrimos · {parte} de {DESCUBRIMOS.length}
          </p>
          <h2 id={titulo} className={`${base.titulo} ${estilos.titulo} ${base.aparece}`} style={orden(1)}>
            {grupo.titulo}
          </h2>
          {parte === 1 ? (
            <p className={`${base.nota} ${estilos.nota} ${base.aparece}`} style={orden(2)}>
              Recorrimos el Frontón, escuchamos a su equipo y revisamos cómo se vende hoy. Primero, lo que hay que
              arreglar; después, lo que proponemos.
            </p>
          ) : null}
        </header>

        <div className={estilos.cuerpo}>
          {grupo.foto ? (
            <Foto
              src={grupo.foto.src}
              alt={grupo.foto.alt}
              marca={grupo.foto.marca}
              pie={grupo.foto.pie}
              posicion={grupo.foto.posicion}
              className={`${estilos.foto} ${base.aparece}`}
              style={orden(2)}
            />
          ) : null}

          <ol className={estilos.dolores} start={dolores[0].n} data-cuantos={dolores.length}>
            {dolores.map((d, i) => (
              <li
                key={d.n}
                className={`${base.vidrio} ${estilos.dolor} ${base.aparece}`}
                data-con-prueba={d.evidencia ? 'true' : undefined}
                style={orden(3 + i * 0.7)}
              >
                <span className={estilos.numero} aria-hidden="true">
                  {d.n}
                </span>
                <div className={estilos.texto}>
                  <h3 className={estilos.dolorTitulo}>{d.titulo}</h3>
                  <p className={estilos.dolorTexto}>{d.texto}</p>
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
            ))}
          </ol>
        </div>
      </Escena>
    </section>
  )
}
