import Link from 'next/link'
import { connection } from 'next/server'
import { revalidatePath } from 'next/cache'
import estilos from './deck.module.css'
import { listarReuniones, eliminarReunion, type ReunionResumen } from '@/db/reuniones'
import { documentoDeReunion, eliminarDocumentoDeReunion, type DocumentoCompleto } from '@/db/documentos'
import { obtenerMinuta } from '@/db/minutas'
import { exigirEditor, exigirLectura } from '@/auth/roles'
import { fueDada, type Reunion } from '@/dominio/reunion'
import { diaCivil, fechaBreveConAnio } from '@/lib/fecha'
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

/**
 * Adaptador: `ReunionResumen` (`db/reuniones.ts`) → `Reunion`
 * (`dominio/reunion.ts`), que es lo que pide `fueDada`.
 *
 * DUPLICADO A PROPÓSITO de `comoReunionDeDominio`
 * (`src/app/reuniones/page.tsx`, exportada con nombre para esto mismo): la
 * misma adaptación exacta, mismo motivo. Esta ronda reparte los archivos
 * entre tres agentes por RUTA EXACTA — todo `src/app/**` es de quien arregla
 * páginas, pero `dominio/reunion.ts` no está en la lista de nadie — así que
 * importar entre dos `page.tsx` de rutas distintas, o tocar un archivo sin
 * dueño explícito a media ronda con otros dos agentes escribiendo en la
 * misma carpeta, es más riesgo del que vale evitar ~15 líneas repetidas. Si
 * `dominio/reunion.ts` gana dueño algún día, este adaptador (y el de
 * `reuniones/page.tsx`) debería mudarse ahí y dejar de repetirse.
 */
function comoReunionDeDominio(r: ReunionResumen, documento: DocumentoCompleto | null): Reunion {
  return {
    id: r.id,
    fecha: r.fecha,
    titulo: r.titulo,
    tipo: r.tipo,
    estado: r.estado,
    noDadaEn: r.noDadaEn,
    documentoListo: documento?.estado === 'listo',
    archivos: Array.from({ length: r.archivos }, (_, i) => ({
      id: `${r.id}-archivo-${i}`,
      titulo: '',
      nombreOriginal: '',
      url: '',
    })),
    minuta: r.tieneMinuta ? { fecha: r.fecha, titulo: r.titulo, enviadaA: 0 } : undefined,
    acuerdos: [],
  }
}

export default async function PagPreparar() {
  // Página de equipo que faltaba exigir a nivel de página (corrección
  // post-revisión de la ronda 9): las Server Actions de aquí abajo ya
  // exigían editor por su cuenta, pero cargar la pantalla en sí no exigía
  // nada — el patrón del repo es que cada página repita la comprobación.
  await exigirLectura()
  // Sin esto Next la prerenderiza y "hoy" queda anclado a la fecha del build
  // — mismo mecanismo, mismo comentario, que `/reuniones` (`app/reuniones/page.tsx`).
  await connection()
  const hoy = new Date()
  const reuniones = await listarReuniones()
  const hoyCivil = diaCivil(hoy.toISOString())

  /**
   * `itemsLlenados`/`totalItems` no viven en `ReunionResumen` (son del
   * documento, no de la reunión) — se resuelven aquí, una consulta por
   * reunión, EN PARALELO PARA TODAS (no solo las en preparación, desde la
   * revisión final de la ronda 10): `fueDada` —hallazgos 1 y 2, más abajo—
   * necesita el documento de cualquier reunión `agendada` para decidir si ya
   * tiene respaldo, no solo de las que hoy caen en "en preparación". Mismo
   * patrón que `/reuniones` (`app/reuniones/page.tsx`): la lista es de
   * decenas, no miles, así que no es el N+1 que sería sin cota.
   */
  const documentos = await Promise.all(reuniones.map((r) => documentoDeReunion(r.id)))
  const documentosPorId = new Map(reuniones.map((r, i) => [r.id, documentos[i]]))
  const adaptadas = reuniones.map((r, i) => comoReunionDeDominio(r, documentos[i] ?? null))

  /**
   * LO QUE ESTÁ POR DELANTE contra lo que ya pasó.
   *
   * CORREGIDO (revisión final de la ronda 10, hallazgo 2 — mismo sesgo que
   * `faltaMinuta`, abajo): `estado === 'agendada'` a secas dejaba en "En
   * preparación" una reunión que `fueDada` (`dominio/reunion.ts`, escrita en
   * esta misma ronda) ya deduce como dada —con respaldo y el día pasado—,
   * duplicándola con "Por confirmar" en `/` y `/cliente/[slug]`, y con "Ya
   * dadas este mes" en `/reuniones`. `!fueDada(adaptadas[i], hoyCivil)` es la
   * mitad que faltaba: una agendada sigue aquí hasta que O ALGUIEN LA
   * CONFIRMA A MANO, O queda deducible como dada por su cuenta.
   */
  const enPreparacion = reuniones.filter((r, i) => r.estado === 'agendada' && !fueDada(adaptadas[i], hoyCivil))
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
  /**
   * CORREGIDO (revisión final de la ronda 10, hallazgo 1 — mismo sesgo que
   * "Levantar minuta"): `r.estado === 'dada'` a secas dejaba fuera una
   * reunión `agendada` pero YA maquetada (documento listo) con el día
   * pasado — `/reuniones` (`reunionesDadasEsteMesPorSala`, tarea de esta
   * misma ronda) ya deduce con `fueDada`; esta lista se había quedado con el
   * criterio viejo. Toda reunión con `fueDada` verdadero y sin minuta
   * "falta su minuta", la haya confirmado alguien a mano o no.
   */
  const faltaMinuta = reuniones.filter((r, i) => !r.tieneMinuta && fueDada(adaptadas[i], hoyCivil))

  // El texto de cada minuta, para poder descargarla desde la lista sin entrar.
  const textos = new Map(
    await Promise.all(
      cerradas.map(async (r) => [r.id, (await obtenerMinuta(r.id))?.textoFinal ?? null] as const),
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
        {/* Deck Designer → Presentaciones (tarea 18): solo el nombre
            visible, la ruta sigue siendo /deck. */}
        <div className={estilos.barraTitulo}>Presentaciones</div>
      </header>

      <main className={estilos.main}>
        <div className={estilos.encabezado}>
          <div>
            <h1 className={estilos.titulo}>Presentaciones</h1>
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
                const doc = documentosPorId.get(s.id)
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
                      reunionId={s.id}
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
                      reunionId={s.id}
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
                      reunionId={s.id}
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
