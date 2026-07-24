import type { ComponentType } from 'react'
import type { DecisionSlide } from '@/decision/esquema'
import { Portada } from './layouts/Portada'
import { KpisFilaDosColumnas } from './layouts/KpisFilaDosColumnas'

type ComponenteLayout = ComponentType<{ decision: DecisionSlide }>

/** Los layouts implementados hasta ahora. Se irá llenando con el resto del catálogo. */
const REGISTRO: Partial<Record<DecisionSlide['layout'], ComponenteLayout>> = {
  'portada': Portada,
  'kpis-fila-dos-columnas': KpisFilaDosColumnas,
}

export function Slide({ decision }: { decision: DecisionSlide }) {
  const Componente = REGISTRO[decision.layout]
  if (!Componente) {
    throw new Error(`El layout "${decision.layout}" todavía no tiene componente`)
  }
  return <Componente decision={decision} />
}
