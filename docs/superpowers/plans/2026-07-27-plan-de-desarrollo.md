# Plan de desarrollo · mktcorp-estatus

**Fuente única de qué falta, en qué orden y por qué.** Todo feedback de Franco y
todo hallazgo de auditoría entra aquí antes de tocar código. Si algo no está en
este documento, no se está haciendo.

Estado del repo: rama `editor-de-secciones`, **531 tests**, build y lint
limpios (0 errores, 2 avisos de variables con guion bajo).

**TODO EL PLAN EJECUTADO (27-jul).** Quedan tres cosas fuera, cada una con su
motivo escrito en su fase — dos necesitan algo de Franco y una es una decisión
de coste/beneficio:

| Qué | Por qué no está | Qué hace falta |
|---|---|---|
| **Datos del benchmark** (3.4) | La pantalla está entera; los datos no se pueden inventar sin publicar un análisis de la competencia falso al director de la UDN. | La presentación de benchmark de referencia. Se pegan en `src/datos/benchmark.ts` y aparecen. |
| **Logos de portada y cierre** (5.3) | Faltan los archivos de las diez marcas. Dejar el campo sería código que apunta a archivos inexistentes. | Los SVG (o PNG con fondo transparente) de las diez salas. |
| **Flechas ↑↓ optimistas** (4.8) | Exige reestructurar el reordenamiento —que funciona y tiene test— para ahorrar dos décimas de segundo. | Que Franco lo pida; entonces se hace. |

**Pendiente de Franco, no del código:** volver a poner `ANTHROPIC_API_KEY` en
`~/mktcorp-estatus/.env.local`. Sin ella el asistente de IA y la minuta desde
transcripción no funcionan EN LOCAL; producción no está afectada. El resto de
la app —el camino principal, manual— funciona sin ella.

---

## Cómo se lee este plan

Cada fase se cierra ENTERA antes de abrir la siguiente: se implementa, se
verifica con un print real y se commitea. Dentro de una fase, el orden de los
puntos es el orden de ejecución — están secuenciados por dependencia, no por
importancia.

**No se para entre fases** (Franco, 27-jul): se avanza hasta terminar todo. El
reporte es al final, o cuando algo se bloquee de verdad.

Marcas: **✅ hecho** · **▶ en curso** · **⏸ bloqueado** · **☐ pendiente**

---

## Lo que ya está cerrado

| # | Qué | Origen |
|---|---|---|
| ✅ | La app no depende de la IA: editor manual completo, IA como botón opcional | Franco |
| ✅ | Ocho secciones base fijas + subsecciones dentro | Franco |
| ✅ | Acuerdos y Pendientes es sección única, no bloque con subsección | Franco |
| ✅ | Tabla y matriz se editan como hoja de cálculo, celda a celda | Franco |
| ✅ | Editor de gráfico en tres pasos: datos → escalas → tipo | Franco |
| ✅ | Título con su tipografía real + guardado automático | Franco |
| ✅ | Todos los gráficos animan al entrar en pantalla | Franco |
| ✅ | Cero datos incrustados; la base vaciada; borrar borra de verdad | Franco |
| ✅ | Escala tipográfica y de espaciado; proyección que sí agranda | Auditoría |
| ✅ | Pérdida de datos en cinco campos de texto | Auditoría |
| ✅ | Dato atribuido a la serie equivocada en el gráfico | Auditoría |
| ✅ | Piso de contraste AA; agenda duplicada; estados sin cubrir | Auditoría |

---

## FASE 1 — Cerrar los gráficos ✅ *(cerrada 27-jul)*

**Por qué primero:** es lo único que Franco ha calificado de "horrible", está a
medio arreglar, y contiene el riesgo más alto de toda la lista (punto 1.1). Un
gráfico a medias es peor que uno viejo.

