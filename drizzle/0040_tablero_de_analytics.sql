-- EL TABLERO DE DATA & ANALYTICS DE CADA UDN, para incrustar en su sala.
--
-- Franco: *"en cada sala hay que agregar un módulo más, debe estar arriba de
-- los acuerdos: es un iframe de un módulo que contiene data y analytics de la
-- UDN"*. Las instrucciones las pasó Diego Luna (RevOps) en #squad-revops el
-- 12-ago: lo sirve ORBIT en `orbit-hub-fgap.vercel.app/embed/<slug>`, sin
-- login, y esa ruta SOLO se deja incrustar desde `mktcorp-estatus.vercel.app`
-- (cabecera `Content-Security-Policy: frame-ancestors`, del lado de ORBIT).
--
-- SE GUARDA LA URL COMPLETA, no un interruptor "tiene analytics", aunque hoy
-- todas sigan el mismo patrón por slug y solo House of Films esté servida. El
-- día que una UDN cuelgue de otra ruta, de otro tablero o de otra herramienta,
-- un booleano obligaría a tocar el código; una URL no. Y el patrón por slug no
-- es una promesa de ORBIT: es cómo están montadas las dos primeras.
--
-- NULA = esta sala no tiene tablero, y entonces el módulo NO EXISTE. No hay un
-- estado "tiene módulo pero vacío": eso es justo lo que Franco pidió quitar de
-- la vista del director en esta misma ronda.

ALTER TABLE "salas" ADD COLUMN "analytics_url" text;
