# Ronda 9 — Personas, participación y lo que faltaba del editor

31-jul-2026. Cierra los cinco pedidos que Franco dejó en cola el 29-jul y que
siguen abiertos, más el bug que reportó.

Decisiones suyas del 31-jul, ya tomadas y no se reabren:

- **La identidad viene de Slack.** Cada persona entra con su cuenta; el rol se le
  asigna a esa persona. La clave compartida del equipo se retira; la clave de
  cada sala se queda, porque los directores de UDN no están en su Slack.
- **Tres roles**: admin, editor, viewer. El reparto está abajo, aprobado tal cual.
- **Las cinco piezas van en una sola ronda.** Se le advirtió que el volumen
  acumula defectos —en la ronda 8 el fallo más grave salió justo del volumen— y
  aun así lo eligió. Queda dicho, no se vuelve a plantear.

Descartado por él, no se hace: el dominio propio, la revisión de "todo en la
nube", y el Benchmark real (lo pasará más adelante).

---

## 1 · Quién es quién

### Lo que ya existe y no hay que construir

El SSO de Slack (`src/auth/slack.ts`) ya pide `openid profile email` y recibe
**correo y nombre** de cada persona. La sesión (`src/auth/firma.ts`) ya lleva un
campo `sub` con el correo, hoy marcado como «informativo». Esta ronda lo
convierte en la clave de todo.

También existe `personas_monday` (ronda 7), que es otra cosa: el directorio de
la cuenta de Monday, para asignar responsables de acuerdos. **No se mezclan.**
Una persona puede estar en los dos, en uno o en ninguno, y se emparejan por
correo solo para sugerir, nunca para decidir.

### La tabla

```
personas
  correo          text primary key      -- en minúsculas, es la clave
  nombre          text not null
  rol             text not null         -- 'admin' | 'editor' | 'viewer'
  activa          boolean not null default true
  creada_en       timestamptz not null default now()
  ultimo_acceso   timestamptz null
```

El correo es la clave porque es lo que devuelve Slack y lo único estable: los
nombres cambian, los identificadores de Slack son opacos.

### Qué pasa cuando alguien entra

Al volver de Slack, se busca su correo en `personas`:

- **Está y activa** → entra con su rol.
- **Está y desactivada** → no entra, y la pantalla lo dice sin rodeos.
- **No está** → **no entra.** Ve una pantalla que dice que pida acceso a
  Marketing Corp. No se crea sola una persona con rol de viewer: un directorio
  que se puebla solo no es un directorio, y el dominio `@upax.com.mx` lo tiene
  mucha gente que no trabaja en esta herramienta.

La comprobación de dominio que ya existe se conserva: primero el dominio, luego
el directorio.

### El arranque, que es el punto delicado

**Al desplegar esto, si el directorio está vacío nadie puede entrar** — ni
Franco. Dos cosas lo evitan, y las dos hacen falta:

1. La migración inserta a **Franco como admin** con su correo
   (`franco.cruzat@upax.com.mx`), leído de la variable `ADMIN_INICIAL` para no
   clavarlo en el SQL.
2. Se conserva un **portillo de emergencia**: si el directorio está vacío, la
   clave de equipo actual sigue funcionando y entra como admin. En cuanto hay
   una persona, deja de funcionar. Esto se escribe en el código con su porqué,
   porque parece un agujero y es un extintor.

### Los tres roles

| | admin | editor | viewer | director de UDN |
|---|---|---|---|---|
| Ver salas, reuniones, acuerdos | sí | sí | sí | solo la suya |
| Preparar, presentar y minutar | sí | sí | no | no |
| Mover acuerdos | sí | sí | no | los suyos |
| Subir a Monday | sí | sí | no | no |
| Crear y editar salas y marcas | sí | no | no | no |
| Personas y roles | sí | no | no | no |
| Enlace de la agenda | sí | no | no | no |

El director de UDN **no cambia**: sigue entrando por su enlace o su clave de
sala, viendo solo la suya y moviendo sus acuerdos.

### Cómo se aplica, y esto es lo que más importa

Hoy el permiso se comprueba con `exigirEquipo()`, que solo distingue equipo de
sala. Pasa a haber tres funciones, y **cada Server Action llama a la que le
toca**: `exigirAdmin()`, `exigirEditor()` (admin o editor), `exigirLectura()`.

La regla que ya rige y se refuerza: **esconder un botón no protege una acción**.
Toda acción existente se revisa una por una y se le asigna su exigencia. Ninguna
se queda con la comprobación vieja «por ahora».

`src/auth/politica.ts` gana el rol en las decisiones de ruta: `/salas` y
`/personas` son de admin.

---

## 2 · Quién participó en cada presentación

Franco: *«debe irse registrando quién de los editores está editando o quiénes
están en vivo interactuando, así puedo ver quién de mis gerentes participó en el
desarrollo de la presentación»*.

Son **dos cosas distintas** y se registran distinto:

### Quién editó

Tabla `participacion`, una fila por persona y sesión:

```
participacion
  sesion_id       text not null references sesiones(id)
  correo          text not null references personas(correo)
  primera_edicion timestamptz not null
  ultima_edicion  timestamptz not null
  ediciones       integer not null default 1
  primary key (sesion_id, correo)
```

Se escribe desde las acciones que **modifican una sesión**: guardar una sección,
reordenar, maquetar, publicar la minuta. No desde las de lectura — abrir una
sesión para mirarla no es participar.

