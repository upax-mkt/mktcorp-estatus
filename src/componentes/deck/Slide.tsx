import type { ComponentType } from 'react'
import type { DecisionSlide } from '@/decision/esquema'
import { Portada } from './layouts/Portada'
import { KpisFilaDosColumnas } from './layouts/KpisFilaDosColumnas'
import { DivisorSeccion } from './layouts/DivisorSeccion'
import { Cierre } from './layouts/Cierre'
import { Agenda } from './layouts/Agenda'
import { TextoMulticolumna } from './layouts/TextoMulticolumna'
import { ImagenASangre } from './layouts/ImagenASangre'
import { LayoutSeguro } from './layouts/LayoutSeguro'

type ComponenteLayout = ComponentType<{ decision: DecisionSlide }>

/** Los layouts implementados hasta ahora. Se irá llenando con el resto del catálogo.
 *  Fuente única: src/motor/catalogo.ts lee este registro, no lo duplica. */
export const REGISTRO_LAYOUTS: Partial<Record<DecisionSlide['layout'], ComponenteLayout>> = {
  'portada': Portada,
  'kpis-fila-dos-columnas': KpisFilaDosColumnas,
  'divisor-seccion': DivisorSeccion,
  'cierre': Cierre,
  'agenda': Agenda,
  'texto-multicolumna': TextoMulticolumna,
  'imagen-a-sangre': ImagenASangre,
}

export function Slide({ decision }: { decision: DecisionSlide }) {
  const Componente = REGISTRO_LAYOUTS[decision.layout]
  if (!Componente) {
    return <LayoutSeguro decision={decision} motivo={`El layout "${decision.layout}" aún no tiene componente`} />
  }
  return <Componente decision={decision} />
}
