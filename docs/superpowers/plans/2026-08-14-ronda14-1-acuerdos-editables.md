# `/acuerdos` editable de verdad — Plan de implementación

> **Para quien ejecuta con agentes:** SUB-SKILL OBLIGATORIA: usar
> `superpowers:subagent-driven-development` (recomendada) o
> `superpowers:executing-plans` para implementar tarea por tarea. Los pasos
> usan casillas (`- [ ]`) para el seguimiento.

**Goal:** Que desde `/acuerdos` se pueda corregir un acuerdo entero —texto,
responsable, fecha compromiso, estado y sala— con un control que se ve sin
pasar el ratón por encima.

**Architecture:** No se escribe un editor nuevo. Se cablean en la fila de
`TablaAcuerdos` los dos componentes que la sala ya usa —`EditarAcuerdo`
(texto + responsable) y `AcuerdoControles` (estado + fecha)— y se añade lo
único que no existe en ninguna parte: mover un acuerdo de sala. Las Server
Actions nuevas viven junto a las que ya hay en `src/app/acuerdos/acciones.ts`
y repiten su guardián de rol.

**Tech Stack:** Next 16 (App Router, Server Actions), React 19, TypeScript,
Drizzle + Neon, CSS Modules, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-14-ronda14-clases-home-y-reuniones-design.md`
(§2 y su nota sobre la estrella).

## Global Constraints

- **Todo el código, los comentarios y los textos de interfaz, en español.**
  Los comentarios son densos en POR QUÉ y llevan el número medido cuando lo
  hay — es el estilo de este repo y hace trabajo real (ver la lección de la
  ronda 10: dos reglas de Franco se rescataron por su comentario).
- **Esconder un control NO protege un endpoint.** Toda Server Action nueva
  empieza por su guardián (`exigirEditor()` / `exigirAdmin()`), aunque la
  pantalla ya no pinte el botón.
- **Corregir es de editor; eliminar es de admin.** Es la regla que ya aplica
  esta pantalla y no cambia en esta ronda.
- **La base local ES la de producción.** Al verificar a mano: solo GET, y
  para ejercer escrituras, la **sala pausada de Zeus** (no sale en ningún
  listado y su enlace no está repartido). Borrar después lo que se insertó.
- **`ANTHROPIC_API_KEY` no existe en local**: nada de esta tarea la necesita.
- **Nunca `git stash` ni `git checkout` de archivos ajenos.** Commit por
  tarea.
- Comandos: `npx vitest run <ruta>` · `npx tsc --noEmit` · `npx eslint`.

---

### Task 1: El control de edición se ve sin pasar el ratón

**Por qué:** Franco reportó *"desde /acuerdos debo poder editar cada uno de
ellos"* y el editor YA estaba montado. Medido el 14-ago: `.acuerdoLapiz` vive
en `opacity: 0` y solo sube a 1 con `:hover` sobre la fila o con
`:focus-visible`. En un teléfono no hay hover, así que el único camino para
corregir un acuerdo era invisible **y** inalcanzable.

**Files:**
- Modify: `src/componentes/EditarAcuerdo.tsx` (el bloque `if (!editando)`,
  ~líneas 76-90)
- Modify: `src/componentes/acuerdos/TablaAcuerdos.tsx` (una línea: pasar
  `siempreVisible` — Ruling 1 del escaneo previo)
- Modify: `src/app/cliente/cliente.module.css` (`.acuerdoLapiz`, líneas
  939-959)
- Test: `src/componentes/acuerdos/TablaAcuerdos.test.tsx`

**Interfaces:**
- Consumes: nada de tareas anteriores.
- Produces: `EditarAcuerdo` acepta una prop nueva
  `siempreVisible?: boolean` (por defecto `false`). Con `true`, el control de
  edición se pinta con su etiqueta textual y sin depender de `:hover`. Las
  tareas 3 y 4 montan `EditarAcuerdo` con `siempreVisible` en `/acuerdos`.

- [ ] **Step 1: Escribir el test que falla**

En `src/componentes/acuerdos/TablaAcuerdos.test.tsx`, dentro del `describe`
que ya existe (`'editar y eliminar desde la pestaña'`), añadir:

```tsx
  it('ofrece el control de corregir con un nombre accesible, sin depender del hover', async () => {
    render(
      <TablaAcuerdos
        acuerdos={[ACUERDO]}
        destacar={vi.fn().mockResolvedValue(undefined)}
        editar={vi.fn().mockResolvedValue({})}
        personas={[]}
        equipos={{ squads: [], salas: [] }}
      />,
    )

    // `getByRole` solo encuentra lo que está en el árbol; que se VEA sin
    // hover lo fija la clase, que se comprueba abajo. Aquí se fija que el
    // control existe y se llama por su nombre y no por un glifo.
    const control = screen.getByRole('button', { name: /corregir/i })
    expect(control).toBeInTheDocument()
    expect(control.textContent).toMatch(/corregir/i)
  })
