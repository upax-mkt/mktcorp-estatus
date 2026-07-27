import type { CSSProperties } from 'react'
import type { DatosGrafico } from './tipos'
import { formatearValor } from './tipos'

/**
 * Dona: el reparto de un total entre sus partes.
 *
 * Una sola serie, un sector por categoría. Si llegan varias series se usa la
 * primera: una dona con dos series no existe: son dos donas, y esa es una
 * decisión de composición que no le toca al gráfico.
 */

interface Props {
  datos: DatosGrafico
  alto: number
  ancho?: number
}

const GROSOR = 0.42
const FUENTE_LEYENDA = 11

/** Punto de la circunferencia para un ángulo dado, en grados desde las 12 en punto. */
function punto(cx: number, cy: number, radio: number, grados: number) {
  const rad = ((grados - 90) * Math.PI) / 180
  return { x: cx + radio * Math.cos(rad), y: cy + radio * Math.sin(rad) }
}

/** El `d` de un sector de anillo entre dos ángulos. */
function sector(cx: number, cy: number, rExterior: number, rInterior: number, desde: number, hasta: number): string {
  const arcoLargo = hasta - desde > 180 ? 1 : 0
  const e1 = punto(cx, cy, rExterior, desde)
  const e2 = punto(cx, cy, rExterior, hasta)
  const i2 = punto(cx, cy, rInterior, hasta)
  const i1 = punto(cx, cy, rInterior, desde)
  return [
    `M ${e1.x} ${e1.y}`,
    `A ${rExterior} ${rExterior} 0 ${arcoLargo} 1 ${e2.x} ${e2.y}`,
    `L ${i2.x} ${i2.y}`,
    `A ${rInterior} ${rInterior} 0 ${arcoLargo} 0 ${i1.x} ${i1.y}`,
    'Z',
  ].join(' ')
}

export function Dona({ datos, alto, ancho = 640 }: Props) {
  const { categorias, series } = datos
  const serie = series[0]
  // Solo las partes positivas: un porcentaje negativo no ocupa arco.
  const valores = categorias.map((_, i) => Math.max(0, serie?.valores[i] ?? 0))
  const total = valores.reduce((suma, v) => suma + v, 0)

  const anchoLeyenda = 170
  const cx = (ancho - anchoLeyenda) / 2
  const cy = alto / 2
  const rExterior = Math.max(0, Math.min(cx, cy) - 12)
  const rInterior = rExterior * (1 - GROSOR)

  let acumulado = 0
  const sectores = valores.map((valor, i) => {
    const desde = total > 0 ? (acumulado / total) * 360 : 0
    acumulado += valor
    const hasta = total > 0 ? (acumulado / total) * 360 : 0
    return { d: sector(cx, cy, rExterior, rInterior, desde, hasta), i, valor }
  })

  return (
    <svg width="100%" viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label="Gráfico de dona">
      {total > 0 &&
        sectores.map(({ d, i }) => (
          <path
            key={categorias[i]}
            data-testid="sector"
            style={{ '--i': i } as CSSProperties}
            d={d}
            fill={`var(--dato-${(i % 6) + 1})`}
          />
        ))}

      <g transform={`translate(${ancho - anchoLeyenda},${Math.max(0, cy - categorias.length * 9)})`}>
        {categorias.map((categoria, i) => (
          <g key={categoria} transform={`translate(0,${i * 18})`}>
            <rect width="10" height="10" fill={`var(--dato-${(i % 6) + 1})`} rx="2" />
            <text
              x="16"
              y="9"
              fill="var(--texto)"
              fontSize={FUENTE_LEYENDA}
              fontFamily="var(--fuente-texto)"
            >
              {categoria} · {serie ? formatearValor(valores[i], serie) : valores[i]}
            </text>
          </g>
        ))}
      </g>
    </svg>
  )
}
