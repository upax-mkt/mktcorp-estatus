/**
 * Capa de escritura de Reunión (ronda 10, tarea 4): la junta como entidad
 * propia, separada de lo que se prepara para ella (spec §1). Con `hayDB()`
 * escribe a Postgres vía Drizzle; sin DB, usa el store en memoria de
 * `src/db/store-memoria.ts` — mismo patrón que `src/db/sesiones.ts`, del que
 * sale la mitad "cabecera de la junta" de este módulo.
 *
 * Lo que NO vive aquí: items, secciones, decisiones del motor, parseo de
 * cifras y tablas. Eso es el DOCUMENTO — sigue en `src/db/sesiones.ts` hasta
 * que la Tarea 5 lo saque a `src/db/documentos.ts`.
 *
 * `sesiones.ts` no pierde ninguna de las funciones que este módulo también
 * cubre (`crearSesion`, `marcarPresentada`…): siguen ahí, tal cual, porque
 * `crearSesionConEstructura` —que NO se muda hasta la Tarea 5— las sigue
 * llamando, y media docena de páginas en `src/app/**` siguen importándolas.
 * Este módulo es una implementación nueva e independiente contra el esquema
 * nuevo (`esquema.reuniones`), no un refactor de la vieja.
 */
import { and, asc, desc, eq, gte, inArray, isNull, lt } from 'drizzle-orm'
import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import * as memoria from './store-memoria'
import { salaEstaActiva } from './salas'
import { cargarTemas, slugsDeSalas } from './temas'
import { PLANTILLAS } from '@/secciones/plantillas'
import type { Tema } from '@/temas'
import { diaCivil, horaBreve, instanteEnCDMX } from '@/lib/fecha'
import type { FilaReunionMemoria } from './store-memoria'

export type TipoReunion = 'semanal' | 'quincenal' | 'mensual'

/**
 * Dos estados, no cinco (spec §1): el viejo `estado_sesion` mezclaba la vida
 * de la junta (¿se dio?) con la del documento (¿está listo?). Esa segunda
 * mitad vive ahora en `EstadoDocumento` ('borrador' | 'listo', Tarea 5).
 */
export type EstadoReunion = 'agendada' | 'dada'

export interface ReunionResumen {
  id: string
  /** `null` para una reunión que no es de ninguna sala — ver `DatosDeReunion.salaSlug`. */
  salaSlug: string | null
  salaNombre: string
  salaColor: string
  fecha: string // ISO
  titulo: string
  tipo: TipoReunion
  /**
   * Qué clase de junta es. Lo lee el editor para saber con qué secciones
   * nace su presentación cuando se arma —que puede ser días después de
   * crearla, desde que crear la reunión dejó de crear su deck de golpe.
   */
  plantilla?: string | null
  estado: EstadoReunion
  /**
   * `null` = nadie ha dicho que esta reunión no se dio. Con fecha, alguien lo
   * dijo explícitamente (se canceló, se pospuso) — manda sobre cualquier
   * deducción automática de "se dio" que haga el dominio (ver
   * src/dominio/reunion.ts, Tarea 6). Mismo campo, misma razón de ser que
   * `noDadaEn` en `sesiones` (ver el comentario de la columna en
   * src/db/esquema.ts).
   */
  noDadaEn: string | null // ISO, o null
  /** Dónde se da: sala física, link, "por definir". */
  lugar: string | null
  /** 'todos los squads' / squads específicos / tema puntual — texto libre. */
  alcance: string
  /** Quién va. Vacío mientras nadie lo haya dicho. */
  participantes: string[]
  /** Si tiene un documento (deck) preparado — no dice si está LISTO, solo si existe. */
  tieneDocumento: boolean
  /** Si tiene una minuta guardada. */
  tieneMinuta: boolean
  /** Cuántos archivos (presentaciones antiguas, archivos de interés) cuelgan de esta reunión. */
  archivos: number
}

export interface DatosDeReunion {
  /**
   * Qué clase de junta es (`src/secciones/plantillas.ts`). Opcional: una
   * reunión registrada retroactivamente al publicar una minuta no eligió
   * ninguna, y sin ella el editor cae a la de por defecto.
   */
  plantilla?: string | null
  /**
   * De qué sala es. NULO para una reunión que no pertenece a ninguna: un
   * comité, un arranque de campaña, una interna de Mkt Corp — mismo
   * significado que tenía en la vieja `DatosDeSesion.salaSlug`
   * (`src/db/sesiones.ts`, recuperable con `git show
   * d5396be:src/db/sesiones.ts`).
   *
   * Volvió a ser nulo en la Tarea 8b (5-ago), pedido de Franco: "necesito
   * poder utilizar el componente para crear minutas de otras reuniones".
   * Había dejado de serlo en la Tarea 4 (ronda 10) al mudar esta tabla desde
   * `sesiones` —perdiendo, sin que nadie lo pidiera, una capacidad que ya
   * existía—. Una reunión sin sala se viste con la identidad de Marketing
   * Corp (`identidadDe`, más abajo) y no aparece en ninguna de las diez.
   */
  salaSlug: string | null
  fecha: Date
  titulo: string
  tipo: TipoReunion
  lugar?: string | null
  /** 'todos los squads' / squads específicos / tema puntual — texto libre. Por defecto, 'todos'. */
  alcance?: string
  /**
   * Quién va. `string[]`, no `unknown[]` (deuda de la Tarea 4): así lo produce
   * el único llamador real, `app/agenda/page.tsx`, que parte un textarea por
   * comas — y así es como `editarReunion` puede volver a sanitizarla
   * (`.trim()` no existe sobre un `unknown`). Ver el comentario de
   * `editarReunion` más abajo para el porqué completo.
   */
  participantes?: string[]
  /**
   * AÑADIDO EL 5-AGO. Sin este campo no había forma de registrar una junta
   * que YA OCURRIÓ, y con ello se perdía una regla que Franco dejó explícita
   * en el original (`sesiones.ts`, el bloque de `esTrabajoNuevo`):
   *
   *   "consultar su historia sí; empezar trabajo nuevo no"
   *
   * El freeze de una sala en pausa bloquea preparar algo nuevo, pero **deja
   * pasar el registro de lo ya sucedido**: completar la historia no es
   * empezar trabajo. El original lo resolvía dejando pasar `presentada` y
   * bloqueando `agendada`/`borrador`. El equivalente aquí es `'dada'`.
   *
   * Es además el caso de uso central de la ronda: cargar una junta que ya
   * pasó con lo que sea que se tenga de ella.
   */
  estado?: EstadoReunion
}

