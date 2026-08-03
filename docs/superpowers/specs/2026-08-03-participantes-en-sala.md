# Participantes, también en la sala

Pendiente de la ronda 9 (`2026-07-31-ronda9-personas-participacion-y-editor-design.md`,
tarea 4): "quién preparó cada presentación y quién la presentó" quedó pintado
en el editor (`/deck/[id]`) pero no en la vista de la sala (`/cliente/[slug]`),
que es donde vive junto a cada reunión de verdad.

## Por qué quedó fuera, y por qué ese motivo no se sostenía

El implementador lo dejó fuera a propósito: `/cliente/[slug]` es la pantalla
que también abre el director de la UDN cliente, y el nombre del equipo de Mkt
Corp ya causó una fuga de datos ahí mismo una vez (`directorio()`, corregida en
la revisión final de la ronda 7) y otra vez en `/reunion/[id]` (`directorio()`
de nuevo, corregida en la ronda 9). Razón válida para tener cuidado — no para
no hacerlo.

La página **ya resuelve** "¿quién está mirando?" antes de pintar nada:

```ts
const equipo = await esLector()
```

Y ya usa exactamente ese resultado para condicionar si `directorio()` se
llega a pedir, con el razonamiento escrito ahí mismo:

> Antes `directorio()` —los nombres Y CORREOS de las 24 personas de Mkt
> Corp— se pedía siempre, sin condicionar a quién mira, y viajaba entero al
> HTML/RSC de la página en cuanto algo lo renderizaba […] Sin equipo,
> `personas` llega vacío.

Ese es el mecanismo. Esta tarea es aplicarlo de nuevo, no inventar uno nuevo.

## Qué se construyó

**`src/app/cliente/[slug]/page.tsx`** — junto a donde ya se arma `reuniones`
(`reunionesDeSala`), un bloque nuevo:

```ts
const idsDeSesion = reuniones.map((r) => r.sesionId).filter((x): x is string => Boolean(x))
const participacionPorSesion: Record<string, Participante[]> = {}
if (equipo) {
  const listas = await Promise.all(idsDeSesion.map((id) => participantesDe(id)))
  idsDeSesion.forEach((id, i) => { participacionPorSesion[id] = listas[i] })
}
```

`participantesDe` (`src/db/participacion.ts`, ya existía desde la ronda 9) solo
se llama **dentro del `if (equipo)`**. Con un director mirando, ese bloque no
corre: el objeto que se le pasa a `ReunionesSala` llega `{}`, no "vacío en
pantalla pero lleno en el payload".

**`src/componentes/ReunionesSala.tsx`** — nueva prop opcional
`participacionPorSesion`, y una segunda guarda del lado del cliente (defensa
doble, no redundancia: un componente `'use client'` no debería confiar en que
su llamador nunca se equivoque):

```ts
const participantesDeReunion = (r: Reunion): Participante[] | undefined =>
  equipo && r.sesionId ? participacionPorSesion[r.sesionId] : undefined
```

Se pinta con `ParticipantesSesion` (`src/componentes/sesion/`), reusado tal
cual — mismo componente que ya usa el editor, con el mismo aviso de qué NO
significa el dato ("no quién habló, cuánto participó ni si estuvo atento").
Va bajo la reunión destacada (la última) y bajo cada fila de las anteriores.

**`src/app/cliente/cliente.module.css`** — una regla nueva,
`.reunionFilaParticipacion { flex-basis: 100% }`, para que la línea de
participación caiga en su propia fila dentro de `.reunionFila` (flex-wrap) en
vez de competir por espacio junto a los botones de Presentación/Minuta. Sin
colores nuevos: solo layout, sobre los tokens que ya existían.

## Cómo se ve

Bajo cada reunión, en letra pequeña:

> Prepararon: Iris, César · Presentó: Iris
>
> Registra quién tocó la presentación y quién abrió el modo presentación — no
> quién habló, cuánto participó ni si estuvo atento.

Solo para equipo. Un director de UDN ve la reunión exactamente como antes.

## Cómo se garantiza que los nombres no viajan

Dos capas de test, cada una cerrando una pregunta distinta:

**1. `src/app/cliente/[slug]/page.test.ts` — ¿se llegó a PEDIR el dato?**
Mismo patrón que el precedente de `reunion/[id]/page.test.ts` ("el directorio
se CARGA condicionado"): invocar `VistaSala(...)` como la función async que es,
sin renderizar a DOM, y espiar `participantesDe`.

- Director (`esLector` `false`) con una sala que sí tiene reuniones:
  `participantesDe` **no se llama ni una vez**.
- Equipo (`esLector` `true`): se llama una vez por sesión de la sala.
- Equipo pero sin reuniones todavía: tampoco se llama (no hay qué pedir).

Esta es la prueba que importa: si la función que trae los nombres de la base
nunca se ejecuta, los nombres no llegan a existir en el cierre de la función
—y lo que no existe no se puede serializar en el prop de un `'use client'`.

**2. `src/componentes/ReunionesSala.test.tsx` (nuevo) — la segunda guarda
del componente.** Cubre el caso "¿y si de todos modos llegara poblado?":
con `equipo={false}` y `participacionPorSesion` con nombres a propósito, la
línea no se pinta. Complementa al test de arriba; no lo sustituye — por sí
solo no probaría que el dato no viajó, solo que no se mostró (la trampa exacta
que este mismo proyecto ya pisó dos veces).

## Verificación

- `npm test` — **1210/1210** (1202 antes + 8 nuevos: 3 en `page.test.ts`, 5 en
  `ReunionesSala.test.tsx`), 98 archivos.
- `npx tsc --noEmit` — limpio.
- `npm run lint` — limpio.
- `npm run build` — limpio (`generateStaticParams` de `/cliente/[slug]` leyó
  contra la base local, que es la de producción; solo lecturas, ninguna
  escritura).

## Lo que queda abierto, honestamente

`participantesDe` se llama una vez por sesión (`Promise.all`, en paralelo, no
en serie) en vez de una sola consulta agregada. Para las salas actuales —de un
puñado a poco más de una decena de reuniones— no es un problema real; si algún
día una sala acumula muchas decenas, vale la pena una función agregada en
`src/db/participacion.ts` (`WHERE sesion_id IN (...)`) en vez de N llamadas.
No se construyó ahora porque no hacía falta y esta tarea pedía usar
`participantesDe(sesionId)` tal como existe.
