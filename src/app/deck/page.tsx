import Link from 'next/link'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import estilos from './deck.module.css'
import { listarReuniones, eliminarReunion, type ReunionResumen } from '@/db/reuniones'
import { documentoDeReunion, eliminarDocumentoDeReunion, type DocumentoCompleto } from '@/db/documentos'
import { obtenerMinuta } from '@/db/minutas'
import { exigirEditor, exigirLectura, esAdmin } from '@/auth/roles'
import { cerrarSesion } from '@/auth/sesion'
import { fueDada, documentoCuentaComoPresentacion, type Reunion } from '@/dominio/reunion'
import { diaCivil, fechaBreveConAnio } from '@/lib/fecha'
import { AccionesReunion } from '@/componentes/AccionesReunion'
import { BorrarBorrador } from '@/componentes/BorrarBorrador'
import { BarraNavegacion, clientesParaBarra } from '@/componentes/BarraNavegacion'

export const dynamic = 'force-dynamic'

/**
 * Dos estados, no cinco (ronda 10): `EstadoDocumento` es `'borrador' |
 * 'listo'`. AQUÍ ES EL DOCUMENTO, no la reunión (`EstadoReunion`, `'agendada'
 * | 'dada'`) — auditoría UX/UI 7-ago, importante 6: "En preparación"
 * etiquetaba cada fila con el estado de la JUNTA, que en esta sección es
 * SIEMPRE `agendada` (es el propio filtro de `enPreparacion`, más abajo) y
 * por tanto no distinguía nada entre filas. Mismo eje y mismas palabras que
 * ya usa `/deck/[id]/page.tsx` (`ETIQUETA_ESTADO`/`documentoEstado`) —no se
 * inventa un vocabulario nuevo para lo mismo.
 */
