# La clase de junta, de segunda a primera — Plan de implementación

> **Para quien ejecuta con agentes:** SUB-SKILL OBLIGATORIA: usar
> `superpowers:subagent-driven-development` (recomendada) o
> `superpowers:executing-plans`. Los pasos usan casillas (`- [ ]`).

**Goal:** Que toda reunión diga qué junta es —incluidos los Sync Comerciales
semanales que el equipo empieza a llevar en las salas—, se cree desde donde se
cree, y que una mal clasificada se pueda corregir sin tocar la base.

**Architecture:** **No hay columna nueva ni migración.** La clase ya vive en
`reuniones.plantilla`, cuyo comentario empieza diciendo *"QUÉ CLASE DE JUNTA
ES"*, con su catálogo en `src/secciones/plantillas.ts`. Lo que se arregla es
que hoy esa pregunta solo se hace desde la sala, se llama por su consecuencia
("plantilla") en vez de por lo que es, le falta la clase que motivó la ronda, y
no se puede corregir después.

**Tech Stack:** Next 16 (App Router, Server Actions), React 19, TypeScript,
Drizzle + Neon, CSS Modules, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-14-ronda14-clases-home-y-reuniones-design.md` §1.

## Global Constraints

- **Todo el código, los comentarios y los textos de interfaz, en español.**
  Comentarios densos en POR QUÉ, con el número medido cuando lo haya.
- **Esconder un control NO protege un endpoint**: toda Server Action empieza
  por su guardián. Aquí, crear y editar una reunión son de **editor**.
- **⚠️ NO SE INVENTA CONTENIDO DE NEGOCIO.** Precedente duro de la ronda 9:
  *"Plantillas por sala: se construyó el MECANISMO, no la estructura de RL.
  Qué lleva ese estatus lo sabe quien lo da; escribirlo sería inventar un
  compromiso."* Vale igual para el Sync Comercial.
- **La base local ES la de producción.** Solo GET al navegar; para ejercer
  escrituras, la **sala PAUSADA de Zeus**, y borrar después comprobando la
  base. **Ninguna tarea de este plan hace `UPDATE` sobre datos existentes.**
- **⚠️ Nunca `git add -A` ni `git add .`**: por ruta explícita. Hubo una
  carrera del índice en el milestone anterior.
- Nunca `git stash`, `git checkout` de archivos ni `git rebase`.
- Comandos: `npx vitest run <ruta>` · `npx tsc --noEmit` · `npx eslint` ·
  `npm run build`.

---

### Task 1: `sync-comercial` entra al catálogo, y "En blanco" deja de fingir que es una clase

**Por qué:** el equipo empieza a llevar Sync Comerciales semanales dentro de
las salas y no hay forma de decir que una junta lo es. Y el desplegable
actual mezcla cuatro clases de junta con una plantilla de deck ("En blanco"),
puesta además en **segunda posición**, donde más se elige por descuido.

**Files:**
- Modify: `src/secciones/plantillas.ts`
- Test: `src/secciones/plantillas.test.ts` (si no existe, créalo)

**Interfaces:**
- Consumes: `Plantilla` y `DefinicionItem`, ya definidos en ese archivo.
- Produces: una entrada nueva con `id: 'sync-comercial'`, y `PLANTILLAS`
  reordenado. Las tareas 2, 3 y 4 lo consumen tal cual — nadie más necesita
  saber de esto.

- [ ] **Step 1: Escribir el test que falla**

```ts
  it('el catálogo ofrece Sync Comercial, la junta semanal que el equipo lleva en las salas', () => {
    const sync = PLANTILLAS.find((p) => p.id === 'sync-comercial')
    expect(sync).toBeDefined()
    expect(sync!.seccionesFijas).toBe(false)
  })

  it('"En blanco" va al final: es la salida de emergencia, no una clase de junta', () => {
    expect(PLANTILLAS[PLANTILLAS.length - 1].id).toBe('en-blanco')
  })

  it('toda plantilla nace al menos con su portada', () => {
    for (const p of PLANTILLAS) {
      expect(p.items[0].layout).toBe('portada')
    }
  })
