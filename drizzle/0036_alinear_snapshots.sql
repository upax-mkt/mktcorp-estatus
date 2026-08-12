-- ALINEA LOS SNAPSHOTS DE DRIZZLE CON LA BASE. NO CAMBIA NADA.
--
-- Las migraciones 0031 a 0035 se escribieron A MANO, y una migración escrita a
-- mano NO genera snapshot: el último que había en `drizzle/meta` describía el
-- mundo anterior a `archivos.enlace`. Consecuencia: el siguiente
-- `drizzle-kit generate` que hiciera cualquiera emitiría estas ocho líneas
-- otra vez —añadir columnas y valores de enum que YA existen— y reventaría al
-- aplicarse, dejando el journal a medias y bloqueando todo lo que viniera
-- después.
--
-- Es la misma trampa que ya mordió en la ronda 10 y la regla que salió de
-- ella: tras escribir migraciones a mano, regenerar el snapshot y comprobar
-- EN COPIA AISLADA que un `generate` posterior dice "No schema changes".
--
-- El VALOR de este archivo es el snapshot que drizzle-kit escribió junto a él.
-- El SQL de abajo es el que generó, con `IF NOT EXISTS` añadido a mano para
-- que sea inocuo: la base ya tiene las ocho cosas desde sus migraciones
-- originales, así que esto se aplica sin tocar nada y solo sirve para quedar
-- registrado en `__drizzle_migrations`.
--
-- QUÉ CUBRE Y DE DÓNDE VIENE CADA LÍNEA:
--   0031 · `enlace`, y `ruta`/`nombre_original` anulables (un material es un
--          fichero O un enlace).
--   0032 · `evidencia` + `bloque` + `lectura` (la evidencia del benchmark).
--   0033 · `comercial` (Materiales Comerciales, al separarse de Archivos de
--          Interés).
--   0035 · `plantilla` (la reunión recuerda qué clase de junta es).

ALTER TYPE "public"."categoria_archivo" ADD VALUE IF NOT EXISTS 'evidencia';--> statement-breakpoint
ALTER TYPE "public"."categoria_archivo" ADD VALUE IF NOT EXISTS 'comercial';--> statement-breakpoint
ALTER TABLE "archivos" ALTER COLUMN "ruta" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "archivos" ALTER COLUMN "nombre_original" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "archivos" ADD COLUMN IF NOT EXISTS "enlace" text;--> statement-breakpoint
ALTER TABLE "archivos" ADD COLUMN IF NOT EXISTS "bloque" text;--> statement-breakpoint
ALTER TABLE "archivos" ADD COLUMN IF NOT EXISTS "lectura" text;--> statement-breakpoint
ALTER TABLE "reuniones" ADD COLUMN IF NOT EXISTS "plantilla" text;
