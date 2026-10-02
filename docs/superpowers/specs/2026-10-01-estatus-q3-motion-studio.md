# Estatus Q3 — diagnóstico, escaleta y hoja de movimiento (motion-studio)

Encargo de Franco, 1-oct-2026: auditar y rehacer `/estatus` de corrido. Cecilia la navega sola el 2-oct. Idea que debe llevarse: **«Marketing ya mueve el negocio»**. No se le pide decisión. En datos manda `2026-10-01-estatus-q3-direccion.md`; en orden y composición manda este documento.

## Diagnóstico (versión anterior, mirada en `127.0.0.1:3018`)

1. **Una sola plantilla.** Título arriba, cifra a la izquierda, barras a la derecha, repetida en casi todas las láminas. Ganados y PR son la misma lámina con otros números.
2. **Sin cumbre ni hilo.** El pipeline ($57.16 M en evaluación) pesa lo mismo que cualquier otra lámina. Nada viaja de una sección a otra.
3. **Fondos planos y una sola tipografía.** Púrpura liso o papel liso; Outfit en todo. Sin luz, profundidad ni contraste de carácter.
4. **Vacío sin intención.** El contenido flota a media altura bajo un hueco.
5. **El orden contradice la agenda del equipo.** Los eventos quedaron al final, dentro de «Ejecución Q4».
6. **Dos cifras que parecen errata:** $5.94 M (facturado, GDD) y $5.49 M (ganados, Orbit) en láminas separadas.
7. **Tres cifras cuentan a la vez** en la lectura ejecutiva.

**Lo que funciona y se conserva:** títulos que ya son conclusiones, bajadas, fuente al pie, la lectura ejecutiva con tres cifras, las notas de qué representa cada corte, los detalles en diálogo y todos los datos.

## Escaleta nueva — 24 láminas, en el orden de la agenda del equipo

| # | Lámina | Bloque | Origen | Tono |
|---|---|---|---|---|
| 1 | Portada | — | Se queda, con luz y órbita viva | Oscuro |
| 2 | Lectura del trimestre | Lectura | Se queda; las cifras cuentan de una en una | Oscuro |
| 3 | Tres experiencias | 01 Eventos | **Sube del final al principio** | Oscuro |
| 4 | Kaitai | 01 | Sube | Papel |
| 5 | Campañas de los eventos | 01 | Sube; pasa a papel | Papel |
| 6 | Cinco cortes | 02 Demanda | Rehecha: cinco círculos a la misma escala | Papel |
| 7 | Demanda por UDN | 02 | Se queda; composición lateral | Papel |
| 8 | Marcas en conversación | 02 | Se queda | Lila |
| 9 | Dos cortes de la venta | 03 Pipeline y venta | **Fusión** de facturación y ganados, lado a lado | Papel |
| 10 | **Pipeline — la cumbre** | 03 | Rehecha: tira a escala | Oscuro |
| 11 | PR | 04 PR | Se queda | Papel |
| 12 | Redes | 05 Canales | Se queda | Papel |
| 13 | Paid | 05 | Composición lateral | Papel |
| 14 | Web | 05 | Se queda | Papel |
| 15 | Asistentes de IA | 05 | Pasa a lila | Lila |
| 16 | Artefactos | 06 Artefactos | Se queda | Papel |
| 17 | Materiales | 06 | Se queda | Papel |
| 18 | Del encuentro a la comunidad | 07 Q4 | Se queda | Lila |
| 19 | Inner Circle | 07 | Se queda | Papel |
| 20 | UPAX ONE | 07 | Pasa a papel (es concepto, no momento) | Papel |
| 21 | Research Land + IA | 07 | Se queda | Papel |
| 22 | Agenda de Q4 | 07 | **Fusión** de los dos roadmaps (13 + 10 acciones) | Papel |
| 23 | Equipo | 07 | Se queda | Lila |
| 24 | Cierre | — | Rehecho | Oscuro |

Ninguna área ni UDN sale del cuerpo. Ningún dato nuevo.

## Hoja de movimiento

