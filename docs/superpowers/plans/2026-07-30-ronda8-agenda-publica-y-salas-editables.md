# Ronda 8 — La agenda compartible y las salas editables · Plan de implementación

> **Para trabajadores agénticos:** SUB-SKILL OBLIGATORIA: usa
> `superpowers:subagent-driven-development` (recomendada) o
> `superpowers:executing-plans` para ejecutar este plan tarea por tarea. Los
> pasos usan casillas (`- [ ]`) para llevar la cuenta.

**Objetivo:** que la agenda se pueda compartir con quien no entra a la app, y
que las salas —su marca y su tipografía— se creen y se editen desde la app en
vez de estar escritas en el código.

**Arquitectura:** las nueve salas se mudan de `src/temas/*.ts` a la base de
datos, conservando su marca idéntica. El código que PINTA no cambia: sigue
recibiendo un objeto `Tema` ya resuelto. Lo que cambia es de dónde sale.

**Stack:** Next 16 (App Router, Server Components y Server Actions), TypeScript,
Drizzle + Postgres (Neon), vitest, Vercel Blob. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-07-30-ronda8-agenda-publica-y-salas-editables-design.md`.

## Restricciones globales

- **Todo el código, los comentarios y los textos de pantalla en español.** Los
  comentarios explican POR QUÉ, no qué hace la línea.
- **Producción y local comparten la MISMA base de Neon.** Cualquier fila que se
  cree probando aparece en la app de Franco. Lo que se cree verificando, se
  borra al terminar. **No se borran salas** (no hay borrado) — así que no se
  crean salas de prueba salvo en la tarea de verificación, y ahí se avisa antes.
- **`npm test` es SEGURO**: vitest no carga `.env.local`, así que `hayDB()` es
  falso y todo va al store en memoria. Hoy hay **868 tests** en verde; ninguna
  tarea se da por buena con la suite en rojo. También `npx tsc --noEmit` y
  `npm run lint` limpios.
- **Toda página y toda Server Action comprueban la sesión** (`exigirEquipo()` de
  `src/auth/sesion.ts`), salvo la agenda pública, que es la excepción de este
  plan. Ocultar un botón no protege un endpoint.
- **Ninguna migración deja columnas `not null` sin valor sobre filas
  existentes.** El patrón es: crear anulable → rellenar → exigir `not null`.
- **La integración con Monday sigue apagada** y este plan no la toca.

---

## Estructura de archivos

**Nuevos:**

| Archivo | Responsabilidad |
|---|---|
| `src/db/enlace-agenda.ts` | El token de la agenda pública: leerlo, generarlo, revocarlo |
| `src/app/agenda/[token]/page.tsx` | La agenda pública |
| `src/componentes/agenda/CalendarioPublico.tsx` | La rejilla del mes, sin nada interactivo |
| `src/temas/semilla.ts` | Los nueve temas actuales, como datos para poblar la base |
| `src/db/temas.ts` | `cargarTemas()`: el registro de temas leído de la base |
| `src/lib/marca.ts` | Derivar una marca completa desde un color, y el slug desde el nombre |
| `src/lib/tinta.ts` | Medir la proporción de tinta de un logo en el navegador |
| `src/app/salas/page.tsx` | Lista de salas, enlace de agenda, entrada a crear |
| `src/app/salas/acciones.ts` | Server Actions de salas y del enlace |
| `src/componentes/salas/FormularioSala.tsx` | Crear y editar una sala |
| `src/componentes/salas/VistaPreviaMarca.tsx` | Cómo queda la marca antes de guardar |
| `src/componentes/salas/SelectorTipografia.tsx` | Elegir familia con vista previa |

**Modificados:**

| Archivo | Qué cambia |
|---|---|
| `src/auth/politica.ts` | La agenda pública, distinguiendo `/agenda` de `/agenda/<token>` |
| `src/db/esquema.ts` | Columnas de marca en `salas`, tabla `enlace_agenda` |
| `src/temas/index.ts` | `TEMAS`/`obtenerTema` salen; queda el tipo y los ayudantes |
| `src/temas/fuentes.ts` | De 9 a 20 familias |
| `src/temas/logos.ts` | El alto sale de `logoRelacionDeTinta`, no de una tabla fija |
| `src/dominio/salas.ts` | Sin base de datos no hay salas |
| Los 12 consumidores de `obtenerTema` | Piden el registro y buscan en él |

---

## Tarea 1: El token de la agenda

**Archivos:**
- Modificar: `src/db/esquema.ts`
- Crear: `src/db/enlace-agenda.ts`, `src/db/enlace-agenda.test.ts`
- Crear: la migración que genere `npm run db:generate`

**Interfaces:**
- Produce: `tokenDeAgenda(): Promise<string | null>`, `generarEnlaceDeAgenda(): Promise<string>`, `revocarEnlaceDeAgenda(): Promise<void>`, `tokenValido(token: string): Promise<boolean>`.

⚠️ `npm run db:migrate` escribe en la base de PRODUCCIÓN. Esta migración solo
crea una tabla nueva: es aditiva y no toca ninguna fila existente.

- [ ] **Paso 1: Escribir el test que falla**

```ts
// src/db/enlace-agenda.test.ts
import { describe, it, expect } from 'vitest'
import { esTokenIgual, nuevoToken } from './enlace-agenda'

describe('nuevoToken', () => {
  it('es largo e impredecible: es la única barrera del enlace', () => {
    const a = nuevoToken()
    const b = nuevoToken()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThanOrEqual(32)
    // base64url: sin +, / ni = que rompan una URL
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/)
  })
})

