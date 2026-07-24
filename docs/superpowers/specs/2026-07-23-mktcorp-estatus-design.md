# mktcorp-estatus — sistema de estatus de Mkt Corp a las salas

**Proyecto:** `mktcorp-estatus`
**Repo:** `upax-mkt/mktcorp-estatus` · **Vercel:** `mktcorp-estatus`
**Fecha:** 23-jul-2026
**Autor del diseño:** Franco Cruzat (CMO) con Claude
**Estado:** aprobado para plan de implementación

---

## 1. El problema

Marketing Corporativo sostiene reuniones de estatus con las 8 UDNs, con Ceci y con Grupo UPAX. Hoy ese ciclo vive disperso: la presentación se arma a mano en Slides, se exporta a PDF, se adjunta por correo junto con una minuta escrita a mano, y los acuerdos quedan en una tabla dentro de ese correo. Nadie puede responder, sin abrir tres archivos viejos, qué se acordó hace dos meses ni si se cumplió.

Tres consecuencias concretas, verificadas en la sesión de NeraCode de junio de 2026:

- **Los acuerdos no tienen vida.** Ocho acuerdos en la minuta, cinco con fecha "Por definir". Su estatus solo existe si alguien lo recuerda y lo escribe en la siguiente presentación.
- **Los gráficos son capturas.** Cada gráfico del deck es una imagen pegada de Looker, Sheets o Google Ads: tipografías ajenas, azules de Google, leyendas ilegibles, tres estilos distintos en la misma presentación.
- **Preparar es artesanal.** Cada sesión se arma desde cero o clonando la anterior, sin garantía de que la estructura sea la misma entre UDNs.

## 2. Qué es y qué no es

**Es** el sistema donde vive el ciclo completo de una sesión de estatus: preparar → maquetar → presentar → minutar → archivar. Y es la sala permanente donde cada UDN consulta su histórico y sus acuerdos vivos.

**No es** un dashboard de KPIs (eso ya existe en `upax-dashboard-monday` y `upax-performance-hub`), ni un gestor de tareas (eso es Monday), ni un editor libre de presentaciones.

## 3. Actores y acceso

| Actor | Quién | Acceso | Puede |
|---|---|---|---|
| **Equipo Mkt Corp** | ~24 personas, 6 squads | **SSO de Slack** | Todo: crear estructuras, preparar sesiones, maquetar, presentar, minutar, mover acuerdos |
| **Sala (UDN / Ceci / UPAX)** | Director de cada entidad y sus invitados | **Link con token, sin login** | Solo ver: deck actual, histórico, acuerdos con estatus, minutas. Exportar a PDF |

Mkt Corp es **área staff y emisor**: no tiene sala propia porque no recibe estatus de nadie. Su logo aparece como firma discreta en cada deck.

**Las 10 salas:** Research Land · Promo Espacio · Mexa Creativa · Marketing United · House of Films · UiX · NeraCode · Zeus · Ceci · Grupo UPAX.

## 4. Modelo de datos

### Sala
Las 10 entidades receptoras. Fijas: no se crean ni se borran desde la app. Cada una tiene su tema visual y su token permanente.

### Estructura
La plantilla de agenda: qué items lleva una sesión, en qué orden, y qué pregunta cada item.
- Se define por **tipo** (semanal / mensual) y **alcance** (todos los squads / squads específicos / tema puntual).
- Las precargadas son **oficiales**: no se pueden borrar, solo clonar y modificar.
- Cualquiera del equipo puede crear y editar estructuras.
- **Versionada:** editar una estructura no altera las sesiones ya creadas con ella.

### Sesión
Una reunión concreta: sala + fecha + tipo + alcance + copia congelada de la estructura.
Estados: `borrador` → `lista` → `presentada` → `minutada`. El estado gobierna qué ve el equipo, qué ve la sala y qué puede editarse.

### Item
Un slide contestado, dentro de una sesión. Guarda **dos capas separadas**:
- **Contenido cargado** — lo que escribió el equipo: cifras, textos, imágenes, notas dirigidas a la IA. Nunca se modifica.
- **Decisión de maquetación** — lo que resolvió el motor: layout, asignación a huecos, tipo de gráfico, textos recortados.

Separarlas permite re-maquetar sin recapturar, mostrar qué cambió la IA y restaurar el texto original.

### Acuerdo
**Pertenece a la sala, no a la sesión.** Nace en una sesión y sobrevive a todas las siguientes.
Campos: qué, responsable, squad, prioridad, fecha compromiso, estatus (`abierto` / `cumplido` / `vencido` / `cancelado`) e historia de cambios.
Solo el equipo Mkt Corp mueve el estatus, desde la vista interna.

