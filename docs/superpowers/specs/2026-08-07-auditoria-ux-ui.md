# Auditoría de UX/UI — 7 de agosto de 2026

12 pantallas capturadas del servidor local con una sesión de admin, contra la
base real. Todas devolvieron 200 y **cero errores de consola**. Los PNG están en
`~/.claude/jobs/c88a20aa/tmp/prints/`.

Cómo se hicieron: `webshot.mjs` no lleva cookies y todas las pantallas exigen
sesión, así que se firmó una cookie con el `SESSION_SECRET` que ya está en
`.env.local`, replicando `src/auth/firma.ts`. Solo GET, y evitando a propósito
las rutas que escriben al cargar (`/deck/<id>` de una reunión sin documento
crearía uno).

---

## Lo que está bien, y conviene no romper

- **El sistema visual aguanta.** Doce pantallas, una sola familia tipográfica,
  una sola escala de grises, tokens OKLCH consistentes. Nada parece pegado de
  otro sitio.
- **Las diez identidades de marca conviven sin pelearse.** Cada tarjeta de
  cliente lleva su logo y su color sin que el conjunto se vuelva un arcoíris.
- **El Home responde la pregunta correcta al entrar:** qué se me está enfriando,
  qué debo, qué viene. Es un tablero, no un menú.
- **La barra nueva funciona.** Sigue el ciclo real y marca dónde estás.
- **Los estados vacíos explican en vez de lamentarse:** el Benchmark dice qué
  aparecerá ahí cuando llegue; la sala sin reuniones dice cómo nace la primera.

---

## Críticos — se ven mal o engañan

### 1. El mismo acuerdo sale dos veces en el Home
`app/page.tsx`, módulo "Acuerdos y pendientes"

"Sesión de trabajo para bosquejar la agenda…" aparece **íntegro en DESTACADOS y
otra vez en VENCIDOS**: mismo texto, misma fecha, mismo botón. Con un solo
acuerdo destacado y un solo vencido, el módulo parece tener dos cosas cuando
tiene una.

Un acuerdo puede ser destacado *y* estar vencido a la vez — pero entonces se
pinta una vez, en el grupo que manda, con la marca del otro.

### 2. "Acceso del director" existe en dos pantallas, con contenidos distintos
`cliente/[slug]/page.tsx:919` y `cliente/[slug]/ajustes/page.tsx:253`

La ronda 11 mudó la **clave** a ajustes, pero el **link firmado de 30 días** se
quedó en la sala — y las dos secciones se llaman igual. Ahora hay dos sitios con
el mismo título y mecanismos distintos, que es peor que el problema original.

Franco pidió que *"el módulo de acceso al director"* no viviera en la sala. Para
él eso es la sección entera, no la mitad. **Los dos mecanismos van juntos, en
ajustes.**

### 3. La pantalla de ajustes no tiene la barra de navegación
`cliente/[slug]/ajustes/page.tsx` — comprobado: cero apariciones de `BarraNavegacion`

Es la única pantalla real de la app sin el menú. Se quedó fuera de la lista de la
ronda 11 porque nació en la ronda 10. Entras a ajustar una sala y la única salida
es "← Research Land".

### 4. "Eliminar" tiene el mismo peso que "Descargar"
`app/deck/page.tsx`, módulo "Anteriores"

Cada fila ofrece `Presentación PDF · Minuta .txt · Eliminar`, los tres en el
mismo tono y tamaño. La acción que borra una reunión entera está a un clic, sin
jerarquía visual que la distinga de descargar un archivo.

---

## Importantes

### 5. Queda "sesión" a la vista, en la primera pantalla
`src/lib/fecha.ts:55` — `textoDiasDesde` devuelve **"sin sesión aún"**

Sale en cinco tarjetas del Home y en el hero de la sala. La ronda 10 retiró
"sesión" de la interfaz y la 11 barrió 16 sitios más, pero este vive en un helper
de fechas y se escapó de las dos.

Y en la minuta, el volver dice **"← Cuestionario"**
(`deck/[id]/minuta/page.tsx:81`): esa pantalla no se llama así desde hace dos
rondas.

