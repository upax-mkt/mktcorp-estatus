import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { firmar } from '@/auth/firma'
import { secretoConfigurado } from '@/auth/sesion'
import { equipoExigido, slackConfigurado, urlDeAutorizacion } from '@/auth/slack'
import { COOKIE_ESTADO_SLACK, urlDeRetornoSlack } from '@/auth/slack-rutas'

/**
 * Arranca el "Entrar con Slack": manda al usuario a autorizar en Slack con un
 * `state` firmado que se guarda además en una cookie corta. Al volver, los dos
 * tienen que coincidir — así una petición fabricada desde otro sitio no puede
 * completar el login (CSRF).
 */
export async function GET(request: Request) {
  const secreto = secretoConfigurado()
  if (!secreto || !slackConfigurado()) redirect('/entrar?error=slack')

  const estado = await firmar(
    // El state no identifica a nadie: es un valor de un solo uso, con vida corta.
    { rol: 'equipo', sub: 'estado-slack', exp: Date.now() + 10 * 60_000 },
    secreto,
  )

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_ESTADO_SLACK, estado, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })

  redirect(
    urlDeAutorizacion({
      clientId: process.env.SLACK_CLIENT_ID as string,
      redirectUri: urlDeRetornoSlack(request.url),
      state: estado,
      equipo: equipoExigido(),
    }),
  )
}
