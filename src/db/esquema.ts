/**
 * Esquema Drizzle sobre Postgres (Neon). Modela lo descrito en
 * docs/superpowers/specs/2026-07-23-mktcorp-estatus-design.md §4.
 *
 * Nombre y marca de cada sala SÍ se guardan aquí desde la ronda 8 (tarea 5):
 * hasta el 30-jul vivían en código, un archivo por sala bajo `src/temas`, y
 * esta tabla solo llevaba lo mutable (cadencia, freeze, clave). Ahora la
 * marca también es dato editable — ver `src/db/temas.ts` para cómo se lee y
 * `src/temas/semilla.ts` para lo que había en código antes de la mudanza.
 */
import {
  pgTable,
  pgEnum,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  primaryKey,
} from 'drizzle-orm/pg-core'

// ---- Enums ----
// Solo se tipan como enum los campos cuyos valores exactos están fijados en
// el spec (§4). Campos abiertos (alcance, prioridad) quedan como texto libre
// para no inventar un catálogo que el spec no cerró todavía.

export const cadenciaEnum = pgEnum('cadencia', ['semanal', 'quincenal', 'mensual'])
export const tipoReunionEnum = pgEnum('tipo_reunion', ['semanal', 'quincenal', 'mensual'])

/**
 * Dos estados y no cinco. Lo que hoy vive en `estado_sesion` son DOS vidas
 * mezcladas: la de la junta (¿se dio?) y la del documento (¿está listo?).
 * Mezcladas costaron dos defectos —el contador del Home que mentía y
 * marcar-presentada como trámite que nadie hacía—. Ver spec §1.
 */
export const estadoReunionEnum = pgEnum('estado_reunion', ['agendada', 'dada'])
export const estadoDocumentoEnum = pgEnum('estado_documento', ['borrador', 'listo'])

export const estatusAcuerdoEnum = pgEnum('estatus_acuerdo', [
  'abierto',
  'cumplido',
  'vencido',
  'cancelado',
])

