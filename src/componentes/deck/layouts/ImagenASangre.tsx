import type { DecisionSlide } from '@/decision/esquema'
import estilos from '../deck.module.css'

/**
 * Imagen a sangre: cubre el slide entero. Superficie oscura (ver
 * LAYOUTS_OSCUROS en Deck.tsx) — no para pintar un fondo sólido (el fondo es
 * la imagen o, en su ausencia, el --gradiente de marca como placeholder),
 * sino para heredar el par ya validado ≥4.5:1 --superficie/--texto: la
 * banda que da legibilidad al título es un degradado hacia --superficie, y
 * el texto que se apoya en ella usa --texto — el mismo contrato de
 * contraste que ya usan Portada, DivisorSeccion y Cierre, sin inventar un
 * color "texto sobre imagen" nuevo y sin validar.
 */
export function ImagenASangre({ decision }: { decision: DecisionSlide }) {
  return (
    <section
      className={`${estilos.slide} ${estilos.imagenSangreSlide}`}
      data-layout="imagen-a-sangre"
      role="region"
      aria-label={decision.titulo}
    >
      {decision.imagen ? (
        // alt="" a propósito: la imagen es fondo decorativo, el título y el
        // subtítulo superpuestos son el contenido real de cara al lector.
        <img
          src={decision.imagen}
          alt=""
          className={estilos.imagenSangreImg}
          data-testid="imagen-sangre"
        />
      ) : (
        <div className={estilos.imagenSangrePlaceholder} aria-hidden="true" data-testid="placeholder-imagen-sangre" />
      )}
      <div className={estilos.imagenSangreScrim} aria-hidden="true" />
      <div className={estilos.imagenSangreContenido}>
        <h1 className={`${estilos.titulo} ${estilos.imagenSangreTitulo}`}>{decision.titulo}</h1>
        {decision.subtitulo && (
          <p className={`${estilos.subtitulo} ${estilos.imagenSangreSubtitulo}`}>{decision.subtitulo}</p>
        )}
      </div>
    </section>
  )
}
