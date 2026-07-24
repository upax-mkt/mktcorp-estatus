import type { DecisionSlide } from '@/decision/esquema'
import estilos from '../deck.module.css'

interface Props {
  decision: DecisionSlide
  motivo: string
}

export function LayoutSeguro({ decision, motivo }: Props) {
  return (
    <section className={estilos.slide} data-layout="layout-seguro" data-degradado="true"
             role="region" aria-label={decision.titulo}>
      <div data-testid="requiere-revision" className={estilos.avisoRevision}>
        ⚠ Requiere revisión — {motivo}
      </div>
      <h2 className={estilos.titulo}>{decision.titulo}</h2>
      {decision.subtitulo && <p className={estilos.subtitulo}>{decision.subtitulo}</p>}
      {decision.cuerpo && (
        <ul>{decision.cuerpo.map((t) => <li key={t}>{t}</li>)}</ul>
      )}
    </section>
  )
}
