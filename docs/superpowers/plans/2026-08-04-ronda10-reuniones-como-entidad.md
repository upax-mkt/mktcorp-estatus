# Ronda 10 — La reunión es la entidad · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que una reunión exista por sí misma —con su fecha, su presentación (archivo web o PDF), su minuta y sus acuerdos— en vez de ser un subproducto de "preparar un deck", para que se pueda cargar una junta que ya ocurrió con lo que sea que se tenga de ella.

**Architecture:** `sesiones` se parte en `reuniones` (la junta: fecha, sala, título, tipo, si se dio) y `documentos` (lo que se prepara para ella, 0 o 1 por reunión). Minutas, acuerdos, archivos y participación pasan a colgar de la reunión; los items siguen colgando del documento. La reunión hereda el id de la sesión de la que sale, así que las URLs vivas (`/reunion/<id>`, `/deck/<id>`) no se rompen.

**Tech Stack:** Next.js 16 (el `proxy.ts` hace de middleware), React Server Components, Drizzle ORM sobre Neon Postgres, vitest, CSS Modules, Vercel Blob.

**Spec:** `docs/superpowers/specs/2026-08-04-reuniones-como-entidad-design.md` — leerlo entero antes de la Tarea 1. Este plan no repite sus razones.

## Global Constraints

- **Este NO es el Next.js que conoces.** Antes de escribir código de rutas, layouts o middleware, leer la guía correspondiente en `node_modules/next/dist/docs/`. Está en el `AGENTS.md` del repo y no es decorativo.
- **Producción y local comparten la misma base de Neon.** Cualquier escritura de prueba entra en la app real de Franco. Los datos de prueba se borran al terminar la tarea que los creó, y los acuerdos **sobreviven al borrado de su reunión** (la clave ajena se anula, no cascada): hay que borrarlos aparte.
- **`neon-http` no soporta transacciones ni `SELECT FOR UPDATE`.** Toda condición va DENTRO de la sentencia (`WHERE ... AND EXISTS (...)`, `INSERT ... ON CONFLICT DO UPDATE`). Las migraciones DDL sí van en transacción, aplicadas por `DATABASE_URL_UNPOOLED`.
- **Las fechas se comparan por día civil anclado a `America/Mexico_City`**, nunca por instante. Fuente única: `src/lib/fecha.ts` (`diaCivil`, `instanteEnCDMX`). En Vercel el proceso corre en UTC.
- **Esconder un botón no protege un endpoint.** Cada página y cada Server Action repite su comprobación: `exigirLectura()`, `exigirEditor()`, `exigirAdmin()` de `src/auth/roles.ts`.
- **En pantalla todo se llama "reunión".** "Sesión" desaparece de la interfaz. "Documento" es lo que se prepara. Los identificadores de código en español, como el resto del repo.
- **`ANTHROPIC_API_KEY` no está en local.** Nada que llame al modelo (maquetar, minuta desde transcripción) se puede probar en `localhost`; se verifica contra el despliegue.
- **`/agenda/[token]` no se toca**: es la agenda pública de enlace firmado, ya compartida fuera.
- **Verde antes de commit:** `npx vitest run`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. Los 1278 tests actuales siguen verdes salvo donde una tarea diga explícitamente qué test cambia y por qué.

---

## Estructura de archivos

**Se crean:**

| Archivo | Responsabilidad |
|---|---|
| `src/db/reuniones.ts` | La reunión: crear, listar, obtener, editar, marcar dada / no dada, eliminar |
| `src/db/documentos.ts` | El documento y sus items: secciones, orden, contenido, decisiones del motor |
| `src/db/reuniones.test.ts` · `src/db/documentos.test.ts` | Sus tests |
| `src/dominio/reunion.ts` | Tipo `Reunion` y las funciones que lo arman y lo interrogan |
| `src/dominio/reunion.test.ts` | Sus tests |
| `src/app/reuniones/page.tsx` · `acciones.ts` · `reuniones.module.css` | La pestaña global |
| `src/app/cliente/[slug]/ajustes/page.tsx` | Ajustes de la sala |
| `src/componentes/reuniones/CarasDeReunion.tsx` | Las caras de una reunión y los huecos accionables |
| `src/componentes/reuniones/AcuerdosDeReunion.tsx` | El desplegable de acuerdos |
| `src/componentes/hogar/AgendarRapido.tsx` | El botón de agendar del Home |
| `drizzle/0019_*.sql` … `drizzle/0024_*.sql` | Las seis migraciones, una por paso |
| `scripts/verificar-migracion.mjs` | La verificación leída de la base |

**Se modifican:**

| Archivo | Qué cambia |
|---|---|
| `src/db/esquema.ts` | Tablas `reuniones` y `documentos`, enums nuevos, `quincenal` en cadencia |
| `src/db/sesiones.ts` (1341 líneas) | **Se vacía y desaparece.** Su contenido se reparte entre `reuniones.ts` y `documentos.ts` |
| `src/db/consultas.ts` | `estadoDeSala` lee del modelo nuevo y trae los archivos de presentación |
| `src/db/minutas.ts` · `acuerdos.ts` · `participacion.ts` · `archivos.ts` | `sesionId` → `reunionId` |
| `src/dominio/salas.ts` | `reunionesDeSala` sale a `dominio/reunion.ts`; `temperatura` aprende quincenal |
| `src/app/cliente/[slug]/page.tsx` | Sección Reuniones nueva, sin "Antes de esta herramienta", enlace a ajustes |
| `src/componentes/ReunionesSala.tsx` | Caras accionables y acuerdos desplegables |
| `src/app/agenda/page.tsx` | Se muda a `/reuniones`; queda una redirección |
| `src/app/page.tsx` | Botón de agendar junto al calendario |
| `src/app/deck/**` · `src/app/reunion/[id]/**` | Resuelven documento por reunión |

---

# FASE A — el modelo y la migración

Al terminar la fase A la app se ve **exactamente igual** por fuera. Si algo cambia visualmente, es un defecto.

---

### Tarea 1: Las tablas nuevas, vacías

**Files:**
- Modify: `src/db/esquema.ts`
- Create: `drizzle/0019_*.sql` (lo genera drizzle-kit)
- Test: `src/db/esquema.test.ts`

**Interfaces:**
- Produces: tablas `reuniones` y `documentos`; enums `tipoReunionEnum`, `estadoReunionEnum`, `estadoDocumentoEnum`; valor `quincenal` en `cadenciaEnum`.

- [ ] **Step 1: Escribir el test que falla**

En `src/db/esquema.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { cadenciaEnum, documentos, estadoDocumentoEnum, estadoReunionEnum, reuniones, tipoReunionEnum } from './esquema'

describe('el modelo de reuniones', () => {
  it('una reunión se puede dar o no, y nada más — el estado del documento es otra cosa', () => {
    expect(estadoReunionEnum.enumValues).toEqual(['agendada', 'dada'])
    expect(estadoDocumentoEnum.enumValues).toEqual(['borrador', 'listo'])
  })

  it('quincenal existe, y en los dos sitios: la cadencia de la sala y el tipo de la reunión', () => {
    expect(cadenciaEnum.enumValues).toContain('quincenal')
    expect(tipoReunionEnum.enumValues).toEqual(['semanal', 'quincenal', 'mensual'])
  })

  it('la reunión guarda lo que trae un evento de calendario', () => {
    const cols = Object.keys(reuniones)
    for (const c of ['salaSlug', 'fecha', 'titulo', 'tipo', 'estado', 'noDadaEn', 'lugar', 'alcance', 'participantes']) {
      expect(cols).toContain(c)
    }
  })

  it('un documento pertenece a una reunión y a una sola', () => {
    expect(Object.keys(documentos)).toContain('reunionId')
    expect(documentos.reunionId.notNull).toBe(true)
    expect(documentos.reunionId.isUnique).toBe(true)
  })
})
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `npx vitest run src/db/esquema.test.ts`
Expected: FAIL — `reuniones` y `documentos` no existen en el módulo.

- [ ] **Step 3: Añadir enums y tablas a `src/db/esquema.ts`**

Junto a los enums existentes (línea ~28). `cadenciaEnum` **gana** un valor, no se reescribe:

```ts
export const cadenciaEnum = pgEnum('cadencia', ['semanal', 'quincenal', 'mensual'])
export const tipoReunionEnum = pgEnum('tipo_reunion', ['semanal', 'quincenal', 'mensual'])