/**
 * Con qué se viste una reunión.
 *
 * Una que no pertenece a ninguna sala —un comité, un arranque de campaña—
 * lleva la identidad de Marketing Corp: es de quien la convoca. Restaurado
 * en la Tarea 8b (5-ago): el original vivía en `src/db/sesiones.ts` como
 * `identidadDe` —recuperable con `git show d5396be:src/db/sesiones.ts`— y
 * esta función (entonces `identidadDeSala`, sin la rama "sin sala") se
 * había quedado sin ella en la Tarea 4, cuando `salaSlug` se volvió
 * obligatorio y ya no había nada que ramificar.
 */
const MARKETING_CORP = { nombre: 'Marketing Corp', primario: '#E34714' }

/**
 * Con qué nombre y color se etiqueta una reunión, dado el registro de temas
 * YA CARGADO — función pura, no vuelve a consultar la base por su cuenta.
 */
function identidadDe(salaSlug: string | null, registro: Record<string, Tema>): { nombre: string; color: string } {
  if (!salaSlug) return { nombre: MARKETING_CORP.nombre, color: MARKETING_CORP.primario }
  const tema = registro[salaSlug]
  // Defensivo: no debería pasar (la FK de esquema.reuniones.salaSlug exige
  // que la sala exista SI hay sala), pero un texto de más es más barato que
  // reventar la reunión entera. Mismo criterio que `temaDeSalaSeguro` en
  // src/db/acuerdos.ts.
  return tema ? { nombre: tema.nombre, color: tema.primario } : { nombre: salaSlug, color: '#666666' }
}

interface FilaReunionComun {
  id: string
  salaSlug: string | null
  fecha: Date
  titulo: string
  tipo: TipoReunion
  plantilla?: string | null
  estado: EstadoReunion
  noDadaEn: Date | null
  lugar: string | null
  alcance: string
  participantes: unknown
}

function resumenDeFilaReunion(
  fila: FilaReunionComun,
  registro: Record<string, Tema>,
  tieneDocumento: boolean,
  tieneMinuta: boolean,
  archivos: number,
): ReunionResumen {
  const identidad = identidadDe(fila.salaSlug, registro)
  return {
    id: fila.id,
    salaSlug: fila.salaSlug,
    salaNombre: identidad.nombre,
    salaColor: identidad.color,
    fecha: fila.fecha.toISOString(),
    titulo: fila.titulo,
    tipo: fila.tipo,
    plantilla: fila.plantilla ?? null,
    estado: fila.estado,
    noDadaEn: fila.noDadaEn ? fila.noDadaEn.toISOString() : null,
    lugar: fila.lugar,
    alcance: fila.alcance,
    // `jsonb` sin validar al leer, mismo criterio que el resto de la app
    // (ver `ContenidoItemCrudo` en documentos.ts): la escribe siempre
    // `crearReunion`/`editarReunion`, nunca a mano fuera de este módulo.
    participantes: Array.isArray(fila.participantes) ? (fila.participantes as string[]) : [],
    tieneDocumento,
    tieneMinuta,
    archivos,
  }
}

