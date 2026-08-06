# Ronda 11 — La minuta se corrige, y la navegación no se pierde

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Que la minuta generada se pueda corregir sin volver a empezar —editándola, quitando acuerdos, o diciéndole a la IA qué entendió mal— y que la app deje de perder la navegación al entrar en un módulo.

**Origen:** feedback de Franco el 6-ago, mirando la app en producción. Nueve puntos, textuales:

> *"Falta un cuadro de comunicación y feedback para la IA una vez generada la minuta, ya que no captó un acuerdo clave o entendió algo mal, al lado que tenga un botón para regenerar la minuta. Una vez que se genera la minuta quiero poder editarla ahí mismo. La minuta detecta perfectamente los acuerdos pero una vez generada, abajo aparecen todos los acuerdos detectados y cuando quito uno la minuta no se modifica y está mal. Los acuerdos propuestos en ese mismo módulo deberían poder arrastrarse por orden de importancia tipo drag and drop. El menú de pestañas debería estar siempre disponible en cualquier módulo, utiliza buenas prácticas de ux/ui para lograrlo. Una vez cargado un archivo como una presentación debería poder editar el nombre con el que se ve en el front. Dentro de un cliente (sala) el módulo de acceso al director no debería vivir allí, debería estar en los ajustes de cada sala. Dejaste un mensaje en el módulo de reuniones y presentaciones de la última en sala y dice: 'Registra quién tocó la presentación y quién abrió el modo presentación — no quién habló, cuánto participó ni si estuvo atento.' ELIMÍNALO, solo deja una leyenda 'Cargada por: PERSONA'. En la pestaña Reuniones, 'lo que viene' déjalo abajo del calendario al igual que las otras listas, se desarma todo cuando hay muchas."*

**Tech Stack:** Next.js 16 (el `proxy.ts` hace de middleware), React Server Components, Drizzle sobre Neon Postgres, vitest, CSS Modules, Vercel Blob.

## Global Constraints

- **Este NO es el Next.js que conoces.** Antes de escribir código de rutas, layouts o Server Actions, leer la guía en `node_modules/next/dist/docs/`. Está en el `AGENTS.md` del repo.
- **Producción y local comparten la MISMA base de Neon.** Cualquier escritura de prueba entra en la app real de Franco. Los datos de prueba se borran al terminar, y **los acuerdos sobreviven al borrado de su reunión** (la clave ajena se anula): hay que borrarlos aparte.
- **`neon-http` no soporta transacciones ni `SELECT FOR UPDATE`.** Toda condición va DENTRO de la sentencia.
- **Las fechas se anclan a `America/Mexico_City`**, nunca al instante del proceso. Fuente única: `src/lib/fecha.ts`. En Vercel el proceso corre en UTC — este proyecto ha tenido ese bug cuatro veces.
- **Esconder un botón no protege un endpoint.** Cada página y cada Server Action repite su `exigirLectura()` / `exigirEditor()` / `exigirAdmin()`.
- **`ANTHROPIC_API_KEY` no está en local.** Nada que llame al modelo se prueba en `localhost`; se verifica contra el despliegue.
- **En pantalla todo se llama "reunión".** Identificadores y comentarios en español.
- **Verde antes de commit:** `npx vitest run`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. Base: **112 archivos / 1471 tests**.

---

### Tarea 1: La minuta se corrige sin volver a empezar

**Files:** `src/app/deck/[id]/minuta/MinutaCliente.tsx` · `src/app/deck/[id]/minuta/acciones.ts` · `src/minuta/generar.ts` · `src/minuta/prompt.ts`

Cubre cuatro de los nueve puntos, porque son **el mismo problema**: la minuta sale de la IA y no hay forma de arreglarla salvo repetirlo todo.

**El hallazgo que lo hace fácil:** `ensamblarCorreo` (`src/minuta/generar.ts:95`) ya arma el correo con **dos piezas separadas** — la prosa que escribe el modelo (`bloques: string[]`, uno por bloque del molde) y **la tabla de acuerdos, que NO la redacta el modelo**: se arma con `tablaAcuerdos(acuerdos)`. Su comentario lo dice: *"Dejarla al modelo sería dejarle inventar compromisos."*

- [ ] **Step 1: Quitar un acuerdo actualiza la minuta (el bug)**

Hoy `textoCorreo` y `filas` son dos estados independientes (`MinutaCliente.tsx:112-113`): desmarcar un acuerdo lo excluye al publicar pero **el texto lo sigue mencionando**.

Arreglo: `generarMinutaAction` devuelve también los **`bloques`** además del texto ya ensamblado. El cliente guarda los bloques, y **rearma el correo con `ensamblarCorreo` cada vez que cambian los acuerdos**. Determinista, instantáneo, sin llamar al modelo.

Test: generar con dos acuerdos, desmarcar uno, y comprobar que el texto deja de nombrarlo.

- [ ] **Step 2: La minuta se edita ahí mismo**

Lo que se edita es **la prosa, no la tabla** — la tabla se deriva de los acuerdos y se rearma sola. Así editar a mano y tocar los acuerdos dejan de pelearse: se guarda lo editado por bloque, y al rearmar se conserva.

Si el editor resulta ser sobre el texto entero y no por bloque, **para y repórtalo**: es una decisión de arquitectura, no un detalle.

- [ ] **Step 3: El cuadro de feedback para la IA + regenerar**

Un campo de texto —*"¿qué entendió mal?"*— y un botón **Regenerar** al lado. Lo que se escriba ahí viaja al modelo como corrección junto con la transcripción original.

