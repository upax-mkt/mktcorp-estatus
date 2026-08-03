import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import estilos from './deck.module.css'
import { listarSesiones, eliminarSesion } from '@/db/sesiones'
import { obtenerMinuta } from '@/db/minutas'
import { exigirEditor, exigirLectura } from '@/auth/roles'
import { fechaBreveConAnio, diaCivil } from '@/lib/fecha'
import { fueDada } from '@/dominio/salas'
import { AccionesReunion } from '@/componentes/AccionesReunion'
import { BorrarBorrador } from '@/componentes/BorrarBorrador'

export const dynamic = 'force-dynamic'

const ETIQUETA_ESTADO: Record<string, string> = {
  agendada: 'agendada',
  borrador: 'borrador',
  lista: 'lista para presentar',
  presentada: 'presentada',
  minutada: 'minutada',
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
  const sesiones = await listarSesiones()
  const hoyCivil = diaCivil(new Date().toISOString())
  // Lo que está por delante (agendado o a medio llenar) contra lo que ya pasó.
  // Una sesión 'agendada' pertenece aquí: es justo lo que hay que preparar.
  // `&& !fueDada(...)` (punto 3): una `lista` cuyo día ya pasó dejó de ser
  // trabajo en curso —la deducción automática la da por ocurrida, ver
  // `fueDada` en src/dominio/salas.ts— así que ya no pertenece aquí, sino a
  // «Se dieron, falta su minuta», más abajo.
  const enPreparacion = sesiones.filter(
    (s) => (s.estado === 'agendada' || s.estado === 'borrador' || s.estado === 'lista') && !fueDada(s, hoyCivil),
  )
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
   *
   * `fueDada`, no `estado === 'presentada' || 'minutada'` a secas (punto 3,
   * ronda "contador y presentadas"): una `lista` con el día ya pasado y sin
   * marcar como "no se dio" TAMBIÉN se dio, aunque nadie haya pulsado el
   * botón — y si le falta minuta, es justo esta lista la que tiene que
   * pedirla. Es la MISMA función que usa el pulso del mes y "la sala"; que
   * las tres respondan lo mismo es lo que evita, por ejemplo, que una
   * reunión aparezca "ya se dio" en el Home y siga en "En preparación" aquí.
   */
  const cerradas = sesiones.filter((s) => s.tieneMinuta)
  const faltaMinuta = sesiones.filter((s) => !s.tieneMinuta && fueDada(s, hoyCivil))

  // El texto de cada minuta, para poder descargarla desde la lista sin entrar.
  const textos = new Map(
    await Promise.all(
      cerradas.map(async (s) => [s.id, (await obtenerMinuta(s.id))?.textoFinal ?? null] as const),
    ),
  )

  async function eliminarAction(id: string): Promise<{ error?: string }> {
    'use server'
    await exigirEditor()
    try {
      await eliminarSesion(id)
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
            + Nueva sesión
          </Link>
        </div>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 className={estilos.rotuloSeccion}>En preparación</h2>
          {enPreparacion.length === 0 ? (
            <p className={estilos.vacio}>Nada en preparación todavía. Arranca una sesión nueva.</p>
          ) : (
            <div className={estilos.lista}>
              {enPreparacion.map((s) => (
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
                          style={{ width: `${s.totalItems > 0 ? Math.round((s.itemsLlenados / s.totalItems) * 100) : 0}%` }}
                        />
                      </div>
                      <span className={estilos.avanceTexto}>{s.itemsLlenados}/{s.totalItems}</span>
                    </div>
                    <span className={`${estilos.chip} ${estilos[s.estado]}`}>{ETIQUETA_ESTADO[s.estado]}</span>
                    {/* Un borrador que ya no va a ninguna parte tiene que
                        poder borrarse desde donde se ve. Sin esto, la lista
                        solo crece — y esas mismas sesiones reaparecían luego
                        en el selector de «Generar una minuta», donde no hay
                        forma de limpiarlas. */}
                    <BorrarBorrador
                      sesionId={s.id}
                      titulo={`${s.salaNombre} · ${s.titulo}`}
                      eliminarAction={eliminarAction}
                    />
                  </div>
                </div>
              ))}
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
                      hayDocumento={s.itemsLlenados > 0}
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
