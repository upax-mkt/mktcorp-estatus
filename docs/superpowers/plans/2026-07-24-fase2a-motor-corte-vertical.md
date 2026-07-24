# Fase 2a · El motor de maquetación — corte vertical

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **NOTA DE GOBIERNO (Franco, 24-jul):** el motor de maquetación y el catálogo de layouts NO se delegan a un agente autónomo. Este plan se ejecuta con Franco en el loop — subagentes para el andamiaje determinista (etapas 1, 3, 4), revisión conjunta para la etapa 2 (la decisión de la IA) y para el criterio de aceptación.

**Goal:** Que pegar el contenido crudo de una sección real de NeraCode produzca un slide maquetado con su marca, pasando por las cuatro etapas del motor — sin ampliar todavía el catálogo de layouts. Esto responde la única pregunta que importa antes de invertir en 11 layouts más: **¿la IA produce decisiones dignas?**

**Architecture:** Cuatro etapas encadenadas. Solo la etapa 2 llama a Claude, y jamás escribe estilo: devuelve una `DecisionSlide` que valida contra el esquema Zod estricto de la Fase 1 (`src/decision/esquema.ts`). Las etapas 1, 3 y 4 son código determinista y se prueban sin API. La etapa 4 (render) ya existe de la Fase 1; aquí se le añade el **layout seguro** al que se degrada una decisión que no valida.

**Tech Stack:** `@anthropic-ai/sdk` · modelo `claude-opus-4-8` · `client.messages.parse()` con `zodOutputFormat` · Zod (ya instalado) · Vitest.

## Global Constraints

