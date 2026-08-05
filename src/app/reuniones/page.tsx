import Link from 'next/link'
import { connection } from 'next/server'
import estilos from './reuniones.module.css'
import { listarReuniones, type ReunionResumen } from '@/db/reuniones'
import { documentoDeReunion, type DocumentoCompleto } from '@/db/documentos'
import { cargarTemas, slugsDeSalas } from '@/db/temas'
import { exigirLectura } from '@/auth/roles'
import { PanelAgenda, type SesionAgendada } from '@/componentes/agenda/PanelAgenda'
import { fueDada, tienePresentacion, type Reunion } from '@/dominio/reunion'
import { fechaLarga, fechaCompleta, horaBreve, diaCivil } from '@/lib/fecha'
import { agendarReunionAction, editarReunionAction } from './acciones'

export const dynamic = 'force-dynamic'

/**
 * El ciclo entero de una reunión, en una sola pestaña (Tarea 13, ronda 10):
 * el calendario del mes y "agendar" —`PanelAgenda`, MUDADO TAL CUAL desde
 * `/agenda`, sin rediseñar— más lo nuevo, "Ya dadas este mes" con lo que le
 * falta a cada una. `/agenda` (la pantalla del equipo) ahora solo redirige
 * aquí — ver `src/app/agenda/page.tsx`. `/agenda/[token]` (la agenda
 * pública, ya compartida fuera de la empresa) no se toca ni tiene nada que
 * ver con esta migración.
 *
 * "Agenda" desaparece como nombre de sección: en pantalla todo se llama
 * "reunión".
 */

/** Lo que le falta a UNA reunión ya dada, para pintar sus etiquetas. */
export interface ReunionDadaConFaltantes {
  id: string
  titulo: string
  fecha: string // ISO
  sinPresentacion: boolean
  faltaMinuta: boolean
}

export interface GrupoDeSalaDadas {
  salaNombre: string
  salaColor: string
  reuniones: ReunionDadaConFaltantes[]
}

/**
 * Adaptador: `ReunionResumen` (`db/reuniones.ts`) → `Reunion`
 * (`dominio/reunion.ts`), que es lo que piden `fueDada`/`tienePresentacion`.
 *
 * `listarReuniones()` a propósito NO hidrata documentos/archivos/minutas
 * enteros (evitar un N+1 en una lista de decenas de reuniones — ver su
 * comentario) — solo da booleans/conteos (`tieneMinuta`, `archivos: number`)
 * y el documento se resuelve aparte, una vez por reunión, igual que ya hacía
 * `/agenda` para `itemsLlenados`/`totalItems`. `archivos`/`minuta` se
 * rellenan aquí con placeholders del tamaño/presencia justos: `fueDada` y
 * `tienePresentacion` SOLO miran `archivos.length > 0` y `Boolean(minuta)`
 * —nunca el contenido de un archivo ni el texto de una minuta—, así que un
 * placeholder no les miente. `acuerdos: []` por el mismo motivo: ninguna de
 * las dos lo toca (está en `Reunion` porque `ReunionesSala` sí lo usa; esta
 * vista no).
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

/** true si `fecha` (ISO) cae en el mismo mes civil, visto desde CDMX, que `hoyCivil`. */
function esDelMismoMes(fecha: string, hoyCivil: string): boolean {
  return diaCivil(fecha).slice(0, 7) === hoyCivil.slice(0, 7)
}

/**
 * "Ya dadas este mes", agrupadas por sala — Marketing Corp incluida (Tarea
 * 8b: una reunión sin sala —un comité, una interna— se viste con esa
 * identidad y no aparece en ninguna de las diez salas; esta vista global es
 * la única donde SÍ se ve). Se agrupa por `salaNombre`, nunca por
 * `salaSlug` —que es `null` justo en ese caso—: así "sin sala" no rompe el
 * agrupado ni sale sin nombre, porque `identidadDe` (`db/reuniones.ts`) ya
 * resolvió ese nombre antes de que esta función reciba el dato.
 *
 * `fueDada`, no `estado === 'dada'` a pelo: una reunión puede haber ocurrido
 * sin que nadie la haya confirmado a mano —tiene respaldo (documento listo,
 * un archivo, o minuta) y su día ya pasó— y esa deducción (Tarea 6) es
 * justo lo que esta vista quiere contar, no solo lo explícito.
 *
 * `hoy` es un PARÁMETRO, no `new Date()` leído aquí adentro — mismo criterio
 * que `fueDada`/`textoProxima` (`dominio/reunion.ts`, `lib/fecha.ts`): quien
 * necesita fijar "ahora" en un test lo pasa, no pelea con temporizadores.
 */
export function reunionesDadasEsteMesPorSala(
  reuniones: ReunionResumen[],
  documentos: Array<DocumentoCompleto | null>,
  hoy: Date,
): GrupoDeSalaDadas[] {
  const hoyCivil = diaCivil(hoy.toISOString())

  const grupos = new Map<string, GrupoDeSalaDadas>()
  reuniones.forEach((r, i) => {
    const adaptada = comoReunionDeDominio(r, documentos[i] ?? null)
    if (!fueDada(adaptada, hoyCivil)) return
    if (!esDelMismoMes(r.fecha, hoyCivil)) return

    if (!grupos.has(r.salaNombre)) {
      grupos.set(r.salaNombre, { salaNombre: r.salaNombre, salaColor: r.salaColor, reuniones: [] })
    }
    grupos.get(r.salaNombre)!.reuniones.push({
      id: r.id,
      titulo: r.titulo,
      fecha: r.fecha,
      sinPresentacion: !tienePresentacion(adaptada),
      faltaMinuta: !r.tieneMinuta,
    })
  })

  return [...grupos.values()]
    .map((g) => ({ ...g, reuniones: g.reuniones.sort((a, b) => b.fecha.localeCompare(a.fecha)) }))
    .sort((a, b) => a.salaNombre.localeCompare(b.salaNombre, 'es'))
}

