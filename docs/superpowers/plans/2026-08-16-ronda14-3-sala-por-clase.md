# La sala reparte sus reuniones por clase — Plan de implementación

> **Para quien ejecuta con agentes:** SUB-SKILL OBLIGATORIA:
> `superpowers:subagent-driven-development`. Los pasos usan casillas (`- [ ]`).

**Goal:** Que el módulo Reuniones de una sala no ahogue el estatus mensual
cuando lleguen doce Sync Comerciales al trimestre: cada junta enseña su clase,
"La última" muestra la más reciente **de cada clase**, y "Anteriores" se
reparte en **una columna por clase** con su conteo.

**Architecture:** No hay dato nuevo — la clase ya se guarda en
`reuniones.plantilla` (milestone 2, en producción) y su catálogo vive en
`src/secciones/plantillas.ts`. Lo único que falta es **que ese dato viaje**
desde la consulta hasta el componente, y que el módulo lo use para agrupar.

**Tech Stack:** Next 16, React 19, TypeScript, Drizzle + Neon, CSS Modules,
Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-14-ronda14-clases-home-y-reuniones-design.md` §3.

## Global Constraints

- **Todo en español**, comentarios densos en POR QUÉ, con el número medido
  cuando lo haya.
- **Ningún `UPDATE` sobre datos existentes.** ⚠️ Hay **6 reuniones reales sin
  clase** y se quedan así: su dueño las corrige desde la interfaz. Tienen que
  verse bien **hoy**, sin clasificar, no como un caso raro.
- **La sala es PÚBLICA**: la ve el director de la UDN, no solo el equipo.
  Nada de esta tarea puede enseñarle información interna.
- La base local **ES la de producción**: solo GET al navegar; para escribir,
  la **sala PAUSADA de Zeus**, borrando después.
- ⚠️ **Nunca `git add -A` ni `git add .`**; nunca `git stash`, `git checkout`
  de archivos ni `git rebase`.
- Comandos: `npx vitest run <ruta>` · `npx tsc --noEmit` · `npx eslint` ·
  `npm run build`.

---

### Task 1: La clase llega al módulo, se ve, y reparte las anteriores en columnas

**Por qué va en UNA tarea y no en tres:** es una sola funcionalidad que cruza
la capa de datos, el dominio y el render. Repartirla entre agentes es lo que
dejó **dos componentes construidos que nadie montó** en la ronda 10, y lo que
obligó a una tarea entera de costura en el milestone 1. Aquí hay un dueño.

**Files:**
- Modify: `src/dominio/reunion.ts` (la interfaz `Reunion`, ~línea 89)
- Modify: `src/db/consultas.ts` (la consulta que arma `DatosDeSalaParaReuniones`)
- Modify: `src/componentes/ReunionesSala.tsx`
- Modify: `src/app/cliente/cliente.module.css`
- Test: `src/componentes/ReunionesSala.test.tsx`, y los del dominio/datos que
  correspondan.

**Interfaces:**
- Consumes: `PLANTILLAS`, `obtenerPlantilla` y `esClaseDeJunta` de
  `src/secciones/plantillas.ts`; `reuniones.plantilla` de la base.
- Produces: `Reunion` (dominio) gana `plantilla: string | null`.

- [ ] **Step 1: Escribir los tests que fallan**

En `src/componentes/ReunionesSala.test.tsx`, con el idioma que ese archivo ya
tiene:

```tsx
  it('cada reunión enseña de qué clase es', () => {
    render(<ReunionesSala {...PROPS} reuniones={[{ ...BASE, plantilla: 'sync-comercial' }]} />)

    expect(screen.getByText(/sync comercial/i)).toBeInTheDocument()
  })

  it('una junta sin clase lo dice, en vez de fingir una', () => {
    render(<ReunionesSala {...PROPS} reuniones={[{ ...BASE, plantilla: null }]} />)

    expect(screen.getByText(/sin clasificar/i)).toBeInTheDocument()
    // Y NO se le pega la primera del catálogo:
    expect(screen.queryByText(/estatus de udn/i)).toBeNull()
  })

  it('"la última" es la más reciente DE CADA CLASE, no una sola', () => {
    render(
      <ReunionesSala
        {...PROPS}
        reuniones={[
          { ...BASE, id: 'e1', plantilla: 'estatus-udn', fecha: '2026-08-12T10:00:00Z', titulo: 'Estatus Julio' },
          { ...BASE, id: 's1', plantilla: 'sync-comercial', fecha: '2026-08-14T10:00:00Z', titulo: 'Sync Semana 33' },
          { ...BASE, id: 's0', plantilla: 'sync-comercial', fecha: '2026-08-07T10:00:00Z', titulo: 'Sync Semana 32' },
        ]}
      />,
    )

    // Las dos más recientes de su clase, destacadas; la vieja del sync no.
    const ultimas = screen.getByTestId('ultimas-por-clase')
    expect(within(ultimas).getByText(/Estatus Julio/)).toBeInTheDocument()
    expect(within(ultimas).getByText(/Sync Semana 33/)).toBeInTheDocument()
    expect(within(ultimas).queryByText(/Sync Semana 32/)).toBeNull()
  })

  it('las anteriores se reparten en una columna por clase, con su conteo', () => {
    // …tres de estatus y dos de sync…
    expect(screen.getByRole('group', { name: /estatus de udn/i })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /sync comercial/i })).toBeInTheDocument()
  })
