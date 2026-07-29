# Ronda 7 — Acuerdos, Monday y el estado de las salas · Plan de implementación

> **Para trabajadores agénticos:** SUB-SKILL OBLIGATORIA: usa
> `superpowers:subagent-driven-development` (recomendada) o
> `superpowers:executing-plans` para ejecutar este plan tarea por tarea. Los
> pasos usan casillas (`- [ ]`) para llevar la cuenta.

**Objetivo:** que los acuerdos de las reuniones lleguen al tablero donde el
equipo trabaja de verdad (Delivery Mkt Corp 2026), vuelvan con su estado, se
vean todos juntos en una pantalla propia, y que una sala en freeze comercial
deje de pedir reuniones que nadie va a dar.

**Arquitectura:** la escritura a Monday deja de ser automática y pasa por una
bandeja que alguien confirma. Quién es el responsable de un acuerdo decide si
viaja al tablero o vive solo aquí. La vuelta lee **solo los elementos que
subimos**, por id, nunca el grupo entero.

**Stack:** Next 16 (App Router, Server Components y Server Actions), TypeScript,
Drizzle + Postgres (Neon), vitest. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-07-29-ronda7-acuerdos-monday-y-salas-design.md`.
Ahí están las tablas de columnas, etiquetas e ids medidos del tablero real. No
re-derivar: leerlas de ahí.

## Restricciones globales

- **Todo el código, los comentarios y los textos de pantalla en español.** Es la
  convención del repo, sin excepciones.
- **Producción y local comparten la MISMA base de Neon.** Cualquier dato que se
  cree probando aparece en la app de Franco con nombres de personas reales, y
  los acuerdos SOBREVIVEN al borrado de su reunión. Lo que se cree verificando,
  se borra al terminar.
- **En `localhost:3000` no se puede maquetar ni generar minutas:**
  `ANTHROPIC_API_KEY` solo vive en Vercel. No es un bug.
- **`MONDAY_ESCRITURA` se queda apagado hasta la Tarea 13.** Ninguna tarea
  anterior escribe en el tablero del equipo, ni siquiera para probar.
- **Ningún secreto sale al cliente.** Toda llamada a Monday ocurre en el
  servidor, dentro de Server Actions que empiezan por `await exigirEquipo()`.
  Ocultar un botón no protege una acción.
- **Tests:** `npx vitest run <ruta>` para uno, `npm test` para todos. Hoy hay
  688 en verde; ninguna tarea se da por buena con la suite en rojo.
- **Migraciones:** `npm run db:generate` y luego `npm run db:migrate`. Aplicar
  una migración TOCA LA BASE DE PRODUCCIÓN. Las de este plan son aditivas
  (columnas nuevas con valor por defecto), pero hay que saberlo antes de correr
  el comando.
- **La API de Monday se versiona por cabecera:** `API-Version: 2024-10`. Ya está
  fijada en `src/monday/cliente.ts` y no se cambia.

---

## Estructura de archivos

**Nuevos:**

| Archivo | Responsabilidad |
|---|---|
| `src/monday/red.ts` | La llamada HTTP a Monday: timeout, reintento ante 429, errores de GraphQL |
| `src/monday/personas.ts` | El directorio de gente de Monday, con su copia local |
| `src/monday/bandeja.ts` | Decidir qué acuerdo entra a la bandeja y en qué estado |
| `src/db/personas.ts` | Lectura y escritura de `personas_monday` |
| `src/componentes/SelectorResponsable.tsx` | El campo de responsable con sus dos grupos |
| `src/app/acuerdos/page.tsx` | El espacio de acuerdos |
| `src/app/acuerdos/acciones.ts` | Server Actions del espacio y de la bandeja |
| `src/app/acuerdos/bandeja/page.tsx` | La bandeja hacia Delivery |
| `src/componentes/acuerdos/FilaBandeja.tsx` | Un renglón de la bandeja, con su elección de destino |
| `src/componentes/acuerdos/Estrella.tsx` | El destacado, compartido por las tres pantallas |

**Modificados:**

| Archivo | Qué cambia |
|---|---|
| `src/monday/mapeo.ts` | Columnas del subelemento, tablero de subelementos, índices de UdN |
| `src/monday/cliente.ts` | Usa `red.ts`; crear elemento/subelemento; leer por ids; comprobar grupo; buscar en Delivery |
| `src/monday/sincronizar.ts` | La alta deja de escribir sola: encola en la bandeja |
| `src/db/esquema.ts` | Campos nuevos de `salas` y `acuerdos`, tabla `personas_monday` |
| `src/db/acuerdos.ts` | `responsableMondayId`, `destacado`, estado de bandeja |
| `src/db/consultas.ts` | Trae los campos nuevos; exporta el orden nuevo |
| `src/dominio/salas.ts` | `ordenarPorProximaReunion`, congelado de salas en pausa |
| `src/componentes/NuevoAcuerdoForm.tsx` | Usa `SelectorResponsable` |
| `src/componentes/hogar/ModuloAcuerdos.tsx` | Dos bloques: destacados y vencidos |
| `src/app/page.tsx` | Orden nuevo, bloque de salas en pausa |
| `src/app/cliente/[slug]/page.tsx` | Interruptor de freeze, estrella, aviso de congelado |

---

## Tarea 1: La llamada a Monday aguanta un tablero lento

**Archivos:**
- Crear: `src/monday/red.ts`
- Modificar: `src/monday/cliente.ts` (quitar `consultar`, importarla de `red.ts`)
- Test: `src/monday/red.test.ts`

**Interfaces:**
- Produce: `consultarMonday<T>(query: string, variables?: Record<string, unknown>): Promise<T>` y `class ErrorMonday extends Error`.
- Consume: nada. Es la base de todo lo demás.

El cliente de hoy no tiene ni timeout ni reintento. El dashboard viejo sí, y es
lo único suyo que vale la pena copiar: un 429 de Monday trae `Retry-After` y
respetarlo es la diferencia entre esperar diez segundos y perder la subida.

- [ ] **Paso 1: Escribir el test que falla**

```ts
// src/monday/red.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { consultarMonday, ErrorMonday } from './red'

function respuesta(cuerpo: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(cuerpo), {
    status: init.status ?? 200,
    headers: init.headers,
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('consultarMonday', () => {
  it('reintenta una vez ante un 429 y respeta su Retry-After', async () => {
    vi.stubEnv('MONDAY_TOKEN', 'ficticio')
    const fetchFalso = vi
      .fn()
      .mockResolvedValueOnce(respuesta({}, { status: 429, headers: { 'Retry-After': '1' } }))
      .mockResolvedValueOnce(respuesta({ data: { ok: true } }))
    vi.stubGlobal('fetch', fetchFalso)

    const datos = await consultarMonday<{ ok: boolean }>('query { ok }')

    expect(datos.ok).toBe(true)
    expect(fetchFalso).toHaveBeenCalledTimes(2)
  })

  it('se rinde al segundo 429 y lo dice con los segundos que pidió Monday', async () => {
    vi.stubEnv('MONDAY_TOKEN', 'ficticio')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respuesta({}, { status: 429, headers: { 'Retry-After': '7' } })),
    )

    await expect(consultarMonday('query { ok }')).rejects.toThrow(/7 s/)
  })

  it('un 200 con errors dentro es un error, no un resultado vacío', async () => {
    vi.stubEnv('MONDAY_TOKEN', 'ficticio')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respuesta({ errors: [{ message: 'No tienes permiso' }] })),
    )

    await expect(consultarMonday('query { ok }')).rejects.toThrow(ErrorMonday)
    await expect(consultarMonday('query { ok }')).rejects.toThrow('No tienes permiso')
  })

  it('sin token no llama a nadie', async () => {
    vi.stubEnv('MONDAY_TOKEN', '')
    const fetchFalso = vi.fn()
    vi.stubGlobal('fetch', fetchFalso)

    await expect(consultarMonday('query { ok }')).rejects.toThrow(/MONDAY_TOKEN/)
    expect(fetchFalso).not.toHaveBeenCalled()
  })
})
```

- [ ] **Paso 2: Correr el test y ver que falla**

Ejecutar: `npx vitest run src/monday/red.test.ts`
Esperado: FALLA con "Failed to resolve import './red'".

- [ ] **Paso 3: Escribir la implementación mínima**

```ts
// src/monday/red.ts
/**
 * LA LLAMADA A MONDAY. Solo la red: quién responde, cuánto se espera y qué
 * cuenta como error. Lo que se pregunta vive en `cliente.ts`.
 *
 * Dos cosas que no son adorno:
 *
 * - **Timeout.** Sin él, un tablero lento deja colgada una Server Action y con
 *   ella la pantalla de quien la lanzó. Monday responde en menos de un segundo
 *   casi siempre; quince es la frontera de "algo va mal", no de "tarda".
 * - **Un reintento ante 429.** Monday manda `Retry-After` con los segundos que
 *   quiere que esperes. Se respeta una vez y ya: reintentar en bucle contra un
 *   servicio que pide calma es cómo se gana un bloqueo más largo.
 */
const API = 'https://api.monday.com/v2'
const TIEMPO_LIMITE_MS = 15_000
const ESPERA_MAXIMA_S = 30

export class ErrorMonday extends Error {}

export function tokenDeMonday(): string | null {
  const t = process.env.MONDAY_TOKEN
  return t && t.trim().length > 0 ? t.trim() : null
}

async function llamar(token: string, query: string, variables: Record<string, unknown>): Promise<Response> {
  const control = new AbortController()
  const alarma = setTimeout(() => control.abort(), TIEMPO_LIMITE_MS)
  try {
    return await fetch(API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
        // La API de Monday versiona por cabecera. Fijarla evita que un cambio
        // de su versión por defecto rompa esto sin que nadie toque el código.
        'API-Version': '2024-10',
      },
      body: JSON.stringify({ query, variables }),
      signal: control.signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ErrorMonday(`Monday no respondió en ${TIEMPO_LIMITE_MS / 1000} s.`)
    }
    throw new ErrorMonday('Monday no respondió.')
  } finally {
    clearTimeout(alarma)
  }
}