| # | Qué | Por qué importa |
|---|---|---|
| ✅ 1.1 | **Paleta que pasa el validador de daltonismo.** Hoy falla a partir de la 3ª serie en las 10 marcas (dos verdes contiguos, ΔE 0.9–2.4). Elegir cada color por máxima distancia perceptual en vez de rotar el matiz 56°. Con test sobre las 10 salas × 2 superficies. | Hoy no duele porque usamos 2 series. El primer gráfico de 4 sale ilegible **en las diez salas a la vez**, y te enteras en la reunión. |
| ✅ 1.2 | **El doble eje deja de inventar correlaciones.** Dos escalas incomparables no son un gráfico con dos ejes: son dos gráficos apilados que comparten la banda horizontal. | Hoy el punto de Orgánico cae exacto sobre la esquina de la barra de Total en febrero. No es un hallazgo: es que ambos tocan el tope de su eje. El lector concluye algo que el dato no dice. |
| ✅ 1.3 | **Ejes con números redondos** (0/2.000/4.000/6.000/8.000) y aire sobre la barra más alta. | Hoy dicen `0 / 2.415 / 4.829 / 7.244`: nadie estima nada contra 4.829, y la barra más alta toca el borde. |
| ✅ 1.4 | **Tipografía del gráfico al sistema del documento.** Los rótulos van a 9 y 11px fijos dentro de un SVG que escala: en dos columnas caen a 6px. Sacarlos a CSS y pasar el ancho real. | Es la razón de que el gráfico siempre se vea "un poco mal" al lado del texto: no pertenece al sistema tipográfico. |
| ✅ 1.5 | **Alinear el gráfico con la columna del documento.** Hoy empieza 60px a la derecha y termina 247px antes: se lee como una isla pegada. | Mitad de "se ve horrible" es esto, y se nota antes de leer un número. |
| ✅ 1.6 | **Barras al 24% de su carril, no al 59%**, y extremo redondeado con base a escuadra. | Hoy son un bloque de magenta puro; la línea encima parece decoración sobre un fondo rosa. |
| ✅ 1.7 | **Leyenda fuera del SVG, a HTML.** Recupera el 20% del ancho y deja de truncarse a ojo. | El truncado estima el ancho de carácter porque dentro de un SVG no se puede medir texto. |
| ✅ 1.8 | Un negativo en barras horizontales se dibuja como cero pero se rotula negativo. Escala con mínimo y línea de cero. | Mentira silenciosa. Hoy no hay negativos; el esquema los permite. |
| ✅ 1.9 | Eje sin unidad, triple codificación (eje + rejilla + rótulo por barra), y el 90% del plot vacío cuando la variación es del 4%. | Tres defectos del mismo origen: el eje y los rótulos no se coordinan. |

**Se cerró con:** print real de las tres secciones con gráfico (sesión de
prueba sembrada por el mismo camino que el editor, y borrada después) +
validador de paleta en verde para las 10 salas × 2 superficies.

**Lo que apareció al mirar el print, y también se arregló:**

- La faceta de abajo repintaba su primera serie con `--dato-1` —el color que la
  leyenda ya le había dado a la primera de arriba—. Dos series distintas del
  mismo color con una leyenda que decía otra cosa. El color se decide ahora
  arriba, viendo la lista entera (`ranuraColor`).
- El eje de meses se escribía DOS veces, una por faceta. Ahora sólo la de
  abajo; las dos miden igual, que es lo que son: dos magnitudes, no una
  principal y una nota al pie.
- Un tope fijo de ancho de barra dejaba seis palitos de 18 unidades en una
  columna de 960. El tope es ahora proporción del lienzo.
- Las marcas del eje se reparten el alto disponible: cinco números en una
  faceta baja apelotonan lo que venían a ordenar.
- Con líneas el dominio ya no se amplía hasta el múltiplo redondo: los clics
  vivían entre 412 y 635 y el eje llegaba a 800, así que la línea volvía a
  salir casi plana.
- La dona estaba descentrada (se centraba el anillo en el ancho sobrante, no
  el conjunto anillo + leyenda), sin porcentajes y sin total en el hueco.

---

## FASE 2 — Vista previa en el editor ✅ *(cerrada 27-jul)*

**Por qué segundo:** es el problema nº1 de la auditoría de UX, y es lo que hace
que todo lo demás del editor se pueda verificar sin salir de él. Además la
arquitectura ya lo permite sin código nuevo de cliente.

| # | Qué |
|---|---|
| ✅ 2.1 | Panel de vista previa junto al formulario: `maquetarBorrador` ya es puro y síncrono, y `SeccionDocumento` ya es componente de servidor. Se pasa como slot; el formulario no pierde su estado. |
| ✅ 2.2 | Miniaturas por tipo de sección en el selector, para elegir por lo que se ve y no por una línea de texto. |
| ✅ 2.3 | Cambiar de tipo avisa de lo que queda fuera, en vez de esconderlo en silencio. |
| ✅ 2.4 | Deshacer la última acción destructiva (quitar fila, quitar gráfico, cambiar de escalas). |