> **Decisión estructural:** si el acuerdo colgara de la sesión, responder "acuerdos pasados y su estatus" obligaría a recorrer todas las sesiones. Colgándolo de la sala, se resuelve en una consulta y la siguiente sesión arranca con los pendientes puestos.

### Minuta
Ligada a una sesión. Guarda la transcripción original, el texto final editado y a quién se envió.

## 5. El hub

La pantalla que se abre cada mañana. La unidad no es el documento: es **la relación con cada sala**.

**Vista interna:**
- **Rejilla de las 10 salas** — cada tarjeta con el color de esa entidad: días desde la última sesión, acuerdos abiertos y vencidos, si hay algo en preparación. La temperatura cambia sola: reciente → tibia → fría. Sin que nadie reporte nada, se ve quién está desatendido.
- **Calendario** — sesiones agendadas y celebradas, por mes y semana.
- **Acuerdos en riesgo** — todo lo vencido o que vence esta semana, cruzando las 10 salas, con su dueño.
- **En preparación** — borradores con barra de avance y quién los está armando, para que dos personas no preparen lo mismo.
- **Pulso del mes** — sesiones celebradas, acuerdos cerrados vs abiertos, sala más activa y más silenciosa.

**Vista de sala:** portada con próxima sesión y días desde la última · sus acuerdos con estatus **antes** que las presentaciones · el deck más reciente · línea de tiempo de los anteriores · minutas archivadas · su **Benchmark** (ver abajo). Nada de la maquinaria interna.

### Benchmark competitivo (por sala)

Cada sala tiene un espacio **Benchmark**: el análisis competitivo que Marketing Corporativo desarrolló para esa unidad de negocio, siguiendo **5 competidores** por UDN. No es contenido de una sesión — vive a nivel de la sala, como los acuerdos, y **se nutre en el tiempo** (Mkt Corp lo actualiza conforme evoluciona el mercado). El director entra a su sala y consulta cómo está su UDN frente a sus competidores, sin depender de una reunión.

Modelo de datos (preliminar): pertenece a la **sala**, no a la sesión; guarda los 5 competidores seguidos, las dimensiones comparadas, la lectura de Mkt Corp, y un historial de actualizaciones (para ver la evolución). Editable solo por el equipo interno; visible para el director en su sala.

> **[PENDIENTE — a la espera de referencia]** Franco (24-jul-2026) pidió este espacio y va a pasar la **presentación de benchmark que Mkt Corp ya armó** como ejemplo. Igual que con el deck de NeraCode, esa referencia real define las dimensiones, la estructura y el look antes de diseñar el componente — no se construye por suposición. Al recibirla: extraer las dimensiones reales del benchmark, decidir si el Benchmark reutiliza el motor de maquetación o es una vista propia, y añadir su plan. Es trabajo de una fase posterior; no bloquea la Fase 2.

## 6. Preparar una sesión

**Paso 1 · Tablero de estructura.** Eliges sala, tipo y alcance; la app tiende la agenda como fichas sobre un lienzo horizontal. Se arrastra para reordenar, se jalan fichas nuevas desde la biblioteca lateral, se saca una fuera para eliminarla. Contador vivo arriba: *11 slides · ~18 min*. La ficha de **acuerdos previos entra sola y no se puede quitar**.

**Paso 2 · Llenado.** Pila de tarjetas, una pregunta a la vez, avance por scroll. Acepta texto crudo sin formato, imágenes arrastradas sobre la tarjeta y tablas pegadas de Excel que se convierten en datos. Cada item admite campos extra y una **nota dirigida a la IA** ("esto va destacado", "no menciones el retraso"). Se puede saltar y volver.

**Paso 3 · Maquetar.** Un botón. Sale el deck completo con el tema de esa sala. En la revisión, cada slide muestra qué decidió el motor y por qué, con dos acciones: *otra opción de layout* y *devuélveme mi texto original*.

**Paso 4 · Presentar.** Pantalla completa, avance con clicker o teclado, notas del presentador solo para quien presenta.

**Sobre el movimiento:** existe para explicar, no para lucirse. La ficha que se levanta indica que la tomaste; el hueco que se abre, dónde va a caer; el contador que sube, lo que acabas de agregar. Entre 150 y 250 ms, nunca bloqueantes.

## 7. El motor de maquetación

Cuatro etapas. **Solo una es IA, y esa jamás escribe estilo.**

