import estilos from '@/app/concurso/concurso.module.css'
import type { ResultadoConcurso } from '@/db/concurso'
import { SliderImagenes } from './SliderImagenes'

/**
 * EL PODIO COMPLETO, CUANDO EL CONCURSO YA TERMINÓ.
 *
 * Sustituye a `PodioGanador` —que enseñaba solo al primero— y a toda la
 * dinámica de la página: bases, premio, formulario, pase y lineup ya no tienen
 * a quién servir. Lo que queda es el registro de lo que pasó (9-sep-2026,
 * Franco: *«saca toda la dinámica y deja el podio 3er, 2do y 1er lugar»*).
 *
 * ⚠️ EL ORDEN VISUAL NO ES EL ORDEN DE LA LISTA. En pantalla ancha las gradas
 * van 2 · 1 · 3 con el primero al centro y más alto, que es como se lee un
 * podio de un vistazo. En una sola columna —un teléfono— el `order` las
 * recoloca 1 · 2 · 3, porque ahí el centro no existe y lo primero que se ve
 * tiene que ser quien ganó, no el segundo.
 *
 * Solo entra quien recibió al menos un voto: esto lo abre gente que participó,
 * y un escalón con un cero y un nombre encima no es un podio.
 */
export function PodioFinal({
  resultados,
  votosTotales,
}: {
  resultados: ResultadoConcurso[]
  votosTotales: number
}) {
  const podio = resultados.filter((r) => r.votos > 0).slice(0, 3)
  if (podio.length === 0) return null

  return (
    <section className={estilos.podioFinal} aria-labelledby="podio-final-titulo">
      <p className={estilos.podioEyebrow}>
        <span className={estilos.podioRayo} aria-hidden="true">ϟ</span>
        DISEÑA LO QUE SOMOS · EDICIÓN 2026
        <span className={estilos.podioRayo} aria-hidden="true">ϟ</span>
      </p>
      <h2 id="podio-final-titulo" className={estilos.podioFinalTitulo}>EL PODIO</h2>

      <ol className={estilos.gradas}>
        {podio.map((resultado, indice) => {
          const lugar = indice + 1
          const { propuesta, votos, puntaje } = resultado
          return (
            <li key={propuesta.id} className={`${estilos.grada} ${estilos[`grada${lugar}`]}`}>
              <span className={estilos.gradaLugar} aria-hidden="true">{lugar}º</span>
              <div className={estilos.gradaImagen}>
                <SliderImagenes titulo={propuesta.titulo} imagenes={propuesta.imagenes} alto={lugar === 1 ? 'podio' : 'normal'} />
              </div>
              <h3 className={estilos.gradaTitulo}>
                <span className={estilos.soloLectores}>{`Lugar ${lugar}: `}</span>
                {propuesta.titulo}
              </h3>
              <p className={estilos.gradaFirmas}>{propuesta.integrantes.map((p) => p.nombre).join('  +  ')}</p>
              <p className={estilos.gradaSquads}>
                {propuesta.integrantes.map((p) => p.squad ?? 'Sin squad').join('  ·  ')}
              </p>
              {lugar === 1 && <p className={estilos.gradaConcepto}>{propuesta.descripcion}</p>}
              <p className={estilos.gradaVotos}>
                <strong>{votos}</strong> {votos === 1 ? 'voto' : 'votos'} · {Math.round(puntaje)}%
              </p>
            </li>
          )
        })}
      </ol>

      <p className={estilos.podioTotal}>{votosTotales} pases usados · {resultados.length} propuestas en competencia</p>

      <p className={estilos.despedida}>Nos vemos en el próximo concurso</p>
    </section>
  )
}