- **La IA nunca escribe estilo.** La etapa 2 devuelve una `DecisionSlide` que pasa por `parsearDecision()`; cualquier `color`/`css`/`html`/markup ya lo rechaza el esquema estricto de la Fase 1. No se relaja ese esquema.
- **Modelo:** `claude-opus-4-8` (exacto, sin sufijo de fecha). Adaptive thinking (`thinking: {type: "adaptive"}`). `output_config: {effort: "medium"}` salvo que una tarea justifique otro nivel.
- **Salida estructurada, no prompting frágil:** la decisión se fuerza con `client.messages.parse({ output_config: { format: zodOutputFormat(EsquemaDecisionIA) } })`, no pidiéndole al modelo "devuelve JSON". `zodOutputFormat` retira del schema los constraints que structured output no admite (`.min()`, `.refine()`) y los valida del lado cliente — lo que ya hace `parsearDecision`. El candado no cambia.
- **Sin API, no hay etapa 2:** las etapas 1, 3 y 4 se prueban con Vitest sin red. La etapa 2 se prueba con un cliente Claude inyectado y mockeado; la corrida real contra la API es el criterio de aceptación (Tarea 6), que exige `ANTHROPIC_API_KEY` en el entorno.
- **El catálogo de layouts es fuente única:** el prompt de la etapa 2 deriva los layouts disponibles del registro de render, no de una lista escrita a mano. Prompt y renderer no pueden separarse.
- **Nada de lo cargado se pierde:** el contenido crudo y la decisión de la IA se guardan por separado, como en el Item de la Fase 1.
- **Idioma:** dominio en español. TDD. Commits frecuentes.
- **Clave de API:** nunca en el código ni en un commit. Se lee de `process.env.ANTHROPIC_API_KEY`. Si falta, el motor lanza un error claro, no un fallo oscuro de red.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/motor/inventario.ts` | Tipos del inventario tipado (serie temporal, comparativo, cifra+delta, lista, párrafo, imagen). |
| `src/motor/normalizar.ts` | Etapa 1 — parser determinista: contenido crudo → inventario tipado. |
| `src/motor/catalogo.ts` | Fuente única del catálogo: deriva del registro de layouts qué layouts existen y qué admite cada uno. |
| `src/motor/prompt.ts` | Construye el prompt de la etapa 2 desde el inventario, el catálogo y el tema. Sin lógica de red. |
| `src/motor/decidir.ts` | Etapa 2 — llama a Claude con salida estructurada; recibe el cliente por inyección. Devuelve `DecisionSlide`. |
| `src/motor/validar.ts` | Etapa 3 — comprueba la decisión; reintenta o degrada a layout seguro. |
| `src/motor/maquetar.ts` | Orquestador: encadena las 4 etapas. `maquetarItem()` y `maquetarSesion()`. |
| `src/componentes/deck/layouts/LayoutSeguro.tsx` | El layout al que se degrada una decisión inválida — legible, marcado para revisión. |
| `src/fixtures/nc-crudo-junio-2026.ts` | El contenido CRUDO (sin maquetar) de secciones reales de NeraCode, para el criterio de aceptación. |
| `src/app/motor-demo/page.tsx` | Página de desarrollo: pegar contenido crudo → ver el deck maquetado. |

---

### Task 1: Layout seguro y degradación del despachador

Hoy `Slide.tsx` **lanza** cuando un layout del catálogo no tiene componente. El motor necesita degradar, no reventar (candado #2 del spec: "cae a un layout seguro y marca ese slide para revisión"). Y el catálogo de layouts debe tener una fuente única.

**Files:**
- Create: `src/componentes/deck/layouts/LayoutSeguro.tsx`, `src/motor/catalogo.ts`
- Modify: `src/componentes/deck/Slide.tsx` — degradar en vez de lanzar
- Test: `src/componentes/deck/layouts/LayoutSeguro.test.tsx`, `src/motor/catalogo.test.ts`

**Interfaces:**
- Consumes: `DecisionSlide`, `LAYOUTS` de `src/decision/esquema.ts`
- Produces:
  - `<LayoutSeguro decision={...} motivo={...} />` — renderiza título + contenido en crudo, con una marca visible de "requiere revisión"
  - `layoutsImplementados(): DecisionSlide['layout'][]` — los layouts que hoy tienen componente en el registro
  - `esLayoutImplementado(layout): boolean`
  - `Slide` con un layout no implementado renderiza `LayoutSeguro` (con `data-degradado="true"`), no lanza

- [ ] **Step 1: Escribir el test del catálogo que falla**

Crear `src/motor/catalogo.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { layoutsImplementados, esLayoutImplementado } from './catalogo'
import { LAYOUTS } from '@/decision/esquema'

