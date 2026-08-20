/**
 * Capa de escritura de Acuerdo (spec §4): cuelga de la SALA, no de la sesión
 * — nace en una sesión (o se da de alta directamente) y sobrevive a todas las
 * siguientes. Con `hayDB()` escribe a Postgres vía Drizzle; sin DB, usa el
 * store en memoria de `src/db/store-memoria.ts` (efímero, ver su cabecera).
 *
 * "Solo el equipo Mkt Corp mueve el estatus" (spec §4): hoy no hay auth (fase
 * posterior, ver tarea "Login SSO Slack y tokens de sala"), así que estas
 * funciones no comprueban identidad todavía — las protege quien las llama
 * (por ahora, solo la vista interna de sala y la publicación de minuta).
 *
 * Historia de cambios: v1 mínima (spec §4), un jsonb por acuerdo con un
 * registro por movimiento de estatus o edición — ver `esquema.acuerdos.historia`.
 */
import { and, eq, isNull, sql } from 'drizzle-orm'
import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import * as memoria from './store-memoria'
import { slugsDeSalas } from './temas'

export type EstatusAcuerdo = 'abierto' | 'cumplido' | 'vencido' | 'cancelado'

export interface NuevoAcuerdo {
  que: string
  responsable: string
  squad?: string
  prioridad?: string
  fechaCompromiso: Date | null
  /**
   * Reunión donde nació el acuerdo. Omitir si se da de alta fuera de una
   * reunión. Hasta la Tarea 8 convivía con `sesionOrigenId` (campo aparte,
   * columna aparte) mientras convivían los dos modelos; se retiró junto con
   * `sesiones` sin que nadie hubiera llegado a usarlo — desde que
   * `sesiones.ts` desapareció (Tarea 5b) nada da de alta un acuerdo colgado
   * de una fila de `sesiones`.
   */
  reunionOrigenId?: string | null
}

export interface CambiosAcuerdo {
  que?: string
  responsable?: string
  squad?: string
  prioridad?: string
  fechaCompromiso?: Date | null
}

interface EntradaHistoria {
  en: string // ISO
  estatusAnterior?: EstatusAcuerdo
  cambios?: unknown
}

function historiaConEntrada(historiaPrevia: unknown, entrada: EntradaHistoria): EntradaHistoria[] {
  const previa = Array.isArray(historiaPrevia) ? (historiaPrevia as EntradaHistoria[]) : []
  return [...previa, entrada]
}

async function validarSala(salaSlug: string): Promise<void> {
  if (!(await slugsDeSalas()).includes(salaSlug)) {
    throw new Error(`Sala desconocida: "${salaSlug}"`)
  }
}

