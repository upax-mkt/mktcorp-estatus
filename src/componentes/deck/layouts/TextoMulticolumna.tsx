import type { CSSProperties } from 'react'
import type { DecisionSlide } from '@/decision/esquema'
import estilos from '../deck.module.css'

/** El esquema permite hasta 4 columnas: la grilla se adapta a la cantidad real en vez de forzar 2. */
function estiloColumnas(cantidad: number): CSSProperties {
  return { '--columnas-cantidad': Math.max(1, cantidad) } as CSSProperties
}

/**
 * La versión "solo columnas" de KpisFilaDosColumnas: sin fila de KPIs, todo
 * el slide es para el reparto cualitativo en 2, 3 o 4 columnas paralelas.
 */
export function TextoMulticolumna({ decision }: { decision: DecisionSlide }) {
  return (
    <section
      className={estilos.slide}
      data-layout="texto-multicolumna"
      role="region"
      aria-label={decision.titulo}
    >
      <h2 className={estilos.titulo}>{decision.titulo}</h2>

      {decision.columnas && (
        <div
          className={`${estilos.columnas} ${estilos.textoMulticolumnaColumnas}`}
          style={estiloColumnas(decision.columnas.length)}
        >
          {decision.columnas.map((col, indiceCol) => (
            // Mismo motivo que en KpisFilaDosColumnas: col.titulo/col.puntos son
            // texto de negocio sin garantía de unicidad.
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
