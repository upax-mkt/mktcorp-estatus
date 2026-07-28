/**
 * Esquema Drizzle sobre Postgres (Neon). Modela lo descrito en
 * docs/superpowers/specs/2026-07-23-mktcorp-estatus-design.md §4.
 *
 * Nombre/color de cada sala NO se duplican aquí: son fijos y viven en
 * `src/temas` (una fuente, el tema visual). Esta tabla guarda únicamente lo
 * mutable de la sala (hoy: su cadencia acordada).
 */
import {
  pgTable,
  pgEnum,
  text,
  integer,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core'

// ---- Enums ----
// Solo se tipan como enum los campos cuyos valores exactos están fijados en
// el spec (§4). Campos abiertos (alcance, prioridad) quedan como texto libre
// para no inventar un catálogo que el spec no cerró todavía.

export const cadenciaEnum = pgEnum('cadencia', ['semanal', 'mensual'])
export const tipoSesionEnum = pgEnum('tipo_sesion', ['semanal', 'mensual'])
// 'agendada' es una sesión con fecha en el calendario que nadie ha empezado a
// llenar todavía. Sin ella no se puede distinguir "la próxima sesión es el 19
// de agosto" de "estamos preparando la sesión", que son cosas distintas para
// el hub: la primera es una fecha, la segunda es trabajo en curso.
export const estadoSesionEnum = pgEnum('estado_sesion', [
  'agendada',
  'borrador',
  'lista',
  'presentada',
  'minutada',
])
export const estatusAcuerdoEnum = pgEnum('estatus_acuerdo', [
  'abierto',
  'cumplido',
  'vencido',
  'cancelado',
])

// ---- Sala ----
// Las 10 entidades receptoras son fijas: no se crean ni se borran desde la
// app (viven como semillas, ver src/db/semilla.ts). slug es la misma clave
// que usa src/temas.
export const salas = pgTable('salas', {
  slug: text('slug').primaryKey(),
  cadencia: cadenciaEnum('cadencia').notNull().default('mensual'),
  /**
   * La clave con la que entra el director de esta UDN y su equipo.
   *
   * Se guarda el HASH, no la clave. Se enseña completa una sola vez, al
   * generarla, y desde entonces solo se puede regenerar — el patrón de
   * cualquier API key. Guardarla recuperable sería más cómodo para el equipo
   * y convertiría la tabla `salas` en una lista de credenciales en claro.
   *
   * Regenerar es barato: compartirla otra vez es un mensaje de Slack.
   */
  claveHash: text('clave_hash'),
  claveCreadaEn: timestamp('clave_creada_en', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---- Sesión ----
// Una reunión concreta: sala + fecha + tipo + alcance + copia congelada de
// la estructura (jsonb — la Estructura como tal, versionada, es trabajo de
// una fase posterior; aquí solo se guarda el snapshot que usó esta sesión).
export const sesiones = pgTable('sesiones', {
  id: text('id').primaryKey(),
  /**
   * De qué sala es. NULO para una reunión que no pertenece a ninguna: un
   * comité, un arranque de campaña, una junta de squad.
   *
   * Dejó de ser obligatorio cuando la herramienta dejó de ser solo para el
   * estatus de las UDNs (Franco, 28-jul). Una reunión sin sala se viste con
   * la identidad de Marketing Corp y no aparece en ninguna de las diez.
   */
  salaSlug: text('sala_slug').references(() => salas.slug),
  /**
   * Con qué plantilla nació: "estatus-udn", "comite", "en-blanco"…
   * Ver src/secciones/plantillas.ts. Se guarda —y no se deduce de las
   * secciones— porque decide qué se puede borrar: en un estatus los ocho
   * bloques son el acuerdo con la UDN; en una reunión libre no hay nada
   * intocable.
   */
  plantilla: text('plantilla').notNull().default('estatus-udn'),
  fecha: timestamp('fecha', { withTimezone: true }).notNull(),
  tipo: tipoSesionEnum('tipo').notNull(),
  /** 'todos los squads' / squads específicos / tema puntual — texto libre, ver §4/§6. */
  alcance: text('alcance').notNull().default('todos'),
  estado: estadoSesionEnum('estado').notNull().default('borrador'),
  /** Copia congelada de la estructura (agenda de items) al momento de crear la sesión. */
  estructura: jsonb('estructura').$type<unknown>().notNull(),
  /**
   * Quién va a la reunión. Nombres, tal como los escribe quien la agenda.
   *
   * No referencia a ninguna tabla de personas porque no la hay, y no la va a
   * haber por esto: a la sesión de una UDN va su director, que no tiene
   * cuenta en la app. El día que entre Outlook, esto es lo que se rellena
   * desde el evento — por eso es una lista y no un texto libre.
   */
  participantes: jsonb('participantes').$type<string[]>().notNull().default([]),
  /** Dónde se da: sala física, link de Teams, "por definir". Texto libre. */
  lugar: text('lugar'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---- Item ----
// Un slide contestado dentro de una sesión. Dos capas separadas a propósito
// (§4): lo que cargó el equipo (nunca se modifica) vs. lo que resolvió el
// motor de maquetación (se puede recalcular sin recapturar).
export const items = pgTable('items', {
  id: text('id').primaryKey(),
  sesionId: text('sesion_id')
    .notNull()
    .references(() => sesiones.id),
  orden: integer('orden').notNull(),
  tipo: text('tipo').notNull(),
  /** Lo que escribió el equipo: cifras, textos, imágenes, nota a la IA. */
  contenidoCrudo: jsonb('contenido_crudo').$type<unknown>().notNull(),
  /** Lo que decidió el motor (etapa 2): layout, huecos, tipo de gráfico. Nulo hasta maquetar. */
  decisionMaquetacion: jsonb('decision_maquetacion').$type<unknown>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---- Acuerdo ----
// Cuelga de la SALA, no de la sesión (decisión estructural del spec §4):
// nace en una sesión pero sobrevive a todas las siguientes.
export const acuerdos = pgTable('acuerdos', {
  id: text('id').primaryKey(),
  salaSlug: text('sala_slug')
    .notNull()
    .references(() => salas.slug),
  que: text('que').notNull(),
  responsable: text('responsable').notNull(),
  squad: text('squad'),
  prioridad: text('prioridad'),
  fechaCompromiso: timestamp('fecha_compromiso', { withTimezone: true }),
  estatus: estatusAcuerdoEnum('estatus').notNull().default('abierto'),
  /** Sesión donde nació el acuerdo. Nulo si se dio de alta fuera de una sesión. */
  sesionOrigenId: text('sesion_origen_id').references(() => sesiones.id),
  /**
   * El elemento de Monday que le corresponde, si está sincronizado.
   *
   * Es lo que convierte la escritura en actualización: sin él, mover un
   * estatus crearía un elemento nuevo cada vez y el tablero se llenaría de
   * duplicados del mismo compromiso.
   */
  mondayId: text('monday_id'),
  /**
   * Historia de cambios (v1 mínima, spec §4 "historia de cambios"): un jsonb
   * con un registro por movimiento de estatus o edición — `{ en, estatusAnterior? ,
   * cambios? }` (ver src/db/acuerdos.ts). No es una tabla aparte a propósito:
   * el volumen por acuerdo es bajo y no se necesita consultar la historia de
   * forma independiente todavía.
   */
  historia: jsonb('historia').$type<unknown[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---- Minuta ----
// Ligada a una sesión. Guarda transcripción original, texto final editado y
// a quién se envió.
export const minutas = pgTable('minutas', {
  id: text('id').primaryKey(),
  sesionId: text('sesion_id')
    .notNull()
    .references(() => sesiones.id),
  transcripcion: text('transcripcion'),
  textoFinal: text('texto_final'),
  /** Lista de destinatarios (nombres o emails); el shell hoy solo muestra el conteo. */
  enviadaA: jsonb('enviada_a').$type<string[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---- Archivos de una sala ----
// Todo lo que el equipo cuelga en una sala y no nació dentro de la app:
// las presentaciones ANTIGUAS (las que se dieron antes de que esto
// existiera) y los archivos de interés — presentaciones comerciales,
// excels, imágenes.
//
// Una sola tabla y no dos porque la diferencia entre "presentación antigua" y
// "archivo de interés" es dónde se muestra, no qué se guarda: mismos campos,
// misma subida, mismo borrado. Dos tablas idénticas divergen a la primera
// columna que se le añade a una.
//
// El binario NO vive aquí: vive en Vercel Blob, y esto guarda su `pathname`.
// El store es privado, así que la URL pública no sirve de nada sin firma —
// que es justo lo que se quiere: un deck comercial no se sirve por enlace
// abierto y adivinable.
// 'imagen' es la que se inserta DENTRO de una presentación. No cuelga de una
// sala sino de la sesión: quien puede ver el documento puede ver su imagen, y
// una reunión sin sala también lleva imágenes.
export const categoriaArchivoEnum = pgEnum('categoria_archivo', ['presentacion', 'interes', 'imagen'])

export const archivos = pgTable('archivos', {
  id: text('id').primaryKey(),
  /** Nulo en una imagen de presentación: esa cuelga de la sesión. */
  salaSlug: text('sala_slug').references(() => salas.slug),
  /**
   * La sesión de la que es, si es una imagen de presentación.
   *
   * Es lo que decide quién puede verla: el permiso de una imagen incrustada
   * en un documento es el del documento, no el de una sala — y hay reuniones
   * que no son de ninguna.
   */
  sesionId: text('sesion_id').references(() => sesiones.id),
  categoria: categoriaArchivoEnum('categoria').notNull(),
  /** Cómo se llama en la lista. Lo escribe quien sube, no el nombre del fichero. */
  titulo: text('titulo').notNull(),
  /**
   * La fecha que le corresponde al CONTENIDO, no la de subida: una
   * presentación de marzo subida hoy se ordena en marzo. Opcional para los
   * archivos de interés, donde muchas veces no significa nada.
   */
  fecha: timestamp('fecha', { withTimezone: true }),
  /** Ruta dentro del store de Blob. Es la llave para servirlo y para borrarlo. */
  ruta: text('ruta').notNull(),
  nombreOriginal: text('nombre_original').notNull(),
  tipoContenido: text('tipo_contenido'),
  tamanoBytes: integer('tamano_bytes'),
  /** Quién lo subió, para poder preguntarle. Informativo. */
  subidoPor: text('subido_por'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---- Benchmark ----
// Estructura preliminar (§5, pendiente de la referencia real de Franco).
// Pertenece a la sala, se nutre en el tiempo, no es contenido de una sesión.
export const benchmarks = pgTable('benchmarks', {
  id: text('id').primaryKey(),
  salaSlug: text('sala_slug')
    .notNull()
    .references(() => salas.slug),
  competidores: jsonb('competidores').$type<unknown>().notNull().default([]),
  dimensiones: jsonb('dimensiones').$type<unknown>().notNull().default([]),
  lectura: text('lectura'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * PLANTILLAS GUARDADAS por el equipo.
 *
 * Franco: "para algunos tipos de reunión podríamos definir templates
 * preparados; por ejemplo la Estatus Mensual con RL debería tener una
 * estructura predefinida". Y: "el módulo minutas debería tener un editor del
 * template del tipo de minuta".
 *
 * Son la misma cosa —una forma acordada de una reunión— y por eso una tabla:
 * `tipo` distingue si lo que se fija es la ESTRUCTURA de la presentación o el
 * MOLDE de la minuta.
 *
 * LAS DEFINE EL EQUIPO, no el sistema. Las cinco plantillas de código son
 * genéricas a propósito; qué lleva exactamente el estatus mensual de Research
 * Land lo sabe quien lo da, y adivinarlo aquí sería inventar un compromiso.
 * Por eso el camino principal es "guarda ESTA estructura como plantilla".
 *
 * `salaSlug` nulo = sirve para cualquier sala.
 */
export const tipoPlantillaEnum = pgEnum('tipo_plantilla', ['sesion', 'minuta'])

export const plantillas = pgTable('plantillas', {
  id: text('id').primaryKey(),
  tipo: tipoPlantillaEnum('tipo').notNull(),
  nombre: text('nombre').notNull(),
  paraQue: text('para_que').notNull().default(''),
  /** De qué sala es. Nulo = de todas. */
  salaSlug: text('sala_slug').references(() => salas.slug),
  /** `DefinicionItem[]` para una de sesión; `MoldeMinuta` para una de minuta. */
  contenido: jsonb('contenido').$type<unknown>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
