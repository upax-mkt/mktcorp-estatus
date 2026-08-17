'use client'

import { useState, Fragment } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
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
 * propio `sesiones` para pintar cada fila con sus datos completos —no vuelve
 * a decidir quién es "próxima", solo la pinta. `sesiones` YA LLEGA FILTRADA
 * por sala/clase desde la ronda 15 (ver `LOS FILTROS SUBIERON A
 * searchParams`, más abajo) — antes llegaba completa y el filtro se aplicaba
 * aquí adentro; el calendario y "Próximas" reciben hoy exactamente la misma
 * lista, ya angostada por `page.tsx`.
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
 * cual. En reposo, en vez de nada, muestra FILTROS (sala/clase) y una
 * LEYENDA de qué sala es cada color.
 *
 * LOS FILTROS SUBIERON A `searchParams` (ronda 15, cierre de la deuda B).
 * Hasta esa ronda eran un `useState` de cliente sobre `sesiones` —mismo
 * patrón que `TablaAcuerdos.tsx` en `/acuerdos`— y por eso solo alcanzaban a
 * lo que este componente pinta (el calendario y "Próximas"): "Por
 * confirmar"/"Falta su minuta"/"Cerradas" viven en `page.tsx`, un Server
 * Component, y un `useState` de aquí nunca les llegaba. El rótulo del hueco
 * lo confesaba ("Filtros — calendario y Próximas"). Ahora `page.tsx` lee
 * `sala`/`clase` de `searchParams`, los valida contra las salas reales y el
 * catálogo de clases, y filtra `reuniones` ANTES de repartirlas a las cuatro
 * secciones —incluida `sesiones`/`idsProximas`, lo que este componente
 * recibe—: `filtroSala`/`filtroClase` (props, abajo) llegan YA RESUELTOS,
 * solo para fijar el `value` de los `<select>` y armar el aviso de filtro
 * activo; este componente NO vuelve a filtrar nada por su cuenta. Elegir un
 * valor nuevo en cualquiera de los dos navega —`router.replace`, sin recargar
 * la app entera— a la misma ruta con la URL actualizada, y `page.tsx` vuelve
 * a filtrar con el valor nuevo: el rótulo vuelve a decir solo "Filtros"
 * porque ahora sí cubre las cuatro. */

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
   * Las reuniones QUE AUTORIZÓ EL SERVIDOR — la fuente de la que "Próximas"
   * y el calendario del mes parten.
   *
   * YA LLEGA FILTRADA (ronda 15, cierre de la deuda B): hasta esa ronda esta
   * lista llegaba COMPLETA y los filtros del hueco (sala/clase) la angostaban
   * aquí adentro, de cliente, con un `useState`. Ahora `page.tsx` filtra
   * `reuniones` contra `searchParams` ANTES de construir esta prop —mismo
   * criterio que usa para las otras tres secciones del ciclo, ver su
   * comentario— así que lo que llega aquí ya es lo que le toca ver a la URL
   * actual. Este componente no vuelve a filtrar: solo pinta.
   */
  sesiones: SesionAgendada[]
  salas: SalaElegible[]
  hoy: string
  /**
   * Los ids que le tocan a "Próximas" (ronda 11, tarea 4), YA resueltos y en
   * orden (la más próxima primero) por `cicloDeReuniones`
   * (`src/app/reuniones/page.tsx`) — ahí se explica por qué el cálculo no
   * puede vivir aquí adentro sin repetir el mismo solape que ya cerraron
   * "falta su minuta"/"cerradas" contra "por confirmar". Ya salen de
   * `reuniones` filtradas (ver `sesiones`, arriba), así que tampoco hace
   * falta filtrarlos aquí.
   */
  idsProximas: string[]
  /**
   * EL FILTRO ACTIVO, YA VALIDADO POR EL SERVIDOR (ronda 15, cierre de la
   * deuda B) — `SIN_FILTRO` (nada elegido), un slug real de sala o
   * `SIN_SALA`, y un id real del catálogo de clases o `SIN_CLASIFICAR`.
   * `page.tsx` es quien valida contra las salas reales y el catálogo antes
   * de mandarlos —un `?sala=` con basura en la URL nunca llega hasta aquí—,
   * así que este componente los usa tal cual: para fijar el `value` de cada
   * `<select>`, para el aviso de "filtro activo" (`hayFiltroActivo`, más
   * abajo) y para armar la URL nueva cuando cambia uno de los dos. Opcional,
   * con `SIN_FILTRO` como default, para que los ~30 `render(...)` de
   * `PanelAgenda.test.tsx` que no les importa el filtro no tengan que
   * repetirlos — mismo criterio que `titulo`/`subtitulo`, abajo.
   */
  filtroSala?: string
  filtroClase?: string
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
  /**
   * "POR CONFIRMAR" Y "FALTA SU MINUTA" —Server Components de `page.tsx`—
   * YA ARMADOS: EL ORDEN DEL TRABAJO, EN EL DOM, NO EN CSS (ronda 15, cierre
   * de la deuda B). Hasta esa ronda estas dos secciones vivían como HERMANAS
   * de `<PanelAgenda>` en `page.tsx`, y un `order: 1`/`order: 2` en CSS
   * (`.ordenPorConfirmar`/`.ordenFaltaMinuta`, `reuniones.module.css`) las
   * subía visualmente por encima de "Próximas" (que nace DENTRO de este
   * componente, y por eso queda antes que ellas en el documento) sin mover
   * un solo nodo del DOM — el anti-patrón clásico de `flex order`: quien
   * navega con teclado o con lector de pantalla sigue saliendo del
   * calendario hacia "Próximas" (la tercera visualmente, la primera en el
   * DOM) antes de llegar aquí, y luego salta hacia arriba para volver.
   *
   * El arreglo: `page.tsx` arma estas dos secciones (Server Components de
   * verdad — este archivo no importa `cicloDeReuniones` ni
   * `ReunionesPorConfirmar`, ni sabe nada de su contenido) y se las pasa
   * COMO JSX, y este componente las coloca DESPUÉS del calendario y ANTES de
   * "Próximas" en su propio `return` — el orden del documento ya es el orden
   * de lectura, sin CSS que lo reordene. `despuesDeProximas`, abajo, es la
   * mitad que falta ("Cerradas", al final).
   */
  entreCalendarioYProximas?: React.ReactNode
  /**
   * "CERRADAS" —Server Component de `page.tsx`— YA ARMADA, al final del DOM
   * (mismo arreglo que `entreCalendarioYProximas`, arriba). Prop APARTE —no
   * el mismo `entreCalendarioYProximas`, ni `children`— porque tiene que
   * aparecer DESPUÉS de "Próximas", que vive DENTRO de este componente entre
   * las dos: si las dos vinieran juntas en una sola prop no habría forma de
   * intercalar "Próximas" entre ellas sin partirlas.
   */
  despuesDeProximas?: React.ReactNode
}

