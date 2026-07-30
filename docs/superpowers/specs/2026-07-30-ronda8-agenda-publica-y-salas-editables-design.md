# Ronda 8 — La agenda compartible y las salas editables

30-jul-2026. Diseño aprobado por Franco antes de escribirlo.

Cierra las dos piezas que quedaron fuera de la ronda 7 y una decisión que Franco
revirtió al ver el resultado pintado:

1. **Un enlace para compartir la agenda** con quien no entra a la app.
2. **Crear y editar salas desde la app**, con su marca.
3. **Elegir la tipografía de cada sala** — Franco, 30-jul: *«el tema de la
   tipografía fue una mala decisión, ya que se ven mal, debemos poder
   seleccionar tipos»*.

Las tres van juntas porque la 3 no existe sin la 2: elegir tipografía es
configurar la marca de una sala, y hoy la marca vive en código.

---

## Lo que hay hoy, medido

**Las nueve salas viven en `src/temas/`**, un archivo por sala, cada uno
exportando un objeto `Tema` con doce campos: `slug`, `nombre`, `primario`,
`secundario`, `acento`, `superficieClara`, `superficieOscura`,
`textoSobreClara`, `textoSobreOscura`, `gradiente[]`, `familiaDisplay`,
`familiaTexto`. `src/temas/index.ts` los reúne en `TEMAS` y expone
`obtenerTema(slug)` —que revienta si no existe— y `slugsDeSalas()`.

**Doce archivos los consumen** fuera de `src/temas/`: `db/consultas.ts` (6
usos), `app/deck/nueva/page.tsx` (6), `db/sesiones.ts` (4), `dominio/salas.ts`
(3), `db/salas.ts` (3), `db/acuerdos.ts` (3), `app/cliente/[slug]/page.tsx` (3),
`app/agenda/page.tsx` (3), `db/claves.ts` (2), `db/archivos.ts` (2),
`app/deck/[id]/minuta/acciones.ts` (2), `app/cliente/[slug]/benchmark/page.tsx` (2).

Casi todos están ya dentro de funciones asíncronas, así que la mudanza no
obliga a propagar `async` hacia arriba. La excepción importante está abajo.

**`src/temas/logos.ts`** guarda `ALTO_LOGO` por slug: alturas calculadas
normalizando por ÁREA DE TINTA, no por altura, porque los diez lockups van de
1,64:1 a 6,80:1 y a la misma altura Research Land ocupa 4,2× más mancha que
House of Films. Hoy se midieron con un script fuera de la app.

**`src/temas/fuentes.ts`** resuelve nueve familias de Google Fonts con
`next/font/google`, que se resuelve AL COMPILAR. `CLASES_DE_FUENTES` se aplica
en el layout, así que hoy las nueve se cargan en todas las páginas.

**El acceso** son dos roles —`equipo` (clave compartida) y `sala` (enlace
firmado de 30 días)— más SSO de Slack. `src/proxy.ts` niega por defecto: no hay
ni una ruta pública.

---

## 1 · El enlace de la agenda

Ruta **`/agenda/[token]`**, sin sesión. Se comparte por Slack o WhatsApp con
quien haga falta; Franco decidió que no lleve clave, porque son fechas y nombres
de unidades, no datos de cliente.

⚠️ **`/agenda` ya existe y es del equipo** (la pantalla donde se agendan las
sesiones). La ruta pública cuelga de ella como segmento dinámico, así que
`/agenda` sigue pidiendo sesión y `/agenda/<token>` no. Son dos reglas contiguas
sobre el mismo prefijo y confundirlas abre la pantalla interna: la política
tiene que distinguirlas por número de segmentos, como ya hace con `/cliente` y
`/cliente/<slug>`, y hay un test por cada una.

### El token

Tabla nueva `enlace_agenda`, una sola fila: `token` (cadena aleatoria de 32
bytes en base64url), `creadoEn`. Generar es escribir la fila; **revocar es
reemplazarla**, y el enlace viejo deja de servir en el acto.