**Cómo quedó el deshacer:** se arma COMPARANDO el borrador antes y después de
cada cambio, no pidiéndole a cada botón de borrar que avise — quitar una fila,
un gráfico, una columna o un bloque son botones en componentes distintos, y
hacer que todos se acuerden es garantizar que el siguiente no lo haga. La
comparación tuvo que hacerse recursiva: quitar una fila no acorta ninguna
lista de primer nivel (`tablas` sigue teniendo una tabla; lo que menguó es
`tablas[0].filas`), así que la versión superficial no veía nada justo en el
caso más frecuente. Lo encontró un test.

**De paso se cerró 4.3:** desaparecen los ocho botones "Guardar ahora". Eran
una invitación a desconfiar del guardado automático — botones apagados
repartidos por la pantalla que no hacían nada distinto de lo que ya pasaba
solo.

---

## FASE 3 — Las salas ✅ *(cerrada 27-jul, 3.4 a falta de los datos)*

Todo lo que Franco pidió sobre la vista de sala. Blob `archivos-mktcorp`
creado, privado y enlazado — los archivos se sirven por URL firmada desde el
servidor, no por enlace abierto.

**Orden dentro de la fase** (decisión de Franco): las minutas primero, porque
su parte principal —lightbox y transcripción → IA— no necesitaba
almacenamiento.

| # | Qué |
|---|---|
| ✅ 3.0 | **Marcar una sesión como presentada.** Descubierto al montar 3.2, y bloqueaba la fase entera. |
| ✅ 3.1 | **Presentaciones.** Subir archivos con título y fecha para las antiguas. Editar y eliminar la lista. Las nuevas serán URLs de la presentación armada en la app (eso ya existe: `/sesion/[id]`). |
| ✅ 3.2 | **Minutas.** Lista de anteriores + la última. Al pinchar, se abre en lightbox flotante. Botón para cargar transcripción y generar la minuta con IA — el motor ya existe y funciona. |
| ✅ 3.3 | **Archivos de interés.** Presentaciones comerciales, Excel, imágenes, lo que el equipo estime. Mismo módulo de subida que 3.1. |
| ◐ 3.4 | **Benchmark.** Resumen en la sala + vista completa en formato web ✅. **Los datos faltan** — ver abajo. |

**3.4 — qué está hecho y qué falta.** La pantalla entera: el resumen en la
sala (cuántas dimensiones lidera, cuáles son brecha, la lectura y la puerta) y
la vista completa en `/sala/<slug>/benchmark`, con el mismo lenguaje del
documento de una sesión — degradado de marca exacto y sin texto encima, la
conclusión primero y la matriz después. Verificado con datos de prueba, que
se borraron.

**Faltan los datos.** `src/datos/benchmark.ts` es el único sitio de la app con
datos escritos en el código —la excepción que decidió Franco, porque el
análisis competitivo no lo produce esta herramienta— y está VACÍO a propósito:
los competidores reales de cada UDN, sus niveles por dimensión y la lectura de
Mkt Corp salen de la presentación de benchmark que Franco iba a pasar como
referencia. Rellenarlo a ojo produciría un análisis de la competencia
inventado que la app enseñaría al director de la UDN como si fuera trabajo
hecho — la única forma de que esta pantalla haga daño. El archivo lleva
documentado el formato: pegar los datos y aparece.

**3.0 — el eslabón que faltaba.** Nada movía una sesión a `presentada`. El
ciclo es `borrador → lista → presentada → minutada`, pero una sesión maquetada
se quedaba en `lista` para siempre: la sala lista como presentaciones las que
ya sucedieron, así que NINGUNA sesión llegaba nunca a la sala de su UDN, y no
había de dónde nacer una minuta. Toda la fase estaba construida sobre una
lista condenada a estar vacía. Lo dice una persona ("Ya la presentamos", en el
documento), no el sistema: maquetar ocurre días antes y el modo Presentar se
puede ensayar.

