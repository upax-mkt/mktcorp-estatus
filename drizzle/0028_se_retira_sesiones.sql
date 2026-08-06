-- SE RETIRA EL MODELO VIEJO. Este es el único paso irreversible de la ronda 10.
--
-- Antes de correrlo existe una rama de Neon `respaldo-pre-ronda10`, creada el
-- 5-ago desde la base real: una foto permanente de cómo estaba todo. La ventana
-- de restauración por tiempo del plan gratuito es de solo 6 horas, menos de lo
-- que duró esta ronda, así que la rama es la red de seguridad de verdad.
--
-- El orden es obligatorio: primero las columnas que apuntan a `sesiones`, y
-- solo cuando ninguna queda, la tabla. Postgres no deja borrar una tabla con
-- claves ajenas vivas apuntándola, así que si el orden estuviera mal, esto
-- fallaría en vez de dejar la base a medias.

ALTER TABLE "minutas" DROP COLUMN "sesion_id";
--> statement-breakpoint
ALTER TABLE "archivos" DROP COLUMN "sesion_id";
--> statement-breakpoint
ALTER TABLE "items" DROP COLUMN "sesion_id";
--> statement-breakpoint
ALTER TABLE "participacion" DROP COLUMN "sesion_id";
--> statement-breakpoint
ALTER TABLE "acuerdos" DROP COLUMN "sesion_origen_id";
--> statement-breakpoint

-- Y la tabla que nació como "el deck que se está preparando" y acabó cargando
-- con la junta entera. Su contenido vive desde la 0020 repartido entre
-- `reuniones` (la junta: cuándo, con quién, si se dio) y `documentos` (lo que
-- se prepara para ella). Las reuniones heredaron su id, así que los enlaces
-- `/reunion/<id>` y `/deck/<id>` que ya estaban compartidos siguen sirviendo.
DROP TABLE "sesiones";
