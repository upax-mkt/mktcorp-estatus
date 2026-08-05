/**
 * EL ESTADO DE LA RELACIÓN CON CADA SALA: tipos y lógica derivada.
 *
 * Aquí NO hay datos. Ni uno. Todo lo que la app enseña —acuerdos, reuniones,
 * minutas, y desde la ronda 8 también el nombre y la marca de cada sala— sale
 * de lo que el equipo creó o editó en la propia app y vive en su base de
 * datos; si algo se borra o cambia ahí, cambia en la app. Este módulo solo
 * define QUÉ es el estado de una sala y cómo se calculan sus derivados
 * (temperatura, urgencia, pulso del mes).
 *
 * Única excepción a "sin datos": `fueDada` importa `diaCivil` de
 * `src/lib/fecha.ts`. No es una excepción real — `lib/fecha.ts` tampoco toca
 * la base ni depende de nada externo, es la misma clase de función pura que
 * vive aquí — pero SÍ es la fuente única para "a qué día civil pertenece un
 * instante" (ver la cabecera de ese archivo: esta app ya tuvo un bug de
 * fechas corridas un día por no anclarlas ahí), así que se importa en vez de
 * repetir el cálculo a mano.
 *
 * Hasta el 30-jul las diez salas SÍ eran configuración de código
 * (`src/temas/`) y `estadoDeSalas()` podía enumerarlas sin tocar la base: era
 * el respaldo para cuando no hay DATABASE_URL. Desde que la marca se edita
 * desde la app, esa lista dejó de ser algo que este módulo —puro, sin
 * `async`— pueda ofrecer por su cuenta: ver `estadoDeSalas()` más abajo.
 */
import { diaCivil } from '@/lib/fecha'
import type { Cadencia, Reunion } from './reunion'

export type EstatusAcuerdo = 'abierto' | 'cumplido' | 'vencido'

export interface Acuerdo {
  id: string
  que: string
  responsable: string
  squad?: string
  fechaCompromiso: string | null // ISO, o null = "por definir"
  estatus: EstatusAcuerdo
  /**
   * Si está destacado en el Home (tarea 11). Opcional porque solo la capa de
   * DB lo sabe poblar: el store en memoria (sin DATABASE_URL) no modela
   * `acuerdos.destacado`, igual que no modela `salas.activa` — ver la
   * cabecera de `todosLosAcuerdos` en src/db/consultas.ts.
   */
  destacado?: boolean
  /**
   * DE QUÉ REUNIÓN NACIÓ (ronda 10, tarea 10; dato en base desde la tarea 3:
   * `acuerdos.reunion_origen_id`). Es lo que permite agrupar los acuerdos de
   * la sala por la junta donde se levantaron — ver `AcuerdosDeReunion`
   * (`src/componentes/reuniones`) y `estadoDeSalaDB` (`src/db/consultas.ts`),
   * que deriva de aquí el `Reunion.acuerdos` de cada reunión.
   *
   * `null` en dos casos, ninguno un error: el acuerdo se levantó a mano fuera
   * de cualquier reunión, o su reunión se borró después —la clave ajena se
   * anula, no cascada (ver `src/db/reuniones.ts`), y el compromiso
   * sobrevive sin dueño. Un acuerdo con `reunionOrigenId` nulo no aparece en
   * ningún desplegable de reunión; sigue vivo aquí, en la lista de la sala,
   * que es donde se le da seguimiento.
   *
   * Opcional, como `destacado` arriba: solo la capa de DB (`estadoDeSalaDB`)
   * lo sabe poblar — y así ningún consumidor que arma un `Acuerdo` sin pensar
   * en su reunión de origen (p. ej. `motor/maquetar.test.ts`, que solo
   * maqueta pendientes) tiene que inventar un valor que no le importa.
   */
  reunionOrigenId?: string | null
}