/**
 * Da de alta un acuerdo nuevo, siempre en estatus `abierto`.
 *
 * DEDUPE ATÓMICO cuando `datos.reunionOrigenId` trae valor (deuda de
 * concurrencia, ronda 11 — "la reunión fantasma" de participacion.ts:75-88
 * aplicada a los acuerdos): `guardarMinuta` (src/db/minutas.ts) llama a esta
 * función una vez por acuerdo confirmado, EN UN BUCLE, sin ninguna
 * restricción que impidiera repetirlo. Un doble clic en "Publicar" o un
 * reintento tras un hipo de red vuelven a llamar a `guardarMinuta` con el
 * MISMO `acuerdosConfirmados` — la minuta no se duplica (`UNIQUE
 * (reunion_id)` + `ON CONFLICT DO UPDATE`, ronda 11), pero sin esto cada
 * acuerdo confirmado nacía dos veces, con su dueño y su fecha duplicados en
 * la sala.
 *
 * QUÉ HACE ÚNICO A UN ACUERDO DE UNA MINUTA: de qué reunión nació
 * (`reunionOrigenId`) + su contenido (`que`, `responsable`,
 * `fechaCompromiso`) — mismo texto, mismo dueño, misma fecha, nacidos de la
 * MISMA reunión. Dos UDNs distintas pueden compartir "Mandar propuesta —
 * Pablo Levy" en dos reuniones sin ser el mismo acuerdo; dos publicaciones
 * de LA MISMA reunión con el mismo texto sí lo son.
 *
 * LA FECHA SE COMPARA POR DÍA, NO POR INSTANTE (revisión final de la ronda
 * 14, hallazgo C1 — es lógica de la ronda 11 y solo se toca con evidencia;
 * esta es la evidencia). `fechaCompromiso` es una fecha CIVIL disfrazada de
 * `timestamptz`: el día es el dato, la hora es un ancla arbitraria. Mientras
 * todos los escritores usaron la misma ancla, comparar el instante exacto
 * daba lo mismo que comparar el día. La ronda 14 rompió esa condición —unos
 * escritores pasaron a `instanteEnCDMX(dia,'12:00')` = 18:00Z y otros se
 * quedaron en `new Date(dia)` = 00:00Z— y el dedupe dejó de reconocer sus
 * propias filas: republicar una minuta insertaba un duplicado, que la sala y
 * la pantalla de acuerdos pintan dos veces.
 *
 * Unificar los seis escritores (hecho, misma tanda) arregla lo que se cree de
 * ahora en adelante, pero NO BASTA, y está medido contra la base de
 * producción el 14-ago: las 19 filas que hoy tienen `fecha_compromiso` están
 * a las 00:00Z y las 19 vienen de una minuta. Con el escritor nuevo
 * produciendo 18:00Z, republicar cualquiera de esas minutas duplicaría el
 * acuerdo sin que nadie tocara una sola fecha. Comparar el día hace que las
 * dos formas de escribir el mismo día civil se reconozcan entre sí, sin
 * migrar ni una fila.
 *
 * `AT TIME ZONE 'UTC'` explícito y no `date_trunc('day', col)` a secas: sobre
 * un `timestamptz`, `date_trunc` usa el `TimeZone` de la SESIÓN de Postgres,
 * así que el resultado dependería de la configuración del servidor. Fijarlo
 * hace la comparación determinista. Y el día UTC es el correcto para las dos
 * anclas: `D 00:00Z` y `D 18:00Z` caen los dos en el día UTC D, mientras que
 * dos días civiles distintos —separados por 24 h— nunca colisionan. El
 * dedupe no se vuelve ciego a la fecha: el día siguiente sigue siendo otro
 * acuerdo, y hay un test que lo fija.
 */