```

- [ ] **Step 2: Correr y ver fallar**

```bash
npx vitest run src/secciones/plantillas.test.ts
```

Esperado: FALLA — no existe `sync-comercial` y `en-blanco` está en segunda
posición.

- [ ] **Step 3: Implementar**

Añadir la entrada, y mover `en-blanco` al final del array:

```ts
  {
    id: 'sync-comercial',
    nombre: 'Sync Comercial',
    paraQue: 'La junta semanal de seguimiento comercial con una unidad de negocio.',
    seccionesFijas: false,
    /**
     * ⚠️ NACE CORTA A PROPÓSITO, y no es pereza: es la regla de la ronda 9.
     * Qué bloques lleva un Sync Comercial lo sabe quien lo da, no quien
     * construye la herramienta — escribir aquí ocho secciones inventadas
     * sería comprometer al equipo con una estructura que nadie acordó, que es
     * exactamente lo que se evitó con las plantillas por sala.
     *
     * Van solo las dos que la app SABE que toda junta tiene: su portada, y
     * los acuerdos, que son entidad propia en este producto y se arrastran
     * solos. El resto lo añade en el editor quien la prepare, y el día que
     * la forma se estabilice se escribe aquí.
     */
    items: [
      {
        tipo: 'portada',
        titulo: 'Portada',
        pregunta: 'De qué sync se trata y qué semana cubre.',
        layout: 'portada',
      },
      {
        tipo: 'acuerdos',
        titulo: 'Acuerdos y Pendientes',
        pregunta: 'Qué quedó comprometido y quién lo lleva.',
      },
    ],
  },
```

⚠️ **Antes de escribir `tipo: 'acuerdos'`, comprueba cómo nombra ese tipo de
sección la plantilla `estatus-udn`** (arriba, en `ESTATUS_UDN`) y usa
exactamente el mismo valor. Un `tipo` inventado produce una sección que el
render no sabe pintar.

- [ ] **Step 4: Correr y ver pasar**

```bash
npx vitest run src/secciones/plantillas.test.ts && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/secciones/plantillas.ts src/secciones/plantillas.test.ts
git commit -m "El Sync Comercial entra al catálogo, y En blanco baja al final"
```

---

### Task 2: Desde la sala se pregunta qué junta es, no qué plantilla

**Por qué:** `NuevaSesionSala` pregunta hoy por "plantilla" —la consecuencia—
en vez de por la decisión. Es el único sitio donde esa pregunta ya se hace, y
sigue siendo el que más se usa.

**Files:**
- Modify: `src/componentes/NuevaSesionSala.tsx`
- Test: `src/componentes/NuevaSesionSala.test.tsx`

**Interfaces:**
- Consumes: `PLANTILLAS` (tarea 1), ya importado en ese archivo.
- Produces: nada nuevo. La prop `crearAction({ plantilla, dia, titulo })` **no
  cambia de forma**: lo que cambia es cómo se pregunta, no lo que se guarda.

- [ ] **Step 1: Escribir el test que falla**

```tsx
  it('pregunta qué junta es, no por una plantilla', async () => {
    const usuario = userEvent.setup()
    render(<NuevaSesionSala nombreSala="House of Films" crearAction={vi.fn().mockResolvedValue({})} />)
    await usuario.click(screen.getByRole('button', { name: /crear reunión/i }))

    expect(screen.getByLabelText(/qué junta es/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/plantilla/i)).toBeNull()
  })

  it('ofrece el Sync Comercial entre las clases', async () => {
    const usuario = userEvent.setup()
    render(<NuevaSesionSala nombreSala="House of Films" crearAction={vi.fn().mockResolvedValue({})} />)
    await usuario.click(screen.getByRole('button', { name: /crear reunión/i }))

    expect(screen.getByRole('option', { name: /sync comercial/i })).toBeInTheDocument()
  })
