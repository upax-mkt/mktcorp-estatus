import type { CSSProperties } from 'react'
import type { DatosGrafico } from './tipos'
import { formatearValor } from './tipos'
import estilos from './grafico.module.css'

/**
 * Dona: el reparto de un total entre sus partes.
 *
 * Una sola serie, un sector por categoría. Si llegan varias series se usa la
 * primera: una dona con dos series no existe: son dos donas, y esa es una
 * decisión de composición que no le toca al gráfico.
 *
 * LLEVA SU PROPIA LEYENDA, al revés que los demás. Es la única en la que la
 * leyenda ES el dato: sin el número al lado, un sector sólo dice "un poco más
 * de la mitad". Y el porcentaje va escrito, porque estimar una proporción
 * mirando un arco es justo lo que el ojo hace peor.
 */

interface Props {
  datos: DatosGrafico
  alto: number
  ancho?: number
}

const GROSOR = 0.42
/** Aire entre el anillo y su leyenda. */
const SEPARACION_LEYENDA = 40
const ANCHO_LEYENDA = 230
const ALTO_LINEA_LEYENDA = 22

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

  // El anillo y su leyenda se centran COMO PAREJA. Centrar sólo el anillo en
  // el ancho sobrante lo dejaba en el tercio izquierdo del lienzo, con un
  // hueco a la derecha y la leyenda pegada al borde: el dibujo se leía
  // descuadrado respecto de la columna de texto que tiene encima.
  const rExterior = Math.max(0, alto / 2 - 12)
  const rInterior = rExterior * (1 - GROSOR)
  const anchoGrupo = rExterior * 2 + SEPARACION_LEYENDA + ANCHO_LEYENDA
  const izquierda = Math.max(0, (ancho - anchoGrupo) / 2)
  const cx = izquierda + rExterior
  const cy = alto / 2

  let acumulado = 0
  const sectores = valores.map((valor, i) => {
    const desde = total > 0 ? (acumulado / total) * 360 : 0
    acumulado += valor
    const hasta = total > 0 ? (acumulado / total) * 360 : 0
    return { d: sector(cx, cy, rExterior, rInterior, desde, hasta), i, valor }
  })

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${ancho} ${alto}`}
      role="img"
      aria-label={`Reparto de ${serie?.etiqueta ?? 'un total'} entre ${categorias.join(', ')}`}
      className={estilos.lienzo}
    >
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

      {/* El hueco del centro es donde va el TOTAL. Una dona sin él obliga a
          sumar de cabeza los números de la leyenda para saber de cuánto se
          está repartiendo. */}
      {total > 0 && (
        <>
          <text x={cx} y={cy + 2} textAnchor="middle" className={estilos.totalDona}>
            {serie ? formatearValor(total, serie) : total}
          </text>
          {serie?.etiqueta && (
            <text x={cx} y={cy + 20} textAnchor="middle" className={estilos.etiquetaTotalDona}>
              {serie.etiqueta}
            </text>
          )}
        </>
      )}

      <g
        transform={`translate(${cx + rExterior + SEPARACION_LEYENDA},${
          cy - (categorias.length * ALTO_LINEA_LEYENDA) / 2 + 4
        })`}
      >
        {categorias.map((categoria, i) => (
          <g key={categoria} transform={`translate(0,${i * ALTO_LINEA_LEYENDA})`}>
            <rect width="10" height="10" fill={`var(--dato-${(i % 6) + 1})`} rx="2" />
            <text x="18" y="9" className={estilos.rotuloLeyenda}>
              {categoria}
            </text>
            <text x="18" y="9" className={estilos.rotuloValorLeyenda} textAnchor="end" dx={ANCHO_LEYENDA - 18}>
              {serie ? formatearValor(valores[i], serie) : valores[i]}
              {total > 0 && ` · ${Math.round((valores[i] / total) * 100)}%`}
            </text>
          </g>
        ))}
      </g>
    </svg>
  )
}
