'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendario, type SesionEnCalendario } from './Calendario'
import { FormularioSesion, type DatosFormulario, type SalaElegible } from './FormularioSesion'
import { fechaCompleta, horaBreve, diaCivil } from '@/lib/fecha'
import { PLANTILLAS, claveDeClase, etiquetaDeClase } from '@/secciones/plantillas'
import estilos from '@/app/agenda/agenda.module.css'
// Para "Próximas" (ronda 11, tarea 4) — las mismas clases que ya usan "Por
// confirmar"/"Falta su minuta"/"Cerradas" en `/reuniones`, para el "mismo
// tratamiento" que pidió Franco — Y para la cabecera (título/subtítulo/
// "agendar"), subida aquí en el arreglo del hueco muerto de la auditoría
// UX/UI (ronda 11: ver el comentario de archivo, más abajo). `agenda.
// module.css` (arriba) se queda con el calendario y el formulario en sí,
// que no se tocan.
import estilosCiclo from '@/app/reuniones/reuniones.module.css'

/**
 * El mes en cuadro, "agendar" y "Próximas" — el calendario y sus preguntas
 * de lo que sigue.
 *
 * RONDA 10: mudado TAL CUAL desde la vieja `/agenda`, sin rediseñar. RONDA
 * 11, TAREA 4: "Lo que viene" —ahora "Próximas"— bajó de un panel lateral de
 * 22rem (al lado del calendario) a una sección de ancho completo, debajo de
 * él, con el mismo tratamiento visual que el resto del ciclo en
 * `/reuniones`. Franco, el 6-ago: "en la pestaña Reuniones 'lo que viene'
 * déjalo abajo del calendario al igual que las otras listas, se desarma todo
 * cuando hay muchas" — el panel lateral solo crecía hacia abajo sin límite
 * de ancho, así que con volumen real se desbordaba.
 *
 * "Próximas" SIGUE viviendo aquí (no se movió a `page.tsx`): aquí es donde
 * vive "editar" una reunión ya agendada —mismo estado, mismo formulario que
 * "agendar"— y sacarla de este componente habría exigido un componente
 * cliente nuevo solo para conservar esa capacidad. Lo que SÍ se movió es DE
 * DÓNDE sale la lista de ids: antes este componente filtraba `sesiones` por
 * su cuenta (`estado !== 'dada' && fecha >= hoy`); ahora recibe `idsProximas`
 * YA RESUELTO por `cicloDeReuniones` (`src/app/reuniones/page.tsx`), que
 * excluye lo que ya se quedó en "por confirmar"/"falta su minuta"/"cerradas"
 * — cerrando el solape que existía cuando una reunión de HOY, con
 * presentación lista pero sin confirmar, contaba a la vez como "próxima" y
 * como "falta su minuta". Este componente solo CRUZA esos ids contra su
 * propio `sesiones` (que sigue llegando COMPLETO, sin filtrar: el calendario
 * necesita verlas todas) para pintar cada fila con sus datos completos —no
 * vuelve a decidir quién es "próxima", solo la pinta.
 *
 * AUDITORÍA UX/UI (ronda 11) — EL HUECO MUERTO Y POR QUÉ LA CABECERA VIVE
 * AQUÍ: con "Próximas" ya en el flujo (arriba), el <aside> de 22rem junto al
 * calendario se quedó con un solo botón —"+ Agendar una reunión"— y el
 * resto vacío: un tercio de la pantalla reservado para nada. El botón subió
 * a la cabecera de `/reuniones` (mismo sitio y misma pinta que "+ Nueva
 * reunión" en `/deck` — ver `.encabezado`/`.boton`/`.botonAcento` en
 * `reuniones.module.css`, copiadas letra por letra de `deck.module.css`).
 * Esa cabecera —título, subtítulo y el botón— la pinta ESTE componente y no
 * `page.tsx` (que sigue siendo Server Component, sin hooks): el botón y el
 * calendario comparten el mismo estado (`agendando`/`editando`), así que los
 * dos tienen que vivir del mismo lado del límite cliente/servidor —
 * separarlos habría exigido duplicar ese estado en dos componentes, con el
 * riesgo de que se desincronicen. `titulo`/`subtitulo` llegan como prop
 * opcionales con la copia real de `/reuniones` como default (este componente
 * es de un solo uso): así seguía habiendo un solo lugar con el texto, sin
 * forzar a cada test de este archivo a repetirlo.
 *
 * EL <aside> AHORA SIEMPRE EXISTE (ronda 14.4, tarea 1 — segunda vuelta sobre
 * el hueco muerto). La auditoría de la ronda 11 (arriba) cerró el síntoma
 * "22rem vacíos con un solo botón" soltando la columna del todo cuando no
 * había formulario abierto — y con eso abrió uno nuevo, medido en el informe
 * de esta tarea: a 1440px, en reposo, el calendario quedaba solo (capado a su
 * ancho de siempre) con ~408px MUERTOS a su derecha, sin nada. Franco: "hay
 * que mejorar la vista, diagramación y uso funcional" de esta pestaña.
 *
 * El arreglo NO es volver a estirar el calendario (eso ya se probó una vez y
 * dejó celdas enormes y vacías la mayoría de los días del mes) ni meter
 * "Próximas" en ese hueco (Franco lo sacó de ahí el 6-ago: "se desarma todo
 * cuando hay muchas" — una columna angosta que solo crece hacia abajo). Es
 * dejar de vaciar el `<aside>` cuando no hay formulario: `.filaSuperior`
 * (`reuniones.module.css`, importada aquí como `estilosCiclo`) reemplaza a
 * `.panel`/`data-activo` de esta hoja como el grid que reparte calendario y
 * `<aside>` — SIEMPRE a dos columnas en desktop, nunca una sola. Con
 * `agendando`/`editando`, el `<aside>` sigue mostrando el formulario, tal
 * cual. En reposo, en vez de nada, muestra FILTROS (sala/clase, sobre
 * `sesiones` — mismo patrón de cliente que `TablaAcuerdos.tsx` en
 * `/acuerdos`) y una LEYENDA de qué sala es cada color. Los filtros afectan
 * lo que este mismo componente pinta —el calendario y "Próximas"—, que es lo
 * único que vive de este lado del límite cliente/servidor; "Por confirmar"/
 * "Falta su minuta"/"Cerradas" (`page.tsx`, Server Component) no los ven —
 * filtrar esas tres desde aquí habría exigido subir su estado al servidor
 * (`searchParams`) solo para esto, más ceremonia que la que pide una mejora
 * de UX del calendario y su hueco. */

