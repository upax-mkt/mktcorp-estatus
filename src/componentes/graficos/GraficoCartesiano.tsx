import type { CSSProperties } from 'react'
import type { DatosGrafico, SerieDatos } from './tipos'
import { esLinea, formatearValor } from './tipos'
import { escalaLineal } from './escalas'

/**
 * El gráfico de ejes de la app: barras agrupadas, líneas, o las dos cosas
 * sobre dos escalas distintas.
 *
 * Nació como `BarrasComparadas` (solo barras verticales). El estatus real de
 * una UDN necesita más: volumen en barras con la META como línea punteada
 * encima, y métricas de escalas incomparables —coste en miles junto a
 * conversiones en decenas— que sin un segundo eje se dibujan como una línea
 * plana pegada al suelo. Todo eso es el MISMO gráfico con series de distinta
 * forma, así que vive aquí y no en tres componentes que se pisan.
 */

interface Props {
  datos: DatosGrafico
  alto: number
  ancho?: number
  /**
   * Fuerza el número sobre cada punto o barra. Sin esto, las barras deciden
   * solas según el espacio (ver ANCHO_MINIMO_ETIQUETA_VALOR) y las líneas no
   * los muestran.
   */
  mostrarValores?: boolean
}

const MARGEN = { arriba: 12, derecha: 8, abajo: 28, izquierda: 8 }

// Debajo de este ancho de barra, un valor numérico centrado ya no cabe sin
// encimarse con el de la barra vecina: en ese punto se prefiere la
// referencia de eje (Hallazgo 4).
const ANCHO_MINIMO_ETIQUETA_VALOR = 24
// Margen cuando se dibuja un eje de valores (necesita espacio para los
// rótulos numéricos, que no existen en el layout sin eje).
const MARGEN_IZQUIERDA_CON_EJE = 42
const MARGEN_DERECHA_CON_EJE = 42
// Separación entre barras de un mismo grupo como proporción del ancho de
// barra, en vez de un margen fijo en px que puede volverse negativo
// (Hallazgo 2).
const PROPORCION_SEPARACION = 0.15
const ANCHO_LEYENDA = 130
const NUM_TICKS_EJE = 4

// La barra que toca el mínimo del dominio (que existe siempre que hay algún
// negativo) termina exactamente en altoUtil, así que su etiqueta de valor
// ("yBarra + alturaBarra + 10") cae a solo 8px de la etiqueta de categoría
// ("altoUtil + 18"): se encimarían con fuentes de 9 y 11px. Se reserva este
// espacio extra abajo — y se empuja la etiqueta de categoría el mismo tanto
// — cuando hay negativos con etiquetas de valor visibles, para separar
// ambos rótulos sin importar la altura de ninguna barra en particular
// (Hallazgo 1 del cierre).
const ESPACIO_EXTRA_ETIQUETA_NEGATIVA = 14

// Estimación de ancho de caracter (sin medir el DOM real, ver Hallazgo 2):
// para una tipografía sans-serif proporcional el ancho promedio de caracter
// ronda 0.6x el tamaño de fuente; usamos un factor un poco mayor para errar
// del lado conservador (truncar de más antes que desbordar el viewBox).
const FACTOR_ANCHO_CARACTER = 0.62
// Espacio del carril de leyenda ya ocupado por la muestra de color + su
// separación del texto (ver `x="16"` en el <text> de la leyenda), más un
// margen de seguridad para no rozar el borde del viewBox.
const OFFSET_TEXTO_LEYENDA = 16
const MARGEN_SEGURIDAD_LEYENDA = 6

const RADIO_PUNTO = 3
const PATRON_PUNTEADO = '5 4'

/** Recorta `texto` a lo que quepa en `anchoDisponible` px (estimado a partir de `fontSize`), con "…" al final si no cabe completo. */
function truncarTexto(texto: string, anchoDisponible: number, fontSize: number): string {
  const anchoCaracter = fontSize * FACTOR_ANCHO_CARACTER
  const maxCaracteres = Math.max(1, Math.floor(anchoDisponible / anchoCaracter))
  if (texto.length <= maxCaracteres) return texto
  if (maxCaracteres === 1) return '…'
  return `${texto.slice(0, maxCaracteres - 1)}…`
}