export interface EstadoSala {
  slug: string
  nombre: string
  color: string
  /**
   * El logo subido desde `/salas` (tarea 6), o `null` si la sala todavía usa
   * el archivo estático de `/public/logos` (revisión final de la rama, punto
   * 3). Ver `archivoDeLogo`, src/temas/logos.ts — es el dato que le falta
   * para no pintar una imagen rota en la tarjeta del hub y en la portada de
   * la sala cuando se trata de una sala creada desde la app.
   */
  logoUrl: string | null
  /** Días desde la última sesión. Alto = desatendida. `null` = nunca. */
  diasDesdeUltima: number | null
  ultimaSesion: string | null // ISO
  /**
   * RENOMBRADO EN LA TAREA 7 (`proximaSesion` → `proximaReunion`): "sesión"
   * desaparece de la interfaz, y este campo llega a pantalla (el hub y la
   * sala lo pintan como "próxima reunión"). Mismo dato — la fecha ISO de la
   * próxima reunión agendada, o `null` si no hay ninguna.
   */
  proximaReunion: string | null // ISO
  enPreparacion: boolean
  avancePreparacion?: number // 0..100
  /**
   * RENOMBRADO EN LA TAREA 7 (`sesionEnPreparacionId` → `documentoEnPreparacionId`):
   * el DOCUMENTO que se está preparando, para poder ir directo a él —
   * `/deck/{id}` sigue recibiendo el id de la REUNIÓN (la heredó de su
   * sesión), así que en la práctica este id es el de la reunión en
   * preparación, no el de su fila en `documentos`. El nombre cambia porque lo
   * que decide "en preparación" ahora es el DOCUMENTO (`EstadoDocumento`,
   * `db/documentos.ts`), no un estado fundido de la reunión.
   */
  documentoEnPreparacionId?: string
  /**
   * Cuántas secciones lleva escritas y cuántas tiene.
   *
   * Es lo que hace VISIBLE el borrador colaborativo: varias personas llenan
   * secciones distintas de la misma sesión y el hub lo enseña en crudo — "5
   * de 14" dice más que una barra al 36%.
   */
  seccionesEscritas?: number
  seccionesTotales?: number
  acuerdos: Acuerdo[]
  /**
   * LAS REUNIONES DE LA SALA (Tarea 7): sustituye a `presentaciones` +
   * `minutas` — dos listas paralelas, cada una ordenada por su cuenta, que
   * había que cruzar a mano para saber qué se acordó en la presentación de
   * mayo. `Reunion` (`dominio/reunion.ts`) es la reunión como entidad propia
   * (spec §1): trae su presentación (`documentoListo`/`archivos`), su minuta
   * y sus acuerdos ya cosidos. De la más reciente a la más antigua — ver
   * `reunionesDeSala`, `dominio/reunion.ts`.
   */
  reuniones: Reunion[]
  /**
   * Cadencia acordada; usada para juzgar si está desatendida.
   *
   * `quincenal` existe aquí desde la ronda 10 (tarea 1: `cadenciaEnum` ganó
   * el valor) y desde la tarea 6 `temperatura()` (más abajo) ya la distingue
   * de `mensual` con su propio umbral — ver `UMBRALES`. Ninguna sala la
   * tiene asignada todavía en la práctica: la interfaz para elegirla es
   * tarea aparte (T16, "Quincenal en la interfaz").
   *
   * El tipo es `Cadencia` (`dominio/reunion.ts`), no un literal local: mismos
   * tres valores que `TipoReunion` por coincidencia, no por ser el mismo eje
   * — ver la cabecera de ese módulo para el porqué.
   */
  cadencia: Cadencia
  /**
   * FREEZE COMERCIAL (tarea 12, ronda 7). `false` = no hay reuniones ni
   * gestión hasta nuevo aviso.
   *
   * Una sala en pausa no se borra ni se esconde: su historia sigue entera y
   * se consulta. Lo que se apaga es lo que la app le EXIGE — ver
   * `acuerdosVencidos`, `acuerdosAbiertos`, `ordenarPorProximaReunion` y
   * `estaCongelado` más abajo, y `crearReunion` en src/db/reuniones.ts (no se
   * puede crear una reunión nueva sin reactivarla primero, salvo que sea
   * historia — ver el comentario de `DatosDeReunion.estado` ahí).
   */
  activa: boolean
  /** Desde cuándo está en pausa. ISO, o `null` si nunca se pausó (o ya se reactivó). */
  pausadaDesde: string | null
}

