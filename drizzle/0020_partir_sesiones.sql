-- Cada sesión se parte en dos: la junta y lo que se preparó para ella.
-- El id de la reunión ES el id de la sesión, a propósito: los `sesion_id`
-- que ya existen en minutas/acuerdos/archivos/participacion siguen siendo
-- válidos como `reunion_id` sin tabla de correspondencia, y las URLs vivas
-- (/reunion/<id>, /deck/<id>) no se rompen.

INSERT INTO reuniones (id, sala_slug, fecha, titulo, tipo, estado, no_dada_en, lugar, alcance, participantes, created_at, updated_at)
SELECT
  s.id,
  s.sala_slug,
  s.fecha,
  -- La app deriva hoy el título de la sesión; se conserva el mismo criterio.
  -- TO_CHAR(..., 'FMMonth') sale en inglés en Neon (lc_time de la sesión es
  -- C/en_US, no el español que asumía este criterio) — mapeo explícito de
  -- los doce nombres en vez de SET lc_time/lc_messages, que no es fiable:
  -- el locale español puede no estar instalado donde corra esta migración.
  COALESCE(NULLIF(TRIM(s.plantilla), ''), INITCAP(s.tipo::text)) || ' · ' ||
    TO_CHAR(s.fecha AT TIME ZONE 'America/Mexico_City', 'FMDD') || ' de ' ||
    (ARRAY['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'])[EXTRACT(MONTH FROM s.fecha AT TIME ZONE 'America/Mexico_City')::int],
  s.tipo::text::tipo_reunion,
  CASE WHEN s.estado IN ('presentada', 'minutada') THEN 'dada' ELSE 'agendada' END::estado_reunion,
  s.no_dada_en,
  s.lugar,
  s.alcance,
  s.participantes,
  s.created_at,
  s.updated_at
FROM sesiones s;
--> statement-breakpoint
-- El documento solo nace si la sesión llegó a tener vida de documento.
-- 'agendada' es una fecha en el calendario y nada más: no genera documento.
INSERT INTO documentos (id, reunion_id, estado, estructura, plantilla, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
  s.id,
  CASE WHEN s.estado = 'borrador' THEN 'borrador' ELSE 'listo' END::estado_documento,
  s.estructura,
  s.plantilla,
  s.created_at,
  s.updated_at
FROM sesiones s
WHERE s.estado <> 'agendada';