```

**Nota para quien ejecuta:** `ACUERDO` es el doble que ese archivo ya
declara arriba. Si su forma no encaja, reusar el que use el test vecino de
ese mismo `describe` — no inventar uno nuevo.

- [ ] **Step 2: Correr el test y verlo fallar**

```bash
npx vitest run src/componentes/acuerdos/TablaAcuerdos.test.tsx -t "sin depender del hover"
```

Esperado: FALLA. Hoy el botón se llama por su `aria-label`
(`Corregir el acuerdo <texto>`) pero su contenido es el glifo `✎`, así que
`control.textContent` no contiene "corregir".

- [ ] **Step 3: Implementar lo mínimo**

En `src/componentes/EditarAcuerdo.tsx`, añadir la prop a la interfaz `Props`:

```tsx
  /**
   * El control de corregir se pinta SIEMPRE, con su etiqueta, en vez de
   * asomar al pasar el ratón.
   *
   * En la sala el lápiz discreto está bien: la fila se lee, y quien va a
   * corregir ya sabe que puede. En `/acuerdos` la pantalla ES para trabajar
   * los acuerdos, y Franco reportó que "no se puede editar" teniéndolo
   * montado desde la ronda 13 — porque `opacity: 0` + `:hover` es invisible
   * al llegar e INALCANZABLE en un teléfono, donde no existe el hover.
   */
  siempreVisible?: boolean
```

Recibirla en la desestructuración del componente y usarla en el bloque de
reposo:

```tsx
        <button
          type="button"
          className={siempreVisible ? estilos.acuerdoCorregir : estilos.acuerdoLapiz}
          onClick={() => setEditando(true)}
          aria-label={`Corregir el acuerdo ${queInicial}`}
          title="Corregir"
        >
          {siempreVisible ? '✎ Corregir' : '✎'}
        </button>
```

En `src/app/cliente/cliente.module.css`, junto a `.acuerdoLapiz` (después de
la línea 959, dentro del mismo bloque temático):

```css
/* EL MISMO CONTROL, PERO QUE SE VE. `/acuerdos` es la pantalla donde se
   trabajan los acuerdos: ahí el lápiz que asoma al acercarse no es
   discreción, es un control escondido. Hereda todo lo demás de `.acuerdoLapiz`
   —tipografía, radio, foco— y solo cambia lo que lo hace visible. */
.acuerdoCorregir {
  font: inherit; font-size: 0.75rem; font-weight: 600; line-height: 1;
  margin-left: 0.45rem; padding: 0.3rem 0.5rem;
  border: 1px solid var(--borde); background: none; border-radius: 6px;
  color: var(--tx-2); cursor: pointer;
  white-space: nowrap;
  transition: color var(--rapido, 0.15s) linear, border-color var(--rapido, 0.15s) linear;
}
.acuerdoCorregir:hover { color: var(--marca-texto, var(--marca)); border-color: currentColor; }
.acuerdoCorregir:focus-visible { outline: 2px solid var(--marca); outline-offset: 1px; }
```

- [ ] **Step 4: Cablearlo, o el test no puede pasar**

⚠️ **Esto es parte de ESTA tarea, no de la 4** (Ruling 1 del escaneo previo).
Crear la prop sin que nadie la ponga en `true` es dejar una pieza construida
que nadie monta — el defecto que llegó dos veces a producción en la ronda 10.
El test de arriba renderiza `TablaAcuerdos`, así que hasta que no reciba la
prop seguirá viendo el lápiz fantasma.

En `src/componentes/acuerdos/TablaAcuerdos.tsx`, en el `<EditarAcuerdo …>` que
ya monta la fila, añadir:

```tsx
            siempreVisible
```

- [ ] **Step 5: Correr el test y verlo pasar**

```bash
npx vitest run src/componentes/acuerdos/TablaAcuerdos.test.tsx
```

Esperado: PASA, y ningún otro test de ese archivo se pone en rojo.

- [ ] **Step 6: Comprobarlo en el navegador, que es donde vive el defecto**

Un test de jsdom **no evalúa CSS de módulos**, así que no puede demostrar que
el control se ve. Hay que medirlo:

```bash
cd /Users/19022467/.claude/tools/webshot && node ./_sesion-local.mjs 1440 900
```

Abrir `d-acuerdos.png` con Read y comprobar que **cada fila muestra "✎
Corregir" sin pasar el ratón**. Repetir a 390 px (`node ./_sesion-local.mjs
390 844`) — es donde el defecto era total.

- [ ] **Step 7: Commit**

```bash
git add src/componentes/EditarAcuerdo.tsx src/componentes/acuerdos/TablaAcuerdos.tsx src/app/cliente/cliente.module.css src/componentes/acuerdos/TablaAcuerdos.test.tsx
git commit -m "El control de corregir un acuerdo deja de esconderse tras el hover"
```

---

### Task 2: Cambiar el estado y la fecha de un acuerdo desde `/acuerdos`

**Por qué:** El editor de esta pantalla cambia texto y responsable. La fecha
compromiso y el estado —lo que decide si un acuerdo urge o ya está hecho—
solo se tocan entrando a la sala. `AcuerdoControles` ya resuelve las dos
cosas y ya lo usa la sala; aquí solo faltan sus dos Server Actions.

**Files:**
- Modify: `src/app/acuerdos/acciones.ts` (al final, junto a
  `editarAcuerdoEnTablaAction`)
- Test: `src/app/acuerdos/acciones.test.ts`

**Interfaces:**
- Consumes: `moverEstatus(acuerdoId, nuevoEstatus)` y `editarAcuerdo(acuerdoId,
  cambios)` de `src/db/acuerdos.ts`; `salaDeAcuerdo(acuerdoId)` del mismo
  módulo; `exigirEditor()` de `src/auth/roles`; el helper privado
  `revalidarAcuerdo(acuerdoId)` que ya existe en este archivo.
- Produces:
  - `cambiarEstatusEnTablaAction(acuerdoId: string, estatus: 'abierto' | 'cumplido' | 'vencido' | 'cancelado'): Promise<void>`
  - `editarFechaEnTablaAction(acuerdoId: string, fecha: string | null): Promise<void>`

  La tarea 4 las pasa a `AcuerdoControles` desde `src/app/acuerdos/page.tsx`.

- [ ] **Step 1: Escribir los tests que fallan**

En `src/app/acuerdos/acciones.test.ts`, siguiendo el idioma de los tests que
ese archivo ya tiene para `editarAcuerdoEnTablaAction` (mismos dobles, mismo
`vi.mock`):

```ts
  it('cambiar el estatus exige editor', async () => {
    exigirEditor.mockRejectedValueOnce(new Error('no autorizado'))
    await expect(cambiarEstatusEnTablaAction('a1', 'cumplido')).rejects.toThrow('no autorizado')
    expect(moverEstatus).not.toHaveBeenCalled()
  })

  it('cambiar el estatus lo guarda y revalida la sala del acuerdo', async () => {
    salaDeAcuerdo.mockResolvedValue('zeus')
    await cambiarEstatusEnTablaAction('a1', 'cumplido')
    expect(moverEstatus).toHaveBeenCalledWith('a1', 'cumplido')
    expect(revalidatePath).toHaveBeenCalledWith('/cliente/zeus')
  })

  it('editar la fecha exige editor', async () => {
    exigirEditor.mockRejectedValueOnce(new Error('no autorizado'))
    await expect(editarFechaEnTablaAction('a1', '2026-09-01')).rejects.toThrow('no autorizado')
    expect(editarAcuerdo).not.toHaveBeenCalled()
  })

  it('una fecha vacía se guarda como null: "sin fecha" es un valor, no un error', async () => {
    salaDeAcuerdo.mockResolvedValue('zeus')
    await editarFechaEnTablaAction('a1', null)
    expect(editarAcuerdo).toHaveBeenCalledWith('a1', { fechaCompromiso: null })
  })

  it('el 1 de septiembre guardado es el 1 de septiembre en México, no el 31 de agosto', async () => {
    salaDeAcuerdo.mockResolvedValue('zeus')
    await editarFechaEnTablaAction('a1', '2026-09-01')

    const guardada = editarAcuerdo.mock.calls[0][1].fechaCompromiso as Date
    expect(diaCivil(guardada.toISOString())).toBe('2026-09-01')
  })