export interface SesionAgendada extends SesionEnCalendario {
  alcance: string
  /**
   * `TipoReunion` (`@/db/reuniones`) admite `'quincenal'` desde antes de esta
   * tarea (Research Land ya es quincenal) — este tipo se ensancha para
   * poder recibir esas reuniones sin reventar, aunque `FormularioSesion` de
   * abajo todavía no ofrezca la opción en su formulario ("Quincenal en la
   * interfaz" es trabajo de otra tarea, fuera de esta migración).
   */
  tipo: 'semanal' | 'quincenal' | 'mensual'
  /**
   * Qué clase de junta es (`src/secciones/plantillas.ts`) — `null` cuando la
   * reunión no tiene clase (las 6 reales sin clasificar). AÑADIDO EN EL
   * ARREGLO DEL CRÍTICO C2 (ronda 14-2, fix 3/4): sin este campo, el
   * `inicial={{...}}` de "Editar" (más abajo) no podía distinguir "esta
   * junta no tiene clase" de "no sé qué clase tiene" — y `plantillaInicial`
   * (`FormularioSesion.tsx`), que usa el operador `in` para esa misma
   * distinción, caía SIEMPRE al valor por defecto del catálogo
   * (`PLANTILLA_POR_DEFECTO`) por falta de la clave, sin importar la clase
   * real de la reunión. `string | null`, no opcional: `page.tsx` (`paraElPanel`)
   * siempre la manda, normalizada con `?? null` desde el campo opcional de
   * `ReunionResumen` — mismo criterio que `lugar`, dos líneas abajo.
   */
  plantilla: string | null
  lugar: string | null
  participantes: string[]
  itemsLlenados: number
  totalItems: number
}

