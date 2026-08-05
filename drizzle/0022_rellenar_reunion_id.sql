-- Se COPIA, no se mueve: las columnas viejas se quedan hasta la última
-- migración para poder comparar las dos versiones antes de tirar nada.
--
-- Cada UPDATE/INSERT es su propio bloque, separado por el marcador de corte
-- de sentencias que ya usan 0020 y las migraciones generadas (0019, 0021) en
-- este repo — un statement, un marcador. No es cosmético: el runtime de la
-- app no soporta transacciones ni SQL compuesto por varias sentencias en una
-- sola llamada, y el propio marcador NO puede escribirse aquí arriba tal
-- cual (ni citado): el migrador parte el archivo por esa cadena literal sin
-- entender comentarios, así que repetirla en prosa crea un corte donde no
-- toca.
UPDATE minutas SET reunion_id = sesion_id WHERE sesion_id IS NOT NULL;
--> statement-breakpoint

UPDATE acuerdos SET reunion_origen_id = sesion_origen_id WHERE sesion_origen_id IS NOT NULL;
--> statement-breakpoint

UPDATE archivos SET reunion_id = sesion_id WHERE sesion_id IS NOT NULL;
--> statement-breakpoint

UPDATE participacion SET reunion_id = sesion_id WHERE sesion_id IS NOT NULL;
--> statement-breakpoint

-- Los items cuelgan del DOCUMENTO, no de la reunión: una sección es
-- contenido de lo que se preparó, no de la junta.
UPDATE items i SET documento_id = d.id
FROM documentos d
WHERE d.reunion_id = i.sesion_id;
--> statement-breakpoint

-- Un archivo de presentación huérfano (sala + fecha, sin sesión) ES una
-- reunión que se dio: la que se presentó ese día. Hoy hay 2.
INSERT INTO reuniones (id, sala_slug, fecha, titulo, tipo, estado, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
  a.sala_slug,
  a.fecha,
  a.titulo,
  COALESCE((SELECT s.cadencia::text FROM salas s WHERE s.slug = a.sala_slug), 'mensual')::tipo_reunion,
  'dada'::estado_reunion,
  a.created_at,
  a.updated_at
FROM archivos a
WHERE a.categoria = 'presentacion' AND a.sesion_id IS NULL AND a.sala_slug IS NOT NULL AND a.fecha IS NOT NULL;
--> statement-breakpoint

-- ...y el archivo pasa a colgar de la reunión que acaba de nacer para él.
UPDATE archivos a SET reunion_id = r.id
FROM reuniones r
WHERE a.categoria = 'presentacion' AND a.reunion_id IS NULL
  AND r.sala_slug = a.sala_slug AND r.fecha = a.fecha AND r.titulo = a.titulo;
