# Ronda 10 — La reunión es la entidad

4-ago-2026. Franco vuelve al proyecto con un pedido concreto y un caso real
detrás: ayer dio la Quincenal Comercial con Research Land, tiene la
presentación en PDF y la transcripción por cargar, y **la app no le deja hacer
ninguna de las dos cosas sobre la misma reunión**.

Sus palabras: *"el módulo de Reuniones dentro de una sala no es amigable, por
ejemplo si subí una presentación después no puedo meterle la minuta o al revés,
además dice 'antes de esta herramienta' y no entiendo por qué hacer la
distinción si al final a la UDN le interesa ver la última reunión con su
presentación y minuta, y abajo Reuniones anteriores con lo mismo: fecha de la
reunión, archivo o presentación web (la que hace la app) y la minuta con un
link a ver los acuerdos de esa reunión, se puede desplegar ahí mismo. Además la
sala debería tener arriba un enlace para los ajustes de la misma sala."*

## Decisiones suyas del 4-ago, ya tomadas y no se reabren

- **La reunión pasa a ser una entidad propia** y lo que hoy es `sesiones` se
  parte en dos: la reunión y el documento que se prepara para ella. Se le
  presentaron tres caminos —el archivo colgado de la sesión (barato), enlazar
  archivos desde su cubo (el más barato), y la tabla propia (el más caro)— y
  eligió el tercero con la advertencia de costo ya dicha. Queda dicho, no se
  vuelve a plantear.
- **El desplegable de acuerdos muestra los que nacieron en esa reunión**, con su
  estado de hoy, cerrados incluidos.
- **Los ajustes de sala viven en su propia página** dentro de la sala.
- **"Quincenal" se agrega** como cadencia de sala y como tipo de reunión.
- **La agenda se muda dentro de una pestaña global "Reuniones"**, que absorbe el
  calendario del mes, agendar y el historial de lo ya dado. El calendario **no
  desaparece del Home**, y el Home gana un botón para agendar sin salir de ahí.
- **`grupo-upax` se desactiva**: dejó de ser sala. Si la quiere de vuelta la
  creará desde la app.
- Las tipografías de Mexa Creativa y UiX las corrige él mismo desde la app: no
  se tocan aquí.

Fuera de esta ronda por decisión suya al abrir la sesión: **Monday** (espera su
token), **repartir los accesos** al equipo, y el **Benchmark** real (lo pasará
más tarde). No se adelantan.

---

## 1 · El modelo

### El problema, en una frase

Hoy la reunión no existe: existe la *sesión*, que nació como "el deck que se
está preparando" y a la que después se le fueron colgando la minuta, los
acuerdos y la participación. Todo lo que no pase por preparar un documento en la
app se queda sin sitio — y un PDF proyectado en una junta es exactamente eso.

Los dos síntomas que reportó Franco son la misma causa:

- **El PDF no puede tener minuta.** Se guarda en `archivos` con `sala_slug` y
  sin sesión (hoy hay 2 así, ambos con fecha). La minuta exige `sesion_id`. Sin
  sesión no hay a qué colgarla.
- **"Antes de esta herramienta"** existe para separar *lo que se abre* de *lo
  que se descarga*. Es una distinción de implementación ascendida a título de
  sección. Para el director de la UDN nunca hubo dos clases de reunión.

Hay un tercer síntoma que él no reportó y que sale del mismo sitio: **un solo
campo de estado mezcla dos vidas distintas.**

```
estado_sesion = agendada | borrador | lista | presentada | minutada
                └── de la reunión ──┘ └ del documento ┘ └ de la reunión ┘
```

Esa mezcla ya costó dos defectos registrados en este repo: el contador del Home
que mentía (3-ago) y que "marcar como presentada" fuera un trámite que nadie
hacía (ronda 4). Las dos veces se parchó la deducción. Separar los estados lo
cierra de raíz.

### Las dos tablas

```
reuniones
  id             text primary key
  sala_slug      text not null references salas(slug)
  fecha          timestamptz not null      -- instante, anclado a CDMX al escribir
  titulo         text not null
  tipo           tipo_reunion not null     -- 'semanal' | 'quincenal' | 'mensual'
  estado         estado_reunion not null   -- 'agendada' | 'dada'
  no_dada_en     timestamptz null          -- alguien dijo que ESTA no se dio
  lugar          text null
  alcance        text not null default 'todos'
  participantes  jsonb not null default '[]'
  created_at     timestamptz not null default now()
  updated_at     timestamptz not null default now()

documentos                                  -- lo que hoy es la mitad "deck" de sesiones
  id             text primary key
  reunion_id     text not null unique references reuniones(id)
  estado         estado_documento not null  -- 'borrador' | 'listo'
  estructura     jsonb
  plantilla      text null
  created_at     timestamptz not null default now()
  updated_at     timestamptz not null default now()
```