### Etapa 1 · Normalizar (código)
Entra lo que pegó el equipo. Un parser determinista detecta qué es cada cosa y produce un **inventario tipado**: serie temporal, comparativo entre periodos, cifra con delta, lista, párrafo, imagen.
No se le pregunta a la IA lo que un parser resuelve: es determinista y barato.

### Etapa 2 · Decidir (IA)
Entra: el inventario tipado, el **catálogo cerrado** de layouts con lo que cada uno admite, el tema de la sala y la nota del autor.
Sale: qué layout, qué contenido va en cada hueco, qué tipo de gráfico, los textos ya recortados, qué se destaca y qué se subordina, y la **razón** de la decisión.

Contrato de salida, validado contra esquema estricto:

```jsonc
{
  "layout": "kpis-fila-dos-columnas",          // del catálogo, no inventado
  "kpis": [
    { "valor": "9.2", "delta": "-0.3", "rotulo": "Posición media" },
    { "valor": "29k", "delta": "-16%", "rotulo": "Impresiones" }
  ],
  "grafico": { "tipo": "barras-comparadas", "serie": "trafico_mensual" },
  "columnas": [
    { "titulo": "Principales hallazgos", "puntos": ["…", "…", "…"] },
    { "titulo": "Acciones prioritarias", "puntos": ["…", "…"] }
  ],
  "razon": "4 cifras con delta + 2 bloques de análisis → fila de KPIs arriba, análisis a dos columnas"
}
```

**Nunca aparece:** color, tipografía, tamaño, margen, CSS, HTML.

### Etapa 3 · Validar (código)
Comprueba: que el texto quepa en su hueco; que el gráfico tenga series suficientes; que la escala de datos contraste sobre esa superficie; que no queden huecos vacíos; que no se haya perdido ningún dato del autor.
Si falla: **reintenta una vez** con la restricción declarada explícitamente. Si vuelve a fallar, cae a un **layout seguro** y marca ese slide para revisión humana. Nunca se renderiza algo que no validó.

### Etapa 4 · Renderizar (código)
Componentes propios diseñados a mano, gráficos en SVG propio, tokens del tema de la sala. El renderer **no conoce ningún color**: pide `primario`, `superficie`, `acento`.

### Los tres candados
1. **Catálogo cerrado** — la IA elige de una lista diseñada a mano; no puede inventar un layout, luego no puede inventar un mal diseño.
2. **Contrato de datos** — si la respuesta no valida, no llega al render.
3. **Solo tokens** — la marca vive en el tema, fuera del alcance de la IA.

### Catálogo inicial de layouts
Extraído de la estructura real del deck de NeraCode de junio de 2026:

portada · agenda · divisor de sección · tabla de pendientes con semáforo · tarjetas numeradas con badge de estatus · fila de KPIs con delta · tabla comparativa entre periodos + insights · gráfico grande + tabla lateral · bloque meta/real/% · texto a múltiples columnas · matriz de estados (filas × meses) · imagen a sangre con pie · cierre institucional.

## 8. Sistema de temas

**Un motor paramétrico, diez vestidos.** Los layouts nunca conocen un color: piden tokens. Cambiar el tema reviste todas las plantillas sin tocar ninguna.

Cada tema define: paleta (primario, secundario, acento, superficie oscura, superficie clara), gradiente propio, tipografía display y de texto, logo en versión clara y oscura, tratamiento de fondo, curvatura y grosor de regla.

**Escala de datos derivada.** Ocho paletas de marca no dan ocho paletas de datos: una marca con dos azules parecidos produce gráficos ilegibles con cinco series. Cada tema define, aparte de su paleta de marca, una escala de 5–6 colores derivada de su primario y **validada por contraste**, que es la que usan los gráficos. La marca manda en la superficie; la legibilidad manda en el dato.

**Firma de Mkt Corp:** constante y discreta, misma posición en las diez salas.

Los valores de las 10 identidades están documentados en `~/.claude/upax-context/brand/brand-matrix.md`, extraídos de los brandbooks 2026. Incluye los **sustitutos digitales oficiales** para las tipografías comerciales que no pueden servirse en web: Campton → Hanken Grotesk, Brigends Expanded → Archivo Expanded, Brunson → Anton, Academy Filled 3D → Bungee + Bungee Outline.

## 9. De la transcripción a la minuta

Se pega la transcripción (texto; sin audio en v1 — Meet y Teams ya la generan). El motor produce:

**La minuta**, siguiendo el molde real que Mkt Corp ya usa por correo: *Objetivo de la reunión · Temas generales y acuerdos · tabla de acuerdos y accionables (Acción | Squad | Owner | Prioridad | Fecha compromiso) · Próximos pasos*. Lista para copiar y pegar en el correo, con la URL de la sesión incluida.