```

⚠️ **El tercer test es el que importa y NO es ceremonia.** `fechaCompromiso`
es un `Date`, no un string, y `new Date('2026-09-01')` es **medianoche UTC** —
que en México son las 18:00 del 31 de agosto. Este repo ya pagó ese bug dos
veces ("las fechas civiles se corrían un día según la zona del proceso", y
otra vez con los acuerdos marcándose vencidos 6 h antes cada tarde). La
fuente única es `src/lib/fecha.ts`, anclada a `America/Mexico_City`.

⚠️ **Y hay una segunda cosa que comprobar en esta misma tarea, no después:**
`src/app/cliente/[slug]/page.tsx:416` escribe esa MISMA columna con
`new Date(fecha)` a secas. Las dos pantallas tienen que guardar igual, o el
mismo acuerdo cambiará de día según dónde se le tocó la fecha. **Medirlo
antes de decidir**: escribir una fecha desde la sala contra Zeus y leerla de
vuelta. Si se corre un día, arreglar las dos aquí; si no se corre, escribir
en el comentario POR QUÉ no se corre. No replicar `new Date(fecha)` sin haber
hecho esa comprobación.

**Nota:** si ese archivo de test no existe todavía, crearlo copiando la
cabecera de mocks del test hermano más cercano (`src/app/acuerdos/acciones.test.ts`
ya aparece en el listado del repo — leerlo primero y extender, no reescribir).

- [ ] **Step 2: Correr los tests y verlos fallar**

```bash
npx vitest run src/app/acuerdos/acciones.test.ts
```

Esperado: FALLA con "cambiarEstatusEnTablaAction is not a function".

- [ ] **Step 3: Implementar lo mínimo**

Al final de `src/app/acuerdos/acciones.ts`, antes de los helpers privados:

```ts
/**
 * CAMBIAR EL ESTADO DE UN ACUERDO DESDE `/acuerdos`.
 *
 * `exigirEditor()` y no `exigirAdmin()`: corregir el estado es trabajo de
 * equipo, igual que corregir el texto (`editarAcuerdoEnTablaAction`). Solo
 * ELIMINAR pide admin en esta pantalla, y por un motivo distinto — es un
 * DELETE sin papelera sobre las nueve salas a la vez.
 */
export async function cambiarEstatusEnTablaAction(
  acuerdoId: string,
  estatus: EstatusAcuerdo,
): Promise<void> {
  await exigirEditor()
  await moverEstatus(acuerdoId, estatus)
  await revalidarAcuerdo(acuerdoId)
}

/**
 * LA FECHA COMPROMISO, DESDE `/acuerdos`.
 *
 * `null` no es un fallo de validación: "sin fecha" es un estado legítimo y la
 * app ya lo pinta como tal ("sin fecha"), además de ordenarlo aparte — lo
 * abierto sin fecha va al final de lo vivo (`dominio/orden-acuerdos.ts`).
 * Vaciar el campo tiene que poder significar eso, o no habría forma de
 * deshacer una fecha puesta por error.
 */