describe('esTokenIgual', () => {
  it('acepta el token exacto', () => {
    expect(esTokenIgual('abc123', 'abc123')).toBe(true)
  })

  it('rechaza cualquier otro, incluida una diferencia de un carácter', () => {
    expect(esTokenIgual('abc123', 'abc124')).toBe(false)
    expect(esTokenIgual('abc123', 'abc12')).toBe(false)
    expect(esTokenIgual('abc123', '')).toBe(false)
  })

  it('sin token guardado nada coincide, ni siquiera la cadena vacía', () => {
    expect(esTokenIgual(null, '')).toBe(false)
    expect(esTokenIgual(null, 'loquesea')).toBe(false)
  })
})
```

- [ ] **Paso 2: Correr el test y ver que falla**

Ejecutar: `npx vitest run src/db/enlace-agenda.test.ts`
Esperado: FALLA — no existe `./enlace-agenda`.

- [ ] **Paso 3: Añadir la tabla al esquema**

En `src/db/esquema.ts`, al final:

```ts
// ---- Enlace público de la agenda ----
// UNA sola fila. El token no lleva nada dentro —a diferencia del enlace de
// sala, que codifica qué sala y hasta cuándo y por eso va firmado— así que no
// hace falta criptografía: es una contraseña larga que se compara contra esta
// tabla. Revocar es reemplazar la fila, y eso invalida el enlace viejo en el
// acto, que con una firma sería más difícil de garantizar.
export const enlaceAgenda = pgTable('enlace_agenda', {
  token: text('token').primaryKey(),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Paso 4: Escribir el módulo**

```ts
// src/db/enlace-agenda.ts
import { db, hayDB } from './cliente'
import * as esquema from './esquema'

/**
 * EL ENLACE PÚBLICO DE LA AGENDA.
 *
 * Es la única puerta de esta app que se abre sin sesión, así que el token es
 * lo único que separa la agenda de cualquiera que pruebe una URL. 32 bytes
 * aleatorios: no se adivina.
 *
 * No hay enlace por defecto. Si nadie lo ha generado, no existe.
 */
export function nuevoToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Compara el token de la URL con el guardado.
 *
 * Sin token guardado NADA coincide, ni la cadena vacía: si no, una app recién
 * desplegada tendría la agenda abierta con `/agenda/`.
 */
export function esTokenIgual(guardado: string | null, recibido: string): boolean {
  if (guardado === null || guardado.length === 0) return false
  return guardado === recibido
}

export async function tokenDeAgenda(): Promise<string | null> {
  if (!hayDB()) return null
  const fila = (await db().select().from(esquema.enlaceAgenda).limit(1))[0]
  return fila?.token ?? null
}

/** Genera uno nuevo y borra el anterior: solo hay un enlace vivo a la vez. */
export async function generarEnlaceDeAgenda(): Promise<string> {
  if (!hayDB()) throw new Error('Sin base de datos no se puede generar el enlace.')
  const token = nuevoToken()
  await db().delete(esquema.enlaceAgenda)
  await db().insert(esquema.enlaceAgenda).values({ token })
  return token
}

export async function revocarEnlaceDeAgenda(): Promise<void> {
  if (!hayDB()) return
  await db().delete(esquema.enlaceAgenda)
}

export async function tokenValido(recibido: string): Promise<boolean> {
  return esTokenIgual(await tokenDeAgenda(), recibido)
}
```

- [ ] **Paso 5: Correr el test y ver que pasa**

Ejecutar: `npx vitest run src/db/enlace-agenda.test.ts`
Esperado: 5 tests en verde.

- [ ] **Paso 6: Generar y aplicar la migración**

```bash
npm run db:generate
npm run db:migrate
```

Leer el SQL antes de aplicarlo: solo debe traer `CREATE TABLE enlace_agenda`.
Si trae cualquier `DROP` o `ALTER` sobre otra tabla, parar y avisar.

- [ ] **Paso 7: Commit**

```bash
git add src/db/esquema.ts src/db/enlace-agenda.ts src/db/enlace-agenda.test.ts drizzle/
git commit -m "El enlace público de la agenda: un token que se genera y se revoca"
```

---

## Tarea 2: La política deja pasar la agenda pública, y nada más

**Archivos:**
- Modificar: `src/auth/politica.ts`
- Test: `src/auth/politica.test.ts` (existe; se le añaden casos)

**Interfaces:**
- Consumes: nada de la tarea 1 — la política decide por la FORMA de la ruta, no por el token. Quién valida el token es la página.
- Produce: `esRutaPublica(ruta)` acepta `/agenda/<algo>`.

**Ésta es la tarea de más riesgo de todo el plan.** `esRutaPublica` se evalúa
ANTES que cualquier comprobación de sesión: lo que pase por ahí queda abierto a
internet. Y `/agenda` (sin token) es la pantalla interna donde el equipo agenda
las sesiones — dos reglas contiguas sobre el mismo prefijo.

- [ ] **Paso 1: Escribir el test que falla**

```ts
// añadir a src/auth/politica.test.ts
describe('la agenda pública, y solo ella', () => {
  it('deja pasar /agenda/<token> sin sesión', () => {
    expect(esRutaPublica('/agenda/abc123')).toBe(true)
    expect(puedeVerRuta(null, '/agenda/abc123')).toBe(true)
  })

  it('NO deja pasar /agenda a secas: es la pantalla interna del equipo', () => {
    expect(esRutaPublica('/agenda')).toBe(false)
    expect(puedeVerRuta(null, '/agenda')).toBe(false)
  })

  it('NO deja pasar nada por debajo de la agenda pública', () => {
    expect(esRutaPublica('/agenda/abc123/editar')).toBe(false)
    expect(puedeVerRuta(null, '/agenda/abc123/editar')).toBe(false)
  })

  it('el resto de la app sigue cerrado sin sesión', () => {
    for (const ruta of ['/', '/acuerdos', '/acuerdos/bandeja', '/cliente/neracode', '/deck', '/deck/nueva', '/salas']) {
      expect(puedeVerRuta(null, ruta)).toBe(false)
    }
  })

  it('el rol sala tampoco gana acceso a nada nuevo', () => {
    const dir = { rol: 'sala' as const, sala: 'neracode', exp: 9e12 }
    expect(puedeVerRuta(dir, '/agenda')).toBe(false)
    expect(puedeVerRuta(dir, '/salas')).toBe(false)
    expect(puedeVerRuta(dir, '/cliente/zeus')).toBe(false)
  })
})
```

El objeto de sesión del último caso tiene que tener la forma real de `Sesion`
(ver `src/auth/firma.ts`); si el tipo pide más campos, añádelos con valores de
relleno y no cambies lo que el test comprueba.

- [ ] **Paso 2: Correr el test y ver que falla**

Ejecutar: `npx vitest run src/auth/politica.test.ts`
Esperado: FALLA en el primer caso — `/agenda/abc123` no es pública todavía.

- [ ] **Paso 3: Implementar**

En `src/auth/politica.ts`, sustituir `esRutaPublica`:

```ts
export function esRutaPublica(ruta: string): boolean {
  if (RUTAS_PUBLICAS.includes(ruta)) return true
  // LA AGENDA COMPARTIDA, y solo ella.
  //
  // Exactamente dos segmentos: `/agenda/<token>` se abre, `/agenda` NO —esa es
  // la pantalla donde el equipo agenda las sesiones— y `/agenda/<token>/loquesea`
  // tampoco. Es la única ruta de esta app que responde sin sesión, así que la
  // condición es por forma exacta y no por prefijo: un `startsWith('/agenda')`
  // abriría la pantalla interna.
  //
  // Aquí NO se valida el token: la política decide por la forma de la ruta y la
  // página comprueba el token antes de leer un solo dato.
  const partes = segmentos(ruta)
  return partes.length === 2 && partes[0] === 'agenda'
}
```

- [ ] **Paso 4: Correr el test y ver que pasa**

Ejecutar: `npx vitest run src/auth/politica.test.ts`
Esperado: todo en verde, incluidos los casos que ya existían.

- [ ] **Paso 5: Comprobar el efecto real en el proxy**

`src/proxy.ts` importa `esRutaPublica` y `puedeVerRuta` de este mismo archivo y
las usa en las líneas 34 y 98, así que no hay una segunda lista que actualizar:
tu cambio ya rige. Lo que sí hay que mirar es **el orden**: la comprobación de
ruta pública está la primera, ANTES de leer la cookie, así que lo que devuelva
`true` ahí no pasa por ninguna otra puerta. Léelo y confírmalo en el reporte.

- [ ] **Paso 6: Correr la suite entera**

Ejecutar: `npm test`

- [ ] **Paso 7: Commit**

```bash
git add src/auth/politica.ts src/auth/politica.test.ts
git commit -m "La agenda compartida es pública; /agenda a secas sigue siendo del equipo"
```

---

## Tarea 3: La agenda pública, en pantalla

**Archivos:**
- Crear: `src/app/agenda/[token]/page.tsx`, `src/componentes/agenda/CalendarioPublico.tsx`, `src/componentes/agenda/calendario-publico.module.css`
- Crear: `src/componentes/agenda/CalendarioPublico.test.tsx`
- Modificar: `src/db/sesiones.ts` (función `sesionesPublicasDelMes`)

**Interfaces:**
- Consumes: `tokenValido(token)` de la tarea 1.
- Produce: `sesionesPublicasDelMes(anio: number, mes: number): Promise<ReunionPublica[]>` con `interface ReunionPublica { salaSlug: string; salaNombre: string; salaColor: string; fecha: string; hora: string }`.

- [ ] **Paso 1: Escribir el test que falla**

```tsx
// src/componentes/agenda/CalendarioPublico.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CalendarioPublico } from './CalendarioPublico'

const AGOSTO = [
  { salaSlug: 'research-land', salaNombre: 'Research Land', salaColor: '#E4002B', fecha: '2026-08-03', hora: '10:00' },
  { salaSlug: 'mexa-creativa', salaNombre: 'Mexa Creativa', salaColor: '#FF0080', fecha: '2026-08-06', hora: '12:00' },
]

describe('CalendarioPublico', () => {
  it('enseña la sala, el día y la hora de cada reunión', () => {
    render(<CalendarioPublico anio={2026} mes={8} reuniones={AGOSTO} />)
    expect(screen.getByText('Research Land')).toBeInTheDocument()
    expect(screen.getByText('10:00')).toBeInTheDocument()
  })

  it('un mes sin reuniones lo dice, en vez de enseñar una rejilla muda', () => {
    render(<CalendarioPublico anio={2026} mes={9} reuniones={[]} />)
    expect(screen.getByText(/no hay reuniones agendadas/i)).toBeInTheDocument()
  })

  it('no filtra ni enlaza a ninguna parte de la app: es una hoja, no una puerta', () => {
    const { container } = render(<CalendarioPublico anio={2026} mes={8} reuniones={AGOSTO} />)
    const enlaces = Array.from(container.querySelectorAll('a'))
    const internos = enlaces.filter((a) => {
      const href = a.getAttribute('href') ?? ''
      return href.startsWith('/') && !href.startsWith('/agenda/')
    })
    expect(internos).toEqual([])
  })
})
```

- [ ] **Paso 2: Correr el test y ver que falla**

Ejecutar: `npx vitest run src/componentes/agenda/CalendarioPublico.test.tsx`
Esperado: FALLA — no existe el componente.

- [ ] **Paso 3: La consulta**

En `src/db/sesiones.ts`, añadir:

```ts
export interface ReunionPublica {
  salaSlug: string
  salaNombre: string
  salaColor: string
  /** ISO, día civil de México. */
  fecha: string
  /** 'HH:MM' en hora de México. */
  hora: string
}

/**
 * Las reuniones de un mes, para la agenda que se comparte fuera.
 *
 * Deja fuera dos cosas a propósito: las salas EN PAUSA —no tienen reuniones que
 * anunciar— y las sesiones en BORRADOR, que son trabajo en curso y no una fecha
 * comprometida con nadie. Anunciar una fecha que todavía se está armando es
 * peor que no anunciarla.
 *
 * Devuelve lo mínimo que la agenda enseña. Nada de estructura, participantes ni
 * acuerdos: lo que no viaja no se puede filtrar por error.
 */
export async function sesionesPublicasDelMes(anio: number, mes: number): Promise<ReunionPublica[]>
```

Implementarla con Drizzle uniendo `sesiones` y `salas`, filtrando por rango de
fechas del mes, `salas.activa = true` y `sesiones.estado <> 'borrador'`. Las
fechas se formatean con las funciones de `src/lib/fecha.ts`, ancladas a
`America/Mexico_City` — la app ya tuvo un bug por no hacerlo.

- [ ] **Paso 4: El componente y la página**

`CalendarioPublico` es un componente **de servidor sin interactividad**: rejilla
del mes, un punto del color de cada sala en su día, y debajo la lista ordenada
con nombre, día y hora. Los únicos enlaces son al mes anterior y al siguiente,
dentro de `/agenda/<token>`.

`src/app/agenda/[token]/page.tsx`:

```tsx
export default async function PagAgendaPublica({ params, searchParams }) {
  const { token } = await params
  // El token se comprueba ANTES de consultar nada. Y la respuesta es 404, no un
  // "token inválido": un 404 no dice si el enlace existió alguna vez.
  if (!(await tokenValido(token))) notFound()
  // …resolver mes de searchParams (por defecto el actual), cargar y pintar.
}
```

- [ ] **Paso 5: Correr el test y ver que pasa**

Ejecutar: `npx vitest run src/componentes/agenda/CalendarioPublico.test.tsx`
Esperado: 3 tests en verde.

- [ ] **Paso 6: Suite, tipos y lint**

Ejecutar: `npm test && npx tsc --noEmit && npm run lint`

- [ ] **Paso 7: Commit**

```bash
git add src/app/agenda src/componentes/agenda src/db/sesiones.ts
git commit -m "La agenda pública: qué sala, qué día y a qué hora, y nada más"
```

---

## Tarea 4: La marca sale del color

**Archivos:**
- Crear: `src/lib/marca.ts`, `src/lib/marca.test.ts`

**Interfaces:**
- Consumes: `ajustarColorParaContraste` de `src/lib/superficie-texto.ts` y lo que haya en `src/lib/color.ts` (léelos antes de escribir nada nuevo: la maquinaria de contraste ya existe y no se duplica).
- Produce: `slugDesdeNombre(nombre: string): string`, `derivarMarca(nombre: string, primario: string): MarcaDerivada`, donde `MarcaDerivada` tiene los mismos campos que `Tema` menos `slug`, `familiaDisplay` y `familiaTexto`.

- [ ] **Paso 1: Escribir el test que falla**

```ts
// src/lib/marca.test.ts
import { describe, it, expect } from 'vitest'
import { slugDesdeNombre, derivarMarca } from './marca'
import { contraste } from './color'

describe('slugDesdeNombre', () => {
  it('minúsculas, sin acentos y con guiones', () => {
    expect(slugDesdeNombre('Más Salud')).toBe('mas-salud')
    expect(slugDesdeNombre('Research Land')).toBe('research-land')
    expect(slugDesdeNombre('  Doble  espacio  ')).toBe('doble-espacio')
  })

  it('quita lo que no sirve en una URL', () => {
    expect(slugDesdeNombre('A&B / C')).toBe('a-b-c')
    expect(slugDesdeNombre('¿Qué?')).toBe('que')
  })
})

describe('derivarMarca', () => {
  it('el texto siempre se lee sobre su superficie', () => {
    for (const color of ['#0E7C7B', '#FFE600', '#111111', '#FF0080']) {
      const m = derivarMarca('Prueba', color)
      expect(contraste(m.textoSobreClara, m.superficieClara)).toBeGreaterThanOrEqual(4.5)
      expect(contraste(m.textoSobreOscura, m.superficieOscura)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('conserva el color de marca tal cual: es el dato del brandbook', () => {
    expect(derivarMarca('Prueba', '#0E7C7B').primario).toBe('#0e7c7b')
  })

  it('el degradado empieza en el color de marca y tiene al menos dos paradas', () => {
    const m = derivarMarca('Prueba', '#0E7C7B')
    expect(m.gradiente[0]).toBe('#0e7c7b')
    expect(m.gradiente.length).toBeGreaterThanOrEqual(2)
  })
})
```

Ya existe todo lo que necesitas y **no se duplica nada**: `src/lib/color.ts`
tiene `hexARgb`, `rgbAHex`, `hexAHsl`, `hslAHex`, `luminancia` y `contraste`;
`src/lib/superficie-texto.ts` tiene `ajustarColorParaContraste(color, contra,
minimo)`. Léelos antes de escribir una línea.

- [ ] **Paso 2: Correr el test y ver que falla**

Ejecutar: `npx vitest run src/lib/marca.test.ts`
Esperado: FALLA — no existe `./marca`.

- [ ] **Paso 3: Implementar**

`slugDesdeNombre`: normaliza a NFD para separar los acentos, los quita, pasa a
minúsculas, sustituye todo lo que no sea letra o número por guiones, y colapsa
los guiones repetidos y los de los extremos.

`derivarMarca`: el primario se conserva; el secundario y el acento se derivan
girando el matiz y ajustando la luminosidad; las superficies clara y oscura
salen del primario muy desaturado; los colores de texto se ajustan con
`ajustarColorParaContraste` contra su superficie hasta cumplir 4.5:1; el
degradado va del primario a una variante más oscura.

Cada decisión lleva un comentario de por qué, porque son números que alguien va
a querer tocar.

- [ ] **Paso 4: Correr el test y ver que pasa**

Ejecutar: `npx vitest run src/lib/marca.test.ts`
Esperado: 5 tests en verde. El del contraste es el que importa: si falla con
algún color, la derivación no sirve.

- [ ] **Paso 5: Commit**

```bash
git add src/lib/marca.ts src/lib/marca.test.ts
git commit -m "Una marca completa y legible a partir de un solo color"
```

---

## Tarea 5: La mudanza de las nueve salas a la base

**Archivos:**
- Modificar: `src/db/esquema.ts`
- Crear: `src/temas/semilla.ts`, `src/db/temas.ts`, `src/db/temas.test.ts`
- Crear: dos migraciones (columnas anulables; después `not null`)
- Crear: `scripts/poblar-marcas.ts` (script de un solo uso)

**Interfaces:**
- Produce: `cargarTemas(): Promise<Record<string, Tema>>`, `slugsDeSalas(): Promise<string[]>`.

⚠️ **Esta tarea toca la base de PRODUCCIÓN en tres pasos.** El orden importa: si
las columnas nacen `not null` sobre las nueve filas que ya existen, la migración
falla; si nacen con un `default` de relleno, las nueve salas quedan pintadas de
un color inventado hasta que alguien corra el poblado. Ni una cosa ni la otra.

- [ ] **Paso 1: Escribir el test que falla**

```ts
// src/db/temas.test.ts
import { describe, it, expect } from 'vitest'
import { SEMILLA_DE_TEMAS } from '@/temas/semilla'

describe('la semilla de temas', () => {
  it('trae las nueve salas', () => {
    expect(Object.keys(SEMILLA_DE_TEMAS)).toHaveLength(9)
  })

  it('cada una trae los doce campos del tema, sin huecos', () => {
    for (const [slug, tema] of Object.entries(SEMILLA_DE_TEMAS)) {
      expect(tema.slug, slug).toBe(slug)
      expect(tema.nombre, slug).toBeTruthy()
      for (const campo of ['primario','secundario','acento','superficieClara','superficieOscura','textoSobreClara','textoSobreOscura','familiaDisplay','familiaTexto'] as const) {
        expect(tema[campo], `${slug}.${campo}`).toMatch(/\S/)
      }
      expect(tema.gradiente.length, slug).toBeGreaterThanOrEqual(2)
    }
  })

  it('los colores son hex de seis dígitos: es lo que se guarda y lo que se pinta', () => {
    for (const [slug, tema] of Object.entries(SEMILLA_DE_TEMAS)) {
      expect(tema.primario, slug).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })
})
```

- [ ] **Paso 2: Correr el test y ver que falla**

Ejecutar: `npx vitest run src/db/temas.test.ts`
Esperado: FALLA — no existe `@/temas/semilla`.

- [ ] **Paso 3: La semilla**

`src/temas/semilla.ts` reúne los nueve objetos que hoy exportan
`src/temas/neracode.ts` y sus ocho hermanos, **sin cambiar un solo valor**:

```ts
/**
 * LOS NUEVE TEMAS ORIGINALES, tal como estuvieron en código hasta el 30-jul.
 *
 * Ya no es la fuente de verdad —lo es la tabla `salas`— pero se conserva por
 * dos motivos: pobló la base la primera vez, y es el registro de qué color
 * tenía cada marca antes de que nadie pudiera editarlas. Si alguien estropea
 * una marca desde la app, aquí está lo que decía el brandbook.
 *
 * No se edita. Cambiar una marca se hace en la app.
 */
export const SEMILLA_DE_TEMAS: Record<string, Tema> = { … }
```

- [ ] **Paso 4: Las columnas, anulables**

En `src/db/esquema.ts`, dentro de `salas`, añadir los campos del spec —`nombre`,
los siete colores, `gradiente` (jsonb), `familiaDisplay`, `familiaTexto`,
`logoUrl`, `logoRelacionDeTinta`— **todos anulables por ahora**, con un
comentario que diga que la segunda migración los pondrá obligatorios.

Generar y aplicar:

```bash
npm run db:generate
npm run db:migrate
```

- [ ] **Paso 5: Poblar**

`scripts/poblar-marcas.ts`: para cada entrada de `SEMILLA_DE_TEMAS`, un `UPDATE`
de la fila de esa sala con sus valores. Idempotente: correrlo dos veces deja lo
mismo. Carga `.env.local` con `process.loadEnvFile()`, como hacen la semilla y
`drizzle.config.ts` (drizzle-kit y tsx no lo hacen solos).

```bash
npx tsx scripts/poblar-marcas.ts
```

Comprobar leyendo que las nueve filas tienen su `primario` y que ninguno es nulo.

- [ ] **Paso 6: Exigir que no falten**

Cambiar esas columnas a `notNull()` en el esquema (salvo `logoUrl` y
`logoRelacionDeTinta`, que sí pueden faltar), generar la segunda migración y
aplicarla. Si falla, es que alguna fila quedó sin poblar: **no la fuerces con un
default**, arregla el poblado.

- [ ] **Paso 7: `cargarTemas`**

```ts
// src/db/temas.ts
import { cache } from 'react'

/**
 * EL REGISTRO DE TEMAS, leído de la base.
 *
 * Envuelto en `cache()` de React: una misma petición puede pedirlo desde el
 * hub, desde una tarjeta y desde el proveedor de tema, y se consulta una vez.
 *
 * Sin base de datos devuelve un registro VACÍO, y eso es la verdad: desde que
 * las salas se editan, son datos, no configuración. Antes vivían en código y
 * por eso el respaldo podía enseñarlas.
 */
export const cargarTemas = cache(async (): Promise<Record<string, Tema>> => { … })

export const slugsDeSalas = cache(async (): Promise<string[]> => { … })
```

- [ ] **Paso 8: Cambiar los doce consumidores**

Sustituir `obtenerTema(slug)` por una búsqueda en el registro cargado, y
`slugsDeSalas()` por su versión asíncrona, en: `db/consultas.ts`,
`app/deck/nueva/page.tsx`, `db/sesiones.ts`, `dominio/salas.ts`, `db/salas.ts`,
`db/acuerdos.ts`, `app/cliente/[slug]/page.tsx`, `app/agenda/page.tsx`,
`db/claves.ts`, `db/archivos.ts`, `app/deck/[id]/minuta/acciones.ts`,
`app/cliente/[slug]/benchmark/page.tsx`.

Casi todos están ya en funciones asíncronas. Donde una función pura necesite el
tema, **pásaselo como parámetro** en vez de volverla asíncrona: el código que
pinta no debe saber de dónde salió el tema.

En `src/dominio/salas.ts`, `estadoDeSalas()` devuelve `[]` y se cambia el
comentario de cabecera, que hoy afirma lo contrario.

Quitar de `src/temas/index.ts` el registro `TEMAS` y `obtenerTema`, y dejar el
tipo `Tema` y los ayudantes.

- [ ] **Paso 9: Correr todo**

Ejecutar: `npm test && npx tsc --noEmit && npm run lint`
Esperado: verde. Los tests que daban por hecho que había nueve salas sin base de
datos hay que actualizarlos: ese comportamiento cambió a propósito.

- [ ] **Paso 10: Commit**

```bash
git add src/db/esquema.ts src/db/temas.ts src/db/temas.test.ts src/temas/ src/dominio/salas.ts src/db src/app scripts/ drizzle/
git commit -m "Las nueve salas se mudan de código a la base, con su marca idéntica"
```

---

## Tarea 6: La pantalla de salas

**Archivos:**
- Crear: `src/app/salas/page.tsx`, `src/app/salas/acciones.ts`, `src/app/salas/salas.module.css`
- Crear: `src/componentes/salas/FormularioSala.tsx`, `src/componentes/salas/VistaPreviaMarca.tsx`, `src/componentes/salas/FormularioSala.test.tsx`
- Crear: `src/lib/tinta.ts`, `src/lib/tinta.test.ts`
- Modificar: `src/temas/logos.ts`, `src/app/page.tsx` (enlace en la barra)

**Interfaces:**
- Consumes: `derivarMarca`, `slugDesdeNombre` (tarea 4); `cargarTemas` (tarea 5); `tokenDeAgenda`, `generarEnlaceDeAgenda`, `revocarEnlaceDeAgenda` (tarea 1).
- Produce: `crearSalaAction`, `editarSalaAction`, `generarEnlaceAction`, `revocarEnlaceAction`; `medirTinta(imagen: HTMLImageElement): number`.

- [ ] **Paso 1: Escribir el test que falla**

```tsx
// src/componentes/salas/FormularioSala.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormularioSala } from './FormularioSala'

describe('FormularioSala', () => {
  it('propone el slug al escribir el nombre, y se puede corregir', async () => {
    const usuario = userEvent.setup()
    render(<FormularioSala guardar={vi.fn()} slugsUsados={[]} />)
    await usuario.type(screen.getByLabelText(/nombre/i), 'Más Salud')
    expect(screen.getByLabelText(/identificador/i)).toHaveValue('mas-salud')
  })

  it('avisa si el identificador ya está tomado', async () => {
    const usuario = userEvent.setup()
    render(<FormularioSala guardar={vi.fn()} slugsUsados={['mas-salud']} />)
    await usuario.type(screen.getByLabelText(/nombre/i), 'Más Salud')
    expect(screen.getByText(/ya existe una sala/i)).toBeInTheDocument()
  })

  it('al editar, el identificador no se puede cambiar: es la URL de la sala', () => {
    render(<FormularioSala guardar={vi.fn()} slugsUsados={['zeus']} sala={{ slug: 'zeus', nombre: 'Zeus', primario: '#614ACA' }} />)
    expect(screen.getByLabelText(/identificador/i)).toBeDisabled()
  })
})

// src/lib/tinta.test.ts
import { describe, it, expect } from 'vitest'
import { proporcionDeTinta } from './tinta'

describe('proporcionDeTinta', () => {
  it('un lienzo medio lleno da la mitad', () => {
    // 4 píxeles: 2 opacos, 2 transparentes
    const datos = new Uint8ClampedArray([0,0,0,255, 0,0,0,255, 0,0,0,0, 0,0,0,0])
    expect(proporcionDeTinta(datos)).toBeCloseTo(0.5)
  })

  it('sin transparencia da 1, que es la señal de un logo con fondo', () => {
    const datos = new Uint8ClampedArray([0,0,0,255, 0,0,0,255])
    expect(proporcionDeTinta(datos)).toBe(1)
  })

  it('un lienzo vacío da 0 sin dividir por cero', () => {
    expect(proporcionDeTinta(new Uint8ClampedArray([]))).toBe(0)
  })
})
```

- [ ] **Paso 2: Correr los tests y ver que fallan**

Ejecutar: `npx vitest run src/componentes/salas src/lib/tinta.test.ts`
Esperado: FALLAN — no existen.

- [ ] **Paso 3: La medición de tinta**

`src/lib/tinta.ts` exporta `proporcionDeTinta(datos: Uint8ClampedArray): number`
—función pura sobre los bytes RGBA, que es lo que se puede probar— y un ayudante
que pinta una imagen en un `<canvas>` y le pasa los datos.

Por qué existe, en un comentario: los logos se normalizan por área de tinta y no
por altura, porque los lockups van de 1,64:1 a 6,80:1 y a la misma altura uno
ocupa cuatro veces más mancha que otro. Hasta ahora esa medición se hacía con un
script fuera de la app; un logo subido desde la interfaz no puede esperar a eso.

En `src/temas/logos.ts`, el alto pasa a calcularse desde
`logoRelacionDeTinta` con la misma fórmula, en vez de la tabla fija.

- [ ] **Paso 4: La pantalla y las acciones**

`/salas`, con `await exigirEquipo()` en la página y en cada acción. Lista de
salas con su color y su estado, botón de crear, y el bloque del enlace de agenda
(el enlace actual con copiar, y generar/revocar).

`FormularioSala` pide nombre, identificador, logo y color, y enseña
`VistaPreviaMarca` con lo que derivará. Al editar, el identificador va
deshabilitado.

El logo se sube a Vercel Blob como ya se suben las imágenes desde la ronda 2
(mira cómo lo hace el módulo de archivos). Al elegirlo se mide su tinta en el
navegador y se manda el número junto al archivo. Si sale 1, se avisa: **PNG o
SVG con fondo transparente**.

`crearSalaAction` rechaza un slug repetido diciendo cuál es.

**Ninguna acción borra salas.** Para dejar de atender una está la pausa.

- [ ] **Paso 5: El enlace en la barra**

En `src/app/page.tsx`, junto a Agenda, Deck Designer y Acuerdos, añadir Salas.

- [ ] **Paso 6: Correr todo**

Ejecutar: `npm test && npx tsc --noEmit && npm run lint`

- [ ] **Paso 7: Commit**

```bash
git add src/app/salas src/componentes/salas src/lib/tinta.ts src/lib/tinta.test.ts src/temas/logos.ts src/app/page.tsx
git commit -m "Crear y editar salas desde la app, con su marca y su logo medido"
```

---

## Tarea 7: Veinte tipografías, y que no se carguen todas

**Archivos:**
- Modificar: `src/temas/fuentes.ts`, `src/app/layout.tsx`
- Crear: `src/componentes/salas/SelectorTipografia.tsx`, `src/componentes/salas/SelectorTipografia.test.tsx`
- Modificar: `src/componentes/salas/FormularioSala.tsx`

**Interfaces:**
- Produce: `CATALOGO_DE_FUENTES: Array<{ clave: string; nombre: string; registro: 'display' | 'texto' | 'ambos' }>`, `clasesDeFuentes(claves: string[]): string`.

- [ ] **Paso 1: Medir lo que hay HOY, antes de tocar nada**

```bash
npm run build
```

Anotar cuántos archivos de fuente entran en el build
(`ls .next/static/media/*.woff2 | wc -l`) y dejarlo escrito en el reporte. **Es
la referencia contra la que se juzga esta tarea**: si al final hay más fuentes
cargándose por página, la tarea empeoró la app aunque se vea mejor.

- [ ] **Paso 2: Escribir el test que falla**

```tsx
// src/componentes/salas/SelectorTipografia.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SelectorTipografia } from './SelectorTipografia'
import { CATALOGO_DE_FUENTES } from '@/temas/fuentes'

describe('SelectorTipografia', () => {
  it('ofrece el catálogo entero', () => {
    render(<SelectorTipografia nombre="familiaDisplay" valor="outfit" alCambiar={vi.fn()} />)
    expect(screen.getAllByRole('radio').length).toBe(CATALOGO_DE_FUENTES.length)
  })

  it('cada opción se pinta CON su propia fuente: una lista de nombres no dice cómo se ve', () => {
    const { container } = render(<SelectorTipografia nombre="familiaDisplay" valor="outfit" alCambiar={vi.fn()} />)
    const muestras = container.querySelectorAll('[data-muestra]')
    expect(muestras.length).toBe(CATALOGO_DE_FUENTES.length)
    muestras.forEach((m) => {
      expect((m as HTMLElement).style.fontFamily).toMatch(/var\(--f-/)
    })
  })
})

// añadir a un test de fuentes
describe('clasesDeFuentes', () => {
  it('devuelve solo las que se le piden, no las veinte', () => {
    const clases = clasesDeFuentes(['outfit', 'archivoExpanded'])
    expect(clases.split(' ').filter(Boolean)).toHaveLength(2)
  })

  it('una clave desconocida no revienta ni cuela una clase vacía', () => {
    expect(clasesDeFuentes(['inventada']).trim()).toBe('')
  })
})
```

- [ ] **Paso 3: Correr los tests y ver que fallan**

Ejecutar: `npx vitest run src/componentes/salas/SelectorTipografia.test.tsx`

- [ ] **Paso 4: Ampliar el catálogo**

En `src/temas/fuentes.ts`, añadir once familias a las nueve actuales. El criterio
es cubrir registros que hoy no se pueden, no engordar la lista: neutras de texto,
con carácter para títulos, condensadas y alguna serif. Sugerencia concreta —
Inter, Manrope, DM Sans, Space Grotesk, Sora, Plus Jakarta Sans, Playfair
Display, Fraunces, Bebas Neue, Oswald, Barlow Condensed — y cada una entra con
su entrada en `VARIABLES` y en `CATALOGO_DE_FUENTES`, con su nombre para
enseñar y en qué registro sirve.

`clasesDeFuentes(claves)` devuelve solo las clases pedidas. `CLASES_DE_FUENTES`
(todas) se conserva mientras haga falta y se retira cuando ya nadie la use.

- [ ] **Paso 5: Cargar solo lo necesario**

`src/app/layout.tsx` deja de colgar las veinte del `<body>`. Cada página aplica
las de las salas que pinta: una sala usa dos, un documento dos, la agenda las de
las salas del mes.

**El hub es la excepción y se declara**: pinta las nueve salas a la vez, así que
necesita las familias de todas. Ahí no hay nada que recortar y no se fuerza.

- [ ] **Paso 6: Medir el resultado**

```bash
npm run build
```

Comparar con el paso 1 y **escribir los dos números en el reporte**. El objetivo
es que una sala cargue dos familias. Si el recorte resulta más caro de lo que
rinde —por ejemplo, si obliga a duplicar el layout o rompe cómo se ven las
marcas— **entrega el catálogo de veinte con la carga actual y dilo**: la
prioridad de Franco es que las tipografías dejen de verse mal, no que carguen
medio segundo antes.

- [ ] **Paso 7: Enchufar el selector**

`SelectorTipografia` entra en `FormularioSala`, dos veces: títulos y texto.

- [ ] **Paso 8: Correr todo**

Ejecutar: `npm test && npx tsc --noEmit && npm run lint`

- [ ] **Paso 9: Commit**

```bash
git add src/temas/fuentes.ts src/app/layout.tsx src/componentes/salas src/app
git commit -m "Veinte tipografías elegibles por sala, cargando solo las que se usan"
```

---

## Tarea 8: Verificar en producción

**Archivos:** ninguno de código.

⚠️ Avisar a Franco antes de empezar: se va a crear una sala de prueba en la base
que él usa, y **las salas no se pueden borrar desde la app**. Hay que borrarla
por SQL al terminar, con sus datos.

- [ ] **Paso 1: Desplegar y generar el enlace**

Entrar a `/salas`, generar el enlace de la agenda y copiarlo.

- [ ] **Paso 2: Abrir la agenda en una ventana SIN sesión**

En una ventana privada: el enlace tiene que abrir la agenda, y `/`, `/acuerdos`
y `/cliente/<slug>` tienen que seguir mandando a `/entrar`. **Comprobar las dos
cosas**: que la agenda se ve no demuestra que lo demás siga cerrado.

- [ ] **Paso 3: Revocar y comprobar**

Revocar el enlace, recargar la agenda: 404. Generar otro y comprobar que el
nuevo funciona.

- [ ] **Paso 4: Comprobar que las nueve salas se ven igual que antes**

Comparar el hub y dos salas con cómo se veían antes de la mudanza. **Si alguna
marca cambió de color o de tipografía, la mudanza tiene un fallo**: la promesa
era que quedaran idénticas.

- [ ] **Paso 5: Crear una sala de prueba**

Con nombre, logo con fondo transparente y color. Comprobar la vista previa, que
se guarda, que aparece en el hub, que su tipografía se puede cambiar y que el
logo no sale ni gigante ni diminuto.

- [ ] **Paso 6: Sacar los prints**

Con la skill `shot`: la agenda pública, `/salas`, el formulario con la vista
previa, y el hub con la sala nueva. **Mirar los PNG**: en las rondas 2 a 6 los
defectos salieron de los prints con la suite en verde, no de los tests.

- [ ] **Paso 7: Borrar el rastro**

Borrar por SQL la sala de prueba y lo que cuelgue de ella. Comprobar que quedan
las nueve. Dejar el enlace de agenda que Franco quiera conservar, o revocarlo.

- [ ] **Paso 8: Anotar lo verificado**

Escribir en este plan qué se comprobó y qué salió, y commitear.

---

## Autorrevisión de este plan

| Sección del spec | Tarea |
|---|---|
| 1 · El enlace de la agenda (token, qué enseña, dónde se genera) | 1, 3, 6 |
| 1 · El riesgo de la primera ruta pública | 2 |
| 2 · La mudanza, y el camino sin base de datos | 5 |
| 2 · Crear y editar salas | 6 |
| 2 · El alto del logo medido en el navegador | 6 |
| 2 · No se borran salas | 6 (y se repite en 8) |
| 3 · Veinte tipografías con vista previa | 7 |
| 3 · El problema de rendimiento, medido | 7 (pasos 1 y 6) |
| Modelo de datos | 1 y 5 |
| Errores y casos límite | 1 (sin fila), 2 (formas de ruta), 3 (404, pausadas, borradores), 6 (slug repetido, logo sin transparencia, contraste) |
| Pruebas | cada tarea, y la 8 en producción |

**Lo que este plan NO hace, y el spec tampoco:** borrar salas, subir archivos de
tipografía propios, poner clave o caducidad al enlace de la agenda, y la
suscripción `.ics` para Outlook o Google.