```

⚠️ **`PROPS` y `BASE` no los inventes**: ese archivo ya monta el componente.
Reusa su montaje. Y `getByTestId` solo si el componente no ofrece un rol
mejor — **prefiere el rol accesible**; el `data-testid` es el último recurso.

- [ ] **Step 2: Correr y ver fallar**

```bash
npx vitest run src/componentes/ReunionesSala.test.tsx
```

Esperado: FALLAN — `plantilla` no existe en el tipo y el módulo no agrupa.

- [ ] **Step 3: Hacer viajar el dato**

`Reunion` (dominio) gana `plantilla: string | null`. Después **sigue la
cadena hacia atrás hasta la consulta** y añádelo en cada salto:
`src/db/consultas.ts` arma `DatosDeSalaParaReuniones`, y de ahí sale a
`reunionesDeSala`.

⚠️ **Comprueba de verdad que el `select` de Drizzle trae la columna.** Un
campo que se declara en el tipo y no se pide en la consulta llega `undefined`
en producción y `tsc` no dice nada — **es exactamente el defecto que costó dos
Críticos en el milestone 2** (`editarReunion` tenía el tipo y no escribía la
columna). Ponle un test que lo fije.

- [ ] **Step 4: Pintar la clase y agrupar**

- **La etiqueta:** el `nombre` del catálogo (`obtenerPlantilla`), y
  **"Sin clasificar"** cuando es `null`. ⚠️ `obtenerPlantilla(null)` **cae a
  la primera del catálogo** por diseño: si la usas a secas, una junta sin
  clase aparecería como "Estatus de UDN" — un dato inventado presentado como
  real. Trata el `null` **antes** de preguntarle al catálogo.
- **"La última" por clase**, ordenando por fecha dentro de cada una.
- **"Anteriores" en una columna por clase**, con su conteo, en el orden del
  catálogo. Las clases **sin ninguna reunión no pintan columna** —una columna
  vacía es ruido— y "Sin clasificar" va **al final**.
- **En móvil las columnas se apilan.** La sala ya sabe hacerlo: busca cómo lo
  resuelven los módulos vecinos antes de escribir un `@media` nuevo.

- [ ] **Step 5: Correr y ver pasar**

```bash
npx vitest run && npx tsc --noEmit && npx eslint && npm run build
```

- [ ] **Step 6: Mirarlo, que es donde salen los defectos**

Prints de **producción de verdad** no; de local con el dato real. Saca
`/cliente/marketing-united` y `/cliente/neracode` (las dos con reuniones
reales) a **1440 y 390 px**, y **lee los PNG**.

Comprueba tres cosas y escríbelas con su número en el informe:
1. Que las **6 juntas sin clase** se ven bien, agrupadas al final y sin
   fingir una clase.
2. Que con **una sola clase** el módulo no se vea peor que antes — hoy TODAS
   las salas están en ese caso, así que es el aspecto que Franco verá primero.
3. Que en móvil las columnas apiladas **no dupliquen el alto** del módulo.

- [ ] **Step 7: Commit**

```bash
git add <las rutas>
git commit -m "El módulo de reuniones de una sala reparte por clase de junta"
```

## Lo que NO entra

- Enseñar la clase en `/reuniones` (milestone 4) ni en el Home (milestone 5).
- Clasificar las 6 reuniones huérfanas: es del dueño, desde la interfaz.
- Tocar el orden o el contenido de los acuerdos de la reunión.
