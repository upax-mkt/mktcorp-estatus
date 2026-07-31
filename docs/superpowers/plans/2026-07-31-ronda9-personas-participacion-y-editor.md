# Ronda 9 — Personas, participación y lo que faltaba del editor · Plan

> **Para trabajadores agénticos:** SUB-SKILL OBLIGATORIA: usa
> `superpowers:subagent-driven-development` o `superpowers:executing-plans`.
> Los pasos usan casillas (`- [ ]`).

**Objetivo:** que cada persona entre con su cuenta de Slack y tenga un rol, que
quede registrado quién preparó y quién presentó cada reunión, que la
transcripción deje de perderse, que los acuerdos abiertos se puedan arrastrar a
la sesión nueva, y que las imágenes se redimensionen y se pueda subir vídeo.

**Arquitectura:** el correo que ya devuelve el SSO de Slack pasa de ser
informativo a ser la clave del permiso. Las 47 llamadas de autorización que hoy
solo distinguen «equipo» de «sala» se reparten en tres exigencias.

**Stack:** Next 16 (App Router, Server Actions), TypeScript, Drizzle + Postgres
(Neon), vitest, Vercel Blob. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-07-31-ronda9-personas-participacion-y-editor-design.md`
**Diagnóstico del bug:** `docs/superpowers/specs/2026-07-31-diagnostico-grabacion.md`

## Restricciones globales

- **Todo en español**: código, comentarios y textos de pantalla. Los comentarios
  explican POR QUÉ.
- **La base local es la de PRODUCCIÓN**, con las diez salas reales, sus sesiones,
  acuerdos y minutas. Consultar sí; **no crear, editar ni borrar filas** salvo
  donde una tarea lo diga expresamente. Si `npm run db:migrate` lo bloquea el
  clasificador, PARAR y pedirlo — no buscar rodeos.
- **Toda migración**: leer el SQL antes de aplicar, aplicarla, y **comprobar
  leyendo la base**. Un reporte que diga «verificado» sin la lectura no vale: ya
  pasó en la ronda 8 que una migración se dio por aplicada sin estarlo.
- `npm test` es SEGURO (vitest no carga `.env.local`). Hoy **1018 tests** en
  verde; también `npx tsc --noEmit`, `npm run lint` y `npm run build` limpios.
- **Esconder un botón no protege una acción.** Toda Server Action comprueba
  permiso en el servidor como primera línea.

---

## Estructura de archivos

**Nuevos:**

| Archivo | Responsabilidad |
|---|---|
| `src/db/personas.ts` → **renombrar el actual** | ⚠️ Ya existe `src/db/personas.ts` para el directorio de MONDAY. El nuevo va en `src/db/directorio.ts` para no confundirlos |
| `src/db/directorio.ts` | Las personas de la app: buscar por correo, alta, rol, activar |
| `src/auth/roles.ts` | `exigirAdmin`, `exigirEditor`, `exigirLectura` y sus predicados |
| `src/app/personas/page.tsx` + `acciones.ts` | La pantalla de personas y roles |
| `src/db/participacion.ts` | Registrar y leer quién editó y quién presentó |
| `src/componentes/sesion/ParticipantesSesion.tsx` | La línea de «prepararon / presentó» |
| `src/componentes/editor/AcuerdosArrastrables.tsx` | La columna de acuerdos abiertos que se arrastran |
| `src/componentes/editor/CampoVideo.tsx` | Subir y colocar un vídeo |

**Modificados clave:** `src/auth/firma.ts` (el rol entra en la sesión),
`src/auth/politica.ts`, `src/auth/sesion.ts`, `src/app/api/auth/slack/retorno`,
`src/componentes/sesion/GrabarReunion.tsx`, `src/componentes/sesion/ModoPresentar.tsx`,
`src/componentes/editor/CampoImagen.tsx`, `src/db/esquema.ts`, y **los 47 sitios
que hoy llaman a `exigirEquipo`**.

---

## Tarea 1: El directorio de personas

**Archivos:**
- Modificar: `src/db/esquema.ts`
- Crear: `src/db/directorio.ts`, `src/db/directorio.test.ts`
- Crear: la migración

**Interfaces:**
- Produce: `type RolPersona = 'admin' | 'editor' | 'viewer'`; `interface Persona { correo: string; nombre: string; rol: RolPersona; activa: boolean }`; `buscarPersona(correo: string): Promise<Persona | null>`; `listarPersonas(): Promise<Persona[]>`; `hayAlgunaPersona(): Promise<boolean>`; `altaPersona(datos): Promise<void>`; `cambiarRol(correo, rol): Promise<void>`; `activarPersona(correo, activa): Promise<void>`; `registrarAcceso(correo): Promise<void>`.

⚠️ **`src/db/personas.ts` YA EXISTE y es otra cosa**: el directorio de la cuenta
de Monday, para asignar responsables de acuerdos. No lo toques, no lo mezcles.
Lo tuyo va en `src/db/directorio.ts`.

- [ ] **Paso 1: Escribir el test que falla**

```ts
// src/db/directorio.test.ts
import { describe, it, expect } from 'vitest'
import { normalizarCorreo, esRolValido } from './directorio'