/**
 * ¿`id` es una clase de junta que el catálogo reconoce? (`PLANTILLAS`,
 * `src/secciones/plantillas.ts`). `null`, `undefined` y `''` SIGUEN SIENDO
 * VÁLIDOS —significan "sin clasificar", el estado de las 6 reuniones reales
 * que hoy no tienen clase— así que esto NUNCA los rechaza: solo corta una
 * cadena no vacía que no es ninguna de las del catálogo.
 *
 * VIVE EN LA CAPA DE DATOS, no en cada Server Action (hallazgo I3, revisión
 * final de la ronda 14.2). Había dos sitios candidatos:
 *
 * 1. EN CADA ACCIÓN, como ya hace `crearSesionAction`
 *    (`src/app/cliente/[slug]/page.tsx`): `if (!PLANTILLAS.some(...)) return
 *    { error: ... }`. Da un mensaje amable de formulario, pero HAY QUE
 *    REPETIRLO en cada Server Action que escriba `plantilla` — y ya había DOS
 *    que no lo hacían (`agendarReunionAction`, `editarReunionAction`,
 *    `src/app/reuniones/acciones.ts`) mientras otras dos sí (`crearSesionAction`,
 *    `/deck/nueva`). Cuatro copias del mismo `if` es la forma exacta en la que
 *    este hallazgo nació: alguien añade una quinta acción —o `crearReunionConDocumento`
 *    llama a `crearReunion` sin pasar por ninguna acción de formulario— y
 *    vuelve a faltar.
 *
 * 2. AQUÍ, en `crearReunion`/`editarReunion`: las dos únicas puertas por las
 *    que `plantilla` llega a la base (`crearReunionConDocumento`,
 *    `publicarMinutaAction` y cualquier acción nueva pasan, sí o sí, por una
 *    de estas dos). Un solo guardián cubre a TODOS los llamadores de una vez,
 *    presentes y futuros, sin que cada Server Action tenga que acordarse de
 *    poner el suyo.
 *
 * Se elige (2): es el mismo principio que ya dejó escrito este repo sobre
 * botones — "esconder un botón no protege un endpoint"
 * (`src/app/cliente/[slug]/ajustes/page.tsx`,
 * `src/componentes/acuerdos/TablaAcuerdos.tsx`) — llevado un paso más allá:
 * un `if` que solo vive en ALGUNAS de las puertas tampoco protege la casa.
 * `crearSesionAction` conserva el suyo (mensaje de formulario más específico,
 * y falla un paso antes de tocar la base) — queda redundante pero inofensivo,
 * no se toca aquí.
 */
function esPlantillaConocida(id: string | null | undefined): boolean {
  return !id || PLANTILLAS.some((p) => p.id === id)
}

/**
 * ¿YA ESTÁ ESTA MISMA JUNTA EN LA BASE? (1-sep-2026, a raíz de encontrar 7
 * copias de "Estatus de agosto" de Zeus creadas en 26 segundos.)
 *
 * "La misma" = misma sala + mismo instante + mismo título. Definición
 * conservadora a propósito: dos juntas de la misma sala a la misma hora con
 * títulos distintos son plausibles —un estatus partido en dos bloques—; dos
 * con el mismo título no lo son nunca. Ver el comentario largo del test en
 * `reuniones.test.ts` para el caso que la motivó.
 *
 * ESTO SOLO ES LA MITAD DE LA PROTECCIÓN. Un `if` en el servidor no cubre la
 * carrera de dos peticiones que llegan a la vez —justo lo que produce el
 * doble clic que esto quiere evitar—: las dos consultan, las dos no ven nada,
 * las dos insertan. La otra mitad es el índice único de la migración 0046,
 * que sí lo cierra. Este `if` existe para dar un mensaje que se entienda, no
 * un error de Postgres crudo; el índice existe para que sea verdad.
 *
 * SIN DB no se comprueba nada aquí: el store en memoria se recorre entero
 * abajo, en la misma rama que ya sabe leerlo.
 */
async function yaExisteLaMismaJunta(
  datos: Pick<DatosDeReunion, 'salaSlug' | 'fecha' | 'titulo'>,
): Promise<boolean> {
  const mismoTitulo = (t: string) => t === datos.titulo
  const mismoInstante = (f: Date) => f.getTime() === datos.fecha.getTime()
  const mismaSala = (s: string | null | undefined) => (s ?? null) === (datos.salaSlug ?? null)

  if (!hayDB()) {
    return memoria
      .listarReunionesMemoria()
      .some((f) => mismaSala(f.salaSlug) && mismoInstante(f.fecha) && mismoTitulo(f.titulo))
  }

  // `is null` y no `eq(..., null)`: en SQL `columna = NULL` nunca es cierto,
  // y los comités sin sala son precisamente el caso que hay que cubrir.
  const filas = await db()
    .select({ id: esquema.reuniones.id })
    .from(esquema.reuniones)
    .where(
      and(
        datos.salaSlug ? eq(esquema.reuniones.salaSlug, datos.salaSlug) : isNull(esquema.reuniones.salaSlug),
        eq(esquema.reuniones.fecha, datos.fecha),
        eq(esquema.reuniones.titulo, datos.titulo),
      ),
    )
    .limit(1)
  return filas.length > 0
}

// ---- Escritura ----