No se firma con HMAC como los enlaces de sala. El token de sala lleva datos
dentro (qué sala, hasta cuándo) y por eso necesita firma; éste no lleva nada:
es una contraseña larga que se compara contra la base. Un mecanismo más simple
para un problema más simple, y revocarlo es trivialmente correcto.

Sin fila, la ruta responde como si el token no existiera. No hay enlace por
defecto: alguien tiene que generarlo.

### Qué enseña

El mes en rejilla, con las reuniones agendadas: **sala, día y hora**, con el
logo y el color de cada marca. Debajo, la lista del mes en orden. Navegación al
mes anterior y al siguiente.

**Qué NO enseña, y es la parte que importa:** ni acuerdos, ni minutas, ni
participantes, ni el contenido de ninguna reunión, ni un solo enlace que entre a
la app. Las salas en pausa no aparecen —por definición no tienen reuniones— y
tampoco las sesiones en estado `borrador`: una reunión que aún se está armando
no es una fecha comprometida.

### Dónde se genera

En `/salas` (ver pieza 2), para el equipo: el enlace actual con un botón de
copiar y otro de revocar y generar uno nuevo. Revocar avisa de que quien tenga
el viejo deja de verlo.

### El riesgo, y cómo se acota

**Ésta es la primera ruta pública de la app**, y `src/proxy.ts` es lo único que
hoy impide que un desconocido vea las salas. Un error ahí no expone una agenda:
expone todo.

Por eso la excepción se escribe en la política (`src/auth/politica.ts`), no en
el proxy, junto al resto de reglas y con la misma forma; y se cubre con tests
que comprueben las dos direcciones: que `/agenda/<token>` pasa sin sesión, y que
`/`, `/acuerdos`, `/cliente/<slug>` y `/deck/...` siguen sin pasar. Un test que
solo compruebe que la agenda se ve no detecta que se abrió lo demás.

La página valida el token **antes** de consultar nada. Si no coincide, responde
404 —no un mensaje de "token inválido"—: un 404 no dice si el enlace existió.

---

## 2 · Las salas se editan desde la app

### La mudanza

Las nueve salas se mudan a la base con su marca **idéntica**: mismos hex, mismas
tipografías, mismos degradados. Lo que hoy es `src/temas/<sala>.ts` pasa a ser
`src/temas/semilla.ts`, que se usa UNA vez para poblar la base y se queda como
registro de dónde salieron los valores originales.

La tabla `salas` gana las doce columnas del `Tema` (`gradiente` como jsonb, el
resto texto), más `logoUrl` y `logoRelacionDeTinta` (ver abajo).

**`src/db/temas.ts`** nuevo: `cargarTemas(): Promise<Record<string, Tema>>` lee
todas las salas y arma el registro, envuelto en el `cache()` de React para que
una misma petición no consulte dos veces. `obtenerTema(slug)` deja de existir
como función global; quien necesite un tema pide el registro y busca en él.

**`ProveedorTema` y los componentes no cambian**: siguen recibiendo un objeto
`Tema` ya resuelto. Ésa es la propiedad que hace la mudanza abordable — el
código que PINTA no sabe de dónde salió el tema, y no tiene por qué enterarse.

### Lo que se rompe a propósito: el camino sin base de datos

`src/dominio/salas.ts` existe como respaldo para cuando no hay `DATABASE_URL`:
devuelve las nueve salas vacías, porque las salas eran configuración y estaban
en código. **Al mudarlas, dejan de serlo.** Sin base de datos no hay salas, y
ésa es la verdad: `estadoDeSalas()` devuelve `[]` y las pantallas dicen que
falta configurar la base, en vez de enseñar nueve salas que no existen.

Se escribe en el propio archivo por qué cambió, porque el comentario actual
afirma lo contrario y sería una mentira en cuanto se toque.

### Crear una sala

Pantalla **`/salas`**, solo equipo. Lista de las salas con su color y su estado
(activa o en pausa), botón de crear, y el enlace de la agenda con copiar y
revocar.

