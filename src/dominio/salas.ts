/**
 * EL ESTADO DE LA RELACIÓN CON CADA SALA: tipos y lógica derivada.
 *
 * Aquí NO hay datos. Ni uno. Todo lo que la app enseña —acuerdos, sesiones,
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
}

export interface Presentacion {
  fecha: string // ISO
  titulo: string
  tipo: 'semanal' | 'mensual'
  /** La sesión real de la que salió. Sin ella no hay documento que abrir. */
  sesionId?: string
}

export interface Minuta {
  fecha: string // ISO
  titulo: string
  enviadaA: number // # de participantes
  /** Sesión de la que salió: es lo que permite abrirla desde la sala. */
  sesionId?: string
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
 * Una sesión de la sala, cruda: lo mínimo que necesita `fueDada` (arriba) para
 * decidir si ya ocurrió. A diferencia de `presentaciones` —que solo trae las
 * que YA se sabía que sucedieron— esta trae TODAS: es lo que le hace falta al
 * pulso del mes para contar reuniones (no salas) del mes en curso sea cual
 * sea su estado, y para saber cuáles de esas ya se dieron.
 */
export interface SesionDeSala {
  fecha: string // ISO
  estado: string
  noDadaEn: string | null
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
  proximaSesion: string | null // ISO
  enPreparacion: boolean
  avancePreparacion?: number // 0..100
  /** La sesión que se está preparando, para poder ir directo a ella. */
  sesionEnPreparacionId?: string
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
  presentaciones: Presentacion[]
  minutas: Minuta[]
  /** Cadencia acordada; usada para juzgar si está desatendida. */
  cadencia: 'semanal' | 'mensual'
  /**
   * FREEZE COMERCIAL (tarea 12, ronda 7). `false` = no hay reuniones ni
   * gestión hasta nuevo aviso.
   *
   * Una sala en pausa no se borra ni se esconde: su historia sigue entera y
   * se consulta. Lo que se apaga es lo que la app le EXIGE — ver
   * `acuerdosVencidos`, `acuerdosAbiertos`, `ordenarPorProximaReunion` y
   * `estaCongelado` más abajo, y `crearSesion` en src/db/sesiones.ts (no se
   * puede preparar una sesión nueva sin reactivarla primero).
   */
  activa: boolean
  /** Desde cuándo está en pausa. ISO, o `null` si nunca se pausó (o ya se reactivó). */
  pausadaDesde: string | null
  /** TODAS las sesiones de la sala, cualquier estado — ver `SesionDeSala`. */
  sesiones: SesionDeSala[]
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
 * De qué sesiones falta minuta: las que ya sucedieron y no tienen una.
 *
 * Se deriva de lo que la sala ya sabe en vez de preguntarlo a la base: una
 * sesión con minuta aparece en las dos listas, así que lo que falta es la
 * diferencia. Las presentaciones sin `sesionId` quedan fuera — no hay
 * sesión detrás a la que colgar nada.
 */
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
    /** Ver `fueDada`, más abajo. Ausente = nunca se marcó así. */
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
     * una reunión que no ocurrió. Mismo criterio que aplica `fueDada`, aquí
     * abajo, para "¿ya pasó de verdad?".
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
 * SI UNA SESIÓN YA OCURRIÓ, sin que nadie tenga que decirlo.
 *
 * Franco: «en el contador dice solo una sesión en el mes siendo que están
 * agendadas todas y registradas en la app». La raíz: el contador (y "la
 * sala", y el listado de minutas pendientes) solo daban por ocurrida una
 * sesión con `estado === 'presentada'`, y llegar ahí exige que alguien entre
 * al editor, abra el documento y pulse un botón — un paso administrativo que
 * nueve de cada diez reuniones nunca cruzan. Que una reunión cuente dependa
 * de ese clic es justo lo que produce el síntoma.
 *
 * `fueDada` decide sola cuando puede, y dos cosas la pueden desmentir en los
 * dos sentidos:
 *
 * - Lo EXPLÍCITO manda siempre que existe: `presentada`/`minutada` es un
 *   hecho que alguien confirmó, así que gana sin mirar fecha ni nada más.
 * - `noDadaEn` (columna nueva y aditiva en `sesiones`, ver src/db/esquema.ts
 *   para por qué es un campo y no un estado nuevo) es lo contrario: alguien
 *   dijo explícitamente que ESTA sesión en concreto NO se dio —se canceló, se
 *   pospuso— y eso manda sobre la deducción automática de aquí abajo. Nunca
 *   sobre lo explícito: si ya está `presentada`, `noDadaEn` ni se consulta.
 *
 * A falta de las dos, se deduce: `lista` (maquetada — mismo umbral de
 * "tiene contenido" que ya usa `sesionesMinutables`, arriba, no uno inventado
 * aparte) Y su día CIVIL ya pasó, estrictamente antes de hoy. "Estrictamente"
 * es a propósito: una reunión de hoy a las 9:00 no está "pasada" a las 10:00
 * del mismo día — se compara por día, no por instante (`diaCivil`, no la hora
 * del reloj), así que hoy nunca es "ya pasado" pase lo que pase con el reloj.
 * `borrador`/`agendada` nunca cuentan aquí: son justo las dos que
 * `sesionesMinutables` también excluye por no ser "una junta que se dio".
 */
export function fueDada(
  sesion: { estado: string; fecha: string; noDadaEn?: string | null },
  hoyCivil: string,
): boolean {
  if (sesion.estado === 'presentada' || sesion.estado === 'minutada') return true
  if (sesion.noDadaEn) return false
  if (sesion.estado !== 'lista') return false
  return diaCivil(sesion.fecha) < hoyCivil
}

/** Una sesión `lista` cuyo día ya pasó: la deducción de `fueDada` actuó (o actuaría) sobre ella. */
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

/**
 * QUÉ REUNIONES NECESITAN UNA PALABRA HUMANA: `lista`, con el día civil ya
 * pasado — exactamente el conjunto sobre el que actúa la deducción automática
 * de `fueDada`.
 *
 * Se ofrecen las DOS caras, no solo las que faltan por confirmar: una sesión
 * ya marcada `noDadaEn` sigue en la lista (con esa marca puesta) para que se
 * pueda deshacer — si solo se ofrecieran las pendientes, marcar "no se dio"
 * la haría desaparecer de aquí y con ella la única puerta para arrepentirse.
 * `presentada`/`minutada` no aparecen: ya son un hecho confirmado, no algo
 * que preguntar. `borrador`/`agendada` con el día pasado tampoco: nunca
 * llegaron a "tener contenido", así que `fueDada` nunca los iba a contar —no
 * hay nada que confirmar sobre algo que la deducción ya ignora.
 *
 * UNA SALA EN PAUSA NO OFRECE NADA AQUÍ (revisión post-implementación,
 * 2026-08-03 — Franco pausó Zeus mientras tanto y dejó de ser teórico):
 * confirmar o negar una reunión es justo la "gestión" que el freeze comercial
 * dice congelar (mismo criterio que `crearSesion`, que bloquea `agendada`/
 * `borrador` nuevos para una sala en pausa). Se comprueba AQUÍ, en la función
 * que arman las dos pantallas que ofrecen esto —el Home y la sala—, no
 * repetido en cada una: si la protección dependiera de que cada pantalla se
 * acordara de filtrar, bastaría con que UNA se olvidara. `salaActiva !==
 * false` (no `=== true`): una sesión sin sala no tiene freeze que respetar,
 * y debe seguir ofreciéndose.
 */
export function sesionesPorConfirmar(
  sesiones: Array<{
    id: string
    titulo: string
    fecha: string
    salaSlug?: string | null
    salaNombre?: string
    salaColor?: string
    estado: string
    noDadaEn?: string | null
    /** Si la sala de esta sesión sigue activa. Ausente/`true` = sin freeze que respetar. */
    salaActiva?: boolean
  }>,
  hoyCivil: string,
): SesionPorConfirmar[] {
  return sesiones
    .filter((s) => s.salaActiva !== false)
    .filter((s) => s.estado === 'lista' && diaCivil(s.fecha) < hoyCivil)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map((s) => ({
      id: s.id,
      titulo: s.titulo,
      fecha: s.fecha,
      salaSlug: s.salaSlug,
      salaNombre: s.salaNombre,
      salaColor: s.salaColor,
      noDadaEn: s.noDadaEn ?? null,
    }))
}

export function sesionesSinMinuta(s: EstadoSala): SesionMinutable[] {
  const conMinuta = new Set(s.minutas.map((m) => m.sesionId).filter(Boolean))
  return s.presentaciones
    .filter((p) => p.sesionId != null && !conMinuta.has(p.sesionId))
    .map((p) => ({ id: p.sesionId!, titulo: p.titulo, fecha: p.fecha }))
}

/** Temperatura de atención: cuánto se ha desatendido la relación. */
export type Temperatura = 'reciente' | 'tibia' | 'fria'
export function temperatura(s: EstadoSala): Temperatura {
  if (s.diasDesdeUltima == null) return 'fria'
  const limite = s.cadencia === 'semanal' ? 10 : 35
  if (s.diasDesdeUltima <= (s.cadencia === 'semanal' ? 8 : 20)) return 'reciente'
  if (s.diasDesdeUltima <= limite) return 'tibia'
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
  const bloque = (s: EstadoSala) => (s.activa === false ? 2 : s.proximaSesion ? 0 : 1)
  return [...salas].sort((a, b) => {
    const ba = bloque(a)
    const bb = bloque(b)
    if (ba !== bb) return ba - bb
    if (ba === 0) return a.proximaSesion!.localeCompare(b.proximaSesion!)
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
  /** De esas mismas, cuántas ya se dieron según `fueDada` — ver más abajo. */
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

/**
 * UNA REUNIÓN: lo que se presentó y lo que se acordó, juntos.
 *
 * Franco: "el módulo Presentaciones y minutas creo que debe ser uno, así la
 * presentación está asociada a una minuta, es decir a una reunión".
 *
 * Tiene razón y el modelo ya lo decía: presentación y minuta cuelgan de la
 * MISMA `sesionId`. Lo que estaba partido era la pantalla — dos listas
 * paralelas, cada una ordenada por su cuenta, y para saber qué se acordó en la
 * presentación de mayo había que buscar mayo dos veces.
 *
 * Aquí se unen por la sesión de la que salieron. El caso raro también existe y
 * no se esconde: una minuta cargada a mano sin presentación (una reunión que
 * se dio antes de esta herramienta) es una reunión igual, sin documento.
 */
export interface Reunion {
  /** La sesión. Es la identidad de la reunión. */
  sesionId?: string
  fecha: string // ISO
  titulo: string
  /** El documento que se presentó, si se armó en la app. */
  presentacion?: Presentacion
  /** Lo que se acordó, si ya se levantó. */
  minuta?: Minuta
}

/**
 * Las reuniones de una sala, de la más reciente a la más antigua.
 *
 * Una presentación y una minuta de la misma sesión son UNA reunión. Lo que no
 * tiene `sesionId` —los datos que llegaron sin ella— no se puede emparejar con
 * nada, así que va suelto en vez de emparejarse por fecha: coincidir en el día
 * no significa ser la misma reunión, y una sala puede tener dos el mismo día.
 */
export function reunionesDeSala(
  presentaciones: Presentacion[],
  minutas: Minuta[],
): Reunion[] {
  const porSesion = new Map<string, Reunion>()
  const sueltas: Reunion[] = []

  for (const p of presentaciones) {
    const r: Reunion = { sesionId: p.sesionId, fecha: p.fecha, titulo: p.titulo, presentacion: p }
    if (p.sesionId) porSesion.set(p.sesionId, r)
    else sueltas.push(r)
  }

  for (const m of minutas) {
    const existente = m.sesionId ? porSesion.get(m.sesionId) : undefined
    if (existente) {
      existente.minuta = m
      continue
    }
    const r: Reunion = { sesionId: m.sesionId, fecha: m.fecha, titulo: m.titulo, minuta: m }
    if (m.sesionId) porSesion.set(m.sesionId, r)
    else sueltas.push(r)
  }

  return [...porSesion.values(), ...sueltas].sort((a, b) => b.fecha.localeCompare(a.fecha))
}

/** Reuniones que se presentaron y siguen sin minuta. */
export function reunionesSinMinuta(reuniones: Reunion[]): Reunion[] {
  return reuniones.filter((r) => r.presentacion && !r.minuta)
}