describe('normalizarCorreo', () => {
  it('a minúsculas y sin espacios: el correo es la clave primaria', () => {
    expect(normalizarCorreo('  Franco.Cruzat@UPAX.com.mx ')).toBe('franco.cruzat@upax.com.mx')
  })

  it('una cadena sin arroba no es un correo', () => {
    expect(normalizarCorreo('franco')).toBeNull()
    expect(normalizarCorreo('')).toBeNull()
    expect(normalizarCorreo('   ')).toBeNull()
  })
})

describe('esRolValido', () => {
  it('acepta los tres y nada más', () => {
    expect(esRolValido('admin')).toBe(true)
    expect(esRolValido('editor')).toBe(true)
    expect(esRolValido('viewer')).toBe(true)
    expect(esRolValido('Admin')).toBe(false)
    expect(esRolValido('superadmin')).toBe(false)
    expect(esRolValido('')).toBe(false)
  })
})
```

- [ ] **Paso 2: Correr y ver que falla**

Ejecutar: `npx vitest run src/db/directorio.test.ts`
Esperado: FALLA — no existe `./directorio`.

- [ ] **Paso 3: La tabla**

En `src/db/esquema.ts`:

```ts
// ---- Personas de la app ----
// QUIÉN puede entrar y con qué permiso. La clave es el CORREO porque es lo
// único estable que devuelve Slack: los nombres cambian y sus identificadores
// son opacos.
//
// No confundir con `personas_monday`, que es el directorio de la CUENTA DE
// MONDAY y sirve para asignar responsables de acuerdos. Una persona puede estar
// en las dos, en una o en ninguna.
export const personas = pgTable('personas', {
  correo: text('correo').primaryKey(),
  nombre: text('nombre').notNull(),
  rol: text('rol').notNull(),
  activa: boolean('activa').notNull().default(true),
  creadaEn: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
  ultimoAcceso: timestamp('ultimo_acceso', { withTimezone: true }),
})
```

- [ ] **Paso 4: Implementar `src/db/directorio.ts`**

Con `normalizarCorreo` (recorta, minúsculas, devuelve `null` si no tiene arroba
con algo a cada lado), `esRolValido`, y las funciones de la interfaz usando
`db()`/`hayDB()` como hace `src/db/acuerdos.ts`. `altaPersona` normaliza el
correo y rechaza uno inválido.

- [ ] **Paso 5: La migración, con Franco dentro**

Generar con `npm run db:generate`, y **añadir a mano al SQL generado** la
inserción del admin inicial:

```sql
INSERT INTO personas (correo, nombre, rol)
VALUES (lower(trim(coalesce(nullif(current_setting('app.admin_inicial', true), ''), 'franco.cruzat@upax.com.mx'))), 'Franco Cruzat', 'admin')
ON CONFLICT (correo) DO NOTHING;
```

Si esa función de configuración no está disponible en Neon, usa el correo
literal `franco.cruzat@upax.com.mx` y **dilo en el reporte** — lo que no puede
pasar es que la tabla nazca vacía.

Aplicar con `npm run db:migrate` y **comprobar leyendo**: que la tabla existe y
que tiene exactamente una fila, la de Franco, con rol `admin`. Pegar esa lectura
en el reporte.

- [ ] **Paso 6: Correr todo**

`npm test && npx tsc --noEmit && npm run lint`

- [ ] **Paso 7: Commit**

```bash
git add src/db/esquema.ts src/db/directorio.ts src/db/directorio.test.ts drizzle/
git commit -m "El directorio de personas de la app, con Franco como admin inicial"
```

---

## Tarea 2: El rol entra en la sesión y en las tres exigencias

**Archivos:**
- Modificar: `src/auth/firma.ts`, `src/auth/sesion.ts`, `src/app/api/auth/slack/retorno/route.ts`
- Crear: `src/auth/roles.ts`, `src/auth/roles.test.ts`

**Interfaces:**
- Consume: `buscarPersona`, `hayAlgunaPersona`, `registrarAcceso` de la tarea 1.
- Produce: `Sesion` gana `rolApp?: RolPersona`; `exigirAdmin(): Promise<Sesion>`, `exigirEditor(): Promise<Sesion>`, `exigirLectura(): Promise<Sesion>`, y los predicados `puedeAdministrar(s)`, `puedeEditarContenido(s)`.

**Este es el cambio de más riesgo de la ronda: puede dejar fuera a todo el
equipo, incluido Franco.**

- [ ] **Paso 1: Escribir el test que falla**

```ts
// src/auth/roles.test.ts
import { describe, it, expect } from 'vitest'
import { puedeAdministrar, puedeEditarContenido, puedeLeer } from './roles'

