-- NOTAS DE PRENSA: su propia categoría de archivo y el medio que la publicó.
--
-- Franco (13-ago): *"debemos agregar antes de archivos de interés, abajo de
-- archivos comerciales, algo que se llame Notas de Prensa Destacadas o algo
-- así; la mayoría son link pero se deben ver distintas a como se ve el otro
-- módulo de materiales"*.
--
-- Módulo aparte y no un `grupo` dentro de Materiales Comerciales porque no se
-- consulta igual: de una nota importan el medio y la fecha, no su formato.
--
-- El comentario va ENCIMA y el SQL se deja tal como lo generó
-- `drizzle-kit generate` — la regla que cierra la trampa de las rondas 10, 11
-- y 12: una migración escrita a mano no entra en `_journal.json` y `db:migrate`
-- dice "applied successfully" sin haber creado nada.
ALTER TYPE "public"."categoria_archivo" ADD VALUE 'prensa';--> statement-breakpoint
ALTER TABLE "archivos" ADD COLUMN "medio" text;