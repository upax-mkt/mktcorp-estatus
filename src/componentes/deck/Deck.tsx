import type { DecisionSlide } from '@/decision/esquema'
import { parsearDecision } from '@/decision/esquema'
import { obtenerTema } from '@/temas'
import { ProveedorTema } from '@/componentes/ProveedorTema'
import { Slide } from './Slide'

interface Props {
  decisiones: DecisionSlide[]
  slugSala: string
}

const LAYOUTS_OSCUROS = new Set(['portada', 'divisor-seccion', 'cierre'])

export function Deck({ decisiones, slugSala }: Props) {
  const tema = obtenerTema(slugSala)

  return (
    <div style={{ display: 'grid', gap: '2rem' }}>
      {decisiones.map((bruta, i) => {
        const decision = parsearDecision(bruta)
        const superficie = LAYOUTS_OSCUROS.has(decision.layout) ? 'oscura' : 'clara'
        return (
          <ProveedorTema key={`${decision.layout}-${i}`} tema={tema} superficie={superficie}>
            <Slide decision={decision} />
          </ProveedorTema>
        )
      })}
    </div>
  )
}