export async function editarFechaEnTablaAction(
  acuerdoId: string,
  fecha: string | null,
): Promise<void> {
  await exigirEditor()
  // ⚠️ `instanteEnCDMX` y NO `new Date(fecha)`: `fechaCompromiso` es un `Date`
  // y `new Date('2026-09-01')` es medianoche UTC — las 18:00 del 31 de agosto
  // en México, así que el acuerdo se guardaría venciendo un día antes. La
  // fuente única de días civiles es `src/lib/fecha.ts`, anclada a
  // America/Mexico_City, y este repo ya pagó dos veces por saltársela.
  // Las 12:00 y no las 00:00: un mediodía civil no cambia de día por ningún
  // desfase de zona ni por el horario de verano.
  await editarAcuerdo(acuerdoId, {
    fechaCompromiso: fecha ? instanteEnCDMX(fecha, '12:00') : null,
  })
  await revalidarAcuerdo(acuerdoId)
}
```

Importar `instanteEnCDMX` desde `@/lib/fecha`.

Añadir a los imports de la cabecera lo que falte: `moverEstatus` y el tipo
`EstatusAcuerdo` desde `@/db/acuerdos`.

⚠️ **Antes de escribir**: abrir `src/db/acuerdos.ts:359` (`editarAcuerdo`) y
confirmar que `CambiosAcuerdo` admite `fechaCompromiso`. Si no lo admite,
**parar y decirlo** — extender ese tipo es una decisión de la capa de datos,
no un detalle de esta tarea.

- [ ] **Step 4: Correr los tests y verlos pasar**

```bash
npx vitest run src/app/acuerdos/acciones.test.ts && npx tsc --noEmit
```

Esperado: PASA y `tsc` sin salida.

- [ ] **Step 5: Commit**

```bash
git add src/app/acuerdos/acciones.ts src/app/acuerdos/acciones.test.ts
git commit -m "El estado y la fecha de un acuerdo se pueden cambiar desde su pestaña"
```

---

### Task 3: Mover un acuerdo de sala

**Por qué:** Es lo único del §2 que no existe en ninguna parte de la app. Un
acuerdo que se registró en la sala equivocada hoy solo se arregla borrándolo
y volviéndolo a crear, que pierde su origen y su historial.

**Files:**
- Modify: `src/db/acuerdos.ts` (función nueva, junto a `editarAcuerdo`)
- Modify: `src/app/acuerdos/acciones.ts`
- Test: `src/db/acuerdos.test.ts` y `src/app/acuerdos/acciones.test.ts`

**Interfaces:**
- Consumes: `slugsDeSalas()` de `src/db/temas`.
- Produces:
  - `moverAcuerdoDeSala(acuerdoId: string, salaSlug: string): Promise<void>` en `src/db/acuerdos.ts`
  - `moverDeSalaAction(acuerdoId: string, salaSlug: string): Promise<{ error?: string }>` en `src/app/acuerdos/acciones.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
  it('rechaza una sala que no existe, en vez de dejar el acuerdo huérfano', async () => {
    await expect(moverAcuerdoDeSala('a1', 'sala-inventada')).rejects.toThrow(/desconocida/i)
  })

  it('al mover, revalida la sala de ORIGEN y la de DESTINO', async () => {
    salaDeAcuerdo.mockResolvedValue('house-of-films')
    await moverDeSalaAction('a1', 'zeus')
    expect(revalidatePath).toHaveBeenCalledWith('/cliente/house-of-films')
    expect(revalidatePath).toHaveBeenCalledWith('/cliente/zeus')
  })
```

- [ ] **Step 2: Correr y ver fallar**

```bash
npx vitest run src/db/acuerdos.test.ts src/app/acuerdos/acciones.test.ts
```

Esperado: FALLA con "moverAcuerdoDeSala is not a function".

- [ ] **Step 3: Implementar**

En `src/db/acuerdos.ts`:

```ts
/**
 * MOVER UN ACUERDO A OTRA SALA.
 *
 * Se valida el slug contra `slugsDeSalas()` —las salas de cliente de
 * verdad— y no contra "¿existe la fila?": `grupo-upax` tiene fila y dejó de
 * ser una sala el 24-jul. Es el mismo guardián que ya usa `crearReunion`, y
 * la razón por la que existe está escrita ahí.
 *
 * NO se toca `reunionOrigenId`: el acuerdo se acordó donde se acordó, y
 * moverlo de sala no reescribe de qué junta salió.
 */
