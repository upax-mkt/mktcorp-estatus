import type { DecisionSlide } from '@/decision/esquema'
import estilos from '../deck.module.css'

/**
 * Cierre institucional de la sesión. Misma superficie oscura que Portada y
 * DivisorSeccion, pero composición deliberadamente distinta a ambas: todo
 * centrado, con mucho aire, y el --gradiente de marca reducido a un acento
 * corto y decorativo bajo el título (no una banda a sangre) — así se lee
 * como un cierre calmo, no como una repetición de la apertura.
 */
export function Cierre({ decision }: { decision: DecisionSlide }) {
  return (
    <section
      className={`${estilos.slide} ${estilos.cierreSlide}`}
      data-layout="cierre"
      role="region"
      aria-label={decision.titulo}
    >
      <div className={estilos.cierreCuerpo}>
        <h1 className={`${estilos.titulo} ${estilos.cierreTitulo}`}>{decision.titulo}</h1>
        {decision.subtitulo && (
          <p className={`${estilos.subtitulo} ${estilos.cierreSubtitulo}`}>{decision.subtitulo}</p>
        )}
        <div className={estilos.cierreAcento} aria-hidden="true" data-testid="acento-cierre" />
      </div>
    </section>
  )
}
