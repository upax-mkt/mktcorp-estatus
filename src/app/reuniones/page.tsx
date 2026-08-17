import Link from 'next/link'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import estilos from './reuniones.module.css'
import { listarReuniones, type ReunionResumen } from '@/db/reuniones'
import { documentoDeReunion, type DocumentoCompleto } from '@/db/documentos'
import { cargarTemas, slugsDeSalas } from '@/db/temas'
import { slugsDeSalasPausadas } from '@/db/salas'
import { exigirLectura, esAdmin } from '@/auth/roles'
import { cerrarSesion } from '@/auth/sesion'
import { BarraNavegacion, clientesParaBarra } from '@/componentes/BarraNavegacion'
import { PanelAgenda, type SesionAgendada } from '@/componentes/agenda/PanelAgenda'
import { ReunionesPorConfirmar } from '@/componentes/ReunionesPorConfirmar'
import type { SesionPorConfirmar } from '@/dominio/salas'
import {
  reunionesPorConfirmar, reunionesMinutables, documentoCuentaComoPresentacion, type Reunion,
} from '@/dominio/reunion'
import { fechaCompleta, horaBreve, diaCivil } from '@/lib/fecha'
import { claveDeClase, etiquetaDeClase } from '@/secciones/plantillas'
import {
  agendarReunionAction, editarReunionAction,
  marcarPresentadaAction, marcarNoDadaAction, desmarcarNoDadaAction,
} from './acciones'

export const dynamic = 'force-dynamic'

/**
 * LOS MARCADORES DEL FILTRO — DUPLICADOS A PROPÓSITO, NO IMPORTADOS.
 *
 * `PanelAgenda.tsx` escribe la URL con estos MISMOS tres valores
 * (`''`/`'sin-sala'`/`'sin-clasificar'`) — ver su comentario, junto a donde
 * los declara. Los dos archivos necesitan la cadena EXACTA (este archivo la
 * lee de `searchParams`, `PanelAgenda` la escribe desde sus `<select>`), así
 * que en cualquier otro par de archivos esto viviría en un módulo
 * compartido — pero este archivo importa `@/db/reuniones` (Postgres) y
 * compañía, y `PanelAgenda.tsx` ('use client') va al bundle del NAVEGADOR:
 * un módulo compartido tendría que vivir fuera de los dos archivos de esta
 * tarea, y el brief pide avisar en el informe antes de tocar un archivo
 * ajeno, no crear uno nuevo por conveniencia. Tres constantes de una
 * palabra, con el mismo comentario en los dos lados: el costo de
 * mantenerlas iguales es un `grep`, no una migración.
 */
const SIN_FILTRO = ''
const SIN_SALA = 'sin-sala'
const SIN_CLASIFICAR = 'sin-clasificar'

/**
 * ¿ESTA REUNIÓN PASA LOS DOS FILTROS? Misma pregunta que hacía el
 * `useState` de `PanelAgenda` hasta la ronda 14.4 (mudado y adaptado aquí,
 * ronda 15, cierre de la deuda B: ahora corre sobre `ReunionResumen`, del
 * lado del servidor, no sobre `SesionAgendada` de cliente).
 *
 * `claveDeClase` (nunca `plantilla` crudo) para el lado de la clase: una
 * reunión con un `plantilla` que el catálogo no reconoce como clase de
 * junta —no debería pasar nunca en producción— no se queda huérfana de los
 * dos filtros de clase; `claveDeClase` ya decide que eso es "sin
 * clasificar" (ver su comentario, `secciones/plantillas.ts`).
 */
function coincideConFiltros(r: ReunionResumen, filtroSala: string, filtroClase: string): boolean {
  const salaOk =
    filtroSala === SIN_FILTRO ||
    (filtroSala === SIN_SALA ? r.salaSlug === null : r.salaSlug === filtroSala)
  const claseOk =
    filtroClase === SIN_FILTRO ||
    (filtroClase === SIN_CLASIFICAR
      ? claveDeClase(r.plantilla ?? null) === null
      : claveDeClase(r.plantilla ?? null) === filtroClase)
  return salaOk && claseOk
}

