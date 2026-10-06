# Reorganización del Meeting Hub — diseño (6-oct-2026)

Aprobado por Franco en el chat el 6-oct-2026, después de ver el recorrido completo (equipo y director de sala).
Su encargo: «después de esta corrida de presentaciones web (Político, estatus de Mkt con Ceci y ahora la de RL) se ve
todo despedorrado, reorganicemos».

## Lo que se encontró

1. La barra mezclaba tres cosas: el trabajo de todos los días (Reuniones, Presentaciones, Acuerdos), piezas de una
   sola vez (Concurso, Político, Estatus Q3) y configuración (Clientes, Personas). Cada presentación nueva sumaba una
   pestaña; la de RL ni siquiera tenía.
2. «Presentaciones» (`/deck`) no tenía las presentaciones web: las tres hechas a mano vivían sueltas, cada una en su
   ruta raíz.
3. Lo terminado seguía al frente (el Concurso ya solo enseña el podio).

## Decisiones de Franco

- **Cada presentación vive con su cliente.** Los estatus de grupo (Q3 y Político) en una pestaña propia, **Estatus**;
  la de Research Land dentro de la sala de RL, **con clave sencilla**.
- **Nada se archiva ni se borra:** solo se ordena la barra.
- La pestaña se llama **Estatus**. No se revive Grupo UPAX como sala.

## Diseño

**Barra (equipo):** Reuniones · Presentaciones · Acuerdos · **Estatus** · Clientes ▾ (admin) · **Más ▾** (Concurso;
Personas si admin) · fecha · Salir. Político y Estatus Q3 dejan de ser pestañas. «Más» usa el mismo
`details`/`summary` de servidor que Clientes.

**Registro único de presentaciones web** (`src/presentaciones/registro.ts`, solo datos): id, título, bajada, fecha,
lugar (`estatus` o una sala), clave (nombre de la variable de entorno) y ruta vieja. Lo leen la página Estatus, la
sala, `/deck` y los tests. Una presentación nueva se da de alta con una entrada, no con una pestaña.

**Rutas**

| Antes | Ahora |
|---|---|
| `/estatus` (era el Q3) | `/estatus` = índice de estatus de grupo; `/estatus?anexo=1` redirige al anexo del Q3 |
| — | `/estatus/q3-2026` (Estatus Q3, 2-oct-2026) |
| `/politico` | redirige a `/estatus/politico-electoral` |
| `/rl-comercial` | redirige a `/cliente/research-land/presentaciones/nueva-estructura-comercial-2027` |

**Sala:** sección nueva **Presentaciones** (`s-presentaciones`, después de Reuniones en el índice), solo si la sala
tiene alguna. Cada una con fecha y, si lleva clave, el aviso de que la pide.

**Clave de la presentación de RL** (trae la evaluación de las tres candidatas a PM, que trabajan en RL):
- El equipo entra directo.
- El director de esa sala (rol `sala` de RL) ve un formulario de clave. Con la clave correcta recibe un pase firmado
  (HMAC con `SESSION_SECRET`, cookie httpOnly limitada a la ruta de esa presentación, 30 días). El pase lleva
  `tipo: 'pase'`: no sirve como sesión, y una sesión no sirve como pase.
- La clave vive en Vercel (`CLAVE_PRESENTACION_RL`), nunca en el repo. Sin la variable, nadie entra por clave
  (cerrado por defecto).
- **La sala es pública** (decisión de Franco: los directores entran sin login), así que esta ruta también responde sin
  sesión. La clave es la única puerta para todo el que no es del equipo: el director de RL, el de otra sala o
  cualquiera con la liga. La lista de la sala muestra el título y avisa que se abre con clave; el contenido, no.
- Una presentación de sala sin clave declarada no se abre fuera del equipo (cerrado por defecto). Cada intento fallido
  espera casi un segundo, para frenar el tanteo de una clave sencilla.

**Texto de la de RL** igual que la PPT que se le entregó a Pablo: portada «Nueva estructura comercial 2027», órbita
«Estructura», cierre «Tres decisiones».

**`/deck` (Presentaciones):** una línea con las presentaciones web y dónde vive cada una.

## Fuera de alcance

Home, Reuniones, Acuerdos y el Concurso por dentro no cambian. Los componentes de cada presentación se quedan en su
carpeta. No hay migraciones de base (producción y local comparten Neon).

## Validación

Tests de registro, pase, clave y política; suite completa, lint y build. Recorrido con capturas como equipo y como
director de RL (con y sin clave) y como director de otra sala, más las ligas viejas. Franco da el visto bueno con
las capturas antes de producción.
