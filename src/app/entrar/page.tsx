import type { Metadata } from 'next'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import estilos from './entrar.module.css'
import {
  abrirSesionEquipo,
  claveDeEquipoCorrecta,
  claveDeEquipoSigueSirviendo,
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
/**
 * ⚠️ LA VISTA PREVIA DEL ENLACE SE RESUELVE AQUÍ, Y NO EN LA PÁGINA QUE SE
 * COMPARTE.
 *
 * Cuando Franco pega `…/concurso` en Slack, el bot que genera la tarjeta NO
 * tiene sesión: el proxy lo manda a `/entrar?destino=/concurso` y las etiquetas
 * `og:` de la página protegida no llegan a servirse nunca. Comprobado: sin
 * cookie, `/concurso` responde 307 y cero `og:image`. Sin esto, el enlace del
 * concurso se desplegaría en Slack como un login sin imagen.
 *
 * `/entrar` sí es pública y el bot la alcanza siguiendo el redirect, así que
 * es aquí donde tienen que estar. NO se abre nada: quien no tenga sesión sigue
 * viendo el formulario de siempre; lo único que viaja de más son un título, una
 * descripción y un cartel que ya son públicos por definición — están hechos
 * para repartirse.
 *
 * Se resuelve por `destino` y no fijo al concurso: el día que se comparta otra
 * pantalla protegida, este es el sitio donde añadir su tarjeta.
 */
const PREVIAS: Record<string, { titulo: string; descripcion: string; imagen?: string }> = {
  '/concurso': {
    titulo: 'Diseña lo que somos · Concurso interno 2026',
    descripcion:
      'Diseña la sudadera oficial de Marketing Corp. Sube tu propuesta hasta el 7 de septiembre: el diseño ganador se lleva un pase doble a la Arena CDMX, gift card y un día de vacaciones.',
    imagen: '/concurso/og-concurso.png',
  },
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; destino?: string }>
}): Promise<Metadata> {
  const { destino } = await searchParams
  // Solo rutas propias: un `destino` que llegue con una URL ajena no puede
  // decidir lo que este dominio anuncia de sí mismo.
  const clave = destino && destino.startsWith('/') && !destino.startsWith('//') ? destino : null
  const previa = clave ? PREVIAS[clave] : null
  if (!previa) return { title: 'Entrar' }
  return {
    title: previa.titulo,
    description: previa.descripcion,
    openGraph: {
      title: previa.titulo,
      description: previa.descripcion,
      type: 'website',
      locale: 'es_MX',
      siteName: 'Meeting Hub · Marketing Corp',
      ...(previa.imagen ? { images: [{ url: previa.imagen, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: previa.titulo,
      description: previa.descripcion,
      ...(previa.imagen ? { images: [previa.imagen] } : {}),
    },
  }
}

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
        redirect(`/cliente/${sala}`)
      }
    }

    if (!(await claveDeEquipoCorrecta(clave))) {
      // Se conserva el destino: si te equivocas de clave yendo a /preparar,
      // al segundo intento tienes que acabar en /preparar, no en el hub.
      const parametros = new URLSearchParams({ error: 'clave' })
      if (aDonde !== '/') parametros.set('destino', aDonde)
      redirect(`/entrar?${parametros}`)
    }

    // EL PORTILLO DE EMERGENCIA — el porqué completo, y por qué no se toca,
    // vive en `claveDeEquipoSigueSirviendo()` (src/auth/sesion.ts), que es
    // además donde se prueba: esta función no puede probarse aquí (necesita
    // cookies/un request de Next vivo), esa sí.
    if (!(await claveDeEquipoSigueSirviendo())) {
      const parametros = new URLSearchParams({ error: 'clave-retirada' })
      if (aDonde !== '/') parametros.set('destino', aDonde)
      redirect(`/entrar?${parametros}`)
    }

    await abrirSesionEquipo('equipo-mkt-corp', 'admin')
    // Solo rutas internas: un destino como "https://otro-sitio" sería un
    // redirect abierto de manual.
    redirect(aDonde.startsWith('/') ? aDonde : '/')
  }

  return (
    <div className={estilos.pantalla}>
      <div className={estilos.tarjeta}>
        <div className={estilos.marca}>
          {/* El logotipo real, ahora que existe. El "M/C" dibujado con dos
              spans era un apaño de cuando no había activos de marca. */}
          <Image
            src="/logos/marketing-corp-color.png"
            alt="Marketing Corp"
            width={200}
            height={47}
            className={estilos.marcaLogo}
            priority
          />
        </div>

        <h1 className={estilos.titulo}>Meeting Hub</h1>
        <p className={estilos.subtitulo}>
          El espacio donde Marketing Corporativo prepara, presenta y minuta el estatus de cada unidad.
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
            {error === 'clave-retirada' && (
              <div className={estilos.error}>
                El acceso con la clave del equipo ya se retiró: ahora cada quien entra con su cuenta
                de Slack. Si todavía no puedes entrar, pide que te den de alta en el directorio.
              </div>
            )}
            {error === 'slack' && (
              <div className={estilos.error}>
                Slack no autorizó la entrada. Puede ser una cuenta fuera del workspace de UPAX.
              </div>
            )}
            {error === 'sin-acceso' && (
              <div className={estilos.error}>
                Tu cuenta de Slack es válida, pero no estás en el directorio de Marketing
                Corporativo. Pide acceso a Marketing Corp.
              </div>
            )}
            {error === 'inactivo' && (
              <div className={estilos.error}>
                Tu cuenta está desactivada en el directorio de Marketing Corporativo. Pide a un
                administrador que te reactive.
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

        {/* El texto anterior decía que un director NO necesitaba clave, y
            desde que existe la clave por sala eso dejó de ser cierto: le
            estaba diciendo que esperara un link que ya no tiene por qué
            llegar. */}
        <p className={estilos.pie}>
          <span className={estilos.pieFuerte}>¿Diriges una UDN?</span> Usa la clave que te compartió
          Marketing Corporativo y entrarás directo a tu sala. Si no la tienes, pídesela al equipo.
        </p>
      </div>
    </div>
  )
}
