import type { DecisionSlide } from '@/decision/esquema'
import estilos from '../deck.module.css'

export function Portada({ decision }: { decision: DecisionSlide }) {
  return (
    <section
      className={`${estilos.slide} ${estilos.slideOscuro}`}
      data-layout="portada"
      role="region"
      aria-label={decision.titulo}
    >
      <div style={{ marginTop: 'auto', marginBottom: 'auto' }}>
        <h1 className={`${estilos.titulo} ${estilos.tituloPortada}`}>{decision.titulo}</h1>
        {decision.subtitulo && <p className={estilos.subtitulo}>{decision.subtitulo}</p>}
      </div>
    </section>
  )
}
