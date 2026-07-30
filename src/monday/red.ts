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
  opciones: {
    /**
     * Si ante un 429 se espera el `Retry-After` (hasta `ESPERA_MAXIMA_S`) y
     * se reintenta una vez — el comportamiento de siempre, y el que quiere
     * casi todo el mundo: una Server Action de escritura prefiere esperar 30
     * s a perder el intento. `false` es la excepción, para quien llama desde
     * el RENDER de una página: ahí esperar 30 s no es "tarda", es colgar la
     * carga de alguien que no pidió esperar nada. Con `false`, un 429 se
     * rinde de inmediato (mismo error, sin la espera) y dice cuántos
     * segundos pedía Monday, para que quien llama decida qué hacer —
     * `refrescarDesdeMonday` (src/db/acuerdos.ts) lo deja para la siguiente
     * carga en vez de bloquear esta.
     */
    reintentarSiLimitado?: boolean
  } = {},
): Promise<T> {
  const { reintentarSiLimitado = true } = opciones
  const token = tokenDeMonday()
  if (!token) throw new ErrorMonday('Falta MONDAY_TOKEN.')

  let respuesta = await llamar(token, query, variables)

  if (respuesta.status === 429) {
    const pedidos = Number.parseInt(respuesta.headers.get('Retry-After') ?? '10', 10)
    const espera = Math.min(Number.isNaN(pedidos) ? 10 : pedidos, ESPERA_MAXIMA_S)
    if (!reintentarSiLimitado) {
      throw new ErrorMonday(`Monday está limitando las llamadas: pide ${espera} s de espera.`)
    }
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
