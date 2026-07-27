# Plan de desarrollo · mktcorp-estatus

**Fuente única de qué falta, en qué orden y por qué.** Todo feedback de Franco y
todo hallazgo de auditoría entra aquí antes de tocar código. Si algo no está en
este documento, no se está haciendo.

Estado del repo: rama `editor-de-secciones`, 457 tests, build y lint limpios.

---

## Cómo se lee este plan

Cada fase se cierra ENTERA antes de abrir la siguiente: se implementa, se
verifica con un print real, se commitea y se reporta. Nada de saltar entre
fases. Dentro de una fase, el orden de los puntos es el orden de ejecución —
están secuenciados por dependencia, no por importancia.

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

## FASE 1 — Cerrar los gráficos ▶

**Por qué primero:** es lo único que Franco ha calificado de "horrible", está a
medio arreglar, y contiene el riesgo más alto de toda la lista (punto 1.1). Un
gráfico a medias es peor que uno viejo.

| # | Qué | Por qué importa |
|---|---|---|
| ☐ 1.1 | **Paleta que pasa el validador de daltonismo.** Hoy falla a partir de la 3ª serie en las 10 marcas (dos verdes contiguos, ΔE 0.9–2.4). Elegir cada color por máxima distancia perceptual en vez de rotar el matiz 56°. Con test sobre las 10 salas × 2 superficies. | Hoy no duele porque usamos 2 series. El primer gráfico de 4 sale ilegible **en las diez salas a la vez**, y te enteras en la reunión. |
| ☐ 1.2 | **El doble eje deja de inventar correlaciones.** Dos escalas incomparables no son un gráfico con dos ejes: son dos gráficos apilados que comparten la banda horizontal. | Hoy el punto de Orgánico cae exacto sobre la esquina de la barra de Total en febrero. No es un hallazgo: es que ambos tocan el tope de su eje. El lector concluye algo que el dato no dice. |
| ☐ 1.3 | **Ejes con números redondos** (0/2.000/4.000/6.000/8.000) y aire sobre la barra más alta. | Hoy dicen `0 / 2.415 / 4.829 / 7.244`: nadie estima nada contra 4.829, y la barra más alta toca el borde. |
| ☐ 1.4 | **Tipografía del gráfico al sistema del documento.** Los rótulos van a 9 y 11px fijos dentro de un SVG que escala: en dos columnas caen a 6px. Sacarlos a CSS y pasar el ancho real. | Es la razón de que el gráfico siempre se vea "un poco mal" al lado del texto: no pertenece al sistema tipográfico. |
| ☐ 1.5 | **Alinear el gráfico con la columna del documento.** Hoy empieza 60px a la derecha y termina 247px antes: se lee como una isla pegada. | Mitad de "se ve horrible" es esto, y se nota antes de leer un número. |
| ☐ 1.6 | **Barras al 24% de su carril, no al 59%**, y extremo redondeado con base a escuadra. | Hoy son un bloque de magenta puro; la línea encima parece decoración sobre un fondo rosa. |
| ☐ 1.7 | **Leyenda fuera del SVG, a HTML.** Recupera el 20% del ancho y deja de truncarse a ojo. | El truncado estima el ancho de carácter porque dentro de un SVG no se puede medir texto. |
| ☐ 1.8 | Un negativo en barras horizontales se dibuja como cero pero se rotula negativo. Escala con mínimo y línea de cero. | Mentira silenciosa. Hoy no hay negativos; el esquema los permite. |
| ☐ 1.9 | Eje sin unidad, triple codificación (eje + rejilla + rótulo por barra), y el 90% del plot vacío cuando la variación es del 4%. | Tres defectos del mismo origen: el eje y los rótulos no se coordinan. |

**Se cierra con:** print de las tres secciones con gráfico + el validador de
paleta en verde para las 10 salas.

---

## FASE 2 — Vista previa en el editor ☐

**Por qué segundo:** es el problema nº1 de la auditoría de UX, y es lo que hace
que todo lo demás del editor se pueda verificar sin salir de él. Además la
arquitectura ya lo permite sin código nuevo de cliente.

| # | Qué |
|---|---|
| ☐ 2.1 | Panel de vista previa junto al formulario: `maquetarBorrador` ya es puro y síncrono, y `SeccionDocumento` ya es componente de servidor. Se pasa como slot; el formulario no pierde su estado. |
| ☐ 2.2 | Miniaturas por tipo de sección en el selector, para elegir por lo que se ve y no por una línea de texto. |
| ☐ 2.3 | Cambiar de tipo avisa de lo que queda fuera, en vez de esconderlo en silencio. |
| ☐ 2.4 | Deshacer la última acción destructiva (quitar fila, quitar gráfico, cambiar de escalas). |

---

## FASE 3 — Las salas ⏸ *(bloqueado: almacenamiento)*

Todo lo que Franco pidió sobre la vista de sala. **Bloqueado por Vercel Blob**:
sin almacenamiento no hay subida de archivos, y tres de los cuatro módulos la
necesitan. Provisionarlo es dar de alta un servicio en la cuenta de Franco.

| # | Qué |
|---|---|
| ⏸ 3.1 | **Presentaciones.** Subir archivos con título y fecha para las antiguas. Editar y eliminar la lista. Las nuevas serán URLs de la presentación armada en la app (eso ya existe: `/sesion/[id]`). |
| ⏸ 3.2 | **Minutas.** Lista de anteriores + la última. Al pinchar, se abre en lightbox flotante. Botón para cargar transcripción y generar la minuta con IA — el motor ya existe y funciona. |
| ⏸ 3.3 | **Archivos de interés.** Presentaciones comerciales, Excel, imágenes, lo que el equipo estime. Mismo módulo de subida que 3.1. |
| ☐ 3.4 | **Benchmark.** Resumen en la sala + vista completa en formato web, con el mismo lenguaje que el documento de presentación. **Esta info sí será incrustada, y es lo último que se hace** (decisión de Franco). |

**Nota de 3.2:** el lightbox y el botón de transcripción NO necesitan
almacenamiento — la minuta es texto y ya se guarda en la base. Esa parte puede
adelantarse si Franco prefiere no activar Blob todavía.

---

## FASE 4 — Cerrar el editor ☐

Lo que queda de la auditoría de UX, ordenado por coste/beneficio.

| # | Qué |
|---|---|
| ☐ 4.1 | Índice lateral pegajoso: hoy se navegan ~5.900px a scroll sin mapa. El documento que produce esta herramienta sí tiene índice; la herramienta no. |
| ☐ 4.2 | "Maquetar →" anuncia "~25 s" incluso en una sesión 100% manual, donde el trabajo son microsegundos y el resultado es idéntico al anterior. Etiquetar según si hay algo de IA. |
| ☐ 4.3 | Quitar los ocho botones "Guardar ahora" (se guarda solo) y dejar una barra única de estado + acción. |
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

## Decisiones que necesito de Franco

1. **¿Activo Vercel Blob?** Desbloquea la Fase 3 entera menos el benchmark. Lo
   provisiono yo por CLI, como hice con Neon, pero da de alta un servicio en su
   cuenta.
2. **¿Adelanto el lightbox de minutas** (3.2 sin subida) antes que la Fase 2, o
   se respeta el orden?

Mientras no haya respuesta, se ejecuta la Fase 1 completa.