export async function crearAcuerdo(salaSlug: string, datos: NuevoAcuerdo): Promise<{ id: string }> {
  await validarSala(salaSlug)
  const id = crypto.randomUUID()
  const ahora = new Date()
  const reunionOrigenId = datos.reunionOrigenId ?? null
  const fechaCompromisoIso = datos.fechaCompromiso ? datos.fechaCompromiso.toISOString() : null

  if (hayDB()) {
    const conexion = db()
    // `WHERE NOT EXISTS` DENTRO del INSERT, no un SELECT-y-luego-INSERT: el
    // mismo hueco de lectura-y-escritura que ya se cerró en
    // `documentos.estructura` (`anadirSeccion`/`eliminarSeccion`,
    // src/db/documentos.ts). Una sola sentencia: Postgres evalúa el NOT
    // EXISTS contra el estado COMMITEADO en el momento en que esta sentencia
    // corre, así que un reintento SECUENCIAL (doble clic, retry de red — el
    // escenario real) siempre ve la fila que dejó el intento anterior y el
    // INSERT no se repite.
    //
    // SIN CONSTRAINT NUEVO A PROPÓSITO (alcance de esta tarea: un UNIQUE es
    // una migración — ver el reporte de la ronda 11). Sin uno, dos
    // sentencias VERDADERAMENTE simultáneas (dos backends de Postgres en el
    // mismo instante) podrían las dos ver NOT EXISTS = true antes de que
    // cualquiera de las dos comitee: una ventana mucho más angosta que la
    // que había —que se abría en CUALQUIER reintento, no solo uno
    // milisegundo-exacto— pero no cerrada del todo. El escenario real que
    // reporta Franco (doble clic, reintento tras un hipo) es secuencial a
    // nivel de Postgres, así que esto lo resuelve.
    //
    // `reunion_origen_id = candidato.reunion_origen_id` con `=`, NO `IS NOT
    // DISTINCT FROM`: un acuerdo dado de alta a mano desde la sala
    // (`crearAcuerdoAction`, src/app/cliente/[slug]/page.tsx) nunca manda
    // `reunionOrigenId` — nace con NULL. `columna = NULL` nunca es
    // verdadero en SQL, así que el NOT EXISTS es SIEMPRE verdadero para un
    // alta manual (nunca hay "duplicado" que detectar) y ese camino queda
    // EXACTAMENTE igual que antes: un INSERT liso. El dedupe solo se activa
    // cuando `datos.reunionOrigenId` trae valor — hoy, solo `guardarMinuta`.
    //
    // BORRAR-Y-REPUBLICAR SIGUE FUNCIONANDO: si Franco borra un acuerdo a
    // mano (`eliminarAcuerdo`, DELETE real, sin papelera) y vuelve a
    // publicar la misma minuta, la fila que el NOT EXISTS buscaba ya no
    // está — vuelve a ser verdadero y el acuerdo (corregido o no) SÍ se
    // crea. El dedupe mira el estado ACTUAL de la tabla, no un historial de
    // qué se publicó alguna vez.
    //
    // Los valores viajan por una CTE (`candidato`) en vez de repetirse en
    // cada interpolación: cada parámetro aparece UNA sola vez en la
    // sentencia, en un orden fijo y fácil de auditar.
    const insertado = await conexion.execute<{ id: string }>(sql`
      WITH candidato AS (
        SELECT
          ${id}::text AS id,
          ${salaSlug}::text AS sala_slug,
          ${datos.que}::text AS que,
          ${datos.responsable}::text AS responsable,
          ${datos.squad ?? null}::text AS squad,
          ${datos.prioridad ?? null}::text AS prioridad,
          ${fechaCompromisoIso}::timestamptz AS fecha_compromiso,
          ${reunionOrigenId}::text AS reunion_origen_id
      )
      INSERT INTO ${esquema.acuerdos} (
        id, sala_slug, que, responsable, squad, prioridad, fecha_compromiso,
        estatus, reunion_origen_id, historia
      )
      SELECT
        candidato.id, candidato.sala_slug, candidato.que, candidato.responsable,
        candidato.squad, candidato.prioridad, candidato.fecha_compromiso, 'abierto',
        candidato.reunion_origen_id, '[]'::jsonb
      FROM candidato
      WHERE NOT EXISTS (
        SELECT 1 FROM ${esquema.acuerdos}
        WHERE ${esquema.acuerdos.reunionOrigenId} = candidato.reunion_origen_id
          AND ${esquema.acuerdos.que} = candidato.que
          AND ${esquema.acuerdos.responsable} = candidato.responsable
          AND date_trunc('day', ${esquema.acuerdos.fechaCompromiso} AT TIME ZONE 'UTC')
              IS NOT DISTINCT FROM date_trunc('day', candidato.fecha_compromiso AT TIME ZONE 'UTC')
      )
      RETURNING id
    `)

    if (insertado.rows.length > 0) return { id: insertado.rows[0].id }

    // El NOT EXISTS no se cumplió: ya había un acuerdo igual de esta misma
    // reunión. El reintento se descarta sin crear una fila nueva — se
    // devuelve el id de la fila que YA representa este acuerdo (nunca un id
    // fabricado que no corresponde a ninguna fila).
    const [existente] = await conexion
      .select({ id: esquema.acuerdos.id })
      .from(esquema.acuerdos)
      .where(
        and(
          eq(esquema.acuerdos.reunionOrigenId, reunionOrigenId as string),
          eq(esquema.acuerdos.que, datos.que),
          eq(esquema.acuerdos.responsable, datos.responsable),
          // Mismo criterio de DÍA que el NOT EXISTS de arriba, y no un `eq`
          // de instante: si los dos no dijeran lo mismo, este respaldo podría
          // no encontrar la fila que aquel acaba de reconocer como duplicada.
          datos.fechaCompromiso
            ? sql`date_trunc('day', ${esquema.acuerdos.fechaCompromiso} AT TIME ZONE 'UTC') = date_trunc('day', ${fechaCompromisoIso}::timestamptz AT TIME ZONE 'UTC')`
            : isNull(esquema.acuerdos.fechaCompromiso),
        ),
      )
    // Defensivo: no debería faltar (el NOT EXISTS que bloqueó el INSERT vio
    // esta misma fila hace un instante), pero si faltara —un borrado
    // concurrente justo en medio—, mejor devolver el id que se iba a usar
    // que reventar una publicación que, para todo lo demás, salió bien.
    return { id: existente?.id ?? id }
  }

  // MISMO DEDUPE, EN MEMORIA (el doble tiene que decir lo mismo que
  // Postgres, ver store-memoria.ts): a diferencia de la carrera de
  // `documentos.estructura` —donde el camino en memoria ya era seguro sin
  // tocarlo—, aquí SIN esto el store en memoria (lo que corren `npm run dev`
  // sin `DATABASE_URL` y la mayoría de los tests de este repo) seguiría
  // duplicando acuerdos en cada reintento aunque Postgres ya no lo hiciera.
  if (reunionOrigenId) {
    const duplicado = memoria.buscarAcuerdoDuplicadoMemoria(reunionOrigenId, datos.que, datos.responsable, datos.fechaCompromiso)
    if (duplicado) return { id: duplicado.id }
  }

  memoria.insertarAcuerdoMemoria({
    id,
    salaSlug,
    que: datos.que,
    responsable: datos.responsable,
    squad: datos.squad,
    prioridad: datos.prioridad,
    fechaCompromiso: datos.fechaCompromiso,
    estatus: 'abierto',
    reunionOrigenId,
    historia: [],
    createdAt: ahora,
    updatedAt: ahora,
  })

  return { id }
}