const equipo = (rolApp?: string) => ({ rol: 'equipo' as const, rolApp, exp: 9e12 })
const sala = { rol: 'sala' as const, sala: 'neracode', exp: 9e12 }

describe('los tres permisos', () => {
  it('admin puede todo', () => {
    const s = equipo('admin')
    expect(puedeAdministrar(s)).toBe(true)
    expect(puedeEditarContenido(s)).toBe(true)
    expect(puedeLeer(s)).toBe(true)
  })

  it('editor edita pero no administra', () => {
    const s = equipo('editor')
    expect(puedeAdministrar(s)).toBe(false)
    expect(puedeEditarContenido(s)).toBe(true)
  })

  it('viewer solo lee', () => {
    const s = equipo('viewer')
    expect(puedeAdministrar(s)).toBe(false)
    expect(puedeEditarContenido(s)).toBe(false)
    expect(puedeLeer(s)).toBe(true)
  })

  it('una sesión de equipo SIN rol no puede nada: falla cerrado', () => {
    const s = equipo(undefined)
    expect(puedeAdministrar(s)).toBe(false)
    expect(puedeEditarContenido(s)).toBe(false)
  })

  it('un rol inventado no cuela', () => {
    expect(puedeAdministrar(equipo('superadmin'))).toBe(false)
    expect(puedeEditarContenido(equipo('Editor'))).toBe(false)
  })

  it('el director de UDN no gana nada de esto', () => {
    expect(puedeAdministrar(sala)).toBe(false)
    expect(puedeEditarContenido(sala)).toBe(false)
  })

  it('sin sesión, nada', () => {
    expect(puedeAdministrar(null)).toBe(false)
    expect(puedeEditarContenido(null)).toBe(false)
    expect(puedeLeer(null)).toBe(false)
  })
})
```

- [ ] **Paso 2: Correr y ver que falla**

Ejecutar: `npx vitest run src/auth/roles.test.ts`

- [ ] **Paso 3: El rol en la sesión firmada**

En `src/auth/firma.ts`, `Sesion` gana `rolApp?: 'admin' | 'editor' | 'viewer'`.
Va **dentro de la carga firmada**, así que nadie puede cambiárselo desde el
navegador. Comentario que lo diga.

- [ ] **Paso 4: `src/auth/roles.ts`**

Los tres predicados puros (arriba) y las tres funciones que lanzan, siguiendo el
patrón de `exigirEquipo` en `src/auth/sesion.ts`.

```ts
/**
 * QUIÉN PUEDE QUÉ.
 *
 * Un rol desconocido o ausente no puede nada: falla cerrado. Es lo que hace que
 * una sesión emitida antes de esta ronda —sin `rolApp`— no herede permisos por
 * accidente; su dueño vuelve a entrar por Slack y recibe el suyo.
 */
