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
  -- CORREGIDO EL 4-AGO CONTRA LA BASE REAL. El título NO se deriva: ya existe,
  -- escrito a mano por el equipo, dentro de `estructura->>'titulo'` — "Estatus
  -- Comercial Quincenal" es la RL del 3-ago. La versión anterior lo ignoraba y
  -- construía uno desde `s.plantilla`, que vale 'estatus-udn' en las 10 filas:
  -- producía "estatus-udn · 3 de Agosto" y borraba el nombre real de la junta.
  --
  -- El fallback replica `tituloPorDefecto` (src/db/sesiones.ts:186) al pie de
  -- la letra: "Estatus {tipo} · {Mes} de {año}". Los meses van en un array y no
  -- en TO_CHAR porque `FMMonth` depende del `lc_time` del servidor y saldría en
  -- inglés; van capitalizados porque así los capitaliza la app.
  COALESCE(
    NULLIF(TRIM(s.estructura->>'titulo'), ''),
    'Estatus ' || s.tipo::text || ' · ' ||
      (ARRAY['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto',
             'Septiembre','Octubre','Noviembre','Diciembre'])[
        EXTRACT(MONTH FROM s.fecha AT TIME ZONE 'America/Mexico_City')]
      || ' de ' || EXTRACT(YEAR FROM s.fecha AT TIME ZONE 'America/Mexico_City')::text
  ),
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
-- El documento nace si la sesión llegó a tener vida de documento: estructura
-- o items. NO se filtra por `estado <> 'agendada'`.
--
-- CORREGIDO EL 4-AGO CONTRA LA BASE REAL. El plan asumía que 'agendada' era
-- "una fecha en el calendario y nada más". Es falso: `/agenda` agenda con
-- `crearSesionConEstructura`, así que las 7 sesiones 'agendada' de hoy tienen
-- su plantilla de 8 secciones y 56 items entre todas. Filtrarlas dejaba esos
-- 56 items sin documento, y el `SET NOT NULL` de la Tarea 8 habría fallado.
INSERT INTO documentos (id, reunion_id, estado, estructura, plantilla, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
  s.id,
  -- 'lista', 'presentada' y 'minutada' son un documento terminado. 'agendada'
  -- y 'borrador' son trabajo en curso, por muy poblada que esté la plantilla.
  --
  -- `presentada` estaba OLVIDADA en la primera corrección (la cazó la revisión
  -- de la T2 comparando contra la tabla de este spec). Hoy no hay ninguna
  -- sesión en ese estado, así que no cambia ni una fila — pero Franco puede
  -- marcar una presentada entre hoy y la Tarea 8, y entonces su documento
  -- habría nacido en 'borrador' teniendo la junta ya dada.
  CASE WHEN s.estado IN ('lista', 'presentada', 'minutada') THEN 'listo' ELSE 'borrador' END::estado_documento,
  s.estructura,
  s.plantilla,
  s.created_at,
  s.updated_at
FROM sesiones s
WHERE s.estructura IS NOT NULL
   OR EXISTS (SELECT 1 FROM items i WHERE i.sesion_id = s.id);
