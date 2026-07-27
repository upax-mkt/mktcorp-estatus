import { Suspense } from 'react'
import { maquetarSesion, type ResultadoMaquetacion } from '@/motor/maquetar'
import { MaquetandoAviso } from '@/componentes/deck/MaquetandoAviso'
import { NC_CRUDO_JUNIO_2026 } from '@/fixtures/nc-crudo-junio-2026'
import { ProveedorTema } from '@/componentes/ProveedorTema'
import { Slide } from '@/componentes/deck/Slide'
import { LayoutSeguro } from '@/componentes/deck/layouts/LayoutSeguro'
import { obtenerTema } from '@/temas'

/**
 * Vista de desarrollo del motor: llama a `maquetarSesion` con la API real
 * (etapa 2) sobre el contenido crudo de NeraCode y renderiza el resultado.
 * Nunca se prerenderiza en build (no hay red disponible ahí, y la llamada al
 * motor depende de una API key que no siempre existe en ese entorno).
 */
export const dynamic = 'force-dynamic'
// El motor llama a Claude 2 veces en serie (~25s). El default serverless de
// Vercel corta a 10s; se sube al máximo del plan. (Requiere Vercel Pro para 60s;
// en Hobby el tope es 10s y esta ruta agotaría el tiempo — /demo/{sala} no usa API.)
export const maxDuration = 60

const SLUG_SALA = 'neracode'

/** Mismo criterio de superficie clara/oscura que usa `Deck.tsx`. */
const LAYOUTS_OSCUROS = new Set(['portada', 'divisor-seccion', 'cierre'])

function AvisoSinApiKey() {
  return (
    <main style={{ width: '100%', maxWidth: 700, margin: '4rem auto', padding: '0 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>⚠ Falta ANTHROPIC_API_KEY</h1>
      <p style={{ lineHeight: 1.5 }}>
        Configura <code>ANTHROPIC_API_KEY</code> para correr el motor sobre el contenido crudo de
        NeraCode (junio 2026). Esta vista no llama a la API sin esa variable de entorno.
      </p>
      <pre style={{ background: '#111', color: '#eee', padding: '1rem', borderRadius: 8, overflowX: 'auto' }}>
{`export ANTHROPIC_API_KEY=...
npm run dev`}
      </pre>
    </main>
  )
}

function AvisoError({ error }: { error: unknown }) {
  const mensaje = error instanceof Error ? error.message : String(error)
  return (
    <main style={{ width: '100%', maxWidth: 700, margin: '4rem auto', padding: '0 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', color: '#b00020' }}>✗ El motor falló</h1>
      <p style={{ lineHeight: 1.5 }}>La sesión de NeraCode (junio 2026) no se pudo maquetar:</p>
      <pre style={{ background: '#111', color: '#eee', padding: '1rem', borderRadius: 8, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
        {mensaje}
      </pre>
    </main>
  )
}

function SlideDelResultado({ resultado, indice }: { resultado: ResultadoMaquetacion; indice: number }) {
  const { decision, degradado, motivo } = resultado
  const tema = obtenerTema(SLUG_SALA)
  const superficie = LAYOUTS_OSCUROS.has(decision.layout) ? 'oscura' : 'clara'

  return (
    <ProveedorTema key={`${decision.layout}-${indice}`} tema={tema} superficie={superficie}>
      {degradado ? (
        <LayoutSeguro decision={decision} motivo={motivo ?? 'degradado'} />
      ) : (
        <Slide decision={decision} />
      )}
    </ProveedorTema>
  )
}

/**
 * El trabajo caro, aislado en su propio componente async para que Suspense
 * pueda mandar el esqueleto de inmediato y transmitir los slides cuando el
 * motor termine, en vez de dejar la pestaña en blanco medio minuto.
 */
async function DeckDelMotor() {
  let resultados: ResultadoMaquetacion[]
  try {
    resultados = await maquetarSesion(NC_CRUDO_JUNIO_2026, SLUG_SALA)
  } catch (error) {
    return <AvisoError error={error} />
  }

  return (
    <main style={{ width: '100%', maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'grid', gap: '2rem' }}>
        {resultados.map((resultado, i) => (
          <SlideDelResultado key={i} resultado={resultado} indice={i} />
        ))}
      </div>
    </main>
  )
}

export default function PaginaMotorDemo() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return <AvisoSinApiKey />
  }

  return (
    <Suspense fallback={<MaquetandoAviso slides={NC_CRUDO_JUNIO_2026.length} />}>
      <DeckDelMotor />
    </Suspense>
  )
}
