# Ronda 7 — Acuerdos, Monday y el estado de las salas

29-jul-2026. Diseño aprobado por Franco antes de escribirlo.

Esta entrega hace tres cosas que hoy no se pueden hacer: **ver todos los
acuerdos juntos**, **llevarlos al tablero donde el equipo trabaja de verdad**, y
**apagar una sala que está en freeze comercial** sin que la app siga pidiendo
reuniones que nadie va a dar.

Queda FUERA, en una entrega posterior: crear salas nuevas y brandearlas, y la
página de calendario compartible por enlace. Son las dos piezas caras y ninguna
arregla algo que hoy esté mal; el freeze sí.

---

## Lo que se averiguó del tablero real

Todo lo de abajo se leyó de la API el 29-jul-2026, no se supone. Es la fuente de
verdad de esta entrega: **si algo de aquí cambia en Monday, esta integración se
rompe y hay que volver a medirlo**.

**Tablero `18044324200` — "Marketing Corporativo ⚡"**, 950 elementos, lo usa el
equipo entero.

| Grupo | Id | Qué contiene |
|---|---|---|
| Delivery Mkt Corp 2026 | `group_mm15cfz2` | El trabajo. **Aquí van nuestros acuerdos.** |
| Reuniones Semanales, Quincenales, Mensuales | `group_mm0x3h1h` | 51 reuniones de estatus, con su UdN y su fecha |
| Done | `group_mm1jc2kq` | |
| Benchmark ×7 (uno por UDN) | `group_mm47768f` y otros | Las tareas de construir el benchmark |

**Columnas del elemento** (board principal):

| Qué | Id | Tipo |
|---|---|---|
| Acuerdo | `name` | — |
| UdN | `color_mm0ex2j0` | status |
| Fase | `color_mkz09na` | status |
| Deadline | `date_mm1b10rx` | date |
| Responsable | `person` | people |
| Squad Owner | `color_mkz0s203` | status |

