/**
 * LA REUNIÓN COMO ENTIDAD (ronda 10, tarea 6, spec §1): la junta en sí,
 * aparte de lo que se prepara para ella (el documento — Tarea 5,
 * `src/db/documentos.ts`) y aparte de la sala que la aloja
 * (`dominio/salas.ts`). Es el corazón conceptual de la ronda: hasta ahora una
 * reunión solo se daba por dada si su documento estaba maquetado, así que
 * subir el PDF de una junta que ya ocurrió no bastaba para que contara. La
 * regla nueva vive en `fueDada`, más abajo: una junta se da por dada si ALGO
 * la respalda — su documento TERMINADO, un archivo, o su minuta.
 *
 * PURO, como `dominio/salas.ts` — mismo criterio, misma única excepción: se
 * importa `diaCivil` de `src/lib/fecha.ts` (no se repite el cálculo a mano;
 * ver la cabecera de `salas.ts` para el porqué completo).
 *
 * Import cruzado a propósito: `EstatusAcuerdo` sale de `@/db/acuerdos` y
 * `TipoReunion`/`EstadoReunion` de `@/db/reuniones` — los tres ya existen ahí
 * y redefinirlos aquí sería la misma duplicación que esta ronda viene
 * corrigiendo. Los tres se importan como TIPO (`import type`): se borran al
 * compilar, así que este módulo sigue sin ninguna dependencia en tiempo de
 * ejecución de la capa de datos — la misma garantía que promete la cabecera
 * de `salas.ts`.
 *
 * `Minuta` VIVE AQUÍ, no en `salas.ts` (Tarea 7). Hasta esa tarea este módulo
 * la importaba de `salas.ts` como tipo, y `salas.ts` importaba `Cadencia` de
 * aquí — un ciclo de tipos, transitorio y sin efecto en runtime
 * (`import type` se borra al compilar) pero un ciclo al fin. La Tarea 6 no lo
 * podía deshacer: `salas.ts` todavía usaba `Minuta` en `EstadoSala.minutas` y
 * en el `Reunion`/`reunionesDeSala` viejos. La Tarea 7 quitó las dos cosas
 * (`EstadoSala.reuniones` sustituye a `presentaciones`+`minutas`, y el par
 * viejo se jubiló con ellas) — sin más razón para que `Minuta` siguiera en
 * `salas.ts`, se mudó aquí, que es quien de verdad la necesita
 * (`Reunion.minuta`, `DatosDeSalaParaReuniones.minutas`). `salas.ts` sigue
 * importando `Cadencia` de aquí para `EstadoSala.cadencia` — esa dirección
 * única es la que queda, sin ciclo.
 */
import { diaCivil } from '@/lib/fecha'
import type { EstatusAcuerdo } from '@/db/acuerdos'
import type { TipoReunion, EstadoReunion } from '@/db/reuniones'

/**
 * Lo que se acordó en una reunión, ya levantado.
 *
 * MUDADO DE `dominio/salas.ts` EN LA TAREA 7 — ver el porqué en la cabecera
 * de este módulo. No lleva `id` propio: su identidad es la reunión de la que
 * cuelga (`Reunion.minuta`), así que dentro de un `Reunion` no hace falta uno
 * aparte.
 */
export interface Minuta {
  fecha: string // ISO
  titulo: string
  enviadaA: number // # de participantes
  /**
   * El texto de la minuta, para leerla SIN salir de la sala.
   *
   * Antes la sala solo llevaba a `/preparar/{id}/minuta`, que es la pantalla
   * de edición del equipo: un director al que se le comparte su sala no puede
   * entrar ahí, así que su lista de minutas no llevaba a ninguna parte.
   */
  texto?: string
}