```

⚠️ El nombre del botón que abre el formulario puede no ser exactamente "crear
reunión": **léelo del componente** antes de escribir el test.

- [ ] **Step 2: Correr y ver fallar**

```bash
npx vitest run src/componentes/NuevaSesionSala.test.tsx
```

- [ ] **Step 3: Implementar**

- El rótulo del `<select>` pasa a **"¿Qué junta es?"**, con su `aria-label`
  acorde.
- Las clases van primero, en el orden del catálogo, y **"En blanco" al final
  tras un separador**, con el texto **"Otra (deck en blanco)"** — que dice
  las dos cosas: que no es una clase, y qué hace.
  Se hace con `<optgroup>`, que es el mecanismo nativo para eso; no dibujes un
  separador falso con guiones.
- Debajo, una línea de ayuda con el `paraQue` de la opción elegida: el
  catálogo ya lo trae y hoy no se enseña en ningún sitio.
- El comentario de cabecera explica que **la clase decide con qué secciones
  nace el deck, y no al revés**.

- [ ] **Step 4: Correr y ver pasar**

```bash
npx vitest run src/componentes/NuevaSesionSala.test.tsx && npx tsc --noEmit && npx eslint
```

- [ ] **Step 5: Mirarlo**

`cd /Users/19022467/.claude/tools/webshot` y saca la sala con sesión (adapta
el script `_sesion-local.mjs`, copiándolo, para que abra
`/cliente/house-of-films`). **Lee el PNG.** Comprueba a 390 px que el
desplegable y su línea de ayuda caben.

- [ ] **Step 6: Commit**

```bash
git add src/componentes/NuevaSesionSala.tsx src/componentes/NuevaSesionSala.test.tsx
git commit -m "La sala pregunta qué junta es, y explica qué trae cada clase"
```

---

### Task 3: Agendar desde el calendario también lo pregunta

**Por qué:** es la causa medible de que **6 de 14 reuniones no tengan clase**.
El propio código lo dice: *"Este formulario no pregunta la plantilla —tiene
tipo, alcance y participantes—, así que la reunión nace sin ella"*
(`src/app/reuniones/acciones.ts:74`). Mientras siga así, cada junta agendada
desde el calendario nace sin clasificar, y las columnas por clase del
milestone siguiente tendrían una columna "sin clasificar" que crece sola.

**Files:**
- Modify: `src/componentes/agenda/FormularioSesion.tsx` — **el formulario vive
  aquí, no en `PanelAgenda`**, que solo lo monta. Sirve para agendar Y para
  editar, así que este cambio también habilita la tarea 4.
- Modify: `src/app/reuniones/acciones.ts` (`agendarReunionAction`, ~línea 60-90)
- Test: `src/componentes/agenda/FormularioSesion.test.tsx` (el formulario) y
  `src/app/reuniones/acciones.test.ts` (la acción)

⚠️ **NO uses `src/app/reuniones/page.test.tsx`**: ese archivo **mockea
`PanelAgenda` entero** (`vi.mock('@/componentes/agenda/PanelAgenda', …)`), así
que un test escrito ahí no ejercitaría ni una línea del formulario y saldría
verde diga lo que diga.

**Interfaces:**
- Consumes: `PLANTILLAS` (tarea 1); `crearReunion(datos)` de
  `src/db/reuniones.ts`, que **ya acepta `plantilla`** (está en
  `DatosDeReunion`).
- Produces: `DatosFormulario` de `src/app/reuniones/acciones.ts` gana el campo
  `plantilla: string`. La tarea 4 lo reusa para editar.

- [ ] **Step 1: Escribir el test que falla**

En `src/app/reuniones/acciones.test.ts`, con el idioma que ese archivo ya
tiene (`DATOS_BASE` como formulario de partida y
`crearReunionConDocumentoMock` como doble de `crearReunion`):

```ts
  it('agendar desde el calendario guarda la clase elegida', async () => {
    slugsDeSalasMock.mockResolvedValue(['neracode'])

    await agendarReunionAction({ ...DATOS_BASE, plantilla: 'sync-comercial' })

    expect(crearReunionConDocumentoMock).toHaveBeenCalledWith(
      expect.objectContaining({ plantilla: 'sync-comercial' }),
    )
  })
