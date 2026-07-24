import type { DatosGrafico } from './tipos'
import { escalaLineal } from './escalas'

interface Props {
  datos: DatosGrafico
  alto: number
  ancho?: number
}

const MARGEN = { arriba: 12, derecha: 8, abajo: 28, izquierda: 8 }

// Debajo de este ancho de barra, un valor numérico centrado ya no cabe sin
// encimarse con el de la barra vecina: en ese punto se prefiere la
// referencia de eje (Hallazgo 4).
const ANCHO_MINIMO_ETIQUETA_VALOR = 24
// Margen izquierdo cuando se dibuja el eje de valores (necesita espacio
// para los rótulos numéricos, que no existen en el layout sin eje).
const MARGEN_IZQUIERDA_CON_EJE = 42
// Separación entre barras de un mismo grupo como proporción del ancho de
// barra, en vez de un margen fijo en px que puede volverse negativo
// (Hallazgo 2).
const PROPORCION_SEPARACION = 0.15
const ANCHO_LEYENDA = 130
const NUM_TICKS_EJE = 4

/** Genera `cantidad` marcas equiespaciadas dentro de [minimo, maximo], incluyendo ambos extremos. */
function generarTicks(minimo: number, maximo: number, cantidad: number): number[] {
  if (minimo === maximo) return [minimo]
  const paso = (maximo - minimo) / (cantidad - 1)
  return Array.from({ length: cantidad }, (_, i) => minimo + paso * i)
}

export function BarrasComparadas({ datos, alto, ancho = 640 }: Props) {
  const { categorias, series } = datos

  const anchoLeyenda = series.length > 1 ? ANCHO_LEYENDA : 0

  // Primera pasada (con el margen base) para decidir el modo de referencia
  // de escala: si las barras van a quedar demasiado angostas para un valor
  // centrado, se usa eje en vez de etiquetas por barra. Agrandar el margen
  // izquierdo después solo angosta más las barras, así que la decisión no
  // puede oscilar.
  const anchoUtilBase = ancho - MARGEN.izquierda - MARGEN.derecha - anchoLeyenda
  const anchoGrupoBase = anchoUtilBase / categorias.length
  const anchoBarraBase = (anchoGrupoBase * 0.7) / series.length
  const mostrarEtiquetasValor = anchoBarraBase >= ANCHO_MINIMO_ETIQUETA_VALOR
  const mostrarEje = !mostrarEtiquetasValor

  const margenIzquierda = mostrarEje ? MARGEN_IZQUIERDA_CON_EJE : MARGEN.izquierda
  const altoUtil = alto - MARGEN.arriba - MARGEN.abajo
  const anchoUtil = ancho - margenIzquierda - MARGEN.derecha - anchoLeyenda

  const anchoGrupo = anchoUtil / categorias.length
  const anchoBarra = (anchoGrupo * 0.7) / series.length
  const separacion = anchoBarra * PROPORCION_SEPARACION
  const anchoBarraDibujo = Math.max(0, anchoBarra - separacion)

  // El dominio debe abarcar los valores negativos y siempre incluir el
  // cero; fijarlo solo en Math.max(...valores, 0) (como antes) hace que las
  // barras negativas desaparezcan y que un conjunto todo-negativo colapse
  // a un dominio [0,0] (Hallazgo 1).
  const valores = series.flatMap((s) => s.valores)
  const minimo = Math.min(...valores, 0)
  const maximo = Math.max(...valores, 0)
  const hayNegativos = minimo < 0

  const y = escalaLineal([minimo, maximo], [altoUtil, 0])
  const yCero = y(0)

  const ticks = mostrarEje ? generarTicks(minimo, maximo, NUM_TICKS_EJE) : []

  return (
    <svg width="100%" viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label="Gráfico de barras comparadas">
      <g transform={`translate(${margenIzquierda},${MARGEN.arriba})`}>
        {mostrarEje &&
          ticks.map((tick) => {
            const yTick = y(tick)
            return (
              <g key={tick}>
                <line
                  x1={0}
                  x2={anchoUtil}
                  y1={yTick}
                  y2={yTick}
                  stroke="var(--texto)"
                  strokeOpacity={0.12}
                />
                <text
                  x={-6}
                  y={yTick + 3}
                  textAnchor="end"
                  fill="var(--texto)"
                  fillOpacity={0.7}
                  fontSize="9"
                  fontFamily="var(--fuente-texto)"
                >
                  {Math.round(tick).toLocaleString('es-MX')}
                </text>
              </g>
            )
          })}

        {hayNegativos && (
          <line
            data-testid="linea-cero"
            x1={0}
            x2={anchoUtil}
            y1={yCero}
            y2={yCero}
            stroke="var(--texto)"
            strokeOpacity={0.35}
          />
        )}

        {categorias.map((categoria, ci) => (
          <g key={categoria} transform={`translate(${ci * anchoGrupo},0)`}>
            {series.map((serie, si) => {
              const valor = serie.valores[ci] ?? 0
              const yValor = y(valor)
              // La barra se dibuja entre la línea de cero y el valor, hacia
              // arriba si es positivo y hacia abajo si es negativo — nunca
              // con altura negativa, y sin depender de que altoUtil sea el
              // "piso" (que solo es cierto cuando no hay negativos).
              const alturaBarra = Math.max(0, Math.abs(yValor - yCero))
              const yBarra = Math.min(yValor, yCero)
              const xBarra = anchoGrupo * 0.15 + si * anchoBarra
              return (
                <g key={serie.etiqueta}>
                  <rect
                    data-testid="barra"
                    x={xBarra}
                    y={yBarra}
                    width={anchoBarraDibujo}
                    height={alturaBarra}
                    fill={`var(--dato-${(si % 6) + 1})`}
                    rx="2"
                  />
                  {mostrarEtiquetasValor && (
                    <text
                      x={xBarra + anchoBarraDibujo / 2}
                      y={valor >= 0 ? yBarra - 4 : yBarra + alturaBarra + 10}
                      textAnchor="middle"
                      fill="var(--texto)"
                      fontSize="9"
                      fontFamily="var(--fuente-texto)"
                    >
                      {valor.toLocaleString('es-MX')}
                    </text>
                  )}
                </g>
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

      {anchoLeyenda > 0 && (
        <g transform={`translate(${margenIzquierda + anchoUtil + 16},${MARGEN.arriba})`}>
          {series.map((serie, si) => (
            <g key={serie.etiqueta} transform={`translate(0,${si * 18})`}>
              <rect width="10" height="10" fill={`var(--dato-${(si % 6) + 1})`} rx="2" />
              <text x="16" y="9" fill="var(--texto)" fontSize="11" fontFamily="var(--fuente-texto)">
                {serie.etiqueta}
              </text>
            </g>
          ))}
        </g>
      )}
    </svg>
  )
}
