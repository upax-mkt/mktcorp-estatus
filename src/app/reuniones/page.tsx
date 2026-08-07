import Link from 'next/link'
import { connection } from 'next/server'
import estilos from './reuniones.module.css'
import { listarReuniones, type ReunionResumen } from '@/db/reuniones'
import { documentoDeReunion, type DocumentoCompleto } from '@/db/documentos'
import { cargarTemas, slugsDeSalas } from '@/db/temas'
import { slugsDeSalasPausadas } from '@/db/salas'
import { exigirLectura } from '@/auth/roles'
import { PanelAgenda, type SesionAgendada } from '@/componentes/agenda/PanelAgenda'
import { ReunionesPorConfirmar } from '@/componentes/ReunionesPorConfirmar'
import type { SesionPorConfirmar } from '@/dominio/salas'
import { reunionesPorConfirmar, reunionesMinutables, type Reunion } from '@/dominio/reunion'
import { fechaLarga, fechaCompleta, horaBreve, diaCivil } from '@/lib/fecha'
import {
  agendarReunionAction, editarReunionAction,
  marcarPresentadaAction, marcarNoDadaAction, desmarcarNoDadaAction,
} from './acciones'

export const dynamic = 'force-dynamic'

/**
 * EL CICLO DE VIDA ENTERO DE UNA REUNIÓN, en una sola pestaña (Tarea 13,
 * ronda 10; ampliada en la Tarea 18; "Próximas" bajó al flujo en la ronda 11,
 * tarea 4). El calendario del mes y "agendar" — `PanelAgenda`, MUDADO TAL
 * CUAL desde `/agenda` en la ronda 10 (su calendario no se ha vuelto a
 * tocar) — más las CUATRO preguntas de esta pantalla: "Próximas" (¿qué
 * sigue?) y, una vez que el día de la reunión ya llegó, "Por confirmar"
 * (¿se dio?), "Se dieron, falta su minuta" (ocurrió y no está el acta) y
 * "Cerradas" (dada y minutada). `/agenda` (la pantalla del equipo) ahora
 * solo redirige aquí — ver `src/app/agenda/page.tsx`. `/agenda/[token]` (la
 * agenda pública, ya compartida fuera de la empresa) no se toca ni tiene
 * nada que ver con esta migración.
 *
 * TAREA 18 — "CADA COSA EN SU PESTAÑA": tres módulos nuevos reemplazan al
 * viejo bloque único "Ya dadas este mes" (con sus etiquetas "Sin
 * presentación"/"Falta la minuta"), que mezclaba el ciclo de vida de la
 * JUNTA con el de su documento. Franco, el 6-ago: "en la pestaña Reuniones
 * ahí debe vivir el módulo Se dieron pero falta su minuta, reuniones
 * cerradas, reuniones pendientes...". `/deck` (Presentaciones) se queda solo
 * con "En preparación" y "Anteriores" — ver `src/app/deck/page.tsx`.
 *
 * RONDA 11, TAREA 4 — "PRÓXIMAS" BAJA DEL PANEL AL FLUJO: hasta esta tarea,
 * "Lo que viene" vivía DENTRO de `PanelAgenda`, en un panel lateral de
 * 22rem junto al calendario. Franco, el 6-ago: "en la pestaña Reuniones 'lo
 * que viene' déjalo abajo del calendario al igual que las otras listas, se
 * desarma todo cuando hay muchas" — sintomático de volumen (una columna
 * angosta que solo crece verticalmente, no de una preferencia estética.
 * "Próximas" SIGUE viviendo dentro de `PanelAgenda` (ahí es donde vive
 * "editar" una reunión ya agendada, y sacarla de ahí habría exigido un
 * componente cliente nuevo solo para conservar esa capacidad — fuera del
 * par de archivos de esta tarea); lo que se mudó AQUÍ es el CÁLCULO de qué
 * reuniones le tocan: `cicloDeReuniones` ahora resuelve "próximas" como un
 * cuarto módulo (mismo criterio que ya tenía `PanelAgenda`: no dada, día
 * de hoy o después), EXCLUYENDO lo que ya se quedó en los otros tres — ver
 * el comentario completo más abajo, en la función. Sin esa exclusión, una
 * reunión de HOY con presentación lista pero sin confirmar salía a la vez
 * en "Próximas" y en "Falta su minuta" (el solape que encontró el intento
 * anterior de esta tarea). `page.tsx` le pasa la lista de ids ya resuelta
 * (`idsProximas`) a `PanelAgenda`, que la cruza contra su propio `sesiones`
 * (la lista completa, sin filtrar — la sigue necesitando el calendario)
 * para pintar cada fila con sus datos completos.
 *
 * "Agenda" desaparece como nombre de sección: en pantalla todo se llama
 * "reunión".
 */