Crear pide tres cosas: **nombre, logo y color**.

- El **slug** se deriva del nombre (minúsculas, sin acentos, guiones) y se
  enseña para poder corregirlo. Es la clave primaria y la parte de la URL de la
  sala, así que una vez creada no se cambia.
- El **logo** se sube a Vercel Blob, como ya se suben las imágenes desde la
  ronda 2.
- Del **color** se derivan secundario, acento, superficies, colores de texto
  legibles y el degradado, con `ajustarColorParaContraste` y la maquinaria de
  `src/lib/color.ts` que ya existe. Hay una **vista previa** antes de guardar.

Editar una sala existente abre lo mismo con sus valores, y ahí se puede afinar
cualquier campo derivado a mano: la derivación es un punto de partida, no una
jaula.

### El alto del logo, que no es un detalle

Los logos se normalizan por área de tinta, no por altura, y esa medición hoy se
hace fuera de la app con un script. Un logo subido desde la interfaz no puede
esperar a que alguien corra un script.

**Se mide en el navegador al subirlo**: se pinta en un `<canvas>` y se cuentan
los píxeles no transparentes para obtener la proporción de tinta; ese número se
guarda en `logoRelacionDeTinta` y alimenta la misma fórmula que ya existe en
`src/temas/logos.ts`. Los nueve logos actuales se migran con las relaciones que
ya están medidas.

Si el logo viene sin transparencia (un JPG con fondo blanco), la medición dice
que ocupa todo el lienzo y el logo saldrá pequeño. Se avisa en la pantalla al
subirlo: **PNG o SVG con fondo transparente**.

### Borrar: no se puede

No hay borrado de salas. Para dejar de atender una está la pausa de la ronda 7.
Borrar una sala dejaría sus sesiones, acuerdos, minutas y archivos colgando de
algo que ya no existe, y el historial de una relación comercial no se tira por
una pantalla de configuración.

---

## 3 · Las tipografías

El catálogo pasa de 9 a **20 familias**, elegibles por sala: una para títulos
(`familiaDisplay`) y otra para texto (`familiaTexto`), con **vista previa en la
propia pantalla** — un título y un párrafo pintados con la fuente, porque una
lista de nombres no dice cómo se ve.

Las nueve salas conservan al mudarse exactamente lo que tienen hoy. A partir de
ahí Franco las cambia.

Las once nuevas cubren los registros que faltan: neutras de texto, con carácter
para títulos, condensadas y alguna serif. La lista concreta se fija en el plan;
el criterio es que cada una sirva para algo que hoy no se puede hacer, no
engordar el desplegable.

### El problema de rendimiento, que hay que resolver y no ignorar

Hoy `CLASES_DE_FUENTES` se aplica en el layout, así que **las nueve familias se
cargan en todas las páginas**. Con veinte eso empeora justo en la dirección
contraria a lo que se busca: páginas más lentas para que se vean mejor.

`next/font/google` se resuelve al compilar y no acepta un nombre que venga de la
base de datos, así que las veinte tienen que estar declaradas en código. Lo que
sí se puede es **aplicar solo las clases que la página necesita**.

Y aquí hay un límite honesto: **el hub pinta las nueve salas a la vez**, cada
una con su tarjeta y su marca, así que en esa pantalla concreta no hay nada que
recortar — necesita las familias de todas. Donde sí se gana es en las demás: una
sala, un documento o la agenda usan dos familias, no veinte.

El plan tiene que resolver esto y **medirlo**: cuántas familias se descargan al
abrir el hub y al abrir una sala, antes y después. El objetivo es que una sala
cargue dos. Si al terminar carga veinte, la pieza está mal hecha aunque se vea
bien. Si el hub sigue cargando muchas, es esperado y se declara.

Nota para el plan: si la carga selectiva resulta más cara de lo que rinde,
**es preferible entregar el catálogo de veinte con la carga actual y decirlo**,
que entregar una optimización a medias que rompa cómo se ven las marcas. La
prioridad de Franco es que dejen de verse mal.