```

- [ ] **Paso 5: El retorno de Slack decide**

En la ruta de retorno, después de validar el correo y el dominio:

```ts
// EL PORTILLO DE EMERGENCIA, y no es un descuido.
//
// Si el directorio está vacío nadie puede entrar —ni quien tenía que darse de
// alta a sí mismo—, así que mientras no haya NI UNA persona, la clave de equipo
// sigue sirviendo y entra como admin. En cuanto hay una, deja de funcionar.
// No lo quites pensando que sobra: es el extintor.
```

La comprobación de dominio **ya existe** (`esCorreoPermitido(identidad.email,
dominioExigido())`, línea 44 de esa ruta) y **se conserva**: primero el dominio,
después el directorio. Tu código va justo después de esa línea.

Camino normal: buscar la persona por correo. Si existe y está activa, se emite
la sesión con su rol y se llama a `registrarAcceso`. Si existe desactivada, se
rechaza diciéndolo. Si no existe, se rechaza con «pide acceso a Marketing Corp».
Cada caso con su texto propio en la pantalla de entrar — hoy todos los fallos
van a `/entrar?error=slack`, así que hacen falta parámetros distintos para poder
decir cosas distintas.

- [ ] **Paso 6: Repartir las 47 llamadas**

Hay **47 usos** de `exigirEquipo`/`exigirEdicionDeAcuerdos` fuera de tests.
Revísalos **uno por uno** y asigna la exigencia que toca:

| Qué hace la acción | Exigencia |
|---|---|
| Crear/editar salas y marcas, personas, enlace de agenda | `exigirAdmin()` |
| Preparar, maquetar, minutar, publicar, mover acuerdos, subir a Monday | `exigirEditor()` |
| Páginas que solo muestran | `exigirLectura()` |

`exigirEdicionDeAcuerdos(slug)` **se queda** para el director de UDN, y además
acepta a admin y editor.

**Ninguna se queda con la comprobación vieja «por ahora».** Enumera en el
reporte las 47 con la exigencia que le pusiste a cada una: es lo que la revisión
va a comprobar.

- [ ] **Paso 7: La política de rutas**

`/personas` y `/salas` pasan a ser de admin en `src/auth/politica.ts`. Con tests
que comprueben que un editor y un viewer NO entran, y que el resto de la app no
cambió.

- [ ] **Paso 8: Correr todo**

`npm test && npx tsc --noEmit && npm run lint && npm run build`

- [ ] **Paso 9: Commit**

```bash
git add src/auth src/app/api/auth src/app
git commit -m "Cada persona entra con su cuenta y su rol; las 47 comprobaciones se reparten"
```

---

## Tarea 3: La pantalla de personas

**Archivos:**
- Crear: `src/app/personas/page.tsx`, `src/app/personas/acciones.ts`, `src/app/personas/personas.module.css`, `src/componentes/personas/FilaPersona.tsx` y su test
- Modificar: `src/app/page.tsx` (enlace en la barra, solo para admin)

**Interfaces:**
- Consume: `listarPersonas`, `altaPersona`, `cambiarRol`, `activarPersona` (tarea 1); `exigirAdmin` (tarea 2).

- [ ] **Paso 1: Escribir el test que falla**

```tsx
// src/componentes/personas/FilaPersona.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FilaPersona } from './FilaPersona'

const PERSONA = { correo: 'iris.mugica@jansan.mx', nombre: 'Iris Múgica', rol: 'editor' as const, activa: true }

