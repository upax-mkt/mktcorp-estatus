# Diagnóstico — la grabación de voz no guarda la transcripción

31-jul-2026. Debugging sistemático (`superpowers:systematic-debugging`) del bug
que Franco reportó y que quedó en cola en la ronda 8 (punto 3) y referenciado
en el diseño de la ronda 9 (punto 3): *«el módulo de grabación de voz que se
activa en modo presentación de pantalla completa al parecer no está guardando
la transcripción de la grabación»*.

No propone arreglo. Es el diagnóstico que la ronda 9 pidió antes de tocar código.

## Veredicto

**Bug real, causa encontrada por lectura de control de flujo — no por haberlo
reproducido clic a clic.** Tenía prohibido levantar el servidor y tocar
botones (la base local es la de producción); en su lugar tracé el camino
completo del texto desde el micrófono hasta `guardarMinuta()`, y hay un tramo
donde el código, tal como está escrito, pierde la transcripción sin avisar —
esto no depende de una condición de carrera del navegador ni de interpretación:
es una rama que existe y nunca llama a la función que entrega el texto.

Por el camino descarté una hipótesis muy tentadora (abajo, "Lo que se
descartó") con una prueba empírica real, no solo lectura de código.

## El camino completo, trazado

1. **Se acumula** en `texto.current` (un `useRef<string[]>`), dentro de
   `GrabarReunion.tsx`, cada vez que `r.onresult` recibe un resultado
   `isFinal` (líneas 155–164).
2. **Se entrega al padre** — y esto es todo lo que existe: la única llamada a
   `alTerminar(texto.current.join(' ').trim())` en todo el archivo está en
   `parar()`, línea 209, que solo se ejecuta si alguien hace clic en el botón
   «Parar y minutar».
3. El padre (`ModoPresentar.tsx`) recibe eso en `setTranscripcion` (prop
   `alTerminar={setTranscripcion}`, línea 192) y un `useEffect` (líneas 46–51)
   abre el `<dialog>` de revisión cuando `transcripcion !== null`.
4. Dentro de ese diálogo, `MinutaCliente` recibe el texto como
   `transcripcionInicial` y desde ahí — y solo desde ahí — se llega a
   `generarMinutaAction` → `generarMinuta()` y luego, al publicar,
   `publicarMinutaAction` → `guardarMinuta()` (`src/db/minutas.ts:73`), que es
   el único punto de escritura a la base.

Es decir: **hay un solo pasillo desde el micrófono hasta la base, y ese
pasillo tiene una sola puerta de salida** — el clic en «Parar y minutar». Todo
lo que no pase por esa puerta se pierde, porque no hay ninguna otra que lleve
al mismo sitio.

## La causa: dos rutas de salida que no son esa puerta y existen en el código

### Ruta 1 — salir de la presentación con la grabación activa

`GrabarReunion` solo vive dentro de `{presentando && (<nav>...)}` en
`ModoPresentar.tsx` (línea 192). En cuanto `presentando` pasa a `false`, el
componente se **desmonta**. Su único efecto de limpieza (`GrabarReunion.tsx`,
líneas 88–96) hace esto:

```
useEffect(() => {
  return () => {
    try { reconocimiento.current?.stop() } catch { /* ya estaba parado */ }
  }
}, [])
```

Para el micrófono. **No llama a `alTerminar`.** Lo que había en `texto.current`
desaparece con el componente, sin ninguna copia en ningún otro sitio (confirmé
por grep que ni `GrabarReunion.tsx` ni `ModoPresentar.tsx` ni `MinutaCliente.tsx`
tocan `localStorage`/`sessionStorage`/`indexedDB` — vive solo en memoria de ese
componente).

Y `presentando` pasa a `false` por tres caminos, ninguno de los cuales
comprueba si hay una grabación en curso:

- El botón «Salir» → `salir()`, `ModoPresentar.tsx` líneas 86–98: sale de
  fullscreen y hace `setPresentando(false)` sin preguntar nada.
- **Esc**, capturado por el propio código (líneas 133–143,
  `if (e.key === 'Escape') salir()`).
- **Esc nativo del navegador**, que sale de fullscreen aunque el `keydown`
  handler de arriba no existiera — es el navegador, no la app, quien decide
  que Esc siempre saca de pantalla completa. Eso dispara `fullscreenchange`
  (líneas 109–115), que también hace `setPresentando(false)`.

Cualquiera de los tres, con la grabación corriendo, tira la transcripción.
Terminar una reunión saliendo de la presentación —el gesto más natural que
existe: "ya acabamos, cierro esto"— **sin haber pulsado antes «Parar y
minutar», pierde todo lo grabado en silencio.** No hay confirmación, no hay
aviso, no hay forma de recuperarlo después.

### Ruta 2 — un error de reconocimiento a media reunión

`GrabarReunion.tsx`, líneas 166–176:

```
r.onerror = (e) => {
  if (e.error === 'no-speech' || e.error === 'aborted') return
  setError(
    e.error === 'not-allowed'
      ? '...'
      : `El reconocimiento se detuvo (${e.error}).`,
  )
  setEstado('listo')
}
```

Cualquier error que no sea `no-speech`/`aborted` — por ejemplo `network`
(Chrome usa un servicio en la nube para reconocer voz; un corte de wifi de un
segundo en la sala basta) o `audio-capture` — hace `setEstado('listo')`. Eso
**revierte el botón de «Parar y minutar» de vuelta a «Grabar»**, y esta función
tampoco llama a `alTerminar`. Lo acumulado hasta ese punto queda huérfano: ya
no hay botón «Parar y minutar» que lo entregue, y si alguien pulsa «Grabar»
de nuevo para retomar, `arrancar()` hace `texto.current = []` (línea 145) y lo
borra explícitamemte antes de seguir escuchando.

El único rastro visible de que esto pasó es `.grabarError`, un texto de
0.75rem de opacidad 0.6 (`presentar.module.css:237-238`) dentro de una barra
de controles que además vive a opacidad 0.25 hasta que alguien la toca
(`.controles`, `presentar.module.css:110-131`). En plena reunión con un
director, proyectando el documento, es fácil no verlo.

**Las dos rutas comparten la misma raíz:** el código solo entrega la
transcripción en el camino feliz (clic explícito en «Parar y minutar» con el
reconocimiento todavía vivo). No hay una ruta de emergencia que la entregue
también al desmontar o al fallar. Cualquiera de las dos explica, por sí sola,
"grabé la reunión entera y al final no había nada que minutar" — que es
exactamente la forma en que Franco lo describió.

## Lo que se descartó, con evidencia — no solo lectura

Antes de llegar a lo de arriba, la hipótesis más tentadora era otra, y venía
con un precedente muy fuerte **en este mismo archivo**: en la ronda 5
(commit `ca80508`), el equipo encontró que `<PunteroLaser />` no se veía nunca
porque se pintaba como hermano **fuera** del `<div ref={contenedor}>` que
entra en pantalla completa — el comentario que quedó en el código dice
literalmente *"en pantalla completa el navegador solo pinta ESE elemento y sus
descendientes"* — y lo arreglaron moviéndolo adentro. El `<dialog
ref={dialogoMinuta}>` que muestra la revisión de la transcripción **sigue
siendo hermano de `contenedor`, fuera de él**, exactamente como el láser lo
era antes del fix (confirmé con `git log -p` que ese commit tocó el láser y no
tocó el diálogo).

Mi hipótesis inicial era que el mismo bug seguía vivo, sin corregir, para el
diálogo de revisión: que `showModal()` no se pintara, o que forzara salir de
pantalla completa. **La probé en vez de asumirla** — página HTML aislada en
`/tmp` (no toca la app ni la base), Chrome real headless vía Playwright,
mismo patrón exacto: un `<div>` fullscreen con un `<dialog>` hermano fuera.
Resultado:

- `dialog.showModal()` con el fullscreen activo **sí pinta** el diálogo, por
  encima del contenido fullscreen (screenshot verificado).
- Fullscreen **no se cierra** como efecto secundario (`document.fullscreenElement`
  se mantiene después de `showModal()`).
- Un clic real de Playwright sobre un botón **dentro** del diálogo ya abierto
  funciona con normalidad (lo cerré con un clic mientras el fullscreen seguía
  activo).

La explicación: `<dialog>` mostrado con `showModal()` se promueve al "top
layer" del navegador, que se compone por encima del elemento fullscreen — es
un mecanismo de pintado distinto al de un `<div>` normal como `PunteroLaser`,
al que sí le aplica la regla que describe el comentario de la ronda 5. **El
patrón que rompió al láser no generaliza al diálogo.** Queda documentado para
que nadie repita el fix del láser (moverlo dentro del contenedor) esperando
que arregle esto — no lo haría.

## Qué habría que cambiar (sin escribirlo todavía)

- La transcripción necesita una vía de entrega que no dependa exclusivamente
  del clic en «Parar y minutar». Como mínimo, el desmontaje de `GrabarReunion`
  (Ruta 1) y el `onerror` no-benigno (Ruta 2) tienen que decidir explícitamente
  qué hacer con lo ya acumulado en `texto.current`, en vez de dejarlo caer.
- `salir()` — y por extensión Esc, incluido el Esc nativo del navegador que la
  app no puede interceptar — necesita enterarse de si hay una grabación viva
  antes de que la presentación se cierre, y no permitir que se pierda en
  silencio.
- El aviso de un error de reconocimiento a media reunión (Ruta 2) necesita más
  peso del que tiene hoy: hoy es un texto chico en una barra que empieza
  semi-transparente.
- Vale la pena decidir si el acumulado debe vivir en un sitio que sobreviva al
  desmontaje del componente (subirlo al padre según llega, no solo al parar),
  en vez de que la única copia exista en un `useRef` local.

## Qué necesito de Franco

Encontré una causa arquitectónica sólida y determinística, pero hay dos rutas
distintas que la disparan y no sé cuál fue. Necesito que me diga, de esa vez
que probó grabar:

1. **¿Llegó a pulsar «Parar y minutar»?** Si sí: ¿apareció el cuadro de
   revisión con el texto («Lo que se grabó») o no apareció nada? Si apareció
   vacío o con muy poco texto, eso apunta a la Ruta 2 (un error a media
   reunión que ya había borrado lo acumulado).
2. **¿O salió de la presentación de otra forma** — Esc, el botón «Salir»,
   cerrar la pestaña — antes de pulsar «Parar y minutar»? Eso es la Ruta 1, y
   por sí sola basta para perderlo todo sin que hubiera ningún error que ver.
3. **¿Notó algún texto de error pequeño** en la barra de controles durante la
   grabación (algo como *"El reconocimiento se detuvo (network)"*), o el botón
   volvió a decir «Grabar» solo, sin que él lo tocara?
4. Confirmar que fue en **Chrome de escritorio** — es el único navegador que
   soporta esto, y el propio componente lo dice en pantalla si no lo es.

Con esa respuesta se puede decidir si el arreglo cubre una ruta, la otra, o
las dos — que es lo más probable, porque comparten la misma raíz.