export async function crearReunion(datos: DatosDeReunion): Promise<{ id: string }> {
  // Sin sala no hay nada que buscar (Tarea 8b, 5-ago) — mismo guardián
  // `datos.salaSlug &&` que usaba `crearSesion` (`sesiones.ts`, commit
  // `d5396be`) para esta misma comprobación.
  if (datos.salaSlug && !(await slugsDeSalas()).includes(datos.salaSlug)) {
    throw new Error(`Sala desconocida: "${datos.salaSlug}"`)
  }
  // I3 (revisión final, ronda 14.2): `agendarReunionAction`/`editarReunionAction`
  // (`src/app/reuniones/acciones.ts`) son Server Actions alcanzables por
  // cualquier `editor` y escribían la cadena que llegara sin comprobar nada
  // — un valor basura se pintaba luego como "Estatus de UDN" por el fallback
  // de `obtenerPlantilla`, un dato inventado presentado como real. Ver el
  // comentario de `esPlantillaConocida`, arriba, para por qué la validación
  // vive aquí y no en cada acción.
  if (!esPlantillaConocida(datos.plantilla)) {
    throw new Error(`Plantilla desconocida: "${datos.plantilla}"`)
  }
  /**
   * UNA SALA EN FREEZE NO ADMITE REUNIONES NUEVAS — PERO SÍ ADMITE REGISTRAR
   * LO YA SUCEDIDO (mismo rechazo, y la MISMA EXCEPCIÓN, que `crearSesion`,
   * src/db/sesiones.ts, tarea 12 ronda 7). Restaurada el 5-ago: se había
   * perdido al mudar a `crearReunion` —`DatosDeReunion` nació sin `estado`—,
   * y con ella la regla que Franco dejó explícita: "consultar su historia
   * sí; empezar trabajo nuevo no" (ver el comentario de `DatosDeReunion.estado`,
   * arriba). Completar el acta de una reunión que YA OCURRIÓ no es trabajo
   * nuevo, así que el freeze deja pasar `estado: 'dada'` y bloquea el resto
   * (`'agendada'`, el valor por defecto).
   *
   * SIN SALA NO HAY NADA QUE PREGUNTAR (Tarea 8b): ni si existe (comprobación
   * de arriba) ni si está en pausa (esta) — un comité no tiene freeze que
   * respetar. Mismo `datos.salaSlug &&` que el original `crearSesion` ya
   * usaba aquí.
   */
  const esTrabajoNuevo = (datos.estado ?? 'agendada') !== 'dada'
  if (datos.salaSlug && esTrabajoNuevo && !(await salaEstaActiva(datos.salaSlug))) {
    const registro = await cargarTemas()
    throw new Error(
      `${identidadDe(datos.salaSlug, registro).nombre} está pausada: reactívala antes de crear una reunión nueva.`,
    )
  }

  // LA MISMA JUNTA NO SE AGENDA DOS VECES (1-sep-2026) — ver
  // `yaExisteLaMismaJunta`, arriba, y el índice único de la migración 0046
  // que cierra la carrera que este `if` por sí solo no puede cerrar.
  if (await yaExisteLaMismaJunta(datos)) {
    throw new Error(`"${datos.titulo}" ya está agendada para esa fecha.`)
  }

  const id = crypto.randomUUID()
  const ahora = new Date()
  const comun = {
    id,
    salaSlug: datos.salaSlug,
    fecha: datos.fecha,
    titulo: datos.titulo,
    tipo: datos.tipo,
    // Qué clase de junta es, para que su presentación —si se arma aquí, y
    // puede ser días después— nazca con las secciones que le tocan. Ver la
    // columna en `src/db/esquema.ts` y la migración 0035.
    plantilla: datos.plantilla ?? null,
    // Nace agendada por defecto (agendar no es haber ocurrido, spec §1) —
    // salvo que quien llama diga explícitamente que ya se dio. Es lo que usa
    // el registro retroactivo de una minuta (`publicarMinutaAction`) para
    // nacer ya dada, en un solo paso — igual que hacía
    // `crearSesion({ estado: 'presentada' })`, sin un `marcarDada` aparte.
    estado: datos.estado ?? 'agendada',
    // Nace sin que nadie haya dicho que no se dio — ver la columna en
    // src/db/esquema.ts.
    noDadaEn: null,
    lugar: datos.lugar ?? null,
    alcance: datos.alcance ?? 'todos',
    participantes: datos.participantes ?? [],
  }

  if (hayDB()) {
    try {
      await db().insert(esquema.reuniones).values(comun)
    } catch (error) {
      // LA CARRERA QUE EL `if` DE ARRIBA NO PUEDE GANAR: dos peticiones a la
      // vez consultan, ninguna ve nada, las dos insertan — y aquí es donde el
      // constraint de la migración 0046 para a la segunda. Sin esta
      // traducción, quien hizo doble clic ve un error de Postgres en crudo
      // ("duplicate key value violates unique constraint...") en lugar de la
      // frase que sí explica qué pasó. Mismo mensaje que el camino normal, a
      // propósito: para quien lo lee es el mismo hecho.
      if (esViolacionDeUnicidad(error)) {
        throw new Error(`"${datos.titulo}" ya está agendada para esa fecha.`)
      }
      throw error
    }
  } else {
    memoria.insertarReunionMemoria({ ...comun, createdAt: ahora, updatedAt: ahora })
  }
  return { id }
}

/**
 * `23505` es el `unique_violation` de Postgres. Se busca por CÓDIGO y no por
 * el texto del mensaje —que cambia con la versión y con el idioma del
 * servidor— y se mira también en `cause` porque el driver de Neon envuelve el
 * error original ahí.
 */
function esViolacionDeUnicidad(error: unknown): boolean {
  const codigo = (e: unknown) => (e as { code?: unknown } | null)?.code
  return codigo(error) === '23505' || codigo((error as { cause?: unknown } | null)?.cause) === '23505'
}

