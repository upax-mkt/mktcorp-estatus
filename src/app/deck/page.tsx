import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import estilos from './deck.module.css'
import { listarReuniones, eliminarReunion } from '@/db/reuniones'
import { documentoDeReunion, eliminarDocumentoDeReunion } from '@/db/documentos'
import { obtenerMinuta } from '@/db/minutas'
import { exigirEditor, exigirLectura } from '@/auth/roles'
import { fechaBreveConAnio } from '@/lib/fecha'
import { AccionesReunion } from '@/componentes/AccionesReunion'
import { BorrarBorrador } from '@/componentes/BorrarBorrador'

export const dynamic = 'force-dynamic'

/** Dos valores, no cinco (ronda 10): `EstadoReunion` es `'agendada' | 'dada'`. */
const ETIQUETA_ESTADO: Record<string, string> = {
  agendada: 'agendada',
  dada: 'dada',
}

function etiquetaAlcance(alcance: string): string {
  return alcance === 'todos' ? 'todos los squads' : alcance
}

export default async function PagPreparar() {
  // Página de equipo que faltaba exigir a nivel de página (corrección
  // post-revisión de la ronda 9): las Server Actions de aquí abajo ya
  // exigían editor por su cuenta, pero cargar la pantalla en sí no exigía
  // nada — el patrón del repo es que cada página repita la comprobación.
  await exigirLectura()
  const reuniones = await listarReuniones()
  // Lo que está por delante (agendada, a medio llenar o ya lista para
  // presentar) contra lo que ya pasó. `EstadoReunion` solo tiene dos valores
  // (ronda 10, spec §1): una reunión es `agendada` O `dada`, nunca las dos —
  // así que a diferencia del viejo filtro (que necesitaba `fueDada` para
  // distinguir una `lista` cuyo día ya pasó, deducida como dada sin que
  // nadie lo marcara) esto ya no hace falta: `estado === 'agendada'` es
  // exactamente "todavía no confirmada", sin ambigüedad ni deducción.
  //
  // NOTA (ver el reporte de esta tarea): la deducción automática "una lista
  // con el día pasado ya se dio sola" (`fueDada`, dominio/salas.ts) no tiene
  // hoy un equivalente para reuniones — es trabajo de la Tarea 6
  // (`dominio/reunion.ts`). Mientras tanto, una reunión solo pasa a "dada"
  // cuando alguien lo confirma explícitamente (`marcarDada`); hasta
  // entonces sigue en "En preparación", aunque su día ya haya pasado.
  const enPreparacion = reuniones.filter((r) => r.estado === 'agendada')
  /**
   * QUÉ ES CADA LISTA, que antes no se sabía.
   *
   * Franco: «hay una lista que dice "Presentadas y minutadas" y no sé qué
   * son». Con razón: metía en el mismo saco dos cosas distintas —una reunión
   * que se dio y otra que además tiene su acta— y el nombre las enumeraba sin
   * separarlas.
   *
   * Ahora son dos, y la diferencia es accionable: las CERRADAS ya no piden
   * nada; las que están a medias piden exactamente una cosa, su minuta.
   */
  const cerradas = reuniones.filter((r) => r.tieneMinuta)
  const faltaMinuta = reuniones.filter((r) => !r.tieneMinuta && r.estado === 'dada')

  // El texto de cada minuta, para poder descargarla desde la lista sin entrar.
  const textos = new Map(
    await Promise.all(
      cerradas.map(async (r) => [r.id, (await obtenerMinuta(r.id))?.textoFinal ?? null] as const),
    ),
  )

  /**
   * `itemsLlenados`/`totalItems` no viven en `ReunionResumen` (son del
   * documento, no de la reunión) — se resuelven aquí, una consulta por
   * reunión en preparación, en paralelo. Mismo patrón que `app/agenda/page.tsx`.
   */
  const documentosEnPreparacion = new Map(
    await Promise.all(
      enPreparacion.map(async (r) => [r.id, await documentoDeReunion(r.id)] as const),
    ),
  )

  async function eliminarAction(id: string): Promise<{ error?: string }> {
    'use server'
    await exigirEditor()
    try {
      await eliminarReunion(id, eliminarDocumentoDeReunion)
      revalidatePath('/deck')
      revalidatePath('/')
      return {}
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'No se pudo eliminar.' }
    }
  }

  return (
    <div className={estilos.app}>
      <header className={estilos.barra}>
        <Link href="/" className={estilos.volver}>← Meeting Hub</Link>
        <div className={estilos.barraTitulo}>Deck Designer</div>
      </header>

      <main className={estilos.main}>
        <div className={estilos.encabezado}>
          <div>
            <h1 className={estilos.titulo}>Deck Designer</h1>
            {/* Ya no hay decks: el resultado es un documento web que se lee con
                scroll y se proyecta. Prometer un deck es prometer otra cosa. */}
            <p className={estilos.subtitulo}>Crear → llenar → maquetar → presentar.</p>
          </div>
          <Link href="/deck/nueva" className={`${estilos.boton} ${estilos.botonAcento}`}>
            + Nueva reunión
          </Link>
        </div>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 className={estilos.rotuloSeccion}>En preparación</h2>
          {enPreparacion.length === 0 ? (
            <p className={estilos.vacio}>Nada en preparación todavía. Arranca una reunión nueva.</p>
          ) : (
            <div className={estilos.lista}>
              {enPreparacion.map((s) => {
                const doc = documentosEnPreparacion.get(s.id)
                const totalItems = doc?.items.length ?? 0
                const itemsLlenados = doc?.items.filter((i) => i.llenado).length ?? 0
                return (
                <div key={s.id} className={estilos.fila}>
                  <Link href={`/deck/${s.id}`} className={estilos.filaIzq}>
                    <div className={estilos.filaNombre}>
                      <span className={estilos.filaPunto} style={{ background: s.salaColor }} />
                      {s.salaNombre}
                    </div>
                    <div className={estilos.filaMeta}>
                      <span>{s.tipo}</span>
                      <span className={estilos.sep}>·</span>
                      <span>{etiquetaAlcance(s.alcance)}</span>
                      <span className={estilos.sep}>·</span>
                      <span>{fechaBreveConAnio(s.fecha)}</span>
                    </div>
                  </Link>
                  <div className={estilos.filaDcha}>
                    <div className={estilos.avance}>
                      <div className={estilos.avanceBarra}>
                        <div
                          className={estilos.avanceRelleno}
                          style={{ width: `${totalItems > 0 ? Math.round((itemsLlenados / totalItems) * 100) : 0}%` }}
                        />
                      </div>
                      <span className={estilos.avanceTexto}>{itemsLlenados}/{totalItems}</span>
                    </div>
                    <span className={`${estilos.chip} ${estilos[s.estado]}`}>{ETIQUETA_ESTADO[s.estado]}</span>
                    {/* Una reunión que ya no va a ninguna parte tiene que
                        poder borrarse desde donde se ve. Sin esto, la lista
                        solo crece — y esas mismas reuniones reaparecían luego
                        en el selector de «Generar una minuta», donde no hay
                        forma de limpiarlas. */}
                    <BorrarBorrador
                      sesionId={s.id}
                      titulo={`${s.salaNombre} · ${s.titulo}`}
                      eliminarAction={eliminarAction}
                    />
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </section>

        {faltaMinuta.length > 0 && (
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 className={estilos.rotuloSeccion}>Se dieron, falta su minuta</h2>
            <div className={estilos.lista}>
              {faltaMinuta.map((s) => (
                <div key={s.id} className={estilos.fila}>
                  <Link href={`/deck/${s.id}`} className={estilos.filaIzq}>
                    <div className={estilos.filaNombre}>
                      <span className={estilos.filaPunto} style={{ background: s.salaColor }} />
                      {s.titulo}
                    </div>
                    <div className={estilos.filaMeta}>
                      <span>{s.salaNombre}</span>
                      <span className={estilos.sep}>·</span>
                      <span>{fechaBreveConAnio(s.fecha)}</span>
                    </div>
                  </Link>
                  <div className={estilos.filaDcha}>
                    <Link href={`/deck/${s.id}/minuta`} className={estilos.accionEnlace}>
                      Generar su minuta →
                    </Link>
                    {/* Poder borrarla también desde aquí. Esta lista solo
                        ofrecía "generar su minuta", así que una reunión que
                        nunca la va a tener —se canceló, se registró de más—
                        se quedaba pidiéndola para siempre. */}
                    <BorrarBorrador
                      sesionId={s.id}
                      titulo={`${s.salaNombre} · ${s.titulo}`}
                      eliminarAction={eliminarAction}
                      aviso="Se borra la reunión y su documento. No llegó a tener minuta."
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {cerradas.length > 0 && (
          <section>
            <h2 className={estilos.rotuloSeccion}>Reuniones cerradas</h2>
            <p className={estilos.rotuloNota}>
              Se presentaron y tienen su minuta. Desde aquí se descargan o se eliminan.
            </p>
            <div className={estilos.lista}>
              {cerradas.map((s) => (
                <div key={s.id} className={estilos.fila}>
                  <Link href={`/deck/${s.id}`} className={estilos.filaIzq}>
                    <div className={estilos.filaNombre}>
                      <span className={estilos.filaPunto} style={{ background: s.salaColor }} />
                      {s.titulo}
                    </div>
                    <div className={estilos.filaMeta}>
                      <span>{s.salaNombre}</span>
                      <span className={estilos.sep}>·</span>
                      <span>{fechaBreveConAnio(s.fecha)}</span>
                    </div>
                  </Link>
                  <div className={estilos.filaDcha}>
                    <AccionesReunion
                      sesionId={s.id}
                      titulo={`${s.salaNombre} · ${s.titulo}`}
                      textoMinuta={textos.get(s.id)}
                      hayDocumento={s.tieneDocumento}
                      eliminarAction={eliminarAction}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