**Cómo se verificó:** subida real de un PDF desde el navegador a Blob, su
descarga con sesión (200, bytes correctos, nombre original), su descarga sin
sesión (307 a /entrar) y desde OTRA sala (404, sin confirmar que existe), y
su borrado — que deja la base y el almacén los dos vacíos.

**Deuda que deja abierta (se cierra en 3B.1):** el título y la fecha de una
sesión no se pueden editar, así que todas las de un mismo mes se llaman
"Estatus mensual · Julio de 2026" y llevan la fecha en que se creó el
borrador. En la lista de presentaciones de una sala eso es una columna de
títulos idénticos, y al elegir de qué sesión levantar minuta no hay forma de
distinguirlas. El editor de reuniones (3B.1) es donde la sesión gana fecha y
nombre propios; no se adelanta aquí para no hacerlo dos veces.

---

## FASE 3B — Sesiones, calendario y home ✅ *(cerrada 27-jul)*

Feedback de Franco: el home se ve anticuado y los avisos de sesión salen de la
nada. Va aquí y no antes porque depende de que exista el registro de sesiones,
que es lo primero de la fase.

| # | Qué | Por qué |
|---|---|---|
| ✅ 3B.1 | **Editor de reuniones.** Registrar a mano una sesión: sala, fecha, hora, tipo, integrantes. Outlook queda para después; el modelo de datos se diseña para que integrarlo luego no obligue a rehacerlo. | Hoy "sin sesión aún" y "próxima sesión" se calculan de las sesiones que existen en la base. No hay forma de AGENDAR una sin empezar a prepararla, así que el aviso nunca puede ser verde. |
| ✅ 3B.2 | **Los avisos del home salen de ahí.** "Sin sesión aún" / "próxima sesión" dejan de ser un cálculo indirecto y pasan a leer la reunión agendada. | Es lo que Franco pidió literalmente: que se jalen del editor de reuniones. |
| ✅ 3B.3 | **Calendario** donde el equipo ve las sesiones de un vistazo: mes, las diez salas, qué hay agendado y qué se está preparando. | Diez salas con cadencias distintas no se siguen en una lista. |
| ✅ 3B.4 | **Rediseñar el módulo de salas del home.** Hoy es una lista de filas y se lee anticuado. | Es la primera pantalla de la app. |
| ✅ 3B.5 | **Borrador colaborativo visible.** El guardado automático ya existe y varias personas ya pueden editar la misma sesión. Falta que se VEA: quién llenó qué y cuándo, y que el estado de borrador sea explícito mientras se completa. | Franco: "se deben ir guardando como borrador en la medida que las personas (distintas) vayan completando la info". La mitad ya está; falta la señal. |

---

## FASE 4 — Cerrar el editor ✅ *(cerrada 27-jul, con una salvedad)*

Lo que queda de la auditoría de UX, ordenado por coste/beneficio.

| # | Qué |
|---|---|
| ✅ 4.1 | Índice lateral pegajoso: hoy se navegan ~5.900px a scroll sin mapa. El documento que produce esta herramienta sí tiene índice; la herramienta no. |
| ✅ 4.2 | "Maquetar →" anuncia "~25 s" incluso en una sesión 100% manual, donde el trabajo son microsegundos y el resultado es idéntico al anterior. Etiquetar según si hay algo de IA. |
| ✅ 4.3 | Quitar los ocho botones "Guardar ahora" (se guarda solo) y dejar una barra única de estado + acción. *(hecho en Fase 2)* |
| ✅ 4.4 | El error se enuncia al final de la tarjeta y el campo culpable está al principio. Marcar el campo (`aria-invalid`) y enlazar. |
| ✅ 4.5 | El paso de escalas del gráfico borra la configuración por serie al alternar. |
| ✅ 4.6 | Iconos de tipo de gráfico: hoy son caracteres Unicode que no comunican y cuya cobertura de fuente no está garantizada. Sustituir por SVG (comparte artwork con 2.2). |
| ✅ 4.7 | La pantalla de "Nueva sesión" describe una estructura que ya no existe. |
| ◐ 4.8 | Salto por teclado entre bloques ✅ (lo resuelve el índice lateral). **Flechas ↑↓ optimistas: NO hecho** — ver salvedad. |