/** Mueve el estatus de un acuerdo, dejando registro del estatus anterior en su historia. */
export async function moverEstatus(acuerdoId: string, nuevoEstatus: EstatusAcuerdo): Promise<void> {
  const ahora = new Date()

  if (hayDB()) {
    const conexion = db()
    const actual = (await conexion.select().from(esquema.acuerdos).where(eq(esquema.acuerdos.id, acuerdoId)))[0]
    if (!actual) throw new Error(`Acuerdo no encontrado: "${acuerdoId}"`)
    const historia = historiaConEntrada(actual.historia, {
      en: ahora.toISOString(),
      estatusAnterior: actual.estatus,
    })
    await conexion
      .update(esquema.acuerdos)
      .set({ estatus: nuevoEstatus, historia, updatedAt: ahora })
      .where(eq(esquema.acuerdos.id, acuerdoId))
    return
  }

  const actual = memoria.obtenerAcuerdoMemoria(acuerdoId)
  if (!actual) throw new Error(`Acuerdo no encontrado: "${acuerdoId}"`)
  const historia = historiaConEntrada(actual.historia, {
    en: ahora.toISOString(),
    estatusAnterior: actual.estatus,
  })
  memoria.actualizarAcuerdoMemoria(acuerdoId, { estatus: nuevoEstatus, historia })
}

/** Edita los campos de un acuerdo (qué, responsable, squad, prioridad, fecha), registrando los cambios en su historia. */
export async function editarAcuerdo(acuerdoId: string, cambios: CambiosAcuerdo): Promise<void> {
  const ahora = new Date()

  if (hayDB()) {
    const conexion = db()
    const actual = (await conexion.select().from(esquema.acuerdos).where(eq(esquema.acuerdos.id, acuerdoId)))[0]
    if (!actual) throw new Error(`Acuerdo no encontrado: "${acuerdoId}"`)
    const historia = historiaConEntrada(actual.historia, { en: ahora.toISOString(), cambios })
    await conexion
      .update(esquema.acuerdos)
      .set({ ...cambios, historia, updatedAt: ahora })
      .where(eq(esquema.acuerdos.id, acuerdoId))
    return
  }

  const actual = memoria.obtenerAcuerdoMemoria(acuerdoId)
  if (!actual) throw new Error(`Acuerdo no encontrado: "${acuerdoId}"`)
  const historia = historiaConEntrada(actual.historia, { en: ahora.toISOString(), cambios })
  memoria.actualizarAcuerdoMemoria(acuerdoId, { ...cambios, historia })
}