export async function moverAcuerdoDeSala(acuerdoId: string, salaSlug: string): Promise<void> {
  if (!(await slugsDeSalas()).includes(salaSlug)) {
    throw new Error(`Sala desconocida: "${salaSlug}"`)
  }
  const ahora = new Date()
  const cambios = { salaSlug }

  if (hayDB()) {
    const conexion = db()
    const actual = (await conexion.select().from(esquema.acuerdos).where(eq(esquema.acuerdos.id, acuerdoId)))[0]
    if (!actual) throw new Error(`Acuerdo no encontrado: "${acuerdoId}"`)
    const historia = historiaConEntrada(actual.historia, { en: ahora.toISOString(), cambios })
    await conexion
      .update(esquema.acuerdos)
      .set({ salaSlug, historia, updatedAt: ahora })
      .where(eq(esquema.acuerdos.id, acuerdoId))
  } else {
    const actual = memoria.obtenerAcuerdoMemoria(acuerdoId)
    if (!actual) throw new Error(`Acuerdo no encontrado: "${acuerdoId}"`)
    const historia = historiaConEntrada(actual.historia, { en: ahora.toISOString(), cambios })
    memoria.actualizarAcuerdoMemoria(acuerdoId, { salaSlug, historia })
  }
}
```

**Por qué así y no reusando `editarAcuerdo`:** su tipo `CambiosAcuerdo` no
trae `salaSlug` —y no debe traerlo: mover de sala no es "corregir un
campo"—, y además esa función llama a `sincronizarDespuesDeEditar`, que
empuja a Monday. Mover de sala **no cambia ningún dato que le importe al
tablero** (ni el texto, ni el dueño, ni la fecha), así que no se sincroniza,
por el mismo criterio con el que `retomarAcuerdo` tampoco lo hace. Lo que sí
se conserva es la **entrada en `historia`**: quedarse sin rastro de que un
compromiso cambió de cliente sería peor que no poder moverlo.

⚠️ **Comprobar antes de escribir** que la columna se llama `salaSlug` en
`esquema.acuerdos` y que `actualizarAcuerdoMemoria` la admite. Si el store en
memoria no modela la sala, **parar y decirlo**: los tests corren contra ese
doble y un test verde no probaría nada.

En `src/app/acuerdos/acciones.ts`:

```ts
/**
 * ⚠️ SE REVALIDAN LAS DOS SALAS, y el origen se lee ANTES del UPDATE.
 *
 * Después de mover, `salaDeAcuerdo` ya devuelve la de destino, así que la de
 * origen se quedaría pintando un acuerdo que ya no tiene — el mismo cuidado
 * que `eliminarAcuerdoEnTablaAction` documenta para el borrado.
 */