export async function consultarMonday<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const token = tokenDeMonday()
  if (!token) throw new ErrorMonday('Falta MONDAY_TOKEN.')

  let respuesta = await llamar(token, query, variables)

  if (respuesta.status === 429) {
    const pedidos = Number.parseInt(respuesta.headers.get('Retry-After') ?? '10', 10)
    const espera = Math.min(Number.isNaN(pedidos) ? 10 : pedidos, ESPERA_MAXIMA_S)
    await new Promise((seguir) => setTimeout(seguir, espera * 1000))
    respuesta = await llamar(token, query, variables)
    if (respuesta.status === 429) {
      throw new ErrorMonday(`Monday está limitando las llamadas: pide ${espera} s de espera.`)
    }
  }

  if (!respuesta.ok) throw new ErrorMonday(`Monday respondió ${respuesta.status}.`)

  const cuerpo = (await respuesta.json()) as { data?: T; errors?: Array<{ message: string }> }
  // Monday devuelve 200 con `errors` dentro: sin esto, un fallo de permisos
  // llegaría como un resultado vacío y parecería "no hay acuerdos".
  if (cuerpo.errors?.length) throw new ErrorMonday(cuerpo.errors.map((e) => e.message).join('; '))
  if (!cuerpo.data) throw new ErrorMonday('Monday no devolvió datos.')
  return cuerpo.data
}
```

- [ ] **Paso 4: Correr el test y ver que pasa**

Ejecutar: `npx vitest run src/monday/red.test.ts`
Esperado: 4 tests en verde. El segundo tarda ~1 s de verdad (la espera es real).

- [ ] **Paso 5: Mover `cliente.ts` a la función nueva**

En `src/monday/cliente.ts`: borrar la función local `consultar` y la constante
`API`, borrar la clase `ErrorMonday` y la función `tokenDeMonday` (ahora viven
en `red.ts`), y arriba del archivo añadir:

```ts
import { consultarMonday, ErrorMonday, tokenDeMonday } from './red'
export { ErrorMonday, tokenDeMonday }
```

Sustituir las cuatro llamadas a `consultar(` por `consultarMonday(`.

- [ ] **Paso 6: Correr la suite entera**

Ejecutar: `npm test`
Esperado: todo en verde. `src/monday/mapeo.test.ts` sigue pasando sin tocarlo.

- [ ] **Paso 7: Commit**

```bash
git add src/monday/red.ts src/monday/red.test.ts src/monday/cliente.ts
git commit -m "La llamada a Monday aguanta un tablero lento y un 429"
```

---

## Tarea 2: El mapeo sabe que un subelemento tiene otras columnas

**Archivos:**
- Modificar: `src/monday/mapeo.ts`
- Test: `src/monday/mapeo.test.ts` (ya existe, se le añaden casos)

**Interfaces:**
- Consume: nada.
- Produce: `TABLERO_SUBELEMENTOS`, `COLUMNA_ELEMENTO`, `COLUMNA_SUBELEMENTO`, `columnasDe(tipo: DestinoMonday)`, `type DestinoMonday = 'elemento' | 'subelemento'`, `INDICE_UDN: Record<string, number>`.

El board de subelementos (`18044759026`) tiene sus propias columnas y no
coinciden con las del elemento. Escribir un subelemento con las columnas del
elemento no falla ruidosamente: **crea el subelemento con las columnas vacías**.
Por eso esto va primero y con test propio.

- [ ] **Paso 1: Escribir el test que falla**

```ts
// añadir al final de src/monday/mapeo.test.ts
import { columnasDe, COLUMNA_ELEMENTO, COLUMNA_SUBELEMENTO, INDICE_UDN } from './mapeo'

describe('columnas por destino', () => {
  it('un elemento y un subelemento no comparten ni una sola columna de estado', () => {
    expect(COLUMNA_ELEMENTO.udn).toBe('color_mm0ex2j0')
    expect(COLUMNA_SUBELEMENTO.udn).toBe('color_mm15emh7')
    expect(COLUMNA_ELEMENTO.fase).not.toBe(COLUMNA_SUBELEMENTO.fase)
    expect(COLUMNA_ELEMENTO.deadline).not.toBe(COLUMNA_SUBELEMENTO.deadline)
  })

  it('la columna de personas sí se llama igual en los dos', () => {
    expect(COLUMNA_ELEMENTO.responsable).toBe('person')
    expect(COLUMNA_SUBELEMENTO.responsable).toBe('person')
  })

  it('columnasDe devuelve el juego que toca', () => {
    expect(columnasDe('elemento')).toBe(COLUMNA_ELEMENTO)
    expect(columnasDe('subelemento')).toBe(COLUMNA_SUBELEMENTO)
  })

  it('cada sala tiene el índice de su etiqueta de UdN, que es lo que acepta el filtro', () => {
    expect(INDICE_UDN['mexa-creativa']).toBe(1)
    expect(INDICE_UDN['research-land']).toBe(156)
    expect(INDICE_UDN['marketing-united']).toBe(105)
    expect(Object.keys(INDICE_UDN)).toHaveLength(Object.keys(UDN_DE_SALA).length)
  })
})
```

- [ ] **Paso 2: Correr el test y ver que falla**

Ejecutar: `npx vitest run src/monday/mapeo.test.ts`
Esperado: FALLA — `columnasDe` no existe.

- [ ] **Paso 3: Implementar**

En `src/monday/mapeo.ts`, renombrar `COLUMNA` a `COLUMNA_ELEMENTO` (dejando
`export const COLUMNA = COLUMNA_ELEMENTO` para no romper `cliente.ts` todavía) y
añadir:

```ts
/**
 * El tablero de SUBELEMENTOS. En Monday los subelementos viven en un tablero
 * propio, con columnas propias: las del elemento no valen aquí y usarlas no
 * revienta, simplemente crea el subelemento con todo vacío. Medido el
 * 29-jul-2026.
 */
export const TABLERO_SUBELEMENTOS = 18044759026

export type DestinoMonday = 'elemento' | 'subelemento'

export const COLUMNA_SUBELEMENTO = {
  que: 'name',
  udn: 'color_mm15emh7',
  fase: 'color_mkzjvp66',
  deadline: 'date_mm1hnswx',
  squad: 'color_mm15h1g6',
  responsable: 'person',
} as const

export function columnasDe(destino: DestinoMonday) {
  return destino === 'subelemento' ? COLUMNA_SUBELEMENTO : COLUMNA_ELEMENTO
}

/**
 * El ÍNDICE de cada etiqueta de UdN, no su texto.
 *
 * Para filtrar por una columna de estado, Monday compara contra el índice de la
 * etiqueta —`compare_value: [1]`, no `["Mexa Creativa"]`—. Los índices no son
 * correlativos: los tres últimos que se añadieron valen 105, 156 y 7. Medidos
 * el 29-jul-2026; si alguien reordena las etiquetas del tablero, esto miente y
 * el filtro devuelve la UDN equivocada.
 */
export const INDICE_UDN: Record<string, number> = {
  'zeus': 0,
  'mexa-creativa': 1,
  'neracode': 2,
  'promo-espacio': 3,
  'uix': 4,
  'house-of-films': 7,
  'ceci': 9,
  'grupo-upax': 10,
  'marketing-united': 105,
  'research-land': 156,
}
```

- [ ] **Paso 4: Correr el test y ver que pasa**

Ejecutar: `npx vitest run src/monday/mapeo.test.ts`
Esperado: verde, incluidos los tests que ya existían.

- [ ] **Paso 5: Commit**

```bash
git add src/monday/mapeo.ts src/monday/mapeo.test.ts
git commit -m "El mapeo distingue las columnas del elemento de las del subelemento"
```

---

## Tarea 3: La base guarda el estado de la sala y el destino del acuerdo

**Archivos:**
- Modificar: `src/db/esquema.ts`
- Crear: la migración que genere `npm run db:generate`
- Test: `src/db/esquema.test.ts` (crear)

**Interfaces:**
- Produce: campos `salas.activa`, `salas.pausadaDesde`; `acuerdos.responsableMondayId`, `acuerdos.destacado`, `acuerdos.mondayTipo`, `acuerdos.mondayUrl`, `acuerdos.mondaySincronizadoEn`, `acuerdos.bandeja`; tabla `personasMonday`.

⚠️ **`npm run db:migrate` toca la base de PRODUCCIÓN.** Los cambios son
aditivos y con valor por defecto, así que ninguna fila existente cambia de
sentido, pero el comando no es un ensayo.

- [ ] **Paso 1: Escribir el test que falla**

```ts
// src/db/esquema.test.ts
import { describe, it, expect } from 'vitest'
import { getTableColumns } from 'drizzle-orm'
import * as esquema from './esquema'

describe('esquema de la ronda 7', () => {
  it('la sala sabe si está activa y desde cuándo está en pausa', () => {
    const columnas = getTableColumns(esquema.salas)
    expect(columnas.activa.notNull).toBe(true)
    expect(columnas.activa.default).toBe(true)
    expect(columnas.pausadaDesde.notNull).toBe(false)
  })

  it('el acuerdo sabe a quién de Monday corresponde y en qué estado de bandeja está', () => {
    const columnas = getTableColumns(esquema.acuerdos)
    expect(columnas.responsableMondayId.notNull).toBe(false)
    expect(columnas.destacado.default).toBe(false)
    expect(columnas.bandeja.default).toBe('no_aplica')
    expect(columnas.mondayTipo.notNull).toBe(false)
  })

  it('hay una copia local del directorio de personas', () => {
    const columnas = getTableColumns(esquema.personasMonday)
    expect(columnas.mondayId.primary).toBe(true)
    expect(columnas.nombre.notNull).toBe(true)
    expect(columnas.correo.notNull).toBe(true)
  })
})
```

- [ ] **Paso 2: Correr el test y ver que falla**

Ejecutar: `npx vitest run src/db/esquema.test.ts`
Esperado: FALLA — `columnas.activa` es `undefined`.

- [ ] **Paso 3: Implementar el esquema**

En `src/db/esquema.ts`, dentro de `salas` añadir:

```ts
  /**
   * Una sala en freeze comercial: no hay reuniones ni gestión hasta nuevo
   * aviso. No se borra ni se esconde — su historia sigue entera y se consulta.
   * Lo que se apaga es lo que la app le EXIGE: próxima reunión, seguimiento,
   * vencimientos.
   */
  activa: boolean('activa').notNull().default(true),
  pausadaDesde: timestamp('pausada_desde', { withTimezone: true }),
```

Dentro de `acuerdos` añadir:

```ts
  /**
   * El id de usuario de Monday del responsable, cuando es alguien de Mkt Corp.
   *
   * Es lo que distingue un acuerdo nuestro de uno de la UDN, y por tanto lo que
   * decide si entra a la bandeja. Se guarda el id y no solo el nombre porque la
   * columna de personas de Monday exige el id, y emparejar por nombre escrito a
   * mano es exactamente el error que tiene el dashboard viejo: seis nombres
   * suyos ya no existen y uno se asigna a la persona equivocada.
   */
  responsableMondayId: text('responsable_monday_id'),
  /** Prioritario: es lo que se ve en el Home. */
  destacado: boolean('destacado').notNull().default(false),
  /** 'elemento' | 'subelemento' — de qué tablero es `mondayId`, y por tanto qué columnas leerle. */
  mondayTipo: text('monday_tipo'),
  mondayUrl: text('monday_url'),
  mondaySincronizadoEn: timestamp('monday_sincronizado_en', { withTimezone: true }),
  /**
   * 'no_aplica' | 'pendiente' | 'subido' | 'descartado'.
   *
   * Nace en 'no_aplica' y pasa a 'pendiente' cuando el acuerdo tiene
   * responsable de Mkt Corp. 'descartado' es definitivo: es lo que impide que
   * la bandeja vuelva a ofrecer algo que alguien ya decidió que no sube.
   */
  bandeja: text('bandeja').notNull().default('no_aplica'),
```

Y al final del archivo:

```ts
// ---- Directorio de personas de Monday ----
// Copia local del directorio de la cuenta. Existe para que un selector pueda
// abrirse sin esperar a la red: si Monday tarda, el formulario se queda
// esperando y no se puede escribir un acuerdo. Se refresca por detrás.
export const personasMonday = pgTable('personas_monday', {
  mondayId: text('monday_id').primaryKey(),
  nombre: text('nombre').notNull(),
  correo: text('correo').notNull(),
  cargadoEn: timestamp('cargado_en', { withTimezone: true }).notNull().defaultNow(),
})
```

Comprobar que `boolean` está importado de `drizzle-orm/pg-core` al principio del
archivo; si no está, añadirlo a la lista de imports.

- [ ] **Paso 4: Correr el test y ver que pasa**

Ejecutar: `npx vitest run src/db/esquema.test.ts`
Esperado: 3 tests en verde.

- [ ] **Paso 5: Generar la migración y aplicarla**

```bash
npm run db:generate
npm run db:migrate
```

Esperado: aparece `drizzle/0010_*.sql` con `ALTER TABLE` aditivos y el
`CREATE TABLE personas_monday`. Leer el SQL generado antes de aplicarlo: si trae
un `DROP` de cualquier cosa, parar y avisar.

- [ ] **Paso 6: Commit**

```bash
git add src/db/esquema.ts src/db/esquema.test.ts drizzle/
git commit -m "La base guarda el freeze de la sala y el destino del acuerdo"
```

---

## Tarea 4: El directorio de personas de Monday

**Archivos:**
- Crear: `src/monday/personas.ts`, `src/db/personas.ts`
- Test: `src/monday/personas.test.ts`

**Interfaces:**
- Consume: `consultarMonday` de la Tarea 1, `personasMonday` de la Tarea 3.
- Produce: `interface PersonaMonday { id: string; nombre: string; correo: string }`, `personasDeMonday(): Promise<PersonaMonday[]>` (la red), `directorio(): Promise<PersonaMonday[]>` (copia local con refresco).

- [ ] **Paso 1: Escribir el test que falla**

```ts
// src/monday/personas.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { personasDeMonday, hayQueRefrescar } from './personas'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const RESPUESTA = {
  data: {
    users: [
      { id: '65476480', name: 'Franco Cruzat', email: 'franco.cruzat@upax.com.mx', enabled: true, is_guest: false },
      { id: '67757625', name: 'César Mejía Medina', email: 'julio.mejiam@upax.com.mx', enabled: true, is_guest: false },
      { id: '999', name: 'Alguien de fuera', email: 'x@proveedor.com', enabled: true, is_guest: true },
      { id: '888', name: 'Quien se fue', email: 'ex@upax.com.mx', enabled: false, is_guest: false },
    ],
  },
}

describe('personasDeMonday', () => {
  it('deja fuera a los invitados y a los desactivados', async () => {
    vi.stubEnv('MONDAY_TOKEN', 'ficticio')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(RESPUESTA))))

    const gente = await personasDeMonday()

    expect(gente.map((p) => p.id)).toEqual(['65476480', '67757625'])
    expect(gente[0].nombre).toBe('Franco Cruzat')
  })

  it('viene ordenada por nombre, que es como se busca en una lista', async () => {
    vi.stubEnv('MONDAY_TOKEN', 'ficticio')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(RESPUESTA))))

    const gente = await personasDeMonday()

    expect(gente.map((p) => p.nombre)).toEqual(['César Mejía Medina', 'Franco Cruzat'])
  })
})