```

Y en `src/componentes/agenda/FormularioSesion.test.tsx`, que el formulario
ofrece la pregunta y sus opciones:

```tsx
  it('pregunta qué junta es, con el Sync Comercial entre las opciones', () => {
    render(<FormularioSesion {...PROPS_BASE} />)

    expect(screen.getByLabelText(/qué junta es/i)).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /sync comercial/i })).toBeInTheDocument()
  })
```

⚠️ `PROPS_BASE` **no lo inventes**: ese archivo de test ya monta el
formulario. Reusa el montaje que tenga.

- [ ] **Step 2: Correr y ver fallar**

```bash
npx vitest run src/app/reuniones/
```

- [ ] **Step 3: Implementar**

- `FormularioSesion` gana el mismo desplegable de la tarea 2 — **misma
  pregunta, mismas opciones, mismo orden y el mismo "Otra (deck en blanco)"
  al final**. Dos formularios que preguntan lo mismo de dos maneras distintas
  es cómo se desincronizan las pantallas (la lección de la ronda 12 con la
  sección del Home y la de la sala).
  ⚠️ Si al hacerlo ves que el desplegable ya merece ser un componente
  compartido, **extráelo**: es el segundo llamador, que es justo el momento.
- `agendarReunionAction` pasa `plantilla` a `crearReunion`.
- **Borra el comentario que decía que este formulario no la pregunta**: al
  terminar esta tarea describiría un mundo que ya no existe.

- [ ] **Step 4: Correr y ver pasar**

```bash
npx vitest run && npx tsc --noEmit && npx eslint
```

- [ ] **Step 5: Ejercerlo de verdad**

Agenda una reunión **en la sala PAUSADA de Zeus** desde `/reuniones`, eligiendo
Sync Comercial; comprueba en la base (solo lectura) que quedó con
`plantilla = 'sync-comercial'`; y **bórrala después**, comprobando que la fila
desaparece. ⚠️ Recuerda que **un acuerdo sobrevive al borrado de su reunión**
(la clave ajena se anula, no cascada): si la reunión creó alguno, bórralo
aparte.

- [ ] **Step 6: Commit**

```bash
git add src/componentes/agenda/PanelAgenda.tsx src/app/reuniones/acciones.ts <los tests>
git commit -m "Agendar desde el calendario deja de crear juntas sin clasificar"
```

---

### Task 4: Una junta mal clasificada se corrige desde la app

**Por qué:** hay **6 reuniones sin clase** y las habrá mal puestas. Sin esto,
arreglarlas sería un `UPDATE` sobre la base de producción — y una capacidad
que solo existe por SQL, para el usuario **no existe** (la lección de la ronda
4). Esta tarea es también lo que evita que este plan toque datos de Franco.

**Files:**
- Modify: `src/app/reuniones/acciones.ts` (`editarReunionAction`, ~línea 96)
- Modify: `src/componentes/agenda/FormularioSesion.tsx` — **es el MISMO
  formulario que agenda**, así que la tarea 3 ya le puso el desplegable; aquí
  se resuelve el caso "sin clasificar" y que el valor viaje al editar.
- Test: `src/app/reuniones/acciones.test.ts` y
  `src/componentes/agenda/FormularioSesion.test.tsx`

**Interfaces:**
- Consumes: `editarReunion(id, cambios)` de `src/db/reuniones.ts`, que acepta
  `Omit<Partial<DatosDeReunion>, 'salaSlug'>` — o sea, **ya admite
  `plantilla`**; solo hay que pasársela.
- Produces: nada que consuman tareas posteriores.

- [ ] **Step 1: Escribir el test que falla**

En `src/app/reuniones/acciones.test.ts`:

```ts
  it('corregir la clase de una reunión ya creada la guarda', async () => {
    await editarReunionAction('r1', { ...DATOS_BASE, plantilla: 'sync-comercial' })

    expect(editarReunionMock).toHaveBeenCalledWith(
      'r1',
      expect.objectContaining({ plantilla: 'sync-comercial' }),
    )
  })

  it('editar otro campo de una junta sin clase NO la clasifica de rebote', async () => {
    await editarReunionAction('r1', { ...DATOS_BASE, plantilla: '', lugar: 'Sala 4' })

    // `null`, no `'estatus-udn'`: lo que falta sigue faltando.
    expect(editarReunionMock).toHaveBeenCalledWith(
      'r1',
      expect.objectContaining({ plantilla: null }),
    )
  })
