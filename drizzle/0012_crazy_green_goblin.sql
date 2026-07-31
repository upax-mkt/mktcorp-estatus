-- TRANSFORMACIÓN DE enlace_agenda: de clave primaria por token a estructura atómica.
--
-- La tabla `enlace_agenda` fue creada por la migración 0011 con estructura antigua:
-- solo `token` (PK) y `creado_en`. Esta tabla está VACÍA (cero filas) y NO ES CONSUMIDA
-- por código desplegado (se creó en esta misma ronda de desarrollo).
--
-- Es SEGURO hacer DROP porque:
-- 1. La tabla está vacía.
-- 2. No hay registros que perder.
-- 3. Es una tabla nueva, sin histórico de datos.
-- 4. La nueva forma (`id` como PK fijo) es incompatible: requiere transformación.
--
-- La nueva estructura usa `id` (clave primaria constante 1) para garantizar una sola
-- fila. Eso imposibilita race conditions en generación: INSERT ... ON CONFLICT (id)
-- es atómica, no hay ventana entre delete e insert.

DROP TABLE "enlace_agenda";

CREATE TABLE "enlace_agenda" (
	"id" integer PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
