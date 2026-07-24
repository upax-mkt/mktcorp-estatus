import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import estilos from '../../preparar.module.css'
import { obtenerSesion } from '@/db/sesiones'
import { obtenerMinuta } from '@/db/minutas'
import { CopiarBoton } from '@/componentes/CopiarBoton'
import { MinutaCliente } from './MinutaCliente'

// La llamada a Claude (etapa 9, ~similar a la etapa 2 del motor) puede tardar
// varios segundos: el default serverless de Vercel (10s) no alcanza.
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export default async function PagMinutaSesion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sesion = await obtenerSesion(id)
  if (!sesion) notFound()

  const estiloSala = { '--sala': sesion.salaColor } as CSSProperties

  // Gate del spec §9: "Solo disponible cuando la sesión está presentada/lista."
  // Hoy ningún flujo mueve una sesión a 'presentada' todavía (pendiente el
  // modo Presentar); el criterio real es "ya se maquetó" — cualquier estado
  // que no sea 'borrador'.
  if (sesion.estado === 'borrador') {
    return (
      <div className={estilos.app} style={estiloSala}>
        <header className={estilos.barra}>
          <Link href={`/preparar/${sesion.id}`} className={estilos.volver}>← Cuestionario</Link>
          <div className={estilos.barraTitulo}>{sesion.salaNombre} · Minuta</div>
        </header>
        <main className={estilos.main}>
          <p className={estilos.panelMaquetarAviso}>
            La minuta solo está disponible cuando la sesión ya está lista o presentada.{' '}
            <Link href={`/preparar/${sesion.id}`}>Vuelve al cuestionario</Link> y usa el botón «Maquetar» primero.
          </p>
        </main>
      </div>
    )
  }

  const minutaGuardada = await obtenerMinuta(id)

  return (
    <div className={estilos.app} style={estiloSala}>
      <header className={estilos.barra}>
        <Link href={`/preparar/${sesion.id}`} className={estilos.volver}>← Cuestionario</Link>
        <div className={estilos.barraTitulo}>{sesion.salaNombre} · Minuta</div>
      </header>

      <main className={estilos.main}>
        <div className={estilos.encabezado}>
          <div>
            <h1 className={estilos.titulo}>Minuta</h1>
            <p className={estilos.subtitulo}>
              {minutaGuardada
                ? 'Esta sesión ya tiene una minuta publicada. Sus acuerdos confirmados ya viven en la sala.'
                : 'Pega la transcripción de la reunión y genera el correo con la IA — nada se publica sin revisión.'}
            </p>
          </div>
        </div>

        {minutaGuardada ? (
          <div className={estilos.minutaCorreoWrap}>
            <div className={estilos.minutaCorreoCabecera}>
              <span className={estilos.campoInlineLabel}>Texto enviado</span>
              <CopiarBoton
                texto={minutaGuardada.textoFinal ?? ''}
                className={`${estilos.boton} ${estilos.botonSecundario} ${estilos.botonChico}`}
              />
            </div>
            <pre className={estilos.minutaCorreo}>{minutaGuardada.textoFinal}</pre>
          </div>
        ) : (
          <MinutaCliente sesionId={sesion.id} />
        )}
      </main>
    </div>
  )
}