interface Props {
  /**
   * TODAS las reuniones QUE AUTORIZÓ EL SERVIDOR, sin filtrar — la fuente de
   * la que "Próximas" y el calendario del mes parten. Los filtros del hueco
   * (ronda 14.4, tarea 1: sala/clase) son de CLIENTE, sobre ESTA lista —
   * angostan lo que se pinta, nunca lo que llegó autorizado.
   */
  sesiones: SesionAgendada[]
  salas: SalaElegible[]
  hoy: string
  /**
   * Los ids que le tocan a "Próximas" (ronda 11, tarea 4), YA resueltos y en
   * orden (la más próxima primero) por `cicloDeReuniones`
   * (`src/app/reuniones/page.tsx`) — ahí se explica por qué el cálculo no
   * puede vivir aquí adentro sin repetir el mismo solape que ya cerraron
   * "falta su minuta"/"cerradas" contra "por confirmar".
   */
  idsProximas: string[]
  agendarAction: (datos: DatosFormulario) => Promise<{ error?: string }>
  editarAction: (id: string, datos: DatosFormulario) => Promise<{ error?: string }>
  /**
   * Título y subtítulo de la cabecera (auditoría UX/UI, ronda 11) —
   * opcionales, con la copia real de `/reuniones` como default: ver el
   * comentario de archivo, arriba, para el porqué la cabecera se pinta aquí
   * y no en `page.tsx`. Quedan como prop (no texto fijo) para que
   * `PanelAgenda.test.tsx` no tenga que repetirlos en cada `render(...)`.
   */
  titulo?: string
  subtitulo?: string
}

const TITULO_POR_DEFECTO = 'Reuniones'
const SUBTITULO_POR_DEFECTO =
  'El calendario del mes, agendar rápido, y las próximas — más el ciclo completo de las que ya pasaron su día: por confirmar, con la minuta pendiente, y cerradas.'

// Filtros del hueco (ronda 14.4, tarea 1) — module-scope, no dependen del
// componente: mismo motivo que `TITULO_POR_DEFECTO`, arriba.
const SIN_FILTRO = ''
const SIN_CLASIFICAR = '__sin-clasificar__'

