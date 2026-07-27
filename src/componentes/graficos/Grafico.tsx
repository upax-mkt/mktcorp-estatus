import type { DecisionSlide } from '@/decision/esquema'
import type { DatosGrafico, FormaSerie } from './tipos'
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

export function Grafico({ grafico, alto = ALTO_POR_DEFECTO }: Props) {
  const forzada = FORMA_POR_TIPO[grafico.tipo]

  const datos: DatosGrafico = {
    categorias: grafico.periodos,
    series: grafico.series.map((s) => ({
      etiqueta: s.etiqueta,
      valores: s.valores,
      // El tipo manda salvo en el combo, donde cada serie trae la suya.
      forma: forzada ?? s.forma,
      eje: s.eje,
      prefijo: s.prefijo,
      sufijo: s.sufijo,
    })),
  }

  return (
    <figure className={estilos.figura}>
      {grafico.titulo && <figcaption className={estilos.titulo}>{grafico.titulo}</figcaption>}
      {/* La animación arranca cuando el gráfico llega a la pantalla, no al
          cargar la página: en un documento de quince secciones, animar todo
          de golpe es animar para nadie. */}
      <AlEntrar className={estilos.animado}>
        {grafico.tipo === 'dona' ? (
          <Dona datos={datos} alto={alto} />
        ) : HORIZONTALES.includes(grafico.tipo) ? (
          <BarrasHorizontales datos={datos} alto={alto} />
        ) : (
          <GraficoCartesiano datos={datos} alto={alto} mostrarValores={grafico.mostrarValores} />
        )}
      </AlEntrar>
    </figure>
  )
}
