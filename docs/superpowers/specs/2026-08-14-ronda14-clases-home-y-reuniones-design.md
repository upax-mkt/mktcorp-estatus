# Clases de reunión, el Home invertido y las tres pantallas de trabajo

**Fecha:** 14-ago-2026 · **Ronda 14** · Aprobado por Franco el 14-ago.

Cinco encargos de Franco que comparten un dato nuevo, así que se diseñan
juntos y se implementan en orden:

> *"desde /acuerdos debo poder editar cada uno de ellos. La pestaña reuniones
> tiene UX y UI muy malo… El home hay que transformarlo, ya que es el lugar
> donde lo primero que ves son las salas y luego otros módulos de interés
> agnósticos y generales… el equipo llevará las sesiones semanales como Sync
> Comerciales, por lo que se podría agregar una etiqueta con respecto al tipo
> de reunión y separar en columnas la vista de módulo de reuniones pasadas."*

---

## 0 · Lo que se midió antes de diseñar

Todo lo que sigue sale de mirar las tres pantallas con sesión de `admin`
contra el servidor local el 14-ago, no de leer el código.

| Hallazgo | Medida |
|---|---|
| El lápiz de `/acuerdos` | `opacity: 0`, solo visible con `:hover` sobre la fila |
| Lo que ese editor cambia | texto y responsable — **ni fecha, ni estado, ni sala** |
| Las salas en el Home | empiezan en el píxel **1.140 de 2.238**: a mitad de página |
| El calendario de `/reuniones` | **745 px de alto**, 985 de ancho, con **455 px muertos** a su derecha |
| Reuniones del mes en ese calendario | 6, repartidas en 6 celdas de 42 |
| Tarjetas en `/reuniones` | **14, todas de la misma forma**, sin color de sala ni clase |
| `reuniones.tipo` | `mensual` 12 · `quincenal` 1 · `semanal` 1 — es **cadencia** |
| `reuniones.plantilla` | vacía en **6 de 14** |

---

## 1 · Las tres palabras que hoy se confunden

El encargo pide "una etiqueta con respecto al tipo de reunión". Ese dato **no
existe**, y hay dos candidatos que parecen serlo y no lo son:

- **`tipo` es la CADENCIA** — cada cuánto se repite (`mensual`, `quincenal`,
  `semanal`). Ya costó una vez confundirlos: el título por defecto describía
  la cadencia y por eso la Quincenal de Research Land perdió su "Comercial".
- **`plantilla` es CON QUÉ NACE SU DECK** — qué secciones trae la
  presentación al armarse (`estatus-udn`, `seguimiento`, `comite`,
  `arranque`, `en-blanco`). Está **vacía en 6 de 14** reuniones, y un Sync
  Comercial normalmente no lleva presentación: usarla como etiqueta
  significaría *"una junta sin deck no tiene tipo"*, que es justo al revés.

Nace entonces la **CLASE**: qué junta es. Tres ejes, tres columnas, y una
relación de una dirección: **la clase propone la plantilla, y nunca al revés.**

### El dato

- Columna nueva `reuniones.clase` (texto, nullable).
- Catálogo en código, `src/lib/clases-de-reunion.ts` — mismo patrón que
  `src/lib/equipos.ts` y `src/secciones/plantillas.ts`, que ya resuelven este
  problema en este repo: `estatus` (Estatus de UDN) · `sync-comercial` (Sync
  Comercial) · `seguimiento` · `comite` · `arranque`. Cada entrada declara su
  nombre, su orden y su plantilla por defecto.
- **Por qué catálogo y no tabla:** una tabla obliga a construir la pantalla
  que la administra antes de que la etiqueta sirva de nada. Cuando haga falta
  que Franco añada clases sin desplegar, se promueve — el `string` en la
  columna no cambia.
- **Relleno de las 14 existentes:** por título y plantilla (las 12 que dicen
  "Estatus…" o traen `estatus-udn` → `estatus`). Lo que no se pueda deducir
  se queda en `null` y se pinta como "sin clasificar": inventar la clase de
  una junta pasada sería inventar de qué se habló.

---

## 2 · `/acuerdos`: editar de verdad

**El defecto no es que falte el editor: es que no se ve.** El lápiz vive en
`opacity: 0` y solo aparece al pasar el ratón por encima de la fila — en un
teléfono, donde no hay hover, es inalcanzable. Y aunque se encuentre, solo
cambia el texto y el responsable.

- **Cada fila lleva un control de edición permanente** —visible en reposo,
  sin `:hover`—, no un lápiz que aparece al acercarse. La afordancia deja de
  depender de un gesto que la mitad de los dispositivos no tienen. La fila
  NO se vuelve editable al pulsarla en cualquier punto: su texto se
  selecciona y se copia, y ese gesto no se sacrifica.
- Se edita **todo lo que define un acuerdo**: texto, responsable, **fecha
  compromiso**, **estado** y **sala**.
- Reusando `EditarAcuerdo` (texto + responsable) y `AcuerdoControles` (estado
  + fecha), que ya existen y ya se usan en la sala. Nada nuevo que arreglar
  dos veces — la lección que dejó la ronda 12 con la sección del Home y la de
  la sala.
- Los permisos no cambian: corregir es de editor, eliminar es de admin, y la
  comprobación sigue viviendo en cada Server Action.

### La estrella

Destacar existe hoy para que un acuerdo **salga en el Home**, y el Home deja
de listar acuerdos (§4). En vez de retirarla, **pasa a significar "fijado
arriba en `/acuerdos`"**: conserva el gesto, conserva su columna, y no hay
dato que borrar. *(Decisión de Franco, 14-ago.)*

