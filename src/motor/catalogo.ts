import type { DecisionSlide } from '@/decision/esquema'
import { REGISTRO_LAYOUTS } from '@/componentes/deck/Slide'

export function layoutsImplementados(): DecisionSlide['layout'][] {
  return Object.keys(REGISTRO_LAYOUTS) as DecisionSlide['layout'][]
}

export function esLayoutImplementado(layout: DecisionSlide['layout']): boolean {
  return layout in REGISTRO_LAYOUTS
}