/**
 * MUEVE UN ACUERDO A OTRA SALA (ronda 14, tarea 3). Franco: un acuerdo
 * registrado en la sala equivocada hoy solo se arregla borrándolo y
 * volviéndolo a crear — pierde su origen (`reunionOrigenId`) y su historia.
 * Esta función es el arreglo real: la fila sigue siendo la MISMA, solo
 * cambia de qué cliente cuelga.
 *
 * `validarSala` (arriba, la misma que usa `crearAcuerdo`) valida contra
 * `slugsDeSalas()` —las salas de cliente de verdad—, NO contra "¿existe la
 * fila en `salas`?": `grupo-upax` tiene fila y dejó de ser una sala el 24-jul
 * (ver la cabecera de `slugsDeSalas`, src/db/temas.ts). Aceptar ese slug aquí
 * dejaría un acuerdo colgado de un cliente que ya no es tal.
 *
 * NO se toca `reunionOrigenId`: el acuerdo se acordó donde se acordó, y
 * moverlo de sala no reescribe de qué junta salió.
 *
 * NO SE REUSA `editarAcuerdo` ni se ensancha `CambiosAcuerdo` con `salaSlug`:
 * mover de sala no es "corregir un campo" del acuerdo, es una operación con
 * nombre propio. Lo que sí se conserva es la entrada en `historia`: quedarse
 * sin rastro de que un compromiso cambió de cliente sería peor que no poder
 * moverlo.
 *
 * SIN DB, delega en `moverAcuerdoDeSalaMemoria` (store-memoria.ts) y NO en
 * `actualizarAcuerdoMemoria`: ese actualizador general excluye `salaSlug` de
 * su tipo A PROPÓSITO (ver su cabecera) — la misma razón de arriba, aplicada
 * al doble en memoria. `historiaConEntrada` se calcula aquí, no en el store,
 * porque es la única fuente de qué forma tiene una entrada de historia.
 */
export async function moverAcuerdoDeSala(acuerdoId: string, salaSlug: string): Promise<void> {
  await validarSala(salaSlug)
  const ahora = new Date()
  const cambios = { salaSlug }

  if (hayDB()) {
    const conexion = db()
    const actual = (await conexion.select().from(esquema.acuerdos).where(eq(esquema.acuerdos.id, acuerdoId)))[0]
    if (!actual) throw new Error(`Acuerdo no encontrado: "${acuerdoId}"`)
    const historia = historiaConEntrada(actual.historia, { en: ahora.toISOString(), cambios })
    await conexion
      .update(esquema.acuerdos)
      .set({ salaSlug, historia, updatedAt: ahora })
      .where(eq(esquema.acuerdos.id, acuerdoId))
    return
  }

  const actual = memoria.obtenerAcuerdoMemoria(acuerdoId)
  if (!actual) throw new Error(`Acuerdo no encontrado: "${acuerdoId}"`)
  const historia = historiaConEntrada(actual.historia, { en: ahora.toISOString(), cambios })
  memoria.moverAcuerdoDeSalaMemoria(acuerdoId, salaSlug, historia)
}

/**
 * Deja constancia de que `reunionId` RETOMA `acuerdoId` — ronda 9, tarea 6.
 * Franco pidió poder "arrastrar" un acuerdo abierto de la sala a la reunión
 * que se está preparando. NO CREA UN ACUERDO NUEVO: darlo de alta otra vez
 * con el mismo `que` daría dos compromisos donde antes había uno —el
 * original seguiría colgando de la sala sin que cerrar el nuevo lo cerrara a
 * él, y viceversa—. El acuerdo es el MISMO; lo único que cambia es que su
 * historia deja constancia de que esta reunión lo retomó, con el mismo campo
 * `cambios` (bolsa libre) que ya usa `editarAcuerdo` para entradas que no son
 * ni un movimiento de estatus ni una edición de campos.
 *
 * Es la fuente que lee `acuerdosArrastrablesDe` (src/db/consultas.ts) para
 * dejar de ofrecer un acuerdo que esta reunión ya retomó.
 *
 * NO toca `estatus`: retomar no es cerrar.
 */
