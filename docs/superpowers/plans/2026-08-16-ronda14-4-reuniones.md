# `/reuniones` deja de ser catorce rectángulos iguales — Plan

> **Para quien ejecuta con agentes:** SUB-SKILL OBLIGATORIA:
> `superpowers:subagent-driven-development`. Los pasos usan casillas (`- [ ]`).

**Goal:** Que la pestaña Reuniones se pueda trabajar: que cada tarjeta diga de
un vistazo de qué sala y de qué clase es, que lo cerrado lleve a algún sitio y
no estorbe, que se pueda filtrar, y que el calendario deje de llevarse media
pantalla para enseñar seis reuniones.

**Architecture:** No cambia ningún dato ni ninguna Server Action. Es una
tarea de **forma**: el orden de la página, el contenido de la tarjeta y dos
filtros de cliente sobre la lista que ya llega autorizada del servidor — el
mismo patrón que `/acuerdos` ya usa.

**Tech Stack:** Next 16, React 19, TypeScript, CSS Modules, Vitest + Testing
Library.

**Spec:** `docs/superpowers/specs/2026-08-14-ronda14-clases-home-y-reuniones-design.md` §5.

## Global Constraints

- **Todo en español**, comentarios densos en POR QUÉ y con el número medido.
- ⚠️ **LOS CUATRO MÓDULOS NO SE TOCAN** —Próximas · Por confirmar · Se dieron,
  falta su minuta · Cerradas—. Es la arquitectura que Franco pidió el 6-ago y
  **no se reabre**, ni disfrazada.
- ⚠️ **"Próximas" NO vuelve al panel lateral.** Franco lo sacó de ahí el
  6-ago con un motivo que sigue vivo: *"se desarma todo cuando hay muchas"*.
  El hueco del calendario lo ocupan **solo piezas que no crecen con el
  volumen**.
- **Ningún `UPDATE` sobre datos existentes.** Las 6 reuniones sin clase se
  quedan así y tienen que verse bien como "sin clasificar".
- La base local **ES la de producción**: solo GET; para escribir, la **sala
  PAUSADA de Zeus**, borrando después.
- ⚠️ **Nunca `git add -A` ni `git add .`**; nunca `git stash`, `git checkout`
  de archivos ni `git rebase`.
- Comandos: `npx vitest run <ruta>` · `npx tsc --noEmit` · `npx eslint` ·
  `npm run build`.

---

### Task 1: La pestaña se vuelve trabajable

Va en **una sola tarea** por el mismo motivo que el milestone anterior: es una
funcionalidad, y repartirla entre agentes es lo que dejó dos componentes sin
montar en la ronda 10.

**Files:**
- Modify: `src/app/reuniones/page.tsx`
- Modify: `src/app/reuniones/reuniones.module.css`
- Modify: `src/componentes/agenda/PanelAgenda.tsx` (solo lo que toque al
  calendario y su hueco)
- Test: `src/app/reuniones/page.test.tsx` y los de los componentes que toques

**Interfaces:**
- Consumes: `ReunionResumen.plantilla` (ya existe y llega — milestone 2),
  `PLANTILLAS`/`esClaseDeJunta` de `src/secciones/plantillas.ts`,
  `clientesParaBarra()` para el color y el nombre de cada sala.
- Produces: nada que consuman otros milestones.

- [ ] **Step 1: Medir la pantalla de hoy, antes de tocarla**

Con sesión (copia y adapta `/Users/19022467/.claude/tools/webshot/_sesion-local.mjs`),
`http://localhost:3000/reuniones` a **1440** y **390 px**. **Lee los PNG** y
apunta en el informe, con números: el alto del calendario, el ancho muerto a
su derecha, cuántas tarjetas hay y en qué se distinguen entre sí. Sin esto no
sabrás si mejoraste.

- [ ] **Step 2: Escribir los tests que fallan**

En `src/app/reuniones/page.test.tsx`, con el idioma que ya tiene:

```tsx
  it('cada tarjeta dice de qué sala y de qué clase es', async () => {
    // …render de la página con una reunión de NeraCode, clase Sync Comercial…
    expect(screen.getByText(/neracode/i)).toBeInTheDocument()
    expect(screen.getByText(/sync comercial/i)).toBeInTheDocument()
  })

  it('una reunión sin clase lo dice, y no se le pega la primera del catálogo', async () => {
    expect(screen.getByText(/sin clasificar/i)).toBeInTheDocument()
    expect(screen.queryByText(/estatus de udn/i)).toBeNull()
  })

  it('una reunión cerrada lleva a su minuta y a su documento', async () => {
    // Hoy "Cerradas" no ofrece ningún enlace: son tarjetas muertas.
  })

  it('los cuatro módulos siguen existiendo, y con sus nombres', async () => {
    // Guardia contra reabrir una decisión cerrada: si alguien los funde,
    // este test cae.
    for (const n of [/próximas/i, /por confirmar/i, /falta su minuta/i, /cerradas/i]) {
      expect(screen.getByRole('heading', { name: n })).toBeInTheDocument()
    }
  })
```

⚠️ Ese archivo **mockea `PanelAgenda`**: los tests del calendario y de su hueco
no van ahí. Si necesitas probar el panel, hazlo en su propio test.

- [ ] **Step 3: Correr y ver fallar**

```bash
npx vitest run src/app/reuniones/
```

- [ ] **Step 4: Implementar**

1. **La tarjeta dice qué es.** Color y nombre de su sala (el mismo tratamiento
   que ya usan las tarjetas del Home y la fila de acuerdo: **búscalo y reúsalo,
   no inventes un tercero**) y su **etiqueta de clase**. ⚠️ `obtenerPlantilla(null)`
   cae a la primera del catálogo: trata el `null` **antes** de preguntar, o una
   junta sin clase saldrá como "Estatus de UDN".
2. **"Cerradas" deja de ser un cementerio**: cada tarjeta abre **su minuta** y
   **su documento**, y el módulo **se pliega**, al final. La sala ya resolvió
   esto con `details` nativo para los acuerdos cumplidos — mismo mecanismo.
3. **Filtros por sala y por clase**, de cliente, sobre la lista ya autorizada
   — el patrón exacto de `/acuerdos`. Reúsalo.
4. **El calendario adelgaza** y el ancho muerto de su derecha lo ocupan
   **agendar, los filtros y la leyenda**. ⚠️ **NO "Próximas"**: Franco la sacó
   de ahí el 6-ago porque *"se desarma todo cuando hay muchas"*, y eso no se
   reabre.
5. **El orden pasa a ser el del trabajo**: primero lo que exige una acción
   (Por confirmar · Falta su minuta), luego Próximas, y Cerradas al final.

- [ ] **Step 5: Correr y ver pasar**

```bash
npx vitest run && npx tsc --noEmit && npx eslint && npm run build
```

- [ ] **Step 6: Volver a mirar, y LEER**

Los mismos prints del Step 1, a 1440 y 390. **Lee los textos, no midas solo
números**: en el milestone anterior el defecto que bloqueó la fusión estaba
dentro del print que se presentó como prueba de que no lo había — el título
partido en tres renglones y un botón truncado a "P…". Compara contra tus
medidas del Step 1 y escribe las dos cifras.

- [ ] **Step 7: Commit**

```bash
git add <las rutas>
git commit -m "La pestaña Reuniones se puede trabajar: cada tarjeta dice qué es"
```

## Lo que NO entra

- Fundir, renombrar o reordenar los cuatro módulos.
- Devolver "Próximas" al panel lateral.
- El Home (milestone 5).
- Clasificar las 6 reuniones huérfanas.