/** Una reunión ya resuelta (confirmada o deducida), lista para "falta su minuta" o "cerradas". */
export interface ReunionEnCiclo {
  id: string
  titulo: string
  fecha: string // ISO
  salaSlug: string | null
  salaNombre: string
  salaColor: string
}

export interface CicloDeReuniones {
  /** "Lo que viene" (ronda 11, tarea 4) — no dada, día de hoy o después. Ver el comentario de `cicloDeReuniones` para el porqué vive aquí y no solo en `PanelAgenda`. */
  proximas: ReunionEnCiclo[]
  porConfirmar: SesionPorConfirmar[]
  faltaMinuta: ReunionEnCiclo[]
  cerradas: ReunionEnCiclo[]
}

/**
 * Adaptador: `ReunionResumen` (`db/reuniones.ts`) → `Reunion`
 * (`dominio/reunion.ts`), que es lo que piden `reunionesPorConfirmar`/
 * `reunionesMinutables` (usadas por `cicloDeReuniones`, más abajo — las dos
 * llaman por dentro a `fueDada`/`tienePresentacion`, aunque este archivo ya
 * no las llame por su nombre directamente).
 *
 * `listarReuniones()` a propósito NO hidrata documentos/archivos/minutas
 * enteros (evitar un N+1 en una lista de decenas de reuniones — ver su
 * comentario) — solo da booleans/conteos (`tieneMinuta`, `archivos: number`)
 * y el documento se resuelve aparte, una vez por reunión, igual que ya hacía
 * `/agenda` para `itemsLlenados`/`totalItems`. `archivos`/`minuta` se
 * rellenan aquí con placeholders del tamaño/presencia justos: lo que de
 * verdad se mira aguas abajo es `archivos.length > 0` y `Boolean(minuta)`
 * —nunca el contenido de un archivo ni el texto de una minuta—, así que un
 * placeholder no miente. `acuerdos: []` por el mismo motivo: nada de esta
 * página lo toca (está en `Reunion` porque `ReunionesSala` sí lo usa).
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

/**
 * LAS CUATRO PREGUNTAS DEL CICLO (Tarea 18 para las tres primeras; "próximas"
 * se sumó en la ronda 11, tarea 4): "¿qué sigue?" y, una vez que el día de
 * la reunión ya llegó, "¿se dio?", "¿falta su minuta?" y "¿ya cerró?".
 *
 * LA REGLA DURA: NINGUNA REUNIÓN EN DOS MÓDULOS A LA VEZ. Es exactamente el
 * defecto que la revisión final de la ronda 10 ya arregló una vez, entre "En
 * preparación" y "Por confirmar" en `/deck` — volver a introducirlo aquí
 * sería peor que no haber tocado nada.
 *
 * `reunionesPorConfirmar` y `reunionesMinutables` (`dominio/reunion.ts`) son
 * la fuente —no se reescribe su criterio a mano— pero NO son, cada una por
 * su cuenta, mutuamente excluyentes entre sí: una reunión `agendada`, con
 * respaldo y el día ya pasado, cumple las dos a la vez —`reunionesPorConfirmar`
 * porque nadie ha dicho si se dio, `reunionesMinutables` porque
 * `tienePresentacion` ya es cierto—, y `guardarMinuta` (`src/db/minutas.ts`)
 * NO toca `estado` a propósito, así que hasta una reunión YA MINUTADA puede
 * seguir sin confirmar. Por eso "falta su minuta" y "cerradas" EXCLUYEN
 * explícitamente lo que "por confirmar" ya se quedó (`idsPorConfirmar`,
 * abajo): la pregunta "¿se dio?" manda mientras siga abierta — el resto de
 * la pantalla espera su respuesta antes de contar la reunión como algo más.
 *
 * "PRÓXIMAS" (ronda 11, tarea 4): mismo criterio que ya usaba `PanelAgenda`
 * en su panel lateral —`estado !== 'dada' && diaCivil(fecha) >= hoyCivil`—,
 * calculado aquí ahora para poder EXCLUIR lo que ya resolvieron los otros
 * tres módulos. Hace falta: `reunionesMinutables` acepta el día de HOY
 * (`<=`, no `<` — "minutar no espera al día siguiente", ver su comentario en
 * `dominio/reunion.ts`), así que una reunión DE HOY, todavía `agendada` pero
 * con presentación lista, cumplía el criterio de "próximas" (su día es hoy,
 * `>= hoyCivil`) Y el de "falta su minuta" (`tienePresentacion`) a la vez —
 * el mismo patrón de solape que ya resolvían los otros tres entre sí, ahora
 * extendido a un cuarto módulo. Por construcción, "próximas" nunca podía
 * solaparse con `porConfirmar` (esa exige día ANTES de hoy, `<`; "próximas"
 * exige día de hoy o después, `>=` — rangos disjuntos), pero se excluye
 * igual: así el invariante depende de la exclusión explícita, no de que dos
 * comparaciones de fecha mantenidas por separado seguirán siendo disjuntas
 * para siempre.
 *
 * `hoyCivil` es un PARÁMETRO, no `new Date()` leído aquí adentro — mismo
 * criterio que `fueDada` (`dominio/reunion.ts`): quien necesita fijar "ahora"
 * en un test lo pasa, no pelea con temporizadores.
 */