**Los acuerdos propuestos**, como borrador: qué, quién, para cuándo. Nada se publica sin que alguien del equipo lo revise, edite o descarte.

**Validación explícita antes de publicar:** todo acuerdo sin fecha compromiso se marca visiblemente. En la minuta real de junio, cinco de ocho decían "Por definir" — la app debe señalarlo antes de que el correo salga, no después.

## 10. URLs y tokens

- **Sala (permanente):** `/sala/{slug}?t={token}` — siempre abre la sesión más reciente. Es el link que el director guarda.
- **Sesión (congelada):** `/sala/{slug}/{fecha}?t={token}` — esa reunión exacta, para siempre. Es el link que va en el correo de la minuta.

Ambas muestran el histórico completo y los acuerdos vivos. El token es largo, firmado y revocable por sala.

**Riesgo aceptado:** quien reenvíe el link comparte el acceso. Es una decisión consciente a favor de que el director abra desde el correo en su celular sin fricción. Mitigante: el token se puede rotar por sala sin afectar a las demás.

## 11. Stack

- **Next.js + React** en Vercel, repo `upax-mkt/mktcorp-estatus`, proyecto de Vercel con el mismo nombre
- **Postgres + Drizzle** — hay relaciones reales: salas, estructuras versionadas, sesiones, items, acuerdos que sobreviven a las sesiones
- **Vercel Blob** para las imágenes que sube el equipo
- **Slack OAuth** para el equipo · **token firmado** para las salas
- **Claude API** con salida estructurada para las etapas 2 (decidir) y 9 (minuta y acuerdos)
- **dnd-kit** para el arrastre · **Motion** para el movimiento
- **Gráficos en SVG propio**, sin librería de charts — única forma de que un gráfico de Research Land se vea Research Land y no Recharts con otro color. Set: barras, barras horizontales, línea, área, dona, matriz de estados, tabla comparativa
- **PDF** por impresión nativa del navegador con hoja de estilo propia — cero infraestructura extra
- Tipografías **self-hosted** (Google Fonts + Satoshi de Fontshare), no CDN

## 12. Alcance

**Dentro de la v1:** las 10 salas con sus temas · editor de estructura con arrastre · cuestionario · motor de maquetación · deck navegable · modo presentar · transcripción a minuta · acuerdos con estatus e historia · hub interno · sala con link permanente y por sesión · export a PDF.

**Fuera de la v1, a propósito:** subir audio y transcribirlo · datos vivos de HubSpot o del Forecast · envío de correo desde la app · comentarios o interacción del director · app móvil nativa.

## 13. Criterio de aceptación

**El deck de NeraCode de junio de 2026 es la prueba de fuego.** Se carga su contenido en el cuestionario y el sistema debe producir una versión mejor que la original: misma información, gráficos nativos con la marca de NeraCode en lugar de las capturas de Looker, y sin que ningún slide requiera corrección manual de layout.

Si el motor no lo logra, no está listo — y conviene saberlo antes de construir todo alrededor.

## 14. Riesgos

| Riesgo | Mitigante |
|---|---|
| **La maquetación produce slides mediocres** — es el riesgo real del proyecto; lo demás es trabajo conocido | Catálogo cerrado diseñado a mano + validador + criterio de aceptación con el deck de NC antes de construir alrededor |
| El equipo abandona el cuestionario por lento | Pila de tarjetas, no formulario; pegar tablas de Excel; poder saltar y volver. Medir el tiempo real de llenado en la primera sesión |
| Las 10 estructuras se fragmentan al ser editables por todos | Las oficiales no se borran, solo se clonan; se ve quién creó cada variante |
| Un link reenviado expone la sala | Token rotable por sala, sin afectar a las demás |
| Una paleta de marca produce gráficos ilegibles | Escala de datos derivada y validada por contraste, separada de la paleta de marca |

## 15. Pendientes externos

1. **House of Films no declara hex en su brandbook.** Los valores en uso los fijó Mkt Corp el 23-jul-2026 a partir del muestreo del PDF, para no bloquear el sistema. Sujetos a corrección.
2. Validar los pesos tipográficos prescritos de NeraCode (solo Outfit Thin embebida en su brandbook).
3. Que House of Films, Research Land y Marketing United acepten los sustitutos digitales propuestos.
4. Publicar la matriz de marca en el Org Truth Sheet de `cmo-copilot`.
5. Definir el ritmo real de sesiones por sala — hoy no está establecido, y la app no debe asumir ninguna cadencia fija.