describe('FilaPersona', () => {
  it('enseña el correo, que es la clave: dos personas pueden llamarse igual', () => {
    render(<FilaPersona persona={PERSONA} esYo={false} cambiarRol={vi.fn()} activar={vi.fn()} />)
    expect(screen.getByText('iris.mugica@jansan.mx')).toBeInTheDocument()
  })

  it('a ti mismo no te deja quitarte el admin ni desactivarte', () => {
    render(<FilaPersona persona={{ ...PERSONA, rol: 'admin' }} esYo={true} cambiarRol={vi.fn()} activar={vi.fn()} />)
    expect(screen.getByLabelText(/rol/i)).toBeDisabled()
    expect(screen.queryByRole('button', { name: /desactivar/i })).not.toBeInTheDocument()
  })

  it('una persona desactivada se ve apagada y se puede reactivar', () => {
    render(<FilaPersona persona={{ ...PERSONA, activa: false }} esYo={false} cambiarRol={vi.fn()} activar={vi.fn()} />)
    expect(screen.getByRole('button', { name: /activar/i })).toBeInTheDocument()
  })
})
```

- [ ] **Paso 2: Correr y ver que falla**

- [ ] **Paso 3: Implementar**

Pantalla `/personas`, con `await exigirAdmin()` como primera línea. Lista con
correo, nombre, rol editable y activar/desactivar. Alta con correo y rol.

**Dos guardas que van también en el SERVIDOR**, no solo en la pantalla:

- **Nadie se quita a sí mismo el admin ni se desactiva.** Quedarse fuera de la
  única pantalla que te devuelve el acceso es una trampa sin salida.
- **Tiene que quedar al menos un admin activo.** La acción que dejaría cero
  admins se rechaza diciendo por qué.

- [ ] **Paso 4: Correr y ver que pasa**

- [ ] **Paso 5: Enlace en la barra**

En `src/app/page.tsx`, «Personas» junto a las demás, **solo si es admin**.

- [ ] **Paso 6: Correr todo y commit**

```bash
git add src/app/personas src/componentes/personas src/app/page.tsx
git commit -m "La pantalla de personas: quién entra y con qué permiso"
```

---

## Tarea 4: Quién preparó y quién presentó

**Archivos:**
- Modificar: `src/db/esquema.ts`
- Crear: `src/db/participacion.ts` + test, `src/componentes/sesion/ParticipantesSesion.tsx` + test
- Modificar: las acciones que escriben una sesión, y `src/componentes/sesion/ModoPresentar.tsx`
- Crear: la migración

**Interfaces:**
- Produce: `registrarEdicion(sesionId, correo): Promise<void>`, `registrarPresentacion(sesionId, correo): Promise<void>`, `participantesDe(sesionId): Promise<Participante[]>` con `interface Participante { correo: string; nombre: string; ediciones: number; presento: boolean; ultimaEdicion: Date }`.

- [ ] **Paso 1: Escribir el test que falla**

```ts
// src/db/participacion.test.ts — la parte pura
import { describe, it, expect } from 'vitest'
import { resumirParticipacion } from './participacion'

const P = (nombre: string, ediciones: number, presento = false) =>
  ({ correo: `${nombre}@x.mx`, nombre, ediciones, presento, ultimaEdicion: new Date('2026-07-20') })

describe('resumirParticipacion', () => {
  it('separa a quien preparó de quien presentó', () => {
    const r = resumirParticipacion([P('Iris', 5, true), P('César', 3), P('Fernando', 1)])
    expect(r.prepararon).toEqual(['Iris', 'César', 'Fernando'])
    expect(r.presentaron).toEqual(['Iris'])
  })

  it('ordena por cuánto editó cada quien: el que más tocó, primero', () => {
    const r = resumirParticipacion([P('César', 2), P('Iris', 9)])
    expect(r.prepararon).toEqual(['Iris', 'César'])
  })

  it('quien solo presentó sin editar no aparece como que preparó', () => {
    const r = resumirParticipacion([{ ...P('Pablo', 0), presento: true }])
    expect(r.prepararon).toEqual([])
    expect(r.presentaron).toEqual(['Pablo'])
  })

  it('sin nadie, dos listas vacías y no revienta', () => {
    const r = resumirParticipacion([])
    expect(r.prepararon).toEqual([])
    expect(r.presentaron).toEqual([])
  })
})
```

- [ ] **Paso 2: Correr y ver que falla**

- [ ] **Paso 3: La tabla y la escritura atómica**

```ts
export const participacion = pgTable('participacion', {
  sesionId: text('sesion_id').notNull().references(() => sesiones.id),
  correo: text('correo').notNull(),
  primeraEdicion: timestamp('primera_edicion', { withTimezone: true }).notNull().defaultNow(),
  ultimaEdicion: timestamp('ultima_edicion', { withTimezone: true }).notNull().defaultNow(),
  ediciones: integer('ediciones').notNull().default(0),
  presento: boolean('presento').notNull().default(false),
}, (t) => [primaryKey({ columns: [t.sesionId, t.correo] })])
```

⚠️ **`primaryKey` compuesta NO está importada** en `src/db/esquema.ts` — hoy
todas las tablas usan clave simple con `.primaryKey()` sobre la columna.
Añádela al `import` de `drizzle-orm/pg-core` de la cabecera, junto a `integer`
y `boolean`, que sí están.

`registrarEdicion` es **una sola sentencia** con `onConflictDoUpdate` que suma
uno y mueve `ultimaEdicion` — no leer-y-escribir. Misma lección de la ronda 8.

- [ ] **Paso 4: Enchufarlo a las acciones que escriben una sesión**

Guardar una sección, reordenar, maquetar, publicar la minuta. **No** a las de
lectura: abrir una sesión para mirarla no es participar.

Y `registrarPresentacion` al abrir el modo presentación.

**Enumera en el reporte todas las acciones que tocaste**: si se olvida una, el
dato queda incompleto y nadie lo nota — un registro incompleto es peor que no
tenerlo, porque parece completo.

- [ ] **Paso 5: La línea en pantalla**

`ParticipantesSesion` pinta «Prepararon: Iris, César · Presentó: Iris», y **dice
lo que no sabe**: un texto pequeño aclarando que registra quién tocó la
presentación y quién la abrió, no cuánto participó nadie en la reunión.

- [ ] **Paso 6: Migración, comprobación leída y commit**

Aplicar, comprobar leyendo que la tabla existe y está vacía, pegar la lectura.

```bash
git add src/db src/componentes/sesion src/app drizzle/
git commit -m "Queda registrado quién preparó cada presentación y quién la abrió"
```

---

## Tarea 5: La transcripción deja de perderse

**Archivos:**
- Modificar: `src/componentes/sesion/GrabarReunion.tsx`, `src/componentes/sesion/ModoPresentar.tsx`
- Test: `src/componentes/sesion/GrabarReunion.test.tsx` (crear)

**Interfaces:**
- Produce: `GrabarReunion` gana `alAcumular?: (texto: string) => void`.

El diagnóstico (`docs/superpowers/specs/2026-07-31-diagnostico-grabacion.md`)
encontró **dos rutas que tiran la transcripción en silencio**, con la misma raíz:
hay un solo camino que la salva —el clic en «Parar y minutar»— y todo lo demás
la descarta.

- [ ] **Paso 1: Escribir el test que falla**

```tsx
// src/componentes/sesion/GrabarReunion.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GrabarReunion } from './GrabarReunion'