---

## 3 · La sala: un módulo de Reuniones con columnas por clase

*(Decisión de Franco entre tres opciones, 14-ago.)*

El equipo empieza a llevar Sync Comerciales semanales dentro de las salas. Sin
hacer nada, doce syncs al trimestre ahogan el estatus mensual en la misma
lista.

- **Sigue habiendo UN módulo.** Dos módulos duplicarían el patrón de "la
  última" y alargarían una sala que ya se peleó por su alto.
- **"La última" muestra la más reciente de CADA clase.**
- **"Anteriores" se reparte en una columna por clase**, cada una con su
  conteo. En móvil las columnas se apilan — la sala ya sabe hacerlo.
- **Cada reunión lleva su etiqueta de clase** visible, aquí y en
  `/reuniones`.

---

## 4 · El Home

Hoy el orden es: pulso → Por confirmar → Acuerdos → Calendario y Minutas →
**los clientes** → En pausa. Las salas, que son de lo que trata la app,
empiezan a mitad de página.

Orden nuevo:

1. **Pulso** — las mismas seis cifras.
2. **Los clientes** — las nueve salas, lo primero que se ve.
3. **Calendario + agendar una reunión**.
4. **Minutas** (generar una, editar el molde).
5. **En pausa**.

⚠️ **DEUDA HEREDADA DEL MILESTONE 1, que se salda aquí.** La estrella ya
cambió de significado (§2): su botón dice "Fijar arriba en Acuerdos". Pero
mientras el Home siga pintando su bloque **Destacados**, ese control hace MÁS
de lo que su etiqueta promete — dentro del Home, "Fijar arriba en Acuerdos" no
describe el efecto que el usuario ve ahí mismo (entrar o salir de ese bloque).
Se aceptó a sabiendas para que la estrella no siguiera prometiendo un Home que
va a desaparecer, con la condición de anotarlo aquí. **Retirar el bloque
Destacados del Home cierra las dos mitades.** (`ModuloAcuerdos.tsx:156`.)

**Los acuerdos salen del Home** *(decisión de Franco: "solo una cifra")*. El
módulo desaparece; las dos cifras que el pulso YA pinta —"13 acuerdos
abiertos · 1 vencido"— se vuelven pinchables hacia `/acuerdos`, que a partir
de §2 es donde se puede hacer algo con ellos. La tarjeta de cada sala sigue
diciendo los suyos.

---

## 5 · `/reuniones`

**Los cuatro módulos se quedan** —Próximas, Por confirmar, Se dieron falta su
minuta, Cerradas—: es la arquitectura que Franco pidió el 6-ago y no se
reabre. Lo que cambia es la forma.

- **El calendario deja de llevarse media pantalla.** 745 px de alto y 455 de
  ancho muerto a su derecha para enseñar 6 reuniones.
  ⚠️ **Ese hueco NO lo ocupa "Próximas".** Franco lo sacó del panel lateral
  el 6-ago con un motivo que sigue siendo cierto —*"se desarma todo cuando
  hay muchas"*: una columna angosta que solo crece hacia abajo—, y esa
  decisión no se reabre. El hueco lo ocupan las piezas que **no crecen con el
  volumen**: agendar, los filtros de sala y clase (§5), y la leyenda. Las
  cuatro listas siguen abajo y a todo lo ancho.
- **Cada tarjeta dice qué es de un vistazo**: color y logo de su sala, y su
  etiqueta de clase (§1). Hoy son 14 rectángulos idénticos.
- **"Cerradas" deja de ser un cementerio**: sus tarjetas abren la minuta y el
  documento de esa reunión. Hoy no llevan a ningún sitio.
- **Se pliega lo cerrado**, al final y apagado — la misma gramática que ya
  usan los acuerdos cumplidos en la sala.
- **Filtros por sala y por clase**, como los que `/acuerdos` ya tiene.
- **El orden pasa a ser el del trabajo**: primero lo que exige una acción
  (por confirmar, falta su minuta), luego lo que viene, y lo cerrado al final.

---

## 6 · Orden de implementación

La clase es la dependencia de todo lo demás, y `/acuerdos` no depende de
nada:

1. **`/acuerdos` editable** — es un arreglo, no un rediseño. Entrega valor sin
   tocar la base.
2. **La clase de reunión** — columna, catálogo, migración y relleno.
3. **La sala: columnas por clase.**
4. **`/reuniones`.**
5. **El Home.**

## 7 · Qué NO entra

- **Reabrir los cuatro módulos de `/reuniones`** (decisión del 6-ago).
- **La pestaña Presentaciones** (`/deck`), cerrada por Franco el 12-ago.
- **Promover el catálogo de clases a tabla** con su pantalla de
  administración: cuando haga falta añadir una sin desplegar.
- **El punto de color de House of Films y Marketing United**, idénticos por
  tener las dos `primario = #000000`. Está medido y pendiente de decisión de
  marca de Franco; afecta a la agenda pública y al desplegable de Clientes.

## 8 · Cómo se verifica

Cada punto se mira **en el navegador con sesión firmada contra el servidor
local**, no solo con tests: es la técnica de la ronda 11, y esta ronda ya
demostró por qué —el menú que se abría detrás de la barra gris de la sala se
diagnosticó con `elementFromPoint`, no leyendo CSS—. La base local ES la de
producción: solo GET, y para ejercer escrituras, la sala **pausada de Zeus**.