const ETIQUETA_ESTADO_DOCUMENTO: Record<string, string> = {
  borrador: 'borrador',
  listo: 'listo',
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
    // Ronda 14.3: `Reunion.plantilla` pasó a requerido — `ReunionResumen` ya
    // la trae (`db/reuniones.ts`), así que es el mismo dato real, no uno
    // inventado para satisfacer el tipo.
    plantilla: r.plantilla ?? null,
    // Ronda 13: un documento LISTO pero SIN secciones no es una presentación
    // (ver `dominio/reunion.ts`). Aquí el documento llega entero, así que las
    // secciones son sus items.
    documentoListo: documentoCuentaComoPresentacion(documento?.estado, documento?.items.length ?? 0),
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
  // `esAdmin()` (ronda 11, tarea 2): esta pantalla no lo necesitaba hasta
  // ahora — llega con `BarraNavegacion`, que condiciona Clientes/Personas.
  const [reuniones, admin, clientes] = await Promise.all([
    listarReuniones(), esAdmin(), clientesParaBarra(),
  ])
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
   * tenía la vieja `faltaMinuta`, fusionada en `anteriores` desde la tarea
   * 18): `estado === 'agendada'` a secas dejaba en "En preparación" una
   * reunión que `fueDada` (`dominio/reunion.ts`, escrita en esta misma
   * ronda) ya deduce como dada —con respaldo y el día pasado—, duplicándola
   * con "Por confirmar" en `/` y `/cliente/[slug]`. `!fueDada(adaptadas[i],
   * hoyCivil)` es la mitad que faltaba: una agendada sigue aquí hasta que O
   * ALGUIEN LA CONFIRMA A MANO, O queda deducible como dada por su cuenta —
   * momento en el que pasa a `anteriores`, más abajo (la otra mitad exacta
   * de este mismo `fueDada`).
   */
  const enPreparacion = reuniones.filter((r, i) => r.estado === 'agendada' && !fueDada(adaptadas[i], hoyCivil))
  /**
   * ANTERIORES (tarea 18) — reemplaza a "Reuniones cerradas" + "Se dieron,
   * falta su minuta". Franco, el 6-ago, mirando la app desplegada: "el deck
   * designer solo debe tener las presentaciones en preparación y
   * presentaciones anteriores ligadas o no a una reunión". Esas dos listas
   * hablaban del ciclo de vida de la JUNTA (¿tiene ya su acta?), no del
   * documento — herencia de cuando la reunión no existía como entidad
   * aparte; ahora viven en `/reuniones` ("Se dieron, falta su minuta" y
   * "Cerradas"), y aquí ya no se separa por eso.
   *
   * `fueDada` es la otra mitad exacta de "En preparación" (arriba usa
   * `!fueDada` sobre el mismo `adaptadas[i]`): las dos son la partición
   * completa de `reuniones`, así que ninguna reunión puede faltar de las dos
   * a la vez ni sobrar en las dos a la vez — la regla dura de esta tarea.
   *
   * "Se ordena por la presentación", el matiz que Franco subrayó: hoy
   * `documentos.reunion_id` es `NOT NULL`, así que en la práctica cada
   * presentación cuelga de exactamente una reunión y no hay una fecha propia
   * de "presentación" que ordenar aparte de la de su reunión — no se inventa
   * un modelo nuevo para esto. Se ordena por esa fecha, la más reciente
   * primero, mismo criterio que el resto de listas de este tipo en la app
   * (`reunionesDeSala`, `reunionesMinutables`...).
   */
  const anteriores = reuniones
    .filter((r, i) => fueDada(adaptadas[i], hoyCivil))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))

  // El texto de cada minuta, para poder descargarla desde la lista sin
  // entrar — solo para las que de verdad tienen una: `AccionesReunion` ya
  // ofrece "+ Levantar minuta" cuando `textoMinuta` llega `undefined`, así
  // que pedirla para las que no tienen sería una consulta desperdiciada.
  const textos = new Map(
    await Promise.all(
      anteriores
        .filter((r) => r.tieneMinuta)
        .map(async (r) => [r.id, (await obtenerMinuta(r.id))?.textoFinal ?? null] as const),
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

  // Mismo patrón que `salir` en `src/app/page.tsx` (Home): repetido a
  // propósito en cada pantalla que monta `BarraNavegacion`, no centralizado
  // en `@/auth/sesion` — esta ronda reparte los archivos entre cuatro
  // agentes por RUTA EXACTA, y `auth/sesion.ts` no está en la lista de
  // ninguno; tocarlo a media ronda es más riesgo del que vale evitar cuatro
  // líneas repetidas (mismo criterio que ya documenta
  // `comoReunionDeDominio`, más arriba, para el mismo problema).
  async function salir() {
    'use server'
    await cerrarSesion()
    redirect('/entrar')
  }

  return (
    <div className={estilos.app}>
      <BarraNavegacion seccionActiva="deck" hoy={hoy} admin={admin} clientes={clientes} salirAction={salir} />

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
                /**
                 * Auditoría UX/UI 7-ago, importante 6: el estado que se
                 * enseña aquí es del DOCUMENTO (`doc?.estado`), no de la
                 * reunión (`s.estado`, que en esta sección es siempre
                 * `agendada`). Sin documento, `'borrador'` — mismo criterio
                 * de "nada maquetado todavía" que ya usa `documentoEstado`
                 * en `/deck/[id]/page.tsx`.
                 */
                const estadoDocumento = doc?.estado ?? 'borrador'
                return (
                <div key={s.id} className={estilos.fila}>
                  <Link href={`/deck/${s.id}`} className={estilos.filaIzq}>
                    {/* Título de la reunión arriba, sala abajo: paridad con
                        "Anteriores" (auditoría UX/UI 7-ago, importante 6 —
                        "las dos mitades de Presentaciones no hablan igual").
                        Antes titulaba con `s.salaNombre` y el título de la
                        reunión no se mostraba en ningún sitio de esta fila. */}
                    <div className={estilos.filaNombre}>
                      <span className={estilos.filaPunto} style={{ background: s.salaColor }} />
                      {s.titulo}
                    </div>
                    <div className={estilos.filaMeta}>
                      <span>{s.salaNombre}</span>
                      <span className={estilos.sep}>·</span>
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
                    <span className={`${estilos.chip} ${estilos[estadoDocumento]}`}>{ETIQUETA_ESTADO_DOCUMENTO[estadoDocumento]}</span>
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

        {/* ANTERIORES (tarea 18): las presentaciones ya dadas, con o sin
            minuta — esa pregunta vive en Reuniones ahora. SIEMPRE visible,
            con vacío explícito cuando no hay ninguna todavía: mismo criterio
            que "En preparación", arriba — las dos son la partición completa
            de `reuniones` (`fueDada`/`!fueDada`), así que tiene sentido que
            las dos se comporten igual en vez de que una se esconda. */}
        <section>
          <h2 className={estilos.rotuloSeccion}>Anteriores</h2>
          <p className={estilos.rotuloNota}>
            Ya se dieron — con o sin minuta todavía. Desde aquí se descargan o se eliminan.
          </p>
          {anteriores.length === 0 ? (
            <p className={estilos.vacio}>Ninguna presentación anterior todavía.</p>
          ) : (
            <div className={estilos.lista}>
              {anteriores.map((s) => (
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
          )}
        </section>
      </main>
    </div>
  )
}