/**
 * El estado de las salas sin base de datos: VACÍO. Siempre.
 *
 * Hasta el 30-jul este era el camino de respaldo para dev sin `DATABASE_URL`:
 * como el nombre y el color de cada sala vivían en código (`src/temas`), se
 * podían enumerar sin tocar Postgres. Desde que esa marca es dato editable
 * (ronda 8, tarea 5), este módulo —puro, sin `async`— ya no tiene de dónde
 * sacarla: `cargarTemas()` (`src/db/temas.ts`) es quien la lee, y solo puede
 * hacerlo con `await`.
 *
 * `[]` es la verdad honesta que le queda a este camino: sin base no hay ni
 * sesión, ni acuerdo, ni minuta que enseñar —eso ya era cierto antes— y ahora
 * tampoco hay una lista de salas que ofrecer sin inventarla. `src/db/consultas.ts`,
 * quien de verdad decide qué se pinta, no depende de esto: con DATABASE_URL
 * consulta Postgres directamente, y sin ella cae a su propio store en
 * memoria (`src/db/store-memoria.ts`), no a esta función.
 */
export function estadoDeSalas(): EstadoSala[] {
  return []
}

// ---- Derivados para el hub ----

export function acuerdosAbiertos(s: EstadoSala): number {
  // Ver el comentario de acuerdosVencidos: misma razón, misma regla — una
  // sala en freeze no cuenta nada, ni abiertos ni vencidos.
  if (s.activa === false) return 0
  return s.acuerdos.filter((a) => a.estatus === 'abierto').length
}
export function acuerdosVencidos(s: EstadoSala): number {
  // Una sala en freeze no acumula deuda: sus compromisos están congelados, no
  // vencidos. Contarlos pondría en rojo el Home por trabajo que alguien decidió
  // parar.
  if (s.activa === false) return 0
  return s.acuerdos.filter((a) => a.estatus === 'vencido').length
}

/**
 * Si a ESTE acuerdo, en el estado en que está, el freeze de su sala le
 * cambia algo. Solo un abierto tiene un plazo que congelar —uno que, sin la
 * pausa, seguiría corriendo hacia vencido—; uno ya cumplido no tiene reloj
 * que parar, y verlo "congelado" no diría nada cierto sobre él.
 */
export function estaCongelado(
  a: Pick<Acuerdo, 'estatus'>,
  s: Pick<EstadoSala, 'activa'>,
): boolean {
  return s.activa === false && a.estatus === 'abierto'
}

/**
 * El estatus REAL de un acuerdo hoy.
 *
 * `vencido` no es un evento que alguien registra: es lo que le pasa a un
 * acuerdo abierto cuando su fecha queda atrás. Guardado en la base nunca se
 * actualizaba —nadie recorre la tabla cada noche— así que un compromiso de
 * hace dos semanas seguía diciendo "abierto" y el hub anunciaba cero
 * vencidos con tres encima de la mesa. Justo lo que esta pantalla existe
 * para evitar.
 *
 * Se deriva al LEER, que es donde el paso del tiempo se nota.
 */
export function estatusVigente(
  a: Pick<Acuerdo, 'estatus' | 'fechaCompromiso'>,
  hoy: string,
): EstatusAcuerdo {
  if (a.estatus !== 'abierto') return a.estatus
  if (!a.fechaCompromiso) return 'abierto'
  return a.fechaCompromiso < hoy ? 'vencido' : 'abierto'
}

/**
 * El estatus EFECTIVO de un acuerdo, respetando el freeze de su sala (tarea
 * 12, ronda 7).
 *
 * Con la sala activa, es exactamente `estatusVigente`: el paso del tiempo se
 * nota. En pausa, el acuerdo se congela tal cual está guardado —ni siquiera
 * se pregunta si ya pasó de fecha—, que es lo que "freeze" significa.
 *
 * Es también la CONTRAPARTIDA exacta de pausar, sin necesidad de código
 * aparte: al reactivar no hay nada que recalcular a mano. La siguiente vez
 * que se lea con `salaActiva = true`, esta misma función vuelve a aplicar
 * `estatusVigente` sobre el mismo acuerdo guardado, y uno que ya había
 * pasado de fecha aparece vencido ese mismo día — no se queda en un limbo
 * permanente ni hace falta "reactivar" cada acuerdo uno por uno.
 */
