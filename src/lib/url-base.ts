import { headers } from 'next/headers'

/**
 * Origen público de la app ("https://mktcorp-estatus.vercel.app"), para armar
 * links que se comparten fuera (el acceso de una sala).
 *
 * Se toma del propio request, así el link que se copia apunta siempre al
 * dominio por el que se entró — en local sale localhost, en un preview el
 * preview, y el día que haya dominio propio saldrá ese sin tocar código.
 * APP_URL manda si está definida, para el caso de un proxy delante que oculte
 * el host real.
 */
export async function urlBase(): Promise<string> {
  const configurada = process.env.APP_URL
  if (configurada) return new URL(configurada).origin

  const cabeceras = await headers()
  const host = cabeceras.get('x-forwarded-host') ?? cabeceras.get('host')
  if (!host) return ''
  const protocolo = cabeceras.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${protocolo}://${host}`
}
