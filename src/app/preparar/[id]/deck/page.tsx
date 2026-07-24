import Link from 'next/link'
import { notFound } from 'next/navigation'
import estilos from '../../preparar.module.css'
import { obtenerSesion } from '@/db/sesiones'
import { obtenerTema } from '@/temas'
import { ProveedorTema } from '@/componentes/ProveedorTema'
import { Slide } from '@/componentes/deck/Slide'
import { LayoutSeguro } from '@/componentes/deck/layouts/LayoutSeguro'

// Normalmente solo lee decisiones ya guardadas (rápido); se marca igual como
// dinámica/60s porque llega aquí justo después del redirect de "Maquetar"
// (que sí llamó al motor) dentro de la misma respuesta.
export const maxDuration = 60
export const dynamic = 'force-dynamic'

/** Mismo criterio de superficie clara/oscura que usa Deck.tsx y motor-demo. */
const LAYOUTS_OSCUROS = new Set(['portada', 'divisor-seccion', 'cierre', 'imagen-a-sangre'])

export default async function PagDeckSesion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sesion = await obtenerSesion(id)
  if (!sesion) notFound()

  const tema = obtenerTema(sesion.salaSlug)
  const items = sesion.items.filter((i) => i.resultado != null)

  return (
    <div className={estilos.app}>
      <header className={estilos.barra}>
        <Link href={`/preparar/${sesion.id}`} className={estilos.volver}>← Cuestionario</Link>
        <div className={estilos.barraTitulo}>{sesion.salaNombre} · Deck</div>
      </header>

      <main className={`${estilos.main} ${estilos.mainAncho}`}>
        {items.length === 0 ? (
          <p className={estilos.panelMaquetarAviso}>
            Esta sesión todavía no se ha maquetado.{' '}
            <Link href={`/preparar/${sesion.id}`}>Vuelve al cuestionario</Link> y usa el botón «Maquetar».
          </p>
        ) : (
          <div className={estilos.deckLista}>
            {items.map((item) => {
              const resultado = item.resultado!
              const superficie = LAYOUTS_OSCUROS.has(resultado.decision.layout) ? 'oscura' : 'clara'
              // El aviso de degradación ya lo pinta LayoutSeguro por dentro
              // (mismo patrón que /motor-demo): no se duplica aquí encima.
              return (
                <div key={item.id} className={estilos.deckSlideWrap}>
                  <ProveedorTema tema={tema} superficie={superficie}>
                    {resultado.degradado ? (
                      <LayoutSeguro decision={resultado.decision} motivo={resultado.motivo ?? 'degradado'} />
                    ) : (
                      <Slide decision={resultado.decision} />
                    )}
                  </ProveedorTema>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