`reunion_id` es **unique**: una reunión tiene como mucho un documento. La
restricción vive en la base, no en el código — es la única forma de que dos
pestañas abiertas no creen dos.

### Qué cuelga de qué, después

```
REUNIÓN
   ├── documento      0 o 1     (unique en la base)
   │     └── items    las secciones, siguen colgando del documento
   ├── archivos       0 o n     categoría 'presentacion'
   ├── minuta         0 o 1
   ├── acuerdos       0 o n     por `reunion_origen_id`
   └── participacion  0 o n     quién preparó / quién presentó
```

Cinco tablas cambian de padre: `minutas`, `acuerdos`, `archivos`,
`participacion` e `items`. `items` es la única que **no** se muda a la reunión:
sigue colgando del documento, porque una sección es contenido del documento y no
de la junta.

Dos precisiones que evitan interpretaciones distintas al implementar:

- **El documento se direcciona por su reunión.** `/deck/<id>` pasa a significar
  "el documento de la reunión `<id>`", resuelto por `reunion_id` (que es
  unique). El documento tiene su propio id interno, que no aparece en ninguna
  URL. Así las rutas de hoy siguen sirviendo sin que el id del documento tenga
  que coincidir con nada.
- **Los archivos van todos a la reunión, también las imágenes y vídeos
  incrustados** en un documento (categorías `imagen` y `video`). Podrían colgar
  del documento, que es donde se ven, pero el permiso que hay que resolver es
  siempre "¿puede esta persona ver esta sala?", y eso lo contesta la reunión.
  Colgarlas del documento obligaría a dar dos saltos para la misma respuesta.

### Los estados, separados

| | |
|---|---|
| **Reunión** | `agendada` → `dada`, más la marca explícita `no_dada_en` |
| **Documento** | `borrador` → `listo` |

Correspondencia con lo de hoy, que es como se migra:

| estado de sesión hoy | reunión | documento |
|---|---|---|
| `agendada` | agendada | **borrador** — ver la nota |
| `borrador` | agendada | borrador |
| `lista` | agendada | listo |
| `presentada` | **dada** | listo |
| `minutada` | **dada** | listo |

> **Corregido el 4-ago contra la base real.** Esta tabla decía antes que una
> sesión `agendada` no genera documento, porque "agendar es poner una fecha en
> el calendario". En los datos no es así: `/agenda` agenda llamando a
> `crearSesionConEstructura`, o sea que **la plantilla nace con la junta**. Las
> 7 sesiones `agendada` de hoy llevan sus 8 secciones y 56 items entre todas;
> dejarlas sin documento habría dejado esos items sin padre.
>
> Consecuencia en el dominio: **la existencia de un documento no prueba que la
> junta se dio.** El umbral es el documento TERMINADO (`listo`), que es el
> equivalente exacto del viejo estado `lista` que usa hoy `fueDada`. Por eso
> `Reunion` lleva `documentoListo` además de `documentoId`, y tanto
> `tieneRespaldo` como `tienePresentacion` miran el primero.

### Qué se conserva de la deducción actual

`fueDada` (src/dominio/salas.ts) se mantiene con la misma regla y menos
ingredientes: una reunión `agendada` cuyo **día civil** ya pasó y que tiene algo
que la respalde —documento `listo`, un archivo de presentación o una minuta— se
da por dada sola. `no_dada_en` sigue mandando sobre la deducción, y `dada`
explícita manda sobre todo. La comparación sigue siendo por día civil anclado a
CDMX, nunca por instante: esa lección está pagada (dos bugs de fecha, ronda de
27-jul).

Lo que cambia es que **ya no hace falta que exista un documento** para que una
reunión pueda darse por dada. Ese era el requisito administrativo escondido que
dejaba el PDF fuera.

### Vocabulario

En pantalla, todo se llama **reunión**. "Sesión" desaparece de la interfaz: con
el modelo nuevo dejó de significar algo preciso. "Documento" es lo que se
prepara. Las rutas visibles (`/reunion/[id]`, `/deck/...`) no cambian en esta
ronda: renombrarlas es ruido sin valor para quien usa la app.

---

## 2 · La migración

### El riesgo primero

