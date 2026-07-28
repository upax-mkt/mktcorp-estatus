import { NextResponse, type NextRequest } from 'next/server'
import { verificar } from '@/auth/firma'
import { puedeVerRuta, esRutaPublica } from '@/auth/politica'
import { COOKIE_SESION } from '@/auth/nombres'

/**
 * Puerta de entrada de la app (en Next 16 el middleware se llama proxy).
 *
 * Hace dos cosas:
 *
 * 1. **Canjea el link de acceso de una sala.** Un director abre
 *    `/sala/neracode?acceso=<token>`; aquí se valida la firma, se deja la
 *    sesión en una cookie httpOnly y se redirige a la misma URL sin el token,
 *    para que no quede a la vista ni en el historial.
 *
 * 2. **Filtra lo evidente.** Sin sesión válida, a /entrar. Es un chequeo
 *    OPTIMISTA, como recomienda la guía de autenticación de Next: la
 *    verificación que manda vive pegada al dato, en src/auth/sesion.ts, y cada
 *    página y Server Action la repite.
 *
 * Nota: importa solo de @/auth/firma, @/auth/politica y @/auth/nombres —
 * módulos sin `next/headers` ni Node, porque esto corre en Edge.
 */

const PARAMETRO_ACCESO = 'acceso'

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const secreto = process.env.SESSION_SECRET

  // Sin secreto configurado no se puede validar nada: se manda todo a /entrar,
  // que explica qué falta. Cerrado por defecto, nunca abierto por defecto.
  if (!secreto) {
    if (esRutaPublica(pathname)) return NextResponse.next()
    return NextResponse.redirect(new URL('/entrar', request.url))
  }

  const cookieActual = request.cookies.get(COOKIE_SESION)?.value

  // 1. ¿Trae un link de acceso de sala?
  const tokenDeLink = searchParams.get(PARAMETRO_ACCESO)
  if (tokenDeLink) {
    const sesionDelLink = await verificar(tokenDeLink, secreto)
    if (sesionDelLink) {
      const limpia = request.nextUrl.clone()
      limpia.searchParams.delete(PARAMETRO_ACCESO)
      const respuesta = NextResponse.redirect(limpia)

      /**
       * UN LINK DE SALA NUNCA DEGRADA UNA SESIÓN DE EQUIPO.
       *
       * El link existe para un director que no tiene sesión. Quien lo copia
       * para compartirlo es del equipo, y lo normal es que lo abra para
       * comprobar que funciona — y así se quedaba con una cookie de solo
       * lectura de esa sala, encima de la suya. A partir de ese momento la
       * raíz lo mandaba a esa sala y no había forma de volver: 30 días de
       * caducidad, sin botón de salir.
       *
       * Le pasó a Franco con Mexa Creativa. El link se sigue canjeando para
       * quien no tiene sesión o tiene una de sala; para el equipo solo se
       * limpia el parámetro y sigue viendo la sala como quien es.
       */
      const yaEsEquipo = (await verificar(cookieActual, secreto))?.rol === 'equipo'
      if (!yaEsEquipo) {
        respuesta.cookies.set(COOKIE_SESION, tokenDeLink, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          expires: new Date(sesionDelLink.exp),
        })
      }
      return respuesta
    }
    // Token vencido o falso: sigue el camino normal y acabará en /entrar.
  }

  // 2. Filtro optimista por cookie.
  const sesion = await verificar(cookieActual, secreto)
  if (puedeVerRuta(sesion, pathname)) return NextResponse.next()

  // Con sesión pero sin permiso para ESTA ruta (p. ej. una sala ajena), se
  // manda a donde sí puede estar, no al login: ya está autenticado.
  if (sesion?.rol === 'sala' && sesion.sala) {
    return NextResponse.redirect(new URL(`/sala/${sesion.sala}`, request.url))
  }

  const destino = new URL('/entrar', request.url)
  if (pathname !== '/') destino.searchParams.set('destino', pathname)
  return NextResponse.redirect(destino)
}

export const config = {
  // Todo menos los estáticos de Next, el favicon y los archivos de /public.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
