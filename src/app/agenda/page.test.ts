import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { redirect, permanentRedirect } from 'next/navigation'

/**
 * `/agenda` (Tarea 13, ronda 10): el ciclo entero de una reunión —calendario,
 * agendar, "ya dadas este mes"— se mudó a `/reuniones`. Esta página se reduce
 * a una redirección PERMANENTE: quien tenga `/agenda` guardado (marcador,
 * enlace en Slack) tiene que acabar en `/reuniones`, sin dejar un marcador
 * muerto (spec de la tarea, ambigüedad #2).
 *
 * PERMANENTE, NO `redirect()`: el brief sugiere `redirect('/reuniones',
 * RedirectType.replace)`, pero eso es un 307 TEMPORAL — `RedirectType`
 * ('push'/'replace') es sobre la pila de historial del navegador, no sobre
 * el código HTTP, y el propio doc de Next lo dice explícito: "The type
 * parameter has no effect when used in Server Components" (ver
 * node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md).
 * Lo único que decide 307 vs 308 es QUÉ FUNCIÓN se llama —confirmado leyendo
 * node_modules/next/dist/client/components/redirect.js: `redirect()` siempre
 * construye `RedirectStatusCode.TemporaryRedirect` (307);
 * `permanentRedirect()` siempre `PermanentRedirect` (308)—, así que esta
 * página usa `permanentRedirect`.
 *
 * SIN MOCKEAR `next/navigation` (a diferencia de `[token]/page.test.ts`, que
 * sí mockea `notFound`): aquí interesa el digest REAL que arma Next, que es
 * lo único que demuestra a dónde redirige de verdad y con qué código.
 * Cargarlo bajo Vitest (jsdom, `window` definido) es seguro: se comprobó en
 * el código fuente que ni `redirect` ni `permanentRedirect` dependen de
 * ningún contexto de servidor de Next en tiempo de ejecución para lanzar su
 * error — `actionAsyncStorage` (lo único ahí que toca infraestructura de
 * Next) queda `undefined` bajo `window` definido, y el `?.` lo protege.
 *
 * `/agenda/[token]` NO SE TOCA NI SE IMPORTA AQUÍ. Es una carpeta hermana
 * (`app/agenda/[token]/page.tsx`), un segmento de ruta DISTINTO al de este
 * archivo (`app/agenda/page.tsx`): el enrutado por sistema de archivos del
 * App Router hace que una petición a `/agenda/<token>` NUNCA pase por
 * `agenda/page.tsx` (ver node_modules/next/dist/docs/01-app/01-getting-started/
 * 03-layouts-and-pages.md y .../03-file-conventions/dynamic-routes.md) — no
 * es una cuestión de precedencia entre dos rutas que compitan, son dos hojas
 * distintas del árbol de carpetas. La comprobación de extremo a extremo
 * (curl contra un enlace de agenda real, en vivo) vive fuera de esta suite
 * — ver el reporte de la tarea.
 */

function digestDe(error: unknown): string | undefined {
  return (error as { digest?: string } | null)?.digest
}

const { default: PagAgenda } = await import('./page')

describe('PagAgenda (/agenda) — ahora es una redirección permanente a /reuniones', () => {
  it('rechaza con el digest de una redirección hacia /reuniones (forma que ya pedía el brief)', async () => {
    await expect(PagAgenda()).rejects.toMatchObject({ digest: expect.stringContaining('/reuniones') })
  })

  it('el digest es EXACTAMENTE el que arma permanentRedirect("/reuniones") — 308, no 307', async () => {
    let esperado: unknown
    try {
      permanentRedirect('/reuniones')
    } catch (e) {
      esperado = e
    }

    const real = await PagAgenda().catch((e: unknown) => e)

    expect(digestDe(real)).toBeDefined()
    expect(digestDe(real)).toBe(digestDe(esperado))
  })

  it('NO es un redirect temporal: el digest no coincide con el de redirect("/reuniones") (307)', async () => {
    let temporal: unknown
    try {
      redirect('/reuniones')
    } catch (e) {
      temporal = e
    }

    const real = await PagAgenda().catch((e: unknown) => e)

    expect(digestDe(real)).not.toBe(digestDe(temporal))
  })

  it('no importa nada de la carpeta hermana [token]: el módulo no referencia ./[token]', async () => {
    // Comprobación estática, no de runtime: si algún día alguien "arregla"
    // esta página importando algo de `./[token]/page` (por ejemplo para
    // reusar un helper), este test lo atrapa antes de que sea un problema de
    // enrutado real. Ruta relativa al cwd del proceso (la raíz del repo,
    // donde corre `vitest run`) — más robusta bajo Vite/Vitest que
    // `import.meta.url` (aquí no resuelve a un URL de esquema `file:`).
    //
    // Se listan los `import` reales (líneas que empiezan con `import `), no
    // se busca la subcadena "[token]" a pelo: el comentario de cabecera de
    // esta misma página LA MENCIONA en prosa (para explicar por qué no hace
    // falta tocarla), así que ese regex suelto se dispararía contra su
    // propia documentación.
    const fuente = await readFile('src/app/agenda/page.tsx', 'utf-8')
    const imports = fuente.match(/^import .+$/gm) ?? []
    expect(imports).toEqual(["import { permanentRedirect } from 'next/navigation'"])
  })
})