```

Y en `FormularioSesion.test.tsx`, que el desplegable no miente al abrirse:

```tsx
  it('una reunión sin clase abre en "Sin clasificar", no en la primera opción', () => {
    render(<FormularioSesion {...PROPS_BASE} inicial={{ ...REUNION_BASE, plantilla: null }} />)

    expect((screen.getByLabelText(/qué junta es/i) as HTMLSelectElement).value).toBe('')
  })
```

⚠️ El nombre de la prop con la que ese formulario recibe la reunión a editar
(`inicial`, `sesion`, `valores`…) **léelo del componente**; no lo supongas.

- [ ] **Step 2: Correr y ver fallar**

```bash
npx vitest run src/app/reuniones/
```

- [ ] **Step 3: Implementar**

- `editarReunionAction` pasa `plantilla` a `editarReunion`.
- El formulario de editar monta el mismo desplegable, **con una opción
  "Sin clasificar" al principio** cuando la reunión no tiene clase.
- ⚠️ **"Sin clasificar" tiene que poder seguir siendo el valor guardado.** Si
  alguien edita el lugar de una junta sin clase, esa junta **no puede salir
  clasificada de rebote**: el `<select>` no puede caer en la primera opción
  por defecto. Un dato que falta es un hecho, y convertirlo en un dato
  inventado es peor que dejarlo vacío.

- [ ] **Step 4: Correr y ver pasar**

```bash
npx vitest run && npx tsc --noEmit && npx eslint && npm run build
```

- [ ] **Step 5: Ejercerlo de verdad**

Otra vez **en la sala PAUSADA de Zeus**: crea una reunión sin clase, edítale
otro campo cualquiera y comprueba en la base que **sigue sin clase**; luego
clasifícala y comprueba que se guardó. Borra todo al terminar.

- [ ] **Step 6: Commit**

```bash
git add <las rutas>
git commit -m "La clase de una junta se corrige sin bajar a la base"
```

---

## Cierre del milestone

- [ ] `npx vitest run` · `npx tsc --noEmit` · `npx eslint` · `npm run build`,
      los cuatro limpios.
- [ ] Nada de prueba vivo en la base: comprobado con una consulta de solo
      lectura.
- [ ] **Las seis sin clasificar siguen sin clasificar, y eso está bien**: son
      de Franco. Al cerrar, dárselas listadas para que las clasifique desde la
      app en un minuto — ahora que se puede.

## Lo que NO entra

- **Cualquier `UPDATE` sobre las reuniones existentes.** Ni el relleno de las
  seis: se corrigen desde la interfaz, que es lo que la tarea 4 habilita.
- **Enseñar la etiqueta de clase** en la sala y en `/reuniones`: es el
  contenido de los milestones 3 y 4, que se apoyan en este.
- **Retirar `tipo`** (la cadencia). Son tres cosas distintas y sigue siendo
  útil.
- Promover el catálogo a tabla con su pantalla de administración.