export function cicloDeReuniones(
  reuniones: ReunionResumen[],
  documentos: Array<DocumentoCompleto | null>,
  pausadas: Set<string>,
  hoyCivil: string,
): CicloDeReuniones {
  const adaptadas = reuniones.map((r, i) => comoReunionDeDominio(r, documentos[i] ?? null))
  const porId = new Map(reuniones.map((r, i) => [r.id, { r, adaptada: adaptadas[i] }]))

  // `salaActiva` solo se pega para lo que `reunionesPorConfirmar` necesita
  // (confirmar/negar es "gestión", y una sala en pausa no la admite — mismo
  // criterio que `crearReunion`); `undefined` cuando la reunión no es de
  // ninguna sala (un comité), que es "no hay freeze que preguntar", no
  // "pausada".
  const conActiva = reuniones.map((r, i) => ({
    ...adaptadas[i],
    salaActiva: r.salaSlug ? !pausadas.has(r.salaSlug) : undefined,
  }))

  const porConfirmarCrudo = reunionesPorConfirmar(conActiva, hoyCivil)
  const idsPorConfirmar = new Set(porConfirmarCrudo.map((r) => r.id))

  const porConfirmar: SesionPorConfirmar[] = porConfirmarCrudo.map((r) => {
    const { r: original } = porId.get(r.id)!
    return {
      id: r.id,
      titulo: r.titulo,
      fecha: r.fecha,
      salaSlug: original.salaSlug,
      salaNombre: original.salaNombre,
      salaColor: original.salaColor,
      noDadaEn: r.noDadaEn,
    }
  })

  const faltaMinuta: ReunionEnCiclo[] = reunionesMinutables(adaptadas, hoyCivil)
    .filter((r) => !idsPorConfirmar.has(r.id))
    .map((r) => {
      const { r: original } = porId.get(r.id)!
      return {
        id: r.id, titulo: r.titulo, fecha: r.fecha,
        salaSlug: original.salaSlug, salaNombre: original.salaNombre, salaColor: original.salaColor,
      }
    })

  const cerradas: ReunionEnCiclo[] = adaptadas
    .filter((r) => Boolean(r.minuta))
    .filter((r) => !idsPorConfirmar.has(r.id))
    .map((r) => {
      const { r: original } = porId.get(r.id)!
      return {
        id: r.id, titulo: r.titulo, fecha: r.fecha,
        salaSlug: original.salaSlug, salaNombre: original.salaNombre, salaColor: original.salaColor,
      }
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha))

  // "Próximas" (ronda 11, tarea 4) — ver el comentario de la función para el
  // porqué de las tres exclusiones. `idsFaltaMinuta`/`idsCerradas` cierran el
  // solape real (una reunión de HOY con presentación lista y sin confirmar);
  // `idsPorConfirmar` es estructuralmente redundante (rangos de fecha ya
  // disjuntos, `<` contra `>=`) pero se deja explícita a propósito.
  const idsFaltaMinuta = new Set(faltaMinuta.map((r) => r.id))
  const idsCerradas = new Set(cerradas.map((r) => r.id))
  const proximas: ReunionEnCiclo[] = adaptadas
    .filter((r) => r.estado !== 'dada')
    .filter((r) => diaCivil(r.fecha) >= hoyCivil)
    .filter((r) => !idsPorConfirmar.has(r.id))
    .filter((r) => !idsFaltaMinuta.has(r.id))
    .filter((r) => !idsCerradas.has(r.id))
    .map((r) => {
      const { r: original } = porId.get(r.id)!
      return {
        id: r.id, titulo: r.titulo, fecha: r.fecha,
        salaSlug: original.salaSlug, salaNombre: original.salaNombre, salaColor: original.salaColor,
      }
    })
    // Ascendente —la más próxima primero—, al revés que los otros tres: ahí
    // lo urgente es lo más RECIENTE (mirar atrás); aquí es lo más CERCANO
    // (mirar adelante). Mismo orden que ya usaba `PanelAgenda`.
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  return { proximas, porConfirmar, faltaMinuta, cerradas }
}