export function estatusEfectivo(
  a: Pick<Acuerdo, 'estatus' | 'fechaCompromiso'>,
  salaActiva: boolean,
  hoy: string,
): EstatusAcuerdo {
  if (!salaActiva) return a.estatus
  return estatusVigente(a, hoy)
}

/** Una sesión ya presentada de la que todavía se puede levantar minuta. */
export interface SesionMinutable {
  id: string
  titulo: string
  fecha: string // ISO
  /** De qué sala. Solo hace falta cuando la lista cruza salas (el Home). */
  salaNombre?: string
  salaColor?: string
}

/**
 * QUÉ REUNIONES SE PUEDEN MINUTAR.
 *
 * Franco: "a la minuta le falta el motor para cargar una transcripción de la
 * reunión y que precargue la minuta con IA".
 *
 * El motor estaba —`generarMinuta`, con Claude, desde la primera versión— pero
 * ENTERRADO: solo se ofrecía para sesiones ya marcadas como «presentada», y
 * marcar una sesión como presentada es papeleo. La reunión ocurrió la marque
 * alguien o no, y obligar a hacer el papeleo antes de poder hacer el trabajo
 * es la forma más segura de que nadie encuentre la herramienta.
 *
 * Ahora se puede minutar cualquier sesión cuyo día ya llegó y que no tenga
 * minuta todavía, sea borrador, lista o presentada. Lo que NO se puede es
 * minutar algo que aún no ha pasado: no hay nada que transcribir.
 *
 * Se compara por DÍA CIVIL y no por instante: una sesión creada hoy a las
 * 17:00 se puede minutar a las 16:50 si la reunión se adelantó, y afinar al
 * minuto convertiría "hoy" en una lotería.
 */
export function sesionesMinutables(
  sesiones: Array<{
    id: string
    titulo: string
    fecha: string
    salaSlug: string | null
    salaNombre?: string
    salaColor?: string
    estado: string
    /** Ver `fueDada`, `dominio/reunion.ts`. Ausente = nunca se marcó así. */
    noDadaEn?: string | null
  }>,
  /** Ids de sesión que YA tienen minuta. */
  conMinuta: Set<string>,
  hoyCivil: string,
): SesionMinutable[] {
  return sesiones
    .filter((s) => !conMinuta.has(s.id))
    /**
     * UN BORRADOR NO ES UNA REUNIÓN QUE OCURRIÓ.
     *
     * Franco: «quedó una lista de "borradores" en el modal de minutas». El
     * filtro solo miraba la fecha, así que un borrador con fecha pasada
     * —trabajo de preparación abandonado— aparecía como reunión minutable, y
     * desde ahí no había forma de quitarlo.
     *
     * `borrador` es algo que se está preparando y todavía no tiene nada
     * escrito; `agendada`, algo que ni siquiera empezó. Ninguna de las dos es
     * una junta que se dio. Desde `lista` en adelante sí: está maquetada, y
     * una reunión puede darse sin que a nadie le dé tiempo de marcarla como
     * presentada.
     */
    .filter((s) => s.estado !== 'borrador' && s.estado !== 'agendada')
    /**
     * TAMPOCO UNA MARCADA "NO SE DIO" (ronda "contador y presentadas",
     * 2026-08-03): se canceló o se pospuso — no hay nada que transcribir de
     * una reunión que no ocurrió. Mismo criterio que aplica `fueDada`
     * (`dominio/reunion.ts`) para "¿ya pasó de verdad?".
     */
    .filter((s) => !s.noDadaEn)
    /**
     * CORRECCIÓN (revisión de la ronda "contador y presentadas"): comparaba
     * `s.fecha.slice(0, 10)` —el día en UTC— contra `hoyCivil` —el día en
     * CDMX—. Una reunión de esta noche entre las 18:00 y medianoche en México
     * cae entre las 00:00 y las 06:00 UTC del día SIGUIENTE, así que
     * `slice(0, 10)` la leía un día por delante y la excluía de "pendiente de
     * minuta" hasta pasada la medianoche UTC — el mismo bug de fechas
     * corridas que motivó `src/lib/fecha.ts` en primer lugar, colado aquí
     * porque esta función no lo usaba. `diaCivil` es la fuente única.
     */
    .filter((s) => diaCivil(s.fecha) <= hoyCivil)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map((s) => ({
      id: s.id,
      titulo: s.titulo,
      fecha: s.fecha,
      salaNombre: s.salaNombre,
      salaColor: s.salaColor,
    }))
}

