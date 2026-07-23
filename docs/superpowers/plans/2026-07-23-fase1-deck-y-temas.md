# Fase 1 · Deck y temas — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renderizar un deck completo con la identidad visual de cualquiera de las 10 salas, a partir de un JSON de decisiones escrito a mano — sin base de datos, sin autenticación y sin IA.

**Architecture:** Un motor de render paramétrico. Los layouts no conocen colores: consumen tokens CSS que inyecta el tema de la sala. Cada tema deriva además una escala de datos validada por contraste, separada de su paleta de marca, que es la que usan los gráficos SVG propios. El JSON de decisiones que en la Fase 2 producirá la IA, en esta fase se escribe a mano — así el contrato queda probado antes de que exista el motor que lo genera.

**Tech Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Vitest · Zod · next/font · SVG propio (sin librería de charts).

## Global Constraints

- **Nunca un color literal dentro de un layout o un gráfico.** Todo color se lee de una CSS custom property del tema. Un `#` dentro de `components/deck/` o `components/graficos/` es un defecto.
- **La escala de datos no es la paleta de marca.** Los gráficos usan `--dato-1` … `--dato-6`, derivados y validados por contraste ≥ 3:1 contra la superficie del tema.
- **Contraste mínimo:** 3:1 (WCAG 2.1 non-text) para elementos gráficos; 4.5:1 para texto de cuerpo.
- **Idioma de la interfaz y del código de dominio:** español. Nombres de funciones, tipos y variables de dominio en español (`derivarEscalaDatos`, `Tema`, `DecisionSlide`). Términos técnicos universales quedan en inglés (`props`, `render`, `hex`).
- **Tipografías self-hosted.** Nada de CDN de Google Fonts en runtime — todo vía `next/font`.
- **Identidades de marca:** los valores canónicos están en `~/.claude/upax-context/brand/brand-matrix.md`. No inventar hex ni tipografías; copiarlos de ahí.
- **TDD:** cada tarea empieza por un test que falla.
- **Commits frecuentes**, uno por tarea como mínimo.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/lib/color.ts` | Conversión hex↔RGB↔HSL, luminancia relativa, ratio de contraste. Puro, sin dependencias. |
| `src/lib/escala-datos.ts` | Deriva N colores de datos desde un primario, garantizando contraste contra una superficie. |
| `src/temas/tipos.ts` | El tipo `Tema` y sus sub-tipos. Contrato entre temas y render. |
| `src/temas/<sala>.ts` | Un archivo por sala. Solo datos, cero lógica. |
| `src/temas/index.ts` | Registro de las 10 salas y `obtenerTema(slug)`. |
| `src/temas/fuentes.ts` | Declaración `next/font` de todas las familias, y el mapa sala → familia. |
| `src/componentes/ProveedorTema.tsx` | Convierte un `Tema` en CSS custom properties sobre un contenedor. |
| `src/decision/esquema.ts` | Esquema Zod del contrato de decisión + `parsearDecision()`. |
| `src/componentes/graficos/*.tsx` | Un archivo por tipo de gráfico. SVG puro, tokens del tema. |
| `src/componentes/deck/layouts/*.tsx` | Un archivo por layout del catálogo. |
| `src/componentes/deck/Slide.tsx` | Despacha `decision.layout` al componente correcto. |
| `src/componentes/deck/Deck.tsx` | Navegación entre slides y modo presentación. |
| `src/app/demo/[sala]/page.tsx` | Página de demostración que renderiza un fixture. |
| `src/fixtures/nc-junio-2026.ts` | El deck real de NeraCode de junio, escrito a mano como decisiones. |

Cada gráfico y cada layout viven en su propio archivo: son las piezas que más van a cambiar y las que más conviene poder leer completas de una sentada.

---

### Task 1: Scaffold del proyecto

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/lib/saludo.ts`
- Test: `src/lib/saludo.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: proyecto Next.js con TypeScript y Vitest ejecutándose. Comandos `npm run dev`, `npm run build`, `npm test`.

- [ ] **Step 1: Crear el proyecto Next.js**

Ejecutar en `~/mktcorp-estatus` (el repo ya existe, con `docs/` y `.gitignore`):

```bash
cd ~/mktcorp-estatus
npx create-next-app@latest . --typescript --app --src-dir --no-tailwind --eslint --import-alias "@/*" --no-turbopack --yes
```

Si pregunta por sobrescribir archivos existentes, aceptar: solo toca `.gitignore` y `README.md`, que están versionados y se pueden revisar con `git diff`.

- [ ] **Step 2: Instalar dependencias de test y validación**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
npm install zod
```

- [ ] **Step 3: Configurar Vitest**

Crear `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
})
```

Crear `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

Añadir a `package.json`, dentro de `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Escribir un test que falla**

Crear `src/lib/saludo.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { saludo } from './saludo'

describe('saludo', () => {
  it('nombra el proyecto', () => {
    expect(saludo()).toBe('mktcorp-estatus')
  })
})
```

- [ ] **Step 5: Ejecutar el test y verificar que falla**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./saludo"`

- [ ] **Step 6: Implementar lo mínimo**

Crear `src/lib/saludo.ts`:

```ts
export function saludo(): string {
  return 'mktcorp-estatus'
}
```

- [ ] **Step 7: Ejecutar el test y verificar que pasa**

Run: `npm test`
Expected: PASS — `1 passed`

- [ ] **Step 8: Verificar que el build funciona**

Run: `npm run build`
Expected: termina sin errores, imprime la tabla de rutas con `/`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + TypeScript + Vitest"
```

---

### Task 2: Utilidades de color y contraste

**Files:**
- Create: `src/lib/color.ts`
- Test: `src/lib/color.test.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `hexARgb(hex: string): { r: number; g: number; b: number }`
  - `rgbAHex(r: number, g: number, b: number): string`
  - `hexAHsl(hex: string): { h: number; s: number; l: number }` — h en grados 0–360, s y l en 0–100
  - `hslAHex(h: number, s: number, l: number): string`
  - `luminancia(hex: string): number` — luminancia relativa WCAG, 0–1
  - `contraste(a: string, b: string): number` — ratio WCAG, 1–21

- [ ] **Step 1: Escribir los tests que fallan**

Crear `src/lib/color.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { hexARgb, rgbAHex, hexAHsl, hslAHex, luminancia, contraste } from './color'

describe('hexARgb', () => {
  it('convierte un hex de 6 dígitos', () => {
    expect(hexARgb('#3E31CC')).toEqual({ r: 62, g: 49, b: 204 })
  })

  it('acepta hex sin numeral', () => {
    expect(hexARgb('FF004F')).toEqual({ r: 255, g: 0, b: 79 })
  })

  it('rechaza un hex inválido', () => {
    expect(() => hexARgb('#ZZZ')).toThrow()
  })
})

describe('rgbAHex', () => {
  it('vuelve al hex original en mayúsculas', () => {
    expect(rgbAHex(62, 49, 204)).toBe('#3E31CC')
  })

  it('rellena con cero a la izquierda', () => {
    expect(rgbAHex(0, 0, 15)).toBe('#00000F')
  })
})

describe('hexAHsl y hslAHex', () => {
  it('el viaje de ida y vuelta conserva el color', () => {
    const original = '#F72585'
    const { h, s, l } = hexAHsl(original)
    expect(hslAHex(h, s, l)).toBe(original)
  })

  it('el blanco tiene luminosidad 100 y saturación 0', () => {
    const { s, l } = hexAHsl('#FFFFFF')
    expect(l).toBe(100)
    expect(s).toBe(0)
  })
})

describe('luminancia', () => {
  it('el blanco es 1', () => {
    expect(luminancia('#FFFFFF')).toBeCloseTo(1, 4)
  })

  it('el negro es 0', () => {
    expect(luminancia('#000000')).toBeCloseTo(0, 4)
  })
})

describe('contraste', () => {
  it('blanco contra negro es 21', () => {
    expect(contraste('#FFFFFF', '#000000')).toBeCloseTo(21, 2)
  })

  it('un color contra sí mismo es 1', () => {
    expect(contraste('#3E31CC', '#3E31CC')).toBeCloseTo(1, 4)
  })

  it('es simétrico', () => {
    expect(contraste('#F94700', '#11373E')).toBeCloseTo(contraste('#11373E', '#F94700'), 6)
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test -- color`
Expected: FAIL — `Failed to resolve import "./color"`

- [ ] **Step 3: Implementar**

Crear `src/lib/color.ts`:

```ts
export interface Rgb { r: number; g: number; b: number }
export interface Hsl { h: number; s: number; l: number }

export function hexARgb(hex: string): Rgb {
  const limpio = hex.replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(limpio)) {
    throw new Error(`Hex inválido: ${hex}`)
  }
  return {
    r: parseInt(limpio.slice(0, 2), 16),
    g: parseInt(limpio.slice(2, 4), 16),
    b: parseInt(limpio.slice(4, 6), 16),
  }
}

export function rgbAHex(r: number, g: number, b: number): string {
  const parte = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).toUpperCase().padStart(2, '0')
  return `#${parte(r)}${parte(g)}${parte(b)}`
}

export function hexAHsl(hex: string): Hsl {
  const { r, g, b } = hexARgb(hex)
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  const l = (max + min) / 2

  let h = 0
  let s = 0

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case rn: h = ((gn - bn) / d) % 6; break
      case gn: h = (bn - rn) / d + 2; break
      default: h = (rn - gn) / d + 4
    }
    h *= 60
    if (h < 0) h += 360
  }

  return { h, s: s * 100, l: l * 100 }
}

export function hslAHex(h: number, s: number, l: number): string {
  const sn = s / 100, ln = l / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const hp = (((h % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  const m = ln - c / 2

  let rp = 0, gp = 0, bp = 0
  if (hp < 1) { rp = c; gp = x }
  else if (hp < 2) { rp = x; gp = c }
  else if (hp < 3) { gp = c; bp = x }
  else if (hp < 4) { gp = x; bp = c }
  else if (hp < 5) { rp = x; bp = c }
  else { rp = c; bp = x }

  return rgbAHex((rp + m) * 255, (gp + m) * 255, (bp + m) * 255)
}

export function luminancia(hex: string): number {
  const { r, g, b } = hexARgb(hex)
  const canal = (v: number) => {
    const n = v / 255
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}

export function contraste(a: string, b: string): number {
  const la = luminancia(a)
  const lb = luminancia(b)
  const claro = Math.max(la, lb)
  const oscuro = Math.min(la, lb)
  return (claro + 0.05) / (oscuro + 0.05)
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npm test -- color`
Expected: PASS — 11 tests.

Si el test de ida y vuelta HSL falla por un dígito, es redondeo: `hslAHex` debe redondear al construir el hex, cosa que ya hace `rgbAHex`. No relajar el test a `toBeCloseTo` sobre strings — corregir el redondeo.

- [ ] **Step 5: Commit**

```bash
git add src/lib/color.ts src/lib/color.test.ts
git commit -m "feat: utilidades de color, luminancia y contraste WCAG"
```

---

### Task 3: Escala de datos derivada y validada

**Files:**
- Create: `src/lib/escala-datos.ts`
- Test: `src/lib/escala-datos.test.ts`

**Interfaces:**
- Consumes: `hexAHsl`, `hslAHex`, `contraste` de `src/lib/color.ts`
- Produces: `derivarEscalaDatos(primario: string, superficie: string, cantidad?: number): string[]` — devuelve `cantidad` colores (por defecto 6), todos con contraste ≥ 3 contra `superficie`, con matices separados entre sí.

Esta es la pieza que evita que una marca con dos azules parecidos produzca gráficos ilegibles.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `src/lib/escala-datos.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { derivarEscalaDatos } from './escala-datos'
import { contraste, hexAHsl } from './color'

const CASOS: Array<{ sala: string; primario: string; superficie: string }> = [
  { sala: 'NeraCode',        primario: '#3E31CC', superficie: '#FFFFFF' },
  { sala: 'Research Land',   primario: '#1E0FF2', superficie: '#FFFFFF' },
  { sala: 'Promo Espacio',   primario: '#F94700', superficie: '#FFFFFF' },
  { sala: 'Mexa Creativa',   primario: '#F72585', superficie: '#FFFFFF' },
  { sala: 'Marketing United',primario: '#0000FF', superficie: '#FFFFFF' },
  { sala: 'House of Films',  primario: '#3B7BF7', superficie: '#FFFFFF' },
  { sala: 'UiX',             primario: '#8C59FE', superficie: '#FFFFFF' },
  { sala: 'Zeus',            primario: '#FF004F', superficie: '#FFFFFF' },
  { sala: 'Grupo UPAX',      primario: '#E34714', superficie: '#FFFFFF' },
  { sala: 'NeraCode oscuro', primario: '#3E31CC', superficie: '#07184F' },
]

describe('derivarEscalaDatos', () => {
  it('devuelve la cantidad pedida', () => {
    expect(derivarEscalaDatos('#3E31CC', '#FFFFFF')).toHaveLength(6)
    expect(derivarEscalaDatos('#3E31CC', '#FFFFFF', 4)).toHaveLength(4)
  })

  it('el primer color conserva el matiz del primario', () => {
    const [primero] = derivarEscalaDatos('#F72585', '#FFFFFF')
    const matizPrimario = hexAHsl('#F72585').h
    const matizPrimero = hexAHsl(primero).h
    expect(Math.abs(matizPrimero - matizPrimario)).toBeLessThan(6)
  })

  it.each(CASOS)('$sala: los 6 colores contrastan ≥ 3:1 contra su superficie', ({ primario, superficie }) => {
    for (const color of derivarEscalaDatos(primario, superficie)) {
      expect(contraste(color, superficie)).toBeGreaterThanOrEqual(3)
    }
  })

  it.each(CASOS)('$sala: los matices están separados al menos 20°', ({ primario, superficie }) => {
    const matices = derivarEscalaDatos(primario, superficie).map((c) => hexAHsl(c).h)
    for (let i = 0; i < matices.length; i++) {
      for (let j = i + 1; j < matices.length; j++) {
        const bruto = Math.abs(matices[i] - matices[j])
        const distancia = Math.min(bruto, 360 - bruto)
        expect(distancia).toBeGreaterThanOrEqual(20)
      }
    }
  })

  it('es determinista: la misma entrada da la misma salida', () => {
    expect(derivarEscalaDatos('#00CFAB', '#FFFFFF')).toEqual(derivarEscalaDatos('#00CFAB', '#FFFFFF'))
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test -- escala-datos`
Expected: FAIL — `Failed to resolve import "./escala-datos"`

- [ ] **Step 3: Implementar**

Crear `src/lib/escala-datos.ts`:

```ts
import { hexAHsl, hslAHex, contraste } from './color'

const CONTRASTE_MINIMO = 3
const SEPARACION_MATIZ = 360 / 6.4 // ≈56° — con 6 colores garantiza más de 20° entre cualquier par

/**
 * Deriva colores de datos desde el primario de una marca.
 * El primero conserva el matiz del primario; el resto rota el matiz.
 * De cada uno se ajusta la luminosidad hasta alcanzar contraste suficiente
 * contra la superficie sobre la que se va a pintar.
 */