describe('hayQueRefrescar', () => {
  const ahora = new Date('2026-07-29T10:00:00Z')

  it('sin copia previa, sí', () => {
    expect(hayQueRefrescar(null, ahora)).toBe(true)
  })

  it('con una copia de hace media hora, no', () => {
    expect(hayQueRefrescar(new Date('2026-07-29T09:30:00Z'), ahora)).toBe(false)
  })

  it('con una copia de hace más de un día, sí', () => {
    expect(hayQueRefrescar(new Date('2026-07-28T09:00:00Z'), ahora)).toBe(true)
  })
})
```

- [ ] **Paso 2: Correr el test y ver que falla**

Ejecutar: `npx vitest run src/monday/personas.test.ts`
Esperado: FALLA — no existe `./personas`.

- [ ] **Paso 3: Implementar la parte de red**

```ts
// src/monday/personas.ts
import { consultarMonday } from './red'

/**
 * EL DIRECTORIO DE GENTE DE MONDAY.
 *
 * La cuenta es "Marketing Corp Grupo UPAX" y sus usuarios son el equipo: 24
 * activos el 29-jul-2026. No se filtran por dominio de correo a propósito —
 * conviven `@upax.com.mx`, `@elektra.com.mx` y `@jansan.mx`, así que el dominio
 * no dice quién es del equipo y filtrarlo dejaría fuera a media plantilla.
 */
export interface PersonaMonday {
  id: string
  nombre: string
  correo: string
}

interface FilaUsuario {
  id: string
  name: string
  email: string
  enabled: boolean
  is_guest: boolean
}

/** Un día. Un directorio de 24 personas no cambia entre dos reuniones. */
const VIGENCIA_MS = 86_400_000

export function hayQueRefrescar(cargadoEn: Date | null, ahora: Date): boolean {
  if (!cargadoEn) return true
  return ahora.getTime() - cargadoEn.getTime() > VIGENCIA_MS
}