- **Registro:** escena que se lee con scroll (el tiempo es de quien lee); selectores, índice y filas son producto.
- **Dirección de arte (decidida por Franco):** claras para leer, oscuras para impactar; títulos en serif con itálica (Instrument Serif), Outfit para cifras y texto; coral solo para el dinero y el punto conductor; contraste extremo de escala.
- **Personalidad:** enérgica («vivo y preciso»). Curva de firma `cubic-bezier(0.16, 1, 0.3, 1)`. Tres duraciones: 180 ms (respuesta), 420 ms (paso), 700 ms (héroe). Escalón 60 ms. Una forma de entrar: subir 18 px con fundido; los títulos, por máscara.
- **Hilo conductor: el punto coral.** Nace en la portada orbitando «Q3», viaja al índice lateral y marca en qué bloque está quien lee, y en la cumbre se vuelve la masa coral de lo que está en evaluación. En el cierre llega a «Q4». Coral = el negocio en movimiento.
- **Luz y profundidad:** en láminas oscuras, halo, viñeta y grano; el numeral del bloque, en serif, deriva con el scroll detrás del contenido.
- **Cumbre:** lámina 10. La tira del pipeline crece a escala real desde el tamaño de lo facturado; «Evaluando» ocupa el 84 % en coral. Es la única cifra coral que cuenta.
- **Cifras:** cuenta solo la protagonista de cada lámina; en la lectura ejecutiva, de una en una.
- **Interacción:** elegir una UDN en cualquier gráfico la enciende en todos y atenúa las demás; el índice lateral salta a cualquier bloque.
- **Invariantes:** el servidor pinta el estado final; lo oculto solo existe bajo `data-animar` puesto por JavaScript; impresión y movimiento reducido muestran todo quieto.
- **Límites del contrato:** sin GSAP ni Canvas; CSS, WAAPI y animaciones ligadas al scroll con respaldo.

## Decisiones tomadas sin consultar

Ver la entrega al final de la sesión.

---

## Segunda vuelta, 1-oct-2026 (corrección de Franco y revisor ciego)

El revisor ciego no aprobó la primera vuelta (Dirección 6, Acabado 6): portada y pipeline a nivel de estudio, las 19 láminas claras planas. Franco corrigió el mismo día tres cosas, y **esto sustituye la dirección de arte de arriba**:

1. **«Los colores son muy femeninos, no son para nada UPAX».** Fuera púrpura, lila y coral (venían del contrato de datos, no de la marca). Entra la identidad de `src/temas/grupo-upax.ts`: naranja `#E34714`, magenta `#D72A5A`, azul `#5367E1` sobre índigo. `--naranja-luz` y `--azul-luz` son tintes derivados para que el texto se lea sobre oscuro. El naranja se reserva al pipeline y al punto conductor; el énfasis de los títulos va en azul.
2. **«Faltan imágenes de fondo, estilo glassmorphism con microanimaciones smooth, tipo immersive».** Toda la pieza es oscura. Cada bloque lleva de fondo un key visual o render del propio equipo, muy desenfocado (traen texto incrustado). Los paneles son de vidrio (`backdrop-filter`), con un brillo que sigue al cursor. Curva `cubic-bezier(.22, 1, .36, 1)`; duraciones 220 / 620 / 900 ms; escalón 80 ms.
3. **«Me preocupa que destaques los leads; a Ceci le importa de MQL hacia adelante, con foco en el éxito del pipeline».** La lectura ejecutiva abre con el pipeline. La lámina de demanda muestra cuatro cortes (MQL, SQL, propuestas, ganados); los 29,337 contactos quedan como nota, no desaparecen. El gráfico por UDN ya no ofrece «Contactos» como métrica.

Además: títulos en Outfit, la tipografía de UPAX, en lugar de la serif (decisión propia: con vidrio y marca, la serif se leía ajena). Un solo orden de empresas en todos los gráficos; se resalta la mayor, no la primera. «Seguir una empresa» solo atenúa en los gráficos donde esa empresa aparece. La venta se retituló para que valga en los dos cortes y el 9.4 % de cumplimiento se queda visible, sin tamaño de titular.

**Lo que esta pieza no puede probar con los datos que tiene:** si los $67.76 M de pipeline los originó Marketing o son los del grupo. La tesis «Marketing ya mueve el negocio» depende de esa definición y no está en la fuente.


---

## Tercera vuelta, 1-oct-2026 (segunda revisión ciega y corrección de Franco)

El segundo revisor tampoco aprobó (Dirección 6, Acabado 6.5, Robustez 6). Franco pidió corregir todo lo señalado y cuatro cosas más. **Esto sustituye la dirección de la segunda vuelta:**

1. **«Toda la presentación tiene fondo oscuro, muy feo y repetitivo».** Tres superficies: `claro` (blanca, para leer datos), `foto` (oscura, con fotografía a sangre, para los momentos de impacto) y `color` (el azul de la marca). Las láminas alternan.
2. **«Faltan imágenes».** Doce fotografías de dominio público (CC0), descargadas por la API de Openverse; créditos en `public/estatus-q3/fondos/CREDITOS.md`. Los tres banners oficiales de los eventos los entregó Franco (`banner-kaitai`, `banner-miracle`, `banner-soledad`).
3. **«Falta iconografía».** `IconoQ3` pasa de 8 a 33 iconos de un solo trazo: uno por bloque, por métrica y por canal.
4. **«En los gráficos donde aparezcan las UDN, pon sus logos».** `LogoUdn`: logo a color sobre claro y en blanco sobre foto. En gráficos, matriz de materiales, Inner Circle y agenda.
5. **«Los gráficos de temporalidad, ordénalos por mes».** La agenda de Q4 va en tres columnas —octubre, noviembre, diciembre—; cada acción aparece en el mes en que arranca.

