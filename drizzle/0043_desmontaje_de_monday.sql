-- DESMONTAJE DE LA INTEGRACIÓN CON MONDAY (20-ago-2026).
--
-- Franco: "lo de Monday lo mataremos, no va la conexión". La app nunca llegó a
-- tener MONDAY_TOKEN en producción, así que estas seis columnas y la tabla del
-- directorio estuvieron siempre vacías. Comprobado contra la base ANTES de
-- generar esta migración: de los 37 acuerdos, CERO tenían monday_id,
-- responsable_monday_id, monday_tipo, monday_url o monday_sincronizado_en, los
-- 37 estaban en bandeja = 'no_aplica', y personas_monday tenía 0 filas.
--
-- ⚠️ NO SE APLICA HASTA QUE EL CÓDIGO NUEVO ESTÉ DESPLEGADO. El que corre hoy
-- en producción todavía hace SELECT de estas columnas: borrarlas antes deja la
-- sala y /acuerdos con un 500. La 0042, en cambio, se puede aplicar cuando sea.
--
-- Qué se perdería si esto se aplicara con datos dentro: el enlace de cada
-- acuerdo con su elemento del tablero. No es el caso aquí — pero quien
-- reinstaure una integración con un tablero externo debería crear columnas
-- nuevas con su propio nombre, no revivir estas.
--
-- El responsable de un acuerdo pasa a ser SOLO `acuerdos.responsable` (texto).
-- Ver src/db/personas.ts y src/lib/personas.ts.

DROP TABLE "personas_monday" CASCADE;--> statement-breakpoint
ALTER TABLE "acuerdos" DROP COLUMN "monday_id";--> statement-breakpoint
ALTER TABLE "acuerdos" DROP COLUMN "responsable_monday_id";--> statement-breakpoint
ALTER TABLE "acuerdos" DROP COLUMN "monday_tipo";--> statement-breakpoint
ALTER TABLE "acuerdos" DROP COLUMN "monday_url";--> statement-breakpoint
ALTER TABLE "acuerdos" DROP COLUMN "monday_sincronizado_en";--> statement-breakpoint
ALTER TABLE "acuerdos" DROP COLUMN "bandeja";