export async function personasDeMonday(): Promise<PersonaMonday[]> {
  const datos = await consultarMonday<{ users: FilaUsuario[] }>(
    `query { users(limit: 200) { id name email enabled is_guest } }`,
  )
  return datos.users
    .filter((u) => u.enabled && !u.is_guest)
    .map((u) => ({ id: u.id, nombre: u.name, correo: u.email }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}
```

- [ ] **Paso 4: Correr el test y ver que pasa**

Ejecutar: `npx vitest run src/monday/personas.test.ts`
Esperado: 5 tests en verde.

- [ ] **Paso 5: Implementar la copia local**

```ts
// src/db/personas.ts
import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import { personasDeMonday, hayQueRefrescar, type PersonaMonday } from '@/monday/personas'
import { mondayConectado } from '@/monday/cliente'

/**
 * El directorio que ve la interfaz.
 *
 * Devuelve la copia local y, si está vieja, la refresca contra Monday. Si el
 * refresco falla, se devuelve la copia vieja: un directorio de ayer sirve para
 * asignar un acuerdo; una lista vacía, no. Sin base ni token devuelve [] y el
 * selector lo dice en pantalla.
 */
export async function directorio(): Promise<PersonaMonday[]> {
  if (!hayDB()) return mondayConectado() ? await personasDeMonday().catch(() => []) : []

  const guardadas = await db().select().from(esquema.personasMonday)
  const masVieja = guardadas.reduce<Date | null>(
    (peor, p) => (peor === null || p.cargadoEn < peor ? p.cargadoEn : peor),
    null,
  )

  if (!mondayConectado() || !hayQueRefrescar(masVieja, new Date())) {
    return guardadas
      .map((p) => ({ id: p.mondayId, nombre: p.nombre, correo: p.correo }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }

  try {
    const frescas = await personasDeMonday()
    await db().delete(esquema.personasMonday)
    if (frescas.length > 0) {
      await db()
        .insert(esquema.personasMonday)
        .values(frescas.map((p) => ({ mondayId: p.id, nombre: p.nombre, correo: p.correo })))
    }
    return frescas
  } catch {
    return guardadas
      .map((p) => ({ id: p.mondayId, nombre: p.nombre, correo: p.correo }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }
}
```

- [ ] **Paso 6: Correr la suite entera**

Ejecutar: `npm test`
Esperado: verde.

- [ ] **Paso 7: Commit**

```bash
git add src/monday/personas.ts src/monday/personas.test.ts src/db/personas.ts
git commit -m "El directorio de gente de Monday, con copia local que aguanta un fallo de red"
```

---

## Tarea 5: Quién responde decide si el acuerdo viaja

**Archivos:**
- Crear: `src/monday/bandeja.ts`
- Test: `src/monday/bandeja.test.ts`

**Interfaces:**
- Consume: nada de red. Es una decisión pura.
- Produce: `type EstadoBandeja = 'no_aplica' | 'pendiente' | 'subido' | 'descartado'`, `estadoInicialDeBandeja(responsableMondayId: string | null): EstadoBandeja`, `entraALaBandeja(acuerdo): boolean`.

Es la regla que Franco eligió: **lo dice el responsable**. Sin campo aparte.
Puro y con test porque es la bisagra de toda la entrega.

- [ ] **Paso 1: Escribir el test que falla**

```ts
// src/monday/bandeja.test.ts
import { describe, it, expect } from 'vitest'
import { estadoInicialDeBandeja, entraALaBandeja } from './bandeja'

describe('estadoInicialDeBandeja', () => {
  it('con responsable de Mkt Corp, queda pendiente de subir', () => {
    expect(estadoInicialDeBandeja('65476480')).toBe('pendiente')
  })

  it('con responsable de la UDN, no aplica', () => {
    expect(estadoInicialDeBandeja(null)).toBe('no_aplica')
  })
})

describe('entraALaBandeja', () => {
  const base = { responsableMondayId: '65476480', bandeja: 'pendiente' as const, salaActiva: true }

  it('sí cuando está pendiente, tiene dueño de Mkt Corp y su sala está viva', () => {
    expect(entraALaBandeja(base)).toBe(true)
  })

  it('no si ya se subió', () => {
    expect(entraALaBandeja({ ...base, bandeja: 'subido' })).toBe(false)
  })

  it('no si alguien lo descartó — descartar es definitivo', () => {
    expect(entraALaBandeja({ ...base, bandeja: 'descartado' })).toBe(false)
  })

  it('no si su sala está en pausa: lo congelado no se sube', () => {
    expect(entraALaBandeja({ ...base, salaActiva: false })).toBe(false)
  })

  it('no si perdió a su responsable de Mkt Corp por una edición', () => {
    expect(entraALaBandeja({ ...base, responsableMondayId: null })).toBe(false)
  })
})
```

- [ ] **Paso 2: Correr el test y ver que falla**

Ejecutar: `npx vitest run src/monday/bandeja.test.ts`
Esperado: FALLA — no existe `./bandeja`.

- [ ] **Paso 3: Implementar**

```ts
// src/monday/bandeja.ts
/**
 * QUÉ ACUERDO VIAJA AL TABLERO Y CUÁL NO.
 *
 * Lo decide el responsable, y solo el responsable (Franco, 29-jul): si es
 * alguien de Mkt Corp, el compromiso es nuestro y vive también en Delivery; si
 * es de la UDN, vive solo aquí. No hay un interruptor aparte de "este va a
 * Monday" porque serían dos sitios diciendo lo mismo y podrían contradecirse.
 */
export type EstadoBandeja = 'no_aplica' | 'pendiente' | 'subido' | 'descartado'

export function estadoInicialDeBandeja(responsableMondayId: string | null): EstadoBandeja {
  return responsableMondayId ? 'pendiente' : 'no_aplica'
}

export function entraALaBandeja(acuerdo: {
  responsableMondayId: string | null
  bandeja: EstadoBandeja
  /** Una sala en pausa congela sus acuerdos: tampoco se suben. */
  salaActiva: boolean
}): boolean {
  return (
    acuerdo.bandeja === 'pendiente' && acuerdo.responsableMondayId !== null && acuerdo.salaActiva
  )
}
```

- [ ] **Paso 4: Correr el test y ver que pasa**

Ejecutar: `npx vitest run src/monday/bandeja.test.ts`
Esperado: 7 tests en verde.

- [ ] **Paso 5: Enchufarlo al alta de acuerdos**

En `src/db/acuerdos.ts`:

1. Añadir `responsableMondayId?: string | null` a `NuevoAcuerdo` y a `CambiosAcuerdo`.
2. En `crearAcuerdo`, guardar `responsableMondayId: datos.responsableMondayId ?? null` y
   `bandeja: estadoInicialDeBandeja(datos.responsableMondayId ?? null)`.
3. **Quitar la llamada a `sincronizarAlta`**: el alta ya no escribe en Monday
   sola; ahora encola. Dejar en su sitio este comentario:

```ts
  // El alta YA NO escribe en Monday. Antes creaba el elemento sola y eso es lo
  // que Franco cambió el 29-jul: nada entra al tablero del equipo sin que
  // alguien lo confirme en la bandeja (ver src/monday/bandeja.ts). Lo que hace
  // el alta es dejarlo `pendiente` si tiene responsable de Mkt Corp.
```

4. En `editarAcuerdo`, si los cambios traen `responsableMondayId` y el acuerdo
   estaba en `no_aplica` o `pendiente`, recalcular `bandeja` con
   `estadoInicialDeBandeja`. Un acuerdo ya `subido` o `descartado` no vuelve
   atrás por una edición.

- [ ] **Paso 6: Correr la suite entera**

Ejecutar: `npm test`
Esperado: verde. Si algún test daba por hecho que crear un acuerdo llamaba a
Monday, actualizarlo: ese comportamiento cambió a propósito.

- [ ] **Paso 7: Commit**

```bash
git add src/monday/bandeja.ts src/monday/bandeja.test.ts src/db/acuerdos.ts
git commit -m "El responsable decide si el acuerdo viaja al tablero, y el alta ya no escribe sola"
```

---

## Tarea 6: Crear el elemento y el subelemento, con la comprobación del grupo

**Archivos:**
- Modificar: `src/monday/cliente.ts`
- Test: `src/monday/cliente.test.ts` (crear)

**Interfaces:**
- Consume: `consultarMonday`, `columnasDe`, `TABLERO_SUBELEMENTOS`, `FASE_DE_ESTATUS`, `nombreEnMonday`.
- Produce: `existeElGrupo(): Promise<boolean>`, `crearElementoEnDelivery(datos): Promise<{ id, url }>`, `crearSubelemento(padreId, datos): Promise<{ id, url }>`.

- [ ] **Paso 1: Escribir el test que falla**

```ts
// src/monday/cliente.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { crearElementoEnDelivery, crearSubelemento, existeElGrupo } from './cliente'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

function conRed(datos: unknown) {
  const espia = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: datos })))
  vi.stubEnv('MONDAY_TOKEN', 'ficticio')
  vi.stubEnv('MONDAY_GRUPO', 'group_mm15cfz2')
  vi.stubEnv('MONDAY_ESCRITURA', 'si')
  vi.stubGlobal('fetch', espia)
  return espia
}

/** Lo que de verdad se mandó, ya parseado. */
function cuerpoDe(espia: ReturnType<typeof vi.fn>, llamada = 0) {
  return JSON.parse(espia.mock.calls[llamada][1].body as string)
}

describe('crearElementoEnDelivery', () => {
  it('manda el nombre con el prefijo de la sala y las columnas del ELEMENTO', async () => {
    const espia = conRed({ create_item: { id: '1', url: 'https://x' } })

    await crearElementoEnDelivery({
      salaSlug: 'mexa-creativa',
      que: 'Enviar propuesta de paid media',
      estatus: 'abierto',
      fechaCompromiso: '2026-08-12',
      responsableMondayId: '65476486',
    })

    const { variables } = cuerpoDe(espia)
    expect(variables.nombre).toBe('MC | Enviar propuesta de paid media')
    const valores = JSON.parse(variables.valores)
    expect(valores['color_mm0ex2j0']).toEqual({ label: 'Mexa Creativa' })
    expect(valores['color_mkz09na']).toEqual({ label: '🚧 Sprint' })
    expect(valores['date_mm1b10rx']).toEqual({ date: '2026-08-12' })
    expect(valores['person']).toEqual({ personsAndTeams: [{ id: 65476486, kind: 'person' }] })
  })

  it('sin fecha manda la columna vacía, para poder quitar una fecha puesta', async () => {
    const espia = conRed({ create_item: { id: '1', url: 'https://x' } })

    await crearElementoEnDelivery({
      salaSlug: 'neracode',
      que: 'Validar cifras',
      estatus: 'abierto',
      fechaCompromiso: null,
      responsableMondayId: null,
    })

    const valores = JSON.parse(cuerpoDe(espia).variables.valores)
    expect(valores['date_mm1b10rx']).toEqual({})
    expect(valores['person']).toBeUndefined()
  })
})

describe('crearSubelemento', () => {
  it('usa las columnas del SUBELEMENTO y no repite el prefijo del padre', async () => {
    const espia = conRed({ create_subitem: { id: '2', url: 'https://y' } })

    await crearSubelemento('123', {
      salaSlug: 'mexa-creativa',
      que: 'Enviar propuesta de paid media',
      estatus: 'cumplido',
      fechaCompromiso: '2026-08-12',
      responsableMondayId: '65476486',
    })

    const { variables } = cuerpoDe(espia)
    expect(variables.nombre).toBe('Enviar propuesta de paid media')
    expect(variables.padre).toBe('123')
    const valores = JSON.parse(variables.valores)
    expect(valores['color_mm15emh7']).toEqual({ label: 'Mexa Creativa' })
    expect(valores['color_mkzjvp66']).toEqual({ label: '✅ Done' })
    expect(valores['date_mm1hnswx']).toEqual({ date: '2026-08-12' })
    expect(valores['color_mm0ex2j0']).toBeUndefined()
  })
})

describe('existeElGrupo', () => {
  it('es falso si el tablero no devuelve el grupo configurado', async () => {
    conRed({ boards: [{ groups: [] }] })
    expect(await existeElGrupo()).toBe(false)
  })

  it('es cierto cuando está', async () => {
    conRed({ boards: [{ groups: [{ id: 'group_mm15cfz2', title: 'Delivery Mkt Corp 2026' }] }] })
    expect(await existeElGrupo()).toBe(true)
  })
})
```

- [ ] **Paso 2: Correr el test y ver que falla**

Ejecutar: `npx vitest run src/monday/cliente.test.ts`
Esperado: FALLA — esas tres funciones no existen.

- [ ] **Paso 3: Implementar**

En `src/monday/cliente.ts`, añadir (y borrar `crearEnMonday`, que queda
sustituida por estas dos):

```ts
import { columnasDe, TABLERO_SUBELEMENTOS, type DestinoMonday } from './mapeo'

export interface DatosParaMonday {
  salaSlug: string
  que: string
  estatus: EstatusGuardado
  fechaCompromiso: string | null
  responsableMondayId: string | null
}

function valoresDeColumna(datos: DatosParaMonday, destino: DestinoMonday): string {
  const col = columnasDe(destino)
  const valores: Record<string, unknown> = {
    [col.udn]: { label: UDN_DE_SALA[datos.salaSlug] },
    [col.fase]: { label: FASE_DE_ESTATUS[datos.estatus] },
    // Una fecha ausente se manda como objeto VACÍO, no se omite: omitirla deja
    // la que hubiera puesto otra persona, y "quitar la fecha" tiene que poder
    // hacerse.
    [col.deadline]: datos.fechaCompromiso ? { date: datos.fechaCompromiso } : {},
  }
  // La columna de personas exige el id numérico. Si no lo tenemos, se omite la
  // columna entera: dejarla vacía es honesto, inventar un id asigna trabajo a
  // quien no toca en un tablero que mira el equipo entero.
  if (datos.responsableMondayId) {
    valores[col.responsable] = {
      personsAndTeams: [{ id: Number(datos.responsableMondayId), kind: 'person' }],
    }
  }
  return JSON.stringify(valores)
}

/**
 * ¿Sigue existiendo el grupo al que escribimos?
 *
 * Existe por lo que le pasó al dashboard viejo: escribe desde hace meses a un
 * grupo que alguien borró, y nadie se enteró porque nada avisa. Un id de grupo
 * en una constante no es una garantía de nada.
 */
export async function existeElGrupo(): Promise<boolean> {
  const grupo = grupoDeAcuerdos()
  if (!grupo) return false
  const datos = await consultarMonday<{ boards: Array<{ groups: Array<{ id: string }> }> }>(
    `query ($tablero: [ID!], $grupo: [String!]) {
       boards(ids: $tablero) { groups(ids: $grupo) { id title } }
     }`,
    { tablero: [String(TABLERO)], grupo: [grupo] },
  )
  return (datos.boards?.[0]?.groups?.length ?? 0) > 0
}

export async function crearElementoEnDelivery(
  datos: DatosParaMonday,
): Promise<{ id: string; url: string }> {
  if (!escrituraActiva()) throw new ErrorMonday('La escritura a Monday está desactivada.')
  const respuesta = await consultarMonday<{ create_item: { id: string; url: string } }>(
    `mutation ($tablero: ID!, $grupo: String!, $nombre: String!, $valores: JSON!) {
       create_item(board_id: $tablero, group_id: $grupo, item_name: $nombre, column_values: $valores) { id url }
     }`,
    {
      tablero: String(TABLERO),
      grupo: grupoDeAcuerdos(),
      nombre: nombreEnMonday(datos.salaSlug, datos.que),
      valores: valoresDeColumna(datos, 'elemento'),
    },
  )
  return respuesta.create_item
}

/**
 * Cuelga el acuerdo de un elemento que ya existe.
 *
 * El nombre va SIN prefijo: el padre ya dice de qué unidad es, y repetirlo
 * daría "MC | MC | …" en el tablero.
 */
export async function crearSubelemento(
  padreId: string,
  datos: DatosParaMonday,
): Promise<{ id: string; url: string }> {
  if (!escrituraActiva()) throw new ErrorMonday('La escritura a Monday está desactivada.')
  const respuesta = await consultarMonday<{ create_subitem: { id: string; url: string } }>(
    `mutation ($padre: ID!, $nombre: String!, $valores: JSON!) {
       create_subitem(parent_item_id: $padre, item_name: $nombre, column_values: $valores) { id url }
     }`,
    { padre: padreId, nombre: datos.que, valores: valoresDeColumna(datos, 'subelemento') },
  )
  return respuesta.create_subitem
}
```

Ajustar los imports del archivo: `TABLERO_SUBELEMENTOS` se usa en la Tarea 9, no
importarlo todavía si el linter se queja.

- [ ] **Paso 4: Correr el test y ver que pasa**

Ejecutar: `npx vitest run src/monday/cliente.test.ts`
Esperado: 5 tests en verde.

- [ ] **Paso 5: Commit**

```bash
git add src/monday/cliente.ts src/monday/cliente.test.ts
git commit -m "Crear el acuerdo como elemento o como subelemento, cada uno con sus columnas"
```

---

## Tarea 7: Buscar en Delivery lo que ya existe de esa UDN

**Archivos:**
- Modificar: `src/monday/cliente.ts`
- Test: `src/monday/cliente.test.ts` (añadir casos)

**Interfaces:**
- Consume: `INDICE_UDN` de la Tarea 2.
- Produce: `interface ElementoDeDelivery { id: string; nombre: string }`, `elementosDeDelivery(salaSlug: string): Promise<ElementoDeDelivery[]>`.

Es lo que puebla el desplegable de "cuelga de". Verificado contra el tablero real
el 29-jul: ocho elementos para Mexa Creativa, no 950.

- [ ] **Paso 1: Escribir el test que falla**

```ts
// añadir a src/monday/cliente.test.ts
import { elementosDeDelivery } from './cliente'

describe('elementosDeDelivery', () => {
  it('filtra por el ÍNDICE de la etiqueta de UdN, no por su texto', async () => {
    const espia = conRed({
      boards: [{ groups: [{ items_page: { items: [{ id: '9', name: 'MC | Campaña Paid media' }] } }] }],
    })

    const elementos = await elementosDeDelivery('mexa-creativa')

    expect(elementos).toEqual([{ id: '9', nombre: 'MC | Campaña Paid media' }])
    const consulta = cuerpoDe(espia).query as string
    expect(consulta).toContain('color_mm0ex2j0')
    expect(cuerpoDe(espia).variables.udn).toEqual([1])
  })

  it('una sala que no está en el tablero devuelve lista vacía sin llamar a nadie', async () => {
    const espia = conRed({ boards: [] })
    expect(await elementosDeDelivery('sala-inventada')).toEqual([])
    expect(espia).not.toHaveBeenCalled()
  })
})
```

- [ ] **Paso 2: Correr el test y ver que falla**

Ejecutar: `npx vitest run src/monday/cliente.test.ts -t elementosDeDelivery`
Esperado: FALLA — no existe la función.

- [ ] **Paso 3: Implementar**

```ts
// en src/monday/cliente.ts
import { INDICE_UDN, COLUMNA_ELEMENTO } from './mapeo'

export interface ElementoDeDelivery {
  id: string
  nombre: string
}

/**
 * Los elementos de Delivery de una UDN, para poder colgarles un acuerdo.
 *
 * Filtrar por la columna de UdN es lo que hace que la lista sea usable: el
 * grupo entero tiene 950 elementos y una UDN tiene ocho. Monday compara las
 * columnas de estado por el ÍNDICE de la etiqueta, no por su texto — ver
 * INDICE_UDN en mapeo.ts.
 */
export async function elementosDeDelivery(salaSlug: string): Promise<ElementoDeDelivery[]> {
  const grupo = grupoDeAcuerdos()
  const indice = INDICE_UDN[salaSlug]
  if (!grupo || indice === undefined) return []

  const datos = await consultarMonday<{
    boards: Array<{ groups: Array<{ items_page: { items: Array<{ id: string; name: string }> } }> }>
  }>(
    `query ($tablero: [ID!], $grupo: [String!], $udn: [CompareValue!]) {
       boards(ids: $tablero) {
         groups(ids: $grupo) {
           items_page(limit: 100, query_params: {
             rules: [{ column_id: "${COLUMNA_ELEMENTO.udn}", compare_value: $udn, operator: any_of }]
           }) { items { id name } }
         }
       }
     }`,
    { tablero: [String(TABLERO)], grupo: [grupo], udn: [indice] },
  )

  const items = datos.boards?.[0]?.groups?.[0]?.items_page?.items ?? []
  return items.map((i) => ({ id: i.id, nombre: i.name }))
}
```

- [ ] **Paso 4: Correr el test y ver que pasa**

Ejecutar: `npx vitest run src/monday/cliente.test.ts`
Esperado: 7 tests en verde.

- [ ] **Paso 5: Commit**

```bash
git add src/monday/cliente.ts src/monday/cliente.test.ts
git commit -m "El buscador de Delivery trae solo los elementos de esa UDN"
```

---

## Tarea 8: La bandeja, en pantalla

**Archivos:**
- Crear: `src/app/acuerdos/bandeja/page.tsx`, `src/app/acuerdos/acciones.ts`, `src/componentes/acuerdos/FilaBandeja.tsx`, `src/componentes/acuerdos/bandeja.module.css`
- Modificar: `src/db/acuerdos.ts` (función `acuerdosPendientesDeSubir`)
- Test: `src/componentes/acuerdos/FilaBandeja.test.tsx`

**Interfaces:**
- Consume: `entraALaBandeja`, `elementosDeDelivery`, `crearElementoEnDelivery`, `crearSubelemento`, `existeElGrupo`, `directorio`.
- Produce: `subirAcuerdoAction(id: string, destino: { tipo: 'elemento' } | { tipo: 'subelemento', padreId: string }): Promise<void>`, `descartarAcuerdoAction(id: string): Promise<void>`.

- [ ] **Paso 1: Escribir el test que falla**

```tsx
// src/componentes/acuerdos/FilaBandeja.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FilaBandeja } from './FilaBandeja'

const ACUERDO = {
  id: 'a1',
  que: 'Enviar propuesta de paid media',
  responsable: 'Iris Múgica',
  salaSlug: 'mexa-creativa',
  salaNombre: 'Mexa Creativa',
  fechaCompromiso: '2026-08-12',
}

describe('FilaBandeja', () => {
  it('empieza en «elemento nuevo»: colgar de algo es la excepción, no lo normal', () => {
    render(
      <FilaBandeja
        acuerdo={ACUERDO}
        elementos={[{ id: '9', nombre: 'MC | Campaña Paid media' }]}
        subir={vi.fn()}
        descartar={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Elemento nuevo')).toBeChecked()
  })

  it('no deja elegir «subelemento de» sin haber elegido de cuál', () => {
    render(<FilaBandeja acuerdo={ACUERDO} elementos={[]} subir={vi.fn()} descartar={vi.fn()} />)
    expect(screen.getByLabelText('Subelemento de')).toBeDisabled()
  })

  it('dice de qué sala es: la bandeja mezcla las diez', () => {
    render(<FilaBandeja acuerdo={ACUERDO} elementos={[]} subir={vi.fn()} descartar={vi.fn()} />)
    expect(screen.getByText('Mexa Creativa')).toBeInTheDocument()
  })
})
```

- [ ] **Paso 2: Correr el test y ver que falla**

Ejecutar: `npx vitest run src/componentes/acuerdos/FilaBandeja.test.tsx`
Esperado: FALLA — no existe el componente.

- [ ] **Paso 3: Escribir el componente**

`src/componentes/acuerdos/FilaBandeja.tsx`: componente de cliente (`'use client'`)
con dos radios (`Elemento nuevo` / `Subelemento de`), un `<select>` con los
elementos que llegan por props —deshabilitado y con el radio deshabilitado
cuando la lista viene vacía—, y dos botones que llaman a `subir` y `descartar`.
Seguir el patrón visual de `src/componentes/hogar/ModuloAcuerdos.tsx` y usar
CSS Modules como el resto del repo. El botón de subir se deshabilita mientras la
acción está en curso (`useFormStatus` o `useTransition`, como ya se hace en
`NuevoAcuerdoForm.tsx`).

- [ ] **Paso 4: Correr el test y ver que pasa**

Ejecutar: `npx vitest run src/componentes/acuerdos/FilaBandeja.test.tsx`
Esperado: 3 tests en verde.

- [ ] **Paso 5: Escribir las acciones**

`src/app/acuerdos/acciones.ts`, todas empezando por `await exigirEquipo()`:

```ts
// src/app/acuerdos/acciones.ts
'use server'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db, hayDB } from '@/db/cliente'
import * as esquema from '@/db/esquema'
import { exigirEquipo } from '@/auth/sesion'
import { existeElGrupo, crearElementoEnDelivery, crearSubelemento } from '@/monday/cliente'

/**
 * Las acciones de la bandeja. Todas empiezan comprobando la sesión: esto
 * escribe en el tablero de 950 elementos que usa el equipo entero, y ocultar un
 * botón no protege una acción.
 */
export async function subirAcuerdoAction(
  id: string,
  destino: { tipo: 'elemento' } | { tipo: 'subelemento'; padreId: string },
): Promise<void> {
  await exigirEquipo()
  if (!hayDB()) throw new Error('Sin base de datos no hay nada que subir.')

  // El grupo se comprueba ANTES de escribir. Es la lección del dashboard viejo:
  // lleva meses mandando elementos a un grupo que alguien borró, y nada avisa.
  if (!(await existeElGrupo())) {
    throw new Error(
      `El grupo ${process.env.MONDAY_GRUPO ?? '(sin configurar)'} no existe en el tablero. No se sube nada hasta arreglarlo.`,
    )
  }

  const acuerdo = (
    await db().select().from(esquema.acuerdos).where(eq(esquema.acuerdos.id, id))
  )[0]
  if (!acuerdo) throw new Error(`Acuerdo no encontrado: "${id}"`)
  if (acuerdo.bandeja !== 'pendiente') return // ya subido o descartado: no se repite

  const datos = {
    salaSlug: acuerdo.salaSlug,
    que: acuerdo.que,
    estatus: acuerdo.estatus,
    fechaCompromiso: acuerdo.fechaCompromiso
      ? acuerdo.fechaCompromiso.toISOString().slice(0, 10)
      : null,
    responsableMondayId: acuerdo.responsableMondayId,
  }

  const creado =
    destino.tipo === 'subelemento'
      ? await crearSubelemento(destino.padreId, datos)
      : await crearElementoEnDelivery(datos)

  // Se marca DESPUÉS de que Monday confirme. Al revés, un fallo de red dejaría
  // el acuerdo marcado como subido sin estarlo, y nadie volvería a intentarlo.
  await db()
    .update(esquema.acuerdos)
    .set({
      mondayId: creado.id,
      mondayTipo: destino.tipo,
      mondayUrl: creado.url,
      mondaySincronizadoEn: new Date(),
      bandeja: 'subido',
      updatedAt: new Date(),
    })
    .where(eq(esquema.acuerdos.id, id))

  revalidatePath('/acuerdos/bandeja')
  revalidatePath('/acuerdos')
  revalidatePath(`/cliente/${acuerdo.salaSlug}`)
}

export async function descartarAcuerdoAction(id: string): Promise<void> {
  await exigirEquipo()
  if (!hayDB()) return
  // Descartar es definitivo: no borra el acuerdo, lo saca de la bandeja para
  // siempre. Si volviera a ofrecerse al editarlo, la bandeja sería una lista
  // que reaparece, y nadie confía en una lista que reaparece.
  await db()
    .update(esquema.acuerdos)
    .set({ bandeja: 'descartado', updatedAt: new Date() })
    .where(eq(esquema.acuerdos.id, id))
  revalidatePath('/acuerdos/bandeja')
}
```

El error que lanza `subirAcuerdoAction` lo tiene que recoger la pantalla y
enseñarlo tal cual: si el grupo no existe o Monday responde mal, quien pulsó
tiene que leer por qué, no ver un renglón que no se mueve.

- [ ] **Paso 6: Escribir la página**

`src/app/acuerdos/bandeja/page.tsx`: Server Component que carga los acuerdos
pendientes (`bandeja = 'pendiente'`, con responsable de Mkt Corp, de salas
activas), y por cada sala presente pide una vez `elementosDeDelivery(slug)`.
Estados a cubrir, todos con texto propio:

| Situación | Qué dice |
|---|---|
| Sin `MONDAY_TOKEN` | La página no se enlaza desde ningún sitio y responde con un aviso de que la integración está apagada |
| Con token, sin `MONDAY_ESCRITURA` | Se ve la lista y un aviso de que la subida está apagada; los botones deshabilitados |
| `MONDAY_GRUPO` inexistente | Aviso arriba con el id que falta, botones deshabilitados |
| Bandeja vacía | "Nada por subir. Los acuerdos con responsable de Mkt Corp aparecen aquí al publicar la minuta." |

- [ ] **Paso 7: Correr la suite y el lint**

Ejecutar: `npm test && npm run lint`
Esperado: verde.

- [ ] **Paso 8: Commit**

```bash
git add src/app/acuerdos src/componentes/acuerdos src/db/acuerdos.ts
git commit -m "La bandeja: nada entra a Delivery sin que alguien lo confirme"
```

---

## Tarea 9: La vuelta desde Monday

**Archivos:**
- Modificar: `src/monday/cliente.ts`, `src/monday/sincronizar.ts`
- Test: `src/monday/sincronizar.test.ts` (crear)

**Interfaces:**
- Consume: `columnasDe`, `estatusDeFase`, `fechaDeColumna`.
- Produce: `leerAcuerdosDeMonday(refs: Array<{ mondayId: string; tipo: DestinoMonday }>): Promise<Map<string, EstadoEnMonday>>` con `interface EstadoEnMonday { estatus: EstatusGuardado; fechaCompromiso: string | null; actualizadoEn: Date; existe: boolean }`, y `reconciliar(local, remoto): 'gana-local' | 'gana-monday' | 'desapareció'`.

- [ ] **Paso 1: Escribir el test que falla**

```ts
// src/monday/sincronizar.test.ts
import { describe, it, expect } from 'vitest'
import { reconciliar } from './sincronizar'

const local = { estatus: 'abierto' as const, fechaCompromiso: '2026-08-12', updatedAt: new Date('2026-07-29T10:00:00Z') }

describe('reconciliar', () => {
  it('gana quien lo tocó más tarde, aunque sea Monday', () => {
    const remoto = { estatus: 'cumplido' as const, fechaCompromiso: '2026-08-12', actualizadoEn: new Date('2026-07-29T11:00:00Z'), existe: true }
    expect(reconciliar(local, remoto)).toBe('gana-monday')
  })

  it('si lo nuestro es más reciente, Monday espera al siguiente empujón', () => {
    const remoto = { estatus: 'cumplido' as const, fechaCompromiso: null, actualizadoEn: new Date('2026-07-29T09:00:00Z'), existe: true }
    expect(reconciliar(local, remoto)).toBe('gana-local')
  })

  it('un elemento borrado en Monday no borra nuestro acuerdo', () => {
    const remoto = { estatus: 'abierto' as const, fechaCompromiso: null, actualizadoEn: new Date(), existe: false }
    expect(reconciliar(local, remoto)).toBe('desapareció')
  })
})
```

- [ ] **Paso 2: Correr el test y ver que falla**

Ejecutar: `npx vitest run src/monday/sincronizar.test.ts`
Esperado: FALLA — `reconciliar` no existe.

- [ ] **Paso 3: Implementar**

```ts
// en src/monday/sincronizar.ts
import type { EstatusGuardado } from './mapeo'

export interface EstadoEnMonday {
  estatus: EstatusGuardado
  fechaCompromiso: string | null
  actualizadoEn: Date
  existe: boolean
}

/**
 * Quién manda cuando el acuerdo cambió en los dos lados.
 *
 * Gana el más reciente, comparando INSTANTES y no días civiles: por día habría
 * empates cada vez que alguien mueve algo por la mañana aquí y por la tarde
 * allá, y el empate lo tendría que romper una persona.
 *
 * El TEXTO del acuerdo nunca vuelve de Monday, así que no entra en esta
 * comparación: lo que se pactó en la reunión lo dice la minuta, y renombrar el
 * elemento en el tablero no reescribe un acta.
 */
export function reconciliar(
  local: { estatus: EstatusGuardado; fechaCompromiso: string | null; updatedAt: Date },
  remoto: EstadoEnMonday,
): 'gana-local' | 'gana-monday' | 'desapareció' {
  if (!remoto.existe) return 'desapareció'
  return remoto.actualizadoEn > local.updatedAt ? 'gana-monday' : 'gana-local'
}
```

Y en `cliente.ts`:

```ts
import { columnasDe, estatusDeFase, fechaDeColumna, type DestinoMonday } from './mapeo'
import type { EstadoEnMonday } from './sincronizar'

interface FilaLeida {
  id: string
  updated_at: string
  column_values: Array<{ id: string; text: string | null; value: string | null }>
}

/**
 * El estado en Monday de los acuerdos que subimos.
 *
 * Pide SOLO los ids que ya conocemos, nunca el grupo: recorrer Delivery serían
 * 950 elementos para enterarse de veinte. Dos consultas como mucho —una por
 * tipo— porque las columnas que hay que leer son distintas en el elemento y en
 * el subelemento.
 *
 * Un id que Monday no devuelve es un elemento borrado allá, y eso NO borra
 * nuestro acuerdo: lo que se acordó en una reunión no lo deshace un borrado en
 * otro sistema. Se marca `existe: false` y quien lea decide.
 */
export async function leerAcuerdosDeMonday(
  refs: Array<{ mondayId: string; tipo: DestinoMonday }>,
): Promise<Map<string, EstadoEnMonday>> {
  const salida = new Map<string, EstadoEnMonday>()
  if (refs.length === 0 || !mondayConectado()) return salida

  for (const tipo of ['elemento', 'subelemento'] as DestinoMonday[]) {
    const ids = refs.filter((r) => r.tipo === tipo).map((r) => r.mondayId)
    if (ids.length === 0) continue

    const col = columnasDe(tipo)
    const datos = await consultarMonday<{ items: FilaLeida[] }>(
      `query ($ids: [ID!]!) {
         items(ids: $ids) {
           id
           updated_at
           column_values(ids: ["${col.fase}", "${col.deadline}"]) { id text value }
         }
       }`,
      { ids },
    )

    const vistos = new Set<string>()
    for (const fila of datos.items ?? []) {
      const celda = (id: string) => fila.column_values.find((c) => c.id === id)
      const fecha = celda(col.deadline)
      salida.set(fila.id, {
        estatus: estatusDeFase(celda(col.fase)?.text),
        fechaCompromiso: fechaDeColumna(
          fecha?.value ? (JSON.parse(fecha.value) as unknown) : fecha?.text,
        ),
        actualizadoEn: new Date(fila.updated_at),
        existe: true,
      })
      vistos.add(fila.id)
    }

    for (const id of ids) {
      if (!vistos.has(id)) {
        salida.set(id, {
          estatus: 'abierto',
          fechaCompromiso: null,
          actualizadoEn: new Date(0),
          existe: false,
        })
      }
    }
  }

  return salida
}
```

- [ ] **Paso 4: Correr el test y ver que pasa**

Ejecutar: `npx vitest run src/monday/sincronizar.test.ts`
Esperado: 3 tests en verde.

- [ ] **Paso 5: Enchufar la vuelta**

Crear `refrescarDesdeMonday()` en `src/db/acuerdos.ts`: lee los acuerdos con
`mondayId`, pide su estado, y aplica `reconciliar` a cada uno —`gana-monday`
actualiza estatus y fecha; `desapareció` pone `mondayId = null` y deja un aviso;
`gana-local` no hace nada—. Llamarla desde `/acuerdos` y desde
`/cliente/[slug]`, envuelta en `try/catch`: **si Monday falla, la página se
pinta igual con lo que hay en la base.** Es la regla que ya está escrita en la
cabecera de `sincronizar.ts`.

- [ ] **Paso 6: Correr la suite entera**

Ejecutar: `npm test`
Esperado: verde.

- [ ] **Paso 7: Commit**

```bash
git add src/monday/cliente.ts src/monday/sincronizar.ts src/monday/sincronizar.test.ts src/db/acuerdos.ts
git commit -m "La vuelta: el tablero puede mover un acuerdo y la sala se entera"
```

---

## Tarea 10: El selector de responsable

**Archivos:**
- Crear: `src/componentes/SelectorResponsable.tsx`
- Modificar: `src/componentes/NuevoAcuerdoForm.tsx`
- Test: `src/componentes/SelectorResponsable.test.tsx`

**Interfaces:**
- Consume: `directorio()` de la Tarea 4.
- Produce: componente con props `{ personas: PersonaMonday[]; valorInicial?: { nombre: string; mondayId: string | null } }` que emite dos campos de formulario: `responsable` (texto) y `responsableMondayId` (texto o vacío).

- [ ] **Paso 1: Escribir el test que falla**

```tsx
// src/componentes/SelectorResponsable.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SelectorResponsable } from './SelectorResponsable'

const PERSONAS = [
  { id: '65476486', nombre: 'Iris Múgica', correo: 'iris.mugica@jansan.mx' },
  { id: '67757625', nombre: 'César Mejía Medina', correo: 'julio.mejiam@upax.com.mx' },
]

describe('SelectorResponsable', () => {
  it('separa a Mkt Corp de la UDN: de ahí sale si el acuerdo viaja al tablero', () => {
    render(<SelectorResponsable personas={PERSONAS} />)
    expect(screen.getByRole('group', { name: /Mkt Corp/ })).toBeInTheDocument()
    expect(screen.getByLabelText(/de la UDN/i)).toBeInTheDocument()
  })

  it('sin directorio no bloquea: se puede escribir un responsable de la UDN igual', () => {
    render(<SelectorResponsable personas={[]} />)
    expect(screen.getByText(/no se pudo cargar la gente de Monday/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/de la UDN/i)).toBeEnabled()
  })

  it('elegir a alguien de Mkt Corp manda su id junto al nombre', async () => {
    const { container } = render(<SelectorResponsable personas={PERSONAS} valorInicial={{ nombre: 'Iris Múgica', mondayId: '65476486' }} />)
    const oculto = container.querySelector('input[name="responsableMondayId"]') as HTMLInputElement
    expect(oculto.value).toBe('65476486')
  })
})
```

- [ ] **Paso 2: Correr el test y ver que falla**

Ejecutar: `npx vitest run src/componentes/SelectorResponsable.test.tsx`
Esperado: FALLA — no existe el componente.

- [ ] **Paso 3: Implementar**

Componente de cliente con dos entradas mutuamente excluyentes: un `<select>`
agrupado bajo la etiqueta "Mkt Corp" con las personas del directorio, y un
`<input>` de texto "…o alguien de la UDN". Elegir en uno limpia el otro. Emite
siempre `responsable` (el nombre visible) y `responsableMondayId` (el id o
cadena vacía). Si `personas` llega vacío, muestra el aviso y deja el texto libre
funcionando.

- [ ] **Paso 4: Correr el test y ver que pasa**

Ejecutar: `npx vitest run src/componentes/SelectorResponsable.test.tsx`
Esperado: 3 tests en verde.

- [ ] **Paso 5: Enchufarlo**

En `NuevoAcuerdoForm.tsx`, sustituir el `<input name="responsable">` por
`<SelectorResponsable personas={personas} />` (las personas llegan por props
desde el Server Component que lo renderiza, que las pide a `directorio()`), y
pasar `responsableMondayId` a `crearAction`. Hacer lo mismo donde se editan los
acuerdos de una sesión al levantar la minuta.

- [ ] **Paso 6: Correr la suite y el lint**

Ejecutar: `npm test && npm run lint`

- [ ] **Paso 7: Commit**

```bash
git add src/componentes/SelectorResponsable.tsx src/componentes/SelectorResponsable.test.tsx src/componentes/NuevoAcuerdoForm.tsx
git commit -m "El responsable se elige de la gente viva de Monday, no se escribe a mano"
```

---

## Tarea 11: El espacio de acuerdos, con su estrella

**Archivos:**
- Crear: `src/app/acuerdos/page.tsx`, `src/componentes/acuerdos/Estrella.tsx`, `src/componentes/acuerdos/TablaAcuerdos.tsx`
- Modificar: `src/db/consultas.ts` (función `todosLosAcuerdos`), `src/app/acuerdos/acciones.ts` (`destacarAction`)
- Test: `src/componentes/acuerdos/TablaAcuerdos.test.tsx`

**Interfaces:**
- Produce: `todosLosAcuerdos(): Promise<AcuerdoConSala[]>` donde `AcuerdoConSala` extiende `Acuerdo` con `salaSlug`, `salaNombre`, `salaColor`, `salaActiva`, `destacado`, `mondayUrl`, `mondayTipo`, `bandeja`.

- [ ] **Paso 1: Escribir el test que falla**

```tsx
// src/componentes/acuerdos/TablaAcuerdos.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TablaAcuerdos } from './TablaAcuerdos'

const base = {
  id: 'a1', que: 'Enviar propuesta', responsable: 'Iris Múgica', fechaCompromiso: '2026-08-12',
  estatus: 'abierto' as const, salaSlug: 'mexa-creativa', salaNombre: 'Mexa Creativa',
  salaColor: '#000', salaActiva: true, destacado: false, mondayUrl: null, bandeja: 'pendiente' as const,
}

describe('TablaAcuerdos', () => {
  it('los de una sala en pausa van a su propio bloque, apagados', () => {
    render(<TablaAcuerdos acuerdos={[base, { ...base, id: 'a2', salaActiva: false, salaNombre: 'Zeus' }]} destacar={vi.fn()} />)
    const congelados = screen.getByRole('region', { name: /congelados/i })
    expect(congelados).toHaveTextContent('Zeus')
    expect(congelados).not.toHaveTextContent('Mexa Creativa')
  })

  it('el que vive en Monday enlaza a su elemento', () => {
    render(<TablaAcuerdos acuerdos={[{ ...base, mondayUrl: 'https://monday.com/x' }]} destacar={vi.fn()} />)
    expect(screen.getByRole('link', { name: /ver en Monday/i })).toHaveAttribute('href', 'https://monday.com/x')
  })

  it('sin un solo acuerdo lo dice, en vez de enseñar una tabla vacía', () => {
    render(<TablaAcuerdos acuerdos={[]} destacar={vi.fn()} />)
    expect(screen.getByText(/todavía no hay acuerdos/i)).toBeInTheDocument()
  })
})
```

- [ ] **Paso 2: Correr el test y ver que falla**

Ejecutar: `npx vitest run src/componentes/acuerdos/TablaAcuerdos.test.tsx`
Esperado: FALLA.

- [ ] **Paso 3: Implementar la tabla, la estrella y la página**

`TablaAcuerdos` recibe la lista ya resuelta y la parte en dos regiones: los
vivos y los congelados (`salaActiva === false`), con filtros por sala,
responsable y estatus. `Estrella` es un botón que llama a `destacarAction(id,
!destacado)` — el mismo componente que usarán el Home y la sala, para que la
estrella sea un dato y no tres listas.

`src/app/acuerdos/page.tsx`: Server Component que empieza por
`await exigirEquipo()`, llama a `refrescarDesdeMonday()` dentro de `try/catch`,
carga `todosLosAcuerdos()` y enlaza a la bandeja con su contador.

- [ ] **Paso 4: Correr el test y ver que pasa**

Ejecutar: `npx vitest run src/componentes/acuerdos/TablaAcuerdos.test.tsx`
Esperado: 3 tests en verde.

- [ ] **Paso 5: Commit**

```bash
git add src/app/acuerdos src/componentes/acuerdos src/db/consultas.ts
git commit -m "El espacio de acuerdos: todos juntos, con su estrella y su estado en Monday"
```

---

## Tarea 12: Freeze de salas y orden por próxima reunión

**Archivos:**
- Modificar: `src/dominio/salas.ts`, `src/db/consultas.ts`, `src/app/page.tsx`, `src/app/cliente/[slug]/page.tsx`, `src/componentes/hogar/ModuloAcuerdos.tsx`
- Crear: `src/app/acuerdos/acciones.ts` → `pausarSalaAction`, `reactivarSalaAction`
- Test: `src/dominio/salas.test.ts` (añadir casos)

**Interfaces:**
- Produce: `ordenarPorProximaReunion(salas: EstadoSala[]): EstadoSala[]`, `estaCongelado(acuerdo, sala): boolean`. `EstadoSala` gana `activa: boolean` y `pausadaDesde: string | null`.

- [ ] **Paso 1: Escribir el test que falla**

El ayudante `sala(parcial)` ya existe en ese archivo y devuelve una `EstadoSala`
completa a partir de un parcial; hay que pasarle `nombre` explícito en los casos
que ordenan alfabéticamente, porque por defecto todas se llaman igual.

```ts
// añadir a src/dominio/salas.test.ts
import { ordenarPorProximaReunion, acuerdosVencidos } from './salas'

describe('ordenarPorProximaReunion', () => {
  it('primero las que tienen fecha, de la más próxima a la más lejana', () => {
    const orden = ordenarPorProximaReunion([
      sala({ slug: 'zeus', nombre: 'Zeus', proximaSesion: '2026-08-20' }),
      sala({ slug: 'neracode', nombre: 'NeraCode', proximaSesion: '2026-08-03' }),
      sala({ slug: 'uix', nombre: 'UiX', proximaSesion: '2026-08-11' }),
    ])
    expect(orden.map((s) => s.slug)).toEqual(['neracode', 'uix', 'zeus'])
  })

  it('las que no tienen fecha van después, por nombre', () => {
    const orden = ordenarPorProximaReunion([
      sala({ slug: 'uix', nombre: 'UiX', proximaSesion: null }),
      sala({ slug: 'neracode', nombre: 'NeraCode', proximaSesion: null }),
      sala({ slug: 'zeus', nombre: 'Zeus', proximaSesion: '2026-08-20' }),
    ])
    expect(orden.map((s) => s.slug)).toEqual(['zeus', 'neracode', 'uix'])
  })

  it('las pausadas van al final, aunque tengan la fecha más próxima de todas', () => {
    const orden = ordenarPorProximaReunion([
      sala({ slug: 'zeus', nombre: 'Zeus', proximaSesion: '2026-08-01', activa: false }),
      sala({ slug: 'neracode', nombre: 'NeraCode', proximaSesion: null }),
      sala({ slug: 'uix', nombre: 'UiX', proximaSesion: '2026-08-11' }),
    ])
    expect(orden.map((s) => s.slug)).toEqual(['uix', 'neracode', 'zeus'])
  })
})

describe('acuerdos congelados', () => {
  it('una sala en pausa no tiene acuerdos vencidos: están congelados', () => {
    const enPausa = sala({
      slug: 'zeus',
      nombre: 'Zeus',
      activa: false,
      acuerdos: [
        { id: 'x', que: 'algo', responsable: 'quien', fechaCompromiso: '2026-01-01', estatus: 'vencido' },
      ],
    })
    expect(acuerdosVencidos(enPausa)).toBe(0)
  })
})
```

**Ojo:** al añadir `activa` a `EstadoSala`, el ayudante `sala()` de este archivo
necesita `activa: true` entre sus valores por defecto, o ningún caso compila.

- [ ] **Paso 2: Correr el test y ver que falla**

Ejecutar: `npx vitest run src/dominio/salas.test.ts`
Esperado: FALLA — no existe `ordenarPorProximaReunion`.

- [ ] **Paso 3: Implementar**

```ts
// en src/dominio/salas.ts, sustituyendo a ordenarPorUrgencia
/**
 * EL ORDEN DE LAS SALAS, el mismo en todas las pantallas (Franco, 29-jul).
 *
 * 1. Con reunión agendada, de la más próxima a la más lejana.
 * 2. Sin reunión agendada, por nombre.
 * 3. En pausa, por nombre.
 *
 * Sustituye a `ordenarPorUrgencia`, que subía sola a la primera fila la sala más
 * desatendida. Esa señal no se pierde —los vencidos siguen en el Home y la
 * tarjeta conserva su temperatura— pero cambia de sitio: una sala olvidada
 * hace tres meses es justo una que no tiene fecha, así que ahora cae al segundo
 * bloque.
 */
export function ordenarPorProximaReunion(salas: EstadoSala[]): EstadoSala[] {
  const bloque = (s: EstadoSala) => (s.activa === false ? 2 : s.proximaSesion ? 0 : 1)
  return [...salas].sort((a, b) => {
    const ba = bloque(a)
    const bb = bloque(b)
    if (ba !== bb) return ba - bb
    if (ba === 0) return a.proximaSesion!.localeCompare(b.proximaSesion!)
    return a.nombre.localeCompare(b.nombre, 'es')
  })
}
```

Y en `acuerdosVencidos`, `acuerdosAbiertos`, `acuerdosEnRiesgo` y `pulsoDelMes`:
saltarse las salas con `activa === false`. Dejar el porqué escrito una vez, en
`acuerdosVencidos`:

```ts
  // Una sala en freeze no acumula deuda: sus compromisos están congelados, no
  // vencidos. Contarlos pondría en rojo el Home por trabajo que alguien decidió
  // parar.
```

- [ ] **Paso 4: Correr el test y ver que pasa**

Ejecutar: `npx vitest run src/dominio/salas.test.ts`
Esperado: verde.

- [ ] **Paso 5: El Home y la sala**

En `src/app/page.tsx`: cambiar `ordenarPorUrgencia` por `ordenarPorProximaReunion`
y separar visualmente el bloque "En pausa" con su fecha de freeze.
En `ModuloAcuerdos.tsx`: dos bloques, **Destacados** y **Vencidos**, con sus tres
vacíos distintos:

| Situación | Texto |
|---|---|
| Hay acuerdos, ninguno destacado | "Nada destacado todavía." + enlace a `/acuerdos` |
| Hay acuerdos abiertos, ninguno vencido | "Todo lo abierto está en fecha." |
| No hay ni un acuerdo | "Todavía no hay acuerdos." |

En `src/app/cliente/[slug]/page.tsx`: el interruptor de pausar/reactivar (solo
para equipo) y, si está en pausa, el aviso de que sus acuerdos están congelados.

- [ ] **Paso 6: Correr la suite y el lint**

Ejecutar: `npm test && npm run lint`
Esperado: verde. Los tests que usaban `ordenarPorUrgencia` hay que actualizarlos:
esa función desaparece.

- [ ] **Paso 7: Commit**

```bash
git add src/dominio/salas.ts src/db/consultas.ts src/app/page.tsx src/app/cliente src/componentes/hogar
git commit -m "Las salas se ordenan por su próxima reunión, y una en freeze congela sus acuerdos"
```

---

## Tarea 13: Encender la escritura y verificar contra el tablero real

**Archivos:** ninguno de código. Es la verificación.

⚠️ **Esta es la primera vez que se escribe en el tablero de 950 elementos del
equipo.** Antes de empezar, avisar a Franco.

- [ ] **Paso 1: Configurar las variables en Vercel**

```bash
vercel env add MONDAY_GRUPO production   # group_mm15cfz2
vercel env add MONDAY_ESCRITURA production   # si
```

`MONDAY_TOKEN` ya tiene que estar; si no, lo repone Franco.

- [ ] **Paso 2: Desplegar y mirar la app desplegada, no localhost**

El motor y las minutas no funcionan en local (`ANTHROPIC_API_KEY` solo vive en
Vercel), así que la verificación de punta a punta es contra el despliegue.

- [ ] **Paso 3: Crear un acuerdo de prueba y subirlo como ELEMENTO**

Con una sala real, responsable de Mkt Corp y fecha. Comprobar en Monday: nombre
con prefijo, UdN correcta, Fase `🚧 Sprint`, Deadline y Responsable asignado.

- [ ] **Paso 4: Crear otro y subirlo como SUBELEMENTO**

Colgándolo de un elemento existente de esa UDN. Comprobar que **las columnas del
subelemento se llenaron** — es el error más probable de toda la entrega, y falla
en silencio dejándolas vacías.

- [ ] **Paso 5: Mover uno en Monday y comprobar la vuelta**

Cambiar su Fase a `✅ Done` en el tablero, recargar `/acuerdos` y ver que la app
lo da por cumplido.

- [ ] **Paso 6: Sacar los prints**

Con la skill `shot`: Home con los dos bloques, `/acuerdos`, la bandeja, y una
sala en pausa. **Mirar los PNG.** Los defectos de las rondas 2 a 6 salieron de
mirar los prints con la suite en verde, no de los tests.

- [ ] **Paso 7: Borrar TODO el rastro**

En Monday: borrar el elemento y el subelemento de prueba.
En la base: borrar los acuerdos de prueba. **Los acuerdos sobreviven al borrado
de su reunión** —la clave ajena se anula, no cascada—, así que hay que borrarlos
aparte. Dejar la base como estaba: 4 sesiones de Franco, 0 minutas, 0 acuerdos.

- [ ] **Paso 8: Commit del registro**

Escribir en este mismo plan qué se verificó y qué salió, y commitear.

---

## Autorrevisión de este plan

Comprobado contra el spec, sección por sección:

| Sección del spec | Tarea |
|---|---|
| 1 · El responsable dice de quién es | 5, 10 |
| 2 · El directorio de personas | 4 |
| 3 · La bandeja hacia Delivery | 5, 6, 7, 8 |
| 4 · La vuelta | 9 |
| 5 · El espacio de acuerdos | 11 |
| 6 · El Home | 12 |
| 7 · Freeze y orden | 12 |
| Modelo de datos | 3 |
| Errores y casos límite | 1 (429, timeout), 6 (grupo inexistente), 8 (los cuatro estados de pantalla), 9 (elemento borrado) |
| Pruebas | cada tarea, y la 13 en producción |

**Lo que este plan NO hace, y el spec tampoco:** crear salas nuevas, la página de
calendario compartible, leer las 51 reuniones ya agendadas en Monday, y escribir
el Squad Owner. Van en la entrega siguiente.
