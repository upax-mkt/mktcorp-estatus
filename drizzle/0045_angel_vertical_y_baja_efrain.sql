-- Dos correcciones de directorio confirmadas por Franco el 28-ago-2026,
-- cruzadas contra EQUIPO MKT CORP del Org Truth Sheet.
--
-- 1) ÁNGEL TOLEDANO PASA A SU VERTICAL. Estaba en 'Sin squad' porque el Org
--    Truth lo registra así, pero esa etiqueta describe una carencia donde hay
--    un encargo: es el Head BD Político, a cargo de la vertical
--    político-electoral. Que el squad sea de una persona no lo vuelve menos
--    real. Franco: "angel es politico-electoral, podria tomarse como squad
--    pero es el solo".
UPDATE "personas" SET "squad" = 'Político-Electoral'
WHERE "correo" = 'angel.toledano@elektra.com.mx';--> statement-breakpoint

-- 2) EFRAÍN MACIEL SE DESACTIVA. El Org Truth ya lo daba de baja el 21-ago
--    ("Baja 2026-08-21: Alejandro (Efrain) Maciel") y seguía activo en la app,
--    así que aparecía en el directorio y podía participar en el concurso.
--    Franco: "efrain ya no esta".
--
--    Se DESACTIVA, no se borra: sus acuerdos, minutas y participaciones
--    históricas siguen apuntando a este correo, y borrar la fila los dejaría
--    huérfanos. `activa = false` es exactamente el mecanismo que la app tiene
--    para esto.
UPDATE "personas" SET "activa" = false
WHERE "correo" = 'efrain.maciel@elektra.com.mx';