**Producción y local comparten la misma base de Neon.** Ya mordió dos veces con
datos de prueba; con una migración de cinco tablas es peor. Además la app está
en uso: hay 8 reuniones de agosto agendadas.

Por eso:

1. La migración se ensaya **en una rama de Neon** (copia de la base, incluida en
   el plan Free). Se corre entera ahí y se verifica leyendo los datos.
2. Solo entonces se aplica a la real.
3. Cada paso es una migración `drizzle-kit` aparte y va **dentro de una
   transacción**: Postgres hace DDL transaccional, así que un paso entra completo
   o no entra. Se aplica por la conexión directa (`DATABASE_URL_UNPOOLED`), no
   por el pool — `neon-http` no soporta transacciones, lección ya pagada en la
   ronda 7.

### Los pasos

**Paso 1 — nacen las tablas.** `reuniones` y `documentos` vacías, más los enums
`tipo_reunion`, `estado_reunion`, `estado_documento`. Se añade `quincenal` a
`cadencia`. Nada se quita: la app sigue corriendo sobre `sesiones` sin
enterarse.

**Paso 2 — se parten las sesiones.** Por cada fila de `sesiones` (hoy 10) se
crea una reunión con sus datos de calendario y, si tenía contenido, su
documento. El id de la reunión **es el id de la sesión**: así los `sesion_id`
que ya existen en las otras tablas siguen siendo válidos como `reunion_id` sin
tabla de correspondencia. El título sale de donde hoy lo saca la app.

Conservar el id tiene un segundo efecto que vale por sí solo: **las URLs siguen
vivas.** `/reunion/<id>` y `/deck/<id>` apuntan hoy al id de la sesión, y hay
enlaces de esos compartidos por Slack. Si la reunión estrenara id, todos
morirían el día del despliegue.

**Paso 3 — los archivos huérfanos se vuelven reuniones.** Los archivos de
categoría `presentacion` con `sala_slug` y sin sesión (hoy 2, los dos con fecha)
generan una reunión `dada` con esa fecha y su título, y pasan a apuntar a ella.
Un archivo sin fecha —hoy no hay ninguno— se queda donde está y se reporta; no
se le inventa un día.

**Paso 4 — las columnas nuevas, copiando.** `minutas`, `acuerdos`, `archivos` y
`participacion` reciben su `reunion_id` (`reunion_origen_id` en acuerdos) y se
rellena desde el `sesion_id` que ya tienen. **Se copia, no se mueve**: las
columnas viejas se quedan un paso más para poder comparar las dos.

**Paso 5 — verificación leída.** Se consulta la base y se pega el resultado en
el reporte. Los números que tienen que salir, medidos hoy:

| | hoy | después |
|---|---|---|
| sesiones | 10 | 10 reuniones + 2 de archivos = **12** |
| acuerdos | 6, todos con sesión de origen | 6, todos con reunión de origen |
| minutas | 1 | 1 |
| archivos de presentación | 2 sin sesión | 2 con reunión |
| items | 82 en 9 sesiones | los mismos, colgando de documentos |

Ninguna fila huérfana en ninguna de las cinco. Un `verificado` sin la consulta
leída no cuenta: eso ya pasó aquí con un subagente que borró una migración del
disco dejándola en el journal.

**Paso 6 — se retira lo viejo.** Se borran las columnas `sesion_id` y la tabla
`sesiones`. Solo después de que el paso 5 salga limpio en la rama de Neon y en
la real.

### Si algo sale mal

Cada paso es reversible por separado hasta el 6. El paso 6 es el único
destructivo, y va al final justamente por eso. Si el paso 5 no cuadra, se
corrige el paso 2 o 3 y se repite: nada de lo que la app lee se ha movido
todavía.

---

## 3 · Reuniones dentro de la sala

```
REUNIONES                                              [+ Agendar]

┌─ La última ─────────────────────────────────────────────────────┐
│  Quincenal Comercial                                            │
│  lunes 3 de agosto de 2026 · se dio                             │
│                                                                 │
│  [▤ Estatus RL agosto.pdf]   [✎ Minuta]   [▾ 3 acuerdos]        │
│                                                                 │
│  Preparó Iris · Presentó Franco                                 │
└─────────────────────────────────────────────────────────────────┘

Anteriores
  Quincenal Comercial   20 jul   [▤ documento] [✎ Minuta]  [▾ 2]
  Mensual               23 jun   [▤ Estatus.pdf] [+ Levantar minuta]
  Mensual               21 may   [+ Subir presentación] [✎ Minuta] [▾ 4]
```

### Lo que falta es un botón, no un lamento

