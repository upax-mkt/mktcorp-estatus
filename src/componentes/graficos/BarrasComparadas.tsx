import type { DatosGrafico } from './tipos'
import { escalaLineal } from './escalas'

interface Props {
  datos: DatosGrafico
  alto: number
  ancho?: number
}

const MARGEN = { arriba: 12, derecha: 8, abajo: 28, izquierda: 8 }

export function BarrasComparadas({ datos, alto, ancho = 640 }: Props) {
  const { categorias, series } = datos
  const altoUtil = alto - MARGEN.arriba - MARGEN.abajo
  const anchoUtil = ancho - MARGEN.izquierda - MARGEN.derecha

  const maximo = Math.max(...series.flatMap((s) => s.valores), 0)
  const y = escalaLineal([0, maximo], [altoUtil, 0])

  const anchoGrupo = anchoUtil / categorias.length
  const anchoBarra = (anchoGrupo * 0.7) / series.length

  return (
    <svg width="100%" viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label="Gráfico de barras comparadas">
      <g transform={`translate(${MARGEN.izquierda},${MARGEN.arriba})`}>
        {categorias.map((categoria, ci) => (
          <g key={categoria} transform={`translate(${ci * anchoGrupo},0)`}>
            {series.map((serie, si) => {
              const valor = serie.valores[ci] ?? 0
              const altoBarra = altoUtil - y(valor)
              return (
                <rect
                  key={serie.etiqueta}
                  data-testid="barra"
                  x={anchoGrupo * 0.15 + si * anchoBarra}
                  y={y(valor)}
                  width={anchoBarra - 2}
                  height={Math.max(0, altoBarra)}
                  fill={`var(--dato-${(si % 6) + 1})`}
                  rx="2"
                />
              )
            })}
            <text
              x={anchoGrupo / 2}
              y={altoUtil + 18}
              textAnchor="middle"
              fill="var(--texto)"
              fontSize="11"
              fontFamily="var(--fuente-texto)"
            >
              {categoria}
            </text>
          </g>
        ))}
      </g>
    </svg>
  )
}