Se cuenta un `UPDATE` con `ON CONFLICT` que suma uno y mueve `ultima_edicion`:
una sola sentencia atómica, sin leer-y-escribir. Es la misma lección de la ronda
8 con el token.

### Quién estuvo en vivo

«En vivo interactuando» es **quien abrió el modo presentación** mientras la
reunión ocurría. No hay más señal fiable sin construir presencia en tiempo real,
que es un sistema entero para responder una pregunta que se contesta con un
registro.

Se registra en la misma tabla, con una columna `presento boolean` que se pone
cierta cuando alguien abre el modo presentación de esa sesión.

**Lo que esto NO dice, y hay que decirlo en la pantalla**: no distingue quién
habló, ni cuánto participó, ni si estuvo atento. Dice quién tocó la
presentación y quién la abrió. Vender más que eso sería mentir con datos.

### Dónde se ve

En la sesión, una línea discreta: «Prepararon: Iris, César, Fernando ·
Presentó: Iris». Y en la vista de la sala, al lado de cada reunión.

---

## 3 · El bug de la grabación

Franco: *«el módulo de grabación de voz que se activa en modo presentación de
pantalla completa al parecer no está guardando la transcripción»*.

**Se está diagnosticando aparte** (`docs/superpowers/specs/2026-07-31-diagnostico-grabacion.md`).
El arreglo entra en esta ronda con lo que diga ese diagnóstico; si resulta que no
se puede reproducir, se dice y se le pregunta a Franco qué hizo exactamente.

Lo que no se toca: la grabación usa la Web Speech API del navegador porque la
API de Anthropic no acepta audio. Eso está decidido.

---

## 4 · Arrastrar los acuerdos de la sesión anterior

Franco: *«si quiero agregar Acuerdos y Pendientes me debería sugerir Acuerdos y
pendientes de la sesión pasada y poder arrastrarlos a la nueva presentación»*.

Al preparar una sesión de una sala, una columna lateral con **los acuerdos
abiertos de esa sala** —no solo los de la última reunión: un compromiso de hace
dos meses que sigue abierto es justo el que hay que arrastrar— ordenados por
fecha, los vencidos primero.

Arrastrar uno lo mete en la sección de acuerdos de la sesión nueva. **No lo
duplica**: el acuerdo es el mismo, sigue colgando de la sala, y lo que se
registra es que se retoma en esta reunión. Duplicarlo daría dos compromisos
donde hay uno, y el que se cierre dejaría al otro vivo.

Los que ya están en la sesión no se ofrecen otra vez.

El arrastre reutiliza `ListaOrdenable`, que ya existe, y **conserva los botones
de teclado como vía accesible**, igual que en el cuestionario.

---

## 5 · Imágenes y vídeo

Franco: *«no puedo subir ni imágenes y redimensionarlas o videos»*.

### Redimensionar

Las imágenes ya se suben (Vercel Blob, desde la ronda 2) pero se colocan a
tamaño fijo. Se añade:

- **Ancho ajustable** con un tirador en el previsualizador, en porcentaje del
  ancho de la columna. Se guarda en el contenido de la sección.
- **Alineación**: izquierda, centro, derecha.

No se recorta ni se edita la imagen: eso es un editor de imágenes y no es lo que
pidió.

### Vídeo

Categoría nueva en `archivos` y un tipo de sección de vídeo, que se reproduce
en el documento y en el modo presentación.

**El límite que hay que respetar y decir en pantalla**: la subida al cliente de
Vercel Blob admite hasta 5 GB, pero un vídeo pesado tarda en subir y en cargar
delante de un director. **Tope de 200 MB**, avisado antes de subir, con una nota
de que para vídeos largos conviene un enlace a YouTube o Drive — que ya se puede
poner hoy en una sección de enlaces.

Formatos: `video/mp4` y `video/webm`. Nada más: lo que Chrome reproduce sin
plugins.

---

## Riesgos de esta ronda, dichos antes de empezar

**El cambio de acceso puede dejar fuera a todo el equipo.** Es el riesgo mayor:
si el directorio se puebla mal o el portillo de emergencia falla, nadie entra —
incluido Franco. Por eso el portillo, la inserción de Franco en la migración, y
una verificación en producción que compruebe entrar **antes** de que la clave
vieja deje de funcionar.

**Cinco piezas en una ronda.** Franco lo eligió sabiendo el riesgo. Mitigación:
las piezas son independientes entre sí salvo participación, que depende de
personas. Si una se complica, se corta y se entrega el resto.

**La participación toca muchas acciones.** Cada sitio que escribe una sesión
tiene que registrar quién fue. Si se olvida uno, el dato queda incompleto y
nadie lo nota — un registro incompleto es peor que no tenerlo, porque parece
completo. La revisión tiene que comprobar la lista de acciones una por una.

## Orden

1. **Personas y roles.** Es el cimiento y el riesgo mayor; va primero y se
   verifica en producción antes de seguir.
2. **Participación**, que depende de personas.
3. **El bug de la grabación**, con lo que diga el diagnóstico.
4. **Arrastrar acuerdos.**
5. **Imágenes y vídeo.**

## Lo que NO entra

- Presencia en tiempo real (quién está mirando ahora mismo).
- Editar o recortar imágenes.
- Roles por squad: Franco eligió que el viewer vea todo.
- Invitar por correo a gente fuera del Slack de UPAX.
- Retirar la clave de sala de los directores.
