import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { abrirSesionEquipo, secretoConfigurado } from '@/auth/sesion'
import { verificar } from '@/auth/firma'
import {
  dominioExigido,
  equipoExigido,
  esCorreoPermitido,
  esEquipoPermitido,
  identidadDesdeCodigo,
  slackConfigurado,
} from '@/auth/slack'
import { COOKIE_ESTADO_SLACK, urlDeRetornoSlack } from '@/auth/slack-rutas'

/**
 * Vuelta de Slack. Cuatro puertas antes de abrir sesión: el `state` coincide
 * con la cookie y sigue vigente, Slack canjea el código, el workspace es el de
 * UPAX y el correo es del dominio corporativo. Cualquier fallo devuelve a
 * /entrar con un aviso, nunca deja entrar "por si acaso".
 */
export async function GET(request: Request) {
  const secreto = secretoConfigurado()
  if (!secreto || !slackConfigurado()) redirect('/entrar?error=slack')

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const cookieStore = await cookies()
  const estadoEsperado = cookieStore.get(COOKIE_ESTADO_SLACK)?.value
  cookieStore.delete(COOKIE_ESTADO_SLACK)

  // El state debe venir, coincidir con el que emitimos y no haber caducado.
  if (!code || !state || !estadoEsperado || state !== estadoEsperado) {
    redirect('/entrar?error=slack')
  }
  if (!(await verificar(state, secreto))) redirect('/entrar?error=slack')

  const identidad = await identidadDesdeCodigo(code, urlDeRetornoSlack(request.url))
  if (!identidad) redirect('/entrar?error=slack')
  if (!esEquipoPermitido(identidad.equipo, equipoExigido(), identidad.organizacion)) {
    redirect('/entrar?error=slack')
  }
  if (!esCorreoPermitido(identidad.email, dominioExigido())) redirect('/entrar?error=slack')

  await abrirSesionEquipo(identidad.email)
  redirect('/')
}
