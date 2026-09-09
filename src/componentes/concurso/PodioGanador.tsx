import estilos from '@/app/concurso/concurso.module.css'
import type { ResultadoConcurso } from '@/db/concurso'
import { SliderImagenes } from './SliderImagenes'

/**
 * LA REVELACIÓN: quién ganó, con nombre y con fiesta.
 *
 * Hasta aquí el lineup fue anónimo a propósito —se vota el diseño, no la
 * firma—, y esta es la única pantalla donde eso se levanta. Por eso lleva el
 * nombre en grande: la ceremonia existe justamente para decirlo.
 *
 * ⚠️ EL CONFETI ES DETERMINISTA, y no es un capricho de estilo. Cada pieza
 * lleva su posición, su retardo y su giro escritos en esta constante en vez de
 * salir de `Math.random()`: este componente se pinta primero en el servidor y
 * luego se hidrata en el navegador, y con números al azar los dos renders no
 * coincidirían nunca —React tiraría el árbol entero, que es el mismo error #418
 * que ya mordió en la cuenta regresiva—. Veinte piezas fijas se ven igual de
 * desordenadas y no rompen nada.
 *
 * Y ES CSS, NO UNA LIBRERÍA: una animación de caída no justifica meter una
 * dependencia en una página que se abre una vez al año, con la sala ya reunida.
 * `prefers-reduced-motion` la apaga; a quien le marea el movimiento no se le
 * impone una lluvia de papelitos para leer quién ganó.
 */
const CONFETI = [
  { izq: 3, retardo: 0.0, duracion: 3.4, giro: 18, tono: 'a' },
  { izq: 9, retardo: 1.1, duracion: 4.1, giro: -24, tono: 'b' },
  { izq: 15, retardo: 0.4, duracion: 3.0, giro: 40, tono: 'c' },
  { izq: 21, retardo: 2.0, duracion: 3.8, giro: -12, tono: 'a' },
  { izq: 27, retardo: 0.8, duracion: 4.4, giro: 30, tono: 'b' },
  { izq: 33, retardo: 1.6, duracion: 3.2, giro: -36, tono: 'c' },
  { izq: 39, retardo: 0.2, duracion: 4.0, giro: 22, tono: 'a' },
  { izq: 45, retardo: 2.4, duracion: 3.6, giro: -18, tono: 'b' },
  { izq: 51, retardo: 1.3, duracion: 4.3, giro: 44, tono: 'c' },
  { izq: 57, retardo: 0.6, duracion: 3.1, giro: -28, tono: 'a' },
  { izq: 63, retardo: 1.9, duracion: 4.2, giro: 14, tono: 'b' },
  { izq: 69, retardo: 0.9, duracion: 3.5, giro: -40, tono: 'c' },
  { izq: 75, retardo: 2.2, duracion: 3.9, giro: 26, tono: 'a' },
  { izq: 81, retardo: 0.3, duracion: 4.5, giro: -16, tono: 'b' },
  { izq: 87, retardo: 1.5, duracion: 3.3, giro: 34, tono: 'c' },
  { izq: 93, retardo: 0.7, duracion: 4.1, giro: -30, tono: 'a' },
  { izq: 6, retardo: 2.7, duracion: 3.7, giro: 20, tono: 'b' },
  { izq: 42, retardo: 3.0, duracion: 4.0, giro: -22, tono: 'c' },
  { izq: 66, retardo: 2.5, duracion: 3.4, giro: 38, tono: 'a' },
  { izq: 96, retardo: 1.8, duracion: 4.4, giro: -34, tono: 'b' },
] as const

const TONOS: Record<string, string> = {
  a: 'var(--rosa)',
  b: 'var(--negro)',
  c: '#f5c518',
}

export function PodioGanador({ ganador, votosTotales }: { ganador: ResultadoConcurso; votosTotales: number }) {
  const { propuesta, votos, puntaje } = ganador
  const firmas = propuesta.integrantes.map((p) => p.nombre).join('  +  ')

  return (
    <section className={estilos.podio} aria-labelledby="podio-titulo">
      <div className={estilos.podioConfeti} aria-hidden="true">
        {CONFETI.map((pieza, i) => (
          <span
            key={i}
            className={estilos.confetiPieza}
            style={{
              left: `${pieza.izq}%`,
              background: TONOS[pieza.tono],
              animationDelay: `${pieza.retardo}s`,
              animationDuration: `${pieza.duracion}s`,
              ['--giro' as string]: `${pieza.giro}deg`,
            }}
          />
        ))}
      </div>

      <div className={estilos.podioCuerpo}>
        <p className={estilos.podioEyebrow}>
          <span className={estilos.podioRayo} aria-hidden="true">ϟ</span>
          GANADOR 2026
          <span className={estilos.podioRayo} aria-hidden="true">ϟ</span>
        </p>
        <h2 id="podio-titulo" className={estilos.podioTitulo}>{propuesta.titulo}</h2>
        <p className={estilos.podioFirmas}>{firmas}</p>
        <p className={estilos.podioSquads}>
          {propuesta.integrantes.map((p) => p.squad ?? 'Sin squad').join('  ·  ')}
        </p>

        <div className={estilos.podioImagen}>
          <SliderImagenes titulo={propuesta.titulo} imagenes={propuesta.imagenes} alto="podio" />
        </div>

        <p className={estilos.podioConcepto}>{propuesta.descripcion}</p>

        <div className={estilos.podioCifras}>
          <span><strong>{votos}</strong><small>{votos === 1 ? 'voto' : 'votos'}</small></span>
          <span><strong>{Math.round(puntaje)}%</strong><small>del total</small></span>
          <span><strong>{votosTotales}</strong><small>pases usados</small></span>
        </div>
      </div>
    </section>
  )
}