const TITULO_POR_DEFECTO = 'Reuniones'
const SUBTITULO_POR_DEFECTO =
  'El calendario del mes, agendar rápido, y las próximas — más el ciclo completo de las que ya pasaron su día: por confirmar, con la minuta pendiente, y cerradas.'

/**
 * LOS MARCADORES DEL FILTRO — DUPLICADOS A PROPÓSITO, NO IMPORTADOS.
 *
 * `page.tsx` valida `searchParams` contra estos MISMOS tres valores
 * (`''`/`'sin-sala'`/`'sin-clasificar'`) antes de filtrar `reuniones` — ver
 * su comentario, junto a donde los usa. Los dos archivos necesitan la MISMA
 * cadena exacta (page.tsx la lee de la URL, este componente la escribe), así
 * que en cualquier otro par de archivos esto viviría en un módulo compartido
 * — pero `page.tsx` importa `@/db/reuniones` (Postgres) y compañía, y este
 * archivo ('use client', arriba) va al bundle del NAVEGADOR: un módulo
 * compartido tendría que vivir fuera de los dos archivos de esta tarea, y el
 * brief pide avisar en el informe antes de tocar un archivo ajeno, no crear
 * uno nuevo por conveniencia. Tres constantes de una palabra, con el mismo
 * comentario en los dos lados: el costo de mantenerlas iguales es un `grep`,
 * no una migración.
 *
 * Valor legible a propósito (no `__sin-sala__` con guiones bajos, como tenía
 * `SIN_CLASIFICAR` antes de esta ronda): desde ahora viven en la URL, y una
 * URL que alguien puede leer o teclear a mano es parte de "enlazable".
 */
const SIN_FILTRO = ''
const SIN_SALA = 'sin-sala'
const SIN_CLASIFICAR = 'sin-clasificar'
const ETIQUETA_SIN_SALA = 'Sin sala'

