import { get } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { exigirLectura, esAdmin } from '@/auth/roles'
import { imagenConcursoParaServir } from '@/db/concurso'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const sesion = await exigirLectura()
    if (!sesion.sub) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    const { id } = await params
    const archivo = await imagenConcursoParaServir(id, sesion.sub, await esAdmin())
    if (!archivo) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    const blob = await get(archivo.ruta, { access: 'private' })
    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }
    return new Response(blob.stream, {
      headers: {
        'Content-Type': archivo.tipoContenido,
        'Content-Length': String(blob.blob.size),
        'Content-Disposition': `inline; filename="${encodeURIComponent(archivo.nombreOriginal)}"`,
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }
}