**Salvedad de 4.8 — lo que se deja fuera y por qué.** Las flechas ↑↓ siguen
haciendo un viaje al servidor (~200 ms) en vez de mover la tarjeta al
instante como el arrastre. Hacerlas optimistas exige mover el control del
orden desde `TarjetaSeccion` hasta `ListaOrdenable`, y además resolverlo dos
veces: `ListaOrdenable` solo conoce las ocho secciones base, mientras que las
flechas también mueven subsecciones dentro de su bloque. Es reestructurar el
reordenamiento —que hoy funciona, con test— para ahorrar dos décimas de
segundo. Si Franco lo quiere, se hace; no se hizo por iniciativa propia.

---

## FASE 5 — Cascarón y cierre ✅ *(cerrada 27-jul, con una salvedad)*

| # | Qué |
|---|---|
| ✅ 5.1 | `globals.css` deja Arial como tipografía por defecto: todo lo que vive fuera del documento (barra, errores) sale en Arial. Dos tipografías en una app. |
| ✅ 5.2 | Modo oscuro a medio implementar: el cascarón invierte, el documento fuerza superficie clara. O se completa o se retira. |
| ⏸ 5.3 | Logos de portada y cierre. **Bloqueado por activos** — ver salvedad. |

**Salvedad de 5.3 — qué hace falta de Franco.** No están los archivos de logo
de las diez marcas. Se podría dejar el campo `logo` en el tema y el hueco en
portada y cierre, pero eso es código que apunta a archivos que no existen:
código muerto que además parece hecho. Con los SVG (o PNG con fondo
transparente) de las diez salas es media hora de trabajo.
| ✅ 5.4 | Imagen de fondo de la agenda (el campo existe, falta la pieza). |

---

## Decisiones ya tomadas

| Cuándo | Qué | Consecuencia |
|---|---|---|
| 27-jul | Activar Vercel Blob · **SÍ** | Store `archivos-mktcorp` privado y enlazado. Fase 3 desbloqueada. |
| 27-jul | Adelantar el lightbox de minutas · **SÍ** | Fase 3 pasa por delante de la Fase 2. |
| 27-jul | No parar entre fases | Se avanza hasta terminar; el reporte es al final. |

## Pendiente de Franco (no bloquea)

- **`ANTHROPIC_API_KEY` en local.** El CLI de Vercel la borró de `.env.local` al
  enlazar Blob y no se puede recuperar (está encriptada en Production, y el
  `pull` devuelve las encriptadas en blanco). **Producción no se ve afectada.**
  En local, el asistente de IA y la minuta desde transcripción no funcionan
  hasta reponerla.

## Orden final de ejecución

Fase 1 (gráficos) → Fase 3 (salas: minutas → presentaciones → archivos) →
Fase 3B (sesiones, calendario, home) → Fase 2 (vista previa) → Fase 4 (editor)
→ Fase 5 (cascarón) → Benchmark (3.4, lo último).

---
---

# RONDA 2 — Feedback de Franco, 28-jul

Siete cambios. Van aquí, en el mismo documento, porque la regla no cambia: si
algo no está escrito acá, no se está haciendo.

## Lo que pidió, literal

1. **Home** — "estética anticuada, se ve desordenado, esperaría un diseño
   moderno, fino, tipo iOS o Apple". El calendario, generar minutas y Acuerdos
   y Pendientes deben ser **módulos dentro del Home e interactivos**.
2. **Logos** — cada UDN con el suyo cargado.
3. **Sala** — poder preparar una presentación nueva desde dentro de la sala.
4. **Preparar** — el editor mucho más personalizable, y que sirva **para
   cualquier tipo de reunión**, no solo estatus de UDN. Carga de imágenes, no
   por URL.
5. **Minutas** — módulo agnóstico, para cualquier tipo de reunión.
6. **Acceso** — Marketing entra por Slack; el director y el equipo de la UDN
   entran con una **clave** que el sistema reconoce y los lleva a su sala, ya
   cargada. Solo pueden editar acuerdos y pendientes.
7. **Acuerdos y Pendientes** — conectado a Monday, ida y vuelta.

## Dos hallazgos al abrir la carpeta de marca

