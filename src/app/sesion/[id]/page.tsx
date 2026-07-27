import Link from 'next/link'
import { notFound } from 'next/navigation'
import estilos from '@/app/preparar/preparar.module.css'
import { obtenerSesion } from '@/db/sesiones'
import { estadoDeSala } from '@/db/consultas'
import { obtenerTema } from '@/temas'
import { DocumentoSesion, type SeccionSesion } from '@/componentes/sesion/DocumentoSesion'
import { esEquipo, puedeVerEstaSala } from '@/auth/sesion'

export const dynamic = 'force-dynamic'

/**
 * Una sesión ya presentada, en solo lectura.
 *
 * Es a donde lleva "Ver presentación" desde la sala: al documento REAL que se
 * presentó, con sus acuerdos al día. Antes ese enlace iba a `/demo/{sala}`, que
 * servía un deck de ejemplo escrito a mano en el código — un documento que
 * nadie había preparado y que no correspondía a ninguna sesión.
 *
 * El control de acceso vive aquí y no en el proxy: la ruta lleva un id de
 * sesión, no un slug de sala, así que hasta no leer la sesión no se sabe de
 * quién es. El proxy la deja pasar y esta comprobación es la que manda.
 */
export default async function PagSesionPublicada({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sesion = await obtenerSesion(id)
  if (!sesion) notFound()
  if (!(await puedeVerEstaSala(sesion.salaSlug))) notFound()

  const secciones: SeccionSesion[] = sesion.items
    .filter((i) => i.resultado != null)
    .map((i) => ({
      decision: i.resultado!.decision,
      degradado: i.resultado!.degradado,
      motivo: i.resultado!.motivo,
    }))

  if (secciones.length === 0) notFound()

  const sala = await estadoDeSala(sesion.salaSlug)
  const equipo = await esEquipo()

  return (
    <div className={estilos.app}>
      <header className={estilos.barra}>
        <Link href={`/sala/${sesion.salaSlug}`} className={estilos.volver}>← {sesion.salaNombre}</Link>
        <div className={estilos.barraTitulo}>{sesion.salaNombre}</div>
        <div className={estilos.barraDcha}>
          {equipo && (
            <Link href={`/preparar/${sesion.id}`} className={estilos.volver}>Editar →</Link>
          )}
        </div>
      </header>

      <DocumentoSesion
        tema={obtenerTema(sesion.salaSlug)}
        secciones={secciones}
        acuerdos={sala?.acuerdos ?? []}
      />
    </div>
  )
}
