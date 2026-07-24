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
export const estadoSesionEnum = pgEnum('estado_sesion', [
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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---- Sesión ----
// Una reunión concreta: sala + fecha + tipo + alcance + copia congelada de
// la estructura (jsonb — la Estructura como tal, versionada, es trabajo de
// una fase posterior; aquí solo se guarda el snapshot que usó esta sesión).
export const sesiones = pgTable('sesiones', {
  id: text('id').primaryKey(),
  salaSlug: text('sala_slug')
    .notNull()
    .references(() => salas.slug),
  fecha: timestamp('fecha', { withTimezone: true }).notNull(),
  tipo: tipoSesionEnum('tipo').notNull(),
  /** 'todos los squads' / squads específicos / tema puntual — texto libre, ver §4/§6. */
  alcance: text('alcance').notNull().default('todos'),
  estado: estadoSesionEnum('estado').notNull().default('borrador'),
  /** Copia congelada de la estructura (agenda de items) al momento de crear la sesión. */
  estructura: jsonb('estructura').$type<unknown>().notNull(),
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
