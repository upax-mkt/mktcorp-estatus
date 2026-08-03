import { get } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { obtenerArchivo } from '@/db/archivos'
import { obtenerSesion } from '@/db/sesiones'
import { puedeVerEstaSala } from '@/auth/sesion'
import { esLector } from '@/auth/roles'
import { interpretarRango, recortarStream } from '@/lib/rango'
import { tipoSeguroParaServir } from '@/lib/blob'

/**
 * Quién puede ver este archivo.
 *
 * Dos casos, y el segundo llegó con las imágenes de presentación: un archivo
 * de sala se comprueba contra SU sala, y una imagen incrustada en un
 * documento hereda el permiso DEL DOCUMENTO — que puede no ser de ninguna
 * sala. Comprobar la imagen contra una sala que no existe la dejaría fuera
 * del alcance de todos, incluido quien la subió.
 */
async function puedeVerlo(archivo: { salaSlug: string | null; sesionId: string | null }) {
  if (archivo.sesionId) {
    const sesion = await obtenerSesion(archivo.sesionId)
    if (!sesion) return false
    // `esLector()`, no la vieja `esEquipo()`: leer un archivo es de solo
    // lectura, así que cualquiera de los tres roles de equipo lo pasa —
    // corrección post-revisión de la ronda 9.
    return sesion.salaSlug ? puedeVerEstaSala(sesion.salaSlug) : esLector()
  }
  if (archivo.salaSlug) return puedeVerEstaSala(archivo.salaSlug)
  return false
}

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
 *
 * SOPORTA `Range` (revisión post-entrega, ronda 9 tarea 7). Sin esto, un
 * vídeo no se podía ni reproducir de verdad: sin `Accept-Ranges` ni
 * `Content-Length`, el navegador no puede saltar a un punto sin descargar
 * el archivo entero primero, y si el archivo no viene optimizado para
 * streaming web (una exportación de móvil o de Zoom), ni siquiera podía
 * EMPEZAR — necesitaba los 200 MB completos. Ver `src/lib/rango.ts` para el
 * porqué de recortar aquí, en el servidor, en vez de reenviarle `Range` a
 * Blob y confiar en que lo honre.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params
  const archivo = await obtenerArchivo(id)
  if (!archivo) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (!(await puedeVerlo(archivo))) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  const resultado = await get(archivo.ruta, { access: 'private' })
  if (!resultado || resultado.statusCode !== 200 || !resultado.stream) {
    return NextResponse.json({ error: 'El archivo ya no está en el almacén' }, { status: 404 })
  }

  const tamanoTotal = resultado.blob.size
  const cabecerasComunes = {
    // NUNCA el dato crudo del cliente (revisión final de la rama, punto 4):
    // `archivo.tipoContenido` es lo que declaró el NAVEGADOR al subir, sin
    // verificar contra el binario real. `tipoSeguroParaServir` (src/lib/blob.ts)
    // solo deja pasar los tipos que esta app conoce de verdad —y NUNCA
    // `image/svg+xml`, que aquí se serviría `inline` y con script— y degrada
    // cualquier otra cosa a una descarga genérica.
    'Content-Type': tipoSeguroParaServir(archivo.tipoContenido ?? resultado.blob.contentType),
    // `inline` para que un PDF o una imagen se abran en el navegador en vez
    // de bajarse a Descargas; el nombre es el ORIGINAL, no la ruta interna
    // con su uuid delante.
    'Content-Disposition': `inline; filename="${encodeURIComponent(archivo.nombreOriginal)}"`,
    // Privado y por sesión: que no quede en una caché compartida.
    'Cache-Control': 'private, max-age=300',
    // SIEMPRE, incluso sirviendo el archivo entero: es lo que le dice al
    // navegador "puedes pedirme un trozo" antes incluso de necesitar uno —
    // sin esto, un reproductor de vídeo ni se molesta en intentarlo.
    'Accept-Ranges': 'bytes',
    // SIN ESTO (revisión final de la rama, punto 4) el navegador puede
    // ignorar el `Content-Type` de arriba y "adivinar" uno distinto por el
    // contenido (MIME-sniffing) — la segunda mitad de la misma protección:
    // no basta con declarar bien el tipo si el navegador se siente libre de
    // no creerlo.
    'X-Content-Type-Options': 'nosniff',
  }

  const rango = interpretarRango(request.headers.get('range'), tamanoTotal)

  if (rango.ok) {
    return new Response(recortarStream(resultado.stream, rango.inicio, rango.fin), {
      status: 206,
      headers: {
        ...cabecerasComunes,
        'Content-Range': `bytes ${rango.inicio}-${rango.fin}/${tamanoTotal}`,
        'Content-Length': String(rango.fin - rango.inicio + 1),
      },
    })
  }

  if (rango.motivo === 'no-satisfacible') {
    return new Response(null, {
      status: 416,
      headers: { ...cabecerasComunes, 'Content-Range': `bytes */${tamanoTotal}` },
    })
  }

  return new Response(resultado.stream, {
    headers: { ...cabecerasComunes, 'Content-Length': String(tamanoTotal) },
  })
}