`src/minuta/prompt.ts` es **el prompt de Chief of Staff que escribió Franco, literal**. No se reescribe: la corrección se **añade** como instrucción adicional, claramente separada.

Regenerar **descarta lo editado a mano** — díselo antes, no después.

- [ ] **Step 4: Arrastrar los acuerdos por importancia**

Drag & drop sobre las filas de acuerdos. **`ListaOrdenable` (`src/componentes/ListaOrdenable.tsx`) ya existe** y ya resuelve esto en el editor de secciones, con botones ↑/↓ como vía accesible. **Reúsalo.**

El orden viaja a la tabla del correo y al orden en que se publican los acuerdos.

---

### Tarea 2: El menú de pestañas, siempre disponible

**Files:** `src/componentes/BarraNavegacion.tsx` (nuevo) + las pantallas que la usan

> *"El menú de pestañas debería estar siempre disponible en cualquier módulo, utiliza buenas prácticas de ux/ui para lograrlo."*

**Medido el 6-ago, y ya lo había reportado el agente de la tarea 18 sin arreglarlo:** el Home tiene 5 enlaces, `/reuniones` tiene 1, y el resto de pantallas **ninguno**. Entras a un módulo y la única salida es el botón de volver o el logo.

- [ ] **Step 1: Una sola barra, un solo sitio**

Extraer la barra del Home a un componente propio y usarlo en todas. Hoy está duplicada y **divergida**, que es exactamente cómo se llegó aquí.

Debe conservar, sin excepción: el orden del ciclo (`Reuniones · Presentaciones · Acuerdos │ Clientes · Personas`), el `admin &&` de las dos últimas, la fecha, y **Salir**.

- [ ] **Step 2: Buenas prácticas, no adorno**

- La pestaña **actual se distingue** (`aria-current="page"`), no solo por color.
- Es `<nav>` con su etiqueta accesible.
- Se llega por teclado en orden.
- **Los directores de UDN no ven esta barra**: no tienen ninguna de esas pestañas. Comprobarlo.

- [ ] **Step 3: Que no se pierda el "volver"**

Las pantallas de detalle (`/deck/[id]`, `/reunion/[id]`, la minuta) tienen hoy su propio "← volver". La barra **no lo sustituye**: volver a la lista y saltar a otra sección son dos cosas distintas.

---

### Tarea 3: La sala deja de mezclar lo que no le toca

**Files:** `src/app/cliente/[slug]/page.tsx` · `src/app/cliente/[slug]/ajustes/page.tsx` · `src/componentes/sesion/ParticipantesSesion.tsx` · `src/componentes/ArchivosSala.tsx` · `src/componentes/reuniones/CarasDeReunion.tsx`

- [ ] **Step 1: El acceso del director se muda a los ajustes**

`ClaveDeSala` vive hoy en `cliente/[slug]/page.tsx:892`. Se muda a `ajustes/`, que es donde vive lo que se configura de una sala. Es además coherente con el permiso: regenerar y quitar la clave ya exigen **admin**, y la página de ajustes entera también.

- [ ] **Step 2: Fuera la leyenda de participación**

`ParticipantesSesion.tsx:13` explica que registra *"quién tocó la presentación y quién abrió el modo presentación — no quién habló, cuánto participó ni si estuvo atento"*. Franco: **elimínalo**.

Queda solo **"Cargada por: PERSONA"**. Si hay varias personas o hace falta distinguir quién presentó, **resuélvelo con el mínimo texto posible** — la leyenda larga sobraba porque explicaba una preocupación que nadie tenía.

Hay un test que fija el texto viejo (`ParticipantesSesion.test.tsx:50`): se actualiza.

- [ ] **Step 3: El nombre de un archivo se puede editar**

> *"Una vez cargado un archivo como una presentación debería poder editar el nombre con el que se ve en el front."*

`editarArchivo` (`src/db/archivos.ts:187`) **ya existe** y `ArchivosSala` ya lo usa para los archivos de interés. Lo que falta es poder hacerlo **desde la reunión**, que es donde ahora se suben las presentaciones (`CarasDeReunion`).

Ojo: el archivo se anuncia hoy con su `nombreOriginal` para saber qué se descarga. Lo editable es el **título**; si se edita, manda el título y el nombre original se conserva como dato.

---

### Tarea 4: "Lo que viene" baja del panel al flujo

**Files:** `src/app/reuniones/page.tsx` · `src/componentes/agenda/PanelAgenda.tsx`

> *"En la pestaña Reuniones, 'lo que viene' déjalo abajo del calendario al igual que las otras listas, se desarma todo cuando hay muchas."*

`PanelAgenda` pinta hoy "Lo que viene" (`:146`) en un panel lateral junto al calendario. Con muchas reuniones **el layout se rompe** — es un síntoma real, no una preferencia.

- [ ] **Step 1: Bajarlo**

Pasa a ser una lista más, debajo del calendario, en la misma columna y con el mismo tratamiento que "Por confirmar", "Se dieron falta su minuta" y "Cerradas". Queda: calendario → **Próximas** → Por confirmar → Falta su minuta → Cerradas.

- [ ] **Step 2: Que aguante el volumen**

Comprobarlo con muchas reuniones, no con tres. Es lo que se rompía.

- [ ] **Step 3: Agendar no se pierde**

El formulario de agendar vive en ese panel. Al bajar la lista, **comprobar que sigue alcanzable** y no se queda huérfano.