export function PanelAgenda({
  sesiones, salas, hoy, idsProximas, agendarAction, editarAction,
  titulo = TITULO_POR_DEFECTO, subtitulo = SUBTITULO_POR_DEFECTO,
}: Props) {
  const router = useRouter()
  const [agendando, setAgendando] = useState<{ dia?: string } | null>(null)
  const [editando, setEditando] = useState<SesionAgendada | null>(null)
  // El mes que enseña el calendario. Cambia al agendar: si no, se agenda algo
  // para agosto, se cierra el formulario y el cuadro sigue en julio como si
  // no hubiera pasado nada. Se aplica remontando el calendario con `key`,
  // que es cómo se reinicia estado en React sin un efecto que lo sincronice.
  const [mesFoco, setMesFoco] = useState<string | null>(null)

  // FILTROS DEL HUECO (ronda 14.4, tarea 1) — sala y clase, de CLIENTE sobre
  // `sesiones` (la lista ya autorizada que este componente recibió), mismo
  // patrón que `TablaAcuerdos.tsx` en `/acuerdos`: `useState` por dimensión,
  // sin ida y vuelta al servidor. Solo afectan lo que ESTE componente pinta
  // —el calendario y "Próximas"—, ver el comentario de archivo para el
  // porqué no llegan a "Por confirmar"/"Falta su minuta"/"Cerradas".
  const [filtroSala, setFiltroSala] = useState(SIN_FILTRO)
  const [filtroClase, setFiltroClase] = useState(SIN_FILTRO)

  // Opciones de "clase": el CATÁLOGO (`PLANTILLAS`), no lo que hay hoy en
  // `sesiones` — a diferencia de `TablaAcuerdos` (que si derivara de una
  // lista vacía se quedaría sin opciones), aquí el catálogo siempre existe,
  // así que el filtro ofrece TODAS las clases posibles desde el primer
  // render, no solo las que ya tienen alguna reunión.
  const clasesDelCatalogo = PLANTILLAS.filter((p) => p.esClaseDeJunta)

  const coincideConFiltros = (s: SesionAgendada) =>
    (filtroSala === SIN_FILTRO || s.salaSlug === filtroSala) &&
    (filtroClase === SIN_FILTRO ||
      (filtroClase === SIN_CLASIFICAR ? claveDeClase(s.plantilla) === null : claveDeClase(s.plantilla) === filtroClase))

  const sesionesFiltradas = sesiones.filter(coincideConFiltros)

  // "Próximas" (ronda 11, tarea 4): `idsProximas` ya llega deduplicado y en
  // orden desde `cicloDeReuniones` — aquí solo se cruza contra `sesiones`
  // (por id, en un Map para no ser O(n²) con volumen) para recuperar los
  // datos completos de cada fila. El `.filter` final descarta un id que no
  // aparezca en `sesiones` en vez de reventar: no debería pasar en
  // producción (las dos listas salen de la misma consulta, en `page.tsx`),
  // pero un componente de UI no es el lugar para lanzar si pasa. Los filtros
  // del hueco (arriba) se aplican DESPUÉS de cruzar: así siguen respetando
  // el orden que ya trae `idsProximas`, sin recalcularlo.
  const porId = new Map(sesiones.map((s) => [s.id, s]))
  const proximas = idsProximas
    .map((id) => porId.get(id))
    .filter((s): s is SesionAgendada => s != null)
    .filter(coincideConFiltros)

  function cerrar() {
    setAgendando(null)
    setEditando(null)
    router.refresh()
  }

  // Antes decidía si el <aside> existía SIQUIERA (ver el comentario de
  // archivo, arriba): ahora el <aside> SIEMPRE existe, y este booleano solo
  // decide QUÉ pinta adentro —el formulario, o filtros+leyenda—.
  // `agendando`/`editando` no bastan cada uno por su cuenta porque son
  // mutuamente excluyentes, no una OR ya calculada.
  const formularioAbierto = Boolean(agendando || editando)

  // EL AVISO DE FILTRO ACTIVO (revisión C1, hallazgo I3): al abrir el
  // formulario, `.hueco` deja de pintar los `<select>` —pasan a "Agendar una
  // reunión"— pero `filtroSala`/`filtroClase` NO se resetean: el calendario
  // de al lado sigue filtrado, sin ningún control a la vista que lo diga,
  // justo mientras se elige un día. `hayFiltroActivo` + las dos etiquetas
  // resueltas (no el `slug`/`id` crudo) son lo que arma un aviso legible —
  // ver dónde se pinta, más abajo, antes de `.filaSuperior`.
  const hayFiltroActivo = filtroSala !== SIN_FILTRO || filtroClase !== SIN_FILTRO
  const etiquetaFiltroSala = filtroSala !== SIN_FILTRO ? (salas.find((s) => s.slug === filtroSala)?.nombre ?? filtroSala) : null
  const etiquetaFiltroClase =
    filtroClase === SIN_CLASIFICAR
      ? etiquetaDeClase(null)
      : filtroClase !== SIN_FILTRO
        ? (clasesDelCatalogo.find((p) => p.id === filtroClase)?.nombre ?? filtroClase)
        : null
  const piezasFiltro = [etiquetaFiltroSala, etiquetaFiltroClase].filter((p): p is string => p !== null)

  return (
    <>
      {/* CABECERA: ver el comentario de archivo, arriba, para el porqué vive
          aquí (mismo estado que el calendario/formulario) y no en
          `page.tsx`. */}
      <div className={estilosCiclo.encabezado}>
        <div>
          <h1 className={estilosCiclo.titulo}>{titulo}</h1>
          <p className={estilosCiclo.subtitulo}>{subtitulo}</p>
        </div>
        <button
          type="button"
          className={`${estilosCiclo.boton} ${estilosCiclo.botonAcento}`}
          onClick={() => {
            setEditando(null)
            setAgendando({})
          }}
        >
          + Agendar una reunión
        </button>
      </div>

      {/* AVISO DE FILTRO ACTIVO (revisión C1, hallazgo I3) — ver el
          comentario de `hayFiltroActivo`, arriba. Fuera de `.filaSuperior` a
          propósito (no dentro de su primera columna): esa fila es un grid de
          DOS columnas ya ocupadas por el calendario y el `<aside>` — meter un
          tercer hijo ahí antes del calendario lo habría corrido a la segunda
          columna en vez de avisar por encima de él. Solo se pinta con el
          formulario abierto: en reposo los propios `<select>` ya muestran su
          valor elegido, repetirlo aquí sería el mismo dato dicho dos veces. */}
      {formularioAbierto && hayFiltroActivo && (
        <p className={estilosCiclo.avisoFiltro} role="status">
          Filtro activo — {piezasFiltro.join(' · ')}: el calendario de abajo solo enseña lo que
          coincide, aunque el formulario tape los controles.
        </p>
      )}

      {/* `.filaSuperior` (reuniones.module.css) reemplaza a `.panel`/
          `data-activo` (agenda.module.css) como el grid que reparte
          calendario y `<aside>` — ver el comentario de archivo, arriba,
          para el porqué. El calendario recibe `sesionesFiltradas` (no
          `sesiones` a secas): con un filtro activo, el mes también enseña
          solo lo que coincide — coherente con lo que ya hace "Próximas",
          más abajo, con la misma lista. */}
      <div className={estilosCiclo.filaSuperior}>
        <Calendario
          key={mesFoco ?? 'hoy'}
          sesiones={sesionesFiltradas}
          hoy={hoy}
          mesInicial={mesFoco}
          alElegirDia={(dia) => {
            setEditando(null)
            setAgendando({ dia })
          }}
        />

        {/* El <aside> AHORA SIEMPRE EXISTE (ver el comentario de archivo):
            con formulario abierto, lo de siempre; en reposo, filtros +
            leyenda en vez de nada. */}
        <aside className={estilos.lateral}>
          {formularioAbierto ? (
            <section className={estilos.tarjetaFormulario}>
              <h2 className={estilos.lateralTitulo}>
                {editando ? 'Corregir la reunión' : 'Agendar una reunión'}
              </h2>
              {editando ? (
                <FormularioSesion
                  salas={salas}
                  etiquetaEnviar="Guardar cambios"
                  inicial={{
                    salaSlug: editando.salaSlug ?? '',
                    titulo: editando.titulo,
                    dia: diaCivil(editando.fecha),
                    hora: horaBreve(editando.fecha),
                    tipo: editando.tipo,
                    alcance: editando.alcance,
                    lugar: editando.lugar ?? '',
                    participantes: editando.participantes.join(', '),
                    // CRÍTICO C2 (ronda 14-2, fix 3/4): faltaba esta línea.
                    // `editando.plantilla` YA es `string | null` (nunca
                    // `undefined` — ver el comentario de `SesionAgendada`,
                    // arriba), así que se pasa TAL CUAL: la prop `inicial`
                    // de `FormularioSesion` acepta `plantilla?: string | null`
                    // justo para poder distinguir "vino `null`" (sin clase,
                    // se respeta) de "no vino la clave" (reunión nueva, cae
                    // al default) — ver `plantillaInicial`, en ese archivo.
                    // Ponerla aquí, aunque sea `null`, es lo que hace que la
                    // clave SIEMPRE "venga".
                    plantilla: editando.plantilla,
                  }}
                  enviarAction={async (datos) => {
                    const r = await editarAction(editando.id, datos)
                    if (!r.error) setMesFoco(datos.dia.slice(0, 7))
                    return r
                  }}
                  alTerminar={cerrar}
                  alCancelar={cerrar}
                />
              ) : (
                <FormularioSesion
                  salas={salas}
                  etiquetaEnviar="Agendar"
                  inicial={{ dia: agendando?.dia }}
                  enviarAction={async (datos) => {
                    const r = await agendarAction(datos)
                    if (!r.error) setMesFoco(datos.dia.slice(0, 7))
                    return r
                  }}
                  alTerminar={cerrar}
                  alCancelar={cerrar}
                />
              )}
            </section>
          ) : (
            <div className={estilosCiclo.hueco}>
              {/* FILTROS — sala y clase, sobre `sesiones` (ver el comentario
                  de archivo). "Todas las salas"/"Todas las clases" son el
                  valor vacío, mismo criterio que `SIN_FILTRO` en
                  `TablaAcuerdos.tsx`.

                  EL RÓTULO DICE SU ALCANCE REAL (revisión C1, hallazgo I3):
                  antes decía solo "Filtros", sin decir a qué — y filtrar
                  "NeraCode" aquí deja intactas las tarjetas de otra sala en
                  "Por confirmar"/"Falta su minuta"/"Cerradas" (`page.tsx`,
                  Server Component, fuera de este filtro de cliente — ver el
                  comentario de archivo). El rótulo ahora dice exactamente lo
                  que SÍ cubre, para que esa diferencia no haya que
                  descubrirla comparando listas. */}
              <div>
                <p className={estilosCiclo.huecoTitulo}>Filtros — calendario y Próximas</p>
                <div className={estilosCiclo.filtros}>
                  <label className={estilosCiclo.filtro}>
                    <span className="micro" data-sinpunto>Sala</span>
                    <select
                      className={estilosCiclo.select}
                      value={filtroSala}
                      onChange={(e) => setFiltroSala(e.target.value)}
                    >
                      <option value={SIN_FILTRO}>Todas las salas</option>
                      {salas.map((s) => (
                        <option key={s.slug} value={s.slug}>{s.nombre}</option>
                      ))}
                    </select>
                  </label>
                  <label className={estilosCiclo.filtro}>
                    <span className="micro" data-sinpunto>Clase de junta</span>
                    <select
                      className={estilosCiclo.select}
                      value={filtroClase}
                      onChange={(e) => setFiltroClase(e.target.value)}
                    >
                      <option value={SIN_FILTRO}>Todas las clases</option>
                      {clasesDelCatalogo.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                      <option value={SIN_CLASIFICAR}>{etiquetaDeClase(null)}</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* LEYENDA — qué sala es cada color, para leer el filo de
                  color de las tarjetas de "Próximas" (aquí mismo) y del
                  resto del ciclo (`/reuniones`, `page.tsx`) sin adivinar. */}
              {salas.length > 0 && (
                <div>
                  <p className={estilosCiclo.huecoTitulo}>Leyenda</p>
                  <ul className={estilosCiclo.leyendaLista}>
                    {salas.map((s) => (
                      <li key={s.slug} className={estilosCiclo.leyendaItem}>
                        <span className={estilosCiclo.leyendaPunto} style={{ '--sala': s.color } as React.CSSProperties} />
                        {s.nombre}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* PRÓXIMAS (ronda 11, tarea 4): antes "Lo que viene", dentro del
          <aside> de arriba — bajó a una sección de ancho completo, con el
          mismo tratamiento (`estilosCiclo`) que "Por confirmar"/"Falta su
          minuta"/"Cerradas" en `/reuniones`. `idsProximas` ya llega
          deduplicado (ver el comentario del archivo) — aquí solo se pinta.
          `.ordenProximas` (ronda 14.4, tarea 1): el ORDEN VISUAL de las
          cuatro secciones del ciclo ya no es su orden en el documento — ver
          el comentario de esa clase en `reuniones.module.css`. */}
      <section className={`${estilosCiclo.cicloSeccion} ${estilosCiclo.ordenProximas}`}>
        <h2 className={estilosCiclo.cicloTitulo}>
          Próximas
          <span className={estilosCiclo.conteo}>{proximas.length}</span>
        </h2>

        {proximas.length === 0 ? (
          <p className={estilosCiclo.vacio}>
            No hay ninguna reunión agendada. Elige un día en el calendario para poner la primera.
          </p>
        ) : (
          <div className={estilosCiclo.listaCiclo}>
            {proximas.map((s) => (
              <div
                key={s.id}
                className={estilosCiclo.filaCiclo}
                style={{ '--sala': s.salaColor } as React.CSSProperties}
              >
                <span className={estilosCiclo.filaCicloTitulo}>{s.titulo}</span>
                {/* CUMPLIMIENTO (revisión C1, ronda 14.4 tarea 1): a "Próximas"
                    le faltaba la clase de junta — 3 de las 4 tarjetas de 14
                    sin ella eran de aquí (la cuarta, "Por confirmar", ver
                    `page.tsx`). `etiquetaDeClase(claveDeClase(...))`, NUNCA
                    `obtenerPlantilla(s.plantilla).nombre` a secas — ver el
                    comentario de `SesionAgendada.plantilla`, arriba: esa
                    llamada cae a "Estatus de UDN" con `null` por diseño (la
                    necesita un `<select>`), y una junta sin clase mentiría.
                    `.filaCicloMetaPieza`, no `.sep`: ver su comentario en
                    `reuniones.module.css` (el separador quedaba huérfano al
                    envolver). */}
                <span className={estilosCiclo.filaCicloMeta}>
                  <span className={estilosCiclo.filaCicloMetaPieza}>{s.salaNombre}</span>
                  <span className={estilosCiclo.filaCicloMetaPieza}>{etiquetaDeClase(claveDeClase(s.plantilla))}</span>
                  <span className={estilosCiclo.filaCicloMetaPieza}>
                    {fechaCompleta(s.fecha)} · {horaBreve(s.fecha)}
                    {s.lugar && <> · {s.lugar}</>}
                  </span>
                </span>
                {/* Sin condición de estado: por construcción, todo lo que
                    llega aquí ya es "no dada" (lo resolvió `cicloDeReuniones`
                    antes de mandar `idsProximas`) — no hace falta distinguir
                    nada para decidir si se enseña el avance. */}
                {s.totalItems > 0 && (
                  <span className={estilos.proximaAvance}>
                    {s.itemsLlenados} de {s.totalItems} secciones escritas
                  </span>
                )}
                <div className={estilos.proximaAcciones}>
                  <button
                    type="button"
                    className={estilos.botonTexto}
                    onClick={() => {
                      setAgendando(null)
                      setEditando(s)
                    }}
                  >
                    Editar
                  </button>
                  <Link href={`/deck/${s.id}`} className={estilosCiclo.filaCicloAccion}>
                    Preparar →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