/**
 * Un `sala`/`clase` de `searchParams` es texto CRUDO de la URL — nadie
 * impide que alguien escriba "…/reuniones?sala=basura" a mano. Sin validar,
 * ese valor se colaría hasta `PanelAgenda` (el `value` de un `<select>` que
 * no coincide con ninguna `<option>`) y hasta `coincideConFiltros` (que
 * comparado contra un slug que no existe simplemente no encontraría nada,
 * pero silenciosamente: la pantalla se vería "vacía" sin decir por qué). Un
 * valor inválido cae a `SIN_FILTRO` — "no se pudo aplicar ese filtro" se lee
 * igual que "no hay filtro", que es lo más honesto que se puede decir de un
 * parámetro que no reconoce nada.
 */
function filtroValido(valor: string | undefined, esValido: (v: string) => boolean): string {
  return valor !== undefined && esValido(valor) ? valor : SIN_FILTRO
}

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
 * para pintar cada fila con sus datos completos (`sesiones` YA LLEGA
 * FILTRADA desde la ronda 15 — ver el párrafo de esa ronda, más abajo).
 *
 * AUDITORÍA UX/UI (ronda 11) — EL HUECO MUERTO: la tarea 4 (arriba) bajó
 * "Próximas" del `<aside>` de `PanelAgenda` al flujo, y con eso ese `<aside>`
 * de 22rem se quedó con un solo botón —"+ Agendar una reunión"— y el resto
 * vacío: un tercio de la pantalla reservado para nada. El arreglo subió el
 * botón a la cabecera de ESTA pantalla (mismo sitio que "+ Nueva reunión" en
 * `/deck`) y por eso esta página YA NO PINTA su propia cabecera —título y
 * subtítulo, antes un `<div className={estilos.encabezado}>` aquí mismo—:
 * la pinta `PanelAgenda`, que es quien tiene el estado (`agendando`/
 * `editando`) que el botón necesita compartir con el calendario. Ver el
 * comentario de archivo de `PanelAgenda.tsx` para el resto (por qué el
 * `<aside>` de 22rem ahora es condicional, y por qué el calendario en reposo
 * se queda capado a su ancho de siempre en vez de estirarse).
 *
 * RONDA 15 (CIERRE DE LA DEUDA B) — DOS ARREGLOS, LOS DOS EN ESTOS DOS
 * ARCHIVOS (`page.tsx`/`PanelAgenda.tsx`), NINGUNO EN CSS:
 *
 *   1. EL FILTRO SUBE A `searchParams`. Hasta esta ronda el filtro de sala/
 *      clase era un `useState` DENTRO de `PanelAgenda` (ronda 14.4, tarea 1)
 *      y solo alcanzaba al calendario y a "Próximas" —lo único que ese
 *      componente pinta—; el rótulo lo confesaba ("Filtros — calendario y
 *      Próximas"). Ahora esta función lee `sala`/`clase` de `searchParams`
 *      (`filtroValido`, arriba), los valida contra las salas reales y el
 *      catálogo de clases, y filtra `reuniones` con `coincideConFiltros`
 *      ANTES de repartirlas a las CUATRO secciones del ciclo —incluida la
 *      construcción de `documentos`/`paraElPanel`/`ciclo`, todas más abajo—:
 *      el filtro ahora sobrevive a la recarga, es enlazable, y cubre las
 *      cuatro, así que el rótulo del hueco vuelve a decir solo "Filtros".
 *      Ver `coincideConFiltros`/`SIN_SALA` (arriba) para "sin sala" —un
 *      comité o una interna de Mkt Corp— y `claveDeClase`/`SIN_CLASIFICAR`
 *      para "sin clasificar", los dos ofrecidos como opción explícita en el
 *      `<select>` de `PanelAgenda`, no perdidos con cualquier filtro activo.
 *   2. EL ORDEN VISUAL DEJA DE SER UN `order` DE CSS. "Por confirmar" y
 *      "Falta su minuta" (más abajo, en el JSX) ya no son hermanas de
 *      `<PanelAgenda>` reordenadas con `.ordenPorConfirmar`/
 *      `.ordenFaltaMinuta` (`reuniones.module.css`, retiradas en esta
 *      ronda): se le pasan como la prop `entreCalendarioYProximas`, y
 *      `PanelAgenda` las coloca en su propio `return`, físicamente entre el
 *      calendario y "Próximas" — el orden del DOM (y del tabulador, y de un
 *      lector de pantalla) ya es el orden de lectura que pidió Franco. Ver
 *      el comentario de `entreCalendarioYProximas`/`despuesDeProximas` en
 *      `PanelAgenda.tsx` (`Props`) para el mecanismo completo.
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
  /**
   * LA CLASE DE JUNTA, cruda —`null` = sin clasificar (ronda 14.4, tarea 1:
   * "la tarjeta dice qué es"). Se pinta con `etiquetaDeClase(claveDeClase(...))`
   * —NUNCA con `obtenerPlantilla(plantilla).nombre` a secas—, porque
   * `obtenerPlantilla(null)` cae a la PRIMERA del catálogo por diseño (la
   * necesita un `<select>` que nunca puede quedar vacío) y una junta sin
   * clase saldría como "Estatus de UDN": un dato inventado. Ver el
   * comentario de `claveDeClase` en `src/secciones/plantillas.ts`.
   */
  plantilla: string | null
  /**
   * ¿Hay un documento maquetado y listo (no solo un archivo subido)? Solo lo
   * usa "Cerradas", para ofrecer "Ver su documento →" además de "Ver su
   * minuta →" — mismo campo y mismo umbral que `Reunion.documentoListo`
   * (`dominio/reunion.ts`), calculado una vez en `comoReunionDeDominio` y
   * reaprovechado aquí en vez de recalcularlo.
   */
  documentoListo: boolean
}