/** Genera `cantidad` marcas equiespaciadas dentro de [minimo, maximo], incluyendo ambos extremos. */
function generarTicks(minimo: number, maximo: number, cantidad: number): number[] {
  if (minimo === maximo) return [minimo]
  const paso = (maximo - minimo) / (cantidad - 1)
  return Array.from({ length: cantidad }, (_, i) => minimo + paso * i)
}

/**
 * Dominio de un eje: siempre incluye el cero.
 *
 * Sin el cero, una barra negativa desaparece y un conjunto todo-negativo
 * colapsa a un dominio [0,0] (Hallazgo 1 del cierre anterior).
 */
function dominioDe(series: SerieDatos[]): [number, number] {
  const valores = series.flatMap((s) => s.valores)
  return [Math.min(...valores, 0), Math.max(...valores, 0)]
}

/** El color sale de la posición ORIGINAL de la serie: barras, líneas y leyenda tienen que coincidir. */
function colorDeSerie(indiceOriginal: number): string {
  return `var(--dato-${(indiceOriginal % 6) + 1})`
}

export function GraficoCartesiano({ datos, alto, ancho = 640, mostrarValores }: Props) {
  const { categorias, series } = datos

  // Se conserva el índice original de cada serie: es lo que fija su color, y
  // barras y líneas se dibujan en pasadas distintas.
  const conIndice = series.map((serie, indice) => ({ serie, indice }))
  const barras = conIndice.filter(({ serie }) => !esLinea(serie))
  const lineas = conIndice.filter(({ serie }) => esLinea(serie))

  const anchoLeyenda = series.length > 1 ? ANCHO_LEYENDA : 0

  const izquierda = series.filter((s) => s.eje !== 'derecho')
  const derecha = series.filter((s) => s.eje === 'derecho')
  const hayEjeDerecho = derecha.length > 0

  // Primera pasada (con el margen base) para decidir el modo de referencia
  // de escala: si las barras van a quedar demasiado angostas para un valor
  // centrado, se usa eje en vez de etiquetas por barra. Agrandar el margen
  // izquierdo después solo angosta más las barras, así que la decisión no
  // puede oscilar.
  const margenDerecha = hayEjeDerecho ? MARGEN_DERECHA_CON_EJE : MARGEN.derecha
  const anchoUtilBase = ancho - MARGEN.izquierda - margenDerecha - anchoLeyenda
  const anchoGrupoBase = anchoUtilBase / categorias.length
  const anchoBarraBase = (anchoGrupoBase * 0.7) / Math.max(1, barras.length)
  const etiquetasValorCaben = anchoBarraBase >= ANCHO_MINIMO_ETIQUETA_VALOR
  const mostrarEtiquetasValor = barras.length > 0 && (mostrarValores ?? etiquetasValorCaben)
  // Con líneas siempre hay eje: una línea sin referencia de escala no se lee.
  const mostrarEje = lineas.length > 0 || !mostrarEtiquetasValor

  const margenIzquierda = mostrarEje ? MARGEN_IZQUIERDA_CON_EJE : MARGEN.izquierda

  // El eje izquierdo lee solo las series que le tocan; si no hay ninguna
  // marcada, las lee todas (el caso de un gráfico de un solo eje).
  const [minimoIzq, maximoIzq] = dominioDe(izquierda.length > 0 ? izquierda : series)
  const hayNegativos = minimoIzq < 0

  // La barra en el mínimo del dominio siempre termina en altoUtil, así que
  // su etiqueta de valor negativo cae cerca del borde inferior del área de
  // trazado — justo donde vive la etiqueta de categoría. Reservamos espacio
  // extra abajo (y empujamos la etiqueta de categoría ese mismo tanto más
  // abajo) solo cuando ambas etiquetas pueden coexistir: hay negativos Y se
  // están dibujando etiquetas de valor (Hallazgo 1 de este cierre).
  const necesitaEspacioNegativos = hayNegativos && mostrarEtiquetasValor
  const margenAbajo = MARGEN.abajo + (necesitaEspacioNegativos ? ESPACIO_EXTRA_ETIQUETA_NEGATIVA : 0)
  const altoUtil = alto - MARGEN.arriba - margenAbajo
  const anchoUtil = ancho - margenIzquierda - margenDerecha - anchoLeyenda

  const anchoGrupo = anchoUtil / categorias.length
  const anchoBarra = (anchoGrupo * 0.7) / Math.max(1, barras.length)
  const separacion = anchoBarra * PROPORCION_SEPARACION
  const anchoBarraDibujo = Math.max(0, anchoBarra - separacion)

  const y = escalaLineal([minimoIzq, maximoIzq], [altoUtil, 0])
  const yCero = y(0)

  const [minimoDer, maximoDer] = dominioDe(derecha)
  const yDerecha = escalaLineal([minimoDer, maximoDer], [altoUtil, 0])

  /** Cada serie se lee en SU eje: mezclarlos es dibujar el dato en el sitio equivocado. */
  const escalaDe = (serie: SerieDatos) => (serie.eje === 'derecho' ? yDerecha : y)
  /** Centro horizontal de una categoría — donde se apoyan los puntos de línea. */
  const xCentro = (indiceCategoria: number) => indiceCategoria * anchoGrupo + anchoGrupo / 2

  const ticks = mostrarEje ? generarTicks(minimoIzq, maximoIzq, NUM_TICKS_EJE) : []
  const ticksDerecha = hayEjeDerecho ? generarTicks(minimoDer, maximoDer, NUM_TICKS_EJE) : []

  return (
    <svg width="100%" viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label="Gráfico de barras y líneas">
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

        {/* El eje derecho no dibuja rejilla propia: dos rejillas cruzadas a
            distinta altura se leen como un error de impresión. Solo números. */}
        {ticksDerecha.map((tick) => (
          <text
            key={`der-${tick}`}
            data-testid="tick-derecho"
            x={anchoUtil + 6}
            y={yDerecha(tick) + 3}
            textAnchor="start"
            fill="var(--texto)"
            fillOpacity={0.7}
            fontSize="9"
            fontFamily="var(--fuente-texto)"
          >
            {Math.round(tick).toLocaleString('es-MX')}
          </text>
        ))}

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
            {barras.map(({ serie, indice }, si) => {
              const valor = serie.valores[ci] ?? 0
              const escala = escalaDe(serie)
              const yValor = escala(valor)
              const yCeroSerie = escala(0)
              // La barra se dibuja entre la línea de cero y el valor, hacia
              // arriba si es positivo y hacia abajo si es negativo — nunca
              // con altura negativa, y sin depender de que altoUtil sea el
              // "piso" (que solo es cierto cuando no hay negativos).
              const alturaBarra = Math.max(0, Math.abs(yValor - yCeroSerie))
              const yBarra = Math.min(yValor, yCeroSerie)
              const xBarra = anchoGrupo * 0.15 + si * anchoBarra
              return (
                <g key={serie.etiqueta}>
                  <rect
                    data-testid="barra"
                    // El escalonado de la animación va por CATEGORÍA, no por
                    // barra suelta: un grupo de tres barras del mismo mes
                    // crece junto, y el gráfico se construye de izquierda a
                    // derecha como se lee.
                    style={{ '--i': ci } as CSSProperties}
                    data-negativa={valor < 0 ? 'true' : undefined}
                    x={xBarra}
                    y={yBarra}
                    width={anchoBarraDibujo}
                    height={alturaBarra}
                    fill={colorDeSerie(indice)}
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
                      {formatearValor(valor, serie)}
                    </text>
                  )}
                </g>
              )
            })}
            <text
              x={anchoGrupo / 2}
              y={altoUtil + 18 + (necesitaEspacioNegativos ? ESPACIO_EXTRA_ETIQUETA_NEGATIVA : 0)}
              textAnchor="middle"
              fill="var(--texto)"
              fontSize="11"
              fontFamily="var(--fuente-texto)"
            >
              {categoria}
            </text>
          </g>
        ))}

        {/* Las líneas se dibujan DESPUÉS de las barras, encima: una meta
            escondida detrás de la barra que debe superar no sirve de nada. */}
        {lineas.map(({ serie, indice }, orden) => {
          const escala = escalaDe(serie)
          // Las etiquetas de dos series se encuentran en el mismo punto en
          // cuanto sus valores se acercan —y con doble eje eso pasa aunque las
          // magnitudes no tengan nada que ver—. Se alternan arriba y abajo por
          // orden de serie, que las separa sin depender de los datos.
          const desplazamiento = orden % 2 === 0 ? -8 : 15
          const puntos = categorias.map((_, ci) => ({
            x: xCentro(ci),
            y: escala(serie.valores[ci] ?? 0),
            valor: serie.valores[ci] ?? 0,
          }))
          const color = colorDeSerie(indice)
          const trazo = puntos.map((p) => `${p.x},${p.y}`).join(' ')
          const esMeta = serie.forma === 'linea-punteada'
          return (
            <g key={`linea-${serie.etiqueta}`}>
              {serie.forma === 'area' && (
                <polygon
                  data-testid="area"
                  points={`${xCentro(0)},${escala(0)} ${trazo} ${xCentro(categorias.length - 1)},${escala(0)}`}
                  fill={color}
                  fillOpacity={0.16}
                />
              )}
              <polyline
                data-testid={esMeta ? 'linea-meta' : 'linea'}
                // Normaliza el largo del trazo a 1: así la animación de
                // dibujado dura lo mismo con 3 puntos que con 12.
                pathLength={1}
                points={trazo}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={esMeta ? PATRON_PUNTEADO : undefined}
              />
              {/* Una meta es una referencia, no una medición: sin puntos ni
                  números por punto, para que no se lea como dato observado. */}
              {!esMeta &&
                puntos.map((p, ci) => (
                  <g key={`punto-${ci}`}>
                    <circle
                      data-testid="punto"
                      style={{ '--i': ci } as CSSProperties}
                      cx={p.x}
                      cy={p.y}
                      r={RADIO_PUNTO}
                      fill={color}
                    />
                    {mostrarValores && (
                      <text
                        x={p.x}
                        y={p.y + desplazamiento}
                        textAnchor="middle"
                        fill="var(--texto)"
                        fontSize="9"
                        fontFamily="var(--fuente-texto)"
                      >
                        {formatearValor(p.valor, serie)}
                      </text>
                    )}
                  </g>
                ))}
            </g>
          )
        })}
      </g>

      {anchoLeyenda > 0 && (
        // El carril de la leyenda (anchoLeyenda) se reserva restando de
        // anchoUtil junto con el margen derecho, así que el bloque de leyenda
        // debe arrancar justo después de ese margen — no en un gap propio —
        // para que termine exactamente en el borde del viewBox y no lo
        // desborde (Hallazgo 2: antes usaba un "16" fijo que no coincidía
        // con MARGEN.derecha y sobresalía del viewBox por la diferencia).
        <g transform={`translate(${margenIzquierda + anchoUtil + margenDerecha},${MARGEN.arriba})`}>
          {series.map((serie, si) => (
            <g key={serie.etiqueta} transform={`translate(0,${si * 18})`}>
              {esLinea(serie) ? (
                <line
                  x1="0"
                  x2="10"
                  y1="5"
                  y2="5"
                  stroke={colorDeSerie(si)}
                  strokeWidth={2}
                  strokeDasharray={serie.forma === 'linea-punteada' ? '3 2' : undefined}
                />
              ) : (
                <rect width="10" height="10" fill={colorDeSerie(si)} rx="2" />
              )}
              <text
                x={OFFSET_TEXTO_LEYENDA}
                y="9"
                fill="var(--texto)"
                fontSize="11"
                fontFamily="var(--fuente-texto)"
              >
                {truncarTexto(
                  serie.etiqueta,
                  anchoLeyenda - OFFSET_TEXTO_LEYENDA - MARGEN_SEGURIDAD_LEYENDA,
                  11,
                )}
              </text>
            </g>
          ))}
        </g>
      )}
    </svg>
  )
}
