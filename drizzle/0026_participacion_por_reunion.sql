-- La participación pasa a colgar de la reunión, no de la sesión.
--
-- Escrita a mano: drizzle-kit genera DDL, pero rehacer una clave primaria
-- compuesta en el orden correcto es un movimiento, no una declaración.
--
-- POR QUÉ NO PODÍA ESPERAR. La PK era `(sesion_id, correo)` y `sesion_id`
-- apuntaba a `sesiones`. Una reunión creada DESPUÉS de la ronda 10 no tiene
-- fila en `sesiones`, así que insertar su participación violaba la clave
-- ajena — y como `registrarEdicion` traga sus propios errores a propósito
-- (`participacion.ts`, para no tumbar una página por un fallo de telemetría),
-- fallaba EN SILENCIO: el registro de quién preparó y quién presentó dejaba
-- de guardarse sin que nadie se enterara.
--
-- El orden importa: soltar la PK vieja antes de tocar `reunion_id`, y no
-- borrar `sesion_id` aquí — de eso se encarga la 0028, después de que la
-- 0027 haya comprobado que todo lo nuevo está poblado.

-- 1. Toda fila existente ya tiene su `reunion_id` (lo pobló la 0022, y la
--    reunión heredó el id de su sesión). Esto es un cinturón por si alguna
--    se coló entre medias.
UPDATE participacion SET reunion_id = sesion_id WHERE reunion_id IS NULL AND sesion_id IS NOT NULL;
--> statement-breakpoint

-- 2. Fuera la clave primaria vieja.
ALTER TABLE "participacion" DROP CONSTRAINT "participacion_sesion_id_correo_pk";
--> statement-breakpoint

-- 3. `reunion_id` se vuelve obligatoria ANTES de ser clave: una PK no admite
--    nulos, y así el fallo sale aquí y no a medias de crear el índice.
ALTER TABLE "participacion" ALTER COLUMN "reunion_id" SET NOT NULL;
--> statement-breakpoint

-- 4. Y la clave nueva.
ALTER TABLE "participacion" ADD CONSTRAINT "participacion_reunion_id_correo_pk" PRIMARY KEY ("reunion_id","correo");