/**
 * Arma un `ReunionEnCiclo` a partir de la reunión original (`ReunionResumen`,
 * con sala/fecha/título) y su versión ya adaptada al dominio (`Reunion`, de
 * donde sale `documentoListo`) — una sola función para las tres listas que
 * antes repetían el mismo objeto literal tres veces (`faltaMinuta`,
 * `cerradas`, `proximas`, más abajo en `cicloDeReuniones`). Añadida en la
 * ronda 14.4, tarea 1, junto con `plantilla`/`documentoListo`: sin esta
 * función, sumar esos dos campos habría significado tocar la misma línea
 * tres veces y arriesgar que una de las tres se quedara atrás.
 */
function comoReunionEnCiclo(
  original: ReunionResumen,
  adaptada: Reunion,
): ReunionEnCiclo {
  return {
    id: original.id,
    titulo: original.titulo,
    fecha: original.fecha,
    salaSlug: original.salaSlug,
    salaNombre: original.salaNombre,
    salaColor: original.salaColor,
    plantilla: original.plantilla ?? null,
    documentoListo: adaptada.documentoListo,
  }
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
      // CUMPLIMIENTO (revisión C1, ronda 14.4 tarea 1): faltaba esta línea —
      // "Por confirmar" era 1 de las 4 tarjetas de 14 sin clase de junta
      // pintada (las otras tres eran "Próximas", ver PanelAgenda.tsx).
      // `r` es `Reunion` (`reunionesPorConfirmar`, dominio/reunion.ts):
      // `plantilla` ahí es REQUERIDO (`string | null`, nunca `undefined`),
      // así que se copia tal cual — `SesionPorConfirmar.plantilla` es
      // OPCIONAL (dominio/salas.ts) porque el Home y la sala, que también
      // arman este mismo tipo, no tienen esta ronda pintando la clase; ahí
      // se queda `undefined` y `ReunionesPorConfirmar` no pinta nada, mismo
      // criterio que ya usa `plantilla` en `SesionAgendada` para distinguir
      // "no aplica aquí" de "sin clase".
      plantilla: r.plantilla,
    }
  })

  const faltaMinuta: ReunionEnCiclo[] = reunionesMinutables(adaptadas, hoyCivil)
    .filter((r) => !idsPorConfirmar.has(r.id))
    .map((r) => {
      const { r: original, adaptada } = porId.get(r.id)!
      return comoReunionEnCiclo(original, adaptada)
    })

  const cerradas: ReunionEnCiclo[] = adaptadas
    .filter((r) => Boolean(r.minuta))
    .filter((r) => !idsPorConfirmar.has(r.id))
    .map((r) => {
      const { r: original, adaptada } = porId.get(r.id)!
      return comoReunionEnCiclo(original, adaptada)
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
      const { r: original, adaptada } = porId.get(r.id)!
      return comoReunionEnCiclo(original, adaptada)
    })
    // Ascendente —la más próxima primero—, al revés que los otros tres: ahí
    // lo urgente es lo más RECIENTE (mirar atrás); aquí es lo más CERCANO
    // (mirar adelante). Mismo orden que ya usaba `PanelAgenda`.
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  return { proximas, porConfirmar, faltaMinuta, cerradas }
}