/**
 * Con qué frecuencia se reúne una sala. Sustituye al literal suelto
 * `'semanal' | 'quincenal' | 'mensual'` que vivía incrustado en
 * `EstadoSala.cadencia` (`dominio/salas.ts`) — mismos tres valores que
 * `TipoReunion` (`db/reuniones.ts`) por coincidencia, no por ser el mismo
 * eje: `Cadencia` es cada cuánto se junta la sala (una propiedad de la
 * SALA); `TipoReunion` es qué clase de junta es ESTA reunión en particular.
 */
export type Cadencia = 'semanal' | 'quincenal' | 'mensual'

/** Un archivo colgado de una reunión (PDF de una junta que ya pasó, deck viejo, etc.). */
export interface CaraArchivo {
  id: string
  titulo: string
  nombreOriginal: string
  url: string
}

/** Un acuerdo visto desde la reunión donde nació: lo justo para pintarlo. */
export interface AcuerdoDeReunion {
  id: string
  que: string
  responsable: string
  estatus: EstatusAcuerdo
  fechaCompromiso: string | null // ISO o null
}

export interface Reunion {
  id: string
  fecha: string // ISO
  titulo: string
  tipo: TipoReunion
  estado: EstadoReunion
  noDadaEn: string | null // ISO, o null = nadie ha dicho que esta reunión no se dio
  documentoId?: string
  /**
   * CORREGIDO EL 4-AGO. Hace falta aparte de `documentoId` porque en los
   * datos reales CASI TODA reunión tiene documento: `/agenda`
   * (`src/app/agenda/page.tsx`) agenda llamando a `crearReunionConDocumento`
   * (`src/db/documentos.ts`), así que la plantilla nace CON la junta.
   * `Boolean(documentoId)` no distingue nada; el equivalente del viejo
   * estado `lista` es este: el documento está TERMINADO (`estado === 'listo'`
   * en `EstadoDocumento`, `db/documentos.ts`).
   */
  documentoListo: boolean
  archivos: CaraArchivo[]
  minuta?: Minuta // el tipo que ya existe en dominio/salas.ts
  acuerdos: AcuerdoDeReunion[]
}

/**
 * Lo que la sala le pasa a `reunionesDeSala`: cuatro listas planas —tal como
 * salen de sus tablas respectivas— que aquí se cosen por reunión. Función
 * pura: no consulta nada, recibe lo que la Tarea 7 le arme desde Postgres.
 */
export interface DatosDeSalaParaReuniones {
  reuniones: Array<Omit<Reunion, 'archivos' | 'minuta' | 'acuerdos'>>
  archivos: Array<CaraArchivo & { reunionId: string }>
  minutas: Array<Minuta & { reunionId: string }>
  acuerdos: Array<AcuerdoDeReunion & { reunionOrigenId: string }>
}

/**
 * Las reuniones de una sala, de la más reciente a la más antigua, con sus
 * archivos, su minuta y sus acuerdos ya cosidos.
 *
 * Un archivo y una minuta que cuelgan de la MISMA reunión son UNA reunión,
 * no dos —la reunión es la unidad, nunca lo que se cosió sobre ella—, así
 * que aquí no hay que emparejar por fecha ni por ninguna otra heurística: el
 * `id` de la reunión ya es la clave que trae cada lista.
 */