/**
 * Dos estados y no cinco. Lo que hoy vive en `estado_sesion` son DOS vidas
 * mezcladas: la de la junta (¿se dio?) y la del documento (¿está listo?).
 * Mezcladas costaron dos defectos —el contador del Home que mentía y
 * marcar-presentada como trámite que nadie hacía—. Ver spec §1.
 */
export const estadoReunionEnum = pgEnum('estado_reunion', ['agendada', 'dada'])
export const estadoDocumentoEnum = pgEnum('estado_documento', ['borrador', 'listo'])
```

Y las dos tablas, después de `salas`:

```ts
export const reuniones = pgTable('reuniones', {
  id: text('id').primaryKey(),
  salaSlug: text('sala_slug').notNull().references(() => salas.slug),
  /** Instante, anclado a CDMX al escribir (`instanteEnCDMX`). */
  fecha: timestamp('fecha', { withTimezone: true }).notNull(),
  titulo: text('titulo').notNull(),
  tipo: tipoReunionEnum('tipo').notNull(),
  estado: estadoReunionEnum('estado').notNull().default('agendada'),
  /**
   * Alguien dijo que ESTA reunión no se dio —se canceló, se pospuso—. Es un
   * campo y no un estado porque manda sobre la deducción automática sin
   * borrar el hecho de que estaba agendada.
   */
  noDadaEn: timestamp('no_dada_en', { withTimezone: true }),
  lugar: text('lugar'),
  alcance: text('alcance').notNull().default('todos'),
  participantes: jsonb('participantes').$type<unknown[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const documentos = pgTable('documentos', {
  id: text('id').primaryKey(),
  /**
   * UNIQUE, y en la base: es lo único que impide que dos pestañas abiertas
   * creen dos documentos para la misma reunión. Con `neon-http` no hay
   * transacción que lo arregle después.
   */
  reunionId: text('reunion_id').notNull().unique().references(() => reuniones.id),
  estado: estadoDocumentoEnum('estado').notNull().default('borrador'),
  estructura: jsonb('estructura').$type<unknown>(),
  plantilla: text('plantilla'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Step 4: Generar la migración y leerla antes de aplicarla**

```bash
npm run db:generate
cat drizzle/0019_*.sql
```

Comprobar a ojo que **solo** añade: los tres enums nuevos, el valor `quincenal`, y las dos tablas. Si el SQL toca `sesiones` o borra algo, parar y revisar el esquema — este paso es puramente aditivo.

- [ ] **Step 5: Correr los tests**

Run: `npx vitest run src/db/esquema.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Ensayar contra una rama de Neon, no contra la base real**

```bash
# Crear la rama de ensayo (plan Free la incluye)
npx neonctl branches create --name ensayo-ronda10 --project-id "$NEON_PROJECT_ID"
npx neonctl connection-string ensayo-ronda10 --project-id "$NEON_PROJECT_ID" --pooled false
```

Guardar esa cadena en `.env.ensayo` (git-ignored, añadirlo a `.gitignore` si no está) y aplicar ahí:

```bash
DATABASE_URL="<cadena de la rama>" npm run db:migrate
```

Expected: la migración aplica sin error. **No** aplicar todavía a la base real.

- [ ] **Step 7: Commit**

```bash
git add src/db/esquema.ts src/db/esquema.test.ts drizzle/
git commit -m "Nacen reuniones y documentos, vacías: la junta y lo que se prepara para ella son dos cosas"
```

---

### Tarea 2: Partir las sesiones en reuniones y documentos (datos)

**Files:**
- Create: `drizzle/0020_*.sql` (escrita a mano, ver paso 2)
- Create: `scripts/verificar-migracion.mjs`

**Interfaces:**
- Consumes: tablas de la Tarea 1.
- Produces: una fila en `reuniones` por cada `sesiones`, **con el mismo id**; una en `documentos` por cada sesión que tuviera contenido.

- [ ] **Step 1: Fotografiar la base ANTES**

Crear `scripts/verificar-migracion.mjs`:

```js
/**
 * La comprobación LEÍDA de la migración. Un reporte que dice "verificado" no
 * prueba nada: en la ronda 9 un subagente borró una migración del disco
 * dejándola en el journal y aplicada, y solo se cazó consultando la base.
 *
 * Uso:  node scripts/verificar-migracion.mjs [antes|despues]
 */
process.loadEnvFile(process.env.ENV_FILE ?? '.env.local')
const { neon } = await import('@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)

const momento = process.argv[2] ?? 'ahora'
const filas = async (etiqueta, consulta) => {
  const r = await consulta
  console.log(`${etiqueta.padEnd(34)} ${JSON.stringify(r[0] ?? r)}`)
}

console.log(`\n=== ${momento.toUpperCase()} · ${process.env.DATABASE_URL.split('@')[1]?.split('/')[0]} ===`)
await filas('sesiones', sql`select count(*)::int n from sesiones`)
await filas('reuniones', sql`select count(*)::int n from reuniones`)
await filas('documentos', sql`select count(*)::int n from documentos`)
await filas('items', sql`select count(*)::int n from items`)
await filas('minutas', sql`select count(*)::int n from minutas`)
await filas('acuerdos', sql`select count(*)::int n from acuerdos`)
await filas('participacion', sql`select count(*)::int n from participacion`)
await filas('archivos presentacion', sql`select count(*)::int n from archivos where categoria='presentacion'`)
await filas('  ...de esos, sin reunión', sql`select count(*)::int n from archivos where categoria='presentacion' and reunion_id is null`)
await filas('reuniones sin sala', sql`select count(*)::int n from reuniones r left join salas s on s.slug=r.sala_slug where s.slug is null`)
await filas('documentos sin reunión', sql`select count(*)::int n from documentos d left join reuniones r on r.id=d.reunion_id where r.id is null`)
```

Las consultas que nombran `reunion_id` fallan hasta la Tarea 3; envolverlas en `try/catch` que imprima `— columna aún no existe` para que el script sirva en los dos momentos.

Correr contra la rama de ensayo y **pegar la salida en el reporte de la tarea**:

```bash
ENV_FILE=.env.ensayo node scripts/verificar-migracion.mjs antes
```

Números esperados hoy (medidos el 4-ago en la base real): sesiones 10 · items 82 · minutas 1 · acuerdos 6 · archivos presentacion 2.

- [ ] **Step 2: Escribir `drizzle/0020_partir_sesiones.sql` a mano**

drizzle-kit genera DDL, no movimientos de datos: esta va escrita. Crear el archivo y **añadirlo al journal** (`drizzle/meta/_journal.json`) con el mismo formato que las entradas vecinas.

```sql
-- Cada sesión se parte en dos: la junta y lo que se preparó para ella.
-- El id de la reunión ES el id de la sesión, a propósito: los `sesion_id`
-- que ya existen en minutas/acuerdos/archivos/participacion siguen siendo
-- válidos como `reunion_id` sin tabla de correspondencia, y las URLs vivas
-- (/reunion/<id>, /deck/<id>) no se rompen.

INSERT INTO reuniones (id, sala_slug, fecha, titulo, tipo, estado, no_dada_en, lugar, alcance, participantes, created_at, updated_at)
SELECT
  s.id,
  s.sala_slug,
  s.fecha,
  -- La app deriva hoy el título de la sesión; se conserva el mismo criterio.
  COALESCE(NULLIF(TRIM(s.plantilla), ''), INITCAP(s.tipo::text)) || ' · ' || TO_CHAR(s.fecha AT TIME ZONE 'America/Mexico_City', 'FMDD "de" FMMonth'),
  s.tipo::text::tipo_reunion,
  CASE WHEN s.estado IN ('presentada', 'minutada') THEN 'dada' ELSE 'agendada' END::estado_reunion,
  s.no_dada_en,
  s.lugar,
  s.alcance,
  s.participantes,
  s.created_at,
  s.updated_at
FROM sesiones s;

-- El documento nace si la sesión llegó a tener vida de documento: estructura
-- o items. NO se filtra por `estado <> 'agendada'`.
--
-- CORREGIDO EL 4-AGO CONTRA LA BASE REAL. El plan asumía que 'agendada' era
-- "una fecha en el calendario y nada más". Es falso: `/agenda` agenda con
-- `crearSesionConEstructura`, así que las 7 sesiones 'agendada' de hoy tienen
-- su plantilla de 8 secciones y 56 items entre todas. Filtrarlas dejaba esos
-- 56 items sin documento, y el `SET NOT NULL` de la Tarea 8 habría fallado.
INSERT INTO documentos (id, reunion_id, estado, estructura, plantilla, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
  s.id,
  -- Solo 'lista' y 'minutada' son un documento terminado. 'agendada' y
  -- 'borrador' son trabajo en curso, por muy poblada que esté la plantilla.
  CASE WHEN s.estado IN ('lista', 'minutada') THEN 'listo' ELSE 'borrador' END::estado_documento,
  s.estructura,
  s.plantilla,
  s.created_at,
  s.updated_at
FROM sesiones s
WHERE s.estructura IS NOT NULL
   OR EXISTS (SELECT 1 FROM items i WHERE i.sesion_id = s.id);
```

- [ ] **Step 3: Aplicar en la rama de ensayo y verificar leyendo**

```bash
# OJO: `drizzle.config.ts` NO lee ENV_FILE — carga `.env.local` y usa
# DATABASE_URL del entorno. Como `process.loadEnvFile` no pisa lo que ya
# viene del entorno, la ÚNICA forma segura de apuntar al ensayo es
# exportar DATABASE_URL en la propia línea. Con `ENV_FILE=...` la
# migración se aplicaría a PRODUCCIÓN sin avisar.
DATABASE_URL="$(node -e "process.loadEnvFile('.env.ensayo');process.stdout.write(process.env.DATABASE_URL)")" npm run db:migrate
ENV_FILE=.env.ensayo node scripts/verificar-migracion.mjs despues
```

Expected, contra los números de hoy: `reuniones 10` · `documentos 10` (las 10 tienen estructura) · `documentos sin reunión 0` · `items 82`, todos con documento.

- [ ] **Step 4: Comprobar los títulos a ojo**

```bash
ENV_FILE=.env.ensayo node --input-type=module -e "
process.loadEnvFile('.env.ensayo')
const { neon } = await import('@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)
console.table(await sql\`select fecha::date::text dia, sala_slug, titulo, tipo, estado from reuniones order by fecha\`)
"
```

Ninguno debe salir vacío ni con `null`. Si alguno queda feo, corregir el `SELECT` del paso 2 y repetir sobre la rama (borrar las filas insertadas primero).

- [ ] **Step 5: Commit**

```bash
git add drizzle/ scripts/verificar-migracion.mjs
git commit -m "Cada sesión se parte en su reunión y su documento, conservando el id"
```

---

### Tarea 3: Las cinco tablas apuntan a la reunión

**Files:**
- Modify: `src/db/esquema.ts`
- Create: `drizzle/0021_*.sql` (DDL, generada) y `drizzle/0022_rellenar_reunion_id.sql` (datos, a mano)

**Interfaces:**
- Produces: `minutas.reunionId`, `acuerdos.reunionOrigenId`, `archivos.reunionId`, `participacion.reunionId`, `items.documentoId` — todas pobladas, conviviendo con las columnas viejas.

- [ ] **Step 1: Añadir las columnas nuevas al esquema, nullable**

En `src/db/esquema.ts`, junto a cada `sesionId` existente. Nullable **a propósito** en este paso: se rellenan en el siguiente y se vuelven `notNull` en la Tarea 8.

```ts
// minutas
reunionId: text('reunion_id').references(() => reuniones.id),
// acuerdos
reunionOrigenId: text('reunion_origen_id').references(() => reuniones.id),
// archivos
reunionId: text('reunion_id').references(() => reuniones.id),
// participacion
reunionId: text('reunion_id').references(() => reuniones.id),
// items
documentoId: text('documento_id').references(() => documentos.id),
```

- [ ] **Step 2: Generar el DDL y leerlo**

```bash
npm run db:generate && cat drizzle/0021_*.sql
```

Debe ser solo `ALTER TABLE ... ADD COLUMN`. Cinco. Nada más.

- [ ] **Step 3: Escribir `drizzle/0022_rellenar_reunion_id.sql`**

```sql
-- Se COPIA, no se mueve: las columnas viejas se quedan hasta la última
-- migración para poder comparar las dos versiones antes de tirar nada.
UPDATE minutas       SET reunion_id        = sesion_id        WHERE sesion_id IS NOT NULL;
UPDATE acuerdos      SET reunion_origen_id = sesion_origen_id WHERE sesion_origen_id IS NOT NULL;
UPDATE archivos      SET reunion_id        = sesion_id        WHERE sesion_id IS NOT NULL;
UPDATE participacion SET reunion_id        = sesion_id        WHERE sesion_id IS NOT NULL;

-- Los items cuelgan del DOCUMENTO, no de la reunión: una sección es
-- contenido de lo que se preparó, no de la junta.
UPDATE items i SET documento_id = d.id
FROM documentos d
WHERE d.reunion_id = i.sesion_id;

-- Un archivo de presentación huérfano (sala + fecha, sin sesión) ES una
-- reunión que se dio: la que se presentó ese día. Hoy hay 2.
INSERT INTO reuniones (id, sala_slug, fecha, titulo, tipo, estado, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
  a.sala_slug,
  a.fecha,
  a.titulo,
  COALESCE((SELECT s.cadencia::text FROM salas s WHERE s.slug = a.sala_slug), 'mensual')::tipo_reunion,
  'dada'::estado_reunion,
  a.created_at,
  a.updated_at
FROM archivos a
WHERE a.categoria = 'presentacion' AND a.sesion_id IS NULL AND a.sala_slug IS NOT NULL AND a.fecha IS NOT NULL;

-- ...y el archivo pasa a colgar de la reunión que acaba de nacer para él.
UPDATE archivos a SET reunion_id = r.id
FROM reuniones r
WHERE a.categoria = 'presentacion' AND a.reunion_id IS NULL
  AND r.sala_slug = a.sala_slug AND r.fecha = a.fecha AND r.titulo = a.titulo;
```

- [ ] **Step 4: Aplicar en la rama de ensayo y verificar leyendo**

```bash
# `ENV_FILE` NO lo lee drizzle.config.ts — ver Tarea 2 paso 3.
DATABASE_URL="$(node -e "process.loadEnvFile('.env.ensayo');process.stdout.write(process.env.DATABASE_URL)")" npm run db:migrate
ENV_FILE=.env.ensayo node scripts/verificar-migracion.mjs despues
```

Expected: `reuniones 12` (10 + 2 de archivos) · `archivos presentacion 2`, **de esos sin reunión 0** · `items 82`, ninguno sin documento.

Comprobar además que no quedó ninguna huérfana:

```bash
ENV_FILE=.env.ensayo node --input-type=module -e "
process.loadEnvFile('.env.ensayo')
const { neon } = await import('@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)
for (const [t, c] of [['minutas','reunion_id'],['acuerdos','reunion_origen_id'],['archivos','reunion_id'],['participacion','reunion_id'],['items','documento_id']]) {
  const [{ n }] = await sql(\`select count(*)::int n from \${t} where \${c} is null\`)
  console.log(t.padEnd(15), 'sin padre:', n)
}
"
```

Expected: `0` en las cinco, salvo `archivos` donde las imágenes de documento sí tienen reunión y los archivos de categoría `interes` no cuentan (filtrar por categoría al leer si sale ruido).

- [ ] **Step 5: Un archivo sin fecha no se inventa**

Comprobar que ninguno quedó fuera en silencio:

```bash
ENV_FILE=.env.ensayo node --input-type=module -e "
process.loadEnvFile('.env.ensayo')
const { neon } = await import('@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)
console.table(await sql\`select id, titulo, sala_slug, fecha from archivos where categoria='presentacion' and reunion_id is null\`)
"
```

Expected: tabla vacía. Si aparece alguno (un archivo sin fecha), **no se le inventa un día**: se reporta a Franco por su título para que diga de qué reunión era.

- [ ] **Step 6: Commit**

```bash
git add src/db/esquema.ts drizzle/
git commit -m "Minutas, acuerdos, archivos y participación cuelgan de la reunión; los items, del documento"
```

---

### Tarea 4: La capa de datos de la reunión

**Files:**
- Create: `src/db/reuniones.ts`, `src/db/reuniones.test.ts`
- Modify: `src/db/sesiones.ts` (se le quita lo que se muda)

**Interfaces:**
- Produces:
  ```ts
  export type TipoReunion = 'semanal' | 'quincenal' | 'mensual'
  export type EstadoReunion = 'agendada' | 'dada'
  export interface ReunionResumen {
    id: string; salaSlug: string; salaNombre: string; salaColor: string
    fecha: string; titulo: string; tipo: TipoReunion; estado: EstadoReunion
    noDadaEn: string | null; lugar: string | null
    tieneDocumento: boolean; tieneMinuta: boolean; archivos: number
  }
  export interface DatosDeReunion {
    salaSlug: string; fecha: Date; titulo: string; tipo: TipoReunion
    lugar?: string | null; alcance?: string; participantes?: unknown[]
  }
  export async function crearReunion(datos: DatosDeReunion): Promise<{ id: string }>
  export async function listarReuniones(): Promise<ReunionResumen[]>
  export async function obtenerReunion(id: string): Promise<ReunionResumen | null>
  export async function editarReunion(id: string, cambios: Partial<DatosDeReunion>): Promise<void>
  export async function marcarDada(id: string): Promise<void>
  export async function marcarNoDada(id: string): Promise<void>
  export async function desmarcarNoDada(id: string): Promise<void>
  export async function eliminarReunion(id: string): Promise<void>
  ```

- [ ] **Step 1: Escribir los tests que fallan**

En `src/db/reuniones.test.ts`. Siguen el patrón de `src/db/sesiones.test.ts` (mismo doble de base):

```ts
describe('crearReunion', () => {
  it('una sala en pausa no admite reuniones nuevas', async () => {
    await expect(crearReunion({ salaSlug: 'zeus', fecha: new Date(), titulo: 'x', tipo: 'mensual' }))
      .rejects.toThrow(/pausada/i)
  })

  it('nace agendada, no dada: agendar no es haber ocurrido', async () => {
    const { id } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    expect((await obtenerReunion(id))!.estado).toBe('agendada')
  })
})

describe('marcarNoDada', () => {
  it('deja constancia sin borrar que estaba agendada', async () => {
    const { id } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    await marcarNoDada(id)
    const r = (await obtenerReunion(id))!
    expect(r.noDadaEn).not.toBeNull()
    expect(r.estado).toBe('agendada')
  })

  it('se puede deshacer', async () => {
    const { id } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    await marcarNoDada(id)
    await desmarcarNoDada(id)
    expect((await obtenerReunion(id))!.noDadaEn).toBeNull()
  })
})

describe('marcarDada', () => {
  it('una reunión sin documento y sin archivo también se puede dar por dada', async () => {
    // El caso de Franco: la junta ocurrió, todavía no se ha cargado nada.
    const { id } = await crearReunion({ salaSlug: 'research-land', fecha: new Date(), titulo: 'Quincenal Comercial', tipo: 'quincenal' })
    await marcarDada(id)
    expect((await obtenerReunion(id))!.estado).toBe('dada')
  })
})

describe('eliminarReunion', () => {
  it('sus acuerdos sobreviven: un compromiso no desaparece porque se borre la junta', async () => {
    // `obtenerAcuerdoMemoria` es como leen los tests de acuerdos que ya
    // existen (src/db/acuerdos.test.ts) — no hay `obtenerAcuerdo` público.
    const { id } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    const acuerdo = await crearAcuerdo('neracode', {
      que: 'Cruce de paid media', responsable: 'Fernando',
      fechaCompromiso: null, reunionOrigenId: id,
    })
    await eliminarReunion(id)
    const vivo = obtenerAcuerdoMemoria(acuerdo.id)
    expect(vivo).not.toBeNull()
    expect(vivo!.reunionOrigenId).toBeNull()   // la clave ajena se anula, no cascada
  })
})
```

- [ ] **Step 2: Correr y verlos fallar**

Run: `npx vitest run src/db/reuniones.test.ts`
Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Escribir `src/db/reuniones.ts`**

Mudar desde `src/db/sesiones.ts`: `crearSesion` → `crearReunion`, `listarSesiones` → `listarReuniones`, `obtenerSesion` (la parte de cabecera) → `obtenerReunion`, `editarSesion` → `editarReunion`, `marcarPresentada` → `marcarDada`, `marcarNoDada`/`desmarcarNoDada` tal cual, `eliminarSesion` → `eliminarReunion`, `sesionesPublicasDelMes` → `reunionesPublicasDelMes`.

Conservar íntegras las reglas que ya viven ahí y que este plan no cambia: el rechazo de sala en pausa, el anclado a CDMX al escribir la fecha, y que borrar anula la clave ajena de los acuerdos en vez de cascada.

- [ ] **Step 4: Correr los tests**

Run: `npx vitest run src/db/reuniones.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/reuniones.ts src/db/reuniones.test.ts src/db/sesiones.ts
git commit -m "La capa de datos de la reunión, con su estado propio"
```

---

### Tarea 5: La capa de datos del documento

**Files:**
- Create: `src/db/documentos.ts`, `src/db/documentos.test.ts`
- Modify: `src/db/sesiones.ts` (queda vacío al terminar esta tarea)

**Interfaces:**
- Consumes: `reuniones.ts` de la Tarea 4.
- Produces:
  ```ts
  export type EstadoDocumento = 'borrador' | 'listo'
  export interface DocumentoCompleto {
    id: string; reunionId: string; estado: EstadoDocumento
    items: ItemDocumento[]; plantilla: string | null
  }
  export async function crearDocumento(reunionId: string, plantilla?: string): Promise<{ id: string }>
  export async function documentoDeReunion(reunionId: string): Promise<DocumentoCompleto | null>
  export async function marcarListo(documentoId: string): Promise<void>
  ```
  Más lo que hoy vive en `sesiones.ts` sobre items, con el mismo nombre y firma salvo que el primer parámetro pasa de `sesionId` a `documentoId`: `guardarItemContenido`, `guardarSeccion`, `anadirSeccion`, `eliminarSeccion`, `reordenarItems`, `moverItem`, `guardarDecisiones`, `esLlenado`, `itemDeAcuerdosPendientes`, `anadirAcuerdoRetomado`, `entradasCrudasDeSesion` (→ `entradasCrudasDeDocumento`), `parsearCifrasTexto`, `formatearCifrasTexto`, `parsearTablaTexto`, `formatearTablaTexto`.

- [ ] **Step 1: Escribir el test que falla**

```ts
describe('documentoDeReunion', () => {
  it('una reunión tiene como mucho un documento — la base lo impide, no el código', async () => {
    const { id } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    await crearDocumento(id)
    await expect(crearDocumento(id)).rejects.toThrow()
  })

  it('una reunión puede no tener documento: el PDF también es una presentación', async () => {
    const { id } = await crearReunion({ salaSlug: 'research-land', fecha: new Date(), titulo: 'Quincenal Comercial', tipo: 'quincenal' })
    expect(await documentoDeReunion(id)).toBeNull()
  })

  it('el documento nace en borrador y pasa a listo, y eso no dice nada de si la junta se dio', async () => {
    const { id } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    const doc = await crearDocumento(id)
    expect((await documentoDeReunion(id))!.estado).toBe('borrador')
    await marcarListo(doc.id)
    expect((await documentoDeReunion(id))!.estado).toBe('listo')
    expect((await obtenerReunion(id))!.estado).toBe('agendada')
  })
})
```

- [ ] **Step 2: Correr y verlo fallar**

Run: `npx vitest run src/db/documentos.test.ts`
Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Escribir `src/db/documentos.ts`** con lo mudado de `sesiones.ts`.

- [ ] **Step 4: Borrar `src/db/sesiones.ts` y su test**

Ya no queda nada dentro. Actualizar los imports de quien lo usaba: `src/app/agenda/page.tsx`, `src/app/cliente/[slug]/page.tsx`, `src/app/deck/**`, `src/app/reunion/[id]/**`, `src/db/consultas.ts`. `npx tsc --noEmit` dice exactamente cuáles.

- [ ] **Step 5: Correr todo**

Run: `npx vitest run && npm run lint && npx tsc --noEmit`
Expected: verde. Los tests que fallen por el renombrado se actualizan; los que fallen por comportamiento, **no** se tocan sin entender por qué.

- [ ] **Step 6: Commit**

```bash
git add -A src/db src/app
git commit -m "El documento y sus secciones salen a su propio módulo; sesiones.ts desaparece"
```

---

### Tarea 6: El dominio de la reunión

**Files:**
- Create: `src/dominio/reunion.ts`, `src/dominio/reunion.test.ts`
- Modify: `src/dominio/salas.ts` (sale `Reunion` y `reunionesDeSala`; `temperatura` aprende quincenal)

**Interfaces:**
- Produces:
  ```ts
  export type Cadencia = 'semanal' | 'quincenal' | 'mensual'   // sustituye al literal suelto de EstadoSala:115

  export interface CaraArchivo {
    id: string; titulo: string; nombreOriginal: string; url: string
  }
  /** Un acuerdo visto desde la reunión donde nació: lo justo para pintarlo. */
  export interface AcuerdoDeReunion {
    id: string; que: string; responsable: string
    estatus: EstatusAcuerdo            // de '@/db/acuerdos'
    fechaCompromiso: string | null     // ISO o null
  }
  export interface Reunion {
    id: string; fecha: string; titulo: string; tipo: TipoReunion
    estado: EstadoReunion; noDadaEn: string | null
    documentoId?: string
    /**
     * CORREGIDO EL 4-AGO. Hace falta aparte de `documentoId` porque en los
     * datos reales CASI TODA reunión tiene documento: `/agenda` agenda con
     * `crearSesionConEstructura`, así que la plantilla nace con la junta.
     * `Boolean(documentoId)` no distingue nada; el equivalente del viejo
     * estado `lista` es este: el documento está terminado.
     */
    documentoListo: boolean
    archivos: CaraArchivo[]
    minuta?: Minuta                    // el tipo que ya existe en dominio/salas.ts
    acuerdos: AcuerdoDeReunion[]
  }
  /** Lo que la sala le pasa: cuatro listas planas que aquí se cosen por reunión. */
  export interface DatosDeSalaParaReuniones {
    reuniones: Array<Omit<Reunion, 'archivos' | 'minuta' | 'acuerdos'>>
    archivos: Array<CaraArchivo & { reunionId: string }>
    minutas: Array<Minuta & { reunionId: string }>
    acuerdos: Array<AcuerdoDeReunion & { reunionOrigenId: string }>
  }

  export function reunionesDeSala(datos: DatosDeSalaParaReuniones): Reunion[]
  export function fueDada(r: Reunion, hoyCivil: string): boolean
  export function tienePresentacion(r: Reunion): boolean
  export function reunionesMinutables(rs: Reunion[], hoyCivil: string): Reunion[]
  export function reunionesPorConfirmar(rs: Reunion[], hoyCivil: string): Reunion[]
  ```

- [ ] **Step 1: Escribir los tests que fallan**

```ts
const hoy = '2026-08-04'
const base = { id: 'r1', fecha: '2026-08-03T19:00:00Z', titulo: 'Quincenal Comercial',
               tipo: 'quincenal' as const, estado: 'agendada' as const, noDadaEn: null,
               documentoListo: false, archivos: [], acuerdos: [] }

describe('fueDada', () => {
  it('una reunión con archivo y el día pasado se da por dada, aunque no tenga documento', () => {
    // EL CASO QUE HOY NO EXISTE: sin documento, `fueDada` nunca decía que sí,
    // y por eso un PDF no bastaba para que la junta contara como dada.
    expect(fueDada({ ...base, archivos: [{ id: 'a', titulo: 'Estatus', nombreOriginal: 'e.pdf', url: '/x' }] }, hoy)).toBe(true)
  })

  it('lo explícito manda: dada es dada aunque no haya nada cargado', () => {
    expect(fueDada({ ...base, estado: 'dada' }, hoy)).toBe(true)
  })

  it('"no se dio" gana a la deducción', () => {
    expect(fueDada({ ...base, archivos: [{ id: 'a', titulo: 'x', nombreOriginal: 'x.pdf', url: '/x' }], noDadaEn: '2026-08-03' }, hoy)).toBe(false)
  })

  it('hoy nunca es "ya pasado", pase lo que pase con el reloj', () => {
    expect(fueDada({ ...base, fecha: '2026-08-04T09:00:00Z', documentoListo: true }, hoy)).toBe(false)
  })

  it('una reunión vacía con el día pasado no se da por dada: no hay nada que lo respalde', () => {
    expect(fueDada(base, hoy)).toBe(false)
  })

  it('tener documento no es respaldo: la plantilla nace al agendar, no al reunirse', () => {
    // EL CASO QUE ROMPÍA. `Boolean(documentoId)` daba true para toda reunión
    // agendada desde `/agenda` —las 7 de la base real llevan su plantilla de
    // 8 secciones vacías—, así que cualquier junta pasada se daba por dada
    // sola. El umbral es el documento TERMINADO, igual que el viejo `lista`.
    expect(fueDada({ ...base, documentoId: 'd1', documentoListo: false }, hoy)).toBe(false)
    expect(fueDada({ ...base, documentoId: 'd1', documentoListo: true }, hoy)).toBe(true)
  })
})

describe('reunionesDeSala', () => {
  it('un archivo y una minuta de la misma reunión son UNA reunión, no dos', () => {
    const rs = reunionesDeSala({
      reuniones: [{ ...base, id: 'r1' }],
      archivos: [{ reunionId: 'r1', id: 'a1', titulo: 'Estatus RL', nombreOriginal: 'rl.pdf', url: '/x' }],
      minutas: [{ reunionId: 'r1', id: 'm1', titulo: 'Minuta', fecha: base.fecha, texto: 'algo', enviadaA: 0 }],
      acuerdos: [],
    })
    expect(rs).toHaveLength(1)
    expect(rs[0].archivos).toHaveLength(1)
    expect(rs[0].minuta).toBeDefined()
  })

  it('ordena de la más reciente a la más antigua', () => {
    const rs = reunionesDeSala({
      reuniones: [
        { ...base, id: 'may', fecha: '2026-05-21T16:00:00Z' },
        { ...base, id: 'ago', fecha: '2026-08-03T19:00:00Z' },
        { ...base, id: 'jun', fecha: '2026-06-23T16:00:00Z' },
      ],
      archivos: [], minutas: [], acuerdos: [],
    })
    expect(rs.map((r) => r.id)).toEqual(['ago', 'jun', 'may'])
  })

  it('los acuerdos van con la reunión donde nacieron, cerrados incluidos', () => {
    const rs = reunionesDeSala({
      reuniones: [{ ...base, id: 'r1' }],
      archivos: [], minutas: [],
      acuerdos: [
        { id: 'a1', reunionOrigenId: 'r1', que: 'Cruce de paid media', responsable: 'Fernando', estatus: 'cumplido', fechaCompromiso: '2026-07-31' },
        { id: 'a2', reunionOrigenId: 'r1', que: 'Negocios perdidos', responsable: 'Norma', estatus: 'abierto', fechaCompromiso: '2026-08-08' },
        { id: 'a3', reunionOrigenId: 'otra', que: 'De otra junta', responsable: 'Iris', estatus: 'abierto', fechaCompromiso: null },
      ],
    })
    expect(rs[0].acuerdos.map((a) => a.id)).toEqual(['a1', 'a2'])
  })
})

describe('reunionesPorConfirmar', () => {
  it('ofrece las que la deducción ya cuenta como dadas, para poder negarlas', () => {
    const conArchivo = { ...base, archivos: [{ id: 'a', titulo: 'x', nombreOriginal: 'x.pdf', url: '/x' }] }
    expect(reunionesPorConfirmar([conArchivo], hoy).map((r) => r.id)).toEqual(['r1'])
  })

  it('sigue ofreciendo la ya marcada "no se dio": si desapareciera no habría cómo arrepentirse', () => {
    const negada = { ...base, noDadaEn: '2026-08-03', archivos: [{ id: 'a', titulo: 'x', nombreOriginal: 'x.pdf', url: '/x' }] }
    expect(reunionesPorConfirmar([negada], hoy)).toHaveLength(1)
  })

  it('una reunión ya confirmada no se pregunta: es un hecho, no una duda', () => {
    expect(reunionesPorConfirmar([{ ...base, estado: 'dada' }], hoy)).toHaveLength(0)
  })
})

describe('temperatura', () => {
  it('una sala quincenal aguanta 15 días antes de enfriarse', () => {
    expect(temperatura({ ...sala, cadencia: 'quincenal', diasDesdeUltima: 15 })).toBe('reciente')
    expect(temperatura({ ...sala, cadencia: 'quincenal', diasDesdeUltima: 21 })).toBe('tibia')
    expect(temperatura({ ...sala, cadencia: 'quincenal', diasDesdeUltima: 22 })).toBe('fria')
  })
})
```

- [ ] **Step 2: Correr y verlos fallar**

Run: `npx vitest run src/dominio/reunion.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/dominio/reunion.ts`**

`fueDada` con la regla del spec §1:

```ts
export function fueDada(r: Reunion, hoyCivil: string): boolean {
  if (r.estado === 'dada') return true          // lo explícito manda
  if (r.noDadaEn) return false                  // negarlo también es explícito
  if (!tieneRespaldo(r)) return false           // nada que respalde que ocurrió
  return diaCivil(r.fecha) < hoyCivil           // por DÍA, nunca por instante
}

/**
 * Documento TERMINADO, un archivo, o una minuta: cualquiera prueba que la
 * junta ocurrió.
 *
 * `documentoListo`, no `documentoId`: casi toda reunión tiene documento desde
 * que se agenda (la plantilla nace con ella), así que su mera existencia no
 * prueba nada. Es el mismo umbral que hoy usa el estado `lista` en
 * `salas.ts:fueDada` — no uno inventado aparte.
 */
function tieneRespaldo(r: Reunion): boolean {
  return r.documentoListo || r.archivos.length > 0 || Boolean(r.minuta)
}

/**
 * ¿Hay algo que enseñarle a la UDN como "la presentación de esa junta"? Un
 * documento a medio maquetar todavía no lo es — por eso `documentoListo` y no
 * `documentoId`, igual que arriba. De esto depende que la Tarea 9 pinte el
 * botón "Subir presentación" o el enlace a lo que ya hay.
 */
export function tienePresentacion(r: Reunion): boolean {
  return r.documentoListo || r.archivos.length > 0
}
```

Y en `salas.ts`, `temperatura` con la tabla del spec §5:

```ts
const UMBRALES: Record<Cadencia, { reciente: number; tibia: number }> = {
  semanal: { reciente: 8, tibia: 10 },
  quincenal: { reciente: 15, tibia: 21 },
  mensual: { reciente: 20, tibia: 35 },
}
```

- [ ] **Step 4: Correr los tests**

Run: `npx vitest run src/dominio/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/dominio/
git commit -m "Una reunión se da por dada si algo la respalda: documento, archivo o minuta"
```

---

### Tarea 7: Las lecturas de la sala leen del modelo nuevo

**Files:**
- Modify: `src/db/consultas.ts:122-261` (la consulta que arma `EstadoSala`)
- Modify: `src/app/cliente/[slug]/page.tsx`, `src/app/page.tsx`, `src/app/reunion/[id]/page.tsx`, `src/app/deck/**`
- Test: `src/db/consultas.test.ts`

**Interfaces:**
- Consumes: `reuniones.ts`, `documentos.ts`, `dominio/reunion.ts`.
- Produces: `EstadoSala.reuniones: Reunion[]` sustituye a `presentaciones` + `minutas`.

- [ ] **Step 1: Escribir el test que falla**

```ts
it('la sala trae sus reuniones ya unidas, con archivos y minuta juntos', async () => {
  const s = await estadoDeSala('research-land')
  const r = s!.reuniones.find((x) => x.fecha.startsWith('2026-08-03'))
  expect(r).toBeDefined()
  expect(r!.titulo).toContain('Quincenal')
})
```

- [ ] **Step 2: Correr y verlo fallar** — `reuniones` no existe en `EstadoSala`.

- [ ] **Step 3: Reescribir la consulta**

En `src/db/consultas.ts`, la consulta paralela pasa de `[salaRow, sesionesRows, acuerdosRows, minutasRows, itemsRows]` a incluir los **archivos de presentación** por reunión, y se arma con `reunionesDeSala` del dominio. La derivación del título de la minuta desde su sesión (línea ~64) pasa a derivarse de su reunión.

- [ ] **Step 4: `/deck/<id>` y `/reunion/<id>` resuelven por reunión**

Las dos rutas reciben hoy el id de la sesión. Como la reunión heredó ese id, siguen sirviendo — pero por dentro tienen que pasar de "cargar la sesión" a "cargar la reunión y su documento". El test que lo fija:

```tsx
it('/deck/<id> abre el documento de esa reunión, y lo crea si aún no tiene', async () => {
  const { id } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
  const html = await render(await PaginaDeck({ params: { id } }))
  expect(html.getByRole('heading', { name: /mensual/i })).toBeInTheDocument()
  expect(await documentoDeReunion(id)).not.toBeNull()
})

it('un id que no es de ninguna reunión da 404, no una página vacía', async () => {
  await expect(PaginaDeck({ params: { id: 'no-existe' } })).rejects.toMatchObject({ digest: 'NEXT_NOT_FOUND' })
})
```

Correrlo, verlo fallar, implementar, verlo pasar.

- [ ] **Step 5: Correr todo**

Run: `npx vitest run && npx tsc --noEmit`
Expected: verde.

- [ ] **Step 6: Mirar la app en local**

```bash
npm run dev
node ~/.claude/tools/webshot/webshot.mjs http://localhost:3000/cliente/research-land --out /tmp/rl.png
```

Leer el PNG. **La sala tiene que verse igual que antes de la fase A.** Si cambió algo visualmente, es un defecto de esta tarea, no una mejora adelantada.

- [ ] **Step 7: Commit**

```bash
git add -A src
git commit -m "La sala lee reuniones, no sesiones sueltas emparejadas al vuelo"
```

---

### Tarea 8: Retirar lo viejo

**Files:**
- Modify: `src/db/esquema.ts`
- Create: `drizzle/0023_*.sql`, `drizzle/0024_*.sql`

- [ ] **Step 1: Verificación leída final en la rama de ensayo**

```bash
ENV_FILE=.env.ensayo node scripts/verificar-migracion.mjs despues
```

Pegar la salida. Debe cuadrar con la tabla del spec §2 paso 5. **Si no cuadra, parar aquí** — el siguiente paso es el único destructivo.

- [ ] **Step 2: Volver `notNull` las columnas nuevas y borrar las viejas**

`0023`: `ALTER COLUMN ... SET NOT NULL` en las cinco. `0024`: `DROP COLUMN sesion_id` (y `sesion_origen_id`) y `DROP TABLE sesiones`.

- [ ] **Step 3: Aplicar a la rama de ensayo, verificar, y solo entonces a la real**

```bash
# PRIMERO el ensayo. `ENV_FILE` NO lo lee drizzle.config.ts: sin exportar
# DATABASE_URL en la línea, este DROP TABLE caería sobre PRODUCCIÓN.
ENSAYO="$(node -e "process.loadEnvFile('.env.ensayo');process.stdout.write(process.env.DATABASE_URL)")"
DATABASE_URL="$ENSAYO" npm run db:migrate
ENV_FILE=.env.ensayo node scripts/verificar-migracion.mjs despues

# Verde y solo verde. Y antes de tocar la real, confirmar a qué host se apunta:
node -e "process.loadEnvFile('.env.local');console.log('VOY A MIGRAR:', process.env.DATABASE_URL.split('@')[1].split('/')[0])"
node scripts/verificar-migracion.mjs antes    # foto de la real ANTES
npm run db:migrate                            # ← el único paso destructivo
node scripts/verificar-migracion.mjs despues  # foto de la real DESPUÉS
```

Las dos fotos de la base real van pegadas en el reporte de la tarea.

- [ ] **Step 4: Borrar la rama de ensayo**

```bash
npx neonctl branches delete ensayo-ronda10 --project-id "$NEON_PROJECT_ID"
```

- [ ] **Step 5: Suite completa + build + commit**

```bash
npx vitest run && npm run lint && npx tsc --noEmit && npm run build
git add -A && git commit -m "Se retira sesiones: la reunión es la entidad y no queda rastro del modelo viejo"
```

- [ ] **Step 6: Desplegar y mirar**

`git push`, esperar el despliegue, y sacar prints de `/`, `/cliente/research-land` y `/agenda` en producción. **Todo debe verse igual que antes de empezar.**

---

# FASE B — Reuniones en la sala

Aquí es donde Franco puede por fin cargar su RL de ayer.

---

### Tarea 9: Las caras de una reunión, con los huecos accionables

**Files:**
- Create: `src/componentes/reuniones/CarasDeReunion.tsx`, `.test.tsx`
- Modify: `src/componentes/ReunionesSala.tsx:186-215` (sustituye a `Caras`)

**Interfaces:**
- Produces: `<CarasDeReunion reunion={r} equipo={boolean} onLeerMinuta={() => void} compacta?={boolean} />`

- [ ] **Step 1: Escribir el test que falla**

```tsx
it('sin presentación, el equipo ve un botón para subirla — no un lamento', () => {
  render(<CarasDeReunion reunion={sinNada} equipo onLeerMinuta={() => {}} />)
  expect(screen.getByRole('button', { name: /subir presentación/i })).toBeInTheDocument()
})

it('sin presentación, el director ve que falta pero no puede llenarla', () => {
  render(<CarasDeReunion reunion={sinNada} equipo={false} onLeerMinuta={() => {}} />)
  expect(screen.queryByRole('button', { name: /subir presentación/i })).toBeNull()
  expect(screen.getByText(/sin presentación/i)).toBeInTheDocument()
})

it('un archivo se anuncia con SU nombre, para saber qué se descarga', () => {
  render(<CarasDeReunion reunion={conPdf} equipo onLeerMinuta={() => {}} />)
  expect(screen.getByRole('link', { name: /Estatus RL agosto\.pdf/ })).toBeInTheDocument()
})

it('documento y archivo conviven: no son excluyentes', () => {
  render(<CarasDeReunion reunion={conAmbos} equipo onLeerMinuta={() => {}} />)
  expect(screen.getByRole('link', { name: /documento/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /\.pdf/ })).toBeInTheDocument()
})

it('sin minuta, el equipo la puede levantar desde la propia fila', () => {
  render(<CarasDeReunion reunion={conPdf} equipo onLeerMinuta={() => {}} />)
  expect(screen.getByRole('button', { name: /levantar minuta/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Correr y verlos fallar.** Run: `npx vitest run src/componentes/reuniones/`

- [ ] **Step 3: Implementar el componente.** Cada hueco es la acción que lo llena, y cada acción exige editor **también en el servidor** (la Server Action que recibe el archivo y la que abre el flujo de minuta).

- [ ] **Step 4: Correr los tests.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/componentes/reuniones/ src/componentes/ReunionesSala.tsx
git commit -m "Lo que le falta a una reunión es el botón que lo llena, no un texto muerto"
```

---

### Tarea 10: Los acuerdos de una reunión, desplegables

**Files:**
- Create: `src/componentes/reuniones/AcuerdosDeReunion.tsx`, `.test.tsx`
- Modify: `src/db/consultas.ts` (los acuerdos viajan ya agrupados por reunión)

- [ ] **Step 1: Escribir el test que falla**

```tsx
it('muestra los que nacieron ahí, cerrados incluidos, con su estado de hoy', () => {
  render(<AcuerdosDeReunion acuerdos={[abierto, cumplido]} />)
  expect(screen.getByText(/cumplido/i)).toBeInTheDocument()
  expect(screen.getByText(/abierto/i)).toBeInTheDocument()
})

it('una reunión sin acuerdos no muestra el desplegable: "0 acuerdos" es ruido', () => {
  const { container } = render(<AcuerdosDeReunion acuerdos={[]} />)
  expect(container).toBeEmptyDOMElement()
})

it('el resumen dice cuántos son sin abrirlo', () => {
  render(<AcuerdosDeReunion acuerdos={[abierto, cumplido, vencido]} />)
  expect(screen.getByText(/3 acuerdos/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Correr y verlos fallar.**

- [ ] **Step 3: Implementar** con `<details>`/`<summary>` nativos: el navegador ya da el teclado y el anuncio a lectores de pantalla. Cada acuerdo con responsable, fecha comprometida y estatus.

- [ ] **Step 4: Correr los tests.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/componentes/reuniones/AcuerdosDeReunion.tsx src/componentes/reuniones/AcuerdosDeReunion.test.tsx src/db/consultas.ts
git commit -m "Los acuerdos que salieron de una junta se despliegan en su propia fila"
```

---

### Tarea 11: "Antes de esta herramienta" desaparece

**Files:**
- Modify: `src/app/cliente/[slug]/page.tsx:733-750`
- Modify: `src/componentes/ArchivosSala.tsx:49` (el texto del vacío)

- [ ] **Step 1: Escribir el test que falla**

```tsx
it('la sala ya no separa las juntas por la herramienta con que se hicieron', async () => {
  const html = await render(await PaginaSala({ params: { slug: 'research-land' } }))
  expect(html.queryByText(/antes de esta herramienta/i)).toBeNull()
})

it('los archivos de interés siguen en su sitio: eso sí es otra cosa', async () => {
  const html = await render(await PaginaSala({ params: { slug: 'research-land' } }))
  expect(html.getByText(/archivos de interés/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Correr y verlo fallar.**

- [ ] **Step 3: Borrar el bloque** de las líneas 733-750 y su subtítulo. La subida de archivos ya vive dentro de cada reunión (Tarea 9). `ArchivosSala` sigue existiendo para la categoría `interes`.

- [ ] **Step 4: Correr todo.** Run: `npx vitest run && npx tsc --noEmit`

- [ ] **Step 5: Desplegar y mirar la sala en producción**

```bash
git push && node ~/.claude/tools/webshot/webshot.mjs https://mktcorp-estatus.vercel.app/cliente/research-land --out /tmp/rl-b.png
```

Leer el PNG: última reunión arriba con sus caras, anteriores abajo, sin la subsección vieja, sin huecos raros donde estaba.

- [ ] **Step 6: Commit**

```bash
git add -A src && git commit -m "Para la UDN nunca hubo dos clases de reunión: hubo juntas"
```

---

### Tarea 12: Cargar la reunión real de Research Land

**Files:** ninguno — es uso de la app, no código.

Esta tarea la ejecuta **Franco**, y existe en el plan porque es el criterio de aceptación de la fase B.

- [ ] **Step 1:** Entrar a `/cliente/research-land`, reunión del 3 de agosto.
- [ ] **Step 2:** Subir el PDF de la Quincenal Comercial con `+ Subir presentación`.
- [ ] **Step 3:** `+ Levantar minuta` y pegar la transcripción.
- [ ] **Step 4:** Comprobar que la reunión queda con sus dos caras y sus acuerdos desplegables.

Si algún paso se atasca, el defecto es de la fase B y se corrige antes de seguir a la C.

---

# FASE C — la pestaña global y el Home

---

### Tarea 13: `/reuniones`

**Files:**
- Create: `src/app/reuniones/page.tsx`, `acciones.ts`, `reuniones.module.css`
- Modify: `src/app/agenda/page.tsx` → redirección permanente
- Modify: `src/app/page.tsx:238` (el enlace de la barra)

- [ ] **Step 1: Escribir el test que falla**

```tsx
it('enseña el mes, lo próximo y lo ya dado con lo que le falta a cada una', async () => {
  const html = await render(await PaginaReuniones())
  expect(html.getByText(/próximas/i)).toBeInTheDocument()
  expect(html.getByText(/ya dadas/i)).toBeInTheDocument()
  expect(html.getByText(/falta la minuta/i)).toBeInTheDocument()
})

it('/agenda redirige a /reuniones sin dejar marcadores muertos', async () => {
  await expect(PaginaAgenda()).rejects.toMatchObject({ digest: expect.stringContaining('/reuniones') })
})
```

- [ ] **Step 2: Correr y verlos fallar.**

- [ ] **Step 3: Mudar `/agenda` a `/reuniones`** (calendario + formulario de agendar, tal cual) y añadir el bloque "Ya dadas este mes" con lo que le falta a cada reunión. `/agenda/page.tsx` se reduce a `redirect('/reuniones', RedirectType.replace)`.

**`/agenda/[token]` no se toca.** Comprobarlo explícitamente: `curl -sI` a un enlace de agenda vivo debe seguir devolviendo 200.

- [ ] **Step 4: Correr los tests.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src/app && git commit -m "El ciclo entero de una reunión vive en una sola pestaña"
```

---

### Tarea 14: Agendar desde el Home

**Files:**
- Create: `src/componentes/hogar/AgendarRapido.tsx`, `.test.tsx`
- Modify: `src/app/page.tsx:347` (junto a `ModuloCalendario`)

- [ ] **Step 1: Escribir el test que falla**

```tsx
it('pide lo mínimo para agendar: sala, día, hora y tipo', () => {
  render(<AgendarRapido salas={salas} agendar={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: /agendar/i }))
  for (const campo of [/sala/i, /día/i, /hora/i, /tipo/i]) {
    expect(screen.getByLabelText(campo)).toBeInTheDocument()
  }
})

it('una sala en pausa no se ofrece', () => {
  render(<AgendarRapido salas={[...salas, zeusPausada]} agendar={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: /agendar/i }))
  expect(screen.queryByRole('option', { name: /zeus/i })).toBeNull()
})
```

- [ ] **Step 2: Correr y verlos fallar.**

- [ ] **Step 3: Implementar.** El calendario del Home **no se toca**: el botón va a su lado. La Server Action reusa `crearReunion` y exige editor.

- [ ] **Step 4: Correr los tests.** Expected: PASS.

- [ ] **Step 5: Desplegar y mirar el Home.** Cuidado con el hueco de la rejilla: el calendario abarca dos filas y una fila `auto` se lleva altura repartida — se arregla con `auto 1fr`, ya pasó en la ronda 2.

- [ ] **Step 6: Commit**

```bash
git add -A src && git commit -m "Agendar una reunión sin salir del Home"
```

---

# FASE D — ajustes, quincenal y limpieza

---

### Tarea 15: Ajustes de la sala

**Files:**
- Create: `src/app/cliente/[slug]/ajustes/page.tsx`
- Modify: `src/app/cliente/[slug]/page.tsx` (el enlace en la cabecera)

- [ ] **Step 1: Escribir el test que falla**

```tsx
it('solo un admin entra: esconder el enlace no protege la página', async () => {
  conSesion({ rol: 'editor' })
  await expect(PaginaAjustes({ params: { slug: 'research-land' } })).rejects.toThrow(/admin/i)
})

it('guardar NO re-deriva la paleta: eso destruía el brandbook', async () => {
  conSesion({ rol: 'admin' })
  await guardarAjustesAction('research-land', { nombre: 'Research Land', primario: '#123456' })
  expect(recalcularPaleta).not.toHaveBeenCalled()
})

it('el engrane solo le aparece al admin', async () => {
  conSesion({ rol: 'editor' })
  const html = await render(await PaginaSala({ params: { slug: 'research-land' } }))
  expect(html.queryByRole('link', { name: /ajustes/i })).toBeNull()
})
```

- [ ] **Step 2: Correr y verlos fallar.**

- [ ] **Step 3: Implementar** reutilizando `FormularioSala` y las acciones de `src/app/salas/acciones.ts`, agrupado como en el spec §5. Primera línea de la página: `await exigirAdmin()`.

- [ ] **Step 4: Correr los tests.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src/app && git commit -m "Cada sala se ajusta desde dentro de sí misma"
```

---

### Tarea 16: Quincenal en la interfaz

**Files:**
- Modify: `src/componentes/salas/FormularioSala.tsx`, `src/componentes/agenda/FormularioSesion.tsx`, `src/app/reuniones/page.tsx`

- [ ] **Step 1: Escribir el test que falla**

```tsx
it('la cadencia de una sala se puede poner quincenal', () => {
  render(<FormularioSala sala={rl} guardar={vi.fn()} />)
  expect(screen.getByRole('option', { name: /quincenal/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Correr y verlo fallar.**

- [ ] **Step 3: Añadir la opción** en los dos formularios. El dominio ya la entiende desde la Tarea 6.

- [ ] **Step 4: Correr los tests.** Expected: PASS.

- [ ] **Step 5: Poner Research Land en quincenal** desde la app, y su reunión del 3-ago con el tipo correcto. Comprobar leyendo la base:

```bash
node --input-type=module -e "
process.loadEnvFile('.env.local')
const { neon } = await import('@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)
console.table(await sql\`select slug, cadencia from salas where slug='research-land'\`)
"
```

- [ ] **Step 6: Commit**

```bash
git add -A src && git commit -m "Quincenal existe, que es lo que de verdad es la comercial de Research Land"
```

---

### Tarea 17: `grupo-upax` se desactiva

**Files:** ninguno — es un cambio de dato, desde la app.

- [ ] **Step 1:** Entrar a `/cliente/grupo-upax/ajustes` y pausarla.
- [ ] **Step 2:** Comprobar leyendo la base que `activa = false`.
- [ ] **Step 3:** Comprobar en el Home que baja al bloque "En pausa" y deja de contar como desatendida.
- [ ] **Step 4:** Sacar print del Home en producción y leerlo.

---

## Cierre de la ronda

- [ ] Suite completa verde: `npx vitest run && npm run lint && npx tsc --noEmit && npm run build`
- [ ] Prints leídos de: Home, `/reuniones`, `/cliente/research-land`, `/cliente/research-land/ajustes`
- [ ] **Datos de prueba borrados de la base**, acuerdos incluidos: sobreviven al borrado de su reunión y hay que borrarlos aparte
- [ ] Rama de ensayo de Neon borrada
- [ ] Memoria del proyecto actualizada con lo que no está en el repo