export async function listarReuniones(): Promise<ReunionResumen[]> {
  const registro = await cargarTemas()

  if (!hayDB()) {
    // Sin DB no hay `documentos`/`minutas`/`archivos` ligados por `reunionId`
    // que este store modele todavía (la Tarea 5 le añade `documentos`): los
    // tres se quedan en su valor conservador, mismo criterio de honestidad
    // que `sesionesPublicasDelMes`/`acuerdosPendientesDeSubir` — no fingir un
    // dato que no se puede consultar de verdad.
    return memoria.listarReunionesMemoria().map((fila) => resumenDeFilaReunion(fila, registro, false, false, 0))
  }

  const conexion = db()
  const filas = await conexion.select().from(esquema.reuniones).orderBy(desc(esquema.reuniones.createdAt))

  // Tres consultas de "¿quién tiene qué" — no una por reunión: con una
  // docena de reuniones eso serían docenas de viajes a la base para una
  // casilla. Mismo patrón que `listarSesiones` con `conMinuta`.
  const conDocumento = new Set(
    (await conexion.select({ reunionId: esquema.documentos.reunionId }).from(esquema.documentos)).map(
      (d) => d.reunionId,
    ),
  )
  const conMinuta = new Set(
    (await conexion.select({ reunionId: esquema.minutas.reunionId }).from(esquema.minutas))
      .map((m) => m.reunionId)
      .filter((v): v is string => v != null),
  )
  const archivosPorReunion = new Map<string, number>()
  for (const fila of await conexion.select({ reunionId: esquema.archivos.reunionId }).from(esquema.archivos)) {
    if (!fila.reunionId) continue
    archivosPorReunion.set(fila.reunionId, (archivosPorReunion.get(fila.reunionId) ?? 0) + 1)
  }

  return filas.map((fila) =>
    resumenDeFilaReunion(
      fila,
      registro,
      conDocumento.has(fila.id),
      conMinuta.has(fila.id),
      archivosPorReunion.get(fila.id) ?? 0,
    ),
  )
}

export async function obtenerReunion(id: string): Promise<ReunionResumen | null> {
  const registro = await cargarTemas()

  if (!hayDB()) {
    const fila = memoria.obtenerReunionMemoria(id)
    if (!fila) return null
    return resumenDeFilaReunion(fila, registro, false, false, 0)
  }

  const conexion = db()
  const fila = (await conexion.select().from(esquema.reuniones).where(eq(esquema.reuniones.id, id)))[0]
  if (!fila) return null

  const [documento] = await conexion
    .select({ id: esquema.documentos.id })
    .from(esquema.documentos)
    .where(eq(esquema.documentos.reunionId, id))
  const [minuta] = await conexion
    .select({ id: esquema.minutas.id })
    .from(esquema.minutas)
    .where(eq(esquema.minutas.reunionId, id))
  const archivosDeReunion = await conexion
    .select({ id: esquema.archivos.id })
    .from(esquema.archivos)
    .where(eq(esquema.archivos.reunionId, id))

  return resumenDeFilaReunion(fila, registro, Boolean(documento), Boolean(minuta), archivosDeReunion.length)
}

/**
 * Cambia los datos de la reunión: cuándo, cómo se llama, qué tipo, quién va,
 * dónde, para quién es.
 *
 * `salaSlug` NO SE ADMITE NI EN EL TIPO (cerrado en compilación, deuda de la
 * Tarea 4): mover una reunión de sala no es editarla — de qué sala es una
 * reunión no es editable después de crearla, mismo criterio que
 * `editarSesion` (`src/db/sesiones.ts`), que nunca tocó `salaSlug`. La
 * versión vieja de este tipo era `Partial<DatosDeReunion>`, que lo admitía en
 * compilación (y lo ignoraba en runtime sin avisar) porque `DatosDeReunion`
 * lo tiene como campo obligatorio de CREACIÓN — `Omit` refleja que edición y
 * creación piden cosas distintas. Si algún día hace falta mover una reunión
 * de sala, es su propia función, no un caso especial de esta.
 */
export async function editarReunion(
  id: string,
  cambios: Omit<Partial<DatosDeReunion>, 'salaSlug'>,
): Promise<void> {
  const actual = await obtenerReunion(id)
  if (!actual) throw new Error(`Reunión no encontrada: "${id}"`)

  const titulo = cambios.titulo?.trim()
  if (titulo !== undefined && titulo.length === 0) {
    throw new Error('La reunión necesita un título.')
  }
  // I3 (revisión final, ronda 14.2): misma validación que `crearReunion`,
  // arriba — `editarReunionAction` corregía la clase de una junta ya creada
  // sin comprobar nada, alcanzable por cualquier `editor`. Ver el comentario
  // de `esPlantillaConocida` para el porqué de validar aquí y no en la acción.
  if (!esPlantillaConocida(cambios.plantilla)) {
    throw new Error(`Plantilla desconocida: "${cambios.plantilla}"`)
  }

  const ahora = new Date()
  const columnas: Record<string, unknown> = { updatedAt: ahora }
  if (cambios.fecha !== undefined) columnas.fecha = cambios.fecha
  if (titulo !== undefined) columnas.titulo = titulo
  if (cambios.tipo !== undefined) columnas.tipo = cambios.tipo
  /**
   * CRÍTICO C1 (ronda 14-2, fix 3/4) — faltaba esta línea. El TIPO de esta
   * función (`Omit<Partial<DatosDeReunion>, 'salaSlug'>`, en la firma de
   * arriba) ya admitía `plantilla` desde que se escribió; que el tipo lo
   * deje pasar en compilación no significa que este bloque la escribiera en
   * runtime — y no lo hacía: corregir la clase de una junta ya creada era un
   * no-op silencioso, sin error. `cambios.plantilla` puede llegar `null`
   * explícito (una junta que se queda sin clase, o que nunca la tuvo y
   * alguien edita otro campo — ver `editarReunionAction`,
   * `src/app/reuniones/acciones.ts`, que traduce `'' → null` ANTES de llegar
   * aquí), así que la guarda es `!== undefined`, no un `if (cambios.plantilla)`
   * que trataría `null` como "no tocar" y dejaría la clase vieja pegada.
   */
  if (cambios.plantilla !== undefined) columnas.plantilla = cambios.plantilla
  if (cambios.alcance !== undefined) columnas.alcance = cambios.alcance
  if (cambios.participantes !== undefined) {
    // Sin nombres vacíos ni repetidos (deuda de la Tarea 4: se perdió al
    // pasar el tipo de `string[]` a `unknown[]`, que no tiene `.trim()`).
    // `participantes` ya volvió a ser `string[]` en `DatosDeReunion` — ver su
    // comentario — así que esto es exactamente lo que hacía `editarSesion`
    // (`sesiones.ts:1138-1144`): la lista se escribe a mano, separada por
    // comas (`app/agenda/page.tsx`: `datos.participantes.split(',')...`), y
    // "Ceci, , Pablo, Ceci," es lo normal al teclear, no la excepción.
    columnas.participantes = [
      ...new Set(cambios.participantes.map((p) => p.trim()).filter((p) => p.length > 0)),
    ]
  }
  if (cambios.lugar !== undefined) columnas.lugar = cambios.lugar?.trim() || null

  if (hayDB()) {
    await db().update(esquema.reuniones).set(columnas).where(eq(esquema.reuniones.id, id))
    return
  }
  memoria.actualizarDatosReunionMemoria(id, columnas as Partial<Pick<FilaReunionMemoria, 'fecha' | 'titulo' | 'tipo' | 'plantilla' | 'alcance' | 'participantes' | 'lugar'>>)
}