**Columnas del subelemento** (board `18044759026`, "Subelementos de Marketing
Corporativo ⚡"). **Son otras y hay que mapearlas aparte** — es el error más
fácil de cometer en toda esta entrega:

| Qué | Id | Tipo |
|---|---|---|
| UdN | `color_mm15emh7` | status |
| Fase | `color_mkzjvp66` | status |
| Deadline | `date_mm1hnswx` | date |
| Responsable | `person` | people |
| Squad Owner | `color_mm15h1g6` | status |

**Etiquetas de UdN**: Zeus, Mexa Creativa, Neracode, Promo Espacio, UiX,
Cecilia Fallabrino, Grupo Upax, Más Salud, Reclutalia, Pablo Levy, House of
Films (7), Marketing United (105), Research Land (156). `src/monday/mapeo.ts`
ya empareja contra ellas las nueve salas de la app más «Grupo Upax», que dejó
de ser sala el 24-jul y sigue siendo la identidad de las reuniones sin sala; su
entrada se conserva para poder leer un acuerdo que llegue con esa etiqueta.
Verificado contra las etiquetas de arriba el 29-jul.

**Fases**: `⏳Backlog`, `🚧 Sprint`, `👀 Review`, `⚙️ Modificación`, `✅ Done`,
`🚫 Detenido`.

**Personas**: 24 activas en la cuenta "Marketing Corp Grupo UPAX". Sus correos
son de tres dominios distintos (`@upax.com.mx`, `@elektra.com.mx`, `@jansan.mx`),
así que **no se pueden emparejar por correo** contra el SSO de Slack. Se traen
de la API y se eligen de una lista.

**Filtrar Delivery por UdN funciona** y devuelve pocos elementos: ocho para Mexa
Creativa. La regla es `{column_id: "color_mm0ex2j0", compare_value: [<índice>],
operator: any_of}` con `API-Version: 2024-10`.

### Del dashboard viejo se copian dos cosas y se descartan cuatro

`upax-dashboard-monday` lleva meses escribiendo en este mismo tablero. Se
auditó entero el 29-jul.

**Se copia:** el reintento único ante un 429 respetando el `Retry-After` que
manda el servidor, y el `AbortController` con timeout — las dos cosas que le
faltan a nuestro cliente.

**No se copia:**

1. **Escribe a `group_mm1mhsd1`, un grupo que ya no existe.** No hay en el
   tablero ni un solo elemento con el formato que genera (`WEEKLY <fecha> | …`).
   De ahí sale una regla dura de esta entrega: *el grupo destino se comprueba
   contra el tablero antes de escribir, y si no está, la subida se niega con un
   mensaje que lo diga.* Un id de grupo en una constante no es una garantía.
2. **`NEXT_PUBLIC_API_SECRET` es el mismo valor que `API_SECRET`**, así que el
   secreto que autoriza sus rutas de escritura viaja en el bundle del navegador,
   y su middleware excluye `/api`. Aquí la escritura vive en Server Actions que
   comprueban la sesión, y ningún secreto sale al cliente.
3. **Empareja personas por nombre escrito a mano** contra un diccionario
   congelado: seis de los que lista ya no están en la cuenta, faltan cinco que
   sí, y "Efraín Maciel" nunca se asigna porque en Monday es "Alejandro Maciel".
   Aquí se elige de la lista viva y se guarda el id.
4. **Arma las queries concatenando strings** e interpola en ellas un dato que
   viene del cliente. Aquí se usan variables de GraphQL, como ya se hacía.

---

## 1 · El responsable dice de quién es el acuerdo

El campo de responsable deja de ser un `<input>` de texto y pasa a ser un
selector con **dos grupos**:

- **Mkt Corp** — las personas vivas de la cuenta de Monday, con su id.
- **La UDN** — texto libre, como hasta ahora.

De qué grupo salga decide todo lo demás:

| Responsable | Dónde vive | Va a la bandeja |
|---|---|---|
| Alguien de Mkt Corp | App + Delivery, ida y vuelta | Sí |
| Alguien de la UDN | Solo la app; la sala lo ve igual | No |
| «por asignar» | Solo la app | No, hasta que tenga dueño |

No hay un interruptor aparte de "este va a Monday": sería un segundo sitio
donde decir lo mismo, y los dos se pueden contradecir.

**El responsable que detecta la IA en la minuta** sigue llegando como texto
("Fernando Ruiz"). Al revisar la minuta, ese texto se ofrece emparejado con la
persona más parecida de la lista **para que alguien lo confirme**, nunca
resuelto solo. Si nadie lo confirma, el acuerdo nace con responsable de UDN y no
entra a la bandeja: no asignar es recuperable, asignar a quien no toca en un
tablero que mira todo el equipo, no.

## 2 · El directorio de personas

`src/monday/personas.ts`. Trae `users` de la API, se queda con los activos que
no son invitados, y devuelve `{ id, nombre, correo }`.

Se guarda en la base (`personas_monday`) con la hora de su última carga y se
refresca cuando pasa de un día. Sin llamada de red no se puede abrir un
selector: si Monday tarda, el formulario se queda esperando. Con la copia local
el selector abre siempre y el refresco pasa por detrás.

Si la carga falla y no hay copia previa, el grupo "Mkt Corp" del selector sale
vacío y lo dice; el de la UDN sigue funcionando. Nadie se queda sin poder
escribir un acuerdo porque Monday esté caído.

## 3 · La bandeja hacia Delivery

Al publicar la minuta, los acuerdos con responsable de Mkt Corp caen en una
**bandeja** — pantalla propia, `/acuerdos/bandeja` — que no es una cola
automática: es una lista de cosas listas que esperan un clic.

Cada renglón lleva:

- El acuerdo, su responsable y su fecha, editables ahí mismo.
- **Elemento nuevo** o **subelemento de** →, con un buscador sobre los elementos
  de Delivery **filtrados por la UdN de la sala** (ocho resultados para Mexa
  Creativa, no 950).
- `Subir a Monday` y `Descartar`.

Descartar no borra el acuerdo: lo saca de la bandeja y lo deja viviendo en la
app. Un acuerdo descartado no vuelve a aparecer aunque se edite.

**Qué se escribe al subir:**

| Campo | Elemento nuevo | Subelemento |
|---|---|---|
| Nombre | `MC \| <acuerdo>` con el prefijo de la sala | `<acuerdo>`, sin prefijo — ya lo lleva el padre |
| UdN | `color_mm0ex2j0` | `color_mm15emh7` |
| Fase | `color_mkz09na` | `color_mkzjvp66` |
| Deadline | `date_mm1b10rx` | `date_mm1hnswx` |
| Responsable | `person` con el id | `person` con el id |

La Fase sale del estatus del acuerdo con el mapa que ya existe
(`FASE_DE_ESTATUS`): abierto y vencido van como `🚧 Sprint`, cumplido como
`✅ Done`, cancelado como `🚫 Detenido`. `vencido` no viaja como tal a propósito:
en nuestra app se deriva de que la fecha quedó atrás, y escribirlo congelaría en
el tablero algo que cambia solo con el calendario.

El Squad Owner **no se escribe**: nuestro modelo no sabe de qué squad es cada
acuerdo, y rellenarlo a ojo ensucia las vistas por squad que usa el equipo.

**Antes de la primera escritura de cada sesión de trabajo se comprueba que el
grupo destino existe.** Es la lección del dashboard: si `MONDAY_GRUPO` apunta a
un grupo borrado, la bandeja se niega entera y dice cuál falta, en vez de
mandar elementos a ninguna parte.

## 4 · La vuelta

Del acuerdo subido guardamos `mondayId`, `mondayTipo` (elemento o subelemento) y
`mondayUrl`.

La lectura de vuelta pide **solo esos ids** (`items(ids: [...])`), no recorre el
grupo. Dos consultas por refresco como mucho: una para los elementos y otra para
los subelementos, porque las columnas a leer son distintas.

Se refresca al abrir el espacio de acuerdos y al abrir una sala. Qué se trae de
vuelta: **Fase y Deadline**. La fase se traduce con `estatusDeFase` — `✅ Done`
es cumplido, todo lo demás sigue abierto.

Reglas de precedencia, para que no haya dos verdades:

- **La fecha y el estatus los manda el último que los tocó**, aquí o allá. Se
  compara el `updated_at` que devuelve el elemento de Monday contra el
  `updatedAt` del acuerdo; gana el más reciente. Ambos son instantes, no días:
  comparar por fecha civil dejaría empates el mismo día y el empate lo tendría
  que romper alguien.
- **El texto del acuerdo no vuelve.** Si alguien renombra el elemento en Monday,
  la app conserva lo que se pactó en la reunión: la minuta es el acta.
- **Si el elemento ya no existe** (lo borraron allá), el acuerdo se marca
  `mondayId = null` con un aviso en el espacio de acuerdos, y deja de
  sincronizarse. No se borra: lo que se acordó en una reunión no lo deshace un
  borrado en otro sistema.

Sigue rigiendo la regla que ya está escrita en `src/monday/sincronizar.ts`:
**Monday nunca puede tumbar la app**. Primero nuestra base, después el tablero,
y si el tablero falla se registra y se sigue.

## 5 · El espacio de acuerdos

Pantalla propia en `/acuerdos`. Hoy los acuerdos solo se ven dentro de su sala,
así que no hay forma de contestar "qué le debemos a quién esta semana".

- Todos los acuerdos de todas las salas, con filtros por sala, responsable y
  estatus.
- La estrella de destacado.
- Para los que viven en Monday: su fase real, cuándo se leyó, y un enlace al
  elemento.
- Los congelados (de salas en pausa) se ven en un bloque aparte, apagados.
- Entrada a la bandeja, con su contador.

Quien entra con clave de sala sigue viendo solo la suya, como hasta ahora, y
sigue sin poder subir nada a Monday: la bandeja es de equipo.

## 6 · El Home

El módulo de acuerdos pasa a tener dos bloques fijos:

- **Destacados** — los que lleven estrella.
- **Vencidos** — los que se pasaron de fecha, estén destacados o no.

La estrella se pone y se quita desde el Home, la sala y el espacio de acuerdos:
es el mismo dato en tres sitios, no tres listas.

Cada bloque vacío dice lo suyo por separado. Sin destacados: "nada destacado
todavía", con la entrada al espacio de acuerdos. Sin vencidos **y con acuerdos
abiertos**: "todo lo abierto está en fecha". Sin acuerdos en absoluto: "todavía
no hay acuerdos". Son tres vacíos distintos y decir el equivocado ya pasó una
vez (ronda 2): "todo lo abierto tiene dueño y día" con la base en cero.

## 7 · Freeze y orden

La sala gana `activa` (por defecto sí) y `pausadaDesde`.

**Una sala en pausa:**

- Se ve en el Home, al final, en gris, con desde cuándo está en freeze.
- No pide próxima reunión ni entra en los avisos de "sin sesión agendada".
- Sus acuerdos abiertos quedan **congelados**: no vencen, no salen en el bloque
  de vencidos, no cuentan para el pulso ni entran a la bandeja.
- Su historial está entero al entrar; se puede consultar y no se puede preparar
  una sesión nueva sin reactivarla.
- Al reactivarla vuelve a su sitio por fecha, y sus acuerdos vuelven a correr —
  los que ya pasaron de fecha aparecen vencidos ese mismo día.

**El orden de las salas** pasa a ser el mismo en todos lados, calculado en un
solo sitio (`ordenarPorProximaReunion`, que reemplaza a `ordenarPorUrgencia`):

1. Con reunión agendada, de la más próxima a la más lejana.
2. Sin reunión agendada, por nombre.
3. En pausa, por nombre.

**Advertencia declarada:** el orden actual sube sola a la primera fila la sala
más desatendida. Con el orden por fecha, esa sala —que justo no tiene fecha—
cae al segundo bloque. La señal no se pierde (los vencidos siguen en el Home y
la tarjeta conserva su distintivo de temperatura), pero cambia de sitio. Franco
lo sabe y lo aprobó.

---

## Modelo de datos

Migraciones nuevas:

```
salas
  + activa           boolean not null default true
  + pausada_desde    timestamptz null

acuerdos
  + responsable_monday_id  text null      -- id de usuario de Monday
  + destacado              boolean not null default false
  + monday_tipo            text null      -- 'elemento' | 'subelemento'
  + monday_url             text null
  + monday_sincronizado_en timestamptz null
  + bandeja                text not null default 'no_aplica'
                                          -- 'no_aplica' | 'pendiente' | 'subido' | 'descartado'

personas_monday                            -- copia local del directorio
  monday_id      text primary key
  nombre         text not null
  correo         text not null
  cargado_en     timestamptz not null
```

`acuerdos.monday_id` ya existe. `bandeja` nace en `no_aplica` y pasa a
`pendiente` en cuanto el acuerdo tiene un responsable de Mkt Corp; los que ya
están en la base se quedan en `no_aplica` porque su responsable es texto sin id.
Es el campo que hace que un descartado no vuelva.

## Variables de entorno

| Variable | Qué hace |
|---|---|
| `MONDAY_TOKEN` | Sin él no hay integración de ninguna clase |
| `MONDAY_GRUPO` | `group_mm15cfz2` (Delivery Mkt Corp 2026) |
| `MONDAY_ESCRITURA` | `si` para que la bandeja pueda subir |

Los tres interruptores ya existen y se conservan: leer y escribir se encienden
por separado porque una escritura equivocada no la sufre esta app, la sufre
gente que no sabe que esta app existe.

## Errores y casos límite

| Situación | Qué pasa |
|---|---|
| Sin `MONDAY_TOKEN` | Todo lo de Monday desaparece de la interfaz. Sin botones muertos |
| Con token, sin `MONDAY_ESCRITURA` | La bandeja se ve y dice que la subida está apagada |
| `MONDAY_GRUPO` apunta a un grupo que no existe | La bandeja se niega entera y dice qué grupo falta |
| 429 de Monday | Un reintento respetando su `Retry-After`; si vuelve a fallar, se dice |
| Monday no responde | Se registra y se sigue; el acuerdo ya está guardado aquí |
| Persona sin cuenta de Monday | Está en la UDN o «por asignar»: no entra a la bandeja |
| El elemento se borró en Monday | `monday_id = null`, aviso, y deja de sincronizarse |
| Sala pausada con acuerdos en la bandeja | Se congelan también: no se pueden subir hasta reactivar |

## Pruebas

Unitarias: el mapeo de columnas de elemento **y de subelemento** (el error más
probable de toda la entrega), la decisión de si un acuerdo entra a la bandeja,
el congelado de una sala pausada, `ordenarPorProximaReunion` con los tres
bloques, y los tres vacíos del módulo del Home.

En producción, contra el tablero real: subir un acuerdo de prueba como elemento,
otro como subelemento, comprobar que la vuelta lee su fase, y **borrar los dos al
terminar**. La verificación no puede dejar rastro en un tablero que mira todo el
equipo, ni acuerdos de prueba con nombres de personas reales en la base — pasó
dos veces ya (rondas 2 y 6).

## Lo que NO entra

- Crear salas nuevas y brandearlas. Entrega siguiente.
- La página de calendario compartible por enlace. Entrega siguiente.
- Leer del grupo de Reuniones las 51 sesiones ya agendadas. Está identificado y
  es la vía para llenar el calendario con datos reales, pero es otro sistema:
  primero que los acuerdos funcionen.
- Webhooks de Monday. La vuelta es por lectura al abrir; un webhook exige
  endpoint público y tocar la configuración del tablero del equipo.
- Escribir el Squad Owner.