### 6. Las dos mitades de Presentaciones no hablan igual
`app/deck/page.tsx`

- **En preparación** titula con el **nombre de la sala** ("UiX") y pone los datos
  debajo.
- **Anteriores** titula con el **nombre de la reunión** ("Estatus quincenal ·
  Agosto de 2026") y pone la sala debajo.

Es la misma pantalla. Además "En preparación" etiqueta cada fila como
**`agendada`** — que es el estado de la *junta*, no del documento. En la pestaña
de Presentaciones lo que importa es si el documento está en borrador o listo.

### 7. Marketing United aparece dos veces con el mismo nombre
"Estatus Mensual Junio" el 23-jul y el 22-jul, en Presentaciones y en el Home.

Una es la reunión real; la otra nació de un archivo huérfano que la migración
convirtió en reunión (ronda 10, tarea 3). Fue lo correcto —ese PDF era una junta
que ocurrió— pero para quien mira son dos juntas iguales en días consecutivos.
Merecen fundirse o distinguirse.

### 8. "Sin minuta" es texto muerto en Presentaciones
En la sala, una reunión sin minuta ofrece **"+ Levantar minuta"**. En
Presentaciones, la misma reunión dice **"Sin minuta"** y no lleva a ninguna
parte. Es exactamente el patrón que la ronda 10 vino a matar, sobreviviendo en
otra pantalla.

### 9. El título por defecto de una reunión no dice de qué es
La RL del 3 de agosto se llama hoy **"Estatus quincenal · Agosto de 2026"**.
Cuando se migró tenía el nombre que le puso el equipo: **"Estatus Comercial
Quincenal"**.

Verificado en la base: el registro actual es una reunión distinta de la migrada
(otro id), creada desde la app, y su título lo generó `tituloPorDefecto`. O sea:
**el formulario de crear reunión no está pidiendo el título con suficiente peso,
y el valor por defecto describe la cadencia en vez del contenido.** "Comercial"
y "Digital" —que es lo que de verdad distingue las dos quincenales de Research
Land— se pierden.

### 10. Cifras con concordancia rota
Home, la fila de estadísticas: **"1 YA SE DIERON"** y **"1 VENCIDOS"**. Y bajo
"Los clientes": **"ORDENADAS por próxima reunión"** (son clientes, masculino).

---

## Menores

11. **`/reuniones` desperdicia un tercio de la pantalla.** El calendario ocupa
    dos tercios y la columna derecha solo tiene el botón de agendar; el resto es
    blanco. Con el calendario ya a ancho casi completo, ese botón cabe en la
    cabecera.

12. **Los selectores de tipografía se cortan a media fila.** En ajustes, las dos
    rejillas tienen altura fija y la última fila visible aparece partida por la
    mitad — parece un fallo de render, no un scroll.

13. **El input de logo enseña texto nativo truncado:** "Sin archivo…leccionados".

14. **"Guardar cambios" vive al final de un formulario larguísimo** en ajustes,
    después de cuarenta tipografías. Debería acompañar al scroll.

15. **El placeholder de la transcripción usa monoespaciada**, sin motivo — el
    resto de la app no la usa en ningún campo.

16. **La minuta de una reunión futura es una franja de texto en una página
    vacía**, y su última frase ("Volver al cuestionario.") describe una acción
    que no es un enlace.

17. **El degradado de marca lleva texto blanco encima** en el hero de la sala y
    de ajustes, contra la regla dura del brandbook. Es deuda conocida desde el
    24-jul, anotada aquí para que no se pierda.

---

## Lo que no se pudo revisar

**La minuta después de generarla** —el cuadro de feedback, regenerar, el
arrastre, y el bug de quitar un acuerdo— **no se ha visto nunca funcionando.**
Todo eso llama al modelo, y `ANTHROPIC_API_KEY` solo existe en Vercel. Los tests
lo cubren con dobles, pero nadie lo ha mirado en vivo.

Es lo primero que conviene probar en producción, y es de las cosas que solo
Franco puede hacer.
