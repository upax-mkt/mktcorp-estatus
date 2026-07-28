import { redirect } from 'next/navigation'
import estilos from './entrar.module.css'
import {
  abrirSesionEquipo,
  claveDeEquipoCorrecta,
  hayAuth,
  hayClaveDeEquipo,
} from '@/auth/sesion'
import { slackConfigurado } from '@/auth/slack'
import { salaDeClave } from '@/db/claves'
import { abrirSesionSala, secretoConfigurado } from '@/auth/sesion'

export const dynamic = 'force-dynamic'

/**
 * Puerta de entrada de Marketing Corporativo.
 *
 * Dos caminos: la clave del equipo (siempre disponible) y Slack (solo si el
 * despliegue tiene las credenciales). Los directores de UDN NO pasan por aquí:
 * entran por su link firmado, que el proxy canjea por una cookie de sala.
 */
export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; destino?: string }>
}) {
  const { error, destino } = await searchParams
  const configurada = hayAuth()
  const conClave = hayClaveDeEquipo()
  const conSlack = slackConfigurado()

  async function entrarConClave(formData: FormData) {
    'use server'

    const clave = String(formData.get('clave') ?? '')
    const aDonde = String(formData.get('destino') ?? '') || '/'

    // UNA SOLA CASILLA para las dos claves. El director de una UDN no tiene
    // por qué saber que existe una "clave de equipo" ni elegir entre dos
    // pestañas: teclea la suya y el sistema reconoce de quién es.
    const secreto = secretoConfigurado()
    if (secreto) {
      const sala = await salaDeClave(clave, secreto)
      if (sala) {
        await abrirSesionSala(sala)
        redirect(`/sala/${sala}`)
      }
    }

    if (!(await claveDeEquipoCorrecta(clave))) {
      // Se conserva el destino: si te equivocas de clave yendo a /preparar,
      // al segundo intento tienes que acabar en /preparar, no en el hub.
      const parametros = new URLSearchParams({ error: 'clave' })
      if (aDonde !== '/') parametros.set('destino', aDonde)
      redirect(`/entrar?${parametros}`)
    }

    await abrirSesionEquipo('equipo-mkt-corp')
    // Solo rutas internas: un destino como "https://otro-sitio" sería un
    // redirect abierto de manual.
    redirect(aDonde.startsWith('/') ? aDonde : '/')
  }

  return (
    <div className={estilos.pantalla}>
      <div className={estilos.tarjeta}>
        <div className={estilos.marca}>
          <span className={estilos.marcaLogo}>M<span className={estilos.marcaRayo}>/</span>C</span>
          <span className={estilos.marcaSub}>Marketing Corp</span>
        </div>

        <h1 className={estilos.titulo}>Estatus a las salas</h1>
        <p className={estilos.subtitulo}>
          El espacio donde Marketing Corporativo prepara, presenta y minuta el estatus de las 10 salas.
        </p>

        {!configurada ? (
          <div className={estilos.aviso}>
            <strong className={estilos.avisoTitulo}>Falta configurar el acceso</strong>
            Este despliegue no tiene <span className={estilos.codigo}>SESSION_SECRET</span>, así que no
            puede validar ninguna sesión. Mientras no exista, la app queda cerrada — a propósito, para no
            dejar los acuerdos internos abiertos a quien tenga la URL.
          </div>
        ) : (
          <>
            {error === 'clave' && (
              <div className={estilos.error}>Esa clave no es la del equipo. Vuelve a intentarlo.</div>
            )}
            {error === 'slack' && (
              <div className={estilos.error}>
                Slack no autorizó la entrada. Puede ser una cuenta fuera del workspace de UPAX.
              </div>
            )}

            {conSlack && (
              <>
                <a href="/api/auth/slack/inicio" className={estilos.botonSlack}>
                  Entrar con Slack
                </a>
                <div className={estilos.separador}>o con una clave</div>
              </>
            )}

            {/* UNA SOLA CASILLA. Marketing Corp entra por Slack o con la clave
                del equipo; el director de una UDN, con la de su sala. Que
                elija entre dos pestañas obligaría a explicarle una
                organización interna que no es suya. */}
            <form action={entrarConClave}>
              <label className={estilos.campo}>
                <span className={estilos.etiqueta}>Clave</span>
                <input
                  className={estilos.input}
                  type="password"
                  name="clave"
                  autoComplete="current-password"
                  autoFocus
                  required
                />
                <em className={estilos.pistaClave}>
                  La de tu sala, si eres de una unidad. La del equipo, si eres de Marketing Corp.
                </em>
              </label>
              <input type="hidden" name="destino" value={destino ?? '/'} />
              <button type="submit" className={estilos.boton}>Entrar</button>
            </form>

            {!conClave && (
              !conSlack && (
                <div className={estilos.aviso}>
                  <strong className={estilos.avisoTitulo}>No hay forma de entrar configurada</strong>
                  Falta <span className={estilos.codigo}>CLAVE_EQUIPO</span> o las credenciales de Slack.
                </div>
              )
            )}
          </>
        )}

        <p className={estilos.pie}>
          <span className={estilos.pieFuerte}>¿Diriges una UDN?</span> No necesitas clave: entra por el
          link de tu sala que te compartió Marketing Corporativo.
        </p>
      </div>
    </div>
  )
}