**Los colores de la app no son los del brandbook 2026.** El tema de Zeus tiene
`#FF004F` como primario; en el brandbook de 2026 ese carmesí es el ACENTO y el
primario es violeta. Research Land igual: la app dice `#1E0FF2` azul eléctrico
y el logo es morado sobre gris pizarra. Cargar los logos sobre los colores de
hoy haría que cada tarjeta chocara consigo misma — el logo violeta de Zeus con
un filo carmesí. Los brandbooks son la fuente y son de 2026; las paletas se
alinean con ellos (6.2).

**Los PNG traen lienzos enormes de transparencia** y proporciones que van de
1:1 a 4,3:1. Puestos en fila sin normalizar, cada logo se vería de un tamaño
distinto. Hay que recortar el margen y componer sobre una caja de altura
común (6.1).

## Qué significa "tipo iOS o Apple", en concreto

Es lo más subjetivo de la lista, así que lo bajo a decisiones verificables —
si no, "moderno" es una opinión y no se puede terminar:

| Hoy | A dónde va |
|---|---|
| Bordes de 1px por todos lados | Superficies que se separan por **sombra y elevación**, no por línea |
| Radios de 0.35–0.9rem, distintos por componente | **Una escala de radio** coherente, más generosa (12/16/20/28) |
| Color de marca en filos y textos sueltos | Color **contenido**: la marca en el logo y en un acento por tarjeta, el resto neutro |
| Tipografía uniforme, sin jerarquía de peso | Escala tipo SF: **tracking negativo en títulos**, interlineado generoso en cuerpo |
| Transiciones lineales de 140ms | **Muelle** (cubic-bezier con rebote corto), y respeto a `prefers-reduced-motion` |
| Densidad de tabla | **Aire**: menos elementos por pantalla, agrupados en tarjetas con jerarquía clara |
| Chips grises indistinguibles | **Materiales**: translúcido sobre fondo, no gris plano |

## La referencia que pasó Franco

`behance.net/gallery/225485473/Callivio-CRM-SaaS-UX-UI-Design`. Mirada de
verdad (capturas), esto es lo que la define y lo que se copia:

| Qué | Cómo |
|---|---|
| **Lienzo** | Casi-blanco frío, nunca blanco puro. El contenido FLOTA encima. |
| **Tarjetas** | Blancas, **sin borde**, radio grande (~24–32px), sombra muy suave y difusa. Papel sobre una mesa iluminada. |
| **Tipografía** | Geométrica. Peso **ligero** en tamaños grandes, tracking cerrado. Contraste brutal de tamaño: la cifra enorme, su unidad y su rótulo diminutos al lado. |
| **La cifra es la protagonista** | "1 108" a tamaño display con "calls" pequeño pegado. Nuestros KPIs y el total de la dona van así. |
| **Micro-rótulos** | Diminutos, con un punto delante (`• Your Score`, `○ Easy`). En minúscula. |
| **Color** | Contenido: un azul apagado para la tarjeta de datos, un lima ácido como ÚNICO destaque, negro para el botón primario. Todo lo demás neutro. |
| **Aire** | Poquísimos elementos por pantalla. El vacío es parte del diseño. |
| **Píldoras** | Rectángulos muy redondeados para etiquetas y navegación; el activo va en negro sólido. |
| **Anillos** | Dona de trazo fino con el valor en una cápsula flotando sobre el arco. |

Lo que NO se copia: su paleta. Las diez marcas ponen el color; la referencia
pone la **estructura** — aire, elevación, radio, jerarquía tipográfica.

---

## FASE 6 — Identidad de marca ✅ *(28-jul)*

Va primera porque desbloquea todo lo visual: el Home lleva logos y la portada
del documento también (era el 5.3 que quedó bloqueado por falta de activos).

| # | Qué |
|---|---|
| ✅ 6.1 | Los 10 logos recortados, normalizados a una caja común y servidos desde el proyecto. Variante color y blanco: sobre el degradado de marca va la blanca. |
| ✅ 6.2 | Paletas alineadas al brandbook 2026 (primario/secundario/acento). Con el validador de contraste y de daltonismo ya existente en verde. |
| ☐ 6.3 | Logo en portada y cierre del documento — cierra el 5.3 pendiente. *(los activos ya están; falta ponerlos en el documento)* |

## FASE 7 — El Home y el sistema visual ✅ *(28-jul)*

La queja principal. El sistema visual es GLOBAL (Franco: "a nivel general"),
no solo el Home.

