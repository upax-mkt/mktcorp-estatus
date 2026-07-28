import type { CSSProperties } from 'react'
import type { DatosGrafico, SerieDatos } from './tipos'
import { colorDeSerie, esLinea, formatearValor, formatearTick } from './tipos'
import { escalaLineal } from './escalas'
import estilos from './grafico.module.css'

/**
 * El gráfico de ejes: barras agrupadas, líneas, o las dos cosas.
 *
 * UNA SOLA ESCALA. Antes admitía dos ejes, y eso fabricaba correlaciones que
 * el dato no tiene: cada serie tocaba el tope del SUYO, así que dos valores
 * sin ninguna relación acababan en la misma altura y el lector concluía que
 * "se mueven juntos". Dos magnitudes incomparables no son un gráfico con dos
 * ejes: son dos gráficos apilados que comparten la banda horizontal, y de eso
 * se encarga `Grafico.tsx`.
 *
 * SIN LEYENDA PROPIA. La leyenda es texto y vive en HTML, fuera del SVG: aquí
 * dentro no se puede medir el ancho de una cadena, así que había que estimarlo
 * y truncar a ojo, reservando el 20% del lienzo por si acaso.
 *
 * LA TIPOGRAFÍA VIENE DE CSS. Los tamaños en atributos `fontSize` son unidades
 * de usuario: escalan con el `viewBox`, así que un rótulo de 9 se renderizaba
 * a 12.8px en el documento y a 6.2px dentro de una columna. Era el único texto
 * de la página que no obedecía la escala tipográfica — y por eso el gráfico
 * siempre parecía pegado, no parte del documento.
 */

interface Props {
  datos: DatosGrafico
  alto: number
  ancho?: number
  /** Fuerza el número sobre cada punto o barra. */
  mostrarValores?: boolean
  /**
   * Calla el eje horizontal. Lo usa la faceta de ARRIBA cuando un gráfico se
   * parte en dos: las dos comparten los mismos periodos, y escribirlos dos
   * veces es una fila entera de ruido entre un dibujo y el otro.
   */
  ocultarCategorias?: boolean
}

// El margen izquierdo es CERO: los rótulos del eje se escriben sobre su propia
// línea de rejilla, dentro del área de trazado. Un carril lateral desplazaba
// el gráfico 60px a la derecha de la columna de texto, y eso es lo que lo
// hacía leerse como un objeto pegado al documento en vez de parte de él.
const MARGEN = { arriba: 22, derecha: 8, abajo: 30, izquierda: 0 }
/** Lo que queda abajo cuando el eje horizontal no se escribe. */
const MARGEN_SIN_CATEGORIAS = 6

/** Hueco de superficie entre dos barras vecinas. Fijo: no es una proporción. */
const SEPARACION_SUPERFICIE = 2
/**
 * Techo del ancho de barra, en proporción del lienzo.
 *
 * La barra no llena su carril —el sobrante de la banda es aire—, pero un tope
 * fijo la dejaba en un palito de 18 unidades cuando había seis categorías en
 * una columna de 960: el ojo leía seis rayas, no seis magnitudes. Como
 * proporción, el tope acompaña al lienzo en vez de pelearse con él.
 */
const PROPORCION_MAXIMA_BARRA = 0.05
/** Alto mínimo por marca del eje. Menos que esto, los números se apelotonan. */
const ESPACIO_POR_TICK = 30
const MAX_TICKS_EJE = 5
const RADIO_PUNTO = 4
const RADIO_BARRA = 4
const PATRON_PUNTEADO = '5 4'

/** Paso "bonito" (1, 2, 2.5, 5, 10 × 10ⁿ) inmediatamente mayor o igual al crudo. */
function pasoBonito(crudo: number): number {
  if (!Number.isFinite(crudo) || crudo <= 0) return 1
  const magnitud = 10 ** Math.floor(Math.log10(crudo))
  const n = crudo / magnitud
  const escalon = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return escalon * magnitud
}

/**
 * Marcas en números redondos. Nadie estima nada contra 4.829.
 *
 * Se comporta distinto según qué se dibuje, y esa diferencia es el punto:
 *
 * - Con BARRAS el dominio se AMPLÍA hasta la marca redonda. Si la escala
 *   acabara en el máximo del dato, la barra más alta tocaría el borde y su
 *   rótulo quedaría pegado al tick que dice exactamente el mismo número.
 * - Con LÍNEAS el dominio se RESPETA y las marcas se colocan dentro. Ampliar
 *   hasta un múltiplo redondo desperdiciaba media altura: los clics vivían
 *   entre 412 y 635 y el eje llegaba a 800, así que la línea —que se lee por
 *   su pendiente— volvía a salir casi plana.
 */
