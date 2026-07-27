import Link from 'next/link'
import { notFound } from 'next/navigation'
import estilos from '../../preparar.module.css'
import { obtenerSesion } from '@/db/sesiones'
import { estadoDeSala } from '@/db/consultas'
import { obtenerTema } from '@/temas'
import { DocumentoSesion, type SeccionSesion } from '@/componentes/sesion/DocumentoSesion'

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

  const tema = obtenerTema(sesion.salaSlug)
  const sala = await estadoDeSala(sesion.salaSlug)

  const secciones: SeccionSesion[] = sesion.items
    .filter((i) => i.resultado != null)
    .map((i) => ({
      decision: i.resultado!.decision,
      degradado: i.resultado!.degradado,
      motivo: i.resultado!.motivo,
    }))

  return (
    <div className={estilos.app}>
      <header className={estilos.barra}>
        <Link href={`/preparar/${sesion.id}`} className={estilos.volver}>← Cuestionario</Link>
        <div className={estilos.barraTitulo}>{sesion.salaNombre}</div>
      </header>

      {secciones.length === 0 ? (
        <main className={estilos.main}>
          <p className={estilos.panelMaquetarAviso}>
            Esta sesión todavía no se ha maquetado.{' '}
            <Link href={`/preparar/${sesion.id}`}>Vuelve al cuestionario</Link> y usa el botón «Maquetar».
          </p>
        </main>
      ) : (
        <DocumentoSesion tema={tema} secciones={secciones} acuerdos={sala?.acuerdos ?? []} />
      )}
    </div>
  )
}
