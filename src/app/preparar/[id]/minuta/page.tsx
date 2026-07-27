import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import estilos from '../../preparar.module.css'
import { obtenerSesion } from '@/db/sesiones'
import { revalidatePath } from 'next/cache'
import { obtenerMinuta, editarTextoMinuta, eliminarMinuta, cargarMinutaExterna } from '@/db/minutas'
import { exigirEquipo } from '@/auth/sesion'
import { MinutaCliente } from './MinutaCliente'
import { MinutaPublicada } from '@/componentes/MinutaPublicada'
import { MinutaExternaForm } from '@/componentes/MinutaExternaForm'

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

  // Publicar y corregir son cosas distintas: publicar decide qué acuerdos
  // nacen (y eso no se repite), corregir solo arregla el texto del correo.
  async function editarAction(texto: string) {
    'use server'
    await exigirEquipo()
    await editarTextoMinuta(id, texto)
    revalidatePath(`/preparar/${id}/minuta`)
  }

  async function eliminarAction() {
    'use server'
    await exigirEquipo()
    await eliminarMinuta(id)
    revalidatePath(`/preparar/${id}/minuta`)
  }

  async function cargarExternaAction(texto: string) {
    'use server'
    await exigirEquipo()
    await cargarMinutaExterna(id, texto)
    revalidatePath(`/preparar/${id}/minuta`)
  }

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
          <MinutaPublicada
            texto={minutaGuardada.textoFinal ?? ''}
            editarAction={editarAction}
            eliminarAction={eliminarAction}
          />
        ) : (
          <>
            <MinutaCliente sesionId={sesion.id} />
            <MinutaExternaForm cargarAction={cargarExternaAction} />
          </>
        )}
      </main>
    </div>
  )
}
