import type { DecisionSlide } from '@/decision/esquema'
import { layoutsDelCatalogo, tipoDeSeccion } from '@/secciones/catalogo'

/**
 * Los layouts que el motor puede ofrecerle al modelo cuando se le pide que
 * proponga una sección.
 *
 * Fuente única: el catálogo de secciones (`src/secciones/catalogo.ts`), el
 * mismo del que come el editor manual. Así la IA nunca puede proponer un tipo
 * de sección que el equipo no podría haber armado a mano, ni al revés.
 */
export function layoutsImplementados(): DecisionSlide['layout'][] {
  return layoutsDelCatalogo()
}

export function esLayoutImplementado(layout: DecisionSlide['layout']): boolean {
  return tipoDeSeccion(layout) !== undefined
}