Del revisor: solo cuenta la cifra del pipeline (ya no hay ceros falsos), la cumbre tiene su secuencia propia con el punto naranja, el título de venta no mezcla cortes, la web abre con MQL y pipeline, un solo orden de empresas, «seguir» solo atenúa donde la empresa aparece, PDF con pie completo en las 24 páginas, texto chico más grande, vocabulario unificado («empresas del grupo» / «clientes»), y Equipo ya no es la penúltima lámina.

**Sin resolver, porque depende de la fuente:** la meta contra la que se mide el 9.4 % de cumplimiento; si el pipeline de Orbit lo originó Marketing; y el renglón «Tema por definir» de la agenda.

---

## Cuarta vuelta, 1-oct-2026 (tercera revisión ciega; Franco: «lanza todos los arreglos del revisor»)

El tercer revisor tampoco aprobó (Dirección 7, Coreografía 6.5, Oficio 6.5, Interacción 6, Acabado 6.5, Robustez 7). Se aplicó su lista completa. **Esta versión no se ha vuelto a puntuar con revisor ciego.**

- **Superficies donde importa.** Lo vistoso pasó de alcance e impresiones a MQL en adelante: paid en azul de marca, web y PR sobre fondo de luz; redes y asistentes de IA, en blanco. Las láminas claras ya no llevan foto lateral ni lavado pastel: blanco firme, tarjetas sólidas.
- **Fondos propios.** Se retiraron las fotos de stock ajenas al grupo (Hong Kong, Shibuya, periódicos en inglés, muelle, teléfono). Quedan la sede de Kaitai, cuatro fondos de luz hechos con key visuals y renders del equipo desenfocados, y dos fotos CC0 (pipeline, equipo).
- **El rayo es el primer gesto y el último.** En la portada cae primero, destella, enciende el color y entonces llega el texto. El cierre lleva «Q⚡4» con el mismo rayo.
- **Ninguna cifra cuenta desde cero.** La protagonista se descubre ya con su valor.
- **Pipeline.** Cada etapa tiene su color en la tira y en la leyenda.
- **Seguir a una empresa.** Las filas se ven pulsables; el aviso «Siguiendo a…» vive en la franja del pie, junto al número de página; donde la empresa no aparece, el gráfico lo dice. El título del gráfico nombra la métrica elegida.
- **Logos.** Compensación óptica por logo (House of Films y Marketing United crecen); sigla junto al logo en la matriz y en la agenda.
- **Composición.** Fuera el numeral de capítulo; el contenido se centra en lugar de caer al fondo; la etiqueta de sección va arriba en todas las láminas; la portada enlaza los ocho bloques y lleva contador; los dos renders de UPAX ONE se ven completos; los carteles de eventos sin barras negras y la fecha fuera del cartel.
- **Robustez.** Se quitó el desplazamiento del fondo ligado al scroll (sospechoso del destello de la lámina 18; en doce cuadros seguidos ya no aparece). PDF de 24 páginas, 16.6 MB.

**Sigue sin resolver, porque es dato:** los montos ganados por empresa en Orbit suman $5.51 M redondeados y el titular dice $5.49 M; la meta detrás del 9.4 %; si el pipeline de Orbit lo originó Marketing; «Tema por definir» en la agenda.

---

## Quinta vuelta, 2-oct-2026 (cuarta revisión ciega; Franco: «aplica todo lo que marque el revisor»)

Nota de la versión anterior: Dirección 7, Coreografía 7, Oficio 7, Interacción 7, Acabado 6, Robustez 8 — «no sale todavía». Se aplicó la lista completa. **Esta versión no se ha vuelto a puntuar.**

- **Graves.** El scroll encuadra una lámina por pantalla (`scroll-snap` obligatorio desde 900 px) y AvPág, RePág, Espacio y flechas llevan a la lámina siguiente o anterior. En «Costo por MQL» se resalta el menor, no el mayor (`mejor: 'menor'`). La tira del pipeline usa azul y magenta de marca, sin pasteles.
- **Medios.** Cifras grandes sin tracking negativo; matriz de materiales en retícula fija; un solo orden de empresas también en la matriz y en Inner Circle (`ORDEN_UDN` vive en `LogoUdn.tsx`); tarjetas con el contenido a la misma altura; el cierre con el logo junto a «Q⚡4»; agenda centrada, con logos sin sigla; el aviso «no aparece en este corte» va en la cabecera del gráfico y no mueve la lámina; filas de alto fijo y cifra en columna fija; seguir a una empresa atenúa al 60 %; la cumbre tiene una sola cifra héroe y dice su relación con el total (el título pasa a porcentaje); fondos: dos de luz, dos planos con un solo acento, una foto propia y el degradado del rayo en el cierre; la lámina 18 entra en secuencia.
- **Menores.** Diálogos en blanco frío con montos a la derecha; chips de portada en una línea; carteles con bordes fundidos; pie de los renders de UPAX ONE sobre un velo que tapa el texto incrustado; PDF de 8.7 MB (imágenes pesadas a JPEG).

