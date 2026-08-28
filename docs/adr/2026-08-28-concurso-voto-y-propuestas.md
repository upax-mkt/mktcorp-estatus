# ADR: integridad de propuestas y voto anónimo del concurso

## Estado

Aceptado, 28-ago-2026.

## Decisión

El concurso vive en el monolito Next.js existente. Postgres conserva propuestas, integrantes, archivos, voto seudónimo y evaluaciones. Vercel Blob conserva las imágenes privadas.

La pertenencia a una propuesta se normaliza en una tabla con clave única `(concurso_id, correo)`. Alta y miembros se crean en una sola sentencia SQL mediante CTE para que una carrera no deje a una persona en dos propuestas.

El voto almacena `HMAC-SHA256(SESSION_SECRET, concurso_id + correo_normalizado)` como identidad opaca y una clave única por concurso. Cambiar el pase actualiza esa misma fila. Antes de escribir, el servidor compara el correo real de sesión contra los miembros de la propuesta para impedir el voto propio; el correo nunca llega a la tabla de votos.

Los archivos se suben directo desde el navegador a Blob mediante token de servidor porque 25 MB excede el límite razonable de una Server Action. Blob valida MIME/tamaño; el servidor registra solo JPG/PNG y vuelve a validar metadatos. Las rutas son privadas y se sirven tras comprobar fase y acceso.

## Consecuencias

- No se añade otro servicio ni un sistema paralelo de autenticación.
- Un cambio de `SESSION_SECRET` rompe la continuidad para reconocer el voto previo; por eso es parte de la configuración estable de producción.
- Una subida puede quedar huérfana si el navegador muere antes de registrarla. No produce filas rotas; se documenta limpieza posterior por prefijo.
- Los jueces no necesitan entrar a la app: un admin registra sus nombres y calificaciones verificadas.

## Alternativas descartadas

- Guardar correo en votos: simplifica soporte, pero contradice el anonimato solicitado.
- `localStorage` para un voto: no impide votar desde otro navegador.
- Contadores públicos durante la votación: introducen efecto arrastre.
- Galería pública en internet: la convocatoria es interna y los materiales deben heredar el acceso de equipo.
