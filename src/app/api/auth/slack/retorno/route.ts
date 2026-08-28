import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { abrirSesionEquipo, secretoConfigurado } from '@/auth/sesion'
import { verificar } from '@/auth/firma'
import {
  equipoExigido,
  esEquipoPermitido,
  identidadDesdeCodigo,
  slackConfigurado,
} from '@/auth/slack'
import { COOKIE_ESTADO_SLACK, urlDeRetornoSlack } from '@/auth/slack-rutas'
import { buscarPersona, registrarAcceso } from '@/db/directorio'

/**
 * Vuelta de Slack. Tres puertas antes de mirar el directorio: el `state`
 * coincide con la cookie y sigue vigente, Slack canjea el código y el
 * workspace es el de UPAX (`esEquipoPermitido` contra `SLACK_TEAM_ID` — NO
 * TOCAR esa comprobación). Cualquier fallo devuelve a /entrar con un aviso,
 * nunca deja entrar "por si acaso".
 *
 * UNA CUARTA, desde la ronda 9: estar dado de alta en el directorio y activo.
 * Pasar las tres primeras prueba que quien llegó es de UPAX; no dice CON QUÉ
 * PERMISO — eso solo lo sabe el directorio (tarea 1, src/db/directorio.ts), y
 * es lo que decide esta ruta a partir de aquí.
 *
 * SIN FILTRO POR DOMINIO DE CORREO, a propósito. Lo hubo —`esCorreoPermitido`
 * contra `dominioExigido()`, ambas vivían en `@/auth/slack`— y se retiró aquí
 * al poblar el directorio con el equipo real: reparte en cuatro dominios de
 * correo (`@upax.com.mx`, `@elektra.com.mx`, `@jansan.mx`, `@onuriscp.com`)
 * porque cada quien lo contrata una entidad distinta del mismo grupo, algo
 * que no pueden cambiar. El dominio nunca dijo quién era del equipo, y
 * filtrar por él dejaba fuera a más de la mitad. Si en el futuro parece que
 * falta una capa aquí: no falta. La capa es la de abajo, el directorio
 * (`buscarPersona` + `persona.activa`), y a diferencia del dominio sí
 * distingue quién tiene permiso de verdad, sin importar quién lo contrató.
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

  // Sin código o sin state no hay nada que canjear: Slack no completó.
  if (!code || !state) redirect('/entrar?error=slack')

  /**
   * ⚠️ EL STATE SE VALIDA POR FIRMA, Y LA COOKIE ES UN REFUERZO — NO AL REVÉS.
   *
   * Franco, 28-ago-2026: *«el login en móvil tira error después de meter las
   * credenciales correctas; en desktop funciona todo bien»*.
   *
   * Ese es el síntoma clásico de esta comprobación en un teléfono. El flujo
   * empieza en un navegador, salta a la app de Slack para autorizar y vuelve —
   * y ese viaje de ida y vuelta no siempre conserva el mismo contenedor de
   * cookies: el navegador embebido de Slack tiene el suyo, y iOS y Android
   * deciden por su cuenta dónde abrir cada paso. Si el retorno aterriza donde
   * la cookie no está, `estadoEsperado` llega vacío y el login falla DESPUÉS de
   * haber tecleado bien las credenciales, que es lo que más desconcierta.
   *
   * Qué prueba cada cosa:
   *
   *  - LA FIRMA del `state` prueba que lo emitimos NOSOTROS —va firmado con
   *    `SESSION_SECRET`, que no sale de aquí— y que no han pasado 10 minutos.
   *    Es la garantía fuerte, y no depende del navegador.
   *  - LA COOKIE prueba, además, que el flujo lo inició ESTE navegador. Es la
   *    defensa contra un CSRF de login: que alguien te complete el flujo con
   *    SU código y acabes dentro con su identidad.
   *
   * Así que la cookie se exige cuando ESTÁ, y su ausencia deja de tumbar el
   * login. Lo que queda expuesto está acotado: quien montara ese ataque tendría
   * que pertenecer al workspace de Slack de UPAX —lo comprueba
   * `esEquipoPermitido` unas líneas más abajo— y el resultado sería que la
   * víctima ve la app con la identidad del atacante, no al revés. Frente a eso:
   * sin este cambio, ninguna de las 23 personas del equipo puede entrar desde
   * su teléfono.
   *
   * Cada motivo lleva su propio código para que un fallo se pueda diagnosticar
   * sin adivinar; `/entrar` los traduce a un mensaje que dice qué hacer.
   */
  if (estadoEsperado && state !== estadoEsperado) redirect('/entrar?error=slack-estado')
  if (!(await verificar(state, secreto))) redirect('/entrar?error=slack-caducado')

  const identidad = await identidadDesdeCodigo(code, urlDeRetornoSlack(request.url))
  if (!identidad) redirect('/entrar?error=slack-codigo')
  if (!esEquipoPermitido(identidad.equipo, equipoExigido(), identidad.organizacion)) {
    redirect('/entrar?error=slack-workspace')
  }

  // EL PORTILLO DE EMERGENCIA, y no es un descuido.
  //
  // Mientras el directorio no tenga NINGÚN ADMIN ACTIVO —vacío del todo, o con
  // gente pero sin nadie que administre—, la clave de equipo sigue sirviendo y
  // entra como admin. En cuanto hay al menos uno, deja de funcionar. No lo
  // quites pensando que sobra: es el extintor.
  //
  // Por eso el camino de abajo puede rechazar sin miedo un correo que no está
  // en el directorio: ese extintor vive en `entrarConClave`
  // (src/app/entrar/page.tsx), no aquí — esta ruta solo sabe hablar con Slack,
  // y un correo sin fila en `personas` simplemente no tiene permiso, haya o no
  // algún admin activo. Mezclar aquí un "si no queda admin, deja pasar a
  // cualquier correo del workspace" sería un portillo más ancho que el que se
  // decidió: la clave de equipo la conoce un grupo acotado; el dominio de
  // Slack, no.

  const persona = await buscarPersona(identidad.email)
  if (!persona) redirect('/entrar?error=sin-acceso')
  if (!persona.activa) redirect('/entrar?error=inactivo')

  await abrirSesionEquipo(identidad.email, persona.rol)
  await registrarAcceso(identidad.email)
  redirect('/')
}
