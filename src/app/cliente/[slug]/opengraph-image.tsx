import { ImageResponse } from 'next/og'
import { cargarTemas } from '@/db/temas'
import { colorDeTextoDeMarca } from '@/temas'

/**
 * LA IMAGEN QUE SE VE AL COMPARTIR LA SALA DE UN CLIENTE.
 *
 * Franco: *"cuando se comparte la url aparece todo este contenido que no está
 * bien"*. Además del texto —que arregla `generateMetadata`, al lado— faltaba
 * lo que de verdad hace que un enlace se vea bien en Slack o WhatsApp: una
 * imagen. Sin ella, la vista previa es dos renglones de texto pegados.
 *
 * SE GENERA CON LA MARCA DE CADA SALA, no una imagen fija: el enlace que
 * recibe el director de NeraCode tiene que verse de NeraCode. Sale su
 * degradado, su nombre y de quién viene, con los mismos colores que va a
 * encontrar al abrirlo.
 *
 * NO LLEVA EL LOGOTIPO. `ImageResponse` no descarga imágenes remotas por su
 * cuenta —habría que traer el binario y pasarlo como data URI en cada
 * generación— y los logos de las salas viven en Vercel Blob PRIVADO, servidos
 * a través de una ruta que comprueba permisos. El degradado exacto de la marca
 * ya la identifica, y es justo lo que Franco fijó como regla: *"el degradado
 * se muestra EXACTO del brandbook"*.
 *
 * SIN TEXTO SOBRE EL DEGRADADO — la otra mitad de esa regla: *"NUNCA lleva
 * texto encima"*. El degradado es una banda, y el texto va sobre papel.
 */

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
// Sin `alt` no hay texto alternativo en la vista previa: quien navega con
// lector de pantalla recibe "imagen" a secas.
export const alt = 'Espacio del cliente en Meeting Hub · Marketing Corp'

export default async function Imagen({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tema = (await cargarTemas())[slug]

  // Sin sala no se inventa una marca: la tarjeta neutra de Marketing Corp.
  const marca = tema?.primario ?? '#E34714'
  const nombre = tema?.nombre ?? 'Meeting Hub'
  const gradiente = tema?.gradiente?.length ? tema.gradiente : [marca, marca]
  const tinta = colorDeTextoDeMarca(marca)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
        }}
      >
        {/* La banda de marca, exacta y sin nada encima. */}
        <div
          style={{
            height: 210,
            background: `linear-gradient(120deg, ${gradiente.join(', ')})`,
          }}
        />
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 80px',
          }}
        >
          <div
            style={{
              fontSize: 26,
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: '#6b7280',
              marginBottom: 20,
            }}
          >
            Cliente · Marketing Corp
          </div>
          <div style={{ fontSize: 92, fontWeight: 700, color: tinta, lineHeight: 1 }}>
            {nombre}
          </div>
          <div style={{ fontSize: 32, color: '#4b5563', marginTop: 28 }}>
            Acuerdos, reuniones, minutas y materiales
          </div>
        </div>
        {/* El filo de marca abajo: cierra la tarjeta con el mismo color. */}
        <div style={{ height: 14, background: marca }} />
      </div>
    ),
    size,
  )
}
