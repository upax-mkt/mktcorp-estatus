import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import estilos from '../../deck.module.css'
import { obtenerSesion } from '@/db/sesiones'
import { revalidatePath } from 'next/cache'
import { obtenerMinuta, editarTextoMinuta, eliminarMinuta, cargarMinutaExterna } from '@/db/minutas'
import { exigirEditor, exigirLectura } from '@/auth/roles'
import { directorio } from '@/db/personas'
import { diaCivil, fechaCompleta } from '@/lib/fecha'
import { MinutaCliente } from './MinutaCliente'
import { MinutaPublicada } from '@/componentes/MinutaPublicada'
import { MinutaExternaForm } from '@/componentes/MinutaExternaForm'

// La llamada a Claude (etapa 9, ~similar a la etapa 2 del motor) puede tardar
// varios segundos: el default serverless de Vercel (10s) no alcanza.
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export default async function PagMinutaSesion({ params }: { params: Promise<{ id: string }> }) {
  // Página de equipo que faltaba exigir a nivel de página (corrección
  // post-revisión de la ronda 9) — la comprobación de sesión va primero.
  await exigirLectura()
  const { id } = await params
  const sesion = await obtenerSesion(id)
  if (!sesion) notFound()

  const estiloSala = { '--sala': sesion.salaColor } as CSSProperties

  /**
   * LO QUE DECIDE ES SI LA REUNIÓN YA OCURRIÓ, no si alguien alcanzó a
   * maquetar.
   *
   * El spec §9 decía "solo disponible cuando la sesión está presentada/lista",
   * y eso se implementó como "cualquier estado que no sea borrador". Confundía
   * dos cosas distintas: que el DOCUMENTO esté maquetado y que la REUNIÓN haya
   * pasado. Una reunión se da igual aunque nadie haya tenido tiempo de
   * maquetar nada —o aunque se diera sin presentación— y el acta hace falta
   * igual. El resultado era que el motor de transcripción, que existe desde la
   * primera versión, no se encontraba.
   *
   * Lo único que sigue sin tener sentido es minutar algo que aún no ha
   * pasado: no hay nada que transcribir.
   */
  const yaOcurrio = diaCivil(sesion.fecha) <= diaCivil(new Date().toISOString())
  if (!yaOcurrio) {
    return (
      <div className={estilos.app} style={estiloSala}>
        <header className={estilos.barra}>
          <Link href={`/deck/${sesion.id}`} className={estilos.volver}>← Cuestionario</Link>
          <div className={estilos.barraTitulo}>{sesion.salaNombre} · Minuta</div>
        </header>
        <main className={estilos.main}>
          <p className={estilos.panelMaquetarAviso}>
            Esta reunión está agendada para el {fechaCompleta(sesion.fecha)}. La minuta se levanta
            cuando ya se dio: se pega su transcripción y la IA propone el acta y los acuerdos.{' '}
            <Link href={`/deck/${sesion.id}`}>Volver al cuestionario</Link>.
          </p>
        </main>
      </div>
    )
  }

  const minutaGuardada = await obtenerMinuta(id)
  // Para el selector de responsable de MinutaCliente — directorio() ya
  // aguanta Monday caído devolviendo la copia local (o [], sin ninguna).
  const personas = await directorio()

  // Publicar y corregir son cosas distintas: publicar decide qué acuerdos
  // nacen (y eso no se repite), corregir solo arregla el texto del correo.
  async function editarAction(texto: string) {
    'use server'
    await exigirEditor()
    await editarTextoMinuta(id, texto)
    revalidatePath(`/deck/${id}/minuta`)
  }

  async function eliminarAction() {
    'use server'
    await exigirEditor()
    await eliminarMinuta(id)
    revalidatePath(`/deck/${id}/minuta`)
  }

  async function cargarExternaAction(texto: string) {
    'use server'
    await exigirEditor()
    await cargarMinutaExterna(id, texto)
    revalidatePath(`/deck/${id}/minuta`)
  }

  return (
    <div className={estilos.app} style={estiloSala}>
      <header className={estilos.barra}>
        <Link href={`/deck/${sesion.id}`} className={estilos.volver}>← Cuestionario</Link>
        <div className={estilos.barraTitulo}>{sesion.salaNombre} · Minuta</div>
      </header>

      <main className={estilos.main}>
        <div className={estilos.encabezado}>
          <div>
            <h1 className={estilos.titulo}>Minuta</h1>
            <p className={estilos.subtitulo}>
              {minutaGuardada
                ? 'Esta sesión ya tiene una minuta publicada. Sus acuerdos confirmados ya viven en el espacio del cliente.'
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
            <MinutaCliente de={{ sesionId: sesion.id }} personas={personas} />
            <MinutaExternaForm cargarAction={cargarExternaAction} />
          </>
        )}
      </main>
    </div>
  )
}
