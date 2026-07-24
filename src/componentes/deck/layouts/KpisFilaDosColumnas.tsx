import type { DecisionSlide } from '@/decision/esquema'
import estilos from '../deck.module.css'

export function KpisFilaDosColumnas({ decision }: { decision: DecisionSlide }) {
  return (
    <section
      className={estilos.slide}
      data-layout="kpis-fila-dos-columnas"
      role="region"
      aria-label={decision.titulo}
    >
      <h2 className={estilos.titulo}>{decision.titulo}</h2>

      {decision.kpis && (
        <div className={estilos.filaKpis}>
          {decision.kpis.map((kpi) => (
            <div key={kpi.rotulo} className={estilos.kpi}>
              <div className={estilos.kpiValor}>
                {kpi.valor}
                {kpi.delta && <span className={estilos.kpiDelta}>{kpi.delta}</span>}
              </div>
              <div className={estilos.kpiRotulo}>{kpi.rotulo}</div>
            </div>
          ))}
        </div>
      )}

      {decision.columnas && (
        <div className={estilos.columnas}>
          {decision.columnas.map((col) => (
            <div key={col.titulo}>
              <h3 className={estilos.columnaTitulo}>{col.titulo}</h3>
              <ul>{col.puntos.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
