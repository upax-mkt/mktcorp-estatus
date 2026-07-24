import type { DecisionSlide } from '@/decision/esquema'
import { parsearDecision } from '@/decision/esquema'
import { obtenerTema } from '@/temas'
import { ProveedorTema } from '@/componentes/ProveedorTema'
import { Slide } from './Slide'

interface Props {
  decisiones: DecisionSlide[]
  slugSala: string
}

// imagen-a-sangre entra aquí también: su texto superpuesto se apoya en el
// par --superficie/--texto de la superficie oscura (ya validado ≥4.5:1),
// nunca en un color "para leer sobre imagen" inventado sin validar.
const LAYOUTS_OSCUROS = new Set(['portada', 'divisor-seccion', 'cierre', 'imagen-a-sangre'])

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
