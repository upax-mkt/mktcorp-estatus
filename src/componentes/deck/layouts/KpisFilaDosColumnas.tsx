import type { CSSProperties } from 'react'
import type { DecisionSlide } from '@/decision/esquema'
import estilos from '../deck.module.css'

/** El esquema permite hasta 4 columnas: la grilla se adapta a la cantidad real en vez de forzar 2. */
function estiloColumnas(cantidad: number): CSSProperties {
  return { '--columnas-cantidad': Math.max(1, cantidad) } as CSSProperties
}

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
          {decision.kpis.map((kpi, indice) => (
            // La clave usa el índice: kpi.rotulo es texto de negocio libre y
            // dos KPIs pueden compartir rótulo sin que eso sea un error.
            <div key={`kpi-${indice}`} className={estilos.kpi}>
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
        <div className={estilos.columnas} style={estiloColumnas(decision.columnas.length)}>
          {decision.columnas.map((col, indiceCol) => (
            // Mismo motivo: col.titulo y col.puntos son texto de negocio sin
            // garantía de unicidad, la clave no puede depender de ellos.
            <div key={`columna-${indiceCol}`}>
              <h3 className={estilos.columnaTitulo}>{col.titulo}</h3>
              <ul>
                {col.puntos.map((p, indicePunto) => (
                  <li key={`punto-${indiceCol}-${indicePunto}`}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