// ---- Sala ----
// Las 10 entidades receptoras son fijas: no se crean ni se borran desde la
// app (viven como semillas, ver src/temas/semilla.ts). slug es la misma
// clave que usaba src/temas y que sigue usando para el registro de temas.
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
  /**
   * Una sala en freeze comercial: no hay reuniones ni gestión hasta nuevo
   * aviso. No se borra ni se esconde — su historia sigue entera y se consulta.
   * Lo que se apaga es lo que la app le EXIGE: próxima reunión, seguimiento,
   * vencimientos.
   */
  activa: boolean('activa').notNull().default(true),
  pausadaDesde: timestamp('pausada_desde', { withTimezone: true }),
  /**
   * LA MARCA DE LA SALA (ronda 8, tarea 5): los mismos doce campos que antes
   * vivían en un archivo de `src/temas` por sala (tipo `Tema`, ver
   * `src/temas/tipos.ts`) — nombre, los siete colores, el degradado y las dos
   * familias tipográficas — más el logo, que no formaba parte de `Tema`.
   *
   * NACIERON ANULABLES a propósito (migración 0013): la tabla ya tenía diez
   * filas cuando se añadieron estas columnas, así que exigirlas `NOT NULL`
   * desde el primer momento habría hecho fallar la migración contra esas
   * filas existentes. Se poblaron con `scripts/poblar-marcas.ts` a partir de
   * `src/temas/semilla.ts` y SOLO ENTONCES la migración 0014 las marcó
   * obligatorias — salvo `logoUrl` y `logoRelacionDeTinta`, que sí pueden
   * faltar: no formaban parte de `Tema`, y ninguna sala tiene su logo medido
   * todavía (eso es tarea 6, "La pantalla de salas").
   */
  nombre: text('nombre').notNull(),
  primario: text('primario').notNull(),
  secundario: text('secundario').notNull(),
  acento: text('acento').notNull(),
  /** Fondo claro de los slides de contenido. */
  superficieClara: text('superficie_clara').notNull(),
  /** Fondo oscuro de portadas y divisores. */
  superficieOscura: text('superficie_oscura').notNull(),
  textoSobreClara: text('texto_sobre_clara').notNull(),
  textoSobreOscura: text('texto_sobre_oscura').notNull(),
  /** Paradas del gradiente de portada, en orden. */
  gradiente: jsonb('gradiente').$type<string[]>().notNull(),
  /** Clave de familia tipográfica, resuelta en src/temas/fuentes.ts */
  familiaDisplay: text('familia_display').notNull(),
  familiaTexto: text('familia_texto').notNull(),
  /** Ruta del logotipo (Vercel Blob o /public). Nula hasta que la tarea 6 suba uno. */
  logoUrl: text('logo_url'),
  /** Proporción de tinta del PNG/SVG (tarea 6): con qué se deriva su altura relativa. Nula hasta medirlo. */
  logoRelacionDeTinta: real('logo_relacion_de_tinta'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---- Reunión (ronda 10, tarea 1) ----
// La junta como entidad, separada de lo que se prepara para ella (ver
// `documentos` más abajo). Nació vacía: los datos que entonces vivían en
// `sesiones` se mudaron aquí en una tarea posterior (Tarea 2) y `sesiones`
// se retiró del todo en la Tarea 8. Ver spec §1.
export const reuniones = pgTable('reuniones', {
  id: text('id').primaryKey(),
  /**
   * De qué sala es. NULO para una reunión que no pertenece a ninguna: un
   * comité, un arranque de campaña, una interna de Mkt Corp.
   *
   * Volvió a ser opcional en la Tarea 8b (5-ago), pedido de Franco:
   * "necesito poder utilizar el componente para crear minutas de otras
   * reuniones". Había dejado de serlo en la Tarea 4 (ronda 10) al mudar esta
   * tabla desde `sesiones` —donde SÍ era nula—, perdiendo sin querer una
   * capacidad que ya existía. La referencia a
   * `salas.slug` se queda: una reunión CON sala sigue teniendo que apuntar a
   * una que exista. Una reunión sin sala se viste con la identidad de
   * Marketing Corp (`identidadDe`, src/db/reuniones.ts) y no aparece en
   * ninguna de las diez.
   */
  salaSlug: text('sala_slug').references(() => salas.slug),
  /** Instante, anclado a CDMX al escribir (`instanteEnCDMX`). */
  fecha: timestamp('fecha', { withTimezone: true }).notNull(),
  titulo: text('titulo').notNull(),
  tipo: tipoReunionEnum('tipo').notNull(),
  estado: estadoReunionEnum('estado').notNull().default('agendada'),
  /**
   * Alguien dijo que ESTA reunión no se dio —se canceló, se pospuso—. Es un
   * campo y no un estado porque manda sobre la deducción automática sin
   * borrar el hecho de que estaba agendada.
   */
  noDadaEn: timestamp('no_dada_en', { withTimezone: true }),
  lugar: text('lugar'),
  alcance: text('alcance').notNull().default('todos'),
  participantes: jsonb('participantes').$type<unknown[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---- Documento (ronda 10, tarea 1) ----
// Lo que se prepara PARA una reunión: la cara del deck. Nace vacía, igual
// que `reuniones`. Ver spec §1.
export const documentos = pgTable('documentos', {
  id: text('id').primaryKey(),
  /**
   * UNIQUE, y en la base: es lo único que impide que dos pestañas abiertas
   * creen dos documentos para la misma reunión. Con `neon-http` no hay
   * transacción que lo arregle después.
   */
  reunionId: text('reunion_id').notNull().unique().references(() => reuniones.id),
  estado: estadoDocumentoEnum('estado').notNull().default('borrador'),
  estructura: jsonb('estructura').$type<unknown>(),
  plantilla: text('plantilla'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---- Item ----
// Un slide contestado dentro de un documento. Dos capas separadas a propósito
// (§4): lo que cargó el equipo (nunca se modifica) vs. lo que resolvió el
// motor de maquetación (se puede recalcular sin recapturar).
export const items = pgTable('items', {
  id: text('id').primaryKey(),
  /**
   * De qué documento es (ronda 10, tarea 3): un item es contenido de lo que
   * se preparó, no de la junta — cuelga del documento, no de la reunión.
   * NOT NULL desde la Tarea 8 (`0027_columnas_nuevas_obligatorias.sql`): el
   * modelo viejo (`sesiones.ts`) que permitía un item sin documento —colgado
   * directo de una sesión— ya no existe, así que todo item cuelga de un
   * documento sin excepción.
   */
  documentoId: text('documento_id').notNull().references(() => documentos.id),
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
// Cuelga de la SALA, no de la reunión (decisión estructural del spec §4):
// nace en una reunión pero sobrevive a todas las siguientes.
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
  /**
   * Reunión donde nació el acuerdo (ronda 10, tarea 3). Nulo si se dio de
   * alta fuera de una reunión, o si la reunión que lo originó se borró
   * después: la clave se anula, no cascada (`eliminarReunion`,
   * src/db/reuniones.ts) — un acuerdo SOBREVIVE al borrado de su reunión.
   * NULLABLE PERMANENTE por eso mismo: no pasa a NOT NULL en la Tarea 8
   * (corrección del plan, 5-ago — ver `0027_columnas_nuevas_obligatorias.sql`),
   * a diferencia de `items.documentoId`, que sí se volvió obligatoria.
   */
  reunionOrigenId: text('reunion_origen_id').references(() => reuniones.id),
  /**
   * El elemento de Monday que le corresponde, si está sincronizado.
   *
   * Es lo que convierte la escritura en actualización: sin él, mover un
   * estatus crearía un elemento nuevo cada vez y el tablero se llenaría de
   * duplicados del mismo compromiso.
   */
  mondayId: text('monday_id'),
  /**
   * El id de usuario de Monday del responsable, cuando es alguien de Mkt Corp.
   *
   * Es lo que distingue un acuerdo nuestro de uno de la UDN, y por tanto lo que
   * decide si entra a la bandeja. Se guarda el id y no solo el nombre porque la
   * columna de personas de Monday exige el id, y emparejar por nombre escrito a
   * mano es exactamente el error que tiene el dashboard viejo: seis nombres
   * suyos ya no existen y uno se asigna a la persona equivocada.
   */
  responsableMondayId: text('responsable_monday_id'),
  /** Prioritario: es lo que se ve en el Home. */
  destacado: boolean('destacado').notNull().default(false),
  /** 'elemento' | 'subelemento' — de qué tablero es `mondayId`, y por tanto qué columnas leerle. */
  mondayTipo: text('monday_tipo'),
  mondayUrl: text('monday_url'),
  mondaySincronizadoEn: timestamp('monday_sincronizado_en', { withTimezone: true }),
  /**
   * 'no_aplica' | 'pendiente' | 'subido' | 'descartado'.
   *
   * Nace en 'no_aplica' y pasa a 'pendiente' cuando el acuerdo tiene
   * responsable de Mkt Corp. 'descartado' es definitivo: es lo que impide que
   * la bandeja vuelva a ofrecer algo que alguien ya decidió que no sube.
   */
  bandeja: text('bandeja').notNull().default('no_aplica'),
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
// Ligada a una reunión. Guarda transcripción original, texto final editado y
// a quién se envió.
export const minutas = pgTable('minutas', {
  id: text('id').primaryKey(),
  /**
   * Reunión de la que es (ronda 10, tarea 3) — único id desde la Tarea 5b,
   * que retiró el modelo viejo (`sesiones.ts`) y con él la columna
   * `sesion_id` de la que ésta era copia.
   *
   * NOT NULL + UNIQUE desde la revisión final de la ronda 10 (hallazgo 3).
   * El comentario que estuvo aquí decía que NOT NULL no hacía falta "porque
   * el único camino que la escribe ya la rellena siempre" — el razonamiento
   * estaba AL REVÉS: que hoy solo dos funciones escriban esta columna y que
   * las dos la rellenen siempre no es una propiedad de la TABLA, es una
   * promesa sobre el código de HOY. Una restricción de base existe
   * precisamente como garantía frente al PRÓXIMO escritor, el que todavía no
   * se ha escrito — igual que ya exige `documentos.reunionId`, arriba, con
   * el mismo comentario de fondo ("es lo único que impide que dos pestañas
   * abiertas creen dos documentos para la misma reunión").
   *
   * Sin UNIQUE, un doble clic o un reintento tras un hipo de red dejaba dos
   * minutas para la misma reunión —cada una con sus propios acuerdos
   * confirmados, ya publicados en la sala— y `obtenerMinuta` (`src/db/minutas.ts`)
   * devolvía `[0]` de un select sin orden: cuál de las dos "era" la minuta
   * pasaba a ser una lotería. `guardarMinuta` ahora escribe con
   * `INSERT ... ON CONFLICT (reunion_id) DO UPDATE` —mismo patrón que
   * `src/db/participacion.ts` y `src/db/enlace-agenda.ts`— precisamente
   * porque esta columna ya no admite dos filas por reunión: la unicidad la
   * impone la BASE, no la disciplina de quien llama.
   *
   * Sigue pudiendo ser de una junta sin sala (Tarea 8c: comité, interna de
   * Mkt Corp) — NOT NULL no es "toda minuta tiene sala", es "toda minuta
   * tiene reunión", que ya era cierto siempre.
   */
  reunionId: text('reunion_id').notNull().unique().references(() => reuniones.id),
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
// sala sino de la reunión: quien puede ver el documento puede ver su imagen, y
// una reunión sin sala también lleva imágenes.
// 'video' (ronda 9, tarea 7) es lo mismo que 'imagen' pero para el vídeo de
// una sección: tampoco cuelga de una sala, cuelga de la reunión.
export const categoriaArchivoEnum = pgEnum('categoria_archivo', ['presentacion', 'interes', 'imagen', 'video'])

export const archivos = pgTable('archivos', {
  id: text('id').primaryKey(),
  /** Nulo en una imagen de presentación: esa cuelga de la reunión. */
  salaSlug: text('sala_slug').references(() => salas.slug),
  /**
   * La reunión de la que es, si es una imagen de presentación.
   *
   * Es lo que decide quién puede verla: el permiso de una imagen incrustada
   * en un documento es el del documento, no el de una sala — y hay reuniones
   * que no son de ninguna. NULLABLE PERMANENTE: no pasa a NOT NULL en la
   * Tarea 8 (corrección del plan, 5-ago — ver
   * `0027_columnas_nuevas_obligatorias.sql`) porque un archivo de categoría
   * `interes` no pertenece a ninguna junta, es material de la sala — por eso
   * `RegistroDeArchivo.reunionId` (src/db/archivos.ts) es opcional.
   */
  reunionId: text('reunion_id').references(() => reuniones.id),
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
// Pertenece a la sala, se nutre en el tiempo, no es contenido de una reunión.
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

// ---- Directorio de personas de Monday ----
// Copia local del directorio de la cuenta. Existe para que un selector pueda
// abrirse sin esperar a la red: si Monday tarda, el formulario se queda
// esperando y no se puede escribir un acuerdo. Se refresca por detrás.
export const personasMonday = pgTable('personas_monday', {
  mondayId: text('monday_id').primaryKey(),
  nombre: text('nombre').notNull(),
  correo: text('correo').notNull(),
  cargadoEn: timestamp('cargado_en', { withTimezone: true }).notNull().defaultNow(),
})

// ---- Personas de la app ----
// QUIÉN puede entrar y con qué permiso. La clave es el CORREO porque es lo
// único estable que devuelve Slack: los nombres cambian y sus identificadores
// son opacos.
//
// No confundir con `personas_monday`, que es el directorio de la CUENTA DE
// MONDAY y sirve para asignar responsables de acuerdos. Una persona puede estar
// en las dos, en una o en ninguna.
export const personas = pgTable('personas', {
  correo: text('correo').primaryKey(),
  nombre: text('nombre').notNull(),
  rol: text('rol').notNull(),
  activa: boolean('activa').notNull().default(true),
  creadaEn: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
  ultimoAcceso: timestamp('ultimo_acceso', { withTimezone: true }),
})

// ---- Participación (ronda 9, tarea 4) ----
// Quién preparó cada reunión y quién la presentó. Ver src/db/participacion.ts
// para las tres funciones que la escriben y la leen, y por qué la escritura
// es SIEMPRE una sola sentencia con ON CONFLICT: sin ella, sumar una edición
// exigiría leer la fila, sumar en memoria y volver a escribir — el patrón
// leer-y-escribir que ya causó un fallo distinto en cada una de las tres
// rondas anteriores (misma lección que `enlaceAgenda`, más abajo, y que
// `generarEnlaceDeAgenda` en src/db/enlace-agenda.ts).
//
// Clave compuesta (reunión, correo): UNA fila por persona y reunión, no una
// fila por toque — lo que se cuenta es CUÁNTAS veces tocó esta reunión esa
// persona, no cada toque por separado.
//
// LA CLAVE SE MUDÓ EN LA TAREA 8 (`0026_participacion_por_reunion.sql`): era
// `(sesionId, correo)`, con `sesionId` apuntando a `sesiones`. Una reunión
// creada DESPUÉS de la ronda 10 no tenía fila en `sesiones`, así que insertar
// su participación violaba la clave ajena — y como `registrarEdicion` traga
// sus propios errores a propósito (`participacion.ts`, para no tumbar una
// página por un fallo de telemetría), fallaba EN SILENCIO: la participación
// llevaba fallando para toda reunión nueva sin que nadie se enterara. Ahora
// `reunionId` ES la clave, NOT NULL, y `sesiones`/`sesionId` ya no existen.
export const participacion = pgTable('participacion', {
  reunionId: text('reunion_id').notNull().references(() => reuniones.id),
  correo: text('correo').notNull(),
  primeraEdicion: timestamp('primera_edicion', { withTimezone: true }).notNull().defaultNow(),
  ultimaEdicion: timestamp('ultima_edicion', { withTimezone: true }).notNull().defaultNow(),
  ediciones: integer('ediciones').notNull().default(0),
  /** true en cuanto abrió el modo presentación de esta reunión — ver `registrarPresentacion`. */
  presento: boolean('presento').notNull().default(false),
}, (t) => [primaryKey({ columns: [t.reunionId, t.correo] })])

// ---- Enlace público de la agenda ----
// UNA sola fila (id = 1). El token no lleva nada dentro —a diferencia del
// enlace de sala, que codifica qué sala y hasta cuándo y por eso va firmado—
// así que no hace falta criptografía: es una contraseña larga que se compara
// contra esta tabla.
//
// La clave primaria es `id` (constante 1) para garantizar una sola fila.
// Generar usa INSERT ... ON CONFLICT (id) DO UPDATE, una sentencia atómica
// que imposibilita race conditions: nunca hay dos filas, nunca hay estado
// indeterminado. Revocar borra por id. Sin transacciones porque neon-http
// no las soporta, pero una sola sentencia es atómica en Postgres.
export const enlaceAgenda = pgTable('enlace_agenda', {
  id: integer('id').primaryKey(),
  token: text('token').notNull(),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
})
