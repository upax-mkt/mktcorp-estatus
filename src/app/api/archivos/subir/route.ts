import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse, type NextRequest } from 'next/server'
import { esEquipo } from '@/auth/sesion'
import { TIPOS_PERMITIDOS, TAMANO_MAXIMO } from '@/lib/blob'

/**
 * Emite el permiso para que el navegador escriba DIRECTO en Blob.
 *
 * Sin esto, un archivo de 40 MB tendría que atravesar una Server Action —cuyo
 * cuerpo está limitado a 1 MB por defecto— y pagarse el ancho de banda dos
 * veces. El navegador sube solo; esta ruta decide si puede y con qué límites.
 *
 * NO registra nada en la base. El registro lo hace el cliente al terminar,
 * con una Server Action, en vez de por el webhook `onUploadCompleted`: ese
 * webhook exige que Blob pueda llamar al servidor, y en desarrollo local no
 * puede, así que la mitad del flujo solo se probaría en producción. El
 * riesgo del cambio es un binario huérfano si el navegador muere entre la
 * subida y el registro — un archivo suelto sin fila, no una fila rota.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const cuerpo = (await request.json()) as HandleUploadBody

  try {
    const respuesta = await handleUpload({
      body: cuerpo,
      request,
      onBeforeGenerateToken: async () => {
        // La autorización va AQUÍ y no en el formulario: esta ruta es un
        // endpoint, y quien conozca su nombre puede llamarla sin pasar por
        // ninguna pantalla. Un token emitido a la ligera convierte el store
        // en un CDN gratis para cualquiera.
        if (!(await esEquipo())) {
          throw new Error('Solo el equipo de Marketing Corp puede subir archivos.')
        }
        return {
          allowedContentTypes: TIPOS_PERMITIDOS,
          maximumSizeInBytes: TAMANO_MAXIMO,
          // El nombre ya lleva un identificador propio (ver `rutaDeArchivo`),
          // así que no hace falta sufijo aleatorio; y sobrescribir nunca es
          // lo que se quiere: dos subidas son dos archivos.
          addRandomSuffix: false,
          allowOverwrite: false,
        }
      },
      onUploadCompleted: async () => {
        // Deliberadamente vacío: ver la nota de arriba.
      },
    })

    return NextResponse.json(respuesta)
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'No se pudo autorizar la subida.'
    return NextResponse.json({ error: mensaje }, { status: 400 })
  }
}