export default async function PagReuniones() {
  // Esta página SOLO MUESTRA el mes, "agendar" y el ciclo de vida; escribir
  // (agendar/editar/marcar dada/marcar no dada/desmarcar) son Server Actions
  // aparte (src/app/reuniones/acciones.ts), cada una con su propia exigencia
  // (`exigirEditor`) — heredada de `/agenda` para las dos primeras, sumada en
  // la tarea 18 para las otras tres.
  await exigirLectura()
  // Sin esto Next la prerenderiza y el calendario se queda anclado al día
  // del build: "hoy" sería la fecha del despliegue para siempre.
  await connection()
  const hoy = new Date()

  const [reuniones, slugsReales, registro, pausadas] = await Promise.all([
    listarReuniones(),
    slugsDeSalas(),
    cargarTemas(),
    // Para que "Por confirmar" respete el freeze de sala (tarea 18) — mismo
    // criterio que ya usa el Home (`estadoDeSalas()[].activa`) y la vista de
    // sala (`s.activa`), aquí resuelto aparte porque esta pantalla parte de
    // `listarReuniones()` (una lista plana), no de `estadoDeSalas()`.
    slugsDeSalasPausadas(),
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
   * El mismo `documentos` sirve también para `cicloDeReuniones` (abajo) —
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

  const hoyCivil = diaCivil(hoy.toISOString())
  const ciclo = cicloDeReuniones(reuniones, documentos, pausadas, hoyCivil)
  // Solo los ids, ya deduplicados y en orden (la más próxima primero) —
  // `PanelAgenda` los cruza contra su propio `sesiones` (sin filtrar, con
  // TODOS los campos) para pintar cada fila. Ver el comentario de arriba
  // ("RONDA 11, TAREA 4") para el porqué de este reparto.
  const idsProximas = ciclo.proximas.map((r) => r.id)

  return (
    <div className={estilos.app}>
      <header className={estilos.barra}>
        <Link href="/" className={estilos.volver}>← Meeting Hub</Link>
        <div className={estilos.barraTitulo}>Reuniones</div>
        <nav className={estilos.barraDcha}>
          {/* Deck Designer → Presentaciones (tarea 18): solo el nombre
              visible, la ruta sigue siendo /deck. */}
          <Link href="/deck" className={estilos.barraLink}>Presentaciones</Link>
          <span className={estilos.barraFecha}>{fechaLarga(hoy)}</span>
        </nav>
      </header>

      <main className={estilos.main}>
        <div className={estilos.encabezado}>
          <h1 className={estilos.titulo}>Reuniones</h1>
          <p className={estilos.subtitulo}>
            El calendario del mes, agendar rápido, y las próximas — más el ciclo completo de las que ya
            pasaron su día: por confirmar, con la minuta pendiente, y cerradas.
          </p>
        </div>

        <PanelAgenda
          sesiones={paraElPanel}
          salas={salas}
          hoy={hoy.toISOString()}
          idsProximas={idsProximas}
          agendarAction={agendarReunionAction}
          editarAction={editarReunionAction}
        />

        {/* POR CONFIRMAR (tarea 18): la pregunta más básica del ciclo — "¿se
            dio?" — antes solo en el Home y en cada sala, ahora también aquí.
            Mismo componente, mismas tres acciones. Oculta cuando está vacía,
            mismo criterio que el Home. */}
        {ciclo.porConfirmar.length > 0 && (
          <section className={estilos.cicloSeccion}>
            <h2 className={estilos.cicloTitulo}>
              Por confirmar
              <span className={estilos.conteo}>{ciclo.porConfirmar.length}</span>
            </h2>
            <ReunionesPorConfirmar
              sesiones={ciclo.porConfirmar}
              marcarPresentadaAction={marcarPresentadaAction}
              marcarNoDadaAction={marcarNoDadaAction}
              desmarcarNoDadaAction={desmarcarNoDadaAction}
            />
          </section>
        )}

        {/* SE DIERON, FALTA SU MINUTA: ocurrió (confirmada, o con
            presentación y día pasado) y todavía no tiene acta. Mudada de
            `/deck` (tarea 18) — antes vivía ahí por herencia, de cuando la
            reunión no existía como entidad aparte de su documento. SIEMPRE
            visible, con vacío explícito: mismo criterio que "Cerradas", justo
            abajo. */}
        <section className={estilos.cicloSeccion}>
          <h2 className={estilos.cicloTitulo}>
            Se dieron, falta su minuta
            <span className={estilos.conteo}>{ciclo.faltaMinuta.length}</span>
          </h2>
          {ciclo.faltaMinuta.length === 0 ? (
            <p className={estilos.vacio}>Nada pendiente de minutar.</p>
          ) : (
            <div className={estilos.listaCiclo}>
              {ciclo.faltaMinuta.map((r) => (
                <Link
                  key={r.id}
                  href={`/deck/${r.id}/minuta`}
                  className={estilos.filaCiclo}
                  style={{ '--sala': r.salaColor } as React.CSSProperties}
                >
                  <span className={estilos.filaCicloTitulo}>{r.titulo}</span>
                  <span className={estilos.filaCicloMeta}>
                    <span>{r.salaNombre}</span>
                    <span className={estilos.sep}>·</span>
                    <span>{fechaCompleta(r.fecha)} · {horaBreve(r.fecha)}</span>
                  </span>
                  <span className={estilos.filaCicloAccion}>Generar su minuta →</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* CERRADAS: dada y minutada, nada pendiente. Mudada de `/deck`
            (tarea 18), misma razón que la anterior. Sin sala (un comité) no
            hay a dónde ir todavía: se queda como texto, mismo criterio que ya
            usaba el bloque viejo para "lo que falta". */}
        <section className={estilos.cicloSeccion}>
          <h2 className={estilos.cicloTitulo}>
            Cerradas
            <span className={estilos.conteo}>{ciclo.cerradas.length}</span>
          </h2>
          {ciclo.cerradas.length === 0 ? (
            <p className={estilos.vacio}>Ninguna reunión cerrada todavía.</p>
          ) : (
            <div className={estilos.listaCiclo}>
              {ciclo.cerradas.map((r) => {
                const contenido = (
                  <>
                    <span className={estilos.filaCicloTitulo}>{r.titulo}</span>
                    <span className={estilos.filaCicloMeta}>
                      <span>{r.salaNombre}</span>
                      <span className={estilos.sep}>·</span>
                      <span>{fechaCompleta(r.fecha)} · {horaBreve(r.fecha)}</span>
                    </span>
                  </>
                )
                return r.salaSlug ? (
                  <Link
                    key={r.id}
                    href={`/cliente/${r.salaSlug}`}
                    className={estilos.filaCiclo}
                    style={{ '--sala': r.salaColor } as React.CSSProperties}
                  >
                    {contenido}
                  </Link>
                ) : (
                  <div key={r.id} className={estilos.filaCiclo} style={{ '--sala': r.salaColor } as React.CSSProperties}>
                    {contenido}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