function ticksRedondos(minimo: number, maximo: number, cantidad: number, ampliar: boolean) {
  if (minimo === maximo) return { ticks: [minimo], dominio: [minimo, maximo] as [number, number] }
  const paso = pasoBonito((maximo - minimo) / Math.max(1, cantidad - 1))
  const ticks: number[] = []

  if (ampliar) {
    const desde = Math.floor(minimo / paso) * paso
    const hasta = Math.ceil(maximo / paso) * paso
    for (let v = desde; v <= hasta + paso / 2; v += paso) ticks.push(Number(v.toFixed(10)))
    return { ticks, dominio: [desde, hasta] as [number, number] }
  }

  for (let v = Math.ceil(minimo / paso) * paso; v <= maximo; v += paso) {
    ticks.push(Number(v.toFixed(10)))
  }
  // Un dominio tan estrecho que no contiene ninguna marca redonda: mejor una
  // referencia fuera de escala que un gráfico sin eje ninguno.
  if (ticks.length === 0) ticks.push(Number(((minimo + maximo) / 2).toFixed(10)))
  return { ticks, dominio: [minimo, maximo] as [number, number] }
}

/**
 * Dominio del eje.
 *
 * Una BARRA se lee por su largo, así que su base tiene que ser el cero: sin él
 * una barra negativa desaparece. Una LÍNEA se lee por su pendiente, y forzarle
 * el cero cuando la variación es del 4% la aplasta contra el techo dejando el
 * 90% del gráfico vacío — el lector ve una raya recta y concluye que no pasó
 * nada.
 */
function dominioDe(series: SerieDatos[], soloLineas: boolean): [number, number] {
  const valores = series.flatMap((s) => s.valores)
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  if (!soloLineas) return [Math.min(min, 0), Math.max(max, 0)]
  const holgura = (max - min) * 0.15 || Math.abs(max) * 0.1 || 1
  return [min - holgura, max + holgura]
}

/**
 * Barra con el extremo del DATO redondeado y la base a escuadra.
 *
 * El extremo es donde se lee el valor; la base se apoya en la línea de cero.
 * `rx` en un `<rect>` redondea las cuatro esquinas y despega la barra del
 * cero, dejando un pelo de superficie al pie de cada una.
 */
function rutaBarra(x: number, y: number, ancho: number, alto: number, negativa: boolean): string {
  const r = Math.max(0, Math.min(RADIO_BARRA, ancho / 2, alto))
  return negativa
    ? `M${x},${y} h${ancho} v${alto - r} a${r},${r} 0 0 1 ${-r},${r} h${-(ancho - 2 * r)} a${r},${r} 0 0 1 ${-r},${-r} Z`
    : `M${x},${y + alto} v${-(alto - r)} a${r},${r} 0 0 1 ${r},${-r} h${ancho - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${alto - r} Z`
}

