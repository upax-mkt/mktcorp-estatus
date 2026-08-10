-- MATERIALES COMERCIALES: un material de sala ya no es siempre un fichero.
--
-- Franco: "aquí no solo la UDN tienen PPT, o PDF, también puede ser un video
-- de YouTube o link de interés". Un enlace no tiene binario en Blob, así que
-- `ruta` y `nombre_original` —hoy NOT NULL porque toda fila nacía de una
-- subida— dejan de ser obligatorias, y aparece `enlace`.
--
-- La regla que sustituye a esos NOT NULL vive en el código
-- (`registrarArchivo`, src/db/archivos.ts) y es: una fila tiene O `ruta` (es
-- un fichero) O `enlace` (es un enlace), nunca ninguna de las dos. No se
-- expresa como CHECK a propósito: `neon-http` no da transacciones y un CHECK
-- añadido sobre una tabla con filas vivas es una migración que puede fallar a
-- medias; la comprobación en el punto de escritura es la que de verdad se
-- ejecuta en los dos caminos que crean archivos.
--
-- NO DESTRUCTIVA: solo añade una columna y relaja dos restricciones. Las 2
-- filas que hay hoy (comprobado antes de escribir esto) siguen válidas: todas
-- tienen `ruta` y `nombre_original`.

ALTER TABLE "archivos" ADD COLUMN IF NOT EXISTS "enlace" text;
--> statement-breakpoint
ALTER TABLE "archivos" ALTER COLUMN "ruta" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "archivos" ALTER COLUMN "nombre_original" DROP NOT NULL;