// Doble mínimo de la Web Speech API: guarda los manejadores para dispararlos a mano.
let reconocedor: any
beforeEach(() => {
  reconocedor = { start: vi.fn(), stop: vi.fn(), abort: vi.fn(), onresult: null, onerror: null, onend: null }
  ;(globalThis as any).webkitSpeechRecognition = vi.fn(() => reconocedor)
  ;(globalThis as any).navigator.mediaDevices = { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }) }
})

function hablar(texto: string) {
  act(() => {
    reconocedor.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: texto }], { isFinal: true, length: 1 })] })
  })
}

describe('GrabarReunion — lo grabado no se pierde', () => {
  it('desmontarse con la grabación viva ENTREGA lo acumulado', async () => {
    const alTerminar = vi.fn()
    const { unmount } = render(<GrabarReunion alTerminar={alTerminar} />)
    await userEvent.click(screen.getByRole('button', { name: /grabar/i }))
    hablar('el tráfico cae por el mix de consultas')
    unmount()
    expect(alTerminar).toHaveBeenCalledWith(expect.stringContaining('el tráfico cae'))
  })

  it('un error a media reunión NO borra lo acumulado', async () => {
    const alTerminar = vi.fn()
    render(<GrabarReunion alTerminar={alTerminar} />)
    await userEvent.click(screen.getByRole('button', { name: /grabar/i }))
    hablar('primera parte')
    act(() => { reconocedor.onerror({ error: 'network' }) })
    await userEvent.click(screen.getByRole('button', { name: /grabar/i }))
    hablar('segunda parte')
    await userEvent.click(screen.getByRole('button', { name: /parar y minutar/i }))
    const entregado = alTerminar.mock.calls.at(-1)![0]
    expect(entregado).toContain('primera parte')
    expect(entregado).toContain('segunda parte')
  })

  it('desmontarse SIN haber grabado nada no llama a nada', () => {
    const alTerminar = vi.fn()
    const { unmount } = render(<GrabarReunion alTerminar={alTerminar} />)
    unmount()
    expect(alTerminar).not.toHaveBeenCalled()
  })
})
```

- [ ] **Paso 2: Correr y ver que falla**

Ejecutar: `npx vitest run src/componentes/sesion/GrabarReunion.test.tsx`
Esperado: FALLAN los dos primeros. **Esa es la prueba de que el bug existe** —
antes de arreglar nada, confírmalo y anótalo en el reporte.

- [ ] **Paso 3: Arreglar las dos rutas**

1. **La limpieza de desmontaje entrega lo acumulado** en vez de solo apagar el
   micrófono, si hay algo que entregar.
2. **El manejador de error NO vacía el acumulado**, y volver a grabar **añade**
   en vez de reemplazar.
3. **El aviso de error se ve**: hoy es un texto pequeño en una barra
   semi-transparente. Que tenga el peso de un error.
4. `alAcumular` opcional: el padre recibe el texto según llega, para que exista
   una copia fuera del componente.

Comentario que explique por qué, citando el diagnóstico: la transcripción es lo
único de una reunión que no se puede recuperar.

- [ ] **Paso 4: Correr y ver que pasa**

- [ ] **Paso 5: Avisar antes de salir**

En `ModoPresentar`, si hay grabación viva, salir pide confirmación. El Esc nativo
del navegador no se puede interceptar — por eso el arreglo del paso 3 es el que
manda, y esto es la segunda red.

- [ ] **Paso 6: Correr todo y commit**

```bash
git add src/componentes/sesion
git commit -m "La transcripción sobrevive a salir de la presentación y a un error de red"
```

---

## Tarea 6: Arrastrar los acuerdos abiertos

**Archivos:**
- Crear: `src/componentes/editor/AcuerdosArrastrables.tsx` + test
- Modificar: el editor de sesión y su acción de guardar

**Interfaces:**
- Consume: los acuerdos de una sala (ya existen en `src/db/consultas.ts`).
- Produce: `acuerdosArrastrablesDe(salaSlug, sesionId): Promise<Acuerdo[]>` — los abiertos de la sala que **no** están ya en esa sesión.

- [ ] **Paso 1: Escribir el test que falla**

```tsx
// src/componentes/editor/AcuerdosArrastrables.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AcuerdosArrastrables } from './AcuerdosArrastrables'

