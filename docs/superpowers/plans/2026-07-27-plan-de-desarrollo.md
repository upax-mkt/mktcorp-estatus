# Plan de desarrollo · mktcorp-estatus

**Fuente única de qué falta, en qué orden y por qué.** Todo feedback de Franco y
todo hallazgo de auditoría entra aquí antes de tocar código. Si algo no está en
este documento, no se está haciendo.

Estado del repo: rama `editor-de-secciones`, 457 tests, build y lint limpios.

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

## FASE 3 — Las salas ▶ *(3.0–3.3 cerradas; queda 3.4, que va al final)*

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
| ☐ 3.4 | **Benchmark.** Resumen en la sala + vista completa en formato web, con el mismo lenguaje que el documento de presentación. **Esta info sí será incrustada, y es lo último que se hace** (decisión de Franco). |

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

## FASE 4 — Cerrar el editor ☐

Lo que queda de la auditoría de UX, ordenado por coste/beneficio.

| # | Qué |
|---|---|
| ☐ 4.1 | Índice lateral pegajoso: hoy se navegan ~5.900px a scroll sin mapa. El documento que produce esta herramienta sí tiene índice; la herramienta no. |
| ☐ 4.2 | "Maquetar →" anuncia "~25 s" incluso en una sesión 100% manual, donde el trabajo son microsegundos y el resultado es idéntico al anterior. Etiquetar según si hay algo de IA. |
| ✅ 4.3 | Quitar los ocho botones "Guardar ahora" (se guarda solo) y dejar una barra única de estado + acción. *(hecho en Fase 2)* |
| ☐ 4.4 | El error se enuncia al final de la tarjeta y el campo culpable está al principio. Marcar el campo (`aria-invalid`) y enlazar. |
| ☐ 4.5 | El paso de escalas del gráfico borra la configuración por serie al alternar. |
| ☐ 4.6 | Iconos de tipo de gráfico: hoy son caracteres Unicode que no comunican y cuya cobertura de fuente no está garantizada. Sustituir por SVG (comparte artwork con 2.2). |
| ☐ 4.7 | La pantalla de "Nueva sesión" describe una estructura que ya no existe. |
| ☐ 4.8 | Salto por teclado entre bloques; las flechas ↑↓ optimistas como el arrastre. |

---

## FASE 5 — Cascarón y cierre ☐

| # | Qué |
|---|---|
| ☐ 5.1 | `globals.css` deja Arial como tipografía por defecto: todo lo que vive fuera del documento (barra, errores) sale en Arial. Dos tipografías en una app. |
| ☐ 5.2 | Modo oscuro a medio implementar: el cascarón invierte, el documento fuerza superficie clara. O se completa o se retira. |
| ☐ 5.3 | Logos de portada y cierre — el deck real los lleva y el documento no tiene dónde ponerlos. |
| ☐ 5.4 | Imagen de fondo de la agenda (el campo existe, falta la pieza). |

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
