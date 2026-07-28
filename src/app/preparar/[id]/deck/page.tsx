import Link from 'next/link'
import { notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import estilos from '../../preparar.module.css'
import { obtenerSesion, marcarPresentada } from '@/db/sesiones'
import { estadoDeSala } from '@/db/consultas'
import { temaDeSala } from '@/temas'
import { exigirEquipo } from '@/auth/sesion'
import { DocumentoSesion, type SeccionSesion } from '@/componentes/sesion/DocumentoSesion'
import { MarcarPresentada } from '@/componentes/MarcarPresentada'

// Normalmente solo lee decisiones ya guardadas (rápido); se marca igual como
// dinámica/60s porque llega aquí justo después del redirect de "Maquetar"
// (que sí llamó al motor) dentro de la misma respuesta.
export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * La sesión maquetada. Antes eran diapositivas 16:9 apiladas — un PowerPoint
 * dibujado con HTML que no se podía navegar, enlazar ni actualizar. Ahora es
 * un documento: se lee con scroll, el índice lleva a cada sección, los
 * acuerdos muestran su estado de hoy, y el botón "Presentar" lo proyecta a
 * pantalla completa sin exportar ningún archivo.
 */
export default async function PagSesionMaquetada({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sesion = await obtenerSesion(id)
  if (!sesion) notFound()

  const tema = temaDeSala(sesion.salaSlug)
  // Una reunión sin sala no tiene acuerdos vivos que mostrar: los acuerdos
  // cuelgan de una sala, y esta no pertenece a ninguna.
  const sala = sesion.salaSlug ? await estadoDeSala(sesion.salaSlug) : undefined

  const secciones: SeccionSesion[] = sesion.items
    .filter((i) => i.resultado != null)
    .map((i) => ({
      decision: i.resultado!.decision,
      degradado: i.resultado!.degradado,
      motivo: i.resultado!.motivo,
    }))

  // Cierra el ciclo: mientras nadie diga que la sesión se dio, no aparece en
  // la sala del director ni puede tener minuta. Ver `marcarPresentada`.
  async function marcarPresentadaAction() {
    'use server'
    await exigirEquipo()
    await marcarPresentada(id)
    revalidatePath(`/preparar/${id}/deck`)
    if (sesion!.salaSlug) revalidatePath(`/sala/${sesion!.salaSlug}`)
    revalidatePath('/')
  }

  const yaSePresento = sesion.estado === 'presentada' || sesion.estado === 'minutada'

  return (
    <div className={estilos.app}>
      <header className={estilos.barra}>
        <Link href={`/preparar/${sesion.id}`} className={estilos.volver}>← Cuestionario</Link>
        <div className={estilos.barraTitulo}>{sesion.salaNombre}</div>
        <div className={estilos.barraDcha}>
          {secciones.length > 0 &&
            (yaSePresento ? (
              sesion.salaSlug ? (
                <Link href={`/sala/${sesion.salaSlug}`} className={estilos.volver}>
                  Presentada · ver en la sala →
                </Link>
              ) : (
                <span className={estilos.volver}>Presentada</span>
              )
            ) : (
              <MarcarPresentada marcarAction={marcarPresentadaAction} />
            ))}
        </div>
      </header>

      {secciones.length === 0 ? (
        <main className={estilos.main}>
          <p className={estilos.panelMaquetarAviso}>
            Esta sesión todavía no se ha maquetado.{' '}
            <Link href={`/preparar/${sesion.id}`}>Vuelve al cuestionario</Link> y usa el botón «Maquetar».
          </p>
        </main>
      ) : (
        // Esta ruta ya exige equipo para entrar: quien la ve puede minutar.
        <DocumentoSesion
          tema={tema}
          secciones={secciones}
          acuerdos={sala?.acuerdos ?? []}
          sesionId={sesion.id}
          equipo
        />
      )}
    </div>
  )
}
