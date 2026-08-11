-- LA EVIDENCIA DEL BENCHMARK, cargable desde la app y agrupada por disciplina.
--
-- Franco: *"la evidencia mejor la cargaré manualmente según la categoría,
-- subiré imágenes o videos o url; crea el módulo y reemplaza lo que cargaste
-- como imagen, no quites el texto ya que es su bajada explicativa"*.
--
-- Hasta ahora la evidencia vivía escrita en `src/datos/benchmark.ts` con la
-- URL de un archivo subido a mano por un script. Eso obliga a un despliegue
-- para cambiar una imagen, que es exactamente lo que no debe pasar con
-- material que se actualiza cuando llega un análisis nuevo.
--
-- SE REUSA `archivos` EN VEZ DE UNA TABLA NUEVA, y no es por pereza: esa
-- tabla ya resuelve las cuatro cosas difíciles —subida directa del navegador
-- a Blob privado, alternativa de enlace (`enlace`, migración 0031), servido
-- con comprobación de permiso contra la sala en `/api/archivo/[id]`, y
-- borrado del binario al borrar la fila—. Una tabla paralela tendría que
-- reimplementar las cuatro, y la primera que se quedara atrás sería la del
-- permiso.
--
-- Lo único que le falta a `archivos` para servir como evidencia son dos
-- columnas: de qué DISCIPLINA es (web, paid, RRSS, PR, comercial…) y su
-- BAJADA, que es lo que dice qué hay que mirar en esa imagen. Sin la bajada
-- una captura es decoración.

ALTER TYPE "categoria_archivo" ADD VALUE IF NOT EXISTS 'evidencia';
--> statement-breakpoint
ALTER TABLE "archivos" ADD COLUMN IF NOT EXISTS "bloque" text;
--> statement-breakpoint
ALTER TABLE "archivos" ADD COLUMN IF NOT EXISTS "lectura" text;
