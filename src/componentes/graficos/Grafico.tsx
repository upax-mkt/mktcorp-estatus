import type { DecisionSlide } from '@/decision/esquema'
import type { DatosGrafico, FormaSerie } from './tipos'
import { colorDeSerie, esLinea } from './tipos'
import { GraficoCartesiano } from './GraficoCartesiano'
import { BarrasHorizontales } from './BarrasHorizontales'
import { Dona } from './Dona'
import { AlEntrar } from './AlEntrar'
import estilos from './grafico.module.css'

/**
 * De la decisión del motor al gráfico dibujado.
 *
 * El esquema deja al modelo elegir entre nueve `tipo`s, pero hay tres formas
 * de dibujar: ejes (barras y/o líneas), barras horizontales y dona. Este
 * módulo traduce lo uno en lo otro. La tabla es exhaustiva a propósito: un
 * `tipo` nuevo en el enum sin entrada aquí es un error de compilación, no un
 * gráfico en blanco descubierto por el director en la sesión.
 */

type TipoGrafico = NonNullable<DecisionSlide['graficos']>[number]['tipo']

/** Qué forma toma cada serie por defecto según el tipo elegido. */
const FORMA_POR_TIPO: Record<TipoGrafico, FormaSerie | null> = {
  'barras': 'barra',
  'barras-comparadas': 'barra',
  'barras-horizontales': null,
  'barras-horizontales-agrupadas': null,
  'linea': 'linea',
  'lineas-multiples': 'linea',
  'area': 'area',
  'dona': null,
  // El combo es el único donde la forma la decide cada serie: es su razón de
  // ser (volumen en barras, meta en línea punteada encima).
  'combo-barras-lineas': null,
}

const HORIZONTALES: TipoGrafico[] = ['barras-horizontales', 'barras-horizontales-agrupadas']

interface Props {
  grafico: NonNullable<DecisionSlide['graficos']>[number]
  alto?: number
}

const ALTO_POR_DEFECTO = 260
/**
 * El ancho REAL de la columna del documento (60rem). Importa porque los
 * tamaños dentro de un SVG escalan con el `viewBox`: con un lienzo de 640
 * dibujado a 909px, un rótulo de 11 se renderizaba a 15.6 y la rejilla de 1px
 * a 1.42px — un filo no entero, o sea una mancha gris. Con k≈1, 11 son 11.
 */
const ANCHO_COLUMNA = 960
/**
 * Cuánto mide cada faceta cuando un gráfico se parte en dos. Suman más que
 * uno solo a propósito: dos dibujos necesitan más papel que uno, y encogerlos
 * al 50% cada uno devuelve el aplastamiento que la partición venía a resolver.
 */
const ALTO_FACETA = 0.68

export function Grafico({ grafico, alto = ALTO_POR_DEFECTO }: Props) {
  const forzada = FORMA_POR_TIPO[grafico.tipo]

  const datos: DatosGrafico = {
    categorias: grafico.periodos,
    series: grafico.series.map((s, i) => ({
      etiqueta: s.etiqueta,
      valores: s.valores,
      // El tipo manda salvo en el combo, donde cada serie trae la suya.
      forma: forzada ?? s.forma,
      eje: s.eje,
      prefijo: s.prefijo,
      sufijo: s.sufijo,
      // El color se decide AQUÍ, viendo la lista entera, porque aquí es donde
      // se decide también el de la leyenda. Si cada faceta lo dedujera de su
      // propio orden, las dos empezarían por `--dato-1`.
      ranuraColor: i % 6,
    })),
  }

  const izquierda = datos.series.filter((s) => s.eje !== 'derecho')
  const derecha = datos.series.filter((s) => s.eje === 'derecho')
  // Dos escalas incomparables NO son un gráfico con dos ejes: alinear dos
  // escalas sobre el mismo plano inventa una correlación que el dato no tiene
  // —cada serie toca el tope del SUYO, así que dos valores sin relación caen a
  // la misma altura—. Son dos gráficos que comparten la banda horizontal.
  const dosEscalas =
    izquierda.length > 0 && derecha.length > 0 && grafico.tipo !== 'dona' && !HORIZONTALES.includes(grafico.tipo)

  return (
    <figure className={estilos.figura}>
      {grafico.titulo && <figcaption className={estilos.titulo}>{grafico.titulo}</figcaption>}

      {/* La leyenda es TEXTO y vive en HTML: dentro del SVG había que estimar
          el ancho de cada cadena y truncar a ojo, reservando el 20% del
          lienzo por si acaso. */}
      {datos.series.length > 1 && (
        <ul className={estilos.leyenda}>
          {datos.series.map((serie) => (
            <li key={serie.etiqueta}>
              <span
                className={estilos.muestra}
                data-forma={esLinea(serie) ? (serie.forma ?? 'linea') : 'barra'}
                style={{ background: colorDeSerie(serie), color: colorDeSerie(serie) }}
              />
              {serie.etiqueta}
            </li>
          ))}
        </ul>
      )}

      {/* La animación arranca cuando el gráfico llega a la pantalla, no al
          cargar la página: en un documento de quince secciones, animar todo
          de golpe es animar para nadie. */}
      <AlEntrar className={estilos.animado}>
        {grafico.tipo === 'dona' ? (
          <Dona datos={datos} ancho={ANCHO_COLUMNA} alto={alto} />
        ) : HORIZONTALES.includes(grafico.tipo) ? (
          <BarrasHorizontales datos={datos} ancho={ANCHO_COLUMNA} alto={alto} />
        ) : dosEscalas ? (
          <div className={estilos.facetas}>
            {/* Las dos miden lo mismo: son dos magnitudes distintas, no una
                principal y una nota al pie. Sólo la de abajo escribe los
                periodos — son los mismos para las dos. */}
            <GraficoCartesiano
              datos={{ ...datos, series: izquierda }}
              ancho={ANCHO_COLUMNA}
              alto={Math.round(alto * ALTO_FACETA)}
              mostrarValores={grafico.mostrarValores}
              ocultarCategorias
            />
            <GraficoCartesiano
              datos={{ ...datos, series: derecha }}
              ancho={ANCHO_COLUMNA}
              alto={Math.round(alto * ALTO_FACETA)}
              mostrarValores={grafico.mostrarValores}
            />
          </div>
        ) : (
          <GraficoCartesiano
            datos={datos}
            ancho={ANCHO_COLUMNA}
            alto={alto}
            mostrarValores={grafico.mostrarValores}
          />
        )}
      </AlEntrar>
    </figure>
  )
}
