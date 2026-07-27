# Brecha entre la app y un deck real

Referencia: `MC | Minuta Comité Mensual Junio Mkt Corp.pdf` — el estatus de junio
2026 de **Mexa Creativa**, 15 páginas, el material que Mkt Corp presentó de
verdad. Objetivo fijado por Franco (27-jul): reproducirlo en la app **sin que
falte nada, ni un gráfico**.

Este documento es el inventario. Cada fila es una pieza del deck real y lo que
hace falta para levantarla.

## Las 15 páginas

| # | Página | Qué la compone | Estado |
|---|---|---|---|
| 1 | Portada | Título + periodo + logo de la UDN + logo M/C sobre el degradado de marca | Layout OK · faltan logos |
| 2 | Agenda | Lista numerada de 4 puntos sobre una tarjeta, con **imagen de fondo** | Layout OK · falta imagen de fondo |
| 3 | Divisor | "Acuerdos y pendientes sesión pasada" | ✅ |
| 4 | **Pendientes** | Tabla RESPONSABLE · TAREA · ESTATUS con **semáforo** (listo / en proceso / no realizado), responsable **agrupado** con varias tareas, y leyenda | ❌ layout `pendientes-semaforo` sin implementar |
| 5 | Divisor | "Portafolio & ecosistema" | ✅ |
| 6 | Herramientas comerciales | Dos columnas con **listas anidadas de 3 niveles** (servicio → industria) y fechas en el encabezado | ⚠️ `texto-multicolumna` solo admite viñetas planas |
| 7 | Divisor | "Performance & conversión" | ✅ |
| 8 | Performance sitio web I | **Tabla comparativa Mayo\|Junio** (5 métricas) + insights con **sub-viñetas y enlaces** + **2 gráficos**: combo barras/líneas con doble eje y meta, y barras horizontales agrupadas | ❌ falta todo salvo el texto |
| 9 | Performance sitio web II | 4 KPIs con delta + dos columnas (hallazgos / acciones) + **nota al pie** | ⚠️ falta la nota al pie |
| 10 | Performance paid media | **Gráfico de 4 series con doble eje y etiquetas de dato** + tabla comparativa + **tabla Estado de MQLs con fila de total** + bloque de texto "Venta" | ❌ |
| 11 | Divisor | "Outbound & pipeline" | ✅ |
| 12 | Outbound & pipeline | Bloque **Meta / Real / %** con desglose (Total, Mkt, Ventas) + lista de cuentas en dos columnas + tarjeta de pipeline con **cifras jerárquicas** (Mkt / Comercial) y unidades MDP/K | ❌ layout `meta-real-porcentaje` sin implementar |
| 13 | Focos Q3 I | 4 bloques numerados: título con prioridad + párrafo + viñetas + "Oferta gancho" | ❌ layout `tarjetas-numeradas` sin implementar |
| 14 | Focos Q3 II | Bloque 5 + **matriz calendario** industrias × meses con estados (Explora/Prepara/Vende/Espera), barras de ciclo y leyenda | ❌ layout `matriz-estados` sin implementar |
| 15 | Cierre | Logo Grupo UPAX + las 8 marcas | Layout OK · faltan logos |

## Lo que falta, por capa

### 1. Contenido que el esquema no sabe representar

El contrato de `src/decision/esquema.ts` solo tiene `kpis`, `columnas`, `cuerpo`,
`grafico.serie` (un nombre suelto que nada resuelve) e `imagen`. Falta:

- **Tabla de datos** — filas y columnas con encabezado, y fila de total opcional
  (págs. 8, 10). Aparece tres veces en un solo deck: es la pieza que más se repite.
- **Serie de datos real** para los gráficos: hoy `grafico.serie` es una etiqueta
  que no lleva a ningún dato. Sin esto no hay gráfico posible.
- **Viñetas anidadas** (pág. 6) — hoy `puntos: string[]`, plano.
- **Enlaces dentro del texto** (pág. 8).
- **Nota al pie** (pág. 9).
- **Estado tipo semáforo** por fila (pág. 4).
- **Cifras con desglose** — un total con sus partes (pág. 12).

### 2. Layouts declarados en el enum pero nunca construidos

`pendientes-semaforo` · `comparativa-periodos` · `grafico-y-tabla` ·
`meta-real-porcentaje` · `matriz-estados` · `tarjetas-numeradas`

Seis de trece. El motor no puede elegirlos porque `catalogo.ts` deriva los
disponibles de `REGISTRO_LAYOUTS`, así que hoy son nombres muertos.

