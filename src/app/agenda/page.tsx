import { permanentRedirect } from 'next/navigation'

/**
 * `/agenda` (Tarea 13, ronda 10): el ciclo entero de una reunión —el
 * calendario del mes, agendar, y "ya dadas este mes" con lo que le falta a
 * cada una— se mudó a `/reuniones`. "Agenda" desaparece como nombre de
 * sección; esta ruta se queda solo para que nadie con el marcador viejo, un
 * enlace en Slack o una pestaña abierta se quede varado.
 *
 * `permanentRedirect`, no `redirect`: la tarea pide una redirección
 * PERMANENTE — quien tenga `/agenda` guardado tiene que acabar en
 * `/reuniones` sin dejar un marcador muerto. `redirect()` (lo que sugería el
 * boceto original de esta tarea, con `RedirectType.replace`) es un 307
 * TEMPORAL: `RedirectType` ('push'/'replace') es sobre la pila de historial
 * del navegador, no sobre el código HTTP, y el propio doc de Next lo dice
 * explícito — "The type parameter has no effect when used in Server
 * Components" (node_modules/next/dist/docs/01-app/03-api-reference/
 * 04-functions/redirect.md). Lo único que decide 307 vs 308 es qué FUNCIÓN
 * se llama (confirmado en el código fuente,
 * node_modules/next/dist/client/components/redirect.js): `redirect()`
 * siempre arma un `RedirectStatusCode.TemporaryRedirect`; `permanentRedirect()`
 * siempre `PermanentRedirect`. De ahí que esta página use la segunda, sin
 * pasarle un `type` — no tiene efecto aquí, y su default ('replace') ya es
 * el que hace falta.
 *
 * `/agenda/[token]` — la agenda pública de enlace firmado, ya compartida
 * fuera de la empresa — NO SE TOCA Y NO SE IMPORTA AQUÍ. Es una carpeta
 * hermana (`app/agenda/[token]/page.tsx`): un segmento de ruta DISTINTO al
 * de este archivo según el enrutado por sistema de archivos del App Router
 * (node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md,
 * ".../03-file-conventions/dynamic-routes.md") — una petición a
 * `/agenda/<token>` resuelve `[token]/page.tsx`, nunca este archivo. No es
 * una cuestión de precedencia entre dos rutas que compitan por la misma
 * URL: son dos hojas distintas del árbol de carpetas, así que esta
 * redirección no puede alcanzarla ni en teoría.
 */
export default async function PagAgenda(): Promise<never> {
  permanentRedirect('/reuniones')
}