/**
 * "Esta reunión ya se dio."
 *
 * Idempotente hacia adelante: una reunión ya `dada` no revienta por volver a
 * pulsar, ni vuelve a preguntar por el freeze de su sala — mismo criterio que
 * `marcarPresentada` (src/db/sesiones.ts).
 *
 * ESTE GUARDIÁN DE FREEZE SE QUEDA, A PROPÓSITO — reconfirmado el 5-ago al
 * restaurar la excepción de `crearReunion` (ver el comentario de
 * `DatosDeReunion.estado`): "consultar su historia sí; empezar trabajo
 * nuevo no" suena a que CONFIRMAR una reunión debería ser "historia" igual
 * que CREARLA ya dada, pero el original (`marcarPresentada`, sesiones.ts)
 * ya trazaba esa línea distinto, y a propósito — su propio comentario, de
 * una revisión posterior y separada de `crearSesion`: "confirmar que una
 * reunión se dio es gestión, y una sala en pausa no admite gestión — mismo
 * criterio... que usa `crearSesion` para bloquear trabajo nuevo". La
 * diferencia real: crear-ya-dada es registrar un hecho consumado de una
 * vez (nada que gestionar después); confirmar una reunión que YA EXISTÍA
 * como `agendada` es tocar un registro vivo de la sala — es gestión, y el
 * freeze la bloquea igual que crear algo nuevo. `marcarNoDada`, más abajo,
 * es la misma pregunta al revés y lleva el mismo guardián por el mismo
 * motivo.
 */
export async function marcarDada(id: string): Promise<void> {
  const reunion = await obtenerReunion(id)
  if (!reunion) throw new Error(`Reunión no encontrada: "${id}"`)
  if (reunion.estado === 'dada') return

  // FREEZE DE LA SALA: confirmar que una reunión se dio es gestión, y una
  // sala en pausa no admite gestión — mismo guardián que `crearReunion`
  // cuando SÍ es trabajo nuevo (ver el comentario de arriba). Sin sala
  // (`salaSlug` nulo, una reunión de comité — Tarea 8b) no hay freeze que
  // preguntar: mismo `reunion.salaSlug &&` que ya usaba el `marcarPresentada`
  // original (`sesiones.ts`, commit `d5396be`).
  if (reunion.salaSlug && !(await salaEstaActiva(reunion.salaSlug))) {
    throw new Error(`${reunion.salaNombre} está pausada: reactívala antes de confirmar esta reunión.`)
  }

  if (hayDB()) {
    await db()
      .update(esquema.reuniones)
      // noDadaEn: null — si alguien la había marcado "no se dio" y ahora
      // resulta que sí, lo explícito nuevo gana (ver el comentario de la
      // columna en src/db/esquema.ts).
      .set({ estado: 'dada', noDadaEn: null, updatedAt: new Date() })
      .where(eq(esquema.reuniones.id, id))
    return
  }
  memoria.actualizarEstadoReunionMemoria(id, 'dada')
}

/**
 * "Esta reunión no se dio." Se canceló, se pospuso — el freno de mano de
 * cualquier deducción automática de "se dio" (ver src/dominio/reunion.ts,
 * Tarea 6). No tiene sentido decir "no se dio" de algo que YA se confirmó
 * que sí (`dada`): eso es otra función que nadie pidió.
 */