export async function moverDeSalaAction(
  acuerdoId: string,
  salaSlug: string,
): Promise<{ error?: string }> {
  await exigirEditor()
  const origen = await salaDeAcuerdo(acuerdoId)
  try {
    await moverAcuerdoDeSala(acuerdoId, salaSlug)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo mover' }
  }
  revalidarPantallasDeAcuerdos(origen)
  revalidarPantallasDeAcuerdos(salaSlug)
  return {}
}
```

- [ ] **Step 4: Correr y ver pasar**

```bash
npx vitest run src/db/acuerdos.test.ts src/app/acuerdos/acciones.test.ts && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/db/acuerdos.ts src/app/acuerdos/acciones.ts src/db/acuerdos.test.ts src/app/acuerdos/acciones.test.ts
git commit -m "Un acuerdo registrado en la sala equivocada se puede mover"
```

---

### Task 4: Cablear los tres controles en la fila

**Por qué:** Las tareas 2 y 3 dejan las acciones escritas y sin llamador. La
ronda 10 dejó dos componentes construidos, probados y **que nadie montó en
pantalla** — llegaron así a producción. Esta tarea es la costura, y tiene
dueño explícito.

**Files:**
- Modify: `src/componentes/acuerdos/TablaAcuerdos.tsx` (interfaz `Props` y el
  componente `Fila`, ~líneas 14-40 y 195-240)
- Modify: `src/app/acuerdos/page.tsx` (el `<TablaAcuerdos …>` del final)
- Test: `src/componentes/acuerdos/TablaAcuerdos.test.tsx`

**Interfaces:**
- Consumes: `cambiarEstatusEnTablaAction`, `editarFechaEnTablaAction` (tarea
  2), `moverDeSalaAction` (tarea 3), `EditarAcuerdo` con `siempreVisible`
  (tarea 1), `AcuerdoControles` de `src/componentes/AcuerdoControles`.
- Produces: `TablaAcuerdos` acepta tres props opcionales nuevas —
  `cambiarEstatus`, `editarFecha`, `moverDeSala`— con las firmas de arriba.
  Opcionales por el mismo motivo que `editar` y `eliminar`: quien no puede,
  no las recibe.

- [ ] **Step 1: Escribir el test que falla**

```tsx
  it('cambia el estatus desde la fila, sin entrar a la sala', async () => {
    const cambiarEstatus = vi.fn().mockResolvedValue(undefined)
    const usuario = userEvent.setup()
    render(
      <TablaAcuerdos
        acuerdos={[ACUERDO]}
        destacar={vi.fn().mockResolvedValue(undefined)}
        cambiarEstatus={cambiarEstatus}
        editarFecha={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    await usuario.selectOptions(screen.getByLabelText(/estatus/i), 'cumplido')

    expect(cambiarEstatus).toHaveBeenCalledWith(ACUERDO.id, 'cumplido')
  })

  it('mueve el acuerdo de sala desde la fila', async () => {
    const moverDeSala = vi.fn().mockResolvedValue({})
    const usuario = userEvent.setup()
    render(
      <TablaAcuerdos
        acuerdos={[ACUERDO]}
        destacar={vi.fn().mockResolvedValue(undefined)}
        moverDeSala={moverDeSala}
        salas={[{ slug: 'house-of-films', nombre: 'House of Films' }, { slug: 'neracode', nombre: 'NeraCode' }]}
      />,
    )

    await usuario.selectOptions(screen.getByLabelText(/sala del acuerdo/i), 'neracode')

    expect(moverDeSala).toHaveBeenCalledWith(ACUERDO.id, 'neracode')
  })

  it('sin permiso de edición no se ofrece ningún control que no se pueda usar', () => {
    render(<TablaAcuerdos acuerdos={[ACUERDO]} destacar={vi.fn().mockResolvedValue(undefined)} />)

    // La regla que dejó la revisión de la ronda 10: sin manejador NO se
    // ofrece la acción. Un botón muerto es peor que la ausencia del botón —
    // y hubo uno que llegó a producción con un test que lo bendecía.
    expect(screen.queryByLabelText(/estatus/i)).toBeNull()
    expect(screen.queryByRole('button', { name: /corregir/i })).toBeNull()
    expect(screen.queryByLabelText(/sala del acuerdo/i)).toBeNull()
    // Y la sala sigue leyéndose y llevando a su pantalla.
    expect(screen.getByRole('link', { name: ACUERDO.salaNombre })).toBeInTheDocument()
  })
```

- [ ] **Step 2: Correr y ver fallar**

```bash
npx vitest run src/componentes/acuerdos/TablaAcuerdos.test.tsx -t "sin entrar a la sala"
```

Esperado: FALLA — no existe ningún control con etiqueta "estatus".

- [ ] **Step 3: Implementar**

En `Props` de `TablaAcuerdos`:

```tsx
  /**
   * Cambiar estado y fecha desde aquí (§2 del diseño de la ronda 14).
   * Opcionales, como `editar` y `eliminar`: quien no puede editar no las
   * recibe y la fila no ofrece el control. La comprobación que manda vive en
   * cada Server Action.
   */
  cambiarEstatus?: (acuerdoId: string, estatus: 'abierto' | 'cumplido' | 'vencido' | 'cancelado') => Promise<void>
  editarFecha?: (acuerdoId: string, fecha: string | null) => Promise<void>
  moverDeSala?: (acuerdoId: string, salaSlug: string) => Promise<{ error?: string }>
```

En `Fila`, junto al bloque de `EditarAcuerdo` (que ahora recibe
`siempreVisible`), montar `AcuerdoControles` **solo si llegan las dos
acciones que necesita**, y pasarle `eliminar` si está:

```tsx
        {cambiarEstatus && editarFecha && (
          <AcuerdoControles
            acuerdoId={acuerdo.id}
            estatusInicial={acuerdo.estatus}
            fechaInicial={acuerdo.fechaCompromiso ?? null}
            cambiarEstatusAction={cambiarEstatus}
            editarFechaAction={editarFecha}
            eliminarAction={eliminar ?? (async () => {})}
          />
        )}
```

⚠️ **`eliminar ?? (async () => {})` es un no-op silencioso y NO se acepta.**
`AcuerdoControles` exige `eliminarAction`, pero en esta pantalla eliminar es
de **admin** y editar es de **editor**: un editor recibiría un botón de
borrar que no hace nada. Antes de escribir esta línea, hacer
`eliminarAction` opcional en `AcuerdoControles` y que el componente **no
pinte su ✕** cuando no llega — misma regla que el resto de esta tarea. Es un
cambio de tres líneas en `src/componentes/AcuerdoControles.tsx` y hay que
comprobar que la sala, que sí la pasa siempre, no cambia.

**Y el selector de sala, que es el que no tiene componente todavía.** Dentro
del bloque de meta de la fila, donde hoy se pinta el `<Link>` a
`/cliente/{slug}`:

```tsx
        {moverDeSala ? (
          <select
            className={estilos.selectSala}
            aria-label={`Sala del acuerdo ${acuerdo.que}`}
            defaultValue={acuerdo.salaSlug}
            onChange={(e) => {
              const destino = e.target.value
              empezar(async () => {
                const r = await moverDeSala(acuerdo.id, destino)
                if (r.error) setError(r.error)
              })
            }}
          >
            {salas.map((s) => (
              <option key={s.slug} value={s.slug}>{s.nombre}</option>
            ))}
          </select>
        ) : (
          <Link href={`/cliente/${acuerdo.salaSlug}`} className={estilos.metaSala}>
            {acuerdo.salaNombre}
          </Link>
        )}
```

Esto obliga a que `TablaAcuerdos` reciba también la lista de salas a las que
se puede mover. Se añade a `Props`:

```tsx
  /**
   * Las salas VIVAS a las que se puede mover un acuerdo. Solo se usa con
   * `moverDeSala`. Las pausadas quedan fuera por el mismo criterio que ya
   * aplica `equiposPara`: a quien está en freeze no se le encarga trabajo.
   */
  salas?: Array<{ slug: string; nombre: string }>
```

⚠️ **Un `<select>` que dispara al cambiar es destructivo sin confirmación**:
un roce del dedo en el móvil mueve el compromiso de cliente. Antes de darlo
por bueno, comprobar cómo resuelve la app este mismo problema — el borrado de
una reunión pide confirmación en dos tiempos (`BorrarReunion`) y el de un
acuerdo también. **Si no hay un patrón que reusar, parar y preguntar**: no
inventar aquí un tercer estilo de confirmación.

En `src/app/acuerdos/page.tsx`, pasar las cuatro según el rol que la página
ya calculó (`editor`, `admin`) y la lista de clientes que ya carga
(`clientes`, de `clientesParaBarra()`, y `pausadas`):

```tsx
          cambiarEstatus={editor ? cambiarEstatusEnTablaAction : undefined}
          editarFecha={editor ? editarFechaEnTablaAction : undefined}
          moverDeSala={editor ? moverDeSalaAction : undefined}
          salas={editor ? clientes.filter((c) => !pausadas.has(c.slug)) : undefined}
```

- [ ] **Step 4: Correr los tests y verlos pasar**

```bash
npx vitest run src/componentes/acuerdos/ src/app/acuerdos/ && npx tsc --noEmit && npx eslint
```

- [ ] **Step 5: Comprobar la costura en el navegador**

Que el test pase **no prueba que la pieza esté montada en la pantalla real**
— es exactamente lo que falló en la ronda 10.

```bash
cd /Users/19022467/.claude/tools/webshot && node ./_sesion-local.mjs 1440 900
```

Leer `d-acuerdos.png` y confirmar que una fila enseña: corregir · estatus ·
fecha · sala · estrella · eliminar. Después, **contra la sala pausada de
Zeus**, ejercer de verdad un cambio de estado, un cambio de fecha y un
movimiento de sala, y comprobar cada uno consultando la base en solo lectura
— incluida la **vuelta atrás**, que es la que demuestra que no se perdió
nada.

⚠️ **La fila tiene ahora seis controles donde antes había tres.** Mirar el
print y preguntarse si sigue siendo una lista que se LEE: la pantalla se
consulta a diario y se corrige de vez en cuando, y este repo ya se comió esa
lección entera —el drag&drop siempre encendido convirtió seis carátulas en
2.088 px de columna—. Si la fila se ha convertido en un formulario, **decirlo
en el informe** en vez de seguir.

- [ ] **Step 6: Commit**

```bash
git add src/componentes/acuerdos/TablaAcuerdos.tsx src/componentes/AcuerdoControles.tsx src/app/acuerdos/page.tsx src/componentes/acuerdos/TablaAcuerdos.test.tsx
git commit -m "La fila de un acuerdo se corrige entera desde su pestaña"
```

---

### Task 5: La estrella deja de prometer el Home

**Por qué:** *(Decisión de Franco, 14-ago.)* Destacar significa hoy "sale en
el Home", y el Home dejará de listar acuerdos (§4 del spec). Esta tarea
cambia lo que la estrella **dice**, no lo que hace: ordena arriba en
`/acuerdos`. Va aquí y no en el milestone del Home para que no exista ni un
despliegue en el que la interfaz prometa algo que ya no ocurre.

**Files:**
- Modify: `src/componentes/acuerdos/Estrella.tsx` (comentario de cabecera y
  `aria-label`/`title`)
- Modify: `src/app/acuerdos/page.tsx` (el subtítulo de la pantalla)
- Modify: `src/componentes/acuerdos/TablaAcuerdos.tsx` (el orden de la lista)
- Test: `src/componentes/acuerdos/TablaAcuerdos.test.tsx`

**Interfaces:**
- Consumes: `AcuerdoConSala.destacado` (ya existe).
- Produces: nada que consuman tareas posteriores.

- [ ] **Step 1: Escribir el test que falla**

```tsx
  it('lo destacado se ordena arriba, que es lo que la estrella promete ahora', () => {
    render(
      <TablaAcuerdos
        acuerdos={[{ ...ACUERDO, id: 'normal', que: 'Un acuerdo cualquiera', destacado: false },
                   { ...ACUERDO, id: 'fijado', que: 'Un acuerdo fijado', destacado: true }]}
        destacar={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    const textos = screen.getAllByRole('listitem').map((li) => li.textContent ?? '')
    expect(textos[0]).toContain('Un acuerdo fijado')
  })
```

- [ ] **Step 2: Correr y ver fallar**

```bash
npx vitest run src/componentes/acuerdos/TablaAcuerdos.test.tsx -t "se ordena arriba"
```

Esperado: FALLA — hoy el orden no mira `destacado`.

- [ ] **Step 3: Implementar**

En `TablaAcuerdos`, dentro del `useMemo` que ya prepara la lista, subir lo
destacado **sin tocar el orden relativo del resto** (`sort` estable):

```tsx
  // Lo fijado, arriba. Es lo único que la estrella significa desde la ronda
  // 14: antes quería decir "sale en el Home", y el Home dejó de listar
  // acuerdos. Se conserva el gesto y su columna en vez de retirarla, así que
  // no hay dato que borrar ni migración que escribir.
  const ordenados = useMemo(
    () => [...visibles].sort((a, b) => Number(b.destacado) - Number(a.destacado)),
    [visibles],
  )
```

En `Estrella.tsx`, corregir el comentario de cabecera y los textos: "Fijar
arriba en Acuerdos" / "Quitar de arriba". En `page.tsx`, el subtítulo pasa de
*"La estrella marca los que se ven en el Home"* a *"La estrella fija un
acuerdo arriba"*.

⚠️ Buscar TODOS los sitios que prometen el Home antes de dar la tarea por
hecha:

```bash
grep -rn "en el Home\|se ven en el Home" src/ --include=*.tsx --include=*.ts
```

- [ ] **Step 4: Correr y ver pasar**

```bash
npx vitest run && npx tsc --noEmit && npx eslint
```

Esperado: los 1.899 tests en verde más los nuevos.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "La estrella fija un acuerdo arriba, y ya no promete el Home"
```

---

## Cierre del milestone

- [ ] `npx vitest run` · `npx tsc --noEmit` · `npx eslint` · `npm run build`,
      los cuatro limpios.
- [ ] Los prints de `/acuerdos` a **1440 y a 390 px**, leídos.
- [ ] Nada de prueba vivo en la base: si se ejerció algo contra Zeus,
      comprobar con una consulta de solo lectura que se borró. ⚠️ **Un
      acuerdo sobrevive al borrado de su reunión** (la clave ajena se anula,
      no cascada): borrar la reunión no basta.
- [ ] Actualizar la memoria del proyecto con lo que enseñó la ronda.

## Lo que NO entra en este milestone

- La clase de reunión, la sala, `/reuniones` y el Home: cada uno tiene su
  propio plan, y el siguiente se escribe cuando este esté en verde.
- Retirar la columna `destacado`: la estrella cambia de significado, no
  desaparece.
- El punto negro de House of Films y Marketing United: pendiente de decisión
  de marca de Franco.

---

### Task 6: La fecha de un archivo (encargo directo de Franco, 14-ago)

**Por qué:** al arreglar la fecha compromiso (Tarea 2) salieron otros dos sitios
con `new Date(<día civil>)`, sobre otra columna: `archivos.fecha` — la fecha de
una **nota de prensa** y de un **material**. Franco pidió arreglarlo también.

⚠️ **No es el mismo defecto que el de la Tarea 2, y la diferencia importa.**
Medido el 14-ago:

```
escrito por el usuario  : 2026-09-01
guardado (instante)     : 2026-09-01T00:00:00.000Z   (new Date del día civil)
leído con isoFecha()    : 2026-09-01   ✓ coincide
ese ISO pintado en CDMX : 31 ago 2026  ✗ un día menos
```

La ida y vuelta **dentro de la capa de datos es correcta**: `archivos.ts:67`
lee con `isoFecha = d.toISOString().slice(0,10)`, que también piensa en UTC,
así que los dos sesgos se cancelan. El día solo se corre **al pintarse**,
porque la app pinta anclada a `America/Mexico_City`. Por eso ningún test lo
vio: los tests comparan el string que devuelve la capa de datos, y ese string
está bien.

**Files:**
- Modify: `src/app/cliente/[slug]/page.tsx` (`registrarArchivoAction` ~línea
  723, `editarArchivoAction` ~línea 877)
- Test: `src/app/cliente/[slug]/page.test.ts`

**Interfaces:**
- Consumes: `instanteEnCDMX(diaCivilTexto, horaMinuto)` de `@/lib/fecha`, ya
  importada en ese archivo por la Tarea 2.
- Produces: nada que consuman tareas posteriores.

- [ ] **Step 1: Medir dónde se pinta, antes de tocar nada**

El defecto vive en el RENDER, así que hay que confirmar que el render existe y
falla. Notas de prensa y materiales muestran su fecha en la sala. Saca el print
con `node /Users/19022467/.claude/tools/webshot/_sesion-local.mjs 1440 900` y
compara lo que se ve con lo que hay en la base, en **solo lectura**. House of
Films tiene cinco notas de prensa cargadas por Franco. Si la fecha pintada es
un día menor que la guardada, está confirmado. **Escribe los dos números en el
informe.** Si NO se corre, para y dilo: significaría que ese render no está
anclado a CDMX y el arreglo sería otro.

- [ ] **Step 2: Escribir el test que falla**

En `src/app/cliente/[slug]/page.test.ts`, junto a los dos que la Tarea 2 ya
dejó para la fecha compromiso y con su mismo idioma (ejercitar la Server
Action real, capturar el `Date` con el mock de la capa de datos):

```ts
  it('la fecha de una nota de prensa se guarda en el día civil que se escribió', async () => {
    // Mismo montaje que los tests de fecha compromiso de esta suite:
    // se ejercita `registrarArchivoAction` de verdad y se captura el Date.
    await registrarArchivoAction({ /* …los campos que exija la firma real… */ fecha: '2026-09-01' })

    const guardada = registrarArchivoMock.mock.calls[0][0].fecha as Date
    // En CDMX, no en UTC: es donde se pinta y donde se cae hoy.
    expect(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(guardada))
      .toBe('2026-09-01')
  })
```

⚠️ **La aserción va en CDMX y no con `isoFecha`.** Con `isoFecha` el test
PASARÍA hoy, con el bug puesto — porque la ida y vuelta en UTC se cancela. Un
test que pasa con el defecto no demuestra nada. Escribe el equivalente para
`editarArchivoAction`.

- [ ] **Step 3: Correr los dos tests y verlos fallar**

```bash
npx vitest run "src/app/cliente/[slug]/page.test.ts" -t "día civil"
```

Esperado: FALLAN, con `'2026-08-31'` donde se espera `'2026-09-01'`.

- [ ] **Step 4: Implementar**

En las dos acciones, cambiar `new Date(<día>)` por
`instanteEnCDMX(<día>, '12:00')`, con un comentario que diga el número medido
y **por qué este caso se escapó**: que la capa de datos lo lee con un
`isoFecha` propio en UTC, así que los dos sesgos se cancelan y el día solo se
corre al pintarlo.

- [ ] **Step 5: Correr los tests y verlos pasar**

```bash
npx vitest run "src/app/cliente/[slug]/page.test.ts" && npx vitest run && npx tsc --noEmit && npx eslint
```

- [ ] **Step 6: Comprobar que ya no se corre**

Repetir el Step 1 **contra la sala PAUSADA de Zeus**, no contra las de Franco:
dar de alta una nota con fecha conocida, mirarla pintada, y borrarla después
comprobando que la fila desaparece.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "La fecha de una nota de prensa y de un material deja de correrse un día"
```

**Lo que NO entra:** unificar los dos `isoFecha` caseros
(`src/db/archivos.ts:67` y `src/db/consultas.ts:89`) con la fuente única de
`src/lib/fecha.ts`. Es la misma familia de defecto —un ayudante de fecha
duplicado ya costó en la ronda 10 que los acuerdos vencieran 6 h antes cada
tarde— pero toca dos módulos de datos y todos sus llamadores. Queda anotado
para la revisión final.