describe('catálogo de layouts', () => {
  it('los implementados son un subconjunto del catálogo declarado', () => {
    for (const l of layoutsImplementados()) {
      expect(LAYOUTS).toContain(l)
    }
  })

  it('hoy están implementados al menos portada y kpis', () => {
    expect(layoutsImplementados()).toEqual(
      expect.arrayContaining(['portada', 'kpis-fila-dos-columnas']),
    )
  })

  it('esLayoutImplementado distingue implementado de solo-declarado', () => {
    expect(esLayoutImplementado('portada')).toBe(true)
    expect(esLayoutImplementado('matriz-estados')).toBe(false)
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test -- catalogo`
Expected: FAIL — no resuelve `./catalogo`

- [ ] **Step 3: Implementar el catálogo como fuente única**

Crear `src/motor/catalogo.ts`. El registro vive en `Slide.tsx`; para no duplicarlo, se exporta desde ahí y el catálogo lo lee.

```ts
import type { DecisionSlide } from '@/decision/esquema'
import { REGISTRO_LAYOUTS } from '@/componentes/deck/Slide'

export function layoutsImplementados(): DecisionSlide['layout'][] {
  return Object.keys(REGISTRO_LAYOUTS) as DecisionSlide['layout'][]
}

export function esLayoutImplementado(layout: DecisionSlide['layout']): boolean {
  return layout in REGISTRO_LAYOUTS
}
```

- [ ] **Step 4: Escribir el test del layout seguro que falla**

Crear `src/componentes/deck/layouts/LayoutSeguro.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LayoutSeguro } from './LayoutSeguro'
import { ProveedorTema } from '@/componentes/ProveedorTema'
import { obtenerTema } from '@/temas'

function pintar(decision: Parameters<typeof LayoutSeguro>[0]['decision'], motivo: string) {
  return render(
    <ProveedorTema tema={obtenerTema('neracode')} superficie="clara">
      <LayoutSeguro decision={decision} motivo={motivo} />
    </ProveedorTema>,
  )
}

describe('LayoutSeguro', () => {
  it('muestra el título y no pierde el contenido', () => {
    pintar(
      { layout: 'matriz-estados', titulo: 'Focos Q3', cuerpo: ['Retail primero', 'Manufactura después'], razon: 'x' },
      'layout sin componente',
    )
    expect(screen.getByText('Focos Q3')).toBeInTheDocument()
    expect(screen.getByText('Retail primero')).toBeInTheDocument()
  })

  it('marca visiblemente que requiere revisión, con el motivo', () => {
    pintar({ layout: 'matriz-estados', titulo: 'x', razon: 'y' }, 'layout sin componente')
    const marca = screen.getByTestId('requiere-revision')
    expect(marca).toHaveTextContent(/revisión/i)
    expect(marca).toHaveTextContent('layout sin componente')
  })
})
```

- [ ] **Step 5: Implementar el layout seguro**

Crear `src/componentes/deck/layouts/LayoutSeguro.tsx`:

```tsx
import type { DecisionSlide } from '@/decision/esquema'
import estilos from '../deck.module.css'

interface Props {
  decision: DecisionSlide
  motivo: string
}

export function LayoutSeguro({ decision, motivo }: Props) {
  return (
    <section className={estilos.slide} data-layout="layout-seguro" data-degradado="true"
             role="region" aria-label={decision.titulo}>
      <div data-testid="requiere-revision" className={estilos.avisoRevision}>
        ⚠ Requiere revisión — {motivo}
      </div>
      <h2 className={estilos.titulo}>{decision.titulo}</h2>
      {decision.subtitulo && <p className={estilos.subtitulo}>{decision.subtitulo}</p>}
      {decision.cuerpo && (
        <ul>{decision.cuerpo.map((t) => <li key={t}>{t}</li>)}</ul>
      )}
    </section>
  )
}
```

Añadir a `deck.module.css` la clase `.avisoRevision` (fondo de acento suave del tema, texto legible, esquina superior — sin colores literales, con tokens: `background: color-mix(in srgb, var(--acento) 18%, var(--superficie)); color: var(--texto);`).

- [ ] **Step 6: Exportar el registro y degradar el despachador**

Modificar `src/componentes/deck/Slide.tsx`: exportar el registro con nombre `REGISTRO_LAYOUTS` y, cuando un layout no tenga componente, renderizar `LayoutSeguro` con `motivo` en vez de lanzar.

```tsx
export const REGISTRO_LAYOUTS: Partial<Record<DecisionSlide['layout'], ComponenteLayout>> = {
  'portada': Portada,
  'kpis-fila-dos-columnas': KpisFilaDosColumnas,
}

export function Slide({ decision }: { decision: DecisionSlide }) {
  const Componente = REGISTRO_LAYOUTS[decision.layout]
  if (!Componente) {
    return <LayoutSeguro decision={decision} motivo={`El layout "${decision.layout}" aún no tiene componente`} />
  }
  return <Componente decision={decision} />
}
```

> El test de la Fase 1 que esperaba que `Slide` **lanzara** con `matriz-estados` cambia de intención: ahora debe verificar que renderiza el layout seguro con `data-degradado="true"`. Actualízalo sin debilitarlo — sigue comprobando que un layout no implementado no revienta el deck.

- [ ] **Step 7: Ejecutar toda la suite**

Run: `npm test`
Expected: PASS — incluidos los tests nuevos y el de `Slide` actualizado.

- [ ] **Step 8: Commit**

```bash
git add src/motor/catalogo.ts src/motor/catalogo.test.ts src/componentes/deck/layouts/LayoutSeguro.tsx src/componentes/deck/layouts/LayoutSeguro.test.tsx src/componentes/deck/Slide.tsx src/componentes/deck/deck.module.css
git commit -m "feat: layout seguro y catálogo de layouts como fuente única; el despachador degrada en vez de lanzar"
```

---

### Task 2: Etapa 1 — Normalizar contenido crudo a inventario tipado

**Files:**
- Create: `src/motor/inventario.ts`, `src/motor/normalizar.ts`
- Test: `src/motor/normalizar.test.ts`

**Interfaces:**
- Produces:
  - tipos `PiezaSerie`, `PiezaComparativo`, `PiezaCifra`, `PiezaLista`, `PiezaParrafo`, `PiezaImagen`, unidos en `PiezaInventario` (discriminada por `tipo`)
  - `type Inventario = { titulo: string; piezas: PiezaInventario[]; nota?: string }`
  - `normalizar(crudo: EntradaCruda): Inventario` — determinista

`EntradaCruda` es lo que el equipo pega/carga: `{ titulo, texto?, tablas?: string[][][], cifras?: {valor,rotulo,delta?}[], imagenes?: string[], nota? }`.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `src/motor/normalizar.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { normalizar } from './normalizar'

describe('normalizar', () => {
  it('convierte cifras sueltas en piezas de cifra+delta', () => {
    const inv = normalizar({
      titulo: 'Performance del sitio web',
      cifras: [{ valor: '9.2', rotulo: 'Posición media', delta: '-0.3' }],
    })
    const cifra = inv.piezas.find((p) => p.tipo === 'cifra')
    expect(cifra).toMatchObject({ valor: '9.2', rotulo: 'Posición media', delta: '-0.3' })
  })

  it('detecta un párrafo largo como pieza de párrafo', () => {
    const texto = 'No es un deterioro generalizado: las dos páginas con más tráfico mejoraron posición pero perdieron impresiones. El mix de consultas arrastra el promedio.'
    const inv = normalizar({ titulo: 'x', texto })
    expect(inv.piezas.some((p) => p.tipo === 'parrafo')).toBe(true)
  })

  it('convierte una tabla de 2 periodos en un comparativo', () => {
    const inv = normalizar({
      titulo: 'x',
      tablas: [[['', 'Mayo', 'Junio'], ['Sesiones', '1366', '968'], ['MQLs', '3', '1']]],
    })
    const comp = inv.piezas.find((p) => p.tipo === 'comparativo')
    expect(comp).toBeTruthy()
    expect(comp).toMatchObject({ periodos: ['Mayo', 'Junio'] })
  })

  it('conserva la nota dirigida a la IA', () => {
    const inv = normalizar({ titulo: 'x', nota: 'esto va destacado' })
    expect(inv.nota).toBe('esto va destacado')
  })

  it('es determinista', () => {
    const entrada = { titulo: 'x', cifras: [{ valor: '1', rotulo: 'a' }] }
    expect(normalizar(entrada)).toEqual(normalizar(entrada))
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test -- normalizar`
Expected: FAIL — no resuelve `./normalizar`

- [ ] **Step 3: Implementar los tipos y el parser**

Crear `src/motor/inventario.ts` con los tipos discriminados. Crear `src/motor/normalizar.ts` con el parser determinista: mapea `cifras` → piezas `cifra`; una tabla cuyo encabezado tiene exactamente dos columnas de datos → `comparativo`; una tabla mensual (≥3 columnas de meses) → `serie`; `texto` de más de ~120 caracteres → `parrafo`, si es más corto y con viñetas → `lista`; `imagenes` → piezas `imagen`. Sin llamadas a red, sin IA.

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npm test -- normalizar`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/motor/inventario.ts src/motor/normalizar.ts src/motor/normalizar.test.ts
git commit -m "feat: etapa 1 del motor — normaliza contenido crudo a inventario tipado"
```

---

### Task 3: El prompt y la etapa 2 (decidir con la IA)

**Esta es la tarea que Franco revisa personalmente** — es donde vive la calidad de la decisión.

**Files:**
- Create: `src/motor/prompt.ts`, `src/motor/decidir.ts`
- Test: `src/motor/prompt.test.ts`, `src/motor/decidir.test.ts`

**Interfaces:**
- Consumes: `Inventario`, `layoutsImplementados()`, `Tema`, `EsquemaDecision` de la Fase 1
- Produces:
  - `construirPrompt(inv: Inventario, tema: Tema): { system: string; user: string }` — puro, sin red
  - `type ClienteDecision` — la superficie mínima del SDK que `decidir` usa (para poder inyectar un mock)
  - `decidir(inv: Inventario, tema: Tema, cliente: ClienteDecision): Promise<DecisionSlide>`

- [ ] **Step 1: Escribir el test del prompt**

Crear `src/motor/prompt.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { construirPrompt } from './prompt'
import { obtenerTema } from '@/temas'

describe('construirPrompt', () => {
  const inv = { titulo: 'Performance', piezas: [{ tipo: 'cifra' as const, valor: '9.2', rotulo: 'Posición' }] }

  it('solo ofrece layouts implementados, nunca los del catálogo sin componente', () => {
    const { system } = construirPrompt(inv, obtenerTema('neracode'))
    expect(system).toContain('kpis-fila-dos-columnas')
    expect(system).not.toContain('matriz-estados')  // declarado pero sin componente
  })

  it('prohíbe explícitamente el estilo', () => {
    const { system } = construirPrompt(inv, obtenerTema('neracode'))
    expect(system.toLowerCase()).toMatch(/no.*color|nunca.*css|sin estilo/)
  })

  it('incluye la nota del autor cuando existe', () => {
    const { user } = construirPrompt({ ...inv, nota: 'esto va destacado' }, obtenerTema('neracode'))
    expect(user).toContain('esto va destacado')
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla; luego implementar el prompt**

Run: `npm test -- prompt` → FAIL. Implementar `src/motor/prompt.ts`:
- `system`: rol (maquetador que reparte, no diseña), la lista de layouts **derivada de `layoutsImplementados()`** con lo que cada uno admite, la regla dura "nunca devuelvas color, css, html, tamaños ni markup — solo decisiones y textos en texto plano", y la exigencia de `razon`.
- `user`: el inventario serializado + la nota del autor + el nombre de la sala.

- [ ] **Step 3: Escribir el test de `decidir` con cliente mockeado**

Crear `src/motor/decidir.test.ts`. El mock imita `client.messages.parse()` devolviendo `parsed_output`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { decidir } from './decidir'
import { obtenerTema } from '@/temas'

const inv = { titulo: 'Performance', piezas: [{ tipo: 'cifra' as const, valor: '9.2', rotulo: 'Posición', delta: '-0.3' }] }

function clienteQueDevuelve(decision: unknown) {
  return { messages: { parse: vi.fn().mockResolvedValue({ parsed_output: decision, stop_reason: 'end_turn' }) } }
}

describe('decidir', () => {
  it('devuelve la decisión validada contra el esquema', async () => {
    const valida = { layout: 'kpis-fila-dos-columnas', titulo: 'Performance',
      kpis: [{ valor: '9.2', delta: '-0.3', rotulo: 'Posición' }], razon: 'una cifra con delta' }
    const d = await decidir(inv, obtenerTema('neracode'), clienteQueDevuelve(valida))
    expect(d.layout).toBe('kpis-fila-dos-columnas')
  })

  it('rechaza una decisión con estilo aunque el modelo la haya devuelto', async () => {
    const conColor = { layout: 'portada', titulo: 'x', razon: 'y', color: '#FF0000' }
    await expect(decidir(inv, obtenerTema('neracode'), clienteQueDevuelve(conColor))).rejects.toThrow()
  })

  it('lanza un error claro si falta la API (parsed_output nulo)', async () => {
    const cliente = { messages: { parse: vi.fn().mockResolvedValue({ parsed_output: null, stop_reason: 'refusal' }) } }
    await expect(decidir(inv, obtenerTema('neracode'), cliente)).rejects.toThrow(/no devolvió|refus/i)
  })
})
```

- [ ] **Step 4: Ejecutar y verificar que falla; implementar `decidir`**

Run: `npm test -- decidir` → FAIL. Implementar `src/motor/decidir.ts`:

```ts
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { Tema } from '@/temas/tipos'
import type { Inventario } from './inventario'
import { EsquemaDecision, parsearDecision, type DecisionSlide } from '@/decision/esquema'
import { construirPrompt } from './prompt'

export interface ClienteDecision {
  messages: { parse: (args: unknown) => Promise<{ parsed_output: unknown; stop_reason?: string }> }
}

export function crearClientePorDefecto(): ClienteDecision {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Falta ANTHROPIC_API_KEY para la etapa de decisión del motor')
  }
  return new Anthropic() as unknown as ClienteDecision
}

export async function decidir(inv: Inventario, tema: Tema, cliente: ClienteDecision): Promise<DecisionSlide> {
  const { system, user } = construirPrompt(inv, tema)
  const resp = await cliente.messages.parse({
    model: 'claude-opus-4-8',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium', format: zodOutputFormat(EsquemaDecision) },
    system,
    messages: [{ role: 'user', content: user }],
  })
  if (!resp.parsed_output) {
    throw new Error(`El modelo no devolvió una decisión (stop_reason: ${resp.stop_reason ?? 'desconocido'})`)
  }
  return parsearDecision(resp.parsed_output)   // candado: revalida contra el esquema estricto
}
```

> `zodOutputFormat` retira `.min()`/`.refine()` del schema enviado y los valida del lado cliente; `parsearDecision` los vuelve a exigir. Doble candado: el formato guía al modelo, el parse estricto es la última palabra.

- [ ] **Step 5: Ejecutar y verificar que pasa**

Run: `npm test -- 'prompt|decidir'`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/motor/prompt.ts src/motor/prompt.test.ts src/motor/decidir.ts src/motor/decidir.test.ts
git commit -m "feat: etapa 2 del motor — prompt derivado del catálogo y decisión con salida estructurada validada"
```

---

### Task 4: Etapa 3 — Validar, reintentar y degradar

**Files:**
- Create: `src/motor/validar.ts`
- Test: `src/motor/validar.test.ts`

**Interfaces:**
- Consumes: `DecisionSlide`, `Inventario`, `esLayoutImplementado`
- Produces:
  - `type Veredicto = { ok: true } | { ok: false; motivo: string }`
  - `validarDecision(decision: DecisionSlide, inv: Inventario): Veredicto` — comprueba: layout implementado; que no se hayan perdido las cifras del inventario; que un layout de KPIs traiga KPIs; que no queden secciones vacías
  - `aLayoutSeguro(decision: DecisionSlide, motivo: string): DecisionSlide` — reetiqueta la decisión al layout seguro conservando el contenido

- [ ] **Step 1: Escribir los tests que fallan**

Crear `src/motor/validar.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validarDecision } from './validar'

const invConDosCifras = { titulo: 'x', piezas: [
  { tipo: 'cifra' as const, valor: '9.2', rotulo: 'Posición' },
  { tipo: 'cifra' as const, valor: '29k', rotulo: 'Impresiones' },
] }

describe('validarDecision', () => {
  it('acepta una decisión de KPIs que conserva las cifras', () => {
    const d = { layout: 'kpis-fila-dos-columnas' as const, titulo: 'x',
      kpis: [{ valor: '9.2', rotulo: 'Posición' }, { valor: '29k', rotulo: 'Impresiones' }], razon: 'r' }
    expect(validarDecision(d, invConDosCifras).ok).toBe(true)
  })

  it('rechaza un layout aún no implementado', () => {
    const d = { layout: 'matriz-estados' as const, titulo: 'x', razon: 'r' }
    const v = validarDecision(d, invConDosCifras)
    expect(v.ok).toBe(false)
  })

  it('rechaza una decisión de KPIs que perdió cifras del inventario', () => {
    const d = { layout: 'kpis-fila-dos-columnas' as const, titulo: 'x',
      kpis: [{ valor: '9.2', rotulo: 'Posición' }], razon: 'r' }  // faltó una
    expect(validarDecision(d, invConDosCifras).ok).toBe(false)
  })
})
```

- [ ] **Step 2: Ejecutar → FAIL; implementar `src/motor/validar.ts`**

Run: `npm test -- validar` → FAIL. Implementar las comprobaciones y `aLayoutSeguro`.

- [ ] **Step 3: Ejecutar y verificar que pasa**

Run: `npm test -- validar`
Expected: PASS — 3 tests.

- [ ] **Step 4: Commit**

```bash
git add src/motor/validar.ts src/motor/validar.test.ts
git commit -m "feat: etapa 3 del motor — validación de la decisión con degradación a layout seguro"
```

---

### Task 5: El orquestador

**Files:**
- Create: `src/motor/maquetar.ts`
- Test: `src/motor/maquetar.test.ts`

**Interfaces:**
- Produces:
  - `maquetarItem(crudo: EntradaCruda, tema: Tema, cliente: ClienteDecision): Promise<{ decision: DecisionSlide; degradado: boolean; motivo?: string }>` — normaliza → decide → valida; si no valida, reintenta una vez con la restricción explícita; si vuelve a fallar, degrada
  - `maquetarSesion(items: EntradaCruda[], slugSala: string, cliente?: ClienteDecision): Promise<DecisionSlide[]>`

- [ ] **Step 1: Escribir el test con cliente mockeado**

Crear `src/motor/maquetar.test.ts` — el cliente mock devuelve primero una decisión inválida (layout no implementado) y luego una válida, para probar el reintento; y un caso donde ambas fallan y se degrada.

```ts
import { describe, it, expect, vi } from 'vitest'
import { maquetarItem } from './maquetar'
import { obtenerTema } from '@/temas'

const crudo = { titulo: 'Performance', cifras: [{ valor: '9.2', rotulo: 'Posición', delta: '-0.3' }] }
const valida = { layout: 'kpis-fila-dos-columnas', titulo: 'Performance',
  kpis: [{ valor: '9.2', delta: '-0.3', rotulo: 'Posición' }], razon: 'r' }
const invalida = { layout: 'matriz-estados', titulo: 'Performance', razon: 'r' }

describe('maquetarItem', () => {
  it('reintenta cuando la primera decisión no valida y acepta la segunda', async () => {
    const parse = vi.fn()
      .mockResolvedValueOnce({ parsed_output: invalida })
      .mockResolvedValueOnce({ parsed_output: valida })
    const r = await maquetarItem(crudo, obtenerTema('neracode'), { messages: { parse } })
    expect(r.degradado).toBe(false)
    expect(r.decision.layout).toBe('kpis-fila-dos-columnas')
    expect(parse).toHaveBeenCalledTimes(2)
  })

  it('degrada al layout seguro si ambos intentos fallan', async () => {
    const parse = vi.fn().mockResolvedValue({ parsed_output: invalida })
    const r = await maquetarItem(crudo, obtenerTema('neracode'), { messages: { parse } })
    expect(r.degradado).toBe(true)
    expect(r.motivo).toMatch(/matriz-estados|no implementado/i)
  })
})
```

- [ ] **Step 2: Ejecutar → FAIL; implementar el orquestador**

Encadena `normalizar` → `decidir` → `validarDecision`; en fallo, reintenta una vez añadiendo el motivo al prompt; si el segundo intento tampoco valida, `aLayoutSeguro`.

- [ ] **Step 3: Ejecutar toda la suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/motor/maquetar.ts src/motor/maquetar.test.ts
git commit -m "feat: orquestador del motor — normalizar → decidir → validar, con reintento y degradación"
```

---

### Task 6: Criterio de aceptación — el deck real de NeraCode desde contenido crudo

**Esta tarea la corre Franco (o alguien con `ANTHROPIC_API_KEY`), y se revisa a ojo.** Es la prueba de fuego del spec.

**Files:**
- Create: `src/fixtures/nc-crudo-junio-2026.ts`, `src/app/motor-demo/page.tsx`

**Interfaces:**
- Consumes: `maquetarSesion`, `Deck` de la Fase 1

- [ ] **Step 1: Escribir el fixture crudo**

Crear `src/fixtures/nc-crudo-junio-2026.ts` con el contenido **sin maquetar** de la sección "Performance · Sitio web" de NeraCode junio 2026 (las 4 cifras con delta + los dos bloques de hallazgos/acciones), como `EntradaCruda[]`. Esto es lo que el equipo pegaría en el cuestionario.

- [ ] **Step 2: Crear la página de demostración del motor**

Crear `src/app/motor-demo/page.tsx` — un Server Action que llama `maquetarSesion(NC_CRUDO_JUNIO_2026, 'neracode')` con el cliente real, y renderiza el resultado con `<Deck>`. Si falta la API key, muestra un aviso claro en vez de reventar.

- [ ] **Step 3: Verificación con API real (requiere `ANTHROPIC_API_KEY`)**

```bash
export ANTHROPIC_API_KEY=...   # la de Franco
npm run dev &
sleep 6
node ~/.claude/tools/webshot/webshot.mjs "http://localhost:3000/motor-demo" --full --wait 4000
```

Leer el PNG y comprobar a ojo, contra el deck original de NeraCode:
- La IA eligió `kpis-fila-dos-columnas` para la sección de performance (las 4 cifras arriba, hallazgos y acciones a dos columnas).
- Las cuatro cifras están, con sus deltas, ninguna perdida.
- Ningún slide cayó al layout seguro (o si cayó, el motivo es legítimo).
- El deck lleva la marca de NeraCode.
- **La comparación clave:** ¿es mejor que el original? Los gráficos y cifras se ven nativos con la marca, no capturas de Looker.

- [ ] **Step 4: Registrar el veredicto**

Escribir en el reporte: qué layout eligió la IA para cada sección, cuántos slides se degradaron y por qué, y el juicio de Franco sobre si el motor está listo para ampliar el catálogo. **Si el motor no produce un resultado digno, esta fase termina aquí con esa conclusión** — es exactamente lo que el spec quería saber antes de construir alrededor.

- [ ] **Step 5: Commit**

```bash
git add src/fixtures/nc-crudo-junio-2026.ts src/app/motor-demo
git commit -m "feat: criterio de aceptación del motor — deck de NeraCode desde contenido crudo"
```

---

## Definición de terminado — Fase 2a

- [ ] Etapas 1, 3 y 4 con tests que pasan sin red
- [ ] Etapa 2 con tests de cliente mockeado; corrida real pendiente solo de la API key
- [ ] El despachador degrada a layout seguro en vez de lanzar
- [ ] El prompt deriva los layouts del registro, no de una lista escrita a mano
- [ ] `npm test` y `npm run build` limpios
- [ ] Criterio de aceptación corrido con la API de Franco y su veredicto registrado

## Lo que decide esta fase

Si el motor produce un slide digno de la sección de NeraCode con solo dos layouts, **la Fase 2b amplía el catálogo** (los 11 layouts restantes + los 5 gráficos) con confianza. Si no, sabremos qué falla —el prompt, el esquema, el catálogo— antes de haber construido nada alrededor. Ese es el punto entero de hacer el corte vertical primero.