export function derivarEscalaDatos(primario: string, superficie: string, cantidad = 6): string[] {
  const base = hexAHsl(primario)
  const superficieClara = hexAHsl(superficie).l >= 50

  return Array.from({ length: cantidad }, (_, i) => {
    const h = (base.h + i * SEPARACION_MATIZ) % 360
    const s = Math.max(45, Math.min(95, base.s))
    return ajustarPorContraste(h, s, base.l, superficie, superficieClara)
  })
}

/**
 * Oscurece (sobre superficie clara) o aclara (sobre superficie oscura)
 * hasta cruzar el umbral de contraste. Devuelve el primer valor que cumple.
 */
function ajustarPorContraste(
  h: number,
  s: number,
  lInicial: number,
  superficie: string,
  superficieClara: boolean,
): string {
  const paso = superficieClara ? -2 : 2
  const limite = superficieClara ? 8 : 92

  let l = Math.max(8, Math.min(92, lInicial))

  for (let intento = 0; intento < 60; intento++) {
    const candidato = hslAHex(h, s, l)
    if (contraste(candidato, superficie) >= CONTRASTE_MINIMO) return candidato
    if (superficieClara ? l <= limite : l >= limite) break
    l += paso
  }

  // Último recurso: el extremo del rango, que siempre contrasta contra su opuesto.
  return hslAHex(h, s, superficieClara ? 8 : 92)
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npm test -- escala-datos`
Expected: PASS — 24 tests (2 + 1 + 10 + 10 + 1).

Si falla la separación de matices, subir `SEPARACION_MATIZ`. Si falla el contraste en la superficie oscura `#07184F`, revisar que `superficieClara` esté evaluando la superficie y no el primario.

- [ ] **Step 5: Commit**

```bash
git add src/lib/escala-datos.ts src/lib/escala-datos.test.ts
git commit -m "feat: escala de datos derivada del primario y validada por contraste"
```

---

### Task 4: El tipo Tema y las 10 salas

**Files:**
- Create: `src/temas/tipos.ts`, `src/temas/neracode.ts`, `src/temas/research-land.ts`, `src/temas/promo-espacio.ts`, `src/temas/mexa-creativa.ts`, `src/temas/marketing-united.ts`, `src/temas/house-of-films.ts`, `src/temas/uix.ts`, `src/temas/zeus.ts`, `src/temas/ceci.ts`, `src/temas/grupo-upax.ts`, `src/temas/index.ts`
- Test: `src/temas/temas.test.ts`

**Interfaces:**
- Consumes: `derivarEscalaDatos` de `src/lib/escala-datos.ts`
- Produces:
  - `type Tema` con: `slug`, `nombre`, `primario`, `secundario`, `acento`, `superficieClara`, `superficieOscura`, `textoSobreClara`, `textoSobreOscura`, `gradiente: string[]`, `familiaDisplay`, `familiaTexto`
  - `TEMAS: Record<string, Tema>`
  - `obtenerTema(slug: string): Tema` — lanza si el slug no existe
  - `slugsDeSalas(): string[]`

Los valores salen de `~/.claude/upax-context/brand/brand-matrix.md`. No inventar ninguno.

> **Tres superficies oscuras no vienen de ningún brandbook** y están marcadas como derivadas, no como color de marca: Research Land `#1A0B33`, UiX `#1B1436`, y Grupo UPAX / Ceci `#1E1B4B` (este último muestreado del deck de NC, no declarado). Los brandbooks de esas marcas no definen un fondo oscuro. Se usan para portadas y divisores; si alguna de esas marcas define el suyo, se sustituye en su archivo de tema y nada más cambia.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `src/temas/temas.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { TEMAS, obtenerTema, slugsDeSalas } from './index'
import { contraste } from '@/lib/color'
import { derivarEscalaDatos } from '@/lib/escala-datos'

describe('registro de temas', () => {
  it('tiene exactamente las 10 salas', () => {
    expect(slugsDeSalas().sort()).toEqual([
      'ceci', 'grupo-upax', 'house-of-films', 'marketing-united', 'mexa-creativa',
      'neracode', 'promo-espacio', 'research-land', 'uix', 'zeus',
    ])
  })

  it('obtenerTema devuelve el tema pedido', () => {
    expect(obtenerTema('zeus').primario).toBe('#FF004F')
  })

  it('obtenerTema lanza si la sala no existe', () => {
    expect(() => obtenerTema('mkt-corp')).toThrow(/mkt-corp/)
  })
})

describe.each(Object.values(TEMAS))('tema $nombre', (tema) => {
  it('tiene todos los hex en formato válido', () => {
    const hexes = [
      tema.primario, tema.secundario, tema.acento,
      tema.superficieClara, tema.superficieOscura,
      tema.textoSobreClara, tema.textoSobreOscura,
      ...tema.gradiente,
    ]
    for (const h of hexes) expect(h).toMatch(/^#[0-9A-F]{6}$/)
  })

  it('el texto sobre superficie clara contrasta ≥ 4.5:1', () => {
    expect(contraste(tema.textoSobreClara, tema.superficieClara)).toBeGreaterThanOrEqual(4.5)
  })

  it('el texto sobre superficie oscura contrasta ≥ 4.5:1', () => {
    expect(contraste(tema.textoSobreOscura, tema.superficieOscura)).toBeGreaterThanOrEqual(4.5)
  })

  it('su escala de datos es legible sobre ambas superficies', () => {
    for (const superficie of [tema.superficieClara, tema.superficieOscura]) {
      for (const color of derivarEscalaDatos(tema.primario, superficie)) {
        expect(contraste(color, superficie)).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('el gradiente tiene al menos dos paradas', () => {
    expect(tema.gradiente.length).toBeGreaterThanOrEqual(2)
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test -- temas`
Expected: FAIL — `Failed to resolve import "./index"`

- [ ] **Step 3: Definir el tipo**

Crear `src/temas/tipos.ts`:

```ts
export interface Tema {
  slug: string
  nombre: string
  /** Color de marca dominante. */
  primario: string
  secundario: string
  acento: string
  /** Fondo claro de los slides de contenido. */
  superficieClara: string
  /** Fondo oscuro de portadas y divisores. */
  superficieOscura: string
  textoSobreClara: string
  textoSobreOscura: string
  /** Paradas del gradiente de portada, en orden. */
  gradiente: string[]
  /** Clave de familia tipográfica, resuelta en src/temas/fuentes.ts */
  familiaDisplay: string
  familiaTexto: string
}
```

- [ ] **Step 4: Escribir los 10 temas**

Crear un archivo por sala. Ejemplo completo, `src/temas/neracode.ts`:

```ts
import type { Tema } from './tipos'

export const neracode: Tema = {
  slug: 'neracode',
  nombre: 'NeraCode',
  primario: '#3E31CC',
  secundario: '#1BE4BA',
  acento: '#F07A63',
  superficieClara: '#FFFFFF',
  superficieOscura: '#07184F',
  textoSobreClara: '#07184F',
  textoSobreOscura: '#FFFFFF',
  gradiente: ['#3E31CC', '#1BE4BA'],
  familiaDisplay: 'outfit',
  familiaTexto: 'outfit',
}
```

Los nueve restantes, con los valores de la matriz de marca:

```ts
// src/temas/research-land.ts
export const researchLand: Tema = {
  slug: 'research-land', nombre: 'Research Land',
  primario: '#1E0FF2', secundario: '#770EB3', acento: '#F7BB11',
  superficieClara: '#FFFFFF', superficieOscura: '#1A0B33',
  textoSobreClara: '#4D4D4D', textoSobreOscura: '#FFFFFF',
  gradiente: ['#1E0FF2', '#770EB3'],
  familiaDisplay: 'anton', familiaTexto: 'montserrat',
}

// src/temas/promo-espacio.ts
export const promoEspacio: Tema = {
  slug: 'promo-espacio', nombre: 'Promo Espacio',
  primario: '#F94700', secundario: '#11373E', acento: '#524D49',
  superficieClara: '#EBEBEB', superficieOscura: '#11373E',
  textoSobreClara: '#11373E', textoSobreOscura: '#FFFFFF',
  gradiente: ['#F94700', '#11373E'],
  familiaDisplay: 'montserrat', familiaTexto: 'montserrat',
}

// src/temas/mexa-creativa.ts
export const mexaCreativa: Tema = {
  slug: 'mexa-creativa', nombre: 'Mexa Creativa',
  primario: '#F72585', secundario: '#198FF9', acento: '#F6BE00',
  superficieClara: '#FFFFFF', superficieOscura: '#051A4A',
  textoSobreClara: '#2B2B2B', textoSobreOscura: '#FFFFFF',
  gradiente: ['#F72585', '#198FF9'],
  familiaDisplay: 'specialGothic', familiaTexto: 'raleway',
}

// src/temas/marketing-united.ts
export const marketingUnited: Tema = {
  slug: 'marketing-united', nombre: 'Marketing United',
  primario: '#0000FF', secundario: '#00FFF3', acento: '#DCFF00',
  superficieClara: '#FFFFFF', superficieOscura: '#0A3270',
  textoSobreClara: '#3A3A3A', textoSobreOscura: '#FFFFFF',
  gradiente: ['#0000FF', '#00FFF3'],
  familiaDisplay: 'bungee', familiaTexto: 'muktaMahee',
}

// src/temas/house-of-films.ts
export const houseOfFilms: Tema = {
  slug: 'house-of-films', nombre: 'House of Films',
  primario: '#3B7BF7', secundario: '#7B9DB8', acento: '#A9C0D4',
  superficieClara: '#FFFFFF', superficieOscura: '#000000',
  textoSobreClara: '#000000', textoSobreOscura: '#FFFFFF',
  gradiente: ['#3B7BF7', '#7B9DB8'],
  familiaDisplay: 'archivoExpanded', familiaTexto: 'hankenGrotesk',
}

// src/temas/uix.ts
export const uix: Tema = {
  slug: 'uix', nombre: 'UiX',
  primario: '#8C59FE', secundario: '#597AFF', acento: '#00C4B3',
  superficieClara: '#F0F0F3', superficieOscura: '#1B1436',
  textoSobreClara: '#1B1436', textoSobreOscura: '#FFFFFF',
  gradiente: ['#8C59FE', '#597AFF', '#67E32C'],
  familiaDisplay: 'satoshi', familiaTexto: 'satoshi',
}

// src/temas/zeus.ts
export const zeus: Tema = {
  slug: 'zeus', nombre: 'Zeus',
  primario: '#FF004F', secundario: '#614ACA', acento: '#00CFAB',
  superficieClara: '#E8EBF4', superficieOscura: '#202020',
  textoSobreClara: '#202020', textoSobreOscura: '#FFFFFF',
  gradiente: ['#FF004F', '#614ACA'],
  familiaDisplay: 'figtree', familiaTexto: 'figtree',
}

// src/temas/grupo-upax.ts
export const grupoUpax: Tema = {
  slug: 'grupo-upax', nombre: 'Grupo UPAX',
  primario: '#E34714', secundario: '#D72A5A', acento: '#5367E1',
  superficieClara: '#FFFFFF', superficieOscura: '#1E1B4B',
  textoSobreClara: '#1E1B4B', textoSobreOscura: '#FFFFFF',
  gradiente: ['#E34714', '#D72A5A', '#5367E1'],
  familiaDisplay: 'outfit', familiaTexto: 'outfit',
}

// src/temas/ceci.ts — hereda la identidad de Grupo UPAX; se distingue por su logo, no por su color
export const ceci: Tema = {
  slug: 'ceci', nombre: 'Ceci',
  primario: '#D72A5A', secundario: '#E34714', acento: '#5367E1',
  superficieClara: '#FFFFFF', superficieOscura: '#1E1B4B',
  textoSobreClara: '#1E1B4B', textoSobreOscura: '#FFFFFF',
  gradiente: ['#D72A5A', '#5367E1'],
  familiaDisplay: 'outfit', familiaTexto: 'outfit',
}
```

Cada uno en su archivo, con `import type { Tema } from './tipos'` arriba.

- [ ] **Step 5: Crear el registro**

Crear `src/temas/index.ts`:

```ts
import type { Tema } from './tipos'
import { neracode } from './neracode'
import { researchLand } from './research-land'
import { promoEspacio } from './promo-espacio'
import { mexaCreativa } from './mexa-creativa'
import { marketingUnited } from './marketing-united'
import { houseOfFilms } from './house-of-films'
import { uix } from './uix'
import { zeus } from './zeus'
import { ceci } from './ceci'
import { grupoUpax } from './grupo-upax'

export type { Tema } from './tipos'

export const TEMAS: Record<string, Tema> = {
  [neracode.slug]: neracode,
  [researchLand.slug]: researchLand,
  [promoEspacio.slug]: promoEspacio,
  [mexaCreativa.slug]: mexaCreativa,
  [marketingUnited.slug]: marketingUnited,
  [houseOfFilms.slug]: houseOfFilms,
  [uix.slug]: uix,
  [zeus.slug]: zeus,
  [ceci.slug]: ceci,
  [grupoUpax.slug]: grupoUpax,
}

export function obtenerTema(slug: string): Tema {
  const tema = TEMAS[slug]
  if (!tema) throw new Error(`No existe la sala "${slug}"`)
  return tema
}

export function slugsDeSalas(): string[] {
  return Object.keys(TEMAS)
}
```

- [ ] **Step 6: Ejecutar y verificar que pasa**

Run: `npm test -- temas`
Expected: PASS — 3 + (10 × 5) = 53 tests.

Si algún tema falla el contraste de texto, ajustar `textoSobreClara` u `superficieClara` de ese tema — nunca relajar el umbral del test. Ejemplo: si Research Land falla con `#4D4D4D` sobre blanco, oscurecerlo hasta cumplir.

- [ ] **Step 7: Commit**

```bash
git add src/temas
git commit -m "feat: las 10 salas como temas tipados, con contraste verificado"
```

---

### Task 5: Fuentes y proveedor de tema

**Files:**
- Create: `src/temas/fuentes.ts`, `src/componentes/ProveedorTema.tsx`
- Test: `src/componentes/ProveedorTema.test.tsx`

**Interfaces:**
- Consumes: `Tema` de `src/temas/tipos.ts`, `derivarEscalaDatos` de `src/lib/escala-datos.ts`
- Produces:
  - `familiaCss(clave: string): string` — devuelve la variable CSS de esa familia
  - `<ProveedorTema tema={tema} superficie="clara" | "oscura">{children}</ProveedorTema>` — inyecta las custom properties del tema en un `<div>` contenedor

Custom properties que expone:
`--primario`, `--secundario`, `--acento`, `--superficie`, `--texto`, `--gradiente`, `--fuente-display`, `--fuente-texto`, y `--dato-1` … `--dato-6`.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/componentes/ProveedorTema.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProveedorTema } from './ProveedorTema'
import { obtenerTema } from '@/temas'