export async function marcarNoDada(id: string): Promise<void> {
  const reunion = await obtenerReunion(id)
  if (!reunion) throw new Error(`Reunión no encontrada: "${id}"`)
  if (reunion.estado === 'dada') {
    throw new Error('Esta reunión ya se marcó como dada: no se puede decir que no se dio.')
  }
  // Mismo freeze que `marcarDada`: negar también es gestión. Sin sala,
  // tampoco hay freeze que preguntar — ver el comentario de `marcarDada`.
  if (reunion.salaSlug && !(await salaEstaActiva(reunion.salaSlug))) {
    throw new Error(`${reunion.salaNombre} está pausada: reactívala antes de marcar esta reunión.`)
  }

  const ahora = new Date()
  if (hayDB()) {
    await db()
      .update(esquema.reuniones)
      .set({ noDadaEn: ahora, updatedAt: ahora })
      .where(eq(esquema.reuniones.id, id))
    return
  }
  memoria.actualizarNoDadaReunionMemoria(id, ahora)
}

/**
 * Deshace `marcarNoDada`. Sin guardián de estado ni de freeze — limpiar la
 * marca es seguro sin importar en qué estado esté hoy la reunión, e
 * idempotente si nunca se había puesto.
 */
export async function desmarcarNoDada(id: string): Promise<void> {
  if (hayDB()) {
    await db()
      .update(esquema.reuniones)
      .set({ noDadaEn: null, updatedAt: new Date() })
      .where(eq(esquema.reuniones.id, id))
    return
  }
  memoria.actualizarNoDadaReunionMemoria(id, null)
}

/**
 * Borra una reunión.
 *
 * Los acuerdos que nacieron en ella NO se borran: cuelgan de la SALA, no de
 * la reunión (spec §4) — sobreviven a todas las siguientes. Se suelta la
 * referencia (`reunionOrigenId: null`) antes de borrar, o la clave foránea lo
 * impediría — mismo criterio, íntegro, que `eliminarSesion` con
 * `sesionOrigenId` (src/db/sesiones.ts).
 *
 * RESUELTO EN LA TAREA 5 (herencia de la T4): si esta reunión tiene un
 * documento, `esquema.documentos.reunionId` es `NOT NULL` + `UNIQUE` — el
 * DELETE de más abajo revienta por violación de clave foránea a menos que el
 * documento (y los items que cuelgan de él) se borre antes. Este módulo no
 * puede importar `src/db/documentos.ts` sin invertir la dirección de
 * dependencia que fija el plan (documentos.ts → reuniones.ts, nunca al
 * revés), así que la solución es inyección: quien SÍ conoce los dos módulos
 * —el llamador, hoy `documentos.ts` mismo a través de
 * `eliminarDocumentoDeReunion`, mañana una Server Action— pasa aquí la
 * función que sabe borrar el documento. Sin `eliminarDocumento` (el caso de
 * hoy en `reuniones.test.ts`, y el de cualquier reunión que nunca llegó a
 * tener documento) el comportamiento es EXACTAMENTE el de antes.
 *
 * DEFENSIVO (hallazgo de la revisión de la T4, anotado en el plan de la ronda
 * 10): sin `eliminarDocumento`, una reunión que SÍ tiene documento no debe
 * fallar con una violación de clave foránea cruda del driver (23503) cuando
 * haya DB, ni dejar un documento huérfano en silencio cuando no la haya — las
 * dos son peores que decir claramente qué falta. Se comprueba con
 * `esquema.documentos`/`store-memoria` directamente (infraestructura
 * compartida, no el módulo `documentos.ts`): no es la dirección de
 * dependencia prohibida, es el mismo tipo de acceso que ya hace este archivo
 * a `esquema.acuerdos`/`esquema.minutas`.
 */
export async function eliminarReunion(
  id: string,
  eliminarDocumento?: (reunionId: string) => Promise<void>,
): Promise<void> {
  if (eliminarDocumento) {
    await eliminarDocumento(id)
  } else if (await tieneDocumento(id)) {
    throw new Error(
      `No se puede borrar la reunión "${id}": tiene un documento. Pasa "eliminarDocumentoDeReunion" ` +
        '(src/db/documentos.ts) como segundo argumento de eliminarReunion.',
    )
  }

  if (hayDB()) {
    const conexion = db()
    // ORDEN: de lo más barato de perder a lo más caro. Sin transacciones
    // (`neon-http`), si el proceso muere a media lo que ya se fue es lo que
    // menos duele. La telemetría de participación antes que la minuta.
    await conexion.delete(esquema.participacion).where(eq(esquema.participacion.reunionId, id))
    await conexion
      .update(esquema.acuerdos)
      .set({ reunionOrigenId: null })
      .where(eq(esquema.acuerdos.reunionOrigenId, id))
    await conexion.delete(esquema.minutas).where(eq(esquema.minutas.reunionId, id))
    // LOS ARCHIVOS TAMBIÉN APUNTAN A LA REUNIÓN, y su clave ajena no lleva
    // `ON DELETE` — ninguna del esquema lo lleva. Sin soltarlos, borrar una
    // reunión cuyo deck tenga una imagen reventaba con 23503 DESPUÉS de haber
    // borrado ya el documento, sus items y la minuta: Franco veía un error, la
    // reunión seguía ahí, y su presentación entera había desaparecido.
    //
    // Las dos categorías se tratan distinto porque son cosas distintas:
    // - `presentacion` es un entregable de la sala. Sobrevive sin su reunión,
    //   igual que un acuerdo: se le anula la referencia y sigue descargable.
    // - `imagen`/`video` son contenido INCRUSTADO en el documento que se acaba
    //   de borrar. Sin él no tienen dónde verse ni quién los gobierne, así que
    //   se van con él.
    await conexion
      .update(esquema.archivos)
      .set({ reunionId: null })
      .where(and(eq(esquema.archivos.reunionId, id), eq(esquema.archivos.categoria, 'presentacion')))
    await conexion
      .delete(esquema.archivos)
      .where(
        and(
          eq(esquema.archivos.reunionId, id),
          inArray(esquema.archivos.categoria, ['imagen', 'video']),
        ),
      )
    await conexion.delete(esquema.reuniones).where(eq(esquema.reuniones.id, id))
    return
  }
  memoria.anularReunionOrigenDeAcuerdosMemoria(id)
  // El doble tiene que decir lo mismo que Postgres o los tests mienten: el
  // `eliminarSesion` viejo sí borraba la minuta en memoria y se perdió al mudar.
  memoria.eliminarMinutaDeReunionMemoria(id)
  memoria.eliminarReunionMemoria(id)
}

