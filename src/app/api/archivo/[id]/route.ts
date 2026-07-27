import { get } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { obtenerArchivo } from '@/db/archivos'
import { puedeVerEstaSala } from '@/auth/sesion'

/**
 * Sirve un archivo de sala, comprobando antes quién pide.
 *
 * El store es privado justamente para que exista este paso: la comprobación
 * es contra LA SALA DEL ARCHIVO, no contra "estar dentro de la app". Un
 * director de NeraCode con su link de acceso está autenticado, y no por eso
 * puede abrir el deck comercial de Mexa Creativa.
 *
 * `notFound` y no `forbidden` cuando no le toca: un 403 confirma que el
 * archivo existe, y en una app de diez salas eso ya es información.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params
  const archivo = await obtenerArchivo(id)
  if (!archivo) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (!(await puedeVerEstaSala(archivo.salaSlug))) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  const resultado = await get(archivo.ruta, { access: 'private' })
  if (!resultado || resultado.statusCode !== 200 || !resultado.stream) {
    return NextResponse.json({ error: 'El archivo ya no está en el almacén' }, { status: 404 })
  }

  return new Response(resultado.stream, {
    headers: {
      'Content-Type': archivo.tipoContenido ?? resultado.blob.contentType,
      // `inline` para que un PDF o una imagen se abran en el navegador en vez
      // de bajarse a Descargas; el nombre es el ORIGINAL, no la ruta interna
      // con su uuid delante.
      'Content-Disposition': `inline; filename="${encodeURIComponent(archivo.nombreOriginal)}"`,
      // Privado y por sesión: que no quede en una caché compartida.
      'Cache-Control': 'private, max-age=300',
    },
  })
}
