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

## 1 · La clase de junta ya existe. Se llama `plantilla`

**REVISADO EL 14-ago, DESPUÉS DE APROBAR ESTE SPEC.** La primera versión de
esta sección mandaba crear una columna `reuniones.clase`. Estaba mal, y lo
destapó mirar el código antes de escribir el plan.

**La app YA pregunta qué clase de junta es**, y guarda la respuesta en
`reuniones.plantilla`. El comentario de esa columna empieza, literalmente, con
*"QUÉ CLASE DE JUNTA ES —estatus de UDN, comité, arranque de campaña— y, por
tanto, con qué secciones nace su presentación"*. Su catálogo
(`src/secciones/plantillas.ts`) son cinco entradas cuyos nombres son clases de
junta: **Estatus de UDN · Comité o dirección · Arranque de campaña ·
Seguimiento de proyecto**, más **En blanco**, que no lo es.

Crear una `clase` aparte habría obligado a contestar **dos preguntas para lo
mismo** al crear una reunión desde una sala —"clase: Sync Comercial" y
"plantilla: En blanco"—, que es exactamente el defecto que este spec venía a
evitar con `tipo`. *(Decisión de Franco, 14-ago, entre las dos opciones.)*

Así que **no hay columna nueva ni migración**. Lo que hay que arreglar es que
esa pregunta hoy es de segunda:

1. **Solo se hace desde la sala.** Agendar desde el calendario de `/reuniones`
   no la pregunta —su propio código lo dice: *"Este formulario no pregunta la
   plantilla"*— y por eso **6 de 14 reuniones la tienen vacía**.
2. **Se llama como no es.** "Plantilla" nombra la consecuencia (con qué
   secciones nace el deck) en vez de la decisión (qué junta es). En la
   interfaz pasa a preguntarse por lo que es: **¿qué junta es?**
3. **Le falta la clase que motivó todo:** `sync-comercial`.
4. **"En blanco" no es una clase**, es la salida de emergencia. Se queda, al
   final y tras un separador: *"Otra (deck en blanco)"*.

Y queda dicho para siempre lo que sí son tres cosas distintas:

- **`tipo` es la CADENCIA** — cada cuánto (`mensual`, `quincenal`, `semanal`).
  Ya costó una vez confundirlos: el título por defecto describía la cadencia y
  por eso la Quincenal de Research Land perdió su "Comercial".
- **`plantilla` es la CLASE de junta**, y de ella se derivan las secciones.
- **El deck** es lo que se arma después, y puede tocarse sin que la clase
  cambie.

### Las seis sin clasificar

Las seis con `plantilla` nula se titulan todas "Estatus…". Rellenarlas es un
`UPDATE` sobre producción, así que **no se hace por cuenta propia**: se
propone a Franco con la lista delante. Mientras tanto se pintan como **"sin
clasificar"**, que es la verdad.

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
