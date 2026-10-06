import { redirect } from 'next/navigation'
import { presentacionPorRutaVieja, rutaDePresentacion } from '@/presentaciones/registro'

// Dinámica a propósito: así redirige en el momento, igual que en desarrollo, en vez de quedar como página estática.
export const dynamic = 'force-dynamic'

/**
 * `/rl-comercial` se mudó a la sala de Research Land el 6-oct-2026 (reorganización del hub): ahí vive, con clave
 * para quien no es del equipo. La liga vieja sigue sirviendo.
 */
export default function PaginaRlComercialMudada() {
  const p = presentacionPorRutaVieja('/rl-comercial')
  redirect(p ? rutaDePresentacion(p) : '/cliente/research-land')
}