const A = (id: string, que: string, fecha: string | null, estatus = 'abierto') =>
  ({ id, que, responsable: 'Iris', fechaCompromiso: fecha, estatus })

describe('AcuerdosArrastrables', () => {
  it('los vencidos van primero: son los que hay que retomar', () => {
    render(<AcuerdosArrastrables acuerdos={[A('1','al día','2026-12-01'), A('2','vencido','2026-01-01','vencido')]} alArrastrar={vi.fn()} />)
    const filas = screen.getAllByRole('listitem')
    expect(filas[0]).toHaveTextContent('vencido')
  })

  it('sin acuerdos abiertos lo dice, en vez de una columna muda', () => {
    render(<AcuerdosArrastrables acuerdos={[]} alArrastrar={vi.fn()} />)
    expect(screen.getByText(/no hay acuerdos abiertos/i)).toBeInTheDocument()
  })

  it('cada acuerdo se puede arrastrar y también añadir con un botón', () => {
    render(<AcuerdosArrastrables acuerdos={[A('1','algo','2026-12-01')]} alArrastrar={vi.fn()} />)
    expect(screen.getByRole('listitem')).toHaveAttribute('draggable', 'true')
    expect(screen.getByRole('button', { name: /añadir/i })).toBeInTheDocument()
  })
})
```

- [ ] **Paso 2: Correr y ver que falla**

- [ ] **Paso 3: Implementar**

Columna con los acuerdos **abiertos de la sala** —no solo los de la última
reunión: uno de hace dos meses que sigue abierto es justo el que hay que
retomar— con los vencidos primero.

**Arrastrar NO duplica el acuerdo.** El acuerdo es el mismo y sigue colgando de
la sala; lo que se registra es que se retoma en esta reunión. Duplicarlo daría
dos compromisos donde hay uno, y cerrar uno dejaría el otro vivo. Comentario que
lo diga.

Los que ya están en la sesión no se ofrecen.

**El botón de añadir no es decorativo**: es la vía accesible, igual que las
flechas conviven con el arrastre en el cuestionario.

- [ ] **Paso 4: Correr y ver que pasa**

- [ ] **Paso 5: Correr todo y commit**

```bash
git add src/componentes/editor src/app src/db
git commit -m "Los acuerdos abiertos de la sala se arrastran a la sesión nueva"
```

---

## Tarea 7: Redimensionar imágenes y subir vídeo

**Archivos:**
- Modificar: `src/componentes/editor/CampoImagen.tsx`, `src/app/api/archivos/subir/route.ts`, `src/db/esquema.ts`, el catálogo de secciones
- Crear: `src/componentes/editor/CampoVideo.tsx` + test
- Crear: la migración (categoría `video`)

- [ ] **Paso 1: Escribir el test que falla**

```tsx
// src/componentes/editor/CampoVideo.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CampoVideo, TOPE_VIDEO_MB, TIPOS_VIDEO } from './CampoVideo'