---

## Modelo de datos

```
salas
  + nombre                 text not null
  + primario               text not null
  + secundario             text not null
  + acento                 text not null
  + superficie_clara       text not null
  + superficie_oscura      text not null
  + texto_sobre_clara      text not null
  + texto_sobre_oscura     text not null
  + gradiente              jsonb not null        -- string[]
  + familia_display        text not null
  + familia_texto          text not null
  + logo_url               text null
  + logo_relacion_tinta    real null             -- proporción de píxeles con tinta

enlace_agenda                                     -- una sola fila
  token                    text primary key
  creado_en                timestamptz not null default now()
```

La migración crea las columnas y **puebla las nueve filas existentes desde
`src/temas/semilla.ts`** en el mismo paso: dejarlas nulas un instante rompería
la app en producción, que comparte base con local.

Cómo se hace sin ventana rota, porque `not null` sobre una tabla con filas falla
si no hay valor: las columnas se crean **anulables**, se rellenan con la semilla,
y una segunda migración las pone `not null`. Tres pasos en el mismo despliegue.
La alternativa —crearlas con un `default` cualquiera— dejaría nueve salas
pintadas de un color de relleno hasta que alguien corriera la semilla, y esta
base es la de producción.

## Errores y casos límite

| Situación | Qué pasa |
|---|---|
| Token de agenda que no coincide | 404, sin decir si existió |
| Sin fila en `enlace_agenda` | Cualquier token da 404; hay que generarlo primero |
| Se revoca el enlace | El viejo deja de servir en el acto |
| Sala en pausa | No aparece en la agenda pública |
| Sesión en `borrador` | No aparece: no es una fecha comprometida |
| Crear una sala con un slug que ya existe | Se rechaza, diciendo cuál es |
| Logo sin transparencia | Se avisa al subirlo; se guarda igual y se puede corregir el alto a mano |
| Color con contraste insuficiente | La vista previa lo dice y ofrece el ajustado; se puede guardar igual bajo aviso |
| Sin `DATABASE_URL` | No hay salas. Las pantallas lo dicen |

## Pruebas

Unitarias: la derivación de marca desde un color (que el texto siempre cumpla
4.5:1 contra su superficie), la generación del slug desde el nombre, la
comparación del token, y `cargarTemas` con la base vacía.

**De la política de acceso, en las dos direcciones**: que `/agenda/<token>`
pasa sin sesión, y que `/`, `/acuerdos`, `/cliente/<slug>` y `/deck/...` siguen
sin pasar. Es el test que evita que la primera ruta pública abra el resto.

En producción, con prints: la agenda pública en un navegador sin sesión, la
pantalla de salas, y una sala creada de prueba con su marca — **borrando después
la sala de prueba**, que en esta app es especialmente delicado porque local y
producción comparten la misma base de Neon.

Y la medición de fuentes cargadas, antes y después.

## Orden

1. **El enlace de la agenda.** Independiente, y utilizable en cuanto esté.
2. **La mudanza de las nueve salas a la base**, con la marca idéntica y todo lo
   demás funcionando igual. Sin pantalla nueva todavía: es la mudanza sola, para
   que si algo se rompe se vea aquí y no mezclado con lo siguiente.
3. **La pantalla de salas**: crear, editar, el logo con su medición, y la vista
   previa.
4. **Las tipografías**: el catálogo de veinte, la vista previa y la carga
   selectiva medida.

## Lo que NO entra

- Borrar salas.
- Subir archivos de tipografía propios (Campton, Brunson y las demás del
  brandbook). Franco eligió catálogo ampliado; si los sustitutos siguen sin
  convencer, ésa es la siguiente conversación, no ésta.
- Que el enlace de la agenda lleve clave o caduque.
- Suscripción al calendario en Outlook o Google (`.ics`). Se ofreció y Franco
  eligió la página; sigue disponible como idea si la pide.