/** Si `reunionId` tiene un documento — ver el comentario defensivo de `eliminarReunion`. */
async function tieneDocumento(reunionId: string): Promise<boolean> {
  if (hayDB()) {
    const [documento] = await db()
      .select({ id: esquema.documentos.id })
      .from(esquema.documentos)
      .where(eq(esquema.documentos.reunionId, reunionId))
    return Boolean(documento)
  }
  return memoria.obtenerDocumentoDeReunionMemoria(reunionId) != null
}

// ---- Agenda pública ----

export interface ReunionPublica {
  salaSlug: string
  salaNombre: string
  salaColor: string
  /** ISO, día civil de México. */
  fecha: string
  /** 'HH:MM' en hora de México. */
  hora: string
}

/**
 * El primer instante de un mes, anclado a CDMX. Mudado tal cual desde
 * `sesiones.ts` — es la instancia concreta de "las fechas se comparan por día
 * civil anclado a America/Mexico_City" que este módulo tiene que conservar.
 */
function inicioDeMes(anio: number, mes: number): Date {
  return instanteEnCDMX(`${anio}-${String(mes).padStart(2, '0')}-01`, '00:00')
}

/**
 * Las reuniones de un mes, para la agenda que se comparte fuera.
 *
 * Deja fuera las salas EN PAUSA —no tienen reuniones que anunciar—, igual que
 * `sesionesPublicasDelMes`. Lo que SÍ cambia respecto a esa función: no hay
 * filtro de estado tipo "sin las que están en borrador". `EstadoReunion` no
 * tiene un valor `'borrador'` — esa mitad de la vida vieja de la sesión ahora
 * es `EstadoDocumento` (Tarea 5), una pregunta aparte de "¿es una fecha
 * comprometida?". Toda reunión, `agendada` o `dada`, ya es una fecha
 * comprometida con la sala — nace así (ver `crearReunion`) — así que no hay
 * nada análogo a "trabajo en curso, no anunciar todavía" que filtrar aquí.
 */
export async function reunionesPublicasDelMes(anio: number, mes: number): Promise<ReunionPublica[]> {
  // Sin DB no hay `salas.activa` que consultar — mismo motivo que
  // `sesionesPublicasDelMes`: el store en memoria no modela esa columna, y
  // fingir que todas las salas están activas sería mentir.
  if (!hayDB()) return []

  const inicio = inicioDeMes(anio, mes)
  const finExclusivo = mes === 12 ? inicioDeMes(anio + 1, 1) : inicioDeMes(anio, mes + 1)

  const filas = await db()
    .select({
      salaSlug: esquema.reuniones.salaSlug,
      fecha: esquema.reuniones.fecha,
      salaNombre: esquema.salas.nombre,
      salaColor: esquema.salas.primario,
    })
    .from(esquema.reuniones)
    .innerJoin(esquema.salas, eq(esquema.reuniones.salaSlug, esquema.salas.slug))
    .where(
      and(
        eq(esquema.salas.activa, true),
        gte(esquema.reuniones.fecha, inicio),
        lt(esquema.reuniones.fecha, finExclusivo),
      ),
    )
    .orderBy(asc(esquema.reuniones.fecha))

  // GRUPO UPAX NO ES UNA UDN: NO SE ANUNCIA AQUÍ — misma exclusión, íntegra,
  // que `sesionesPublicasDelMes` (ver su comentario en src/db/sesiones.ts).
  // UNA REUNIÓN SIN SALA (comité, Marketing Corp — Tarea 8b) TAMPOCO: el
  // propio INNER JOIN de arriba ya la excluye en SQL (NULL nunca iguala nada
  // contra `esquema.salas.slug`), pero `esquema.reuniones.salaSlug` volvió a
  // ser nullable en el TIPO — este filtro se lo confirma a TypeScript sin
  // mentirle con un `!`, y de paso documenta la intención.
  const slugsReales = await slugsDeSalas()
  return filas
    .filter((fila): fila is typeof fila & { salaSlug: string } =>
      fila.salaSlug !== null && slugsReales.includes(fila.salaSlug),
    )
    .map((fila) => {
      const iso = fila.fecha.toISOString()
      return {
        salaSlug: fila.salaSlug,
        salaNombre: fila.salaNombre,
        salaColor: fila.salaColor,
        fecha: diaCivil(iso),
        hora: horaBreve(iso),
      }
    })
}