describe('CampoVideo', () => {
  it('avisa del tope ANTES de que alguien espere una subida larga', () => {
    render(<CampoVideo valor={null} alCambiar={vi.fn()} />)
    expect(screen.getByText(new RegExp(`${TOPE_VIDEO_MB}\\s*MB`))).toBeInTheDocument()
  })

  it('solo acepta lo que Chrome reproduce sin plugins', () => {
    expect(TIPOS_VIDEO).toEqual(['video/mp4', 'video/webm'])
  })

  it('con un vídeo puesto lo muestra y deja quitarlo', () => {
    render(<CampoVideo valor={{ url: 'https://x/v.mp4', titulo: 'Caso' }} alCambiar={vi.fn()} />)
    expect(screen.getByText('Caso')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /quitar/i })).toBeInTheDocument()
  })
})
```

- [ ] **Paso 2: Correr y ver que falla**

- [ ] **Paso 3: El ancho de la imagen**

`CampoImagen` gana **ancho en porcentaje** (25 a 100, con tirador) y
**alineación** (izquierda, centro, derecha), que se guardan en el contenido de
la sección y se aplican al pintarla. No se recorta ni se edita la imagen: eso es
otro producto.

- [ ] **Paso 4: El vídeo**

`TOPE_VIDEO_MB = 200` y `TIPOS_VIDEO = ['video/mp4','video/webm']`. La categoría
`video` entra en el enum de `archivos` (migración). El tope se comprueba en el
cliente **y en la ruta de subida**.

El aviso en pantalla dice el tope y sugiere un enlace a YouTube o Drive para
vídeos largos — que ya se puede poner hoy en una sección de enlaces.

- [ ] **Paso 5: Correr y ver que pasa**

- [ ] **Paso 6: Migración, comprobación leída, y commit**

```bash
git add src/componentes/editor src/app/api src/db drizzle/ src/secciones
git commit -m "Las imágenes se redimensionan y se puede subir vídeo, con su tope"
```

---

## Tarea 8: Verificar en producción

⚠️ **Avisar a Franco antes de empezar.** Esta tarea cambia cómo entra su equipo.

- [ ] **Paso 1: Desplegar y entrar por Slack**

Comprobar que Franco entra y que su rol es admin.

- [ ] **Paso 2: Dar de alta a alguien y comprobar los tres roles**

Con la cuenta de Franco, dar de alta una persona como editor y otra como viewer.
Comprobar que el editor no ve `/salas` ni `/personas`, y que el viewer no puede
mover un acuerdo.

- [ ] **Paso 3: Comprobar que el director de UDN no cambió**

Su enlace de sala sigue funcionando y sigue viendo solo la suya.

- [ ] **Paso 4: El portillo**

Comprobar que con el directorio poblado, la clave de equipo **ya no** entra.

- [ ] **Paso 5: La grabación, de verdad**

Abrir una presentación, grabar unos segundos, **salir con Esc**, y comprobar que
la transcripción no se perdió. Es el bug que reportó Franco: verificarlo en el
navegador, no solo con tests.

- [ ] **Paso 6: Prints**

Con la skill `shot`: `/personas`, la línea de participantes, la columna de
acuerdos arrastrables, y una sección con vídeo. **Mirar los PNG.**

- [ ] **Paso 7: Limpiar y anotar**

Borrar las personas de prueba. Dejar solo a quien Franco quiera. Escribir en
este plan qué se verificó.

---

## Autorrevisión

| Sección del spec | Tarea |
|---|---|
| 1 · Directorio, tabla, qué pasa al entrar, arranque, roles | 1, 2, 3 |
| 1 · Cómo se aplica (las 47 llamadas) | 2 paso 6 |
| 2 · Quién editó / quién presentó / qué no dice | 4 |
| 3 · El bug de la grabación | 5 |
| 4 · Arrastrar acuerdos sin duplicar | 6 |
| 5 · Redimensionar y vídeo con su tope | 7 |
| Riesgos (dejar fuera al equipo) | 2 paso 5, 3 paso 3, 8 pasos 1 y 4 |

**Lo que NO entra:** presencia en tiempo real, editar o recortar imágenes, roles
por squad, invitar por correo a gente fuera del Slack de UPAX, y retirar la clave
de sala de los directores.
