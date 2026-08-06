import Link from 'next/link'
import { notFound } from 'next/navigation'
import estilos from '@/app/deck/deck.module.css'
import { obtenerReunion } from '@/db/reuniones'
import { documentoDeReunion } from '@/db/documentos'
import { estadoDeSala } from '@/db/consultas'
import { temaDeSala } from '@/temas'
import { cargarTemas } from '@/db/temas'
import { DocumentoSesion, type SeccionSesion } from '@/componentes/sesion/DocumentoSesion'
import { puedeVerEstaSala } from '@/auth/sesion'
import { esLector, exigirLectura } from '@/auth/roles'
import { registrarPresentacion } from '@/db/participacion'
import { directorio } from '@/db/personas'

export const dynamic = 'force-dynamic'

/**
 * Una reunión ya dada, en solo lectura.
 *
 * Es a donde lleva "Ver presentación" desde la sala: al documento REAL que se
 * presentó, con sus acuerdos al día. Antes ese enlace iba a `/demo/{sala}`, que
 * servía un deck de ejemplo escrito a mano en el código — un documento que
 * nadie había preparado y que no correspondía a ninguna reunión.
 *
 * El control de acceso vive aquí y no en el proxy: la ruta lleva un id de
 * reunión, no un slug de sala, así que hasta no leer la reunión no se sabe de
 * quién es. El proxy la deja pasar y esta comprobación es la que manda.
 */
export default async function PagSesionPublicada({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [reunion, documento] = await Promise.all([obtenerReunion(id), documentoDeReunion(id)])
  if (!reunion) notFound()
  // Una reunión sin sala (comité, interna de Mkt Corp — Tarea 8b) es interna
  // de Marketing Corp: no hay director de UDN a quien enseñársela, así que
  // la ve solo el equipo — cualquiera de los tres roles, de solo lectura
  // (`esLector()`). Mismo criterio que el modelo viejo (`sesion.salaSlug ?
  // await puedeVerEstaSala(sesion.salaSlug) : await esLector()`, git show
  // d5396be:src/app/reunion/[id]/page.tsx) — terminado de cablear aquí
  // (Tarea 8c, 5-ago).
  const permitido = reunion.salaSlug ? await puedeVerEstaSala(reunion.salaSlug) : await esLector()
  if (!permitido) notFound()

  const secciones: SeccionSesion[] = (documento?.items ?? [])
    .filter((i) => i.resultado != null)
    .map((i) => ({
      decision: i.resultado!.decision,
      degradado: i.resultado!.degradado,
      motivo: i.resultado!.motivo,
    }))

  if (secciones.length === 0) notFound()

  // Sin sala no hay acuerdos vivos que mostrar: los acuerdos cuelgan de una
  // sala (spec §4), y esta no pertenece a ninguna. Mismo guardián que arriba
  // y que el modelo viejo (`sesion.salaSlug ? await estadoDeSala(...) :
  // undefined`).
  const sala = reunion.salaSlug ? await estadoDeSala(reunion.salaSlug) : undefined
  const equipo = await esLector()
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

  /**
   * Deja constancia de quién abrió el modo presentación (ronda 9, tarea 4).
   * Es EL destino de "Ver presentación" desde la sala, así que a esta acción
   * llega tanto el equipo como el director de la UDN (`permitido`, arriba, ya
   * lo confirmó) — por eso el try/catch: `exigirLectura()` solo pasa al
   * equipo, y para un director no hay correo que registrar. Tampoco puede
   * tumbar el modo presentación si algo falla (mismo criterio que documenta
   * `ModoPresentar.tsx`).
   */
  async function registrarPresentacionAction(reunionId: string): Promise<void> {
    'use server'
    try {
      const quien = await exigirLectura()
      if (quien.sub) await registrarPresentacion(reunionId, quien.sub)
    } catch {
      // Sesión de sala u otro rechazo: nada que registrar.
    }
  }

  return (
    <div className={estilos.app}>
      <header className={estilos.barra}>
        <Link href={`/cliente/${reunion.salaSlug}`} className={estilos.volver}>← {reunion.salaNombre}</Link>
        <div className={estilos.barraTitulo}>{reunion.salaNombre}</div>
        <div className={estilos.barraDcha}>
          {equipo && (
            <Link href={`/deck/${id}`} className={estilos.volver}>Editar →</Link>
          )}
        </div>
      </header>

      <DocumentoSesion
        tema={temaDeSala(reunion.salaSlug, await cargarTemas())}
        secciones={secciones}
        acuerdos={sala?.acuerdos ?? []}
        reunionId={id}
        equipo={equipo}
        personas={personas}
        // Revisión final de la rama, punto 3: mismo motivo que en
        // /deck/[id]/documento — `sala` ya trae el logo real de la fila.
        logoUrl={sala?.logoUrl ?? null}
        registrarPresentacionAction={registrarPresentacionAction}
      />
    </div>
  )
}
