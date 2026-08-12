-- ALINEA EL SNAPSHOT CON LA 0037. NO CAMBIA NADA.
--
-- La 0037 (`grupo` y `orden` en `archivos`) se escribió a mano, y una
-- migración escrita a mano no genera snapshot: el siguiente
-- `drizzle-kit generate` volvía a emitir estas dos columnas —que ya existen—
-- y habría reventado al aplicarse, dejando el journal a medias.
--
-- Es la MISMA trampa que ya se cerró en la 0036 hace unas horas, y la razón
-- de que la regla esté escrita: tras cada migración a mano, regenerar el
-- snapshot y comprobar EN COPIA AISLADA que un `generate` posterior dice
-- "No schema changes". Escribirla no basta; hay que ejecutarla cada vez.
--
-- El valor de este archivo es el snapshot que drizzle-kit dejó junto a él. El
-- SQL lleva `IF NOT EXISTS` a mano para ser inocuo.

ALTER TABLE "archivos" ADD COLUMN IF NOT EXISTS "grupo" text;--> statement-breakpoint
ALTER TABLE "archivos" ADD COLUMN IF NOT EXISTS "orden" integer;
