import Link from 'next/link'
import { notFound } from 'next/navigation'
import estilos from '@/app/deck/deck.module.css'
import { obtenerSesion } from '@/db/sesiones'
import { estadoDeSala } from '@/db/consultas'
import { temaDeSala } from '@/temas'
import { cargarTemas } from '@/db/temas'
import { DocumentoSesion, type SeccionSesion } from '@/componentes/sesion/DocumentoSesion'
import { esEquipo, puedeVerEstaSala } from '@/auth/sesion'
import { directorio } from '@/db/personas'

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
  // Una reunión que no es de ninguna sala es interna de Marketing Corp: no
  // hay director a quien enseñársela, así que la ve solo el equipo.
  const permitido = sesion.salaSlug
    ? await puedeVerEstaSala(sesion.salaSlug)
    : await esEquipo()
  if (!permitido) notFound()

  const secciones: SeccionSesion[] = sesion.items
    .filter((i) => i.resultado != null)
    .map((i) => ({
      decision: i.resultado!.decision,
      degradado: i.resultado!.degradado,
      motivo: i.resultado!.motivo,
    }))

  if (secciones.length === 0) notFound()

  const sala = sesion.salaSlug ? await estadoDeSala(sesion.salaSlug) : undefined
  const equipo = await esEquipo()
  /**
   * SOLO EQUIPO CARGA EL DIRECTORIO — no solo lo pinta condicionado
   * (corrección de revisión: fuga de datos).
   *
   * A esta página también llega el rol `sala`: es donde aterriza "Ver
   * presentación" desde su propia sala (`puedeVerEstaSala` arriba ya lo
   * confirmó). `directorio()` trae el nombre Y EL CORREO de las 24 personas
   * de Mkt Corp para el selector de responsable, que solo se ofrece a quien
   * es equipo (ver `ModoPresentar` → `MinutaCliente`).
   *
   * No basta con pasarlo igual y dejar que el componente decida no
   * mostrarlo: `personas` llega hasta `ModoPresentar`, que es `'use client'`,
   * y React serializa TODAS las props de un Client Component en el payload
   * que viaja al navegador — se rendericen o no. Condicionar el RENDER no
   * evita que el dato VIAJE; hay que condicionar la CARGA. Mismo patrón que
   * `/cliente/[slug]/page.tsx` (revisión final ronda 7, punto 7) — si vas a
   * "simplificar" este ternario, no: es justo lo que evita la fuga.
   */
  const personas = equipo ? await directorio() : []

  return (
    <div className={estilos.app}>
      <header className={estilos.barra}>
        <Link href={`/cliente/${sesion.salaSlug}`} className={estilos.volver}>← {sesion.salaNombre}</Link>
        <div className={estilos.barraTitulo}>{sesion.salaNombre}</div>
        <div className={estilos.barraDcha}>
          {equipo && (
            <Link href={`/deck/${sesion.id}`} className={estilos.volver}>Editar →</Link>
          )}
        </div>
      </header>

      <DocumentoSesion
        tema={temaDeSala(sesion.salaSlug, await cargarTemas())}
        secciones={secciones}
        acuerdos={sala?.acuerdos ?? []}
        sesionId={sesion.id}
        equipo={equipo}
        personas={personas}
        // Revisión final de la rama, punto 3: mismo motivo que en
        // /deck/[id]/documento — `sala` ya trae el logo real de la fila.
        logoUrl={sala?.logoUrl ?? null}
      />
    </div>
  )
}
