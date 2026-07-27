import type { CSSProperties } from 'react'
import type { DatosGrafico } from './tipos'
import { formatearValor } from './tipos'
import { escalaLineal } from './escalas'

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
const ALTO_LEYENDA = 20
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
  const hayLeyenda = series.length > 1

  const arriba = MARGEN.arriba + (hayLeyenda ? ALTO_LEYENDA : 0)
  // La leyenda se reparte el carril entero en vez de usar un paso fijo: con
  // dos series y 640px de ancho, un paso de 110 truncaba "El mes pasado" a
  // "El mes pasa…" con medio gráfico vacío al lado.
  const pasoLeyenda = hayLeyenda
    ? (ancho - MARGEN.izquierda - ANCHO_ETIQUETA - MARGEN.derecha) / series.length
    : 0
  const altoUtil = alto - arriba - MARGEN.abajo
  const anchoUtil = ancho - MARGEN.izquierda - ANCHO_ETIQUETA - ANCHO_VALOR - MARGEN.derecha

  // El dominio arranca en cero: una barra horizontal cuya base no es el cero
  // miente sobre la proporción entre categorías, que es justo lo que se viene
  // a comparar aquí.
  const valores = series.flatMap((s) => s.valores)
  const maximo = Math.max(...valores, 0)
  const x = escalaLineal([0, maximo], [0, Math.max(0, anchoUtil)])

  const altoGrupo = altoUtil / Math.max(1, categorias.length)
  const altoBarra = (altoGrupo - SEPARACION_GRUPOS) / Math.max(1, series.length)
  const altoBarraDibujo = Math.max(0, altoBarra * (1 - PROPORCION_SEPARACION_BARRA))

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${ancho} ${alto}`}
      role="img"
      aria-label="Gráfico de barras horizontales agrupadas"
    >
      {hayLeyenda && (
        <g transform={`translate(${MARGEN.izquierda + ANCHO_ETIQUETA},${MARGEN.arriba})`}>
          {series.map((serie, si) => (
            <g key={serie.etiqueta} transform={`translate(${si * pasoLeyenda},0)`}>
              <rect width="10" height="10" fill={`var(--dato-${(si % 6) + 1})`} rx="2" />
              <text
                x="16"
                y="9"
                fill="var(--texto)"
                fontSize={FUENTE_ETIQUETA}
                fontFamily="var(--fuente-texto)"
              >
                {truncarTexto(serie.etiqueta, pasoLeyenda - 22, FUENTE_ETIQUETA)}
              </text>
            </g>
          ))}
        </g>
      )}

      <g transform={`translate(${MARGEN.izquierda},${arriba})`}>
        {categorias.map((categoria, ci) => (
          <g key={categoria} transform={`translate(0,${ci * altoGrupo})`}>
            <text
              x={ANCHO_ETIQUETA - 10}
              y={altoGrupo / 2 + 4}
              textAnchor="end"
              fill="var(--texto)"
              fontSize={FUENTE_ETIQUETA}
              fontFamily="var(--fuente-texto)"
            >
              {truncarTexto(categoria, ANCHO_ETIQUETA - 14, FUENTE_ETIQUETA)}
            </text>
            {series.map((serie, si) => {
              const valor = serie.valores[ci] ?? 0
              const largo = Math.max(0, x(Math.max(0, valor)))
              const yBarra = SEPARACION_GRUPOS / 2 + si * altoBarra
              return (
                <g key={serie.etiqueta}>
                  <rect
                    data-testid="barra"
                    data-horizontal="true"
                    style={{ '--i': ci } as CSSProperties}
                    x={ANCHO_ETIQUETA}
                    y={yBarra}
                    width={largo}
                    height={altoBarraDibujo}
                    fill={`var(--dato-${(si % 6) + 1})`}
                    rx="2"
                  />
                  <text
                    x={ANCHO_ETIQUETA + largo + 6}
                    y={yBarra + altoBarraDibujo / 2 + 3}
                    fill="var(--texto)"
                    fontSize="9"
                    fontFamily="var(--fuente-texto)"
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
