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
import { buscarPersona, registrarAcceso } from '@/db/directorio'

/**
 * Vuelta de Slack. Cuatro puertas antes de mirar el directorio: el `state`
 * coincide con la cookie y sigue vigente, Slack canjea el código, el
 * workspace es el de UPAX y el correo es del dominio corporativo. Cualquier
 * fallo devuelve a /entrar con un aviso, nunca deja entrar "por si acaso".
 *
 * UNA QUINTA, desde la ronda 9: estar dado de alta en el directorio y activo.
 * Pasar las cuatro primeras prueba que quien llegó es de UPAX; no dice CON QUÉ
 * PERMISO — eso solo lo sabe el directorio (tarea 1, src/db/directorio.ts), y
 * es lo que decide esta ruta a partir de aquí.
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

  // EL PORTILLO DE EMERGENCIA, y no es un descuido.
  //
  // Si el directorio está vacío nadie puede entrar —ni quien tenía que darse de
  // alta a sí mismo—, así que mientras no haya NI UNA persona, la clave de equipo
  // sigue sirviendo y entra como admin. En cuanto hay una, deja de funcionar.
  // No lo quites pensando que sobra: es el extintor.
  //
  // Por eso el camino de abajo puede rechazar sin miedo un correo que no está
  // en el directorio: ese extintor vive en `entrarConClave`
  // (src/app/entrar/page.tsx), no aquí — esta ruta solo sabe hablar con Slack,
  // y un correo sin fila en `personas` simplemente no tiene permiso, vacío el
  // directorio o no. Mezclar aquí un "si está vacío, deja pasar a cualquier
  // correo del workspace" sería un portillo más ancho que el que se decidió:
  // la clave de equipo la conoce un grupo acotado; el dominio de Slack, no.

  const persona = await buscarPersona(identidad.email)
  if (!persona) redirect('/entrar?error=sin-acceso')
  if (!persona.activa) redirect('/entrar?error=inactivo')

  await abrirSesionEquipo(identidad.email, persona.rol)
  await registrarAcceso(identidad.email)
  redirect('/')
}
