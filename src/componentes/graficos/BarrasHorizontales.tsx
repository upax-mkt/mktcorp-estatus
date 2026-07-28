import type { CSSProperties } from 'react'
import type { DatosGrafico } from './tipos'
import { colorDeSerie, formatearValor } from './tipos'
import { escalaLineal } from './escalas'
import estilos from './grafico.module.css'

/**
 * Barras horizontales, agrupadas por categoría.
 *
 * No es el gráfico cartesiano girado: se usa cuando lo que nombra cada barra
 * es una etiqueta larga —un canal ("Organic Search"), una industria, una
 * cuenta— que en vertical no cabe sin rotarse. Ahí la lectura natural es
 * de arriba abajo, con el nombre completo a la izquierda.
 *
 * Sin eje de valores: cada barra escribe su número al final. Con etiquetas
 * largas, el ojo ya va a la izquierda a leer el nombre; obligarlo a bajar a
 * un eje para saber cuánto vale es un viaje de más.
 */

interface Props {
  datos: DatosGrafico
  alto: number
  ancho?: number
}

const MARGEN = { arriba: 8, derecha: 8, abajo: 8, izquierda: 8 }
// Carril fijo para el nombre de la categoría. Es el punto del gráfico: si se
// calculara del contenido, dos gráficos hermanos no alinearían sus barras.
const ANCHO_ETIQUETA = 120
// Espacio a la derecha para el número al final de cada barra.
const ANCHO_VALOR = 56
const SEPARACION_GRUPOS = 10
const PROPORCION_SEPARACION_BARRA = 0.2
const FACTOR_ANCHO_CARACTER = 0.62
const FUENTE_ETIQUETA = 11

function truncarTexto(texto: string, anchoDisponible: number, fontSize: number): string {
  const maxCaracteres = Math.max(1, Math.floor(anchoDisponible / (fontSize * FACTOR_ANCHO_CARACTER)))
  if (texto.length <= maxCaracteres) return texto
  if (maxCaracteres === 1) return '…'
  return `${texto.slice(0, maxCaracteres - 1)}…`
}

export function BarrasHorizontales({ datos, alto, ancho = 640 }: Props) {
  const { categorias, series } = datos
  // La leyenda vive en HTML, en `Grafico.tsx`: aquí dentro había que estimar el
  // ancho del texto y truncarlo a ojo.
  const arriba = MARGEN.arriba
  const altoUtil = alto - arriba - MARGEN.abajo
  const anchoUtil = ancho - MARGEN.izquierda - ANCHO_ETIQUETA - ANCHO_VALOR - MARGEN.derecha

  // El dominio incluye el cero Y el mínimo. Antes arrancaba en cero y recortaba
  // los negativos a cero: una barra de largo cero rotulada "-300" es una
  // mentira silenciosa. Hoy no hay negativos en ningún estatus; el esquema los
  // admite, así que el día que llegue uno el gráfico lo dibujaría mal sin
  // avisar.
  const valores = series.flatMap((s) => s.valores)
  const minimo = Math.min(...valores, 0)
  const maximo = Math.max(...valores, 0)
  const x = escalaLineal([minimo, maximo], [0, Math.max(0, anchoUtil)])
  const xCero = x(0)

  const altoGrupo = altoUtil / Math.max(1, categorias.length)
  const altoBarra = (altoGrupo - SEPARACION_GRUPOS) / Math.max(1, series.length)
  const altoBarraDibujo = Math.max(0, altoBarra * (1 - PROPORCION_SEPARACION_BARRA))

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${ancho} ${alto}`}
      role="img"
      aria-label={`Gráfico de ${series.map((s) => s.etiqueta).join(', ')} por ${categorias.join(', ')}`}
      className={estilos.lienzo}
    >
      <g transform={`translate(${MARGEN.izquierda},${arriba})`}>
        {categorias.map((categoria, ci) => (
          <g key={categoria} transform={`translate(0,${ci * altoGrupo})`}>
            <text
              x={ANCHO_ETIQUETA - 10}
              y={altoGrupo / 2 + 4}
              textAnchor="end"
              className={estilos.rotuloCategoria}
            >
              {truncarTexto(categoria, ANCHO_ETIQUETA - 14, FUENTE_ETIQUETA)}
            </text>
            {series.map((serie, si) => {
              const valor = serie.valores[ci] ?? 0
              const xValor = x(valor)
              const largo = Math.abs(xValor - xCero)
              const inicio = ANCHO_ETIQUETA + Math.min(xCero, xValor)
              const yBarra = SEPARACION_GRUPOS / 2 + si * altoBarra
              return (
                <g key={serie.etiqueta}>
                  <rect
                    data-testid="barra"
                    data-horizontal="true"
                    style={{ '--i': ci } as CSSProperties}
                    x={inicio}
                    y={yBarra}
                    width={largo}
                    height={altoBarraDibujo}
                    fill={colorDeSerie(serie, si)}
                    rx="2"
                  />
                  {/* El rótulo va al extremo LIBRE de la barra: a su derecha si
                      es positiva, a su izquierda si es negativa. */}
                  <text
                    x={valor >= 0 ? inicio + largo + 6 : inicio - 6}
                    y={yBarra + altoBarraDibujo / 2 + 3}
                    textAnchor={valor >= 0 ? 'start' : 'end'}
                    className={estilos.rotuloValor}
                  >
                    {formatearValor(valor, serie)}
                  </text>
                </g>
              )
            })}
          </g>
        ))}
      </g>
    </svg>
  )
}