/**
 * Una reunión con el día civil ya pasado, deducida como dada sin que nadie lo
 * dijera — el conjunto sobre el que actúa `reunionesPorConfirmar`
 * (`dominio/reunion.ts`), que es quien de verdad la produce hoy.
 *
 * EL TIPO SE QUEDA AQUÍ (Tarea 7): lo consume `ReunionesPorConfirmar`
 * (`src/componentes`), la pieza que pintan el Home y la sala, y es la forma
 * en la que las dos pantallas reempaquetan lo que devuelve
 * `reunionesPorConfirmar` —un `Reunion[]`, sin nombre ni color de sala—
 * sumándole la identidad de la sala que ya conocen por su cuenta.
 */
export interface SesionPorConfirmar {
  id: string
  titulo: string
  fecha: string // ISO
  salaSlug?: string | null
  /** Solo hace falta cuando la lista cruza salas (el Home) — mismo criterio que SesionMinutable. */
  salaNombre?: string
  salaColor?: string
  /** `null` = pendiente de decir algo; con fecha, ya se marcó "no se dio". */
  noDadaEn: string | null
}

/** Temperatura de atención: cuánto se ha desatendido la relación. */
export type Temperatura = 'reciente' | 'tibia' | 'fria'

/**
 * Umbral de "reciente" y de "tibia" por cadencia (arriba de "tibia" es
 * "fria"). Hasta la tarea 6 (ronda 10) esto era un ternario binario
 * (`cadencia === 'semanal' ? A : B`): alcanzaba con dos cadencias, pero
 * `quincenal` ya existe en el tipo desde la tarea 1 y un ternario no
 * distingue tres casos sin anidarse. Con tres cadencias un `Record` dice lo
 * mismo sin anidar — y el próximo umbral que se agregue es una fila, no una
 * rama nueva.
 */
const UMBRALES: Record<Cadencia, { reciente: number; tibia: number }> = {
  semanal: { reciente: 8, tibia: 10 },
  quincenal: { reciente: 15, tibia: 21 },
  mensual: { reciente: 20, tibia: 35 },
}

export function temperatura(s: EstadoSala): Temperatura {
  if (s.diasDesdeUltima == null) return 'fria'
  const { reciente, tibia } = UMBRALES[s.cadencia]
  if (s.diasDesdeUltima <= reciente) return 'reciente'
  if (s.diasDesdeUltima <= tibia) return 'tibia'
  return 'fria'
}

/**
 * EL ORDEN DE LAS SALAS, el mismo en todas las pantallas (Franco, 29-jul).
 *
 * 1. Con reunión agendada, de la más próxima a la más lejana.
 * 2. Sin reunión agendada, por nombre.
 * 3. En pausa, por nombre.
 *
 * Sustituye a `ordenarPorUrgencia`, que subía sola a la primera fila la sala
 * más desatendida. Esa señal no se pierde —los vencidos siguen en el Home y la
 * tarjeta conserva su temperatura— pero cambia de sitio: una sala olvidada
 * hace tres meses es justo una que no tiene fecha, así que ahora cae al segundo
 * bloque.
 */
export function ordenarPorProximaReunion(salas: EstadoSala[]): EstadoSala[] {
  const bloque = (s: EstadoSala) => (s.activa === false ? 2 : s.proximaReunion ? 0 : 1)
  return [...salas].sort((a, b) => {
    const ba = bloque(a)
    const bb = bloque(b)
    if (ba !== bb) return ba - bb
    if (ba === 0) return a.proximaReunion!.localeCompare(b.proximaReunion!)
    return a.nombre.localeCompare(b.nombre, 'es')
  })
}