**Límite conocido:** con rueda de ratón de un solo paso, el encuadre obligatorio devuelve a la lámina actual; hay que girar más de media pantalla. Con trackpad, teclado e índice avanza bien.

---

## Sexta vuelta, 2-oct-2026 (revisión del equipo, lámina por lámina)

Franco revisó la pieza con el equipo (grabación «Cambios presentación estatus Q3», 46.8 min) y pidió aplicar todo. Esto es lo que cambió y de dónde sale cada dato.

**Cifras.** César leyó de Orbit (vista MBR, «generado por Marketing», trimestre pasado): pipeline $71.55 M en 132 negocios, ticket promedio $542,050; 361 MQL, 114 SQL, 106 propuestas, 16 ganados; paid 228 MQL, 35 SQL y $29.53 M de pipeline. Los desgloses que la sesión no dictó completos (pipeline por etapa y por empresa, SQL de paid por empresa, facturado por empresa) salen de la misma fuente de Orbit: la hoja `Concentrado_V3` de RevOps, leída el 2-oct. Esa lectura reproduce los totales dictados (132 / $71.55 M / $542,052; 114 SQL; 106 propuestas; 16 ganados por $5.49 M; $5.94 M facturados; 228 y 35 de paid; $29.53 M de pipeline de paid).

**Tres cosas que la fuente mostró y la sesión no:**
1. Los totales de Orbit incluyen a las otras unidades del grupo, que la pieza no desglosa: 22 negocios por $1.68 M de pipeline, 16 SQL, 3 propuestas y $1.17 M del pipeline de paid. Cada lámina lo dice en una línea.
2. Los dos cortes de venta se traslapan: 6 de los 16 negocios ganados en Q3 también se facturaron en Q3 ($0.95 M), así que ya están en los $5.94 M. La venta generada sin contar dos veces es $10.49 M en 24 negocios, no $11.43 M. De los 16 ganados, 8 siguen por facturar ($4.49 M).
3. El «facturado y por facturar» de paid, sin duplicar, es $5.57 M (el borrador decía $6.14 M, que suma los dos cortes).

**Sin resolver, porque depende del equipo:** los 361 MQL son la cifra que dictó César; la fuente, leída después, da 351 en las siete empresas y 380 con las otras unidades. Kaitai sigue con el corte del 30-sep (64); el equipo dijo 75 al 2-oct pero no pasó el desglose por empresa. La matriz de materiales espera el archivo de David. La serie de seguidores por mes no existe todavía (César verá cómo guardarla). El 9.4 % de cumplimiento sigue sin meta declarada.

**Cambios de orden y de forma.** Empresas en orden alfabético en toda la pieza (`ORDEN_UDN`). La demanda por empresa abre en MQL y sigue el funnel. El funnel lleva la tasa real de cada paso contra la ideal (30 / 80 / 20 %). La venta lleva el total en el título. El pipeline se reenfoca: lo que avanza (evaluación) y lo que nos toca (más demanda en House of Films, Mexa Creativa y UiX). PR separa a Research Land. Web abre en visitas. Artefactos abre con el simulador. Equipo sube antes de «qué hacemos en Q4». Inner Circle se explica (qué es, cómo se entra, qué reciben, meta de 100) con la invitación a la vista, y los tres temas por empresa ya no se esconden tras un clic. UPAX ONE dice cuándo, para cuántos y qué se vive. El cierre es una ruta de tres tramos que desemboca en «Q⚡4»; el logo ya no se encima.

**El defecto de la pestaña «Visitas».** El índice lateral reservaba el ancho de sus nombres aunque fueran invisibles: una franja de ~175 px, centrada en vertical, que recibía los clics de lo que quedara debajo. La última pestaña de un gráfico caía ahí. Reproducido con el índice anterior a 1366, 1440 y 1920 px; con el nombre fuera del flujo, las 14 pestañas responden a clics reales en los tres anchos.

**Hilo y cumbre.** El rayo sigue siendo el primer gesto y el último. La cumbre sigue en el pipeline, ahora con la tensión que el equipo pidió: no solo la buena noticia.
