import type { DecisionSlide } from '@/decision/esquema'
import estilos from '../deck.module.css'

/**
 * Separador de sección: marca el arranque de un bloque nuevo dentro de la
 * sesión. Superficie oscura (ver LAYOUTS_OSCUROS en Deck.tsx) — el título y
 * el subtítulo viven sobre --superficie/--texto (par ya validado ≥4.5:1,
 * igual que Portada). El --gradiente de marca EXACTO queda, como en Portada,
 * confinado a un elemento puramente decorativo y aria-hidden — aquí una
 * columna ("espina") a sangre en el borde izquierdo en vez de una franja
 * inferior, para que el divisor no sea un clon de la portada.
 */
export function DivisorSeccion({ decision }: { decision: DecisionSlide }) {
  return (
    <section
      className={`${estilos.slide} ${estilos.divisorSlide}`}
      data-layout="divisor-seccion"
      role="region"
      aria-label={decision.titulo}
    >
      <div className={estilos.divisorSpine} aria-hidden="true" data-testid="franja-divisor" />
      <div className={estilos.divisorCuerpo}>
        <h1 className={`${estilos.titulo} ${estilos.divisorTitulo}`}>{decision.titulo}</h1>
        {decision.subtitulo && <p className={estilos.subtitulo}>{decision.subtitulo}</p>}
      </div>
    </section>
  )
}
