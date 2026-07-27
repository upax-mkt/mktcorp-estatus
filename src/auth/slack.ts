/**
 * Sign in with Slack (OpenID Connect) para el equipo de Marketing Corporativo.
 *
 * Queda montado pero INERTE mientras el despliegue no tenga
 * SLACK_CLIENT_ID/SLACK_CLIENT_SECRET: `slackConfigurado()` devuelve false, el
 * botón no se pinta y la entrada por clave de equipo sigue funcionando igual.
 * Cuando existan las credenciales, se enciende solo — no hay que tocar código.
 *
 * Para encenderlo hay que crear una app de Slack en el workspace de UPAX con:
 *   - Redirect URL: https://<dominio>/api/auth/slack/retorno
 *   - Scopes de usuario (OpenID): openid, profile, email
 * y poner en el entorno SLACK_CLIENT_ID, SLACK_CLIENT_SECRET y (recomendado)
 * SLACK_TEAM_ID, para que solo entre gente del workspace de UPAX.
 */

const AUTORIZACION = 'https://slack.com/openid/connect/authorize'
const TOKEN = 'https://slack.com/api/openid.connect.token'

/** Claim propio de Slack dentro del id_token. */
const CLAIM_EQUIPO = 'https://slack.com/team_id'

export interface IdentidadSlack {
  email: string
  nombre?: string
  equipo?: string
}

export function slackConfigurado(): boolean {
  return Boolean(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET)
}

/** Workspace al que se restringe la entrada, si se configuró uno. */
export function equipoExigido(): string | undefined {
  return process.env.SLACK_TEAM_ID || undefined
}

/**
 * Dominio de correo al que se restringe la entrada. Por defecto el
 * corporativo: un invitado externo del workspace no debe entrar a ver los
 * acuerdos internos de las 10 salas.
 */
export function dominioExigido(): string | undefined {
  return process.env.SLACK_DOMINIO_CORREO || 'upax.com.mx'
}

/** true si el correo pertenece exactamente al dominio permitido. */
export function esCorreoPermitido(correo: string, dominio: string | undefined): boolean {
  if (!dominio) return true
  const partes = correo.trim().toLowerCase().split('@')
  if (partes.length !== 2) return false
  return partes[1] === dominio.trim().toLowerCase()
}

export function esEquipoPermitido(equipo: string | undefined, exigido: string | undefined): boolean {
  if (!exigido) return true
  return equipo === exigido
}

/**
 * Lee la carga del id_token que devuelve Slack.
 *
 * No se verifica la firma a propósito: el token no llega por el navegador sino
 * en la respuesta de un POST nuestro a Slack, autenticado con el client_secret
 * y sobre TLS. La cadena de confianza es esa conexión, no el JWT.
 */
export function leerIdToken(idToken: string): IdentidadSlack | null {
  const partes = idToken.split('.')
  if (partes.length !== 3) return null
  try {
    const carga = JSON.parse(
      Buffer.from(partes[1], 'base64url').toString('utf8'),
    ) as Record<string, unknown>
    const email = carga.email
    if (typeof email !== 'string' || email.length === 0) return null
    return {
      email,
      nombre: typeof carga.name === 'string' ? carga.name : undefined,
      equipo: typeof carga[CLAIM_EQUIPO] === 'string' ? (carga[CLAIM_EQUIPO] as string) : undefined,
    }
  } catch {
    return null
  }
}

export function urlDeAutorizacion(opciones: {
  clientId: string
  redirectUri: string
  state: string
  equipo?: string
}): string {
  const url = new URL(AUTORIZACION)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid profile email')
  url.searchParams.set('client_id', opciones.clientId)
  url.searchParams.set('redirect_uri', opciones.redirectUri)
  url.searchParams.set('state', opciones.state)
  if (opciones.equipo) url.searchParams.set('team', opciones.equipo)
  return url.toString()
}

/**
 * Cambia el `code` que devolvió Slack por la identidad de quien entró.
 * `null` si Slack rechaza el intercambio o no manda un id_token legible.
 */
export async function identidadDesdeCodigo(
  code: string,
  redirectUri: string,
): Promise<IdentidadSlack | null> {
  const clientId = process.env.SLACK_CLIENT_ID
  const clientSecret = process.env.SLACK_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  const respuesta = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  })

  if (!respuesta.ok) return null
  const datos = (await respuesta.json()) as { ok?: boolean; id_token?: string }
  if (!datos.ok || !datos.id_token) return null
  return leerIdToken(datos.id_token)
}