export function GraficoCartesiano({
  datos,
  alto,
  ancho = 960,
  mostrarValores,
  ocultarCategorias,
}: Props) {
  const { categorias, series } = datos

  const conIndice = series.map((serie, indice) => ({ serie, indice }))
  const barras = conIndice.filter(({ serie }) => !esLinea(serie))
  const lineas = conIndice.filter(({ serie }) => esLinea(serie))
  const soloLineas = barras.length === 0

  // El eje YA lleva la referencia de escala: con eje se rotula selectivamente,
  // nunca cada barra. Un número por dato es ruido, no información — y producía
  // el ridículo de imprimir "7.244" dos veces a ocho píxeles de distancia, una
  // como rótulo y otra como tick.
  const mostrarEje = true
  const rotularCadaBarra = mostrarValores === true

  const margenAbajo = ocultarCategorias ? MARGEN_SIN_CATEGORIAS : MARGEN.abajo
  const altoUtil = alto - MARGEN.arriba - margenAbajo
  const anchoUtil = ancho - MARGEN.izquierda - MARGEN.derecha

  // Las marcas del eje se reparten el alto DISPONIBLE. Una faceta baja con
  // cinco números encima apelotona lo que debería ordenar.
  const cuantosTicks = Math.max(2, Math.min(MAX_TICKS_EJE, Math.floor(altoUtil / ESPACIO_POR_TICK)))
  const [minimo, maximo] = dominioDe(series, soloLineas)
  const { ticks, dominio } = ticksRedondos(minimo, maximo, cuantosTicks, !soloLineas)

  const y = escalaLineal(dominio, [altoUtil, 0])
  const yCero = y(Math.max(dominio[0], Math.min(0, dominio[1])))

  const anchoGrupo = anchoUtil / categorias.length
  const anchoCrudo = (anchoGrupo * 0.7) / Math.max(1, barras.length)
  const anchoBarra = Math.max(
    0,
    Math.min(ancho * PROPORCION_MAXIMA_BARRA, anchoCrudo - SEPARACION_SUPERFICIE),
  )
  const ocupado = anchoBarra * barras.length + SEPARACION_SUPERFICIE * Math.max(0, barras.length - 1)

  const xCentro = (i: number) => i * anchoGrupo + anchoGrupo / 2
  // El eje escribe la misma unidad que los rótulos de dato.
  const serieDeReferencia = series[0] ?? { etiqueta: '', valores: [] }

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${ancho} ${alto}`}
      role="img"
      aria-label={`Gráfico de ${series.map((s) => s.etiqueta).join(', ')} por ${categorias.join(', ')}`}
      className={estilos.lienzo}
    >
      <g transform={`translate(${MARGEN.izquierda},${MARGEN.arriba})`}>
        {mostrarEje &&
          ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={0}
                x2={anchoUtil}
                y1={y(tick)}
                y2={y(tick)}
                className={estilos.rejilla}
                shapeRendering="crispEdges"
              />
              {/* El rótulo va SOBRE su línea, dentro del área de trazado. */}
              <text x={0} y={y(tick) - 5} textAnchor="start" className={estilos.rotuloEje}>
                {/* El techo del eje decide la unidad de TODAS sus marcas. */}
                {formatearTick(tick, serieDeReferencia, ticks[ticks.length - 1])}
              </text>
            </g>
          ))}

        {/* La base es más firme que la rejilla: es donde se apoyan las barras. */}
        {!soloLineas && (
          <line
            data-testid="linea-cero"
            x1={0}
            x2={anchoUtil}
            y1={yCero}
            y2={yCero}
            className={estilos.lineaCero}
            shapeRendering="crispEdges"
          />
        )}

        {categorias.map((categoria, ci) => (
          <g key={categoria} transform={`translate(${ci * anchoGrupo},0)`}>
            {barras.map(({ serie, indice }, si) => {
              const valor = serie.valores[ci] ?? 0
              const yValor = y(valor)
              const alturaBarra = Math.max(0, Math.abs(yValor - yCero))
              const yBarra = Math.min(yValor, yCero)
              const xBarra = (anchoGrupo - ocupado) / 2 + si * (anchoBarra + SEPARACION_SUPERFICIE)
              return (
                <g key={serie.etiqueta}>
                  <path
                    data-testid="barra"
                    style={{ '--i': ci } as CSSProperties}
                    data-negativa={valor < 0 ? 'true' : undefined}
                    // La altura, explícita. La barra es un `<path>` —extremo
                    // redondeado, base a escuadra— y su geometría no se puede
                    // leer del trazado sin un parser: los arcos llevan siete
                    // números, no pares de coordenadas.
                    data-alto={alturaBarra}
                    data-base={yBarra + alturaBarra}
                    d={rutaBarra(xBarra, yBarra, anchoBarra, alturaBarra, valor < 0)}
                    fill={colorDeSerie(serie, indice)}
                  />
                  {rotularCadaBarra && (
                    <text
                      x={xBarra + anchoBarra / 2}
                      y={valor >= 0 ? yBarra - 5 : yBarra + alturaBarra + 12}
                      textAnchor="middle"
                      className={estilos.rotuloValor}
                    >
                      {formatearValor(valor, serie)}
                    </text>
                  )}
                </g>
              )
            })}
            {!ocultarCategorias && (
              <text
                x={anchoGrupo / 2}
                y={altoUtil + 20}
                textAnchor="middle"
                className={estilos.rotuloCategoria}
              >
                {categoria}
              </text>
            )}
          </g>
        ))}

        {/* Las líneas van encima de las barras: una meta escondida detrás de la
            barra que debe superar no sirve de nada. */}
        {lineas.map(({ serie, indice }) => {
          const puntos = categorias.map((_, ci) => ({
            x: xCentro(ci),
            y: y(serie.valores[ci] ?? 0),
            valor: serie.valores[ci] ?? 0,
          }))
          const color = colorDeSerie(serie, indice)
          const trazo = puntos.map((p) => `${p.x},${p.y}`).join(' ')
          const esMeta = serie.forma === 'linea-punteada'
          return (
            <g key={`linea-${serie.etiqueta}`}>
              {serie.forma === 'area' && (
                <polygon
                  data-testid="area"
                  points={`${xCentro(0)},${yCero} ${trazo} ${xCentro(categorias.length - 1)},${yCero}`}
                  fill={color}
                  fillOpacity={0.16}
                />
              )}
              <polyline
                data-testid={esMeta ? 'linea-meta' : 'linea'}
                pathLength={1}
                points={trazo}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={esMeta ? PATRON_PUNTEADO : undefined}
              />
              {/* Una meta es una referencia, no una medición: sin puntos. */}
              {!esMeta &&
                puntos.map((p, ci) => (
                  <g key={`punto-${ci}`}>
                    <circle
                      data-testid="punto"
                      data-serie={serie.etiqueta}
                      style={{ '--i': ci } as CSSProperties}
                      cx={p.x}
                      cy={p.y}
                      r={RADIO_PUNTO}
                      fill={color}
                      stroke="var(--superficie)"
                      strokeWidth={2}
                    />
                    {/* Solo el extremo: rotular todos los puntos hacía que dos
                        series acabaran con sus números encima del punto de la
                        otra. */}
                    {mostrarValores && ci === puntos.length - 1 && (
                      <text
                        data-serie={serie.etiqueta}
                        x={p.x + RADIO_PUNTO + 6}
                        y={p.y + 4}
                        textAnchor="start"
                        className={estilos.rotuloValor}
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
    </svg>
  )
}