export default async function PagReuniones() {
  // Esta página SOLO MUESTRA el mes, "agendar" y "ya dadas"; agendar/editar
  // son Server Actions aparte (src/app/reuniones/acciones.ts), cada una con
  // su propia exigencia (`exigirEditor`) — heredada de `/agenda`, no
  // reinventada.
  await exigirLectura()
  // Sin esto Next la prerenderiza y el calendario se queda anclado al día
  // del build: "hoy" sería la fecha del despliegue para siempre.
  await connection()
  const hoy = new Date()

  const [reuniones, slugsReales, registro] = await Promise.all([
    listarReuniones(),
    slugsDeSalas(),
    cargarTemas(),
  ])

  const salas = slugsReales.map((slug) => {
    const tema = registro[slug]
    return { slug, nombre: tema.nombre, color: tema.primario }
  })

  /**
   * `itemsLlenados`/`totalItems` no viven en `ReunionResumen` (son del
   * documento, no de la reunión — spec §1): se resuelven aquí, una consulta
   * por reunión en paralelo. La lista de reuniones es de decenas, no miles,
   * así que esto no es el problema de N+1 que sería en una lista sin cota.
   * El mismo `documentos` sirve también para "Ya dadas este mes" (abajo) —
   * una sola pasada, no dos.
   */
  const documentos = await Promise.all(reuniones.map((r) => documentoDeReunion(r.id)))

  const paraElPanel: SesionAgendada[] = reuniones.map((r, i) => {
    const doc = documentos[i]
    return {
      id: r.id,
      fecha: r.fecha,
      titulo: r.titulo,
      salaSlug: r.salaSlug,
      salaNombre: r.salaNombre,
      salaColor: r.salaColor,
      estado: r.estado,
      alcance: r.alcance,
      tipo: r.tipo,
      lugar: r.lugar,
      participantes: r.participantes,
      itemsLlenados: doc?.items.filter((it) => it.llenado).length ?? 0,
      totalItems: doc?.items.length ?? 0,
    }
  })

  const gruposDadas = reunionesDadasEsteMesPorSala(reuniones, documentos, hoy)
  const totalDadas = gruposDadas.reduce((n, g) => n + g.reuniones.length, 0)

  return (
    <div className={estilos.app}>
      <header className={estilos.barra}>
        <Link href="/" className={estilos.volver}>← Meeting Hub</Link>
        <div className={estilos.barraTitulo}>Reuniones</div>
        <nav className={estilos.barraDcha}>
          <Link href="/deck" className={estilos.barraLink}>Deck Designer</Link>
          <span className={estilos.barraFecha}>{fechaLarga(hoy)}</span>
        </nav>
      </header>

      <main className={estilos.main}>
        <div className={estilos.encabezado}>
          <h1 className={estilos.titulo}>Reuniones</h1>
          <p className={estilos.subtitulo}>
            El calendario del mes, agendar rápido, y las próximas — más lo ya dado, con lo que le falta a
            cada una.
          </p>
        </div>

        <PanelAgenda
          sesiones={paraElPanel}
          salas={salas}
          hoy={hoy.toISOString()}
          agendarAction={agendarReunionAction}
          editarAction={editarReunionAction}
        />

        <section className={estilos.dadasSeccion}>
          <h2 className={estilos.dadasTitulo}>
            Ya dadas este mes
            <span className={estilos.conteo}>{totalDadas}</span>
          </h2>

          {totalDadas === 0 ? (
            <p className={estilos.vacio}>Ninguna reunión de este mes se ha dado todavía.</p>
          ) : (
            <div className={estilos.dadasGrupos}>
              {gruposDadas.map((grupo) => (
                <div
                  key={grupo.salaNombre}
                  className={estilos.grupoSala}
                  style={{ '--sala': grupo.salaColor } as React.CSSProperties}
                >
                  <h3 className={estilos.grupoTitulo}>{grupo.salaNombre}</h3>
                  <ul className={estilos.listaDadas}>
                    {grupo.reuniones.map((r) => (
                      <li key={r.id} className={estilos.reunionDada}>
                        <div className={estilos.reunionDadaCabecera}>
                          <span className={estilos.reunionDadaTitulo}>{r.titulo}</span>
                          <span className={estilos.reunionDadaFecha}>
                            {fechaCompleta(r.fecha)} · {horaBreve(r.fecha)}
                          </span>
                        </div>
                        {(r.sinPresentacion || r.faltaMinuta) && (
                          <div className={estilos.faltantes}>
                            {r.sinPresentacion && (
                              <span className={`${estilos.faltante} ${estilos.sinPresentacion}`}>
                                Sin presentación
                              </span>
                            )}
                            {r.faltaMinuta && (
                              <span className={`${estilos.faltante} ${estilos.faltaMinuta}`}>
                                Falta la minuta
                              </span>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
