-- LIMPIEZA: dos enums huérfanos que dejó la 0028 ("se_retira_sesiones").
--
-- `DROP TABLE "sesiones"` (0028) se llevó la tabla y sus columnas, pero
-- Postgres no borra los TYPE que esa tabla usaba solo por borrarla a ella —
-- drizzle-kit tampoco lo generó ahí (el propio snapshot 0028 ya dejó de
-- listar `estado_sesion`/`tipo_sesion`, así que para `drizzle-kit generate`
-- esto no es una diferencia de esquema: no hay nada que diffear porque
-- `esquema.ts` no los declara desde antes de la 0028). Por eso esta migración
-- está escrita a mano, no generada.
--
-- Comprobado en la base real antes de escribir esto: ninguna columna de
-- ninguna tabla usa `estado_sesion` ni `tipo_sesion` (information_schema.columns
-- vacío para los dos). Son inertes — no ensucian datos, solo el esquema.
--
-- `IF EXISTS` por si alguien ya los quitó a mano.

DROP TYPE IF EXISTS "public"."estado_sesion";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."tipo_sesion";
