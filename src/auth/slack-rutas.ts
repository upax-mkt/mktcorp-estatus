/**
 * La URL de retorno de Slack, en un solo sitio: tiene que ser IDÉNTICA en la
 * petición de autorización y en el intercambio del código, o Slack rechaza el
 * canje. Vive fuera de slack.ts para que las rutas y los tests la compartan
 * sin arrastrar el resto del módulo.
 */

export const COOKIE_ESTADO_SLACK = 'mktcorp_slack_state'

export const RUTA_RETORNO_SLACK = '/api/auth/slack/retorno'

/**
 * Se deriva del origen de la petición, así funciona igual en local, en un
 * preview y en producción sin configurar nada. `origenPublico`
 * (APP_URL) tiene prioridad, para cuando la app se sirva bajo un dominio
 * propio y el request llegue con el host interno.
 */
export function urlDeRetornoSlack(
  urlDeLaPeticion: string,
  origenPublico: string | undefined = process.env.APP_URL,
): string {
  const base = origenPublico ? new URL(origenPublico) : new URL(urlDeLaPeticion)
  return new URL(RUTA_RETORNO_SLACK, base.origin).toString()
}