describe('ProveedorTema', () => {
  it('inyecta el primario de la sala', () => {
    render(
      <ProveedorTema tema={obtenerTema('zeus')} superficie="clara">
        <span>contenido</span>
      </ProveedorTema>,
    )
    const contenedor = screen.getByTestId('tema')
    expect(contenedor.style.getPropertyValue('--primario')).toBe('#FF004F')
  })

  it('usa la superficie clara u oscura según se pida', () => {
    const { rerender } = render(
      <ProveedorTema tema={obtenerTema('neracode')} superficie="clara"><i /></ProveedorTema>,
    )
    expect(screen.getByTestId('tema').style.getPropertyValue('--superficie')).toBe('#FFFFFF')

    rerender(
      <ProveedorTema tema={obtenerTema('neracode')} superficie="oscura"><i /></ProveedorTema>,
    )
    expect(screen.getByTestId('tema').style.getPropertyValue('--superficie')).toBe('#07184F')
  })

  it('expone seis variables de datos', () => {
    render(<ProveedorTema tema={obtenerTema('uix')} superficie="clara"><i /></ProveedorTema>)
    const estilo = screen.getByTestId('tema').style
    for (let i = 1; i <= 6; i++) {
      expect(estilo.getPropertyValue(`--dato-${i}`)).toMatch(/^#[0-9A-F]{6}$/)
    }
  })

  it('renderiza a sus hijos', () => {
    render(
      <ProveedorTema tema={obtenerTema('ceci')} superficie="clara">
        <span>hola</span>
      </ProveedorTema>,
    )
    expect(screen.getByText('hola')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test -- ProveedorTema`
Expected: FAIL — `Failed to resolve import "./ProveedorTema"`

- [ ] **Step 3: Declarar las fuentes**

Crear `src/temas/fuentes.ts`:

```ts
import {
  Outfit, Montserrat, Raleway, Mukta_Mahee, Figtree,
  Anton, Bungee, Hanken_Grotesk, Archivo,
} from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'], variable: '--f-outfit' })
const montserrat = Montserrat({ subsets: ['latin'], variable: '--f-montserrat' })
const raleway = Raleway({ subsets: ['latin'], variable: '--f-raleway' })
const muktaMahee = Mukta_Mahee({ subsets: ['latin'], weight: ['300','400','500','600','700','800'], variable: '--f-mukta' })
const figtree = Figtree({ subsets: ['latin'], variable: '--f-figtree' })
const anton = Anton({ subsets: ['latin'], weight: '400', variable: '--f-anton' })
const bungee = Bungee({ subsets: ['latin'], weight: '400', variable: '--f-bungee' })
const hankenGrotesk = Hanken_Grotesk({ subsets: ['latin'], variable: '--f-hanken' })
const archivoExpanded = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--f-archivo' })

/** Todas las variables de fuente, para colgar del <body>. */
export const CLASES_DE_FUENTES = [
  outfit, montserrat, raleway, muktaMahee, figtree,
  anton, bungee, hankenGrotesk, archivoExpanded,
].map((f) => f.variable).join(' ')

const VARIABLES: Record<string, string> = {
  outfit: 'var(--f-outfit)',
  montserrat: 'var(--f-montserrat)',
  raleway: 'var(--f-raleway)',
  muktaMahee: 'var(--f-mukta)',
  figtree: 'var(--f-figtree)',
  anton: 'var(--f-anton)',
  bungee: 'var(--f-bungee)',
  hankenGrotesk: 'var(--f-hanken)',
  archivoExpanded: 'var(--f-archivo)',
  // Special Gothic Expanded y Satoshi se añaden en la Fase 2 como fuentes locales.
  specialGothic: 'var(--f-archivo)',
  satoshi: 'var(--f-hanken)',
}

export function familiaCss(clave: string): string {
  return VARIABLES[clave] ?? 'var(--f-outfit)'
}
```

> Nota: Special Gothic Expanded y Satoshi no están en `next/font/google`. Se descargan y se sirven como fuentes locales con `next/font/local` en una tarea posterior; hasta entonces caen a un sustituto declarado aquí, no a una fuente del sistema.

- [ ] **Step 4: Implementar el proveedor**

Crear `src/componentes/ProveedorTema.tsx`:

```tsx
import type { CSSProperties, ReactNode } from 'react'
import type { Tema } from '@/temas/tipos'
import { derivarEscalaDatos } from '@/lib/escala-datos'
import { familiaCss } from '@/temas/fuentes'

interface Props {
  tema: Tema
  superficie: 'clara' | 'oscura'
  children: ReactNode
}

export function ProveedorTema({ tema, superficie, children }: Props) {
  const fondo = superficie === 'clara' ? tema.superficieClara : tema.superficieOscura
  const texto = superficie === 'clara' ? tema.textoSobreClara : tema.textoSobreOscura
  const datos = derivarEscalaDatos(tema.primario, fondo)

  const variables: Record<string, string> = {
    '--primario': tema.primario,
    '--secundario': tema.secundario,
    '--acento': tema.acento,
    '--superficie': fondo,
    '--texto': texto,
    '--gradiente': `linear-gradient(135deg, ${tema.gradiente.join(', ')})`,
    '--fuente-display': familiaCss(tema.familiaDisplay),
    '--fuente-texto': familiaCss(tema.familiaTexto),
  }
  datos.forEach((color, i) => { variables[`--dato-${i + 1}`] = color })

  return (
    <div data-testid="tema" data-sala={tema.slug} style={variables as CSSProperties}>
      {children}
    </div>
  )
}
```

- [ ] **Step 5: Colgar las fuentes del layout raíz**

Modificar `src/app/layout.tsx` para que el `<body>` lleve `className={CLASES_DE_FUENTES}`:

```tsx
import { CLASES_DE_FUENTES } from '@/temas/fuentes'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={CLASES_DE_FUENTES}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 6: Ejecutar y verificar que pasa**

Run: `npm test -- ProveedorTema`
Expected: PASS — 4 tests.

- [ ] **Step 7: Verificar que el build sigue en pie**

Run: `npm run build`
Expected: sin errores. Si `next/font` se queja de `axes` en Archivo, quitar `axes: ['wdth']` y usar la variable sin eje de ancho.

- [ ] **Step 8: Commit**

```bash
git add src/temas/fuentes.ts src/componentes/ProveedorTema.tsx src/componentes/ProveedorTema.test.tsx src/app/layout.tsx
git commit -m "feat: proveedor de tema con tokens CSS y fuentes self-hosted"
```

---

### Task 6: El contrato de decisión

**Files:**
- Create: `src/decision/esquema.ts`
- Test: `src/decision/esquema.test.ts`

**Interfaces:**
- Consumes: `zod`
- Produces:
  - `LAYOUTS` — tupla de nombres de layout válidos
  - `type DecisionSlide` — la decisión de un slide
  - `parsearDecision(bruto: unknown): DecisionSlide` — lanza `ZodError` si no valida
  - `esDecisionValida(bruto: unknown): boolean`

Este es el candado #2 del spec: si la respuesta de la IA no valida contra este esquema, no llega al render. Se construye ahora, antes que la IA, para que el render se pruebe contra el contrato definitivo.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `src/decision/esquema.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parsearDecision, esDecisionValida } from './esquema'

const VALIDA = {
  layout: 'kpis-fila-dos-columnas',
  titulo: 'Performance del sitio web',
  kpis: [
    { valor: '9.2', delta: '-0.3', rotulo: 'Posición media' },
    { valor: '29k', delta: '-16%', rotulo: 'Impresiones' },
  ],
  columnas: [
    { titulo: 'Principales hallazgos', puntos: ['No es un deterioro generalizado'] },
    { titulo: 'Acciones prioritarias', puntos: ['Reforzar contenido'] },
  ],
  razon: '4 cifras con delta + 2 bloques de análisis',
}

describe('parsearDecision', () => {
  it('acepta una decisión bien formada', () => {
    expect(parsearDecision(VALIDA).titulo).toBe('Performance del sitio web')
  })

  it('rechaza un layout que no está en el catálogo', () => {
    expect(() => parsearDecision({ ...VALIDA, layout: 'lo-que-se-me-ocurrio' })).toThrow()
  })

  it('rechaza una decisión sin razón', () => {
    const { razon, ...sinRazon } = VALIDA
    expect(() => parsearDecision(sinRazon)).toThrow()
  })

  it('rechaza estilos: la IA no puede mandar color', () => {
    expect(() => parsearDecision({ ...VALIDA, color: '#FF0000' })).toThrow()
  })

  it('rechaza estilos: la IA no puede mandar CSS ni HTML', () => {
    expect(() => parsearDecision({ ...VALIDA, css: 'p{color:red}' })).toThrow()
    expect(() => parsearDecision({ ...VALIDA, html: '<b>x</b>' })).toThrow()
  })

  it('rechaza un KPI sin rótulo', () => {
    expect(() => parsearDecision({ ...VALIDA, kpis: [{ valor: '9.2' }] })).toThrow()
  })

  it('acepta un gráfico con tipo del catálogo', () => {
    const conGrafico = { ...VALIDA, grafico: { tipo: 'barras-comparadas', serie: 'trafico_mensual' } }
    expect(parsearDecision(conGrafico).grafico?.tipo).toBe('barras-comparadas')
  })

  it('rechaza un tipo de gráfico inventado', () => {
    expect(() => parsearDecision({ ...VALIDA, grafico: { tipo: 'burbujas-3d', serie: 'x' } })).toThrow()
  })
})

describe('esDecisionValida', () => {
  it('devuelve true o false sin lanzar', () => {
    expect(esDecisionValida(VALIDA)).toBe(true)
    expect(esDecisionValida({ layout: 'portada' })).toBe(false)
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test -- esquema`
Expected: FAIL — `Failed to resolve import "./esquema"`

- [ ] **Step 3: Implementar**

Crear `src/decision/esquema.ts`:

```ts
import { z } from 'zod'

export const LAYOUTS = [
  'portada',
  'agenda',
  'divisor-seccion',
  'pendientes-semaforo',
  'tarjetas-numeradas',
  'kpis-fila-dos-columnas',
  'comparativa-periodos',
  'grafico-y-tabla',
  'meta-real-porcentaje',
  'texto-multicolumna',
  'matriz-estados',
  'imagen-a-sangre',
  'cierre',
] as const

export const TIPOS_DE_GRAFICO = [
  'barras',
  'barras-horizontales',
  'barras-comparadas',
  'linea',
  'area',
  'dona',
] as const

const Kpi = z.object({
  valor: z.string().min(1),
  delta: z.string().optional(),
  rotulo: z.string().min(1),
}).strict()

const Columna = z.object({
  titulo: z.string().min(1),
  puntos: z.array(z.string().min(1)).min(1),
}).strict()

const Grafico = z.object({
  tipo: z.enum(TIPOS_DE_GRAFICO),
  serie: z.string().min(1),
}).strict()

export const EsquemaDecision = z.object({
  layout: z.enum(LAYOUTS),
  titulo: z.string().min(1),
  subtitulo: z.string().optional(),
  kpis: z.array(Kpi).max(4).optional(),
  columnas: z.array(Columna).max(4).optional(),
  grafico: Grafico.optional(),
  cuerpo: z.array(z.string()).optional(),
  imagen: z.string().optional(),
  /** Por qué el motor eligió esta composición. Obligatoria: es lo que se le muestra al equipo. */
  razon: z.string().min(1),
}).strict()   // strict rechaza cualquier clave extra — incluidos color, css o html

export type DecisionSlide = z.infer<typeof EsquemaDecision>

export function parsearDecision(bruto: unknown): DecisionSlide {
  return EsquemaDecision.parse(bruto)
}

export function esDecisionValida(bruto: unknown): boolean {
  return EsquemaDecision.safeParse(bruto).success
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npm test -- esquema`
Expected: PASS — 10 tests.

El rechazo de `color`, `css` y `html` lo produce `.strict()`, no una regla por campo: cualquier clave no declarada revienta. Es el comportamiento buscado.

- [ ] **Step 5: Commit**

```bash
git add src/decision
git commit -m "feat: contrato de decisión validado con Zod, estricto contra estilos"
```

---

### Task 7: Gráfico de barras comparadas

**Files:**
- Create: `src/componentes/graficos/tipos.ts`, `src/componentes/graficos/escalas.ts`, `src/componentes/graficos/BarrasComparadas.tsx`
- Test: `src/componentes/graficos/escalas.test.ts`, `src/componentes/graficos/BarrasComparadas.test.tsx`

**Interfaces:**
- Consumes: tokens CSS del `ProveedorTema`
- Produces:
  - `type SerieDatos = { etiqueta: string; valores: number[] }`
  - `type DatosGrafico = { categorias: string[]; series: SerieDatos[] }`
  - `escalaLineal(dominio: [number, number], rango: [number, number]): (v: number) => number`
  - `<BarrasComparadas datos={...} alto={...} />`

- [ ] **Step 1: Escribir los tests que fallan**

Crear `src/componentes/graficos/escalas.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { escalaLineal } from './escalas'

describe('escalaLineal', () => {
  it('mapea el mínimo al inicio del rango', () => {
    expect(escalaLineal([0, 100], [0, 300])(0)).toBe(0)
  })

  it('mapea el máximo al fin del rango', () => {
    expect(escalaLineal([0, 100], [0, 300])(100)).toBe(300)
  })

  it('interpola los intermedios', () => {
    expect(escalaLineal([0, 100], [0, 300])(50)).toBe(150)
  })

  it('admite un rango invertido, como el eje Y del SVG', () => {
    const y = escalaLineal([0, 100], [200, 0])
    expect(y(0)).toBe(200)
    expect(y(100)).toBe(0)
  })

  it('no revienta con dominio de ancho cero', () => {
    expect(Number.isFinite(escalaLineal([5, 5], [0, 100])(5))).toBe(true)
  })
})
```

Crear `src/componentes/graficos/BarrasComparadas.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BarrasComparadas } from './BarrasComparadas'

const DATOS = {
  categorias: ['ene', 'feb', 'mar'],
  series: [
    { etiqueta: 'Total 2026', valores: [1348, 1682, 2420] },
    { etiqueta: 'Orgánico 2026', valores: [144, 148, 132] },
  ],
}

describe('BarrasComparadas', () => {
  it('dibuja una barra por categoría y serie', () => {
    render(<BarrasComparadas datos={DATOS} alto={200} />)
    expect(screen.getAllByTestId('barra')).toHaveLength(6)
  })

  it('rotula cada categoría', () => {
    render(<BarrasComparadas datos={DATOS} alto={200} />)
    for (const c of DATOS.categorias) expect(screen.getByText(c)).toBeInTheDocument()
  })

  it('colorea cada serie con un token de datos, nunca con un hex', () => {
    render(<BarrasComparadas datos={DATOS} alto={200} />)
    const rellenos = screen.getAllByTestId('barra').map((b) => b.getAttribute('fill'))
    for (const relleno of rellenos) {
      expect(relleno).toMatch(/^var\(--dato-[1-6]\)$/)
    }
  })

  it('la serie más alta ocupa toda la altura útil', () => {
    render(<BarrasComparadas datos={DATOS} alto={200} />)
    const alturas = screen.getAllByTestId('barra').map((b) => Number(b.getAttribute('height')))
    expect(Math.max(...alturas)).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test -- graficos`
Expected: FAIL — no resuelve `./escalas` ni `./BarrasComparadas`

- [ ] **Step 3: Implementar tipos y escalas**

Crear `src/componentes/graficos/tipos.ts`:

```ts
export interface SerieDatos {
  etiqueta: string
  valores: number[]
}

export interface DatosGrafico {
  categorias: string[]
  series: SerieDatos[]
}
```

Crear `src/componentes/graficos/escalas.ts`:

```ts
export function escalaLineal(
  dominio: [number, number],
  rango: [number, number],
): (valor: number) => number {
  const [d0, d1] = dominio
  const [r0, r1] = rango
  const ancho = d1 - d0
  if (ancho === 0) return () => r0
  return (valor) => r0 + ((valor - d0) / ancho) * (r1 - r0)
}
```

- [ ] **Step 4: Implementar el gráfico**

Crear `src/componentes/graficos/BarrasComparadas.tsx`:

```tsx
import type { DatosGrafico } from './tipos'
import { escalaLineal } from './escalas'

interface Props {
  datos: DatosGrafico
  alto: number
  ancho?: number
}

const MARGEN = { arriba: 12, derecha: 8, abajo: 28, izquierda: 8 }

export function BarrasComparadas({ datos, alto, ancho = 640 }: Props) {
  const { categorias, series } = datos
  const altoUtil = alto - MARGEN.arriba - MARGEN.abajo
  const anchoUtil = ancho - MARGEN.izquierda - MARGEN.derecha

  const maximo = Math.max(...series.flatMap((s) => s.valores), 0)
  const y = escalaLineal([0, maximo], [altoUtil, 0])

  const anchoGrupo = anchoUtil / categorias.length
  const anchoBarra = (anchoGrupo * 0.7) / series.length

  return (
    <svg width="100%" viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label="Gráfico de barras comparadas">
      <g transform={`translate(${MARGEN.izquierda},${MARGEN.arriba})`}>
        {categorias.map((categoria, ci) => (
          <g key={categoria} transform={`translate(${ci * anchoGrupo},0)`}>
            {series.map((serie, si) => {
              const valor = serie.valores[ci] ?? 0
              const altoBarra = altoUtil - y(valor)
              return (
                <rect
                  key={serie.etiqueta}
                  data-testid="barra"
                  x={anchoGrupo * 0.15 + si * anchoBarra}
                  y={y(valor)}
                  width={anchoBarra - 2}
                  height={Math.max(0, altoBarra)}
                  fill={`var(--dato-${(si % 6) + 1})`}
                  rx="2"
                />
              )
            })}
            <text
              x={anchoGrupo / 2}
              y={altoUtil + 18}
              textAnchor="middle"
              fill="var(--texto)"
              fontSize="11"
              fontFamily="var(--fuente-texto)"
            >
              {categoria}
            </text>
          </g>
        ))}
      </g>
    </svg>
  )
}
```

- [ ] **Step 5: Ejecutar y verificar que pasa**

Run: `npm test -- graficos`
Expected: PASS — 9 tests.

- [ ] **Step 6: Commit**

```bash
git add src/componentes/graficos
git commit -m "feat: gráfico de barras comparadas en SVG propio, coloreado por tokens"
```

---

### Task 8: Layouts de portada y de KPIs, con su despachador

**Files:**
- Create: `src/componentes/deck/layouts/Portada.tsx`, `src/componentes/deck/layouts/KpisFilaDosColumnas.tsx`, `src/componentes/deck/Slide.tsx`, `src/componentes/deck/deck.module.css`
- Test: `src/componentes/deck/Slide.test.tsx`

**Interfaces:**
- Consumes: `DecisionSlide` de `src/decision/esquema.ts`, `DatosGrafico` de `src/componentes/graficos/tipos.ts`
- Produces: `<Slide decision={...} datos={...} />` — despacha por `decision.layout`; lanza si el layout no tiene componente.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `src/componentes/deck/Slide.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Slide } from './Slide'
import { ProveedorTema } from '@/componentes/ProveedorTema'
import { obtenerTema } from '@/temas'

function pintar(decision: Parameters<typeof Slide>[0]['decision']) {
  return render(
    <ProveedorTema tema={obtenerTema('neracode')} superficie="clara">
      <Slide decision={decision} />
    </ProveedorTema>,
  )
}

describe('Slide', () => {
  it('pinta la portada con su título', () => {
    pintar({ layout: 'portada', titulo: 'Estatus mensual', subtitulo: 'Junio 2026', razon: 'apertura' })
    expect(screen.getByText('Estatus mensual')).toBeInTheDocument()
    expect(screen.getByText('Junio 2026')).toBeInTheDocument()
  })

  it('pinta los KPIs con su delta y su rótulo', () => {
    pintar({
      layout: 'kpis-fila-dos-columnas',
      titulo: 'Performance del sitio web',
      kpis: [{ valor: '9.2', delta: '-0.3', rotulo: 'Posición media' }],
      columnas: [{ titulo: 'Hallazgos', puntos: ['Primero'] }],
      razon: 'cifras + análisis',
    })
    expect(screen.getByText('9.2')).toBeInTheDocument()
    expect(screen.getByText('-0.3')).toBeInTheDocument()
    expect(screen.getByText('Posición media')).toBeInTheDocument()
    expect(screen.getByText('Primero')).toBeInTheDocument()
  })

  it('lanza si el layout no tiene componente', () => {
    expect(() =>
      pintar({ layout: 'matriz-estados', titulo: 'x', razon: 'y' }),
    ).toThrow(/matriz-estados/)
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test -- Slide`
Expected: FAIL — no resuelve `./Slide`

- [ ] **Step 3: Estilos compartidos del deck**

Crear `src/componentes/deck/deck.module.css`:

```css
.slide {
  aspect-ratio: 16 / 9;
  width: 100%;
  background: var(--superficie);
  color: var(--texto);
  font-family: var(--fuente-texto);
  padding: 4.5% 5%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  container-type: inline-size;
}

.slideOscuro {
  background: var(--gradiente);
  color: var(--texto);
}

.titulo {
  font-family: var(--fuente-display);
  font-weight: 700;
  font-size: 4.2cqw;
  line-height: 1.05;
  letter-spacing: -0.02em;
  margin: 0;
}

.tituloPortada { font-size: 7.5cqw; }

.subtitulo {
  font-size: 2.4cqw;
  color: var(--primario);
  margin-top: 1.2cqw;
}

.filaKpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  gap: 1.6cqw;
  margin: 3cqw 0;
}

.kpi {
  background: var(--gradiente);
  border-radius: 1.4cqw;
  padding: 2.2cqw;
  color: #FFFFFF;
}

.kpiValor { font-family: var(--fuente-display); font-size: 4.6cqw; font-weight: 700; line-height: 1; }
.kpiDelta { font-size: 1.5cqw; opacity: .85; margin-left: .5cqw; }
.kpiRotulo { font-size: 1.4cqw; margin-top: .8cqw; opacity: .9; }

.columnas { display: grid; grid-template-columns: 1fr 1fr; gap: 3cqw; }
.columnaTitulo { color: var(--primario); font-weight: 600; font-size: 2cqw; margin-bottom: 1.2cqw; }
.columnas ul { margin: 0; padding-left: 1.6cqw; }
.columnas li { font-size: 1.6cqw; line-height: 1.5; margin-bottom: .8cqw; }
```

> El tamaño de letra va en `cqw` para que un slide se vea igual a pantalla completa, en la rejilla del hub y en el PDF. Nada de píxeles.

- [ ] **Step 4: Implementar los dos layouts**

Crear `src/componentes/deck/layouts/Portada.tsx`:

```tsx
import type { DecisionSlide } from '@/decision/esquema'
import estilos from '../deck.module.css'

export function Portada({ decision }: { decision: DecisionSlide }) {
  return (
    <section className={`${estilos.slide} ${estilos.slideOscuro}`} data-layout="portada">
      <div style={{ marginTop: 'auto', marginBottom: 'auto' }}>
        <h1 className={`${estilos.titulo} ${estilos.tituloPortada}`}>{decision.titulo}</h1>
        {decision.subtitulo && <p className={estilos.subtitulo}>{decision.subtitulo}</p>}
      </div>
    </section>
  )
}
```

Crear `src/componentes/deck/layouts/KpisFilaDosColumnas.tsx`:

```tsx
import type { DecisionSlide } from '@/decision/esquema'
import estilos from '../deck.module.css'

export function KpisFilaDosColumnas({ decision }: { decision: DecisionSlide }) {
  return (
    <section className={estilos.slide} data-layout="kpis-fila-dos-columnas">
      <h2 className={estilos.titulo}>{decision.titulo}</h2>

      {decision.kpis && (
        <div className={estilos.filaKpis}>
          {decision.kpis.map((kpi) => (
            <div key={kpi.rotulo} className={estilos.kpi}>
              <div className={estilos.kpiValor}>
                {kpi.valor}
                {kpi.delta && <span className={estilos.kpiDelta}>{kpi.delta}</span>}
              </div>
              <div className={estilos.kpiRotulo}>{kpi.rotulo}</div>
            </div>
          ))}
        </div>
      )}

      {decision.columnas && (
        <div className={estilos.columnas}>
          {decision.columnas.map((col) => (
            <div key={col.titulo}>
              <h3 className={estilos.columnaTitulo}>{col.titulo}</h3>
              <ul>{col.puntos.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 5: Implementar el despachador**

Crear `src/componentes/deck/Slide.tsx`:

```tsx
import type { ComponentType } from 'react'
import type { DecisionSlide } from '@/decision/esquema'
import { Portada } from './layouts/Portada'
import { KpisFilaDosColumnas } from './layouts/KpisFilaDosColumnas'

type ComponenteLayout = ComponentType<{ decision: DecisionSlide }>

/** Los layouts implementados hasta ahora. Se irá llenando con el resto del catálogo. */
const REGISTRO: Partial<Record<DecisionSlide['layout'], ComponenteLayout>> = {
  'portada': Portada,
  'kpis-fila-dos-columnas': KpisFilaDosColumnas,
}

export function Slide({ decision }: { decision: DecisionSlide }) {
  const Componente = REGISTRO[decision.layout]
  if (!Componente) {
    throw new Error(`El layout "${decision.layout}" todavía no tiene componente`)
  }
  return <Componente decision={decision} />
}
```

- [ ] **Step 6: Ejecutar y verificar que pasa**

Run: `npm test -- Slide`
Expected: PASS — 3 tests.

- [ ] **Step 7: Verificar que ningún layout ni gráfico contiene un color literal**

Run:

```bash
grep -rn '#[0-9A-Fa-f]\{6\}' src/componentes/deck src/componentes/graficos || echo "limpio"
```

Expected: `limpio`. La única excepción tolerada es `#FFFFFF` en `.kpi` de `deck.module.css`, porque el texto va sobre el gradiente de marca; si aparece cualquier otro, es un defecto y hay que moverlo a un token.

- [ ] **Step 8: Commit**

```bash
git add src/componentes/deck
git commit -m "feat: layouts de portada y KPIs, con despachador por nombre de layout"
```

---

### Task 9: Página de demostración con el deck real de NeraCode

**Files:**
- Create: `src/fixtures/nc-junio-2026.ts`, `src/componentes/deck/Deck.tsx`, `src/app/demo/[sala]/page.tsx`
- Test: `src/componentes/deck/Deck.test.tsx`

**Interfaces:**
- Consumes: `Slide`, `ProveedorTema`, `obtenerTema`, `parsearDecision`
- Produces: `<Deck decisiones={...} slugSala="neracode" />` y la ruta `/demo/[sala]`

Esta tarea cierra la fase: prueba que una decisión escrita a mano produce un deck con la marca correcta.

- [ ] **Step 1: Escribir el fixture**

Crear `src/fixtures/nc-junio-2026.ts` con los slides del deck real que ya se implementaron:

```ts
import type { DecisionSlide } from '@/decision/esquema'

/**
 * Extracto del estatus mensual de NeraCode, junio 2026 — la sesión real
 * que sirve de criterio de aceptación del sistema.
 * Escrito a mano: en la Fase 2 lo producirá el motor a partir del contenido crudo.
 */
export const NC_JUNIO_2026: DecisionSlide[] = [
  {
    layout: 'portada',
    titulo: 'Estatus mensual',
    subtitulo: 'Junio 2026',
    razon: 'Apertura de la sesión: mes y sala, sin más ruido.',
  },
  {
    layout: 'kpis-fila-dos-columnas',
    titulo: 'Performance · Sitio web',
    kpis: [
      { valor: '9.2', delta: '-0.3', rotulo: 'Posición media' },
      { valor: '29k', delta: '-16%', rotulo: 'Impresiones' },
      { valor: '264', delta: '-35%', rotulo: 'Clics' },
      { valor: '0.9%', delta: '-0.3', rotulo: 'CTR' },
    ],
    columnas: [
      {
        titulo: 'Principales hallazgos',
        puntos: [
          'No es un deterioro generalizado: las dos páginas con más tráfico mejoraron posición pero perdieron impresiones.',
          'El mix de consultas arrastra el promedio hacia abajo.',
          'Empeoraron las consultas de mantenimiento de software y staff augmentation.',
        ],
      },
      {
        titulo: 'Acciones prioritarias',
        puntos: [
          'Reforzar el contenido de las consultas que retrocedieron en ranking real.',
          'Crear un clúster dedicado a staff augmentation.',
          'Revisar enlazado interno y datos estructurados.',
        ],
      },
    ],
    razon: '4 cifras con delta y 2 bloques de análisis → fila de KPIs arriba, análisis a dos columnas.',
  },
]
```

- [ ] **Step 2: Escribir el test que falla**

Crear `src/componentes/deck/Deck.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Deck } from './Deck'
import { NC_JUNIO_2026 } from '@/fixtures/nc-junio-2026'

describe('Deck', () => {
  it('renderiza todos los slides del fixture', () => {
    render(<Deck decisiones={NC_JUNIO_2026} slugSala="neracode" />)
    expect(screen.getAllByRole('region')).toHaveLength(NC_JUNIO_2026.length)
  })

  it('viste el deck con el tema de la sala', () => {
    render(<Deck decisiones={NC_JUNIO_2026} slugSala="neracode" />)
    const contenedores = screen.getAllByTestId('tema')
    expect(contenedores[0].dataset.sala).toBe('neracode')
    expect(contenedores[0].style.getPropertyValue('--primario')).toBe('#3E31CC')
  })

  it('cambia de identidad al cambiar de sala, sin tocar los slides', () => {
    render(<Deck decisiones={NC_JUNIO_2026} slugSala="zeus" />)
    expect(screen.getAllByTestId('tema')[0].style.getPropertyValue('--primario')).toBe('#FF004F')
    expect(screen.getByText('Estatus mensual')).toBeInTheDocument()
  })

  it('valida cada decisión contra el contrato antes de pintarla', () => {
    const invalida = [{ layout: 'portada', titulo: 'x' }] as never
    expect(() => render(<Deck decisiones={invalida} slugSala="neracode" />)).toThrow()
  })
})
```

- [ ] **Step 3: Ejecutar y verificar que falla**

Run: `npm test -- Deck`
Expected: FAIL — no resuelve `./Deck`

- [ ] **Step 4: Implementar el Deck**

Crear `src/componentes/deck/Deck.tsx`:

```tsx
import type { DecisionSlide } from '@/decision/esquema'
import { parsearDecision } from '@/decision/esquema'
import { obtenerTema } from '@/temas'
import { ProveedorTema } from '@/componentes/ProveedorTema'
import { Slide } from './Slide'

interface Props {
  decisiones: DecisionSlide[]
  slugSala: string
}

const LAYOUTS_OSCUROS = new Set(['portada', 'divisor-seccion', 'cierre'])

export function Deck({ decisiones, slugSala }: Props) {
  const tema = obtenerTema(slugSala)

  return (
    <div style={{ display: 'grid', gap: '2rem' }}>
      {decisiones.map((bruta, i) => {
        const decision = parsearDecision(bruta)
        const superficie = LAYOUTS_OSCUROS.has(decision.layout) ? 'oscura' : 'clara'
        return (
          <ProveedorTema key={`${decision.layout}-${i}`} tema={tema} superficie={superficie}>
            <Slide decision={decision} />
          </ProveedorTema>
        )
      })}
    </div>
  )
}
```

Para que `getAllByRole('region')` encuentre los slides, añadir `role="region"` y `aria-label={decision.titulo}` al `<section>` de cada layout —tanto en `Portada.tsx` como en `KpisFilaDosColumnas.tsx`.

- [ ] **Step 5: Crear la página de demostración**

Crear `src/app/demo/[sala]/page.tsx`:

```tsx
import { Deck } from '@/componentes/deck/Deck'
import { NC_JUNIO_2026 } from '@/fixtures/nc-junio-2026'
import { slugsDeSalas } from '@/temas'

export function generateStaticParams() {
  return slugsDeSalas().map((sala) => ({ sala }))
}

export default async function PaginaDemo({ params }: { params: Promise<{ sala: string }> }) {
  const { sala } = await params
  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>
      <Deck decisiones={NC_JUNIO_2026} slugSala={sala} />
    </main>
  )
}
```

- [ ] **Step 6: Ejecutar y verificar que pasa**

Run: `npm test`
Expected: PASS — toda la suite, sin fallos.

- [ ] **Step 7: Verificación visual**

```bash
npm run dev &
sleep 4
node ~/.claude/tools/webshot/webshot.mjs "http://localhost:3000/demo/neracode" --full --wait 2500
node ~/.claude/tools/webshot/webshot.mjs "http://localhost:3000/demo/zeus" --full --wait 2500
```

Abrir los dos PNG y comprobar a ojo:
- El deck de NeraCode usa azul violeta `#3E31CC` y Outfit; el de Zeus, rojo `#FF004F` y Figtree.
- Los mismos dos slides, con la misma composición, se ven como dos marcas distintas.
- Ningún texto se desborda de su slide.
- Sin errores en `consoleErrors`.

Si el texto se desborda, corregir los `cqw` de `deck.module.css`, no el contenido del fixture.

- [ ] **Step 8: Commit**

```bash
git add src/fixtures src/componentes/deck src/app/demo
git commit -m "feat: deck de NeraCode renderizado desde decisiones, con demo por sala"
```

---

## Definición de terminado — Fase 1

- [ ] `npm test` pasa completo
- [ ] `npm run build` termina sin errores
- [ ] `/demo/neracode` y `/demo/zeus` muestran los mismos slides con identidades distintas
- [ ] `grep -rn '#[0-9A-Fa-f]\{6\}' src/componentes/deck src/componentes/graficos` no devuelve nada salvo el blanco declarado sobre gradiente
- [ ] Los 10 temas pasan las verificaciones de contraste
- [ ] Todo commiteado y empujado a `upax-mkt/mktcorp-estatus`

## Lo que queda fuera de la Fase 1

Los once layouts restantes del catálogo, los cinco tipos de gráfico restantes, el modo presentación, el export a PDF, Special Gothic y Satoshi como fuentes locales, y los logos de cada sala. Entran en la Fase 2 junto con el motor, una vez comprobado que el sistema de temas y el contrato de decisión se sostienen.