Hoy la fila dice "Sin presentación" y "Falta la minuta" como texto muerto: te
informa del hueco y te deja sin manera de taparlo. Ahí está la queja de Franco.
Cada hueco pasa a ser la acción que lo llena, **en la propia fila**:

- **`+ Subir presentación`** — abre el diálogo de archivo (el mismo de hoy,
  Vercel Blob privado) ya apuntando a esta reunión. Junto a él, `Preparar
  documento` cuando la reunión no tiene documento.
- **`+ Levantar minuta`** — abre el flujo de transcripción de esta reunión. Hoy
  esa puerta solo está en un botón general al pie de la sección, con un selector
  de a cuál aplicarla.

Ambas exigen editor del lado del servidor. El director de UDN ve las mismas
filas sin las acciones.

### La presentación puede ser archivo o documento, o las dos

No son excluyentes: en el caso de Franco de ayer conviven (existe la reunión con
documento vacío en la app y existe el PDF que de verdad se proyectó). La fila
muestra lo que haya:

- Documento → enlace a `/reunion/[id]`, etiquetado "documento".
- Archivo → descarga, etiquetado **con el nombre del archivo**, para que se sepa
  qué se baja antes de bajarlo.
- Varios archivos → se listan todos.

### Los acuerdos, desplegables ahí

`▾ 3 acuerdos` abre en el sitio, sin viajar: los que nacieron en esa reunión,
con su estado de hoy, cerrados incluidos. Cada uno con responsable, fecha
comprometida y estatus.

No duplica la sección Acuerdos de arriba: esa responde *"qué está abierto en
esta sala"*, esta responde *"qué salió de esta junta"*. Una reunión sin acuerdos
no muestra el desplegable — un `▾ 0 acuerdos` es ruido.

### Lo que desaparece

La subsección **"Antes de esta herramienta"** y su lista aparte. Sus archivos
son ya reuniones (paso 3 de la migración) y caen en "Anteriores" como cualquier
otra.

**"Archivos de interés" no se toca**: eso sí es otra cosa —material de la sala
que no pertenece a ninguna junta— y se queda al final de la página como está.

### Lo que se conserva

- **En preparación**, arriba: reuniones futuras con documento en borrador y su
  avance. Franco la pidió en la ronda 3 y sigue teniendo sentido.
- **Por confirmar**: reuniones cuyo día pasó y sobre las que nadie ha dicho si
  se dieron. Ahora es del estado de la reunión, que es donde debía estar.
- La minuta se sigue leyendo en un `<dialog>` modal de verdad.

---

## 4 · La pestaña global "Reuniones"

La barra pasa de `Acuerdos · Agenda · Deck Designer` a
`Acuerdos · Reuniones · Deck Designer`.

```
REUNIONES

  agosto 2026        ‹  ›                        [+ Agendar]
  ┌──────────────────────────────────┐
  │  L    M    M    J    V           │   Próximas
  │            3●   4    5           │     lun 10  Research Land
  │  10●  11●  12●  13●  14          │     mar 11  NeraCode
  │  17   18●  19●  20●  21          │     mié 12  House of Films
  └──────────────────────────────────┘

  Ya dadas este mes
    3 ago   Research Land · Quincenal Comercial   [documento] [falta minuta]
```

Lo que hoy es `/agenda` (calendario del mes de todas las salas + formulario de
agendar) se muda aquí y gana la mitad que le faltaba: **qué se dio y qué le
falta**, sin entrar sala por sala.

**`/agenda/[token]` no se toca.** Es la agenda pública de enlace firmado, ya
compartida fuera; renombrarla rompería enlaces vivos. `/agenda` responde con una
redirección permanente a `/reuniones` para no dejar marcadores muertos.

### El Home

Conserva su calendario **igual**. Al lado gana **`+ Agendar`**, que abre un
formulario corto —sala, día, hora, tipo— sin salir del Home. Exige editor, como
la pantalla completa.

El resto del Home no se toca en esta ronda.

---

## 5 · Ajustes de la sala

Ruta nueva `/cliente/[slug]/ajustes`, con el enlace en la cabecera de la sala:

```
◀ Meeting Hub                    Research Land            ⚙ Ajustes
```

| Grupo | Qué lleva |
|---|---|
| **Identidad** | nombre, siglas, logo |
| **Marca** | principal, acento, tipografías |
| **Cadencia** | semanal · quincenal · mensual |
| **Acceso** | clave del director, regenerar |
| **Estado** | activa · pausar |

Reutiliza `FormularioSala` y las acciones de `src/app/salas/acciones.ts` tal
cual. Dos reglas que se respetan sin excepción:

- **Guardar no re-deriva la paleta.** Solo `crearSalaAction` y el botón
  explícito de recalcular la tocan. Derivar al editar destruía el brandbook
  (regla dura de la ronda 8).
- **Editar una sala es de admin.** Todas las acciones de `/salas` empiezan con
  `exigirAdmin()`. Hoy el único admin es Franco: el engrane solo le aparece a
  él, **y la página vuelve a exigir admin del lado del servidor**. Esconder el
  enlace no protege un endpoint — lección pagada en la ronda del 27-jul.

`/salas` se queda como está: sigue siendo el sitio para crear una sala y ver
todas juntas.

### Quincenal

`quincenal` entra en la cadencia de la sala y en el tipo de reunión. La
temperatura de atención (`temperatura`, src/dominio/salas.ts) tiene que
considerarla: una sala quincenal se desatiende a un ritmo intermedio, no al de
una semanal.

| cadencia | reciente | tibia | fría |
|---|---|---|---|
| semanal | ≤ 8 d | ≤ 10 d | > 10 d |
| **quincenal** | **≤ 15 d** | **≤ 21 d** | **> 21 d** |
| mensual | ≤ 20 d | ≤ 35 d | > 35 d |

Los de semanal y mensual son los de hoy y no se tocan. Los de quincenal son
"un ciclo completo más un día de gracia" y "un ciclo y medio", que es el mismo
criterio con el que se leen los otros dos. Hoy Research Land está marcada
semanal, así que con este cambio deja de reclamársele reunión al octavo día.

La reunión del 3-ago de Research Land queda etiquetada como lo que es: la
Quincenal Comercial.

### grupo-upax

Se desactiva (`activa = false`). Conserva su historia y deja de pedir reuniones
y de contar como desatendida. Es el mismo mecanismo de freeze que ya usa Zeus,
no uno nuevo.

---

## 6 · Casos límite y errores

- **Reunión sin nada** (agendada, sin documento, sin archivo, sin minuta): se ve
  en Próximas, no en el historial. No es una reunión que se dio.
- **Reunión dada sin nada**: se puede marcar dada a mano aunque no tenga
  respaldo. Se ve en el historial con los dos huecos accionables. Es el caso de
  una junta que ocurrió y de la que aún no se cargó nada.
- **Documento sin reunión**: imposible por construcción (`reunion_id` es not
  null).
- **Dos documentos para una reunión**: imposible por construcción (unique).
- **Archivo sin fecha en la migración**: no se convierte en reunión, se reporta.
  Hoy no hay ninguno.
- **Sala en pausa**: no admite agendar reuniones nuevas ni confirmar/negar las
  que tenga, igual que hoy. Consultar su historia sí.
- **Borrar una reunión**: sus acuerdos **sobreviven** (la clave ajena se anula,
  no cascada). Es el comportamiento de hoy y se conserva a propósito: un
  compromiso no desaparece porque se borre el registro de la junta donde nació.
  Queda dicho aquí porque ya causó confusión al limpiar datos de prueba.

## 7 · Pruebas

**Dominio** — la reunión con archivo y sin documento; con documento y sin
minuta; con las dos; la que no se dio; la deducción de `fueDada` sin documento
(el caso que hoy no existe); los acuerdos de una reunión con cerrados incluidos;
la temperatura de una sala quincenal.

**Migración** — verificación **leída** de la base antes y después, con los
números de la tabla del paso 5 pegados en el reporte. Primero en la rama de
Neon.

**Regresión** — los 1278 tests actuales siguen verdes, más lint, tsc y build.

**Prints de la app desplegada** — la sala con reuniones de los cuatro tipos, la
pestaña global, el Home con el botón nuevo, y los ajustes. Todos los defectos de
las últimas cuatro rondas salieron de mirar, no de los tests: huecos grises,
verbos en plural, títulos empujados, ejes con unidades mezcladas. Ninguno era
fallo de lógica.

## 8 · Orden de entrega

| Fase | Qué entrega | Se nota por fuera |
|---|---|---|
| **A** | Modelo y migración | No |
| **B** | Reuniones en la sala | **Sí — aquí ya se puede cargar la RL de ayer** |
| **C** | Pestaña global + botón en el Home | Sí |
| **D** | Ajustes de sala, quincenal, grupo-upax | Sí |

Cada fase se despliega y se mira antes de empezar la siguiente. La fase B es la
que resuelve el caso que trajo Franco, y por eso va inmediatamente después de la
migración.
