-- MUEVE LOS MATERIALES COMERCIALES A SU CATEGORÍA (continúa la 0033).
--
-- Todo lo que hoy está en `interes` ES material comercial: esa categoría se
-- llama así por el nombre VIEJO del módulo, no por lo que guarda. Al mover
-- estas filas, `interes` queda libre para el módulo "Archivos de Interés" que
-- pidió Franco, y cada valor del enum vuelve a querer decir lo que dice.
--
-- Va en archivo aparte de la 0033 porque Postgres no deja usar un valor de
-- enum en la misma transacción en la que se añadió.
--
-- `sala_slug IS NOT NULL` no hace falta —solo el material de sala usa esta
-- categoría— pero se deja escrito: una imagen o un vídeo incrustado en un
-- documento cuelga de la reunión, no de la sala, y nunca debe entrar aquí.

UPDATE "archivos" SET "categoria" = 'comercial'
WHERE "categoria" = 'interes' AND "sala_slug" IS NOT NULL;