| # | Qué |
|---|---|
| ✅ 7.1 | Sistema visual: escala de radio, elevación, materiales, tipografía y movimiento, en tokens compartidos. Se aplica a hub, sala, agenda y preparar. |
| ✅ 7.2 | **Calendario como módulo del Home**, interactivo: cambiar de mes y agendar sin salir. |
| ✅ 7.3 | **Acuerdos y Pendientes como módulo del Home**, interactivo: mover estatus y fecha ahí mismo. |
| ✅ 7.4 | **Minutas como módulo del Home**: leer la última y levantar una nueva. |
| ✅ 7.5 | Las tarjetas de sala llevan su logo. |

## FASE 8 — Cualquier tipo de reunión ☐

El cambio arquitectónico de la ronda. Hoy la app da por hecho que una sesión
es el estatus mensual de una UDN: cuelga de una de las diez salas y arranca
con ocho secciones fijas. Las dos cosas dejan de ser ley.

| # | Qué |
|---|---|
| ☐ 8.1 | **Plantillas de reunión.** Las ocho secciones pasan de ley a plantilla ("Estatus de UDN"). Se añaden "Reunión en blanco" y una o dos más. |
| ☐ 8.2 | **Reuniones sin sala.** `salaSlug` deja de ser obligatorio; una reunión libre lleva la identidad de Marketing Corp. |
| ☐ 8.3 | **Minutas agnósticas**: cuelgan de una reunión, sea de sala o no. |
| ☐ 8.4 | **Preparar desde la sala** — lo que pidió en el punto 3. |

## FASE 9 — Imágenes de verdad ☐

| # | Qué |
|---|---|
| ☐ 9.1 | Subir la imagen desde el disco en vez de pegar una URL. Reutiliza el Blob privado y el registro de archivos de la Fase 3. |

## FASE 10 — Acceso y permisos ☐

| # | Qué |
|---|---|
| ☐ 10.1 | Slack para Marketing Corp (el flujo existe a medias; se termina). |
| ☐ 10.2 | **Clave por sala.** Hoy el acceso de un director es un link firmado que caduca; pasa a ser una clave que él teclea y que lo lleva a SU sala. |
| ☐ 10.3 | Permisos: quien entra por clave de sala solo escribe en acuerdos y pendientes. Se comprueba en cada Server Action, no en la pantalla. |

## FASE 11 — Monday, ida y vuelta ☐

Tablero `18044324200` "Marketing Corporativo ⚡", 955 elementos, lo usa el
equipo entero. El mapeo sale de la estructura real del tablero:

| Nuestro campo | Columna de Monday |
|---|---|
| `que` | `name` |
| `salaSlug` | `color_mm0ex2j0` (UdN) |
| `fechaCompromiso` | `date_mm1b10rx` (Deadline) |
| `estatus` | `color_mkz09na` (Fase) |
| `squad` | `color_mkz0s203` (Squad Owner) |
| `responsable` | `person` (people) — **necesita id de usuario de Monday, no un nombre** |

| # | Qué |
|---|---|
| ☐ 11.1 | Lectura: los acuerdos de una sala se leen del tablero. |
| ☐ 11.2 | Escritura: crear y mover acuerdos escribe en Monday. |
| ☐ 11.3 | Conflictos y fallos: qué pasa si Monday no responde o si alguien editó del otro lado. |

**Riesgo declarado:** escribir en ese tablero afecta al equipo entero. La
primera escritura real se prueba sobre un elemento de prueba que se borra
después, y no se activa la escritura general sin decírselo a Franco.

**Hallazgo de la Fase 7, arreglado de paso:** `vencido` solo existía si
alguien lo escribía a mano. Nada lo derivaba de la fecha, así que un
compromiso de hace dos semanas seguía contando como abierto y el hub anunciaba
**cero vencidos con tres encima de la mesa** — justo lo que esa pantalla
existe para evitar. Ahora se deriva al leer (`estatusVigente`), que es donde
el paso del tiempo se nota.

**Orden de ejecución:** `6 → 7 → 8 → 9 → 10 → 11`.
Identidad desbloquea lo visual; lo visual es la queja principal; la
arquitectura agnóstica toca el editor, que es donde más código hay; imágenes
reutiliza lo de la fase 3; acceso y Monday son los dos que salen de la app
hacia afuera y van al final, cuando lo de dentro ya está firme.
