import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse, type NextRequest } from 'next/server'
import { esLector } from '@/auth/roles'
import { faseDelConcurso } from '@/concurso/fase'
import { MAX_BYTES_ARCHIVO, TIPOS_IMAGEN_CONCURSO } from '@/concurso/config'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const cuerpo = (await request.json()) as HandleUploadBody
  try {
    const respuesta = await handleUpload({
      body: cuerpo,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!(await esLector())) throw new Error('Inicia sesión con tu cuenta de Marketing Corporativo.')
        if (faseDelConcurso() !== 'recepcion') throw new Error('La recepción de propuestas ya cerró.')
        if (!pathname.startsWith('concurso/sudadera-mkt-corp-2026/')) {
          throw new Error('Ruta de archivo inválida.')
        }
        return {
          allowedContentTypes: [...TIPOS_IMAGEN_CONCURSO],
          maximumSizeInBytes: MAX_BYTES_ARCHIVO,
          addRandomSuffix: false,
          allowOverwrite: false,
        }
      },
      onUploadCompleted: async () => {},
    })
    return NextResponse.json(respuesta)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo autorizar la subida.' },
      { status: 400 },
    )
  }
}