export async function retomarAcuerdo(acuerdoId: string, reunionId: string): Promise<void> {
  const ahora = new Date()
  // La clave `retomadoEnSesion` se queda tal cual dentro de `cambios` (bolsa
  // libre, sin tipar) aunque el parámetro ya se llame `reunionId`: es dato ya
  // persistido en la historia de acuerdos existentes, y `acuerdos.test.ts` la
  // comprueba tal cual. Renombrarla mezclaría dos formas de la misma entrada
  // en la misma columna sin necesidad — nadie lee esta clave para decidir nada,
  // solo queda como bitácora.
  const entrada: EntradaHistoria = { en: ahora.toISOString(), cambios: { retomadoEnSesion: reunionId } }

  if (hayDB()) {
    const conexion = db()
    const actual = (await conexion.select().from(esquema.acuerdos).where(eq(esquema.acuerdos.id, acuerdoId)))[0]
    if (!actual) throw new Error(`Acuerdo no encontrado: "${acuerdoId}"`)
    const historia = historiaConEntrada(actual.historia, entrada)
    await conexion
      .update(esquema.acuerdos)
      .set({ historia, updatedAt: ahora })
      .where(eq(esquema.acuerdos.id, acuerdoId))
    return
  }

  const actual = memoria.obtenerAcuerdoMemoria(acuerdoId)
  if (!actual) throw new Error(`Acuerdo no encontrado: "${acuerdoId}"`)
  const historia = historiaConEntrada(actual.historia, entrada)
  memoria.actualizarAcuerdoMemoria(acuerdoId, { historia })
}

/**
 * Borra un acuerdo de verdad, con su historia.
 *
 * Distinto de `moverEstatus(id, 'cancelado')`: cancelar es una decisión de
 * negocio —el acuerdo existió y se dejó sin efecto— y la fila se conserva.
 * Esto es para lo que nunca debió existir: un duplicado, un error de dedo, una
 * línea que la IA sacó de una transcripción y no era un acuerdo. No hay
 * papelera: la vista que llama pide confirmación antes.
 */
export async function eliminarAcuerdo(acuerdoId: string): Promise<void> {
  if (hayDB()) {
    await db().delete(esquema.acuerdos).where(eq(esquema.acuerdos.id, acuerdoId))
    return
  }
  memoria.eliminarAcuerdoMemoria(acuerdoId)
}

/**
 * De qué sala es un acuerdo, o `null` si no existe.
 *
 * Existe para que una Server Action pueda comprobar que el acuerdo que le
 * mandan es del cliente cuya pantalla lo pidió — el id viaja desde el
 * navegador y una acción es un endpoint.
 *
 * SE PREGUNTA A LA BASE Y NO A LO QUE LA PÁGINA YA TENÍA CARGADO, por dos
 * motivos. El de fondo: lo cargado es una foto del momento del render, y
 * entre eso y el clic pueden pasar minutos. El práctico: alcanzar ese objeto
 * desde dentro de la acción mete su contenido en el cierre que React
 * serializa hacia el cliente, y ahí salta "Functions cannot be passed
 * directly to Client Components" — pasó con `s.acuerdos.some(...)` y tumbó la
 * sala entera.
 */
export async function salaDeAcuerdo(acuerdoId: string): Promise<string | null> {
  if (!hayDB()) {
    return memoria.obtenerAcuerdoMemoria(acuerdoId)?.salaSlug ?? null
  }
  const fila = (
    await db()
      .select({ salaSlug: esquema.acuerdos.salaSlug })
      .from(esquema.acuerdos)
      .where(eq(esquema.acuerdos.id, acuerdoId))
      .limit(1)
  )[0]
  return fila?.salaSlug ?? null
}
