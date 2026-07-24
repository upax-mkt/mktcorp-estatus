import type { DecisionSlide } from '@/decision/esquema'
import estilos from '../deck.module.css'

export function Portada({ decision }: { decision: DecisionSlide }) {
  return (
    <section
      className={estilos.slide}
      data-layout="portada"
      role="region"
      aria-label={decision.titulo}
    >
      <div className={estilos.portadaCuerpo}>
        <h1 className={`${estilos.titulo} ${estilos.tituloPortada}`}>{decision.titulo}</h1>
        {decision.subtitulo && <p className={estilos.subtitulo}>{decision.subtitulo}</p>}
      </div>
      {/* Banda decorativa: el degradado de marca EXACTO (--gradiente), sin
          ajustar. Nunca lleva texto encima — aria-hidden porque no aporta
          contenido, sólo identidad de marca. */}
      <div className={estilos.portadaFranja} aria-hidden="true" data-testid="franja-decorativa" />
    </section>
  )
}