export function reunionesDeSala(datos: DatosDeSalaParaReuniones): Reunion[] {
  const archivosPorReunion = new Map<string, CaraArchivo[]>()
  for (const { reunionId, ...archivo } of datos.archivos) {
    const lista = archivosPorReunion.get(reunionId)
    if (lista) lista.push(archivo)
    else archivosPorReunion.set(reunionId, [archivo])
  }

  const minutaPorReunion = new Map<string, Minuta>()
  for (const { reunionId, ...minuta } of datos.minutas) {
    minutaPorReunion.set(reunionId, minuta)
  }

  const acuerdosPorReunion = new Map<string, AcuerdoDeReunion[]>()
  for (const { reunionOrigenId, ...acuerdo } of datos.acuerdos) {
    const lista = acuerdosPorReunion.get(reunionOrigenId)
    if (lista) lista.push(acuerdo)
    else acuerdosPorReunion.set(reunionOrigenId, [acuerdo])
  }

  return datos.reuniones
    .map((r) => ({
      ...r,
      archivos: archivosPorReunion.get(r.id) ?? [],
      minuta: minutaPorReunion.get(r.id),
      acuerdos: acuerdosPorReunion.get(r.id) ?? [],
    }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
}

/**
 * Documento TERMINADO, un archivo, o una minuta: cualquiera prueba que la
 * junta ocurrió.
 *
 * `documentoListo`, no `documentoId`: casi toda reunión tiene documento desde
 * que se agenda (la plantilla nace con ella), así que su mera existencia no
 * prueba nada. Es el mismo umbral que usaba el estado `lista` en el viejo
 * `salas.ts:fueDada` — no uno inventado aparte.
 */
function tieneRespaldo(r: Reunion): boolean {
  return r.documentoListo || r.archivos.length > 0 || Boolean(r.minuta)
}

/**
 * SI UNA REUNIÓN YA OCURRIÓ, sin que nadie tenga que decirlo.
 *
 * Hasta esta tarea, una junta solo se daba por dada si su documento estaba
 * maquetado — subir el PDF de una junta que ya pasó no bastaba para que
 * contara, porque ese PDF no era "el documento de la sesión". Ahora basta
 * con que ALGO la respalde: su documento terminado, un archivo, o su minuta.
 *
 * Dos cosas pueden desmentir la deducción, en los dos sentidos:
 *
 * - Lo EXPLÍCITO manda siempre que existe: `estado === 'dada'` es un hecho
 *   que alguien confirmó, así que gana sin mirar respaldo ni fecha.
 * - `noDadaEn` es lo contrario: alguien dijo explícitamente que ESTA reunión
 *   en concreto NO se dio —se canceló, se pospuso— y eso manda sobre la
 *   deducción automática. Nunca sobre lo explícito positivo: si ya está
 *   `dada`, `noDadaEn` ni se consulta.
 *
 * A falta de las dos, se deduce: con respaldo Y su día CIVIL ya pasado,
 * estrictamente antes de hoy. "Estrictamente" es a propósito — hoy nunca es
 * "ya pasado" pase lo que pase con el reloj: se compara por DÍA
 * (`diaCivil`, fuente única en `src/lib/fecha.ts`), nunca por instante.
 */
export function fueDada(r: Reunion, hoyCivil: string): boolean {
  if (r.estado === 'dada') return true // lo explícito manda
  if (r.noDadaEn) return false // negarlo también es explícito
  if (!tieneRespaldo(r)) return false // nada que respalde que ocurrió
  return diaCivil(r.fecha) < hoyCivil // por DÍA, nunca por instante
}

/**
 * ¿EL DOCUMENTO DE UNA REUNIÓN CUENTA COMO SU PRESENTACIÓN? (ronda 13)
 *
 * Franco, sobre la reunión de junio de Marketing United: *"aparece un
 * elemento llamado 'documento', no sé qué hace ahí y no lo puedo eliminar"*.
 * Y tenía razón en las dos mitades: ese documento estaba en estado `listo`
 * con CERO secciones, creado el 28-jul y nunca tocado.
 *
 * De dónde salen esos fantasmas: **`/deck/<id>` crea el documento al
 * abrirlo** (así el editor siempre tiene sobre qué escribir), de modo que
 * basta con que alguien entrara a mirar para que la junta quedara con una
 * presentación que nadie armó. Hasta aquí el umbral era solo
 * `estado === 'listo'`, y un documento vacío marcado listo pasaba por
 * presentación: la tarjeta ofrecía «Documento» y detrás no había nada.
 *
 * El estado sigue mandando —un documento a medias no se le enseña a la
 * UDN—, pero ahora además tiene que **tener algo dentro**. Las dos
 * condiciones dicen cosas distintas: el estado es una decisión ("con esto se
 * presenta") y las secciones son un hecho.
 */
export function documentoCuentaComoPresentacion(
  estado: string | null | undefined,
  secciones: number,
): boolean {
  return estado === 'listo' && secciones > 0
}

/**
 * ¿Hay algo que enseñarle a la UDN como "la presentación de esa junta"? Un
 * documento a medio maquetar todavía no lo es — por eso `documentoListo` y no
 * `documentoId`, igual que en `fueDada`. De esto depende que la Tarea 9 pinte
 * el botón "Subir presentación" o el enlace a lo que ya hay.
 */
export function tienePresentacion(r: Reunion): boolean {
  return r.documentoListo || r.archivos.length > 0
}

/**
 * QUÉ REUNIONES SE PUEDEN MINUTAR: las que tienen algo que respalde que
 * ocurrieron (mismo criterio que `fueDada`, incluido lo explícito) y todavía
 * no tienen minuta.
 *
 * El día se compara con `<=`, no con `<` como en `fueDada`: minutar no espera
 * al día siguiente. Una reunión de esta mañana ya se puede minutar esta
 * tarde, aunque `fueDada` —para la que "hoy nunca es ya pasado"— todavía la
 * cuente como pendiente. Son dos preguntas distintas: "¿ya se puede dar por
 * ocurrida sin que nadie lo diga?" (fueDada, conservadora) y "¿ya hay algo
 * que transcribir?" (esto, más permisiva).
 *
 * "No se dio" tampoco se minuta: nada que transcribir de una reunión que no
 * ocurrió — mismo criterio que `fueDada`.
 */
export function reunionesMinutables(rs: Reunion[], hoyCivil: string): Reunion[] {
  return rs
    .filter((r) => !r.minuta)
    .filter((r) => !r.noDadaEn)
    .filter((r) => r.estado === 'dada' || tienePresentacion(r))
    .filter((r) => diaCivil(r.fecha) <= hoyCivil)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
}

/**
 * QUÉ REUNIONES NECESITAN UNA PALABRA HUMANA: las que la deducción automática
 * de `fueDada` ya cuenta como dadas —tienen respaldo y su día ya pasó—, para
 * poder negarlas si hace falta.
 *
 * Se ofrecen las DOS caras, no solo las que faltan por confirmar: una reunión
 * ya marcada `noDadaEn` SIGUE apareciendo (con esa marca puesta), para que se
 * pueda deshacer — si desapareciera al marcarla, no habría cómo arrepentirse.
 * Por eso este filtro mira el respaldo directamente y no llama a `fueDada` a
 * secas: `fueDada` respeta `noDadaEn` y diría que no, justo lo contrario de
 * lo que hace falta aquí.
 *
 * Una reunión ya `dada` explícitamente no se pregunta: es un hecho confirmado,
 * no una duda que ofrecer.
 *
 * RESPETA EL FREEZE DE LA SALA (Tarea 7, regresión cerrada). Su antecesora
 * —`sesionesPorConfirmar`, `dominio/salas.ts:435`— filtra por
 * `salaActiva !== false` desde el 3-ago, el día antes de esta ronda (commit
 * `f51ef38`): confirmar o negar una reunión es justo la "gestión" que el
 * freeze comercial congela (mismo criterio que `crearReunion`, que bloquea
 * trabajo nuevo para una sala en pausa — ver `src/db/reuniones.ts`). `Reunion`
 * no lleva `salaActiva` a propósito —no es una propiedad de la reunión, es de
 * la SALA que la aloja— así que viaja como campo adicional en la entrada,
 * igual que hacía la vieja función con su objeto de sesión. El filtro vive
 * AQUÍ, dentro de la función compartida, y no en cada pantalla que la llama:
 * el comentario original explica por qué — "si cada pantalla se acordara de
 * filtrar, bastaría con que UNA se olvidara". `!== false` (no `=== true`): una
 * reunión cuyo llamador no sabe si su sala está activa no tiene freeze que
 * respetar, y debe seguir ofreciéndose — mismo criterio que la vieja función.
 */
export function reunionesPorConfirmar(
  rs: Array<Reunion & { salaActiva?: boolean }>,
  hoyCivil: string,
): Reunion[] {
  return rs
    .filter((r) => r.salaActiva !== false)
    .filter((r) => r.estado !== 'dada')
    .filter((r) => tieneRespaldo(r) && diaCivil(r.fecha) < hoyCivil)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
}

/**
 * ═══ LO QUE VIENE Y LO QUE YA PASÓ ═══════════════════════════════════════
 *
 * Franco: *"sigue estando rara la lógica en el módulo de reuniones dentro de
 * la sala: había una presentación, entré, la descarté, pero sigue apareciendo
 * en la sala para editar; y la otra reunión tampoco puedo eliminarla"*.
 *
 * Lo que estaba raro era que la sala repartía la MISMA reunión en tres
 * bloques que no se hablaban entre ellos —"en preparación" arriba, la lista
 * de reuniones en medio, "por confirmar" abajo— y ninguno preguntaba lo
 * mismo. Una junta del 20 de agosto salía rotulada "La última" porque la
 * lista ordena por fecha y toma la primera, sin mirar si ya ocurrió.
 *
 * Estas dos funciones parten la lista por la única frontera que de verdad
 * cambia lo que se puede hacer con una reunión: **si su día ya pasó**. Antes
 * se prepara; después se minuta y se archiva.
 */

/**
 * LO QUE VIENE: su día no ha llegado (o es hoy) y nadie la ha dado por dada.
 *
 * `estado !== 'dada'` respeta lo explícito: si alguien confirmó que ya se dio
 * —una junta adelantada, un error al marcarla— manda esa palabra y no el
 * calendario, igual que en `fueDada`.
 *
 * Orden ASCENDENTE, al revés que el historial: lo primero de la lista es lo
 * que hay que preparar antes.
 */
export function reunionesPorVenir(rs: Reunion[], hoyCivil: string): Reunion[] {
  return rs
    .filter((r) => r.estado !== 'dada')
    .filter((r) => !r.noDadaEn)
    .filter((r) => diaCivil(r.fecha) >= hoyCivil)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
}

/**
 * EL HISTORIAL: todo lo demás. Lo que ya ocurrió, lo que se dio por ocurrido
 * y lo que se marcó como no dado — con su documento, sus archivos, su minuta
 * y sus acuerdos.
 *
 * Se define como el COMPLEMENTO EXACTO de `reunionesPorVenir` y no con su
 * propio juego de filtros: dos listas con criterios paralelos se separan en
 * cuanto una cambia, y entonces una reunión desaparece de las dos o sale en
 * las dos. Aquí eso no puede pasar.
 */
export function historialDeReuniones(rs: Reunion[], hoyCivil: string): Reunion[] {
  const porVenir = new Set(reunionesPorVenir(rs, hoyCivil).map((r) => r.id))
  return rs.filter((r) => !porVenir.has(r.id)).sort((a, b) => b.fecha.localeCompare(a.fecha))
}

/**
 * ¿HAY UNA PRESENTACIÓN A MEDIO ARMAR EN EL EDITOR?
 *
 * `documentoId`, no `documentoListo`: son preguntas distintas. `documentoListo`
 * dice si hay algo que ENSEÑARLE a la UDN (por eso lo usa `tienePresentacion`);
 * esto dice si hay algo que SEGUIR EDITANDO, que es cierto desde que existe el
 * documento aunque no tenga ni una sección llena.
 *
 * EL BUG QUE CIERRA: la sala ofrecía "Seguir editando →" a toda reunión
 * agendada, mirara o no si había documento. Franco descartó la presentación
 * de NeraCode —lo que borra el documento y deja la reunión en el calendario,
 * que es justo lo que pidió— y la sala siguió ofreciéndole seguir editando
 * algo que ya no existía, con "0 de 0 secciones" debajo.
 */
export function seEstaArmando(r: Reunion): boolean {
  return Boolean(r.documentoId)
}