/**
 * El TIPO se queda: lo usa `AcuerdoConSala` de `src/db/consultas.ts`, cuya
 * `acuerdosEnRiesgo()` (async, la que de verdad se llama) tiene su propia
 * implementación contra Postgres. La función pura de este módulo que
 * calculaba lo mismo sobre `estadoDeSalas()` se quitó en la revisión de la
 * tarea 5: desde que esa función siempre devuelve `[]`, esta otra solo podía
 * devolver `[]` también — código inalcanzable disfrazado de lógica.
 */
export interface AcuerdoEnRiesgo extends Acuerdo {
  salaSlug: string
  salaNombre: string
  salaColor: string
}

/**
 * El TIPO se queda: lo usa `pulsoDelMes()` de `src/db/consultas.ts` (async,
 * la que de verdad se llama, con su propia implementación contra Postgres).
 * La función pura de este módulo se quitó en la revisión de la tarea 5 por
 * el mismo motivo que `acuerdosEnRiesgo()`: dependía de `estadoDeSalas()`,
 * que siempre devuelve `[]`, así que solo podía devolver un pulso vacío.
 */
export interface PulsoDelMes {
  salas: number
  /**
   * Reuniones —no salas— con fecha en el mes natural en curso (hora CDMX),
   * de salas activas, en cualquier estado. Ver `construirPulso`,
   * src/db/consultas.ts.
   */
  reunionesEsteMes: number
  /** De esas mismas, cuántas ya se dieron según `fueDada` (`dominio/reunion.ts`). */
  reunionesDadas: number
  acuerdosAbiertos: number
  acuerdosVencidos: number
  /** `dias: null` = nunca ha tenido sesión, que es lo más desatendido que hay. */
  salaMasDesatendida: { nombre: string; dias: number | null } | null
}

/**
 * La sala que más necesita atención, o ninguna si todas están al día.
 *
 * Dos cosas que hacía mal antes:
 *
 * 1. Descartaba las salas que NUNCA han tenido sesión (`diasDesdeUltima ==
 *    null`), que son precisamente las más desatendidas.
 * 2. Anunciaba una aunque estuviera al día: con una sola sala con historial,
 *    el hub decía "más desatendida: Mexa Creativa · 0 d" — la que tuvo sesión
 *    HOY.
 *
 * El criterio es la temperatura, que ya sabe la cadencia acordada de cada
 * sala: mensual y semanal no se desatienden al mismo ritmo.
 *
 * Una sala en freeze (tarea 12) tampoco entra: "desatendida" implica una
 * reunión que se esperaba y no llegó, y de una sala en pausa no se espera
 * ninguna. Contarla sería pedirle cuentas por algo que alguien decidió parar.
 */
export function salaMasDesatendida(salas: EstadoSala[]): { nombre: string; dias: number | null } | null {
  const candidatas = salas.filter((s) => s.activa !== false && temperatura(s) !== 'reciente')
  if (candidatas.length === 0) return null
  const peor = [...candidatas].sort(
    (a, b) => (b.diasDesdeUltima ?? Infinity) - (a.diasDesdeUltima ?? Infinity),
  )[0]
  return { nombre: peor.nombre, dias: peor.diasDesdeUltima }
}

// El `Reunion`/`reunionesDeSala` VIEJO (modelo de transición, cosido a mano
// desde `presentaciones`+`minutas` por `sesionId`) y `reunionesSinMinuta`
// vivieron aquí hasta la Tarea 7, a propósito: `src/app/cliente/[slug]/page.tsx`
// y `EstadoSala.presentaciones`/`.minutas` (poblados por `estadoDeSalaDB`,
// `src/db/consultas.ts`) dependían de ellos en producción, y quitarlos antes
// de que esta tarea rewireara esa página y esa consulta habría roto el build
// por algo que no era de la Tarea 6. Su sucesor —`Reunion`/`reunionesDeSala`
// en `dominio/reunion.ts`, con la reunión como entidad propia (spec §1)— es
// quien arma `EstadoSala.reuniones` ahora. Franco: "el módulo Presentaciones y
// minutas creo que debe ser uno, así la presentación está asociada a una
// minuta, es decir a una reunión" — es exactamente la idea que hereda ese
// módulo nuevo.
