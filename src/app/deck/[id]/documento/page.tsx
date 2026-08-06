import Link from 'next/link'
import { notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import estilos from '../../deck.module.css'
import { obtenerReunion, marcarDada } from '@/db/reuniones'
import { documentoDeReunion } from '@/db/documentos'
import { estadoDeSala } from '@/db/consultas'
import { temaDeSala } from '@/temas'
import { cargarTemas } from '@/db/temas'
import { exigirEditor, exigirLectura } from '@/auth/roles'
import { registrarPresentacion, registrarEdicion } from '@/db/participacion'
import { DocumentoSesion, type SeccionSesion } from '@/componentes/sesion/DocumentoSesion'
import { AlImprimir } from '@/componentes/sesion/AlImprimir'
import { MarcarPresentada } from '@/componentes/MarcarPresentada'
import { directorio } from '@/db/personas'

// Normalmente solo lee decisiones ya guardadas (rápido); se marca igual como
// dinámica/60s porque llega aquí justo después del redirect de "Maquetar"
// (que sí llamó al motor) dentro de la misma respuesta.
export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * El documento maquetado de una reunión. Antes eran diapositivas 16:9 apiladas — un PowerPoint
 * dibujado con HTML que no se podía navegar, enlazar ni actualizar. Ahora es
 * un documento: se lee con scroll, el índice lleva a cada sección, los
 * acuerdos muestran su estado de hoy, y el botón "Presentar" lo proyecta a
 * pantalla completa sin exportar ningún archivo.
 */
export default async function PagSesionMaquetada({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ imprimir?: string }>
}) {
  // Página de equipo que faltaba exigir a nivel de página (corrección
  // post-revisión de la ronda 9) — la comprobación de sesión va primero.
  await exigirLectura()
  const { imprimir } = await searchParams
  const { id } = await params
  const [reunion, documento] = await Promise.all([obtenerReunion(id), documentoDeReunion(id)])
  if (!reunion) notFound()

  const tema = temaDeSala(reunion.salaSlug, await cargarTemas())
  // Una reunión sin sala no tiene acuerdos vivos que mostrar: los acuerdos
  // cuelgan de una sala (spec §4), y esta no pertenece a ninguna (comité,
  // interna de Mkt Corp — Tarea 8b). Mismo guardián que el modelo viejo
  // (`sesion.salaSlug ? await estadoDeSala(...) : undefined`, git show
  // d5396be:src/app/deck/[id]/documento/page.tsx) — `sala` sigue resolviendo
  // `undefined` más abajo (`sala?.acuerdos ?? []`, `sala?.logoUrl ?? null`).
  const sala = reunion.salaSlug ? await estadoDeSala(reunion.salaSlug) : undefined
  // Para el selector de responsable si desde aquí se levanta una minuta en
  // modo presentación — directorio() ya aguanta Monday caído.
  const personas = await directorio()

  // Sin documento (una reunión registrada solo con minuta, sin pasar por
  // "preparar") esto queda vacío: la misma rama que ya cubre "todavía no se
  // ha maquetado" más abajo.
  const secciones: SeccionSesion[] = (documento?.items ?? [])
    .filter((i) => i.resultado != null)
    .map((i) => ({
      decision: i.resultado!.decision,
      degradado: i.resultado!.degradado,
      motivo: i.resultado!.motivo,
    }))

  // Cierra el ciclo: mientras nadie diga que la reunión se dio, no aparece en
  // la sala del director ni puede tener minuta. Ver `marcarDada`.
  async function marcarPresentadaAction() {
    'use server'
    const quien = await exigirEditor()
    await marcarDada(id)
    // Enganchada al registro de participación (revisión final de la rama,
    // menores): escribe el estado de la reunión igual que «Maquetar»
    // (`maquetar()`, src/app/deck/[id]/page.tsx), que sí registra — antes
    // esta era la única acción que cambiaba el estado sin dejar constancia
    // de quién lo hizo.
    if (quien.sub) await registrarEdicion(id, quien.sub)
    revalidatePath(`/deck/${id}/documento`)
    // `!`: notFound() de arriba ya garantiza que `reunion` existe; TS no
    // retiene el estrechamiento de una const externa dentro de una Server
    // Action anidada. Pero `reunion.salaSlug` sí puede ser null de verdad
    // (comité, interna de Mkt Corp — Tarea 8b): sin sala no hay página de
    // cliente que revalidar — mismo guardián que el modelo viejo (`if
    // (sesion!.salaSlug) revalidatePath(...)`, git show
    // d5396be:src/app/deck/[id]/documento/page.tsx).
    if (reunion!.salaSlug) revalidatePath(`/cliente/${reunion!.salaSlug}`)
    revalidatePath('/')
  }

  /**
   * Deja constancia de quién abrió el modo presentación (ronda 9, tarea 4 —
   * "quiénes están en vivo interactuando"). `exigirLectura()`, no
   * `exigirEditor()`: los tres roles de equipo pueden presentar, no solo
   * quien edita.
   *
   * Este mismo `DocumentoSesion` también lo pinta `/reunion/[id]/page.tsx`,
   * a donde SÍ llega el director de una sala — por eso el try/catch: para él
   * `exigirLectura()` rechaza (no es de equipo) y no hay correo que
   * registrar, y de todos modos esto no puede tumbar el modo presentación si
   * algo falla (mismo criterio que documenta `ModoPresentar.tsx`).
   */
  async function registrarPresentacionAction(reunionId: string): Promise<void> {
    'use server'
    try {
      const quien = await exigirLectura()
      if (quien.sub) await registrarPresentacion(reunionId, quien.sub)
    } catch {
      // Sesión de sala (el director presentando en su propia sala) u otro
      // rechazo: nada que registrar.
    }
  }

  // Dos valores, no cinco: `EstadoReunion` es 'agendada' | 'dada'.
  const yaSePresento = reunion.estado === 'dada'

  return (
    <div className={estilos.app} data-imprimiendo={imprimir ? 'true' : undefined}>
      {/* Con `?imprimir=1` se lanza el diálogo del navegador al cargar: es lo
          que hay detrás de «Presentación PDF» en la lista. El PDF sale del
          MISMO render que se proyecta. */}
      {imprimir && <AlImprimir />}
      <header className={estilos.barra}>
        <Link href={`/deck/${id}`} className={estilos.volver}>← Cuestionario</Link>
        <div className={estilos.barraTitulo}>{reunion.salaNombre}</div>
        <div className={estilos.barraDcha}>
          {secciones.length > 0 &&
            (yaSePresento ? (
              // Sin sala no hay página de cliente a la que enlazar (comité,
              // interna de Mkt Corp — Tarea 8b): mismo criterio que el
              // modelo viejo (git show
              // d5396be:src/app/deck/[id]/documento/page.tsx), que mostraba
              // el estado sin convertirlo en link a ningún sitio.
              reunion.salaSlug ? (
                <Link href={`/cliente/${reunion.salaSlug}`} className={estilos.volver}>
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
            Esta reunión todavía no se ha maquetado.{' '}
            <Link href={`/deck/${id}`}>Vuelve al cuestionario</Link> y usa el botón «Maquetar».
          </p>
        </main>
      ) : (
        // Esta ruta ya exige equipo para entrar (`exigirLectura()`, arriba),
        // así que `equipo` se pasa fijo en `true` — el componente no necesita
        // volver a preguntar SI es equipo. Eso no significa "puede minutar":
        // los tres roles llegan hasta aquí, pero solo admin/editor pueden de
        // verdad generar o publicar el acta (`esEditor()` en
        // src/app/deck/[id]/minuta/acciones.ts); un viewer ve el botón, la
        // acción lo rechaza.
        <DocumentoSesion
          tema={tema}
          secciones={secciones}
          acuerdos={sala?.acuerdos ?? []}
          reunionId={id}
          equipo
          personas={personas}
          // Revisión final de la rama, punto 3: `sala` (estadoDeSala, arriba)
          // ya trae el logo real de la fila — sin esto, la portada de una
          // reunión de una sala nueva pintaba una imagen rota.
          logoUrl={sala?.logoUrl ?? null}
          registrarPresentacionAction={registrarPresentacionAction}
        />
      )}
    </div>
  )
}