export default async function PagReuniones({
  searchParams,
}: {
  /**
   * `sala`/`clase` (ronda 15, cierre de la deuda B) — el filtro, crudo de la
   * URL. `Promise`: mismo contrato que ya usan `/entrar` y `/salas` para
   * `searchParams` en esta versión de Next (`node_modules/next/dist/docs`,
   * "Rendering with search params" — una página con `searchParams` es
   * dinámica por diseño, aunque esta ya lo era por `connection()`/`dynamic`,
   * abajo). Nunca se confía en este texto tal cual: `filtroValido` (arriba)
   * lo valida contra las salas reales y el catálogo de clases antes de que
   * llegue a filtrar una sola reunión.
   */
  searchParams: Promise<{ sala?: string; clase?: string }>
}) {
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

  const [reuniones, slugsReales, registro, pausadas, admin, clientes, searchParamsResueltos] = await Promise.all([
    listarReuniones(),
    slugsDeSalas(),
    cargarTemas(),
    // Para que "Por confirmar" respete el freeze de sala (tarea 18) — mismo
    // criterio que ya usa el Home (`estadoDeSalas()[].activa`) y la vista de
    // sala (`s.activa`), aquí resuelto aparte porque esta pantalla parte de
    // `listarReuniones()` (una lista plana), no de `estadoDeSalas()`.
    slugsDeSalasPausadas(),
    // `esAdmin()` (ronda 11, enganche de la tarea 2): el gate de Clientes/
    // Personas que pinta `BarraNavegacion`, que esta pantalla no montaba
    // hasta ahora.
    esAdmin(),
    clientesParaBarra(),
    // `searchParams` (ronda 15, cierre de la deuda B): no depende de nada de
    // lo anterior, así que se resuelve en el mismo `Promise.all` en vez de
    // un `await` aparte después — una espera menos en la cascada.
    searchParams,
  ])

  const salas = slugsReales.map((slug) => {
    const tema = registro[slug]
    return { slug, nombre: tema.nombre, color: tema.primario }
  })

  /**
   * EL FILTRO, RESUELTO Y APLICADO (ronda 15, cierre de la deuda B) — ANTES
   * de construir `documentos`/`paraElPanel`/`ciclo`, así que las CUATRO
   * secciones de esta pantalla parten de la misma lista ya filtrada, nunca
   * de la completa. `filtroValido` (arriba) es quien decide si lo que trae
   * la URL es real: `sala` contra `slugsReales` (más `SIN_SALA`, el
   * marcador de "sin ninguna sala" — ver `coincideConFiltros`) y `clase`
   * contra el catálogo (`claveDeClase(v) === v` es cierto solo para un id
   * real de clase de junta — mismo criterio que ya usa esa función para
   * decidir "esto es una clase", ver `secciones/plantillas.ts`; más
   * `SIN_CLASIFICAR`).
   *
   * Filtrar AQUÍ —antes de `documentoDeReunion` por reunión, más abajo— es
   * también más barato: con un filtro activo, `Promise.all` deja de pedir
   * el documento de reuniones que ni siquiera van a pintarse.
   */
  const filtroSala = filtroValido(searchParamsResueltos.sala, (v) => v === SIN_SALA || slugsReales.includes(v))
  const filtroClase = filtroValido(searchParamsResueltos.clase, (v) => v === SIN_CLASIFICAR || claveDeClase(v) === v)
  const reunionesFiltradas = reuniones.filter((r) => coincideConFiltros(r, filtroSala, filtroClase))
  /**
   * H2 (re-revisión, ronda 16) — "UN VACÍO QUE MIENTE ES PEOR QUE NO TENER
   * FILTRO". Hasta esta ronda, "falta su minuta" y "Cerradas" (más abajo)
   * pintaban SIEMPRE la misma copia de vacío ("Nada pendiente de minutar.",
   * "Ninguna reunión cerrada todavía.") sin importar si `reunionesFiltradas`
   * (arriba) de verdad estaba vacía o si solo el FILTRO había dejado esa
   * sección en cero. Print real con `?sala=neracode`: "falta su minuta"
   * decía "0 — Nada pendiente de minutar" con la sala filtrada, mientras la
   * lista sin filtrar tenía 6 — la copia no describía la ausencia de
   * trabajo, describía la ausencia de RESULTADOS DEL FILTRO, y las dos
   * cuentan historias opuestas. Mismo defecto en "Próximas"
   * (`PanelAgenda.tsx`, que reusa este MISMO booleano — ver su comentario).
   *
   * El arreglo es la copia, no el aviso de arriba: `hayFiltroActivo` decide
   * ENTRE DOS frases honestas, cada una cierta en su caso — no una condición
   * que se añade a la de siempre, porque "Nada pendiente de minutar,
   * filtrado por NeraCode" seguiría leyéndose como "no hay nada pendiente en
   * ningún lado", que es justo la mentira que esto cierra.
   */
  const hayFiltroActivo = filtroSala !== SIN_FILTRO || filtroClase !== SIN_FILTRO

  /**
   * `itemsLlenados`/`totalItems` no viven en `ReunionResumen` (son del
   * documento, no de la reunión — spec §1): se resuelven aquí, una consulta
   * por reunión en paralelo. La lista de reuniones es de decenas, no miles,
   * así que esto no es el problema de N+1 que sería en una lista sin cota.
   * El mismo `documentos` sirve también para `cicloDeReuniones` (abajo) —
   * una sola pasada, no dos. Sobre `reunionesFiltradas` (arriba), no
   * `reuniones`: las cuatro secciones de esta pantalla solo necesitan el
   * documento de lo que de verdad van a pintar.
   */
  const documentos = await Promise.all(reunionesFiltradas.map((r) => documentoDeReunion(r.id)))

  const paraElPanel: SesionAgendada[] = reunionesFiltradas.map((r, i) => {
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
      // CRÍTICO C2 (ronda 14-2, fix 3/4): faltaba esta línea. `ReunionResumen`
      // SÍ trae `plantilla` (`src/db/reuniones.ts`) pero este mapeo no la
      // copiaba, así que `PanelAgenda` recibía la fila SIN la clave en
      // absoluto — ni `null` ni el valor real — y su `inicial={{...}}` para
      // editar tampoco podía incluirla. `?? null`, no un `|| null`: una
      // clase real nunca es cadena vacía, así que no hay valor "falsy pero
      // válido" que perder aquí, y `?? null` deja claro que lo único que se
      // normaliza es `undefined` (el campo opcional de `ReunionResumen`) a
      // `null` (el "sin clase" que sí entiende `plantillaInicial`,
      // `FormularioSesion.tsx`).
      plantilla: r.plantilla ?? null,
      lugar: r.lugar,
      participantes: r.participantes,
      itemsLlenados: doc?.items.filter((it) => it.llenado).length ?? 0,
      totalItems: doc?.items.length ?? 0,
    }
  })

  const hoyCivil = diaCivil(hoy.toISOString())
  // `reunionesFiltradas`, no `reuniones`: `cicloDeReuniones` en sí no sabe
  // nada de filtros (su propia suite la prueba sin ellos, y sigue sin
  // tocarse) — el filtro ya se aplicó arriba, así que lo único que le llega
  // es lo que le toca ver a la URL actual.
  const ciclo = cicloDeReuniones(reunionesFiltradas, documentos, pausadas, hoyCivil)
  // Solo los ids, ya deduplicados y en orden (la más próxima primero) —
  // `PanelAgenda` los cruza contra su propio `sesiones` (ya filtrada, con
  // TODOS los campos de lo que quedó) para pintar cada fila. Ver el
  // comentario de arriba ("RONDA 11, TAREA 4") para el porqué de este
  // reparto.
  const idsProximas = ciclo.proximas.map((r) => r.id)

  // Mismo patrón que `salir` en `src/app/page.tsx` / `src/app/deck/page.tsx`:
  // repetido a propósito en cada pantalla que monta `BarraNavegacion`.
  async function salir() {
    'use server'
    await cerrarSesion()
    redirect('/entrar')
  }

  /**
   * "POR CONFIRMAR" Y "FALTA SU MINUTA" (tarea 18), ARMADAS AQUÍ COMO JSX EN
   * VEZ DE HERMANAS DE `<PanelAgenda>` (ronda 15, cierre de la deuda B — ver
   * el párrafo de esa ronda, arriba, y el comentario de
   * `entreCalendarioYProximas` en `PanelAgenda.tsx`). Esta constante NO es
   * una optimización de lectura: es lo que permite que `PanelAgenda` las
   * coloque DESPUÉS del calendario y ANTES de "Próximas" en su propio
   * `return`, sin que este archivo tenga que saber nada de dónde vive
   * "Próximas" ni `PanelAgenda` tenga que importar `cicloDeReuniones` ni
   * `ReunionesPorConfirmar`. Sigue siendo exactamente el mismo JSX que antes
   * —mismas clases, mismas condiciones de vacío— solo que ahora es una
   * expresión, no directamente hijos de `<main>`.
   */
  const seccionPorConfirmar = ciclo.porConfirmar.length > 0 && (
    // POR CONFIRMAR (tarea 18): la pregunta más básica del ciclo — "¿se dio?"
    // — antes solo en el Home y en cada sala, ahora también aquí. Mismo
    // componente, mismas tres acciones. Oculta cuando está vacía, mismo
    // criterio que el Home.
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
  )

  // SE DIERON, FALTA SU MINUTA: ocurrió (confirmada, o con presentación y día
  // pasado) y todavía no tiene acta. Mudada de `/deck` (tarea 18) — antes
  // vivía ahí por herencia, de cuando la reunión no existía como entidad
  // aparte de su documento. SIEMPRE visible, con vacío explícito: mismo
  // criterio que "Cerradas", justo abajo.
  //
  // LA TARJETA DICE QUÉ ES (ronda 14.4, tarea 1): sala (ya lo hacía) + CLASE
  // de junta, ahora también — `etiquetaDeClase(claveDeClase(...))`, nunca
  // `r.plantilla` crudo ni `obtenerPlantilla(r.plantilla).nombre` (esa cae a
  // "Estatus de UDN" con `null`, ver el comentario de `ReunionEnCiclo.plantilla`).
  const seccionFaltaMinuta = (
    <section className={estilos.cicloSeccion}>
      <h2 className={estilos.cicloTitulo}>
        Se dieron, falta su minuta
        <span className={estilos.conteo}>{ciclo.faltaMinuta.length}</span>
      </h2>
      {ciclo.faltaMinuta.length === 0 ? (
        <p className={estilos.vacio}>
          {hayFiltroActivo
            ? 'Nada coincide con el filtro puesto — puede haber pendientes en otra sala o clase.'
            : 'Nada pendiente de minutar.'}
        </p>
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
              {/* MENOR BARATO (revisión C1): el "·" ya no es un `<span>`
                  suelto (`.sep`) — ver el comentario de `.filaCicloMetaPieza`
                  en `reuniones.module.css` para el porqué (el separador
                  quedaba huérfano al envolver a 390px). */}
              <span className={estilos.filaCicloMeta}>
                <span className={estilos.filaCicloMetaPieza}>{r.salaNombre}</span>
                <span className={estilos.filaCicloMetaPieza}>{etiquetaDeClase(claveDeClase(r.plantilla))}</span>
                <span className={estilos.filaCicloMetaPieza}>{fechaCompleta(r.fecha)} · {horaBreve(r.fecha)}</span>
              </span>
              <span className={estilos.filaCicloAccion}>Generar su minuta →</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )

  // CERRADAS: dada y minutada, nada pendiente. Mudada de `/deck` (tarea 18),
  // misma razón que la anterior.
  //
  // YA NO ES UN CEMENTERIO (ronda 14.4, tarea 1). Antes la tarjeta ENTERA era
  // un único `<Link>` a `/cliente/<slug>` —un salto indirecto, nunca al
  // destino que de verdad se busca al mirar una reunión cerrada— y sin sala
  // (comité) ni siquiera eso: puro texto, sin ningún enlace. Ahora cada
  // tarjeta ofrece sus DOS destinos reales, iguales a los que ya ofrece
  // `ReunionesSala` en la sala ("Ver la presentación →"/"Corregir el texto
  // →"): su MINUTA (`/deck/<id>/minuta`, funciona con o sin sala — una
  // reunión de comité también tiene minuta) y, solo si hay un documento
  // MAQUETADO de verdad (`documentoListo` — mismo umbral que
  // `ReunionesSala`, no `tienePresentacion`: un PDF subido no tiene
  // `/reunion/<id>` que enseñar), su DOCUMENTO. La tarjeta deja de ser un
  // único `<a>` —dos enlaces no pueden anidarse— así que la sala, cuando
  // existe, se vuelve SU PROPIO enlace (mismo tratamiento que
  // `FilaAcuerdo.tsx`: el nombre de la sala, no la tarjeta entera, es el
  // camino de vuelta a ella).
  //
  // SE PLIEGA (revisión C1, hallazgo I2): requisito literal del brief (Step
  // 4.2) que se quedó fuera de la primera pasada. `<h2
  // className={estilos.cicloTitulo}>` pasa a ser el ÚNICO hijo de
  // `<summary>` —el HTML lo permite cuando es el primer hijo de un
  // `<details>`— para no perder el rol `heading` que protege el guardia "los
  // cuatro módulos siguen existiendo" (`page.test.tsx`):
  // `estilos.cerradasResumen` (el `<summary>`) pone el cursor, el marcador y
  // el foco; `estilos.cicloTitulo` (el `<h2>` de adentro) sigue siendo la
  // MISMA tipografía que ya usan las otras tres cabeceras, sin duplicarla.
  // `open` fijo, no `useState`: página Server Component, el navegador ya
  // sabe abrir/cerrar un `<details>` sin JavaScript — mismo criterio que los
  // acuerdos cumplidos de la sala (`cliente/[slug]/page.tsx`).
  const seccionCerradas = (
    <section className={estilos.cicloSeccion}>
      <details open>
        <summary className={estilos.cerradasResumen}>
          <h2 className={estilos.cicloTitulo}>
            Cerradas
            <span className={estilos.conteo}>{ciclo.cerradas.length}</span>
          </h2>
        </summary>
        {ciclo.cerradas.length === 0 ? (
          <p className={estilos.vacio}>
            {hayFiltroActivo
              ? 'Ninguna reunión cerrada coincide con el filtro puesto.'
              : 'Ninguna reunión cerrada todavía.'}
          </p>
        ) : (
          <div className={estilos.listaCiclo}>
            {ciclo.cerradas.map((r) => (
              <div key={r.id} className={estilos.filaCiclo} style={{ '--sala': r.salaColor } as React.CSSProperties}>
                <span className={estilos.filaCicloTitulo}>{r.titulo}</span>
                {/* MENOR BARATO (revisión C1): `.filaCicloMetaPieza`, no
                    `.sep` — ver el comentario en `reuniones.module.css`. */}
                <span className={estilos.filaCicloMeta}>
                  {r.salaSlug ? (
                    <Link href={`/cliente/${r.salaSlug}`} className={`${estilos.filaCicloSala} ${estilos.filaCicloMetaPieza}`}>
                      {r.salaNombre}
                    </Link>
                  ) : (
                    <span className={estilos.filaCicloMetaPieza}>{r.salaNombre}</span>
                  )}
                  <span className={estilos.filaCicloMetaPieza}>{etiquetaDeClase(claveDeClase(r.plantilla))}</span>
                  <span className={estilos.filaCicloMetaPieza}>{fechaCompleta(r.fecha)} · {horaBreve(r.fecha)}</span>
                </span>
                <span className={estilos.filaCicloAcciones}>
                  <Link href={`/deck/${r.id}/minuta`} className={estilos.filaCicloAccion}>
                    Ver su minuta →
                  </Link>
                  {r.documentoListo && (
                    <Link href={`/reunion/${r.id}`} className={estilos.filaCicloAccion}>
                      Ver su documento →
                    </Link>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </details>
    </section>
  )

  return (
    <div className={estilos.app}>
      {/* LA BARRA (ronda 11, enganche de la tarea 2) SUSTITUYE A LA CABECERA
          ENTERA, no solo a su `<nav>`: el viejo `<header>` traía "← Meeting
          Hub" (mismo destino que ya cubre el logo de `BarraNavegacion`) y un
          `barraTitulo` "Reuniones" que ya duplicaba el `<h1>` de
          `.encabezado` (hoy pintado por `PanelAgenda`, no por este archivo —
          ver el arreglo del hueco muerto, más arriba). `/reuniones` es una de
          las cinco pestañas del ciclo, no una pantalla de detalle —mismo caso
          que `/deck`, `/acuerdos`, `/salas` y `/personas`, ninguna de las cuales
          conserva un "← volver" propio junto a la barra—, así que aquí no
          aplica "las pantallas de detalle conservan su volver": ese "←
          Meeting Hub" era justo la copia divergida que esta ronda vino a
          unificar (ver la cabecera de `BarraNavegacion.tsx`), no un nivel de
          jerarquía distinto que deba sobrevivir aparte. */}
      <BarraNavegacion seccionActiva="reuniones" hoy={hoy} admin={admin} clientes={clientes} salirAction={salir} />

      <main className={estilos.main}>
        {/* UN SOLO HIJO DE `<main>` (ronda 15, cierre de la deuda B) —antes,
            `<PanelAgenda>` iba seguido de las tres secciones del ciclo como
            HERMANAS suyas, con `order` de CSS reordenándolas visualmente por
            encima de "Próximas" (que nace dentro de `PanelAgenda`). Ahora
            "Por confirmar"/"Falta su minuta" (`entreCalendarioYProximas`) y
            "Cerradas" (`despuesDeProximas`) se pasan como JSX ya armado, y es
            `PanelAgenda` quien decide dónde caen en su propio `return` — el
            orden del DOM ya es el orden visual, sin CSS que lo corrija. Ver
            el párrafo de esta ronda, arriba, y el comentario de esas dos
            props en `PanelAgenda.tsx`.

            Título + "agendar" ya no se pintan aquí (auditoría UX/UI, ronda 11
            — arreglo del hueco muerto que dejaba el <aside> del calendario
            una vez que "Próximas" bajó al flujo): los pinta `PanelAgenda`,
            que es quien tiene el estado que el botón necesita compartir con
            el calendario — ver su comentario de archivo para el porqué. Sin
            `titulo`/`subtitulo` aquí: su default YA ES la copia real de esta
            pantalla (PanelAgenda es de un solo uso), así que repetirla en
            los dos archivos no sumaría nada. */}
        <PanelAgenda
          sesiones={paraElPanel}
          salas={salas}
          hoy={hoy.toISOString()}
          idsProximas={idsProximas}
          filtroSala={filtroSala}
          filtroClase={filtroClase}
          agendarAction={agendarReunionAction}
          editarAction={editarReunionAction}
          entreCalendarioYProximas={(
            <>
              {seccionPorConfirmar}
              {seccionFaltaMinuta}
            </>
          )}
          despuesDeProximas={seccionCerradas}
        />
      </main>
    </div>
  )
}
