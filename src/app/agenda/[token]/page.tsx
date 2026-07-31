import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { tokenValido } from '@/db/enlace-agenda'
import { sesionesPublicasDelMes } from '@/db/sesiones'
import { diaCivil } from '@/lib/fecha'
import { CalendarioPublico } from '@/componentes/agenda/CalendarioPublico'
import estilos from '@/componentes/agenda/calendario-publico.module.css'

// El calendario depende de "hoy" (mes por defecto, celda de hoy resaltada):
// sin esto Next podría prerenderizarla y quedarse anclada al día del build,
// el mismo bug de fondo que ya tuvo /agenda (ver ese page.tsx).
export const dynamic = 'force-dynamic'

// Enlace público sin sesión: nada de invitar a un buscador a indexar cuándo
// se reúne cada UDN con Marketing Corp. No es el secreto que protege esta
// pantalla —eso es el token—, es una capa aparte y barata.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

/** El mes de hoy en CDMX —no en la zona del proceso—, como {anio, mes 1-12}. */
function mesDeHoy(hoy: Date): { anio: number; mes: number } {
  const [anio, mes] = diaCivil(hoy.toISOString()).split('-').map(Number)
  return { anio, mes }
}

/**
 * El mes pedido por `?mes=YYYY-MM` (el mismo formato que enlaza
 * `CalendarioPublico`), o el de hoy si el parámetro falta o viene raro.
 *
 * Ruta pública sin sesión: cualquier cadena puede llegar en `mes`, así que se
 * valida la forma antes de creerle el número — un mes fuera de 1-12, por
 * ejemplo, no debe llegar a `sesionesPublicasDelMes`.
 */
function resolverMes(param: string | undefined, hoy: Date): { anio: number; mes: number } {
  const combinacion = /^(\d{4})-(\d{2})$/.exec(param ?? '')
  if (combinacion) {
    const anio = Number(combinacion[1])
    const mes = Number(combinacion[2])
    if (mes >= 1 && mes <= 12) return { anio, mes }
  }
  return mesDeHoy(hoy)
}

/**
 * La agenda pública: qué sala, qué día y a qué hora — nada más.
 *
 * Es la única pantalla de esta app que se ve sin sesión (spec ronda 8):
 * Franco manda `/agenda/<token>` por Slack o WhatsApp a quien haga falta —
 * directores de UDN, gente de fuera del equipo— para que sepan cuándo son
 * las reuniones. Una hoja, no una puerta: nada de acuerdos, minutas,
 * participantes, contenido de reunión ni un enlace que entre a la app.
 *
 * EL TOKEN SE COMPRUEBA ANTES DE LEER NADA MÁS. La política de rutas
 * (`esRutaPublica`, src/auth/politica.ts) deja pasar `/agenda/<token>` por
 * FORMA —cualquier cadena en esa posición llega hasta aquí—, no por validez:
 * la comprobación real vive en esta línea. Y la respuesta ante un token
 * equivocado es 404, nunca un mensaje de "token inválido": un 404 no dice si
 * el enlace existió alguna vez, que es justo lo que no debe saberse.
 */
export default async function PagAgendaPublica({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ mes?: string }>
}) {
  const { token } = await params
  if (!(await tokenValido(token))) notFound()

  const { mes: mesParam } = await searchParams
  const hoy = new Date()
  const { anio, mes } = resolverMes(mesParam, hoy)

  // La consulta trae solo los cinco campos que esta pantalla pinta (ver
  // sesionesPublicasDelMes, src/db/sesiones.ts) — nunca la sesión entera para
  // filtrar aquí: lo que no viaja al navegador no se puede filtrar por error.
  const reuniones = await sesionesPublicasDelMes(anio, mes)

  return (
    <div className={estilos.pagina}>
      <main className={estilos.main}>
        <div className={estilos.encabezado}>
          <h1 className={estilos.titulo}>Agenda</h1>
          <p className={estilos.subtitulo}>
            Las próximas reuniones de Marketing Corporativo con las unidades de negocio de Grupo UPAX.
          </p>
        </div>
        <CalendarioPublico anio={anio} mes={mes} reuniones={reuniones} />
      </main>
    </div>
  )
}