export function PanelAgenda({
  sesiones, salas, hoy, idsProximas,
  filtroSala = SIN_FILTRO, filtroClase = SIN_FILTRO,
  agendarAction, editarAction,
  titulo = TITULO_POR_DEFECTO, subtitulo = SUBTITULO_POR_DEFECTO,
  entreCalendarioYProximas, despuesDeProximas,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [agendando, setAgendando] = useState<{ dia?: string } | null>(null)
  const [editando, setEditando] = useState<SesionAgendada | null>(null)
  // El mes que enseña el calendario. Cambia al agendar: si no, se agenda algo
  // para agosto, se cierra el formulario y el cuadro sigue en julio como si
  // no hubiera pasado nada. Se aplica remontando el calendario con `key`,
  // que es cómo se reinicia estado en React sin un efecto que lo sincronice.
  const [mesFoco, setMesFoco] = useState<string | null>(null)

  // Opciones de "clase": el CATÁLOGO (`PLANTILLAS`), no lo que hay hoy en
  // `sesiones` — a diferencia de `TablaAcuerdos` (que si derivara de una
  // lista vacía se quedaría sin opciones), aquí el catálogo siempre existe,
  // así que el filtro ofrece TODAS las clases posibles desde el primer
  // render, no solo las que ya tienen alguna reunión.
  const clasesDelCatalogo = PLANTILLAS.filter((p) => p.esClaseDeJunta)

  // "Próximas" (ronda 11, tarea 4): `idsProximas` ya llega deduplicado, en
  // orden y FILTRADO (ver el comentario de `sesiones`, arriba) desde
  // `cicloDeReuniones` — aquí solo se cruza contra `sesiones` (por id, en un
  // Map para no ser O(n²) con volumen) para recuperar los datos completos de
  // cada fila. El `.filter` final descarta un id que no aparezca en
  // `sesiones` en vez de reventar: no debería pasar en producción (las dos
  // listas salen de la misma consulta filtrada, en `page.tsx`), pero un
  // componente de UI no es el lugar para lanzar si pasa.
  const porId = new Map(sesiones.map((s) => [s.id, s]))
  const proximas = idsProximas
    .map((id) => porId.get(id))
    .filter((s): s is SesionAgendada => s != null)

  function cerrar() {
    setAgendando(null)
    setEditando(null)
    router.refresh()
  }

  /**
   * NAVEGA A LA MISMA RUTA CON EL FILTRO NUEVO (ronda 15, cierre de la deuda
   * B) — lo que hace cada `<select>` del hueco al cambiar, más abajo.
   * `router.replace`, no `push`: cambiar un filtro no es una parada de
   * navegación que valga la pena en el historial — encadenar "sala A" → "sala
   * B" → "sala C" no debería inflar el botón "atrás" con tres pasos que nadie
   * quiere recorrer uno por uno para volver a donde estaba. `{ scroll: false
   * }` porque sin él Next sube la página al tope en cada cambio, aunque el
   * usuario siga viendo el mismo `<select>` bajo el dedo. Recibe los DOS
   * valores completos (no uno con el otro implícito por closure) porque cada
   * `<select>` cambia UNO de los dos ejes y tiene que mandar el OTRO tal cual
   * está — mismo problema que ya resolvía `coincideConFiltros` cuando vivía
   * aquí, solo que ahora es la URL la que carga los dos valores, no un
   * `useState` por dimensión.
   */
  function irAFiltro(sala: string, clase: string) {
    const params = new URLSearchParams()
    if (sala !== SIN_FILTRO) params.set('sala', sala)
    if (clase !== SIN_FILTRO) params.set('clase', clase)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  // Antes decidía si el <aside> existía SIQUIERA (ver el comentario de
  // archivo, arriba): ahora el <aside> SIEMPRE existe, y este booleano solo
  // decide QUÉ pinta adentro —el formulario, o filtros+leyenda—.
  // `agendando`/`editando` no bastan cada uno por su cuenta porque son
  // mutuamente excluyentes, no una OR ya calculada.
  const formularioAbierto = Boolean(agendando || editando)

  // EL AVISO DE FILTRO ACTIVO (revisión C1, hallazgo I3 — SIGUE HACIENDO
  // FALTA tras subir el filtro a la URL, ronda 15): al abrir el formulario,
  // `.hueco` deja de pintar los `<select>` —pasan a "Agendar una reunión"—
  // pero el filtro de la URL no se borra: la pantalla entera sigue filtrada,
  // sin ningún control a la vista que lo diga, justo mientras se elige un
  // día. Antes de la ronda 15 este aviso solo advertía sobre "el calendario
  // de abajo" (lo único que el filtro alcanzaba); ahora que `page.tsx`
  // filtra las cuatro secciones con el mismo `sala`/`clase` de la URL, el
  // aviso vale más que antes, no menos —esconde el filtro de MÁS pantalla,
  // no de menos—, así que se queda, con el texto ajustado a lo que de verdad
  // cubre. `hayFiltroActivo` + las dos etiquetas resueltas (no el
  // `slug`/`id` crudo) son lo que arma un aviso legible — ver dónde se
  // pinta, más abajo, antes de `.filaSuperior`.
  //
  // H2 (re-revisión, ronda 16) — SIGUE SOLO CON `formularioAbierto`, A
  // PROPÓSITO, aunque el hallazgo también ofrecía "que se vea también en
  // reposo" como arreglo. Se evaluó y se descartó: este aviso vive ANTES de
  // `.filaSuperior` —arriba del calendario— así que en cuanto alguien baja
  // lo bastante para toparse con "Falta su minuta" o "Cerradas" (el caso real
  // que reportó el hallazgo, con `?sala=neracode`), el aviso YA SE SALIÓ DE
  // PANTALLA otra vez, esté o no el formulario abierto — mostrarlo en reposo
  // no habría cerrado el hueco que el hallazgo mide, solo lo habría movido de
  // "nunca se pinta en reposo" a "se pinta pero igual desaparece al bajar".
  // El arreglo real —que la COPIA de cada sección diga la verdad donde se
  // lee, sin depender de scroll— vive en la condición de cada `vacio`, más
  // abajo ("Próximas") y en `page.tsx` ("Falta su minuta"/"Cerradas"): ver
  // esos comentarios.
  const hayFiltroActivo = filtroSala !== SIN_FILTRO || filtroClase !== SIN_FILTRO
  const etiquetaFiltroSala =
    filtroSala === SIN_FILTRO
      ? null
      : filtroSala === SIN_SALA
        ? ETIQUETA_SIN_SALA
        : (salas.find((s) => s.slug === filtroSala)?.nombre ?? filtroSala)
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
          Filtro activo — {piezasFiltro.join(' · ')}: la pantalla completa —el calendario,
          Próximas, Por confirmar, Falta su minuta y Cerradas— solo enseña lo que coincide,
          aunque el formulario tape los controles.
        </p>
      )}

      {/* `.filaSuperior` (reuniones.module.css) reemplaza a `.panel`/
          `data-activo` (agenda.module.css) como el grid que reparte
          calendario y `<aside>` — ver el comentario de archivo, arriba,
          para el porqué. El calendario recibe `sesiones` tal cual: ya llega
          filtrada desde `page.tsx` (ver el comentario de esa prop) — desde
          la ronda 15 este componente no vuelve a angostarla por su cuenta. */}
      <div className={estilosCiclo.filaSuperior}>
        <Calendario
          key={mesFoco ?? 'hoy'}
          sesiones={sesiones}
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
              {/* FILTROS — sala y clase. "Todas las salas"/"Todas las
                  clases" son el valor vacío, mismo criterio que `SIN_FILTRO`
                  en `TablaAcuerdos.tsx`. Elegir cualquiera de los dos llama
                  `irAFiltro` (arriba), que navega a la misma ruta con la URL
                  actualizada — `page.tsx` vuelve a filtrar con el valor
                  nuevo y manda `filtroSala`/`filtroClase` de vuelta, ya
                  validados, como props.

                  EL RÓTULO YA VUELVE A DECIR SOLO "FILTROS" (ronda 15,
                  cierre de la deuda B): hasta esa ronda decía "Filtros —
                  calendario y Próximas" (revisión C1, hallazgo I3), porque
                  filtrar "NeraCode" aquí dejaba intactas las tarjetas de
                  otra sala en "Por confirmar"/"Falta su minuta"/"Cerradas"
                  (`page.tsx`, Server Component, fuera del filtro de cliente
                  de entonces). Con el filtro subido a `searchParams` las
                  cuatro secciones lo ven — el alcance real del rótulo YA ES
                  la pantalla entera, así que decirlo aparte dejó de sumar.

                  "SIN SALA" (ronda 15): un comité o una interna de Mkt Corp
                  no es de ninguna sala real (`salaSlug: null`) — sin esta
                  opción, esas juntas desaparecían con CUALQUIER filtro de
                  sala activo, porque ningún `<option>` las representaba. Va
                  al final de la lista, después de las salas reales: es la
                  salida para "ninguna de las de arriba", no una sala más. */}
              <div>
                <p className={estilosCiclo.huecoTitulo}>Filtros</p>
                <div className={estilosCiclo.filtros}>
                  <label className={estilosCiclo.filtro}>
                    <span className="micro" data-sinpunto>Sala</span>
                    <select
                      className={estilosCiclo.select}
                      value={filtroSala}
                      onChange={(e) => irAFiltro(e.target.value, filtroClase)}
                    >
                      <option value={SIN_FILTRO}>Todas las salas</option>
                      {salas.map((s) => (
                        <option key={s.slug} value={s.slug}>{s.nombre}</option>
                      ))}
                      <option value={SIN_SALA}>{ETIQUETA_SIN_SALA}</option>
                    </select>
                  </label>
                  <label className={estilosCiclo.filtro}>
                    <span className="micro" data-sinpunto>Clase de junta</span>
                    <select
                      className={estilosCiclo.select}
                      value={filtroClase}
                      onChange={(e) => irAFiltro(filtroSala, e.target.value)}
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

      {/* "POR CONFIRMAR" Y "FALTA SU MINUTA" (`page.tsx`, ya armadas) — EL
          ORDEN DEL TRABAJO, AHORA EN EL DOM (ronda 15, cierre de la deuda
          B): van AQUÍ, entre el calendario y "Próximas", porque las dos
          EXIGEN una acción y por eso van primero en el orden de lectura —
          ver el comentario de `entreCalendarioYProximas` (arriba, en
          `Props`) para el porqué ya no es un `order` de CSS. */}
      {/* `<Fragment key=...>`, no `{entreCalendarioYProximas}` a secas: sin la
          `key` explícita, React avisa "Each child in a list should have a
          unique key prop... Check the top-level render call using
          <PanelAgenda>" en cuanto CUALQUIER nodo llega por esta prop —
          comprobado con un `<p>` trivial, no depende del contenido real.
          `page.tsx` es un Server Component; lo que manda por esta prop cruza
          el límite RSC hacia este Client Component, y ese cruce es lo que
          hace que React trate este hueco del `return` como una posición de
          lista — la misma razón por la que `despuesDeProximas`, más abajo,
          lleva el mismo tratamiento. */}
      <Fragment key="entre-calendario-y-proximas">{entreCalendarioYProximas}</Fragment>

      {/* PRÓXIMAS (ronda 11, tarea 4): antes "Lo que viene", dentro del
          <aside> de arriba — bajó a una sección de ancho completo, con el
          mismo tratamiento (`estilosCiclo`) que "Por confirmar"/"Falta su
          minuta"/"Cerradas" en `/reuniones`. `idsProximas` ya llega
          deduplicado y filtrado (ver el comentario del archivo) — aquí solo
          se pinta. Sin clase de `order` (ronda 15): su posición aquí, entre
          `entreCalendarioYProximas` y `despuesDeProximas`, YA ES su orden
          visual — el documento no necesita que CSS lo corrija. */}
      <section className={estilosCiclo.cicloSeccion}>
        <h2 className={estilosCiclo.cicloTitulo}>
          Próximas
          <span className={estilosCiclo.conteo}>{proximas.length}</span>
        </h2>

        {/* H2 (re-revisión, ronda 16) — MISMO booleano que ya arma el aviso
            de arriba (`hayFiltroActivo`), reusado aquí para que la copia de
            vacío no mienta: medido con `?sala=neracode`, esto decía "No hay
            ninguna reunión agendada" con DOS reuniones reales filtradas
            fuera. `sesiones`/`idsProximas` ya llegan filtradas desde
            `page.tsx` (ver el comentario de esas props) — este componente no
            sabe si `reuniones.length === 0` es "no hay nada" o "nada
            coincide", así que la distinción tiene que venir del mismo dato
            que ya decide el aviso: si hay filtro activo. Mismo arreglo,
            mismo motivo, que "Falta su minuta"/"Cerradas" en `page.tsx`. */}
        {proximas.length === 0 ? (
          <p className={estilosCiclo.vacio}>
            {hayFiltroActivo
              ? 'Ninguna próxima coincide con el filtro puesto — puede haber otras agendadas fuera de él.'
              : 'No hay ninguna reunión agendada. Elige un día en el calendario para poner la primera.'}
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

      {/* "CERRADAS" (`page.tsx`, ya armada) — al final, en el DOM (mismo
          arreglo de arriba). Ver el comentario de `despuesDeProximas`
          (`Props`) para el porqué es una prop aparte de
          `entreCalendarioYProximas`, y el de `entreCalendarioYProximas` más
          arriba (en este `return`) para el porqué de `<Fragment key=...>` en
          vez de `{despuesDeProximas}` a secas. */}
      <Fragment key="despues-de-proximas">{despuesDeProximas}</Fragment>
    </>
  )
}