### 3. Gráficos

Solo existe `BarrasComparadas`. El deck real usa tres tipos más:

- **Combo** barras + líneas con **doble eje** y línea de meta (pág. 8)
- **Barras horizontales agrupadas** — dos periodos por canal (pág. 8)
- **Líneas múltiples con doble eje** y etiqueta sobre cada punto (pág. 10)

### 4. El cuestionario

Hoy captura texto, cifras (`valor | rótulo | delta`) y una nota. No hay forma de
meter una tabla, una serie temporal, una lista anidada, un semáforo ni una
matriz — es decir, **la mayor parte de este deck no se puede ni capturar**, antes
de hablar de cómo se maqueta.

## Orden de ataque

1. **Esquema y captura** — sin poder representar y capturar tabla y serie, nada
   de lo demás se sostiene.
2. **Gráficos** — los tres tipos que faltan.
3. **Layouts** — los seis que faltan.
4. **Reproducción** — cargar el contenido real de Mexa Creativa y comparar
   página por página contra el PDF.

---

# Cierre (27-jul-2026)

Las cuatro etapas están hechas. La sesión completa se ve en `/demo/mexa-creativa`
y su transcripción vive en `src/fixtures/mc-junio-2026.ts`, con un test que falla
si alguna de sus quince páginas deja de caber en el contrato.

## Lo que cambió

**Contrato** (`src/decision/esquema.ts`). Entraron `tablas`, `matriz`,
`metaReal`, `cifrasDesglosadas`, `bloques` y `notaPie`; `grafico` (uno) pasó a
`graficos` (hasta dos, que es lo que pide la pág. 8); `Grafico` dejó de ser una
etiqueta suelta y ahora lleva `periodos` + `series` con números de verdad; y
`Columna.puntos` pasó de `string[]` a viñetas que cuelgan de sí mismas.

**Captura**. Una tabla pegada ya no se destruye: `normalizar` la conserva entera
como pieza `[tabla]` en vez de trocearla en series, y el cuestionario admite
pegarla directo desde Sheets (tabulador) o escribirla con barras. También admite
imagen, que estaba en el tipo pero no tenía campo.

**Gráficos**. `BarrasComparadas` se convirtió en `GraficoCartesiano` (barras,
líneas, área, doble eje, meta punteada, etiquetas de dato) y se sumaron
`BarrasHorizontales` y `Dona`. Un despachador exhaustivo cubre los nueve tipos
del enum: ninguno se queda sin dibujo.

**Layouts**. Los seis nombres muertos se construyeron como secciones de
documento, no como diapositivas. El catálogo del motor dejó de colgar del
registro del deck 16:9 —que ya no era la ruta que se presenta— y ahora sale de
`componentes/sesion/catalogo-documento.ts`. Un test comprueba que no vuelva a
haber layouts declarados que nadie dibuja.

**Se borró `src/componentes/deck/`**. Mantener dos sistemas de maquetación
obligaba a construir cada layout dos veces, y el de diapositivas ya no se usaba
en ninguna ruta real. `/demo` y `/motor-demo` pasaron al documento.

## Lo que la reproducción destapó

Cosas que solo aparecen cuando se mete contenido real:

- `cifrasDesglosadas` topaba en 4 y el bloque de pipeline trae 6.
- Una celda de tabla no podía ir vacía, pero en la tabla de pendientes real hay
  estatus sin llenar; y el encabezado de una comparativa (`"", "Mayo", "Junio"`)
  tampoco, aunque el propio ejemplo del esquema lo pedía.
- `Vineta.enlace` usaba `z.string().url()`, que da por buena `javascript:alert(1)`
  — iba directo a un `href`. Ahora pasa por el mismo validador que `imagen`.
- Las celdas de texto se alineaban a la derecha por ser "columna de datos": la
  columna TAREA de pendientes quedaba ilegible. La alineación se decide ahora por
  el contenido de cada celda.
- Dos series con etiqueta de dato se pisaban en el mismo punto.

## Lo que falta

- **Logos** en portada y cierre (págs. 1 y 15). El PDF los lleva; el documento
  todavía no tiene dónde ponerlos.
- **Imagen de fondo** de la agenda (pág. 2). El campo existe y el layout la
  admite; falta la pieza.
- **Dos series del PDF sin transcribir**, por no inventar cifras: los seis meses
  del gráfico de paid media (etiquetas ilegibles) y los valores del gráfico de
  canales (el original no los rotula; los del fixture están leídos contra su
  eje). La app las dibuja — falta el dato.
